const router = require("express").Router();
const multer = require("multer");
const ExcelJS = require("exceljs");
const prisma = require("../prisma");
const { auth, scopeLOB } = require("../middleware/auth");
const { logAudit, genCode } = require("../utils/helpers");

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// Matches the real LOB tracker sheets (e.g. Auto, Gadget, Travel). LOB itself is NOT a column —
// each tracker sheet belongs to one LOB, selected by the uploader in the wizard.
const EXPECTED_HEADERS = [
  "Project Name/Module",
  "Email Subject",
  "Description",
  "Category",
  "Status",
  "Priority",
  "Requirement Rec. From",
  "Business Req. Rec. Date",
  "Developer Req. Received Date",
  "Delivery Date",
  "Start Date (Developer)",
  "Expected End Date",
  "Assigned Team/Developer",
  "Revised date",
  "Reason For Delay",
  "Remarks",
];
// Minimum columns required to treat a sheet as a valid data sheet (rest are optional/nullable).
const REQUIRED_HEADERS = ["Project Name/Module", "Category", "Status"];

const STATUS_MAP = {
  pending: "PENDING", pipeline: "PENDING", open: "PENDING", "new": "PENDING",
  assigned: "ASSIGNED",
  wip: "WIP", "work in progress": "WIP", "in progress": "WIP",
  completed: "COMPLETED", "dev completed": "COMPLETED",
  uat: "UAT",
  live: "LIVE", closed: "LIVE", done: "LIVE", deployed: "LIVE",
  reopened: "REOPENED", "re-opened": "REOPENED",
};
const PRIORITY_MAP = { critical: "CRITICAL", high: "HIGH", medium: "MEDIUM", low: "LOW" };

function excelDate(v) {
  if (!v) return null;
  if (v instanceof Date) return v;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

function findDataSheet(workbook) {
  for (const sheet of workbook.worksheets) {
    const headerRow = sheet.getRow(1).values.slice(1).map((h) => (h ? String(h).trim() : ""));
    const hasRequired = REQUIRED_HEADERS.every((h) => headerRow.includes(h));
    if (hasRequired) return { sheet, headerRow };
  }
  return null;
}

// Step 1+2: upload & validate headers, Step 3: return preview with duplicate flags
// Requires ?lobId= (or body field lobId via multipart) since the tracker sheet carries no LOB column.
router.post("/preview", auth, upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  const { lobId } = req.body;
  if (!lobId) return res.status(400).json({ error: "Select the Line of Business this tracker belongs to" });

  const lob = await prisma.lOB.findUnique({ where: { id: lobId } });
  if (!lob) return res.status(404).json({ error: "Line of Business not found" });
  if (req.user.role === "BA" && lobId !== req.user.lobId) {
    return res.status(403).json({ error: "BA can only import trackers for their own LOB" });
  }

  const ext = req.file.originalname.split(".").pop().toLowerCase();
  if (!["xlsx", "xls"].includes(ext)) {
    return res.status(400).json({ error: "Only .xlsx and .xls files are supported (BR-16)" });
  }

  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(req.file.buffer);
  } catch (e) {
    return res.status(400).json({ error: "Could not parse the file. Please upload a valid Excel file." });
  }

  const found = findDataSheet(wb);
  if (!found) {
    return res.status(400).json({
      error: `No sheet found with the required columns: ${REQUIRED_HEADERS.join(", ")}`,
      expectedHeaders: EXPECTED_HEADERS,
    });
  }
  const { sheet, headerRow } = found;
  const colIdx = {};
  headerRow.forEach((h, i) => (colIdx[h] = i + 1));

  const existingProjects = await prisma.project.findMany({ select: { name: true } });
  const existingProjectNames = new Set(existingProjects.map((p) => p.name.toLowerCase()));

  const rows = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const get = (h) => {
      if (!colIdx[h]) return "";
      const v = row.getCell(colIdx[h]).value;
      if (v && v.text) return v.text;
      if (v && v.result !== undefined) return v.result;
      return v !== null && v !== undefined ? v : "";
    };
    const str = (h) => (get(h) ? String(get(h)).trim() : "");

    const projectName = str("Project Name/Module");
    if (!projectName) return;

    rows.push({
      rowNumber,
      projectName,
      emailSubject: str("Email Subject"),
      description: str("Description"),
      category: str("Category"),
      status: str("Status"),
      priority: str("Priority"),
      requirementReceivedFrom: str("Requirement Rec. From"),
      businessReqReceivedDate: excelDate(get("Business Req. Rec. Date")),
      developerReqReceivedDate: excelDate(get("Developer Req. Received Date")),
      deliveryDate: excelDate(get("Delivery Date")),
      startDateDeveloper: excelDate(get("Start Date (Developer)")),
      expectedEndDate: excelDate(get("Expected End Date")),
      assignedTeam: str("Assigned Team/Developer"),
      reasonForDelay: str("Reason For Delay"),
      remarks: str("Remarks"),
      isNewProject: !existingProjectNames.has(projectName.toLowerCase()),
    });
  });

  // BR-18: duplicate detection on Project Name + Email Subject + a received date, within the target LOB
  const existingTasks = await prisma.task.findMany({
    where: { lobId },
    include: { project: true },
  });
  const existingKeys = new Set(
    existingTasks.map((t) =>
      `${t.project?.name || ""}|${t.emailSubject || ""}|${
        t.developerReqReceivedDate ? new Date(t.developerReqReceivedDate).toDateString() : ""
      }`.toLowerCase()
    )
  );

  for (const r of rows) {
    const key = `${r.projectName}|${r.emailSubject}|${
      r.developerReqReceivedDate ? new Date(r.developerReqReceivedDate).toDateString() : ""
    }`.toLowerCase();
    r.isDuplicate = existingKeys.has(key);
  }

  res.json({ totalRows: rows.length, rows, fileName: req.file.originalname, sheetName: sheet.name, lobId, lobName: lob.name });
});

// Step 4: commit import. body: { fileName, lobId, rows: [{...row, action: 'import'|'skip'|'overwrite'}] }
router.post("/import", auth, async (req, res) => {
  const { fileName, lobId, rows } = req.body;
  if (!Array.isArray(rows)) return res.status(400).json({ error: "rows array required" });
  if (!lobId) return res.status(400).json({ error: "lobId is required" });

  const lob = await prisma.lOB.findUnique({ where: { id: lobId } });
  if (!lob) return res.status(404).json({ error: "Line of Business not found" });
  if (req.user.role === "BA" && lobId !== req.user.lobId) {
    return res.status(403).json({ error: "BA can only import trackers for their own LOB" });
  }

  let imported = 0, skipped = 0, overwritten = 0;

  for (const r of rows) {
    if (r.action === "skip") { skipped++; continue; }

    // BR-17: auto project creation (scoped by name; project itself still belongs to a single LOB)
    let project = await prisma.project.findFirst({ where: { name: r.projectName } });
    if (!project) {
      project = await prisma.project.create({
        data: {
          projectCode: genCode("PRJ"),
          name: r.projectName,
          status: "ACTIVE",
          description: "",
          lobId,
          startDate: new Date(),
        },
      });
    }

    let category = r.category ? await prisma.category.findFirst({ where: { name: r.category } }) : null;
    if (r.category && !category) category = await prisma.category.create({ data: { name: r.category } });

    // Assigned Team/Developer is free text in the legacy tracker (often multiple names) —
    // stored as-is; it is not forced into the single-developer master used by the in-app workflow.
    const caseStatus = STATUS_MAP[(r.status || "pending").toLowerCase().trim()] || "PENDING";
    const priority = PRIORITY_MAP[(r.priority || "medium").toLowerCase().trim()] || "MEDIUM";

    const taskData = {
      taskName: null, // BR-19: legacy tracker has no distinct task-name column
      projectId: project.id,
      categoryId: category ? category.id : null,
      lobId,
      description: r.description || null,
      emailSubject: r.emailSubject || null,
      requirementReceivedFrom: r.requirementReceivedFrom || null,
      businessReqReceivedDate: r.businessReqReceivedDate ? new Date(r.businessReqReceivedDate) : null,
      developerReqReceivedDate: r.developerReqReceivedDate ? new Date(r.developerReqReceivedDate) : null,
      deliveryDate: r.deliveryDate ? new Date(r.deliveryDate) : null,
      // Keep actualCompletionAt consistent with the legacy tracker's Delivery Date for LIVE rows,
      // so reports/history that key off actualCompletionAt (e.g. Monthly Report) still work for migrated data.
      actualCompletionAt: caseStatus === "LIVE" && r.deliveryDate ? new Date(r.deliveryDate) : null,
      developerAssignedAt: r.startDateDeveloper ? new Date(r.startDateDeveloper) : null,
      expectedEndDate: r.expectedEndDate ? new Date(r.expectedEndDate) : null,
      revisedDate: r.revisedDate ? new Date(r.revisedDate) : null,
      reasonForDelay: r.reasonForDelay || null,
      assignedTeam: r.assignedTeam || null,
      caseStatus,
      priority,
      remarks: r.remarks || null,
      createdById: req.user.id,
    };

    if (r.action === "overwrite" && r.isDuplicate) {
      const existing = await prisma.task.findFirst({
        where: { projectId: project.id, emailSubject: r.emailSubject || null, lobId },
      });
      if (existing) {
        await prisma.task.update({ where: { id: existing.id }, data: taskData });
        overwritten++;
        continue;
      }
    }

    await prisma.task.create({ data: { ...taskData, taskCode: genCode("TSK") } });
    imported++;
  }

  const log = await prisma.excelImportLog.create({
    data: {
      fileName: fileName || "upload.xlsx",
      uploadedById: req.user.id,
      totalRows: rows.length,
      imported,
      skipped,
      overwritten,
    },
  });
  await logAudit({ entity: "ExcelImportLog", entityId: log.id, action: "IMPORT", userId: req.user.id, newValue: lob.name });

  res.json({ imported, skipped, overwritten, total: rows.length });
});

router.get("/logs", auth, async (req, res) => {
  const logs = await prisma.excelImportLog.findMany({
    include: { uploadedBy: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
  res.json(logs);
});

module.exports = router;
const router = require("express").Router();
const { Parser } = require("json2csv");
const prisma = require("../prisma");
const { auth, scopeLOB } = require("../middleware/auth");
const { computeDeadlineStatus } = require("../utils/helpers");

function toCsv(res, filename, rows) {
  if (!rows.length) return res.status(200).send("No data");
  const fieldSet = new Set();
  for (const row of rows) for (const k of Object.keys(row)) fieldSet.add(k);
  const parser = new Parser({ fields: [...fieldSet] });
  const csv = parser.parse(rows);
  res.header("Content-Type", "text/csv");
  res.attachment(filename);
  res.send(csv);
}

// BR-25: Standard reports, scoped by role. type = project|lob|developer|pending|completed|deadline|missed|bug|monthly|category
router.get("/:type", auth, async (req, res) => {
  const { type } = req.params;
  const { format } = req.query;
  const lobFilter = scopeLOB(req);

  let rows = [];

  if (type === "project") {
    const projects = await prisma.project.findMany({
      where: { isDeleted: false, ...lobFilter },
      include: { lob: true, ba: true, _count: { select: { tasks: true, bugs: true } } },
    });
    rows = projects.map((p) => ({
      ProjectCode: p.projectCode,
      Name: p.name,
      LOB: p.lob.name,
      Status: p.status,
      BA: p.ba ? p.ba.name : "",
      Tasks: p._count.tasks,
      Bugs: p._count.bugs,
      StartDate: p.startDate ? p.startDate.toISOString().slice(0, 10) : "",
      ExpectedEndDate: p.expectedEndDate ? p.expectedEndDate.toISOString().slice(0, 10) : "",
    }));
  } else if (type === "pending" || type === "completed") {
    const status = type === "pending" ? { in: ["PENDING", "ASSIGNED", "WIP", "COMPLETED", "UAT"] } : "LIVE";
    const tasks = await prisma.task.findMany({
      where: { isDeleted: false, caseStatus: status, ...lobFilter },
      include: { project: true, developer: true, category: true },
    });
    rows = tasks.map((t) => ({
      TaskCode: t.taskCode,
      TaskName: t.taskName || "",
      Project: t.project.name,
      Category: t.category ? t.category.name : "",
      Status: t.caseStatus,
      Developer: t.developer ? t.developer.name : "",
      ExpectedEndDate: t.expectedEndDate ? t.expectedEndDate.toISOString().slice(0, 10) : "",
    }));
  } else if (type === "deadline" || type === "missed") {
    const tasks = await prisma.task.findMany({
      where: { isDeleted: false, ...lobFilter },
      include: { project: true, developer: true },
    });
    rows = tasks
      .map((t) => ({ t, ...computeDeadlineStatus(t) }))
      .filter((x) => (type === "missed" ? x.deadlineStatus === "COMPLETED_LATE" || x.deadlineStatus === "OVERDUE" : true))
      .map((x) => ({
        TaskCode: x.t.taskCode,
        Project: x.t.project.name,
        Developer: x.t.developer ? x.t.developer.name : "",
        ExpectedEndDate: x.t.expectedEndDate ? x.t.expectedEndDate.toISOString().slice(0, 10) : "",
        DeadlineStatus: x.deadlineStatus,
        MissedByDays: x.missedByDays ?? "",
      }));
  } else if (type === "bug") {
    const bugs = await prisma.bug.findMany({
      where: { isDeleted: false, ...lobFilter },
      include: { project: true, developer: true, lob: true },
    });
    rows = bugs.map((b) => ({
      BugCode: b.bugCode,
      Title: b.title,
      Project: b.project ? b.project.name : "",
      LOB: b.lob.name,
      Priority: b.priority,
      Status: b.status,
      Developer: b.developer ? b.developer.name : "",
    }));
  } else if (type === "developer") {
    const tasks = await prisma.task.findMany({
      where: { isDeleted: false, ...lobFilter },
      include: { developer: true, project: true },
    });
    const map = {};
    for (const t of tasks) {
      const key = t.developer ? t.developer.name : "Unassigned";
      map[key] = map[key] || { Developer: key, Total: 0, Live: 0, WIP: 0, Overdue: 0 };
      map[key].Total++;
      if (t.caseStatus === "LIVE") map[key].Live++;
      if (t.caseStatus === "WIP") map[key].WIP++;
      if (computeDeadlineStatus(t).deadlineStatus === "OVERDUE") map[key].Overdue++;
    }
    rows = Object.values(map);
  } else if (type === "category") {
    const tasks = await prisma.task.findMany({
      where: { isDeleted: false, ...lobFilter },
      include: { category: true },
    });
    const map = {};
    for (const t of tasks) {
      const key = t.category ? t.category.name : "Uncategorized";
      map[key] = (map[key] || 0) + 1;
    }
    rows = Object.entries(map).map(([Category, Count]) => ({ Category, Count }));
  } else if (type === "lob") {
    const projects = await prisma.project.findMany({ where: { isDeleted: false, ...lobFilter }, include: { lob: true } });
    const map = {};
    for (const p of projects) map[p.lob.name] = (map[p.lob.name] || 0) + 1;
    rows = Object.entries(map).map(([LOB, ProjectCount]) => ({ LOB, ProjectCount }));
  } else if (type === "monthly") {
    const tasks = await prisma.task.findMany({ where: { isDeleted: false, caseStatus: "LIVE", ...lobFilter } });
    const map = {};
    for (const t of tasks) {
      if (!t.actualCompletionAt) continue;
      const d = new Date(t.actualCompletionAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      map[key] = (map[key] || 0) + 1;
    }
    rows = Object.entries(map).map(([Month, Completed]) => ({ Month, Completed }));
  } else if (type === "projectBreakdown") {
    // Pivot: one row per project, one column per active category, plus a Total column —
    // e.g. how many Change Requests / Development / Bug Fixes / Maintenance / Production
    // Movement items each project has.
    const categories = await prisma.category.findMany({ where: { active: true }, orderBy: { name: "asc" } });
    const projects = await prisma.project.findMany({
      where: { isDeleted: false, ...lobFilter },
      include: { lob: true },
    });
    const tasks = await prisma.task.findMany({
      where: { isDeleted: false, ...lobFilter },
      select: { projectId: true, categoryId: true },
    });
    const tasksByProject = {};
    for (const t of tasks) {
      tasksByProject[t.projectId] = tasksByProject[t.projectId] || {};
      const key = t.categoryId || "uncategorized";
      tasksByProject[t.projectId][key] = (tasksByProject[t.projectId][key] || 0) + 1;
    }
    rows = projects.map((p) => {
      const counts = tasksByProject[p.id] || {};
      const row = { ProjectCode: p.projectCode, Project: p.name, LOB: p.lob.name };
      let total = 0;
      for (const c of categories) {
        const n = counts[c.id] || 0;
        row[c.name] = n;
        total += n;
      }
      const uncategorized = counts["uncategorized"] || 0;
      if (uncategorized) row["Uncategorized"] = uncategorized;
      total += uncategorized;
      row.Total = total;
      return row;
    });
  } else {
    return res.status(400).json({ error: "Unknown report type" });
  }

  if (format === "csv") return toCsv(res, `${type}-report.csv`, rows);
  res.json(rows);
});

module.exports = router;
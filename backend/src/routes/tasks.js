const router = require("express").Router();
const prisma = require("../prisma");
const { auth, scopeLOB } = require("../middleware/auth");
const { logAudit, notify, computeDeadlineStatus, genCode } = require("../utils/helpers");

function withDeadline(task) {
  const { deadlineStatus, missedByDays } = computeDeadlineStatus(task);
  return { ...task, deadlineStatus, missedByDays };
}

// BR-22: search & filters
router.get("/", auth, async (req, res) => {
  const { search, status, category, developerId, projectId, deadline } = req.query;
  const where = { isDeleted: false, ...scopeLOB(req) };
  if (status) where.caseStatus = status;
  if (category) where.categoryId = category;
  if (developerId) where.developerId = developerId;
  if (projectId) where.projectId = projectId;
  if (search) {
    where.OR = [
      { taskName: { contains: search, mode: "insensitive" } },
      { taskCode: { contains: search, mode: "insensitive" } },
      { emailSubject: { contains: search, mode: "insensitive" } },
    ];
  }

  const tasks = await prisma.task.findMany({
    where,
    include: {
      project: { select: { id: true, name: true, projectCode: true } },
      category: true,
      developer: true,
      lob: true,
    },
    orderBy: { createdAt: "desc" },
  });

  let result = tasks.map(withDeadline);
  if (deadline) result = result.filter((t) => t.deadlineStatus === deadline);
  res.json(result);
});

router.get("/:id", auth, async (req, res) => {
  const task = await prisma.task.findFirst({
    where: { id: req.params.id, isDeleted: false, ...scopeLOB(req) },
    include: {
      project: true,
      category: true,
      developer: true,
      lob: true,
      statusHistory: { orderBy: { changedAt: "asc" } },
      eedRevisions: { orderBy: { changedAt: "desc" } },
    },
  });
  if (!task) return res.status(404).json({ error: "Task not found" });
  res.json(withDeadline(task));
});

// BR-05: task creation
router.post("/", auth, async (req, res) => {
  const { projectId, taskName, categoryId, requirementReceived, emailSubject, remarks, lobId } = req.body;
  if (!projectId) return res.status(400).json({ error: "projectId is required" });

  const project = await prisma.project.findFirst({ where: { id: projectId, isDeleted: false } });
  if (!project) return res.status(404).json({ error: "Project not found" });
  if (req.user.role === "BA" && project.lobId !== req.user.lobId) {
    return res.status(403).json({ error: "BA can only create tasks in their own LOB" });
  }

  const task = await prisma.task.create({
    data: {
      taskCode: genCode("TSK"),
      taskName: taskName || null,
      projectId,
      categoryId: categoryId || null,
      lobId: lobId || project.lobId,
      requirementReceived: requirementReceived ? new Date(requirementReceived) : null,
      emailSubject: emailSubject || null,
      remarks: remarks || null,
      createdById: req.user.id,
      caseStatus: "PENDING",
    },
  });
  await prisma.taskStatusHistory.create({
    data: { taskId: task.id, toStatus: "PENDING", changedBy: req.user.name },
  });
  await logAudit({ entity: "Task", entityId: task.id, action: "CREATE", userId: req.user.id, newValue: task.taskCode });
  if (project.baId) await notify(project.baId, `New task created in ${project.name}`, "TASK_CREATED");
  res.status(201).json(task);
});

const DATE_FIELDS = new Set([
  "requirementReceived", "businessReqReceivedDate", "developerReqReceivedDate",
  "deliveryDate", "revisedDate",
]);
const NULLABLE_RELATION_FIELDS = new Set(["categoryId"]);
const EDITABLE_FIELDS = [
  "taskName", "categoryId", "emailSubject", "remarks", "requirementReceived",
  "description", "priority", "requirementReceivedFrom", "businessReqReceivedDate",
  "developerReqReceivedDate", "deliveryDate", "revisedDate", "reasonForDelay", "assignedTeam",
];

// BR-07: ownership-based editing (general field edits — Expected End Date is NOT editable here,
// it must go through /revise-eed to preserve the approval-aware audit trail per BR-09/10/11)
router.patch("/:id", auth, async (req, res) => {
  const task = await prisma.task.findFirst({ where: { id: req.params.id, isDeleted: false } });
  if (!task) return res.status(404).json({ error: "Task not found" });
  if (req.user.role === "BA" && task.createdById !== req.user.id && task.lobId !== req.user.lobId) {
    return res.status(403).json({ error: "Not authorized to edit this task" });
  }

  const data = {};
  for (const f of EDITABLE_FIELDS) {
    if (req.body[f] === undefined) continue;
    const v = req.body[f];
    if (DATE_FIELDS.has(f)) {
      data[f] = v ? new Date(v) : null; // "" from a cleared date input must become null, not stay ""
    } else if (NULLABLE_RELATION_FIELDS.has(f)) {
      data[f] = v ? v : null; // "" is not a valid foreign key — must be null
    } else {
      data[f] = v;
    }
  }
  console.log(`[PATCH /tasks/${task.id}] body:`, req.body);
  console.log(`[PATCH /tasks/${task.id}] resolved data:`, data);
  const updated = await prisma.task.update({ where: { id: task.id }, data });
  await logAudit({ entity: "Task", entityId: task.id, action: "UPDATE", userId: req.user.id });
  res.json(updated);
});

// BR-08: developer assignment - mandatory fields to move to Assigned
router.post("/:id/assign", auth, async (req, res) => {
  const { developerId, developerAssignedAt, expectedEndDate } = req.body;
  if (!developerId || !developerAssignedAt || !expectedEndDate) {
    return res.status(400).json({
      error: "developerId, developerAssignedAt, and expectedEndDate are all required before assignment (BR-08)",
    });
  }
  const task = await prisma.task.findFirst({ where: { id: req.params.id, isDeleted: false } });
  if (!task) return res.status(404).json({ error: "Task not found" });

  const updated = await prisma.task.update({
    where: { id: task.id },
    data: {
      developerId,
      developerAssignedAt: new Date(developerAssignedAt),
      expectedEndDate: new Date(expectedEndDate),
      caseStatus: "ASSIGNED",
    },
  });
  await prisma.taskStatusHistory.create({
    data: { taskId: task.id, fromStatus: task.caseStatus, toStatus: "ASSIGNED", changedBy: req.user.name },
  });
  await logAudit({ entity: "Task", entityId: task.id, action: "ASSIGN", userId: req.user.id, newValue: developerId });
  res.json(updated);
});

// Status workflow transition (Pending -> Assigned -> WIP -> Completed -> UAT -> Live, or Reopened)
const VALID_TRANSITIONS = {
  PENDING: ["ASSIGNED"],
  ASSIGNED: ["WIP"],
  WIP: ["COMPLETED"],
  COMPLETED: ["UAT"],
  UAT: ["LIVE", "REOPENED"],
  LIVE: ["REOPENED"],
  REOPENED: ["WIP"],
};

router.post("/:id/status", auth, async (req, res) => {
  const { toStatus, uatResult, note } = req.body;
  const task = await prisma.task.findFirst({ where: { id: req.params.id, isDeleted: false } });
  if (!task) return res.status(404).json({ error: "Task not found" });

  const allowed = VALID_TRANSITIONS[task.caseStatus] || [];
  if (!allowed.includes(toStatus)) {
    return res.status(400).json({ error: `Cannot move from ${task.caseStatus} to ${toStatus}` });
  }
  if (toStatus === "ASSIGNED" && (!task.developerId || !task.developerAssignedAt || !task.expectedEndDate)) {
    return res.status(400).json({ error: "Developer assignment fields must be set first (BR-08)" });
  }

  const data = { caseStatus: toStatus };
  if (toStatus === "UAT" && uatResult) data.uatResult = uatResult;
  if (toStatus === "LIVE") data.actualCompletionAt = new Date();
  if (toStatus === "REOPENED") data.actualCompletionAt = null;

  const updated = await prisma.task.update({ where: { id: task.id }, data });
  await prisma.taskStatusHistory.create({
    data: { taskId: task.id, fromStatus: task.caseStatus, toStatus, changedBy: req.user.name, note: note || null },
  });
  await logAudit({
    entity: "Task",
    entityId: task.id,
    field: "caseStatus",
    oldValue: task.caseStatus,
    newValue: toStatus,
    userId: req.user.id,
    action: "STATUS_CHANGE",
  });
  if (task.createdById) {
    await notify(task.createdById, `Task ${task.taskCode} moved to ${toStatus}`, "STATUS_CHANGE");
  }
  res.json(withDeadline(updated));
});

// BR-09/10/11: Expected End Date revision workflow
router.post("/:id/revise-eed", auth, async (req, res) => {
  const { newDate, managerApproved, reason } = req.body;
  if (!newDate || managerApproved === undefined || !reason) {
    return res.status(400).json({ error: "newDate, managerApproved, and reason are required" });
  }
  const task = await prisma.task.findFirst({ where: { id: req.params.id, isDeleted: false } });
  if (!task) return res.status(404).json({ error: "Task not found" });

  const revision = await prisma.eEDRevision.create({
    data: {
      taskId: task.id,
      oldDate: task.expectedEndDate,
      newDate: new Date(newDate),
      managerApproved: !!managerApproved,
      reason,
      changedById: req.user.id,
      changedByName: req.user.name,
    },
  });
  const updated = await prisma.task.update({
    where: { id: task.id },
    data: { expectedEndDate: new Date(newDate) },
  });
  await logAudit({
    entity: "Task",
    entityId: task.id,
    field: "expectedEndDate",
    oldValue: task.expectedEndDate,
    newValue: newDate,
    userId: req.user.id,
    action: "EED_REVISION",
  });
  if (task.createdById) {
    await notify(task.createdById, `Deadline revised for task ${task.taskCode}`, "DEADLINE_REVISED");
  }

  res.status(201).json({
    revision,
    task: updated,
    warning: managerApproved
      ? null
      : "Manager approval was not obtained. It is recommended to obtain approval before proceeding. (This is a soft warning; the change has been saved.)",
  });
});

router.get("/:id/eed-history", auth, async (req, res) => {
  const revisions = await prisma.eEDRevision.findMany({
    where: { taskId: req.params.id },
    orderBy: { changedAt: "desc" },
  });
  res.json(revisions);
});

router.delete("/:id", auth, async (req, res) => {
  const task = await prisma.task.findFirst({ where: { id: req.params.id } });
  if (!task) return res.status(404).json({ error: "Task not found" });
  if (req.user.role === "BA" && task.lobId !== req.user.lobId) {
    return res.status(403).json({ error: "Not authorized" });
  }
  await prisma.task.update({ where: { id: task.id }, data: { isDeleted: true } });
  await logAudit({ entity: "Task", entityId: task.id, action: "DELETE", userId: req.user.id });
  res.json({ success: true });
});

module.exports = router;
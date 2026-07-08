const router = require("express").Router();
const prisma = require("../prisma");
const { auth, requireAdmin, scopeLOB } = require("../middleware/auth");
const { logAudit, genCode } = require("../utils/helpers");

router.get("/", auth, async (req, res) => {
  const { search, status, lobId } = req.query;
  const where = { isDeleted: false, ...scopeLOB(req) };
  if (status) where.status = status;
  if (req.user.role === "ADMIN" && lobId) where.lobId = lobId;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { projectCode: { contains: search, mode: "insensitive" } },
      { businessOwner: { contains: search, mode: "insensitive" } },
    ];
  }
  const projects = await prisma.project.findMany({
    where,
    include: {
      lob: true,
      ba: { select: { id: true, name: true } },
      _count: { select: { tasks: true, bugs: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  res.json(projects);
});

router.get("/:id", auth, async (req, res) => {
  const project = await prisma.project.findFirst({
    where: { id: req.params.id, isDeleted: false, ...scopeLOB(req) },
    include: { lob: true, ba: { select: { id: true, name: true } } },
  });
  if (!project) return res.status(404).json({ error: "Project not found" });
  res.json(project);
});

// BR-01: create project
router.post("/", auth, async (req, res) => {
  const { name, description, lobId, businessOwner, baId, startDate, expectedEndDate, remarks, status } = req.body;
  if (!name || !lobId) return res.status(400).json({ error: "name and lobId are required" });
  if (req.user.role === "BA" && lobId !== req.user.lobId) {
    return res.status(403).json({ error: "BA can only create projects within their own LOB" }); // BR-03
  }
  const project = await prisma.project.create({
    data: {
      projectCode: genCode("PRJ"),
      name,
      description: description || null,
      status: status || "PLANNING",
      lobId,
      businessOwner: businessOwner || null,
      baId: baId || (req.user.role === "BA" ? req.user.id : null),
      startDate: startDate ? new Date(startDate) : null,
      expectedEndDate: expectedEndDate ? new Date(expectedEndDate) : null,
      remarks: remarks || null,
    },
  });
  await logAudit({ entity: "Project", entityId: project.id, action: "CREATE", userId: req.user.id, newValue: name });
  res.status(201).json(project);
});

// BR-07 style ownership check + BR-02 status lifecycle
router.patch("/:id", auth, async (req, res) => {
  const project = await prisma.project.findFirst({ where: { id: req.params.id, isDeleted: false } });
  if (!project) return res.status(404).json({ error: "Project not found" });
  if (req.user.role === "BA" && project.lobId !== req.user.lobId) {
    return res.status(403).json({ error: "Not authorized to edit this project" }); // BR-03
  }

  const fields = ["name", "description", "status", "businessOwner", "baId", "startDate", "expectedEndDate", "remarks"];
  const data = {};
  for (const f of fields) {
    if (req.body[f] !== undefined) {
      data[f] = f.includes("Date") && req.body[f] ? new Date(req.body[f]) : req.body[f];
    }
  }
  const updated = await prisma.project.update({ where: { id: project.id }, data });

  for (const f of Object.keys(data)) {
    if (String(project[f]) !== String(data[f])) {
      await logAudit({
        entity: "Project",
        entityId: project.id,
        field: f,
        oldValue: project[f],
        newValue: data[f],
        userId: req.user.id,
        action: "UPDATE",
      });
    }
  }
  res.json(updated);
});

// BR-04: soft delete for BA, hard delete for Admin
router.delete("/:id", auth, async (req, res) => {
  const project = await prisma.project.findFirst({ where: { id: req.params.id } });
  if (!project) return res.status(404).json({ error: "Project not found" });
  if (req.user.role === "BA" && project.lobId !== req.user.lobId) {
    return res.status(403).json({ error: "Not authorized" });
  }
  if (req.user.role === "ADMIN") {
    await prisma.project.delete({ where: { id: project.id } });
    await logAudit({ entity: "Project", entityId: project.id, action: "HARD_DELETE", userId: req.user.id });
  } else {
    await prisma.project.update({ where: { id: project.id }, data: { isDeleted: true } });
    await logAudit({ entity: "Project", entityId: project.id, action: "SOFT_DELETE", userId: req.user.id });
  }
  res.json({ success: true });
});

// Project-level dashboard (BR-21)
router.get("/:id/dashboard", auth, async (req, res) => {
  const project = await prisma.project.findFirst({ where: { id: req.params.id, ...scopeLOB(req) } });
  if (!project) return res.status(404).json({ error: "Project not found" });

  const tasks = await prisma.task.findMany({ where: { projectId: project.id, isDeleted: false } });
  const bugs = await prisma.bug.findMany({ where: { projectId: project.id, isDeleted: false } });

  const statusCounts = {};
  for (const t of tasks) statusCounts[t.caseStatus] = (statusCounts[t.caseStatus] || 0) + 1;
  const completed = tasks.filter((t) => t.caseStatus === "LIVE").length;
  const completionPct = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;

  const bugCounts = {};
  for (const b of bugs) bugCounts[b.status] = (bugCounts[b.status] || 0) + 1;

  res.json({
    project,
    taskCount: tasks.length,
    statusCounts,
    completionPct,
    bugCount: bugs.length,
    bugCounts,
    recentTasks: tasks.slice(-5).reverse(),
  });
});

module.exports = router;

const router = require("express").Router();
const prisma = require("../prisma");
const { auth, scopeLOB } = require("../middleware/auth");
const { logAudit, genCode } = require("../utils/helpers");

router.get("/", auth, async (req, res) => {
  const { search, status, priority, projectId } = req.query;
  const where = { isDeleted: false, ...scopeLOB(req) }; // BR-15
  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (projectId) where.projectId = projectId;
  if (search) where.OR = [
    { title: { contains: search, mode: "insensitive" } },
    { bugCode: { contains: search, mode: "insensitive" } },
  ];

  const bugs = await prisma.bug.findMany({
    where,
    include: { project: { select: { id: true, name: true } }, developer: true, lob: true },
    orderBy: { createdAt: "desc" },
  });
  res.json(bugs);
});

router.post("/", auth, async (req, res) => {
  const { title, description, projectId, lobId, priority, developerId } = req.body;
  if (!title) return res.status(400).json({ error: "title is required" });
  const targetLobId = lobId || req.user.lobId;
  if (req.user.role === "BA" && targetLobId !== req.user.lobId) {
    return res.status(403).json({ error: "BA can only log bugs for their own LOB" });
  }
  const bug = await prisma.bug.create({
    data: {
      bugCode: genCode("BUG"),
      title,
      description: description || null,
      projectId: projectId || null,
      lobId: targetLobId,
      priority: priority || "MEDIUM",
      developerId: developerId || null,
      createdById: req.user.id,
    },
  });
  await logAudit({ entity: "Bug", entityId: bug.id, action: "CREATE", userId: req.user.id, newValue: title });
  res.status(201).json(bug);
});

router.patch("/:id", auth, async (req, res) => {
  const bug = await prisma.bug.findFirst({ where: { id: req.params.id, isDeleted: false } });
  if (!bug) return res.status(404).json({ error: "Bug not found" });
  if (req.user.role === "BA" && bug.lobId !== req.user.lobId) {
    return res.status(403).json({ error: "Not authorized" });
  }
  const fields = ["title", "description", "status", "priority", "developerId", "projectId"];
  const data = {};
  for (const f of fields) if (req.body[f] !== undefined) data[f] = req.body[f];

  const updated = await prisma.bug.update({ where: { id: bug.id }, data });
  for (const f of Object.keys(data)) {
    if (String(bug[f]) !== String(data[f])) {
      await logAudit({
        entity: "Bug",
        entityId: bug.id,
        field: f,
        oldValue: bug[f],
        newValue: data[f],
        userId: req.user.id,
        action: "UPDATE",
      });
    }
  }
  res.json(updated);
});

router.delete("/:id", auth, async (req, res) => {
  const bug = await prisma.bug.findFirst({ where: { id: req.params.id } });
  if (!bug) return res.status(404).json({ error: "Bug not found" });
  if (req.user.role === "BA" && bug.lobId !== req.user.lobId) {
    return res.status(403).json({ error: "Not authorized" });
  }
  await prisma.bug.update({ where: { id: bug.id }, data: { isDeleted: true } });
  await logAudit({ entity: "Bug", entityId: bug.id, action: "DELETE", userId: req.user.id });
  res.json({ success: true });
});

module.exports = router;

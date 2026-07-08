const router = require("express").Router();
const prisma = require("../prisma");
const { auth, requireAdmin } = require("../middleware/auth");

router.get("/notifications", auth, async (req, res) => {
  const items = await prisma.notification.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  res.json(items);
});

router.patch("/notifications/:id/read", auth, async (req, res) => {
  const n = await prisma.notification.update({ where: { id: req.params.id }, data: { isRead: true } });
  res.json(n);
});

router.patch("/notifications/read-all", auth, async (req, res) => {
  await prisma.notification.updateMany({ where: { userId: req.user.id, isRead: false }, data: { isRead: true } });
  res.json({ success: true });
});

// BR-24: full audit log, Admin only
router.get("/audit-logs", auth, requireAdmin, async (req, res) => {
  const { entity, entityId } = req.query;
  const where = {};
  if (entity) where.entity = entity;
  if (entityId) where.entityId = entityId;
  const logs = await prisma.auditLog.findMany({
    where,
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: 300,
  });
  res.json(logs);
});

module.exports = router;

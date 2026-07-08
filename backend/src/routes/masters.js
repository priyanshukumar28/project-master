const router = require("express").Router();
const prisma = require("../prisma");
const { auth, requireAdmin } = require("../middleware/auth");

// LOB
router.get("/lobs", auth, async (req, res) => {
  res.json(await prisma.lOB.findMany({ orderBy: { name: "asc" } }));
});
router.post("/lobs", auth, requireAdmin, async (req, res) => {
  try {
    res.status(201).json(await prisma.lOB.create({ data: { name: req.body.name } }));
  } catch {
    res.status(400).json({ error: "LOB already exists" });
  }
});

// Categories (BR-06, NFR-05: configurable without code change)
router.get("/categories", auth, async (req, res) => {
  res.json(await prisma.category.findMany({ where: { active: true }, orderBy: { name: "asc" } }));
});
router.post("/categories", auth, requireAdmin, async (req, res) => {
  try {
    res.status(201).json(await prisma.category.create({ data: { name: req.body.name } }));
  } catch {
    res.status(400).json({ error: "Category already exists" });
  }
});
router.patch("/categories/:id", auth, requireAdmin, async (req, res) => {
  res.json(await prisma.category.update({ where: { id: req.params.id }, data: req.body }));
});

// Developers (referenced, not system users - Section 9.1)
router.get("/developers", auth, async (req, res) => {
  res.json(await prisma.developer.findMany({ where: { active: true }, orderBy: { name: "asc" } }));
});
router.post("/developers", auth, requireAdmin, async (req, res) => {
  try {
    res.status(201).json(
      await prisma.developer.create({ data: { name: req.body.name, email: req.body.email || null } })
    );
  } catch {
    res.status(400).json({ error: "Developer already exists" });
  }
});
router.patch("/developers/:id", auth, requireAdmin, async (req, res) => {
  res.json(await prisma.developer.update({ where: { id: req.params.id }, data: req.body }));
});

module.exports = router;

const router = require("express").Router();
const prisma = require("../prisma");
const { auth, requireAdmin, scopeLOB } = require("../middleware/auth");

function slugCode(name) {
  return (name || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 4) || "GEN";
}

async function uniqueLobCode(base) {
  let code = base;
  let n = 1;
  while (await prisma.lOB.findUnique({ where: { code } })) {
    n++;
    code = `${base}${n}`;
  }
  return code;
}

// LOB
router.get("/lobs", auth, async (req, res) => {
  res.json(await prisma.lOB.findMany({ orderBy: { name: "asc" } }));
});
router.post("/lobs", auth, requireAdmin, async (req, res) => {
  const name = (req.body.name || "").trim();
  if (!name) return res.status(400).json({ error: "name is required" });
  const code = await uniqueLobCode(slugCode(req.body.code || name));
  try {
    res.status(201).json(await prisma.lOB.create({ data: { name, code } }));
  } catch {
    res.status(400).json({ error: "LOB already exists" });
  }
});
router.patch("/lobs/:id", auth, requireAdmin, async (req, res) => {
  const data = {};
  if (req.body.name !== undefined) data.name = req.body.name;
  if (req.body.code !== undefined) data.code = slugCode(req.body.code);
  try {
    res.json(await prisma.lOB.update({ where: { id: req.params.id }, data }));
  } catch {
    res.status(400).json({ error: "That name or code is already in use" });
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

// Developers — LOB-specific (BA sees only their own LOB's developers + unassigned/global ones;
// Admin sees and manages all, and picks a LOB when creating one).
router.get("/developers", auth, async (req, res) => {
  const { lobId } = req.query;
  const where = { active: true };
  if (req.user.role === "BA") {
    where.OR = [{ lobId: req.user.lobId }, { lobId: null }];
  } else if (lobId) {
    where.OR = [{ lobId }, { lobId: null }];
  }
  res.json(await prisma.developer.findMany({ where, include: { lob: true }, orderBy: { name: "asc" } }));
});
router.post("/developers", auth, requireAdmin, async (req, res) => {
  const name = (req.body.name || "").trim();
  if (!name) return res.status(400).json({ error: "name is required" });
  try {
    res.status(201).json(
      await prisma.developer.create({
        data: { name, email: req.body.email || null, lobId: req.body.lobId || null },
        include: { lob: true },
      })
    );
  } catch {
    res.status(400).json({ error: "That developer already exists for this LOB" });
  }
});
router.patch("/developers/:id", auth, requireAdmin, async (req, res) => {
  const data = {};
  if (req.body.name !== undefined) data.name = req.body.name;
  if (req.body.email !== undefined) data.email = req.body.email;
  if (req.body.lobId !== undefined) data.lobId = req.body.lobId || null;
  if (req.body.active !== undefined) data.active = req.body.active;
  res.json(await prisma.developer.update({ where: { id: req.params.id }, data, include: { lob: true } }));
});

// Business Analysts registered under a given LOB — for assigning a project's BA in the edit form.
router.get("/bas", auth, async (req, res) => {
  const { lobId } = req.query;
  if (!lobId) return res.status(400).json({ error: "lobId is required" });
  const bas = await prisma.user.findMany({
    where: { role: "BA", lobId, active: true },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });
  res.json(bas);
});

module.exports = router;
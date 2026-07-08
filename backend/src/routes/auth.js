const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../prisma");
const { auth, requireAdmin } = require("../middleware/auth");
const { logAudit } = require("../utils/helpers");

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email and password required" });

  const user = await prisma.user.findUnique({ where: { email }, include: { lob: true } });
  if (!user || !user.active) return res.status(401).json({ error: "Invalid credentials" });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });

  const payload = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    lobId: user.lobId,
    lobName: user.lob ? user.lob.name : null,
  };
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "12h" });
  res.json({ token, user: payload });
});

router.get("/me", auth, async (req, res) => res.json({ user: req.user }));

router.get("/users", auth, requireAdmin, async (req, res) => {
  const users = await prisma.user.findMany({ include: { lob: true }, orderBy: { createdAt: "desc" } });
  res.json(users.map(({ passwordHash, ...u }) => u));
});

router.post("/users", auth, requireAdmin, async (req, res) => {
  const { name, email, password, role, lobId } = req.body;
  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: "name, email, password, role are required" });
  }
  if (role === "BA" && !lobId) return res.status(400).json({ error: "BA users must be assigned a LOB" });

  const passwordHash = await bcrypt.hash(password, 10);
  try {
    const user = await prisma.user.create({
      data: { name, email, passwordHash, role, lobId: role === "BA" ? lobId : null },
    });
    await logAudit({ entity: "User", entityId: user.id, action: "CREATE", userId: req.user.id, newValue: email });
    const { passwordHash: _, ...safe } = user;
    res.status(201).json(safe);
  } catch (e) {
    res.status(400).json({ error: "Email already exists" });
  }
});

router.patch("/users/:id", auth, requireAdmin, async (req, res) => {
  const { name, role, lobId, active, password } = req.body;
  const data = {};
  if (name !== undefined) data.name = name;
  if (role !== undefined) data.role = role;
  if (lobId !== undefined) data.lobId = lobId;
  if (active !== undefined) data.active = active;
  if (password) data.passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.update({ where: { id: req.params.id }, data });
  await logAudit({ entity: "User", entityId: user.id, action: "UPDATE", userId: req.user.id });
  const { passwordHash, ...safe } = user;
  res.json(safe);
});

module.exports = router;

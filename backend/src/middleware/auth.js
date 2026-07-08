const jwt = require("jsonwebtoken");

function auth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing auth token" });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (e) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

function requireAdmin(req, res, next) {
  if (req.user.role !== "ADMIN") return res.status(403).json({ error: "Admin access required" });
  next();
}

// Restricts a BA's queries to their own LOB; Admin passes through untouched.
function scopeLOB(req) {
  if (req.user.role === "ADMIN") return {};
  return { lobId: req.user.lobId };
}

module.exports = { auth, requireAdmin, scopeLOB };

require("dotenv").config();
require("express-async-errors");
const express = require("express");
const cors = require("cors");

process.on("unhandledRejection", (err) => {
  console.error("Unhandled rejection:", err);
});
process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
});

const app = express();
app.use(
  cors({
    origin: [
      "http://localhost:5173", // Local development
      process.env.FRONTEND_URL, // Vercel production URL
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);


app.use(express.json({ limit: "15mb" }));

// Fail fast instead of hanging forever if a request (e.g. a stuck DB call) never resolves.
app.use((req, res, next) => {
  req.setTimeout(15000, () => {
    if (!res.headersSent) res.status(503).json({ error: "Request timed out — database may be unreachable" });
  });
  next();
});

// Fail fast instead of hanging forever if the DB (or anything downstream) never responds.
app.use((req, res, next) => {
  res.setTimeout(15000, () => {
    if (!res.headersSent) {
      res.status(503).json({ error: "Request timed out — database may be unreachable" });
    }
  });
  next();
});

const authRoutes = require("./routes/auth");
const masterRoutes = require("./routes/masters");
const projectRoutes = require("./routes/projects");
const taskRoutes = require("./routes/tasks");
const bugRoutes = require("./routes/bugs");
const uploadRoutes = require("./routes/upload");
const dashboardRoutes = require("./routes/dashboard");
const reportRoutes = require("./routes/reports");
const miscRoutes = require("./routes/misc");



app.get("/api/health", (req, res) => res.json({ status: "ok", service: "Project Master API" }));

app.use("/api/auth", authRoutes);
app.use("/api/masters", masterRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/bugs", bugRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api", miscRoutes);

app.use((err, req, res, next) => {
  console.error(`[${req.method} ${req.originalUrl}]`, err);
  const status = err.statusCode || 500;
  res.status(status).json({
    error: err.message || "Internal server error",
    code: err.code || undefined,
  });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Project Master API running on port ${PORT}`));
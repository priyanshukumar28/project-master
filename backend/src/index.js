require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();
app.use(
  cors({
    origin: [
      "http://localhost:5173", // Local development
      process.env.FRONTEND_URL, // Vercel production URL
    ],
    credentials: true,
  })
);

app.use(express.json({ limit: "15mb" }));

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
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Project Master API running on port ${PORT}`));

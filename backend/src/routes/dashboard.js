const router = require("express").Router();
const prisma = require("../prisma");
const { auth, scopeLOB } = require("../middleware/auth");
const { computeDeadlineStatus } = require("../utils/helpers");

router.get("/home", auth, async (req, res) => {
  const lobFilter = scopeLOB(req);

  const projects = await prisma.project.findMany({ where: { isDeleted: false, ...lobFilter } });
  const tasks = await prisma.task.findMany({ where: { isDeleted: false, ...lobFilter } });
  const bugs = await prisma.bug.findMany({ where: { isDeleted: false, ...lobFilter } });
  const lobs = await prisma.lOB.findMany();

  const statusCounts = {};
  let overdue = 0,
    dueToday = 0;
  for (const t of tasks) {
    statusCounts[t.caseStatus] = (statusCounts[t.caseStatus] || 0) + 1;
    const { deadlineStatus } = computeDeadlineStatus(t);
    if (deadlineStatus === "OVERDUE") overdue++;
    if (deadlineStatus === "DUE_TODAY") dueToday++;
  }

  const projectsByLob = {};
  for (const p of projects) {
    const lob = lobs.find((l) => l.id === p.lobId);
    const key = lob ? lob.name : "Unknown";
    projectsByLob[key] = (projectsByLob[key] || 0) + 1;
  }

  const liveTasks = tasks.filter((t) => t.caseStatus === "LIVE" && t.actualCompletionAt);
  const monthly = {};
  for (const t of liveTasks) {
    const d = new Date(t.actualCompletionAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthly[key] = (monthly[key] || 0) + 1;
  }

  res.json({
    totalProjects: projects.length,
    totalTasks: tasks.length,
    totalBugs: bugs.length,
    statusCounts,
    overdueCount: overdue,
    dueTodayCount: dueToday,
    projectsByLob,
    monthlyProgress: monthly,
    bugsByPriority: bugs.reduce((acc, b) => ({ ...acc, [b.priority]: (acc[b.priority] || 0) + 1 }), {}),
  });
});

module.exports = router;

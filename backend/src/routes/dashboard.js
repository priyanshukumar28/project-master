const router = require("express").Router();
const prisma = require("../prisma");
const { auth, scopeLOB } = require("../middleware/auth");
const { computeDeadlineStatus } = require("../utils/helpers");

router.get("/home", auth, async (req, res) => {
  const lobFilter = scopeLOB(req);

  const projects = await prisma.project.findMany({ where: { isDeleted: false, ...lobFilter } });
  const tasks = await prisma.task.findMany({
    where: { isDeleted: false, ...lobFilter },
    include: { developer: true, category: true },
  });
  const bugs = await prisma.bug.findMany({ where: { isDeleted: false, ...lobFilter } });
  const lobs = await prisma.lOB.findMany();
  const developers = await prisma.developer.findMany({ where: { active: true } });

  // --- Core status counts + deadline flags ---
  const statusCounts = {};
  let overdue = 0, dueToday = 0, reopenedCount = 0, inProgressCount = 0, completedNotLiveCount = 0;
  for (const t of tasks) {
    statusCounts[t.caseStatus] = (statusCounts[t.caseStatus] || 0) + 1;
    const { deadlineStatus } = computeDeadlineStatus(t);
    if (deadlineStatus === "OVERDUE") overdue++;
    if (deadlineStatus === "DUE_TODAY") dueToday++;
    if (t.caseStatus === "REOPENED") reopenedCount++;
    if (t.caseStatus === "WIP") inProgressCount++;
    // "Done but not live": dev work finished (Completed) or sitting in UAT, not yet pushed Live.
    if (t.caseStatus === "COMPLETED" || t.caseStatus === "UAT") completedNotLiveCount++;
  }

  // --- Projects by LOB + by status ---
  const projectsByLob = {};
  const projectStatusCounts = {};
  for (const p of projects) {
    const lob = lobs.find((l) => l.id === p.lobId);
    const key = lob ? lob.name : "Unknown";
    projectsByLob[key] = (projectsByLob[key] || 0) + 1;
    projectStatusCounts[p.status] = (projectStatusCounts[p.status] || 0) + 1;
  }

  // --- Monthly delivery trend (tasks that went Live) ---
  const liveTasks = tasks.filter((t) => t.caseStatus === "LIVE" && t.actualCompletionAt);
  const monthly = {};
  for (const t of liveTasks) {
    const d = new Date(t.actualCompletionAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthly[key] = (monthly[key] || 0) + 1;
  }

  // --- Category / module breakdown (Development, Change Request, Bug Fix, Maintenance, Production Movement) ---
  const categoryCounts = {};
  for (const t of tasks) {
    const key = t.category ? t.category.name : "Uncategorized";
    categoryCounts[key] = (categoryCounts[key] || 0) + 1;
  }

  // --- Developer leaderboard: workload, delivery volume, on-time rate, avg cycle time ---
  const devMap = {};
  for (const d of developers) {
    devMap[d.id] = {
      developerId: d.id,
      name: d.name,
      totalAssigned: 0,
      wipCount: 0,
      liveCount: 0,
      onTimeCount: 0,
      lateCount: 0,
      reopenedCount: 0,
      cycleDaysSum: 0,
      cycleDaysCount: 0,
    };
  }
  for (const t of tasks) {
    if (!t.developerId || !devMap[t.developerId]) continue;
    const row = devMap[t.developerId];
    row.totalAssigned++;
    if (t.caseStatus === "WIP") row.wipCount++;
    if (t.caseStatus === "REOPENED") row.reopenedCount++;
    if (t.caseStatus === "LIVE") {
      row.liveCount++;
      const { deadlineStatus } = computeDeadlineStatus(t);
      if (deadlineStatus === "COMPLETED_ON_TIME") row.onTimeCount++;
      if (deadlineStatus === "COMPLETED_LATE") row.lateCount++;
      if (t.developerAssignedAt && t.actualCompletionAt) {
        const days = (new Date(t.actualCompletionAt) - new Date(t.developerAssignedAt)) / (1000 * 60 * 60 * 24);
        if (days >= 0) { row.cycleDaysSum += days; row.cycleDaysCount++; }
      }
    }
  }
  const developerLeaderboard = Object.values(devMap)
    .filter((d) => d.totalAssigned > 0)
    .map((d) => ({
      developerId: d.developerId,
      name: d.name,
      totalAssigned: d.totalAssigned,
      wipCount: d.wipCount,
      liveCount: d.liveCount,
      reopenedCount: d.reopenedCount,
      onTimePct: d.liveCount ? Math.round((d.onTimeCount / d.liveCount) * 100) : null,
      avgCycleDays: d.cycleDaysCount ? Math.round((d.cycleDaysSum / d.cycleDaysCount) * 10) / 10 : null,
    }))
    .sort((a, b) => b.liveCount - a.liveCount || (b.onTimePct ?? 0) - (a.onTimePct ?? 0));

  // --- Bugs ---
  const bugsByPriority = bugs.reduce((acc, b) => ({ ...acc, [b.priority]: (acc[b.priority] || 0) + 1 }), {});
  const bugsOpenCount = bugs.filter((b) => !["RESOLVED", "CLOSED"].includes(b.status)).length;
  const bugsResolvedCount = bugs.filter((b) => ["RESOLVED", "CLOSED"].includes(b.status)).length;

  res.json({
    totalProjects: projects.length,
    totalTasks: tasks.length,
    totalBugs: bugs.length,
    statusCounts,
    overdueCount: overdue,
    dueTodayCount: dueToday,
    reopenedCount,
    inProgressCount,
    completedNotLiveCount,
    activeProjectsCount: projectStatusCounts.ACTIVE || 0,
    projectStatusCounts,
    projectsByLob,
    monthlyProgress: monthly,
    categoryCounts,
    developerLeaderboard,
    bugsByPriority,
    bugsOpenCount,
    bugsResolvedCount,
  });
});

module.exports = router;
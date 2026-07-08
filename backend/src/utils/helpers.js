const prisma = require("../prisma");

async function logAudit({ entity, entityId, field, oldValue, newValue, userId, action }) {
  return prisma.auditLog.create({
    data: {
      entity,
      entityId,
      field: field || null,
      oldValue: oldValue === undefined || oldValue === null ? null : String(oldValue),
      newValue: newValue === undefined || newValue === null ? null : String(newValue),
      userId: userId || null,
      action,
    },
  });
}

async function notify(userId, message, type) {
  if (!userId) return;
  return prisma.notification.create({ data: { userId, message, type } });
}

// BR-12 / BR-13: derive deadline/SLA status for a task
function computeDeadlineStatus(task) {
  const now = new Date();
  const eed = task.expectedEndDate ? new Date(task.expectedEndDate) : null;
  const isComplete = task.caseStatus === "LIVE";

  if (!eed) return { deadlineStatus: "NOT_SCHEDULED", missedByDays: null };

  if (isComplete) {
    // Prefer the real delivery date (from the tracker / import) over actualCompletionAt
    // (only set when the app itself drives the LIVE transition) over "now" as a last resort.
    const reference = task.deliveryDate || task.actualCompletionAt || now;
    const completedAt = new Date(reference);
    const eedDay = eed.toDateString();
    const completedDay = completedAt.toDateString();

    // Same calendar day as Expected End Date = on time, no matter what the clock says.
    if (completedDay === eedDay) return { deadlineStatus: "COMPLETED_ON_TIME", missedByDays: 0 };

    const diffDays = Math.floor((new Date(completedDay) - new Date(eedDay)) / (1000 * 60 * 60 * 24));
    if (diffDays > 0) return { deadlineStatus: "COMPLETED_LATE", missedByDays: diffDays };
    return { deadlineStatus: "COMPLETED_ON_TIME", missedByDays: 0 };
  }

  const today = new Date(now.toDateString());
  const dueDate = new Date(eed.toDateString());
  if (dueDate.getTime() === today.getTime()) return { deadlineStatus: "DUE_TODAY", missedByDays: 0 };
  if (dueDate.getTime() < today.getTime()) {
    const diffDays = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
    return { deadlineStatus: "OVERDUE", missedByDays: diffDays };
  }
  return { deadlineStatus: "ON_TRACK", missedByDays: null };
}

function genCode(prefix) {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.floor(Math.random() * 900 + 100);
  return `${prefix}-${ts}${rand}`;
}

module.exports = { logAudit, notify, computeDeadlineStatus, genCode };
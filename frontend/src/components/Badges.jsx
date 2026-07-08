const CASE_STATUS_STYLES = {
  PENDING: "bg-ink-500/10 text-ink-500",
  ASSIGNED: "bg-aa-blue-50 text-aa-blue-700",
  WIP: "bg-aa-orange-50 text-aa-orange-700",
  COMPLETED: "bg-emerald-50 text-emerald-700",
  UAT: "bg-purple-50 text-purple-700",
  LIVE: "bg-emerald-100 text-emerald-800",
  REOPENED: "bg-rose-50 text-rose-700",
};

const DEADLINE_STYLES = {
  ON_TRACK: "bg-emerald-50 text-emerald-700",
  DUE_TODAY: "bg-aa-orange-50 text-aa-orange-700",
  OVERDUE: "bg-rose-50 text-rose-700",
  COMPLETED_ON_TIME: "bg-emerald-50 text-emerald-700",
  COMPLETED_LATE: "bg-rose-50 text-rose-700",
  NOT_SCHEDULED: "bg-ink-500/10 text-ink-500",
};

const BUG_PRIORITY_STYLES = {
  CRITICAL: "bg-rose-100 text-rose-800",
  HIGH: "bg-aa-orange-100 text-aa-orange-700",
  MEDIUM: "bg-aa-blue-50 text-aa-blue-700",
  LOW: "bg-ink-500/10 text-ink-500",
};

const PROJECT_STATUS_STYLES = {
  PLANNING: "bg-ink-500/10 text-ink-500",
  ACTIVE: "bg-aa-blue-50 text-aa-blue-700",
  ON_HOLD: "bg-aa-orange-50 text-aa-orange-700",
  COMPLETED: "bg-emerald-50 text-emerald-700",
  CANCELLED: "bg-rose-50 text-rose-700",
};

function Pill({ label, className }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${className}`}>
      {label.replace(/_/g, " ")}
    </span>
  );
}

export function CaseStatusBadge({ status }) {
  return <Pill label={status} className={CASE_STATUS_STYLES[status] || "bg-ink-500/10 text-ink-500"} />;
}
export function DeadlineBadge({ status }) {
  if (!status) return null;
  return <Pill label={status} className={DEADLINE_STYLES[status] || "bg-ink-500/10 text-ink-500"} />;
}
export function BugPriorityBadge({ priority }) {
  return <Pill label={priority} className={BUG_PRIORITY_STYLES[priority] || "bg-ink-500/10 text-ink-500"} />;
}
export function ProjectStatusBadge({ status }) {
  return <Pill label={status} className={PROJECT_STATUS_STYLES[status] || "bg-ink-500/10 text-ink-500"} />;
}

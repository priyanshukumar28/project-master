import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../api/client";
import Modal from "../components/Modal";
import { SkeletonTable } from "../components/Skeleton";
import { CaseStatusBadge, DeadlineBadge, BugPriorityBadge } from "../components/Badges";
import { Plus, Search, UserPlus, ArrowRightCircle, History, Clock } from "lucide-react";

const NEXT_STATUS = {
  PENDING: "ASSIGNED", ASSIGNED: "WIP", WIP: "COMPLETED", COMPLETED: "UAT", UAT: "LIVE", REOPENED: "WIP",
};

export default function Tasks() {
  const [params] = useSearchParams();
  const [tasks, setTasks] = useState(null);
  const [projects, setProjects] = useState([]);
  const [categories, setCategories] = useState([]);
  const [developers, setDevelopers] = useState([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [deadline, setDeadline] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [assignTask, setAssignTask] = useState(null);
  const [eedTask, setEedTask] = useState(null);
  const [historyTask, setHistoryTask] = useState(null);
  const [form, setForm] = useState({ projectId: params.get("projectId") || "", taskName: "", categoryId: "", emailSubject: "", remarks: "" });
  const [error, setError] = useState("");

  const load = () => {
    api.get("/tasks", { params: {
      search: search || undefined, status: status || undefined, deadline: deadline || undefined,
      projectId: params.get("projectId") || undefined,
    }}).then((r) => setTasks(r.data));
  };

  useEffect(() => { load(); }, [search, status, deadline]);
  useEffect(() => {
    api.get("/projects").then((r) => setProjects(r.data));
    api.get("/masters/categories").then((r) => setCategories(r.data));
    api.get("/masters/developers").then((r) => setDevelopers(r.data));
  }, []);

  const createTask = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.post("/tasks", form);
      setCreateOpen(false);
      setForm({ projectId: "", taskName: "", categoryId: "", emailSubject: "", remarks: "" });
      load();
    } catch (err) {
      setError(err.response?.data?.error || "Could not create task");
    }
  };

  const advance = async (task) => {
    const to = NEXT_STATUS[task.caseStatus];
    if (!to) return;
    try {
      await api.post(`/tasks/${task.id}/status`, { toStatus: to });
      load();
    } catch (err) {
      alert(err.response?.data?.error || "Could not update status");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-900">Task Tracker</h1>
          <p className="text-ink-500 text-sm mt-1">Pending → Assigned → WIP → Completed → UAT → Live</p>
        </div>
        <button onClick={() => setCreateOpen(true)} className="flex items-center gap-2 bg-aa-blue-600 hover:bg-aa-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl focus-ring press-scale">
          <Plus size={16} /> New Task
        </button>
      </div>

      <div className="flex flex-wrap gap-3 animate-fade-in">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tasks…"
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-line-200 text-sm focus-ring" />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="px-3 py-2.5 rounded-xl border border-line-200 text-sm focus-ring">
          <option value="">All statuses</option>
          {["PENDING", "ASSIGNED", "WIP", "COMPLETED", "UAT", "LIVE", "REOPENED"].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={deadline} onChange={(e) => setDeadline(e.target.value)} className="px-3 py-2.5 rounded-xl border border-line-200 text-sm focus-ring">
          <option value="">All deadlines</option>
          {["ON_TRACK", "DUE_TODAY", "OVERDUE", "COMPLETED_ON_TIME", "COMPLETED_LATE"].map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
        </select>
      </div>

      {tasks === null ? (
        <SkeletonTable rows={7} cols={6} />
      ) : (
      <div className="bg-white rounded-2xl shadow-card overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead className="bg-paper-50 text-ink-500 text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-5 py-3 font-semibold">Task</th>
              <th className="text-left px-5 py-3 font-semibold">Project</th>
              <th className="text-left px-5 py-3 font-semibold">Status</th>
              <th className="text-left px-5 py-3 font-semibold">Priority</th>
              <th className="text-left px-5 py-3 font-semibold">Developer</th>
              <th className="text-left px-5 py-3 font-semibold">Deadline</th>
              <th className="text-right px-5 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((t, i) => (
              <tr key={t.id} style={{ animationDelay: `${i * 20}ms` }} className="row-enter border-t border-line-200 hover:bg-paper-50/60 transition-colors">
                <td className="px-5 py-3.5">
                  <Link to={`/tasks/${t.id}`} className="font-medium text-ink-900 hover:text-aa-blue-600 transition-colors">
                    {t.taskName || <span className="text-ink-300 italic">Untitled</span>}
                  </Link>
                  <div className="text-xs text-ink-300 font-mono">{t.taskCode}</div>
                </td>
                <td className="px-5 py-3.5 text-ink-500">{t.project?.name}</td>
                <td className="px-5 py-3.5"><CaseStatusBadge status={t.caseStatus} /></td>
                <td className="px-5 py-3.5">{t.priority && <BugPriorityBadge priority={t.priority} />}</td>
                <td className="px-5 py-3.5 text-ink-500">{t.developer?.name || t.assignedTeam || "Unassigned"}</td>
                <td className="px-5 py-3.5">
                  <DeadlineBadge status={t.deadlineStatus} />
                  {t.missedByDays > 0 && <span className="text-xs text-rose-500 ml-1">({t.missedByDays}d)</span>}
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center justify-end gap-1.5">
                    {t.caseStatus === "PENDING" && (
                      <IconBtn title="Assign developer" onClick={() => setAssignTask(t)}><UserPlus size={15} /></IconBtn>
                    )}
                    {NEXT_STATUS[t.caseStatus] && t.caseStatus !== "PENDING" && t.caseStatus !== "UAT" && (
                      <IconBtn title={`Move to ${NEXT_STATUS[t.caseStatus]}`} onClick={() => advance(t)}><ArrowRightCircle size={15} /></IconBtn>
                    )}
                    {t.caseStatus === "UAT" && (
                      <Link to={`/tasks/${t.id}`} title="Complete UAT (Pass/Fail required)"
                        className="p-2 rounded-lg border border-line-200 text-ink-500 hover:bg-paper-100 hover:text-aa-blue-600 hover:border-aa-blue-200 focus-ring press-scale transition-colors inline-flex">
                        <ArrowRightCircle size={15} />
                      </Link>
                    )}
                    {t.expectedEndDate && (
                      <IconBtn title="Revise expected end date" onClick={() => setEedTask(t)}><Clock size={15} /></IconBtn>
                    )}
                    <IconBtn title="History" onClick={() => setHistoryTask(t)}><History size={15} /></IconBtn>
                  </div>
                </td>
              </tr>
            ))}
            {tasks.length === 0 && <tr><td colSpan={7} className="px-5 py-12 text-center text-ink-300 text-sm">No tasks found</td></tr>}
          </tbody>
        </table>
      </div>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New Task">
        <form onSubmit={createTask} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">Project</label>
            <select required value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-line-200 text-sm focus-ring">
              <option value="">Select project</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">Task name (optional)</label>
            <input value={form.taskName} onChange={(e) => setForm({ ...form, taskName: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-line-200 text-sm focus-ring" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">Category</label>
              <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-line-200 text-sm focus-ring">
                <option value="">Uncategorized</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">Email subject</label>
              <input value={form.emailSubject} onChange={(e) => setForm({ ...form, emailSubject: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-line-200 text-sm focus-ring" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">Remarks</label>
            <textarea rows={2} value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-line-200 text-sm focus-ring" />
          </div>
          {error && <div className="text-sm text-rose-600 bg-rose-50 px-3 py-2 rounded-lg">{error}</div>}
          <button type="submit" className="w-full bg-aa-blue-600 hover:bg-aa-blue-700 text-white font-semibold py-2.5 rounded-xl focus-ring press-scale">
            Create Task
          </button>
        </form>
      </Modal>

      <AssignModal task={assignTask} developers={developers} onClose={() => setAssignTask(null)} onDone={load} />
      <EedModal task={eedTask} onClose={() => setEedTask(null)} onDone={load} />
      <HistoryModal task={historyTask} onClose={() => setHistoryTask(null)} />
    </div>
  );
}

function IconBtn({ children, ...props }) {
  return (
    <button {...props} className="p-2 rounded-lg border border-line-200 text-ink-500 hover:bg-paper-100 hover:text-aa-blue-600 hover:border-aa-blue-200 focus-ring press-scale transition-colors">
      {children}
    </button>
  );
}

function AssignModal({ task, developers, onClose, onDone }) {
  const [developerId, setDeveloperId] = useState("");
  const [developerAssignedAt, setDeveloperAssignedAt] = useState(new Date().toISOString().slice(0, 10));
  const [expectedEndDate, setExpectedEndDate] = useState("");
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.post(`/tasks/${task.id}/assign`, { developerId, developerAssignedAt, expectedEndDate });
      onClose(); onDone();
    } catch (err) {
      setError(err.response?.data?.error || "Could not assign developer");
    }
  };

  return (
    <Modal open={!!task} onClose={onClose} title="Assign Developer">
      <form onSubmit={submit} className="space-y-4">
        <p className="text-xs text-ink-500 bg-paper-100 rounded-lg px-3 py-2">
          Developer, assigned date, and expected end date are all required before a task can move to Assigned (BR-08).
        </p>
        <div>
          <label className="block text-sm font-medium text-ink-700 mb-1.5">Developer</label>
          <select required value={developerId} onChange={(e) => setDeveloperId(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-line-200 text-sm focus-ring">
            <option value="">Select developer</option>
            {developers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">Assigned date</label>
            <input type="date" required value={developerAssignedAt} onChange={(e) => setDeveloperAssignedAt(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-line-200 text-sm focus-ring" />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">Expected end date</label>
            <input type="date" required value={expectedEndDate} onChange={(e) => setExpectedEndDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-line-200 text-sm focus-ring" />
          </div>
        </div>
        {error && <div className="text-sm text-rose-600 bg-rose-50 px-3 py-2 rounded-lg">{error}</div>}
        <button type="submit" className="w-full bg-aa-blue-600 hover:bg-aa-blue-700 text-white font-semibold py-2.5 rounded-xl focus-ring press-scale">
          Assign & Move to Assigned
        </button>
      </form>
    </Modal>
  );
}

function EedModal({ task, onClose, onDone }) {
  const [newDate, setNewDate] = useState("");
  const [managerApproved, setManagerApproved] = useState("");
  const [reason, setReason] = useState("");
  const [warning, setWarning] = useState("");
  const [error, setError] = useState("");

  useEffect(() => { setNewDate(""); setManagerApproved(""); setReason(""); setWarning(""); setError(""); }, [task]);

  const submit = async (e) => {
    e.preventDefault();
    setError(""); setWarning("");
    try {
      const { data } = await api.post(`/tasks/${task.id}/revise-eed`, {
        newDate, managerApproved: managerApproved === "yes", reason,
      });
      if (data.warning) { setWarning(data.warning); }
      else { onClose(); }
      onDone();
    } catch (err) {
      setError(err.response?.data?.error || "Could not revise deadline");
    }
  };

  return (
    <Modal open={!!task} onClose={onClose} title="Revise Expected End Date">
      <form onSubmit={submit} className="space-y-4">
        {task && (
          <p className="text-xs text-ink-500 bg-paper-100 rounded-lg px-3 py-2">
            Current expected end date: <b>{task.expectedEndDate ? new Date(task.expectedEndDate).toLocaleDateString() : "—"}</b>. Every revision is preserved in history (BR-11).
          </p>
        )}
        <div>
          <label className="block text-sm font-medium text-ink-700 mb-1.5">New expected end date</label>
          <input type="date" required value={newDate} onChange={(e) => setNewDate(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-line-200 text-sm focus-ring" />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink-700 mb-1.5">Was Manager approval obtained?</label>
          <div className="flex gap-3">
            <label className="flex items-center gap-2 text-sm"><input type="radio" required name="approved" value="yes" checked={managerApproved === "yes"} onChange={(e) => setManagerApproved(e.target.value)} /> Yes</label>
            <label className="flex items-center gap-2 text-sm"><input type="radio" required name="approved" value="no" checked={managerApproved === "no"} onChange={(e) => setManagerApproved(e.target.value)} /> No</label>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-ink-700 mb-1.5">Reason for change</label>
          <textarea required rows={2} value={reason} onChange={(e) => setReason(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-line-200 text-sm focus-ring" />
        </div>
        {warning && <div className="text-sm text-aa-orange-700 bg-aa-orange-50 px-3 py-2 rounded-lg">{warning}</div>}
        {error && <div className="text-sm text-rose-600 bg-rose-50 px-3 py-2 rounded-lg">{error}</div>}
        <button type="submit" className="w-full bg-aa-blue-600 hover:bg-aa-blue-700 text-white font-semibold py-2.5 rounded-xl focus-ring press-scale">
          Save Revision
        </button>
      </form>
    </Modal>
  );
}

function HistoryModal({ task, onClose }) {
  const [detail, setDetail] = useState(null);
  useEffect(() => {
    if (task) api.get(`/tasks/${task.id}`).then((r) => setDetail(r.data));
    else setDetail(null);
  }, [task]);

  return (
    <Modal open={!!task} onClose={onClose} title="Task History" width="max-w-2xl">
      {!detail ? <div className="text-sm text-ink-300">Loading…</div> : (
        <div className="space-y-6">
          <div>
            <h4 className="text-sm font-semibold text-ink-900 mb-2">Status changes</h4>
            <div className="space-y-2">
              {detail.statusHistory.map((h) => (
                <div key={h.id} className="flex items-center gap-2 text-sm">
                  <span className="text-ink-300 text-xs w-36 shrink-0">{new Date(h.changedAt).toLocaleString()}</span>
                  <span className="text-ink-500">{h.fromStatus ? `${h.fromStatus} → ` : ""}</span>
                  <CaseStatusBadge status={h.toStatus} />
                  <span className="text-ink-300 text-xs">by {h.changedBy}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-ink-900 mb-2">Expected end date revisions</h4>
            {detail.eedRevisions.length === 0 ? (
              <div className="text-sm text-ink-300">No revisions recorded</div>
            ) : (
              <div className="space-y-2">
                {detail.eedRevisions.map((r) => (
                  <div key={r.id} className="text-sm border border-line-200 rounded-lg px-3 py-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-ink-900">
                        {r.oldDate ? new Date(r.oldDate).toLocaleDateString() : "—"} → {new Date(r.newDate).toLocaleDateString()}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${r.managerApproved ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                        {r.managerApproved ? "Manager approved" : "Not approved"}
                      </span>
                    </div>
                    <div className="text-ink-500 mt-1">{r.reason}</div>
                    <div className="text-xs text-ink-300 mt-1">{r.changedByName} · {new Date(r.changedAt).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
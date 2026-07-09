import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import api from "../api/client";
import Spinner from "../components/Spinner";
import { CaseStatusBadge, DeadlineBadge, BugPriorityBadge } from "../components/Badges";
import { ArrowLeft, Pencil, Trash2, UserPlus, ArrowRightCircle, Clock, RotateCcw } from "lucide-react";
import Modal from "../components/Modal";

const NEXT_STATUS = {
  PENDING: "ASSIGNED", ASSIGNED: "WIP", WIP: "COMPLETED", COMPLETED: "UAT", UAT: "LIVE", REOPENED: "WIP",
};
const PRIORITIES = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];

function fmt(d) {
  return d ? new Date(d).toLocaleDateString() : "—";
}

export default function TaskDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState(null);
  const [categories, setCategories] = useState([]);
  const [developers, setDevelopers] = useState([]);
  const [editOpen, setEditOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [eedOpen, setEedOpen] = useState(false);
  const [reopenOpen, setReopenOpen] = useState(false);
  const [uatOpen, setUatOpen] = useState(false);

  const load = () => api.get(`/tasks/${id}`).then((r) => setTask(r.data));

  useEffect(() => { load(); }, [id]);
  useEffect(() => {
    api.get("/masters/categories").then((r) => setCategories(r.data));
  }, []);
  useEffect(() => {
    if (task) api.get("/masters/developers", { params: { lobId: task.lobId } }).then((r) => setDevelopers(r.data));
  }, [task?.lobId]);

  const advance = async () => {
    const to = NEXT_STATUS[task.caseStatus];
    if (!to) return;
    try {
      await api.post(`/tasks/${id}/status`, { toStatus: to });
      load();
    } catch (err) {
      alert(err.response?.data?.error || "Could not update status");
    }
  };

  const remove = async () => {
    if (!confirm("Delete this task?")) return;
    await api.delete(`/tasks/${id}`);
    navigate("/tasks");
  };

  if (!task) return <Spinner label="Loading task…" />;

  return (
    <div className="space-y-6">
      <Link to="/tasks" className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900">
        <ArrowLeft size={15} /> Back to Task Tracker
      </Link>

      <div className="bg-white rounded-2xl shadow-card p-6 hover-lift animate-fade-in">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="font-display text-2xl font-bold text-ink-900">
                {task.taskName || <span className="text-ink-300 italic font-normal">Untitled task</span>}
              </h1>
              <CaseStatusBadge status={task.caseStatus} />
              {task.priority && <BugPriorityBadge priority={task.priority} />}
              <DeadlineBadge status={task.deadlineStatus} />
            </div>
            <div className="text-sm text-ink-300 font-mono">{task.taskCode}</div>
          </div>
          <div className="flex items-center gap-2">
            {task.caseStatus === "PENDING" && (
              <ActionBtn onClick={() => setAssignOpen(true)} icon={UserPlus} label="Assign" />
            )}
            {NEXT_STATUS[task.caseStatus] && task.caseStatus !== "PENDING" && task.caseStatus !== "UAT" && (
              <ActionBtn onClick={advance} icon={ArrowRightCircle} label={`Move to ${NEXT_STATUS[task.caseStatus]}`} />
            )}
            {task.caseStatus === "UAT" && (
              <ActionBtn onClick={() => setUatOpen(true)} icon={ArrowRightCircle} label="Complete UAT" />
            )}
            {task.expectedEndDate && (
              <ActionBtn onClick={() => setEedOpen(true)} icon={Clock} label="Revise EED" />
            )}
            {["COMPLETED", "LIVE"].includes(task.caseStatus) && (
              <ActionBtn onClick={() => setReopenOpen(true)} icon={RotateCcw} label="Reopen" />
            )}
            <ActionBtn onClick={() => setEditOpen(true)} icon={Pencil} label="Edit" primary />
            <button onClick={remove} className="p-2.5 rounded-xl border border-line-200 text-rose-600 hover:bg-rose-50 focus-ring press-scale transition-colors">
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-5 mt-6 pt-6 border-t border-line-200">
          <Field label="Project" value={task.project?.name} />
          <Field label="Line of Business" value={task.lob?.name} />
          <Field label="Category" value={task.category?.name} />
          <Field label="Email Subject" value={task.emailSubject} />
          <Field label="Requirement Rec. From" value={task.requirementReceivedFrom} />
          <Field label="Developer / Assigned Team" value={task.developer?.name || task.assignedTeam} />
        </div>

        {task.description && (
          <div className="mt-5 pt-5 border-t border-line-200">
            <div className="text-xs text-ink-300 uppercase tracking-wide mb-1">Description</div>
            <p className="text-sm text-ink-700 whitespace-pre-wrap">{task.description}</p>
          </div>
        )}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Field card label="Business Req. Rec. Date" value={fmt(task.businessReqReceivedDate)} />
        <Field card label="Developer Req. Received Date" value={fmt(task.developerReqReceivedDate)} />
        <Field card label="Start Date (Developer)" value={fmt(task.developerAssignedAt)} />
        <Field card label="Expected End Date" value={fmt(task.expectedEndDate)} />
        <Field card label="Delivery Date" value={fmt(task.deliveryDate)} />
        <Field card label="Revised Date" value={fmt(task.revisedDate)} />
        <Field card label="Actual Completion" value={fmt(task.actualCompletionAt)} />
        <Field card label="UAT Result" value={task.uatResult || "—"} />
      </div>

      {(task.reasonForDelay || task.remarks) && (
        <div className="grid sm:grid-cols-2 gap-4">
          {task.reasonForDelay && (
            <div className="bg-white rounded-2xl shadow-card p-5 hover-lift">
              <div className="text-xs text-ink-300 uppercase tracking-wide mb-1.5">Reason For Delay</div>
              <p className="text-sm text-ink-700 whitespace-pre-wrap">{task.reasonForDelay}</p>
            </div>
          )}
          {task.remarks && (
            <div className="bg-white rounded-2xl shadow-card p-5 hover-lift">
              <div className="text-xs text-ink-300 uppercase tracking-wide mb-1.5">Remarks</div>
              <p className="text-sm text-ink-700 whitespace-pre-wrap">{task.remarks}</p>
            </div>
          )}
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl shadow-card p-5 hover-lift">
          <h3 className="text-sm font-semibold text-ink-900 mb-3">Status history</h3>
          <div className="space-y-2">
            {task.statusHistory?.map((h) => (
              <div key={h.id} className="flex items-center gap-2 text-sm">
                <span className="text-ink-300 text-xs w-32 shrink-0">{new Date(h.changedAt).toLocaleString()}</span>
                <span className="text-ink-500">{h.fromStatus ? `${h.fromStatus} → ` : ""}</span>
                <CaseStatusBadge status={h.toStatus} />
                <span className="text-ink-300 text-xs">by {h.changedBy}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-card p-5 hover-lift">
          <h3 className="text-sm font-semibold text-ink-900 mb-3">Expected end date revisions</h3>
          {!task.eedRevisions?.length ? (
            <div className="text-sm text-ink-300">No revisions recorded</div>
          ) : (
            <div className="space-y-2">
              {task.eedRevisions.map((r) => (
                <div key={r.id} className="text-sm border border-line-200 rounded-lg px-3 py-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-ink-900">{fmt(r.oldDate)} → {fmt(r.newDate)}</span>
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

      <EditModal task={task} categories={categories} open={editOpen} onClose={() => setEditOpen(false)} onDone={load} />
      <AssignModal task={task} developers={developers} open={assignOpen} onClose={() => setAssignOpen(false)} onDone={load} />
      <EedModal task={task} open={eedOpen} onClose={() => setEedOpen(false)} onDone={load} />
      <ReopenModal
        task={task}
        open={reopenOpen}
        onClose={() => setReopenOpen(false)}
        onDone={load}
        onReopened={() => setEedOpen(true)}
      />
      <UatModal
        task={task}
        open={uatOpen}
        onClose={() => setUatOpen(false)}
        onDone={load}
        onFailed={() => setEedOpen(true)}
      />
    </div>
  );
}

function ActionBtn({ icon: Icon, label, onClick, primary }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium focus-ring press-scale transition-colors ${
      primary ? "bg-aa-blue-600 hover:bg-aa-blue-700 text-white" : "border border-line-200 text-ink-700 hover:bg-paper-100"
    }`}>
      <Icon size={15} /> {label}
    </button>
  );
}

function Field({ label, value, card }) {
  const content = (
    <>
      <div className="text-xs text-ink-300 uppercase tracking-wide mb-1">{label}</div>
      <div className="text-sm font-medium text-ink-900">{value || "—"}</div>
    </>
  );
  if (card) return <div className="bg-white rounded-2xl shadow-card p-4 hover-lift">{content}</div>;
  return <div>{content}</div>;
}

function toInputDate(d) {
  if (!d) return "";
  return new Date(d).toISOString().slice(0, 10);
}

function EditModal({ task, categories, open, onClose, onDone }) {
  const [form, setForm] = useState(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!task) return;
    setForm({
      taskName: task.taskName || "",
      categoryId: task.categoryId || "",
      priority: task.priority || "MEDIUM",
      emailSubject: task.emailSubject || "",
      description: task.description || "",
      requirementReceivedFrom: task.requirementReceivedFrom || "",
      businessReqReceivedDate: toInputDate(task.businessReqReceivedDate),
      developerReqReceivedDate: toInputDate(task.developerReqReceivedDate),
      deliveryDate: toInputDate(task.deliveryDate),
      revisedDate: toInputDate(task.revisedDate),
      reasonForDelay: task.reasonForDelay || "",
      assignedTeam: task.assignedTeam || "",
      remarks: task.remarks || "",
    });
    setError("");
  }, [task, open]);

  if (!form) return null;
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError("");
    try {
      await api.patch(`/tasks/${task.id}`, form);
      onClose();
      onDone();
    } catch (err) {
      console.error("Task update failed:", err.response?.data || err.message, err);
      const d = err.response?.data;
      setError(d?.error ? `${d.error}${d.code ? ` (${d.code})` : ""}` : "Could not save changes — check console for details");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Edit Task" width="max-w-2xl">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-ink-700 mb-1.5">Task name</label>
          <input value={form.taskName} onChange={set("taskName")} className="w-full px-3.5 py-2.5 rounded-xl border border-line-200 text-sm focus-ring" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">Category</label>
            <select value={form.categoryId} onChange={set("categoryId")} className="w-full px-3.5 py-2.5 rounded-xl border border-line-200 text-sm focus-ring">
              <option value="">Uncategorized</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">Priority</label>
            <select value={form.priority} onChange={set("priority")} className="w-full px-3.5 py-2.5 rounded-xl border border-line-200 text-sm focus-ring">
              {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">Email subject</label>
            <input value={form.emailSubject} onChange={set("emailSubject")} className="w-full px-3.5 py-2.5 rounded-xl border border-line-200 text-sm focus-ring" />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">Requirement Rec. From</label>
            <input value={form.requirementReceivedFrom} onChange={set("requirementReceivedFrom")} className="w-full px-3.5 py-2.5 rounded-xl border border-line-200 text-sm focus-ring" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-ink-700 mb-1.5">Description</label>
          <textarea rows={2} value={form.description} onChange={set("description")} className="w-full px-3.5 py-2.5 rounded-xl border border-line-200 text-sm focus-ring" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">Business Req. Rec. Date</label>
            <input type="date" value={form.businessReqReceivedDate} onChange={set("businessReqReceivedDate")} className="w-full px-3.5 py-2.5 rounded-xl border border-line-200 text-sm focus-ring" />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">Developer Req. Received Date</label>
            <input type="date" value={form.developerReqReceivedDate} onChange={set("developerReqReceivedDate")} className="w-full px-3.5 py-2.5 rounded-xl border border-line-200 text-sm focus-ring" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">Delivery Date</label>
            <input type="date" value={form.deliveryDate} onChange={set("deliveryDate")} className="w-full px-3.5 py-2.5 rounded-xl border border-line-200 text-sm focus-ring" />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">Revised Date</label>
            <input type="date" value={form.revisedDate} onChange={set("revisedDate")} className="w-full px-3.5 py-2.5 rounded-xl border border-line-200 text-sm focus-ring" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-ink-700 mb-1.5">Assigned Team / Developer (free text)</label>
          <input value={form.assignedTeam} onChange={set("assignedTeam")} className="w-full px-3.5 py-2.5 rounded-xl border border-line-200 text-sm focus-ring" />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink-700 mb-1.5">Reason For Delay</label>
          <textarea rows={2} value={form.reasonForDelay} onChange={set("reasonForDelay")} className="w-full px-3.5 py-2.5 rounded-xl border border-line-200 text-sm focus-ring" />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink-700 mb-1.5">Remarks</label>
          <textarea rows={2} value={form.remarks} onChange={set("remarks")} className="w-full px-3.5 py-2.5 rounded-xl border border-line-200 text-sm focus-ring" />
        </div>
        {error && <div className="text-sm text-rose-600 bg-rose-50 px-3 py-2 rounded-lg">{error}</div>}
        <button type="submit" disabled={submitting} className="w-full bg-aa-blue-600 hover:bg-aa-blue-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl focus-ring press-scale">
          {submitting ? "Saving…" : "Save Changes"}
        </button>
      </form>
    </Modal>
  );
}

function AssignModal({ task, developers, open, onClose, onDone }) {
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
    <Modal open={open} onClose={onClose} title="Assign Developer">
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

function UatModal({ task, open, onClose, onDone, onFailed }) {
  const [result, setResult] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { setResult(""); setReason(""); setError(""); }, [open]);

  const submit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    if (!result) { setError("Select whether UAT passed or failed."); return; }
    if (result === "FAIL" && !reason.trim()) { setError("A reason is required when UAT fails."); return; }
    setSubmitting(true);
    setError("");
    try {
      await api.post(`/tasks/${task.id}/status`, {
        toStatus: result === "PASS" ? "LIVE" : "REOPENED",
        uatResult: result,
        note: result === "FAIL" ? reason.trim() : undefined,
      });
      onClose();
      onDone();
      if (result === "FAIL") onFailed?.();
    } catch (err) {
      setError(err.response?.data?.error || "Could not record UAT result");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Complete UAT">
      <form onSubmit={submit} className="space-y-4">
        <p className="text-xs text-ink-500 bg-paper-100 rounded-lg px-3 py-2">
          A UAT result is required before this task can leave UAT. Pass moves it to Live; Fail reopens it.
        </p>
        <div>
          <label className="block text-sm font-medium text-ink-700 mb-1.5">UAT result</label>
          <div className="flex gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" name="uatResult" value="PASS" checked={result === "PASS"} onChange={(e) => setResult(e.target.value)} /> Pass
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" name="uatResult" value="FAIL" checked={result === "FAIL"} onChange={(e) => setResult(e.target.value)} /> Fail — something is remaining
            </label>
          </div>
        </div>
        {result === "FAIL" && (
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">Reason (required)</label>
            <textarea required rows={3} value={reason} onChange={(e) => setReason(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-line-200 text-sm focus-ring" />
          </div>
        )}
        {error && <div className="text-sm text-rose-600 bg-rose-50 px-3 py-2 rounded-lg">{error}</div>}
        <button type="submit" disabled={submitting} className="w-full bg-aa-blue-600 hover:bg-aa-blue-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl focus-ring press-scale">
          {submitting ? "Saving…" : "Submit UAT Result"}
        </button>
      </form>
    </Modal>
  );
}

function ReopenModal({ task, open, onClose, onDone, onReopened }) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { setReason(""); setError(""); }, [open]);

  const submit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    if (!reason.trim()) { setError("A reason is required to reopen this task."); return; }
    setSubmitting(true);
    setError("");
    try {
      await api.post(`/tasks/${task.id}/status`, { toStatus: "REOPENED", note: reason.trim() });
      onClose();
      onDone();
      onReopened?.();
    } catch (err) {
      setError(err.response?.data?.error || "Could not reopen task");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Reopen Task">
      <form onSubmit={submit} className="space-y-4">
        <p className="text-xs text-ink-500 bg-paper-100 rounded-lg px-3 py-2">
          Reopening moves this task from {task?.caseStatus} back to WIP. The reason is stored as the task's
          Reason For Delay — follow up by revising the Expected End Date.
        </p>
        <div>
          <label className="block text-sm font-medium text-ink-700 mb-1.5">Reason for reopening (required)</label>
          <textarea required rows={3} value={reason} onChange={(e) => setReason(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-line-200 text-sm focus-ring" />
        </div>
        {error && <div className="text-sm text-rose-600 bg-rose-50 px-3 py-2 rounded-lg">{error}</div>}
        <button type="submit" disabled={submitting} className="w-full bg-aa-blue-600 hover:bg-aa-blue-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl focus-ring press-scale">
          {submitting ? "Reopening…" : "Reopen Task"}
        </button>
      </form>
    </Modal>
  );
}

function EedModal({ task, open, onClose, onDone }) {
  const [newDate, setNewDate] = useState("");
  const [managerApproved, setManagerApproved] = useState("");
  const [reason, setReason] = useState("");
  const [warning, setWarning] = useState("");
  const [error, setError] = useState("");

  useEffect(() => { setNewDate(""); setManagerApproved(""); setReason(""); setWarning(""); setError(""); }, [open]);

  const submit = async (e) => {
    e.preventDefault();
    setError(""); setWarning("");
    try {
      const { data } = await api.post(`/tasks/${task.id}/revise-eed`, {
        newDate, managerApproved: managerApproved === "yes", reason,
      });
      if (data.warning) setWarning(data.warning);
      else onClose();
      onDone();
    } catch (err) {
      setError(err.response?.data?.error || "Could not revise deadline");
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Revise Expected End Date">
      <form onSubmit={submit} className="space-y-4">
        <p className="text-xs text-ink-500 bg-paper-100 rounded-lg px-3 py-2">
          Current expected end date: <b>{fmt(task?.expectedEndDate)}</b>. Every revision is preserved in history (BR-11).
        </p>
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
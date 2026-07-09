import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../api/client";
import Modal from "../components/Modal";
import { ProjectStatusBadge, CaseStatusBadge } from "../components/Badges";
import { ArrowLeft, Trash2, Pencil } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import Spinner from "../components/Spinner";

const STATUS_OPTIONS = ["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"];

function toInputDate(d) {
  if (!d) return "";
  return new Date(d).toISOString().slice(0, 10);
}

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [editOpen, setEditOpen] = useState(false);

  const load = () => {
    api.get(`/projects/${id}/dashboard`).then((r) => setDashboard(r.data));
    api.get("/tasks", { params: { projectId: id } }).then((r) => setTasks(r.data));
  };
  useEffect(() => { load(); }, [id]);

  const changeStatus = async (status) => {
    await api.patch(`/projects/${id}`, { status });
    load();
  };

  const remove = async () => {
    if (!confirm("Delete this project? This cannot be undone if you are Admin.")) return;
    await api.delete(`/projects/${id}`);
    navigate("/projects");
  };

  if (!dashboard) return <Spinner label="Loading project…" />;
  const { project, taskCount, statusCounts, completionPct, bugCount, bugCounts } = dashboard;

  return (
    <div className="space-y-6">
      <Link to="/projects" className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900">
        <ArrowLeft size={15} /> Back to Project Master
      </Link>

      <div className="bg-white rounded-2xl shadow-card p-6 hover-lift animate-fade-in">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="font-display text-2xl font-bold text-ink-900">{project.name}</h1>
              <ProjectStatusBadge status={project.status} />
            </div>
            <div className="text-sm text-ink-300 font-mono">{project.projectCode}</div>
          </div>
          <div className="flex items-center gap-3">
            <select value={project.status} onChange={(e) => changeStatus(e.target.value)}
              className="px-3 py-2 rounded-xl border border-line-200 text-sm focus-ring">
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
            </select>
            <button onClick={() => setEditOpen(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-aa-blue-600 hover:bg-aa-blue-700 text-white text-sm font-medium focus-ring press-scale transition-colors">
              <Pencil size={15} /> Edit
            </button>
            <button onClick={remove} className="p-2.5 rounded-xl border border-line-200 text-rose-600 hover:bg-rose-50 focus-ring press-scale transition-colors">
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
          <Info label="Line of Business" value={project.lob?.name} />
          <Info label="Business Owner" value={project.businessOwner || "—"} />
          <Info label="Business Analyst" value={project.ba?.name || "—"} />
          <Info label="Expected End" value={project.expectedEndDate ? new Date(project.expectedEndDate).toLocaleDateString() : "—"} />
        </div>

        {project.description && <p className="text-sm text-ink-500 mt-4 border-t border-line-200 pt-4">{project.description}</p>}
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl shadow-card p-5 hover-lift">
          <div className="text-sm text-ink-500 mb-1">Task completion</div>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-display font-bold text-ink-900">{completionPct}%</span>
            <span className="text-sm text-ink-300 mb-1">of {taskCount} tasks live</span>
          </div>
          <div className="w-full h-2 bg-paper-100 rounded-full mt-3 overflow-hidden">
            <div className="h-full brand-gradient" style={{ width: `${completionPct}%` }} />
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-card p-5 hover-lift">
          <div className="text-sm text-ink-500 mb-2">Tasks by status</div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(statusCounts).map(([k, v]) => (
              <span key={k} className="text-xs bg-paper-100 text-ink-700 px-2.5 py-1 rounded-full">{k.replace("_", " ")}: {v}</span>
            ))}
            {taskCount === 0 && <span className="text-sm text-ink-300">No tasks yet</span>}
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-card p-5 hover-lift">
          <div className="text-sm text-ink-500 mb-2">Bugs ({bugCount})</div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(bugCounts).map(([k, v]) => (
              <span key={k} className="text-xs bg-paper-100 text-ink-700 px-2.5 py-1 rounded-full">{k}: {v}</span>
            ))}
            {bugCount === 0 && <span className="text-sm text-ink-300">No bugs logged</span>}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-card overflow-hidden animate-fade-in">
        <div className="px-5 py-4 border-b border-line-200 flex items-center justify-between">
          <h3 className="font-display font-semibold text-ink-900">Tasks</h3>
          <Link to={`/tasks?projectId=${id}`} className="text-sm text-aa-blue-600 hover:underline">Open in Task Tracker</Link>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-paper-50 text-ink-500 text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-5 py-3 font-semibold">Task</th>
              <th className="text-left px-5 py-3 font-semibold">Category</th>
              <th className="text-left px-5 py-3 font-semibold">Status</th>
              <th className="text-left px-5 py-3 font-semibold">Developer</th>
              <th className="text-left px-5 py-3 font-semibold">Expected End</th>
            </tr>
          </thead>
          <tbody>
            {tasks.slice(0, 8).map((t) => (
              <tr key={t.id} className="border-t border-line-200">
                <td className="px-5 py-3">
                  <div className="font-medium text-ink-900">{t.taskName || <span className="text-ink-300 italic">Untitled</span>}</div>
                  <div className="text-xs text-ink-300 font-mono">{t.taskCode}</div>
                </td>
                <td className="px-5 py-3 text-ink-500">{t.category?.name || "—"}</td>
                <td className="px-5 py-3"><CaseStatusBadge status={t.caseStatus} /></td>
                <td className="px-5 py-3 text-ink-500">{t.developer?.name || t.assignedTeam || "Unassigned"}</td>
                <td className="px-5 py-3 text-ink-500">{t.expectedEndDate ? new Date(t.expectedEndDate).toLocaleDateString() : "—"}</td>
              </tr>
            ))}
            {tasks.length === 0 && <tr><td colSpan={5} className="px-5 py-10 text-center text-ink-300 text-sm">No tasks under this project yet</td></tr>}
          </tbody>
        </table>
      </div>

      <EditProjectModal project={project} open={editOpen} onClose={() => setEditOpen(false)} onDone={load} />
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <div className="text-xs text-ink-300 uppercase tracking-wide mb-1">{label}</div>
      <div className="text-sm font-medium text-ink-900">{value}</div>
    </div>
  );
}

function EditProjectModal({ project, open, onClose, onDone }) {
  const { isAdmin } = useAuth();
  const [form, setForm] = useState(null);
  const [bas, setBas] = useState([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!project) return;
    setForm({
      name: project.name || "",
      description: project.description || "",
      businessOwner: project.businessOwner || "",
      baId: project.baId || "",
      startDate: toInputDate(project.startDate),
      expectedEndDate: toInputDate(project.expectedEndDate),
      remarks: project.remarks || "",
    });
    setError("");
  }, [project, open]);

  useEffect(() => {
    if (!project?.lobId) return;
    api.get("/masters/bas", { params: { lobId: project.lobId } }).then((r) => setBas(r.data));
  }, [project?.lobId]);

  if (!form) return null;
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError("");
    try {
      await api.patch(`/projects/${project.id}`, form);
      onClose();
      onDone();
    } catch (err) {
      setError(err.response?.data?.error || "Could not save changes");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Edit Project" width="max-w-xl">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-ink-700 mb-1.5">Project name</label>
          <input required value={form.name} onChange={set("name")} className="w-full px-3.5 py-2.5 rounded-xl border border-line-200 text-sm focus-ring" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">Business owner</label>
            <input value={form.businessOwner} onChange={set("businessOwner")} className="w-full px-3.5 py-2.5 rounded-xl border border-line-200 text-sm focus-ring" />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">Business Analyst</label>
            <select disabled={!isAdmin} value={form.baId} onChange={set("baId")}
              className="w-full px-3.5 py-2.5 rounded-xl border border-line-200 text-sm focus-ring disabled:bg-paper-100">
              <option value="">Unassigned</option>
              {bas.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            {bas.length === 0 && (
              <p className="text-xs text-ink-300 mt-1">No Business Analysts registered under this project's LOB yet.</p>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">Start date</label>
            <input type="date" value={form.startDate} onChange={set("startDate")} className="w-full px-3.5 py-2.5 rounded-xl border border-line-200 text-sm focus-ring" />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">Expected end date</label>
            <input type="date" value={form.expectedEndDate} onChange={set("expectedEndDate")} className="w-full px-3.5 py-2.5 rounded-xl border border-line-200 text-sm focus-ring" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-ink-700 mb-1.5">Description</label>
          <textarea rows={3} value={form.description} onChange={set("description")} className="w-full px-3.5 py-2.5 rounded-xl border border-line-200 text-sm focus-ring" />
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
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client";
import Modal from "../components/Modal";
import { SkeletonTable } from "../components/Skeleton";
import { ProjectStatusBadge } from "../components/Badges";
import { Plus, Search, ArrowRight } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const STATUS_OPTIONS = ["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"];

export default function Projects() {
  const { user, isAdmin } = useAuth();
  const [projects, setProjects] = useState(null);
  const [lobs, setLobs] = useState([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", lobId: "", businessOwner: "", startDate: "", expectedEndDate: "", description: "" });
  const [error, setError] = useState("");

  const load = () => {
    api.get("/projects", { params: { search: search || undefined, status: status || undefined } }).then((r) => setProjects(r.data));
  };

  useEffect(() => { load(); }, [search, status]);
  useEffect(() => {
    api.get("/masters/lobs").then((r) => {
      setLobs(r.data);
      if (!isAdmin && user?.lobId) setForm((f) => ({ ...f, lobId: user.lobId }));
    });
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.post("/projects", form);
      setOpen(false);
      setForm({ name: "", lobId: isAdmin ? "" : user.lobId, businessOwner: "", startDate: "", expectedEndDate: "", description: "" });
      load();
    } catch (err) {
      setError(err.response?.data?.error || "Could not create project");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-900">Project Master</h1>
          <p className="text-ink-500 text-sm mt-1">Every project belongs to one Line of Business.</p>
        </div>
        <button onClick={() => setOpen(true)} className="flex items-center justify-center gap-2 bg-aa-blue-600 hover:bg-aa-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl focus-ring press-scale shrink-0">
          <Plus size={16} /> New Project
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 animate-fade-in">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search projects…"
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-line-200 text-sm focus-ring focus:border-aa-blue-500 transition-colors" />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="px-3 py-2.5 rounded-xl border border-line-200 text-sm focus-ring">
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
        </select>
      </div>

      {projects === null ? (
        <SkeletonTable rows={6} cols={7} />
      ) : (
        <div className="bg-white rounded-2xl shadow-card overflow-x-auto">
          <table className="w-full text-sm min-w-[840px]">
            <thead className="bg-paper-50 text-ink-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-5 py-3 font-semibold">Project</th>
                <th className="text-left px-5 py-3 font-semibold">LOB</th>
                <th className="text-left px-5 py-3 font-semibold">Status</th>
                <th className="text-left px-5 py-3 font-semibold">BA</th>
                <th className="text-left px-5 py-3 font-semibold">Tasks</th>
                <th className="text-left px-5 py-3 font-semibold">Bugs</th>
                <th className="text-left px-5 py-3 font-semibold">Expected End</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p, i) => (
                <tr key={p.id} style={{ animationDelay: `${i * 25}ms` }} className="row-enter border-t border-line-200 hover:bg-paper-50/60 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="font-medium text-ink-900">{p.name}</div>
                    <div className="text-xs text-ink-300 font-mono">{p.projectCode}</div>
                  </td>
                  <td className="px-5 py-3.5 text-ink-500">{p.lob?.name}</td>
                  <td className="px-5 py-3.5"><ProjectStatusBadge status={p.status} /></td>
                  <td className="px-5 py-3.5 text-ink-500">{p.ba?.name || "—"}</td>
                  <td className="px-5 py-3.5 text-ink-500">{p._count?.tasks ?? 0}</td>
                  <td className="px-5 py-3.5 text-ink-500">{p._count?.bugs ?? 0}</td>
                  <td className="px-5 py-3.5 text-ink-500">{p.expectedEndDate ? new Date(p.expectedEndDate).toLocaleDateString() : "—"}</td>
                  <td className="px-5 py-3.5 text-right">
                    <Link to={`/projects/${p.id}`} className="text-aa-blue-600 hover:text-aa-blue-700 inline-flex items-center gap-1 text-sm font-medium group">
                      View <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </td>
                </tr>
              ))}
              {projects.length === 0 && (
                <tr><td colSpan={8} className="px-5 py-12 text-center text-ink-300 text-sm">No projects found. Create your first project to get started.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="New Project">
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">Project name</label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-line-200 text-sm focus-ring transition-colors" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">Line of Business</label>
              <select required disabled={!isAdmin} value={form.lobId} onChange={(e) => setForm({ ...form, lobId: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-line-200 text-sm focus-ring disabled:bg-paper-100">
                <option value="">Select LOB</option>
                {lobs.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">Business owner</label>
              <input value={form.businessOwner} onChange={(e) => setForm({ ...form, businessOwner: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-line-200 text-sm focus-ring" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">Start date</label>
              <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-line-200 text-sm focus-ring" />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">Expected end date</label>
              <input type="date" value={form.expectedEndDate} onChange={(e) => setForm({ ...form, expectedEndDate: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-line-200 text-sm focus-ring" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">Description</label>
            <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-line-200 text-sm focus-ring" />
          </div>
          {error && <div className="text-sm text-rose-600 bg-rose-50 px-3 py-2 rounded-lg animate-fade-in">{error}</div>}
          <button type="submit" className="w-full bg-aa-blue-600 hover:bg-aa-blue-700 text-white font-semibold py-2.5 rounded-xl focus-ring press-scale">
            Create Project
          </button>
        </form>
      </Modal>
    </div>
  );
}
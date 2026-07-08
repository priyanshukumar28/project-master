import { useEffect, useState } from "react";
import api from "../api/client";
import Modal from "../components/Modal";
import { SkeletonTable } from "../components/Skeleton";
import { BugPriorityBadge } from "../components/Badges";
import { Plus, Search } from "lucide-react";

const BUG_STATUSES = ["OPEN", "ASSIGNED", "WIP", "RESOLVED", "CLOSED", "REOPENED"];
const PRIORITIES = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];

export default function Bugs() {
  const [bugs, setBugs] = useState(null);
  const [projects, setProjects] = useState([]);
  const [developers, setDevelopers] = useState([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", projectId: "", priority: "MEDIUM" });
  const [error, setError] = useState("");

  const load = () => {
    api.get("/bugs", { params: { search: search || undefined, status: status || undefined, priority: priority || undefined } })
      .then((r) => setBugs(r.data));
  };
  useEffect(() => { load(); }, [search, status, priority]);
  useEffect(() => {
    api.get("/projects").then((r) => setProjects(r.data));
    api.get("/masters/developers").then((r) => setDevelopers(r.data));
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.post("/bugs", form);
      setOpen(false);
      setForm({ title: "", description: "", projectId: "", priority: "MEDIUM" });
      load();
    } catch (err) {
      setError(err.response?.data?.error || "Could not log bug");
    }
  };

  const updateField = async (bug, field, value) => {
    await api.patch(`/bugs/${bug.id}`, { [field]: value });
    load();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-900">Bug Management</h1>
          <p className="text-ink-500 text-sm mt-1">Independent lifecycle, separate from feature/change tasks.</p>
        </div>
        <button onClick={() => setOpen(true)} className="flex items-center gap-2 bg-aa-blue-600 hover:bg-aa-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl focus-ring press-scale">
          <Plus size={16} /> Log Bug
        </button>
      </div>

      <div className="flex flex-wrap gap-3 animate-fade-in">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search bugs…"
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-line-200 text-sm focus-ring" />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="px-3 py-2.5 rounded-xl border border-line-200 text-sm focus-ring">
          <option value="">All statuses</option>
          {BUG_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={priority} onChange={(e) => setPriority(e.target.value)} className="px-3 py-2.5 rounded-xl border border-line-200 text-sm focus-ring">
          <option value="">All priorities</option>
          {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {bugs === null ? (
        <SkeletonTable rows={6} cols={5} />
      ) : (
      <div className="bg-white rounded-2xl shadow-card overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead className="bg-paper-50 text-ink-500 text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-5 py-3 font-semibold">Bug</th>
              <th className="text-left px-5 py-3 font-semibold">Project</th>
              <th className="text-left px-5 py-3 font-semibold">Priority</th>
              <th className="text-left px-5 py-3 font-semibold">Status</th>
              <th className="text-left px-5 py-3 font-semibold">Developer</th>
            </tr>
          </thead>
          <tbody>
            {bugs.map((b, i) => (
              <tr key={b.id} style={{ animationDelay: `${i * 25}ms` }} className="row-enter border-t border-line-200 hover:bg-paper-50/60 transition-colors">
                <td className="px-5 py-3.5">
                  <div className="font-medium text-ink-900">{b.title}</div>
                  <div className="text-xs text-ink-300 font-mono">{b.bugCode}</div>
                </td>
                <td className="px-5 py-3.5 text-ink-500">{b.project?.name || "—"}</td>
                <td className="px-5 py-3.5">
                  <select value={b.priority} onChange={(e) => updateField(b, "priority", e.target.value)}
                    className="text-xs border-0 bg-transparent focus-ring rounded-lg cursor-pointer">
                    {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </td>
                <td className="px-5 py-3.5">
                  <select value={b.status} onChange={(e) => updateField(b, "status", e.target.value)}
                    className="text-xs border border-line-200 rounded-lg px-2 py-1 focus-ring cursor-pointer transition-colors">
                    {BUG_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td className="px-5 py-3.5">
                  <select value={b.developerId || ""} onChange={(e) => updateField(b, "developerId", e.target.value || null)}
                    className="text-xs border border-line-200 rounded-lg px-2 py-1 focus-ring cursor-pointer transition-colors">
                    <option value="">Unassigned</option>
                    {developers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </td>
              </tr>
            ))}
            {bugs.length === 0 && <tr><td colSpan={5} className="px-5 py-12 text-center text-ink-300 text-sm">No bugs logged</td></tr>}
          </tbody>
        </table>
      </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Log Bug">
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">Title</label>
            <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-line-200 text-sm focus-ring" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">Project</label>
              <select value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-line-200 text-sm focus-ring">
                <option value="">None</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">Priority</label>
              <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-line-200 text-sm focus-ring">
                {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">Description</label>
            <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-line-200 text-sm focus-ring" />
          </div>
          {error && <div className="text-sm text-rose-600 bg-rose-50 px-3 py-2 rounded-lg">{error}</div>}
          <button type="submit" className="w-full bg-aa-blue-600 hover:bg-aa-blue-700 text-white font-semibold py-2.5 rounded-xl focus-ring press-scale">
            Log Bug
          </button>
        </form>
      </Modal>
    </div>
  );
}
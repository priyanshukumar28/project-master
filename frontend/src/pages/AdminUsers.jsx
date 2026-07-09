import { useEffect, useState } from "react";
import api from "../api/client";
import Modal from "../components/Modal";
import { SkeletonTable } from "../components/Skeleton";
import { Plus, ShieldCheck, Pencil } from "lucide-react";

export default function AdminUsers() {
  const [users, setUsers] = useState(null);
  const [lobs, setLobs] = useState([]);
  const [developers, setDevelopers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [tab, setTab] = useState("users");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "BA", lobId: "" });
  const [error, setError] = useState("");

  const load = () => {
    api.get("/auth/users").then((r) => setUsers(r.data));
    api.get("/masters/lobs").then((r) => setLobs(r.data));
    api.get("/masters/developers").then((r) => setDevelopers(r.data));
    api.get("/masters/categories").then((r) => setCategories(r.data));
  };
  useEffect(load, []);

  const createUser = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.post("/auth/users", form);
      setOpen(false);
      setForm({ name: "", email: "", password: "", role: "BA", lobId: "" });
      load();
    } catch (err) {
      setError(err.response?.data?.error || "Could not create user");
    }
  };

  const toggleActive = async (u) => {
    await api.patch(`/auth/users/${u.id}`, { active: !u.active });
    load();
  };

  const [newLobName, setNewLobName] = useState("");
  const [newLobCode, setNewLobCode] = useState("");
  const [newCat, setNewCat] = useState("");
  const [editLob, setEditLob] = useState(null);
  const [devModalOpen, setDevModalOpen] = useState(false);
  const [editDev, setEditDev] = useState(null);

  const addLob = async (e) => {
    e.preventDefault();
    if (!newLobName) return;
    await api.post("/masters/lobs", { name: newLobName, code: newLobCode || undefined });
    setNewLobName(""); setNewLobCode(""); load();
  };
  const addCat = async (e) => { e.preventDefault(); if (!newCat) return; await api.post("/masters/categories", { name: newCat }); setNewCat(""); load(); };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-900 flex items-center gap-2">
            <ShieldCheck size={22} className="text-aa-blue-600" /> Admin
          </h1>
          <p className="text-ink-500 text-sm mt-1">Manage users, Lines of Business, developers, and categories.</p>
        </div>
        {tab === "users" && (
          <button onClick={() => setOpen(true)} className="flex items-center gap-2 bg-aa-blue-600 hover:bg-aa-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl focus-ring press-scale">
            <Plus size={16} /> New User
          </button>
        )}
      </div>

      <div className="flex gap-2">
        {["users", "masters"].map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3.5 py-2 rounded-xl text-sm font-medium capitalize transition-colors press-scale ${tab === t ? "bg-aa-blue-600 text-white" : "bg-white border border-line-200 text-ink-700 hover:bg-paper-100"}`}>
            {t === "masters" ? "Master Data" : t}
          </button>
        ))}
      </div>

      {tab === "users" && (
        users === null ? <SkeletonTable rows={5} cols={5} /> :
        <div className="bg-white rounded-2xl shadow-card overflow-x-auto animate-fade-in">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-paper-50 text-ink-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-5 py-3 font-semibold">Name</th>
                <th className="text-left px-5 py-3 font-semibold">Email</th>
                <th className="text-left px-5 py-3 font-semibold">Role</th>
                <th className="text-left px-5 py-3 font-semibold">LOB</th>
                <th className="text-left px-5 py-3 font-semibold">Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr key={u.id} style={{ animationDelay: `${i * 25}ms` }} className="row-enter border-t border-line-200 hover:bg-paper-50/60 transition-colors">
                  <td className="px-5 py-3 font-medium text-ink-900">{u.name}</td>
                  <td className="px-5 py-3 text-ink-500">{u.email}</td>
                  <td className="px-5 py-3 text-ink-500">{u.role}</td>
                  <td className="px-5 py-3 text-ink-500">{u.lob?.name || "—"}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${u.active ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                      {u.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button onClick={() => toggleActive(u)} className="text-xs font-medium text-aa-blue-600 hover:underline">
                      {u.active ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "masters" && (
        <div className="grid md:grid-cols-3 gap-5 animate-fade-in items-start">
          {/* Lines of Business — each has a short Code used in Project/Task IDs (e.g. PRJ-RSA-0001) */}
          <div className="bg-white rounded-2xl shadow-card p-5 hover-lift">
            <h3 className="font-display font-semibold text-ink-900 mb-1">Lines of Business</h3>
            <p className="text-xs text-ink-300 mb-3">Code is used in Project/Task IDs, e.g. PRJ-RSA-0001.</p>
            <form onSubmit={addLob} className="flex gap-2 mb-3">
              <input value={newLobName} onChange={(e) => setNewLobName(e.target.value)} placeholder="LOB name…"
                className="flex-1 px-3 py-2 rounded-lg border border-line-200 text-sm focus-ring" />
              <input value={newLobCode} onChange={(e) => setNewLobCode(e.target.value.toUpperCase())} placeholder="Code" maxLength={4}
                className="w-16 px-2 py-2 rounded-lg border border-line-200 text-sm focus-ring uppercase" />
              <button type="submit" className="px-3 py-2 rounded-lg bg-aa-blue-600 text-white text-sm font-medium hover:bg-aa-blue-700 press-scale">Add</button>
            </form>
            <div className="flex flex-wrap gap-2">
              {lobs.map((l) => (
                <button key={l.id} onClick={() => setEditLob(l)}
                  className="flex items-center gap-1.5 text-xs bg-paper-100 hover:bg-paper-200 text-ink-700 px-2.5 py-1 rounded-full transition-colors press-scale">
                  {l.name} <span className="font-mono text-ink-400">{l.code || "—"}</span>
                  <Pencil size={10} className="text-ink-300" />
                </button>
              ))}
              {lobs.length === 0 && <span className="text-sm text-ink-300">None yet</span>}
            </div>
          </div>

          {/* Developers — LOB-specific: a BA only sees their own LOB's developers (plus unassigned/global ones) */}
          <div className="bg-white rounded-2xl shadow-card p-5 hover-lift">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-display font-semibold text-ink-900">Developers</h3>
              <button onClick={() => setDevModalOpen(true)} className="text-xs font-medium text-aa-blue-600 hover:underline press-scale">
                + Add
              </button>
            </div>
            <p className="text-xs text-ink-300 mb-3">Each developer belongs to one LOB (or Global, visible everywhere).</p>
            <div className="flex flex-wrap gap-2">
              {developers.map((d) => (
                <button key={d.id} onClick={() => setEditDev(d)}
                  className="flex items-center gap-1.5 text-xs bg-paper-100 hover:bg-paper-200 text-ink-700 px-2.5 py-1 rounded-full transition-colors press-scale">
                  {d.name}
                  <span className="text-ink-400">· {d.lob?.name || "Global"}</span>
                </button>
              ))}
              {developers.length === 0 && <span className="text-sm text-ink-300">None yet</span>}
            </div>
          </div>

          <MasterCard title="Task Categories" items={categories} value={newCat} setValue={setNewCat} onAdd={addCat} />
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="New User">
        <form onSubmit={createUser} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">Full name</label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-line-200 text-sm focus-ring" />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">Email</label>
            <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-line-200 text-sm focus-ring" />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">Temporary password</label>
            <input required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-line-200 text-sm focus-ring" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">Role</label>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-line-200 text-sm focus-ring">
                <option value="BA">Business Analyst</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            {form.role === "BA" && (
              <div>
                <label className="block text-sm font-medium text-ink-700 mb-1.5">Line of Business</label>
                <select required value={form.lobId} onChange={(e) => setForm({ ...form, lobId: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-line-200 text-sm focus-ring">
                  <option value="">Select LOB</option>
                  {lobs.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
            )}
          </div>
          {error && <div className="text-sm text-rose-600 bg-rose-50 px-3 py-2 rounded-lg">{error}</div>}
          <button type="submit" className="w-full bg-aa-blue-600 hover:bg-aa-blue-700 text-white font-semibold py-2.5 rounded-xl focus-ring press-scale">
            Create User
          </button>
        </form>
      </Modal>

      <EditLobModal lob={editLob} onClose={() => setEditLob(null)} onDone={load} />
      <DeveloperModal developer={editDev} lobs={lobs} open={devModalOpen || !!editDev}
        onClose={() => { setDevModalOpen(false); setEditDev(null); }} onDone={load} />
    </div>
  );
}

function MasterCard({ title, items, value, setValue, onAdd }) {
  return (
    <div className="bg-white rounded-2xl shadow-card p-5 hover-lift">
      <h3 className="font-display font-semibold text-ink-900 mb-3">{title}</h3>
      <form onSubmit={onAdd} className="flex gap-2 mb-3">
        <input value={value} onChange={(e) => setValue(e.target.value)} placeholder={`Add ${title.toLowerCase()}…`}
          className="flex-1 px-3 py-2 rounded-lg border border-line-200 text-sm focus-ring" />
        <button type="submit" className="px-3 py-2 rounded-lg bg-aa-blue-600 text-white text-sm font-medium hover:bg-aa-blue-700 press-scale">Add</button>
      </form>
      <div className="flex flex-wrap gap-2">
        {items.map((i) => (
          <span key={i.id} className="text-xs bg-paper-100 text-ink-700 px-2.5 py-1 rounded-full">{i.name}</span>
        ))}
        {items.length === 0 && <span className="text-sm text-ink-300">None yet</span>}
      </div>
    </div>
  );
}

function EditLobModal({ lob, onClose, onDone }) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (lob) { setName(lob.name); setCode(lob.code || ""); setError(""); }
  }, [lob]);

  if (!lob) return null;

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.patch(`/masters/lobs/${lob.id}`, { name, code });
      onClose();
      onDone();
    } catch (err) {
      setError(err.response?.data?.error || "Could not save changes");
    }
  };

  return (
    <Modal open={!!lob} onClose={onClose} title="Edit Line of Business">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-ink-700 mb-1.5">Name</label>
          <input required value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3.5 py-2.5 rounded-xl border border-line-200 text-sm focus-ring" />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink-700 mb-1.5">Code</label>
          <input required maxLength={6} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())}
            className="w-full px-3.5 py-2.5 rounded-xl border border-line-200 text-sm focus-ring uppercase" />
          <p className="text-xs text-ink-300 mt-1">Used in new Project/Task IDs going forward — existing IDs won't change.</p>
        </div>
        {error && <div className="text-sm text-rose-600 bg-rose-50 px-3 py-2 rounded-lg">{error}</div>}
        <button type="submit" className="w-full bg-aa-blue-600 hover:bg-aa-blue-700 text-white font-semibold py-2.5 rounded-xl focus-ring press-scale">
          Save
        </button>
      </form>
    </Modal>
  );
}

function DeveloperModal({ developer, lobs, open, onClose, onDone }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [lobId, setLobId] = useState("");
  const [active, setActive] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (developer) {
      setName(developer.name); setEmail(developer.email || ""); setLobId(developer.lobId || ""); setActive(developer.active);
    } else {
      setName(""); setEmail(""); setLobId(""); setActive(true);
    }
    setError("");
  }, [developer, open]);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      if (developer) {
        await api.patch(`/masters/developers/${developer.id}`, { name, email: email || null, lobId: lobId || null, active });
      } else {
        await api.post("/masters/developers", { name, email: email || null, lobId: lobId || null });
      }
      onClose();
      onDone();
    } catch (err) {
      setError(err.response?.data?.error || "Could not save developer");
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={developer ? "Edit Developer" : "New Developer"}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-ink-700 mb-1.5">Name</label>
          <input required value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3.5 py-2.5 rounded-xl border border-line-200 text-sm focus-ring" />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink-700 mb-1.5">Email (optional)</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3.5 py-2.5 rounded-xl border border-line-200 text-sm focus-ring" />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink-700 mb-1.5">Line of Business</label>
          <select value={lobId} onChange={(e) => setLobId(e.target.value)} className="w-full px-3.5 py-2.5 rounded-xl border border-line-200 text-sm focus-ring">
            <option value="">Global (visible to every LOB)</option>
            {lobs.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>
        {developer && (
          <label className="flex items-center gap-2 text-sm text-ink-700">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> Active
          </label>
        )}
        {error && <div className="text-sm text-rose-600 bg-rose-50 px-3 py-2 rounded-lg">{error}</div>}
        <button type="submit" className="w-full bg-aa-blue-600 hover:bg-aa-blue-700 text-white font-semibold py-2.5 rounded-xl focus-ring press-scale">
          {developer ? "Save Changes" : "Add Developer"}
        </button>
      </form>
    </Modal>
  );
}
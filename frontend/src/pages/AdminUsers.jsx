import { useEffect, useState } from "react";
import api from "../api/client";
import Modal from "../components/Modal";
import { SkeletonTable } from "../components/Skeleton";
import { Plus, ShieldCheck } from "lucide-react";

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

  const [newLob, setNewLob] = useState("");
  const [newDev, setNewDev] = useState("");
  const [newCat, setNewCat] = useState("");

  const addLob = async (e) => { e.preventDefault(); if (!newLob) return; await api.post("/masters/lobs", { name: newLob }); setNewLob(""); load(); };
  const addDev = async (e) => { e.preventDefault(); if (!newDev) return; await api.post("/masters/developers", { name: newDev }); setNewDev(""); load(); };
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
        <div className="grid md:grid-cols-3 gap-5 animate-fade-in">
          <MasterCard title="Lines of Business" items={lobs} value={newLob} setValue={setNewLob} onAdd={addLob} />
          <MasterCard title="Developers" items={developers} value={newDev} setValue={setNewDev} onAdd={addDev} />
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
    </div>
  );
}

function MasterCard({ title, items, value, setValue, onAdd }) {
  return (
    <div className="bg-white rounded-2xl shadow-card p-5 hover-lift animate-fade-in">
      <h3 className="font-display font-semibold text-ink-900 mb-3">{title}</h3>
      <form onSubmit={onAdd} className="flex gap-2 mb-3">
        <input value={value} onChange={(e) => setValue(e.target.value)} placeholder={`Add ${title.toLowerCase()}…`}
          className="flex-1 px-3 py-2 rounded-lg border border-line-200 text-sm focus-ring" />
        <button type="submit" className="px-3 py-2 rounded-lg bg-aa-blue-600 text-white text-sm font-medium hover:bg-aa-blue-700">Add</button>
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
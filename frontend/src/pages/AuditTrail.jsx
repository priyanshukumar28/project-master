import { useEffect, useState } from "react";
import api from "../api/client";
import { SkeletonTable } from "../components/Skeleton";

export default function AuditTrail() {
  const [logs, setLogs] = useState(null);
  const [entity, setEntity] = useState("");

  useEffect(() => {
    api.get("/audit-logs", { params: { entity: entity || undefined } }).then((r) => setLogs(r.data));
  }, [entity]);

  return (
    <div className="space-y-5">
      <div className="animate-fade-in">
        <h1 className="font-display text-2xl font-bold text-ink-900">Audit Trail</h1>
        <p className="text-ink-500 text-sm mt-1">Every create, update, and status change — field, old value, new value, user, timestamp.</p>
      </div>

      <div className="flex flex-wrap gap-2 animate-fade-in">
        {["", "Project", "Task", "Bug", "User", "ExcelImportLog"].map((e) => (
          <button key={e} onClick={() => setEntity(e)}
            className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-colors press-scale ${entity === e ? "bg-aa-blue-600 text-white" : "bg-white border border-line-200 text-ink-700 hover:bg-paper-100"}`}>
            {e || "All"}
          </button>
        ))}
      </div>

      {logs === null ? (
        <SkeletonTable rows={7} cols={6} />
      ) : (
        <div className="bg-white rounded-2xl shadow-card overflow-x-auto animate-fade-in">
          <table className="w-full text-sm min-w-[760px]">
            <thead className="bg-paper-50 text-ink-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-5 py-3 font-semibold">When</th>
                <th className="text-left px-5 py-3 font-semibold">Entity</th>
                <th className="text-left px-5 py-3 font-semibold">Action</th>
                <th className="text-left px-5 py-3 font-semibold">Field</th>
                <th className="text-left px-5 py-3 font-semibold">Old → New</th>
                <th className="text-left px-5 py-3 font-semibold">User</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l, i) => (
                <tr key={l.id} style={{ animationDelay: `${i * 20}ms` }} className="row-enter border-t border-line-200 hover:bg-paper-50/60 transition-colors">
                  <td className="px-5 py-3 text-ink-500 whitespace-nowrap">{new Date(l.createdAt).toLocaleString()}</td>
                  <td className="px-5 py-3 text-ink-900 font-medium">{l.entity}</td>
                  <td className="px-5 py-3 text-ink-500">{l.action}</td>
                  <td className="px-5 py-3 text-ink-500">{l.field || "—"}</td>
                  <td className="px-5 py-3 text-ink-500 max-w-xs truncate">
                    {l.oldValue || l.newValue ? `${l.oldValue ?? "—"} → ${l.newValue ?? "—"}` : "—"}
                  </td>
                  <td className="px-5 py-3 text-ink-500">{l.user?.name || "System"}</td>
                </tr>
              ))}
              {logs.length === 0 && <tr><td colSpan={6} className="px-5 py-12 text-center text-ink-300 text-sm">No audit entries yet</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
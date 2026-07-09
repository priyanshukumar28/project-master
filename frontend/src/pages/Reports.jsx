import { useEffect, useState } from "react";
import api from "../api/client";
import { SkeletonTable } from "../components/Skeleton";
import { Download, Loader2 } from "lucide-react";

const REPORTS = [
  { type: "project", label: "Project Report" },
  { type: "projectBreakdown", label: "Project Breakdown (by Category)" },
  { type: "pending", label: "Pending Tasks" },
  { type: "completed", label: "Completed Tasks" },
  { type: "deadline", label: "Deadline Report" },
  { type: "missed", label: "Missed Deadline Report" },
  { type: "bug", label: "Bug Report" },
  { type: "developer", label: "Developer Report" },
  { type: "category", label: "Category-wise Report" },
  { type: "lob", label: "LOB Report" },
  { type: "monthly", label: "Monthly Report" },
];

export default function Reports() {
  const [active, setActive] = useState("project");
  const [rows, setRows] = useState(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    setRows(null);
    api.get(`/reports/${active}`).then((r) => setRows(r.data));
  }, [active]);

  const exportCsv = async () => {
    setExporting(true);
    try {
      const res = await api.get(`/reports/${active}`, { params: { format: "csv" }, responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `${active}-report.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const columns = rows ? [...new Set(rows.flatMap((r) => Object.keys(r)))] : [];

  return (
    <div className="space-y-5">
      <div className="animate-fade-in">
        <h1 className="font-display text-2xl font-bold text-ink-900">Reports</h1>
        <p className="text-ink-500 text-sm mt-1">Standard reports scoped to your role, exportable to CSV.</p>
      </div>

      <div className="flex flex-wrap gap-2 animate-fade-in">
        {REPORTS.map((r) => (
          <button key={r.type} onClick={() => setActive(r.type)}
            className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-colors press-scale ${
              active === r.type ? "bg-aa-blue-600 text-white" : "bg-white border border-line-200 text-ink-700 hover:bg-paper-100"
            }`}>
            {r.label}
          </button>
        ))}
      </div>

      {rows === null ? (
        <SkeletonTable rows={6} cols={5} />
      ) : (
        <div className="bg-white rounded-2xl shadow-card overflow-hidden animate-fade-in">
          <div className="flex items-center justify-between px-5 py-4 border-b border-line-200">
            <h3 className="font-display font-semibold text-ink-900">{REPORTS.find((r) => r.type === active)?.label}</h3>
            <button onClick={exportCsv} disabled={exporting} className="flex items-center gap-2 text-sm font-medium text-aa-blue-600 hover:text-aa-blue-700 press-scale disabled:opacity-50">
              {exporting ? <Loader2 size={15} className="animate-spin-slow" /> : <Download size={15} />}
              {exporting ? "Exporting…" : "Export CSV"}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-paper-50 text-ink-500 text-xs uppercase tracking-wide">
                <tr>{columns.map((c) => <th key={c} className="text-left px-5 py-3 font-semibold whitespace-nowrap">{c}</th>)}</tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i} style={{ animationDelay: `${i * 20}ms` }} className="row-enter border-t border-line-200 hover:bg-paper-50/60 transition-colors">
                    {columns.map((c) => <td key={c} className="px-5 py-3 text-ink-700 whitespace-nowrap">{String(row[c] ?? "")}</td>)}
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr><td colSpan={columns.length || 1} className="px-5 py-12 text-center text-ink-300 text-sm">No data for this report</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
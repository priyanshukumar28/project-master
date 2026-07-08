import { useState, useEffect } from "react";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import { UploadCloud, FileSpreadsheet, CheckCircle2, AlertCircle } from "lucide-react";

const STEPS = ["Upload", "Validate", "Preview", "Import"];

export default function Upload() {
  const { user, isAdmin } = useAuth();
  const [lobs, setLobs] = useState([]);
  const [lobId, setLobId] = useState("");
  const [step, setStep] = useState(0);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    api.get("/masters/lobs").then((r) => {
      setLobs(r.data);
      if (!isAdmin && user?.lobId) setLobId(user.lobId);
    });
  }, []);

  const onFile = (f) => {
    setFile(f);
    setError("");
    setPreview(null);
    setResult(null);
    setStep(0);
  };

  const validate = async () => {
    if (!file || !lobId) return;
    setBusy(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("lobId", lobId);
      const { data } = await api.post("/upload/preview", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setPreview(data);
      setRows(data.rows.map((r) => ({ ...r, action: r.isDuplicate ? "skip" : "import" })));
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.error || "Validation failed");
      setStep(1);
    } finally {
      setBusy(false);
    }
  };

  const setRowAction = (idx, action) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, action } : r)));
  };

  const runImport = async () => {
    setBusy(true);
    setError("");
    try {
      const { data } = await api.post("/upload/import", { fileName: preview.fileName, lobId, rows });
      setResult(data);
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.error || "Import failed");
    } finally {
      setBusy(false);
    }
  };

  const reset = () => { setStep(0); setFile(null); setPreview(null); setRows([]); setResult(null); setError(""); };

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink-900">Excel Upload &amp; Migration</h1>
        <p className="text-ink-500 text-sm mt-1">Guided 4-step import: select LOB → upload → validate → preview → import.</p>
      </div>

      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${
              i <= step ? "brand-gradient text-white" : "bg-paper-100 text-ink-300"
            }`}>{i + 1}</div>
            <span className={`text-sm font-medium ${i <= step ? "text-ink-900" : "text-ink-300"}`}>{s}</span>
            {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 ${i < step ? "bg-aa-blue-500" : "bg-paper-100"}`} />}
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-card p-6">
        {step <= 1 && (
          <div className="space-y-4">
            <div className="max-w-xs">
              <label className="block text-sm font-medium text-ink-700 mb-1.5">Line of Business</label>
              <select required disabled={!isAdmin} value={lobId} onChange={(e) => setLobId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-line-200 text-sm focus-ring disabled:bg-paper-100">
                <option value="">Select LOB</option>
                {lobs.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
              <p className="text-xs text-ink-300 mt-1">The tracker sheet carries no LOB column — every row in this file will be imported under the LOB selected here.</p>
            </div>

            <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-2xl py-14 transition-colors ${lobId ? "border-line-200 cursor-pointer hover:border-aa-blue-400" : "border-line-200 opacity-50 cursor-not-allowed"}`}>
              <UploadCloud size={36} className="text-aa-blue-500 mb-3" />
              <span className="font-medium text-ink-900">{file ? file.name : "Click to select an .xlsx or .xls file"}</span>
              <span className="text-xs text-ink-300 mt-1 text-center max-w-md">
                Required columns: Project Name/Module, Category, Status. Also read if present: Email Subject, Description, Priority,
                Requirement Rec. From, Business Req. Rec. Date, Developer Req. Received Date, Delivery Date, Start Date (Developer),
                Expected End Date, Assigned Team/Developer, Revised date, Reason For Delay, Remarks.
              </span>
              <input type="file" accept=".xlsx,.xls" className="hidden" disabled={!lobId} onChange={(e) => onFile(e.target.files[0])} />
            </label>
            {error && (
              <div className="flex items-start gap-2 text-sm text-rose-600 bg-rose-50 px-4 py-3 rounded-xl">
                <AlertCircle size={16} className="mt-0.5 shrink-0" /> {error}
              </div>
            )}
            <button disabled={!file || !lobId || busy} onClick={validate}
              className="w-full bg-aa-blue-600 hover:bg-aa-blue-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl focus-ring press-scale">
              {busy ? "Validating…" : "Validate File"}
            </button>
          </div>
        )}

        {step === 2 && preview && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-ink-700 bg-aa-blue-50 px-4 py-3 rounded-xl">
              <FileSpreadsheet size={16} className="text-aa-blue-600" />
              {preview.totalRows} rows found in <b>{preview.fileName}</b> (sheet "{preview.sheetName}") → importing into <b>{preview.lobName}</b>.
              Rows flagged as duplicates default to "Skip" — review and change as needed.
            </div>
            <div className="max-h-96 overflow-y-auto border border-line-200 rounded-xl">
              <table className="w-full text-xs">
                <thead className="bg-paper-50 text-ink-500 uppercase sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2">Project</th>
                    <th className="text-left px-3 py-2">Category</th>
                    <th className="text-left px-3 py-2">Status</th>
                    <th className="text-left px-3 py-2">Priority</th>
                    <th className="text-left px-3 py-2">Assigned Team</th>
                    <th className="text-left px-3 py-2">Flags</th>
                    <th className="text-left px-3 py-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className="border-t border-line-200">
                      <td className="px-3 py-2">{r.projectName}</td>
                      <td className="px-3 py-2">{r.category}</td>
                      <td className="px-3 py-2">{r.status}</td>
                      <td className="px-3 py-2">{r.priority}</td>
                      <td className="px-3 py-2 max-w-[140px] truncate" title={r.assignedTeam}>{r.assignedTeam || "—"}</td>
                      <td className="px-3 py-2 space-x-1">
                        {r.isNewProject && <span className="bg-aa-blue-50 text-aa-blue-700 px-1.5 py-0.5 rounded">new project</span>}
                        {r.isDuplicate && <span className="bg-aa-orange-50 text-aa-orange-700 px-1.5 py-0.5 rounded">duplicate</span>}
                      </td>
                      <td className="px-3 py-2">
                        <select value={r.action} onChange={(e) => setRowAction(i, e.target.value)}
                          className="border border-line-200 rounded-lg px-2 py-1 text-xs focus-ring">
                          <option value="import">Import</option>
                          <option value="skip">Skip</option>
                          {r.isDuplicate && <option value="overwrite">Overwrite</option>}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {error && <div className="text-sm text-rose-600 bg-rose-50 px-4 py-3 rounded-xl">{error}</div>}
            <div className="flex gap-3">
              <button onClick={reset} className="px-4 py-2.5 rounded-xl border border-line-200 text-sm font-medium text-ink-700 hover:bg-paper-100">Start Over</button>
              <button disabled={busy} onClick={runImport}
                className="flex-1 bg-aa-blue-600 hover:bg-aa-blue-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl focus-ring press-scale">
                {busy ? "Importing…" : `Import ${rows.filter((r) => r.action !== "skip").length} rows`}
              </button>
            </div>
          </div>
        )}

        {step === 3 && result && (
          <div className="text-center py-8">
            <CheckCircle2 size={48} className="text-emerald-500 mx-auto mb-4" />
            <h3 className="font-display text-xl font-bold text-ink-900 mb-2">Import complete</h3>
            <div className="flex justify-center gap-6 text-sm text-ink-500 mb-6">
              <span><b className="text-ink-900">{result.imported}</b> imported</span>
              <span><b className="text-ink-900">{result.overwritten}</b> overwritten</span>
              <span><b className="text-ink-900">{result.skipped}</b> skipped</span>
            </div>
            <button onClick={reset} className="bg-aa-blue-600 hover:bg-aa-blue-700 text-white font-semibold px-6 py-2.5 rounded-xl focus-ring press-scale">
              Upload Another File
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
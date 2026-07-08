import { Loader2 } from "lucide-react";

export default function Spinner({ label = "Loading…", className = "" }) {
  return (
    <div className={`flex items-center gap-2 text-sm text-ink-400 py-10 justify-center ${className}`}>
      <Loader2 size={16} className="animate-spin-slow" />
      {label}
    </div>
  );
}
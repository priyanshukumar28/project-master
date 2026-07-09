import { useEffect } from "react";
import { Bell, X } from "lucide-react";

// Outlook-style stacked toasts, top-right, auto-dismissing.
export default function NotificationToasts({ toasts, onDismiss }) {
  if (!toasts.length) return null;
  return (
    <div className="fixed top-20 right-6 z-[60] flex flex-col gap-3 w-80 pointer-events-none">
      {toasts.map((t) => (
        <Toast key={t.id} toast={t} onDismiss={() => onDismiss(t.id)} />
      ))}
    </div>
  );
}

function Toast({ toast, onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 6000);
    return () => clearTimeout(timer);
  }, [toast.id]);

  return (
    <div className="pointer-events-auto bg-white rounded-2xl shadow-pop border border-line-200 p-4 animate-slide-in-toast">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl brand-gradient flex items-center justify-center shrink-0">
          <Bell size={16} className="text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-ink-900 mb-0.5">New notification</div>
          <div className="text-sm text-ink-500 leading-snug">{toast.message}</div>
        </div>
        <button onClick={onDismiss} className="p-1 rounded-lg hover:bg-paper-100 text-ink-300 hover:text-ink-600 shrink-0 press-scale">
          <X size={14} />
        </button>
      </div>
      <div className="h-0.5 bg-paper-100 rounded-full mt-3 overflow-hidden">
        <div className="h-full brand-gradient animate-toast-progress" />
      </div>
    </div>
  );
}
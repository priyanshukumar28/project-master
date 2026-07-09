import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard, FolderKanban, ListChecks, Bug, UploadCloud,
  FileBarChart, Users, ShieldCheck, LogOut, Bell, Menu, X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useEffect, useRef, useState } from "react";
import api from "../api/client";
import logo from "../assets/aa-logo.jpg";
import NotificationToasts from "./NotificationToasts";
import { playNotificationChime } from "../utils/sound";

const POLL_INTERVAL_MS = 20000;

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/projects", label: "Project Master", icon: FolderKanban },
  { to: "/tasks", label: "Task Tracker", icon: ListChecks },
  { to: "/bugs", label: "Bug Management", icon: Bug },
  { to: "/upload", label: "Excel Upload", icon: UploadCloud },
  { to: "/reports", label: "Reports", icon: FileBarChart },
];

const ADMIN_NAV = [
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/audit", label: "Audit Trail", icon: ShieldCheck },
];

function SidebarContent({ onNavigate }) {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <>
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
        <img src={logo} alt="Across Assist" className="w-9 h-9 rounded-lg object-cover" />
        <div>
          <div className="font-display font-bold text-sm leading-tight">Project Master</div>
          <div className="text-[11px] text-white/50 tracking-wide">ACROSS ASSIST</div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-white/10 text-white border-l-2 border-aa-orange-500 translate-x-0.5"
                  : "text-white/60 hover:bg-white/5 hover:text-white hover:translate-x-0.5"
              }`
            }
          >
            <Icon size={17} />
            {label}
          </NavLink>
        ))}

        {isAdmin && (
          <>
            <div className="pt-4 pb-1 px-3 text-[11px] font-semibold tracking-wider text-white/35 uppercase">
              Admin
            </div>
            {ADMIN_NAV.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                onClick={onNavigate}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-white/10 text-white border-l-2 border-aa-orange-500 translate-x-0.5"
                      : "text-white/60 hover:bg-white/5 hover:text-white hover:translate-x-0.5"
                  }`
                }
              >
                <Icon size={17} />
                {label}
              </NavLink>
            ))}
          </>
        )}
      </nav>

      <div className="px-3 py-4 border-t border-white/10">
        <div className="flex items-center gap-3 px-2 mb-2">
          <div className="w-8 h-8 rounded-full brand-gradient flex items-center justify-center text-xs font-bold">
            {user?.name?.[0]?.toUpperCase() || "U"}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium truncate">{user?.name}</div>
            <div className="text-[11px] text-white/45 truncate">
              {user?.role === "ADMIN" ? "Administrator" : user?.lobName ? `${user.lobName} · BA` : "Business Analyst"}
            </div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-white/60 hover:bg-white/5 hover:text-white transition-colors focus-ring press-scale"
        >
          <LogOut size={15} /> Sign out
        </button>
      </div>
    </>
  );
}

export default function Layout() {
  const location = useLocation();
  const [notifOpen, setNotifOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [toasts, setToasts] = useState([]);
  const seenIds = useRef(new Set());
  const isFirstLoad = useRef(true);

  const fetchNotifications = () => {
    api.get("/notifications").then((r) => {
      const list = r.data;
      setNotifications(list);

      if (isFirstLoad.current) {
        // Don't toast/chime for the backlog that already existed before this session started.
        list.forEach((n) => seenIds.current.add(n.id));
        isFirstLoad.current = false;
        return;
      }

      const freshUnseen = list.filter((n) => !seenIds.current.has(n.id));
      if (freshUnseen.length) {
        freshUnseen.forEach((n) => seenIds.current.add(n.id));
        playNotificationChime();
        setToasts((prev) => [...prev, ...freshUnseen.map((n) => ({ id: n.id, message: n.message }))]);
      }
    }).catch(() => {});
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  const dismissToast = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const unread = notifications.filter((n) => !n.isRead).length;

  const markAllRead = async () => {
    await api.patch("/notifications/read-all");
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  return (
    <div className="min-h-screen flex bg-paper-50">
      <NotificationToasts toasts={toasts} onDismiss={dismissToast} />

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 bg-ink-900 text-white flex-col">
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="fixed inset-0 bg-ink-900/60 backdrop-blur-sm animate-fade-in" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-ink-900 text-white flex flex-col animate-slide-in">
            <button onClick={() => setMobileOpen(false)} className="absolute right-3 top-4 p-1.5 rounded-lg text-white/60 hover:bg-white/10 focus-ring">
              <X size={18} />
            </button>
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-16 shrink-0 border-b border-line-200 bg-white/90 backdrop-blur-sm sticky top-0 z-30 flex items-center justify-between lg:justify-end px-4 sm:px-6 gap-4">
          <button onClick={() => setMobileOpen(true)} className="lg:hidden p-2 rounded-lg hover:bg-paper-100 text-ink-700 focus-ring press-scale">
            <Menu size={20} />
          </button>

          <div className="relative">
            <button
              onClick={() => setNotifOpen((v) => !v)}
              className="relative p-2 rounded-lg hover:bg-paper-100 text-ink-500 focus-ring press-scale transition-colors"
            >
              <Bell size={19} />
              {unread > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-aa-orange-500 animate-pulse-dot" />
              )}
            </button>
            {notifOpen && (
              <div className="absolute right-0 top-12 w-80 bg-white rounded-xl shadow-pop border border-line-200 z-40 animate-scale-in origin-top-right">
                <div className="flex items-center justify-between px-4 py-3 border-b border-line-200">
                  <span className="font-semibold text-sm text-ink-900">Notifications</span>
                  {unread > 0 && (
                    <button onClick={markAllRead} className="text-xs text-aa-blue-600 hover:underline">
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 && (
                    <div className="px-4 py-6 text-sm text-ink-300 text-center">No notifications yet</div>
                  )}
                  {notifications.map((n, i) => (
                    <div
                      key={n.id}
                      style={{ animationDelay: `${i * 30}ms` }}
                      className={`row-enter px-4 py-3 text-sm border-b border-line-200 last:border-0 transition-colors ${n.isRead ? "text-ink-500" : "text-ink-900 bg-aa-blue-50/40"}`}
                    >
                      {n.message}
                      <div className="text-[11px] text-ink-300 mt-0.5">{new Date(n.createdAt).toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div key={location.pathname} className="animate-page-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
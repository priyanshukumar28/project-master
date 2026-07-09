import { useEffect, useState } from "react";
import api from "../api/client";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { FolderKanban, ListChecks, Bug, AlertTriangle, Clock, Rocket, RotateCcw, PlayCircle, Trophy } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { SkeletonStatCards, SkeletonCards } from "../components/Skeleton";

const STATUS_COLORS = {
  PENDING: "#8892A6", ASSIGNED: "#2F5DD6", WIP: "#FA7D0B", COMPLETED: "#10B981",
  UAT: "#A855F7", LIVE: "#059669", REOPENED: "#E11D48",
};
const PROJECT_STATUS_COLORS = {
  PLANNING: "#8892A6", ACTIVE: "#2F5DD6", ON_HOLD: "#FA7D0B", COMPLETED: "#10B981", CANCELLED: "#E11D48",
};
const CATEGORY_COLORS = ["#2F5DD6", "#FA7D0B", "#10B981", "#A855F7", "#E11D48", "#8892A6"];

function StatCard({ icon: Icon, label, value, tone, delay }) {
  return (
    <div className="bg-white rounded-2xl shadow-card p-5 flex items-center gap-4 hover-lift row-enter" style={{ animationDelay: `${delay}ms` }}>
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${tone}`}>
        <Icon size={20} />
      </div>
      <div>
        <div className="text-2xl font-display font-bold text-ink-900">{value}</div>
        <div className="text-sm text-ink-500">{label}</div>
      </div>
    </div>
  );
}

function RankBadge({ rank }) {
  const styles = ["bg-amber-100 text-amber-700", "bg-slate-200 text-slate-700", "bg-orange-100 text-orange-700"];
  if (rank <= 3) {
    return <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${styles[rank - 1]}`}>{rank}</span>;
  }
  return <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium text-ink-400 bg-paper-100">{rank}</span>;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get("/dashboard/home").then((r) => setData(r.data));
  }, []);

  const statusData = data ? Object.entries(data.statusCounts || {}).map(([name, value]) => ({ name, value })) : [];
  const lobData = data ? Object.entries(data.projectsByLob || {}).map(([name, value]) => ({ name, value })) : [];
  const categoryData = data ? Object.entries(data.categoryCounts || {}).map(([name, value]) => ({ name, value })) : [];
  const projectStatusData = data ? Object.entries(data.projectStatusCounts || {}).map(([name, value]) => ({ name, value })) : [];

  return (
    <div className="space-y-6">
      <div className="animate-fade-in">
        <h1 className="font-display text-2xl font-bold text-ink-900">
          Welcome back, {user?.name?.split(" ")[0]}
        </h1>
        <p className="text-ink-500 text-sm mt-1">
          {user?.role === "ADMIN" ? "Overview across all Lines of Business" : `${user?.lobName} line of business overview`}
        </p>
      </div>

      {!data ? (
        <>
          <SkeletonStatCards />
          <SkeletonStatCards count={4} />
          <SkeletonCards count={2} />
        </>
      ) : (
        <>
          {/* Row 1: top-line volume */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard icon={FolderKanban} label="Projects" value={data.totalProjects} tone="bg-aa-blue-50 text-aa-blue-600" delay={0} />
            <StatCard icon={ListChecks} label="Tasks" value={data.totalTasks} tone="bg-aa-orange-50 text-aa-orange-600" delay={40} />
            <StatCard icon={Bug} label="Bugs" value={data.totalBugs} tone="bg-rose-50 text-rose-600" delay={80} />
            <StatCard icon={AlertTriangle} label="Overdue" value={data.overdueCount} tone="bg-rose-50 text-rose-600" delay={120} />
            <StatCard icon={Clock} label="Due Today" value={data.dueTodayCount} tone="bg-aa-orange-50 text-aa-orange-600" delay={160} />
          </div>

          {/* Row 2: delivery pipeline health */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={Rocket} label="Active Projects" value={data.activeProjectsCount} tone="bg-emerald-50 text-emerald-600" delay={200} />
            <StatCard icon={PlayCircle} label="In Progress (WIP)" value={data.inProgressCount} tone="bg-aa-blue-50 text-aa-blue-600" delay={240} />
            <StatCard icon={Clock} label="Done, Not Live Yet" value={data.completedNotLiveCount} tone="bg-purple-50 text-purple-600" delay={280} />
            <StatCard icon={RotateCcw} label="Reopened" value={data.reopenedCount} tone="bg-rose-50 text-rose-600" delay={320} />
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl shadow-card p-5 hover-lift row-enter" style={{ animationDelay: "360ms" }}>
              <h3 className="font-display font-semibold text-ink-900 mb-4">Tasks by Status</h3>
              {statusData.length === 0 ? (
                <div className="text-sm text-ink-300 py-12 text-center">No tasks yet</div>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2} animationDuration={600}>
                      {statusData.map((entry, i) => <Cell key={i} fill={STATUS_COLORS[entry.name] || "#8892A6"} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
              <div className="flex flex-wrap gap-3 mt-2 justify-center">
                {statusData.map((s) => (
                  <div key={s.name} className="flex items-center gap-1.5 text-xs text-ink-500">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: STATUS_COLORS[s.name] || "#8892A6" }} />
                    {s.name.replace(/_/g, " ")} ({s.value})
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-card p-5 hover-lift row-enter" style={{ animationDelay: "400ms" }}>
              <h3 className="font-display font-semibold text-ink-900 mb-4">Projects - Development vs Change Requests vs Bug Fixes</h3>
              {categoryData.length === 0 ? (
                <div className="text-sm text-ink-300 py-12 text-center">No tasks yet</div>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={categoryData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2} animationDuration={600}>
                      {categoryData.map((entry, i) => <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
              <div className="flex flex-wrap gap-3 mt-2 justify-center">
                {categoryData.map((c, i) => (
                  <div key={c.name} className="flex items-center gap-1.5 text-xs text-ink-500">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }} />
                    {c.name} ({c.value})
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl shadow-card p-5 hover-lift row-enter" style={{ animationDelay: "440ms" }}>
              <h3 className="font-display font-semibold text-ink-900 mb-4">Projects by Line of Business</h3>
              {lobData.length === 0 ? (
                <div className="text-sm text-ink-300 py-12 text-center">No projects yet</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={lobData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E3E7F1" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#4B5670" }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#4B5670" }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: "rgba(47,93,214,0.06)" }} />
                    <Bar dataKey="value" fill="#2F5DD6" radius={[6, 6, 0, 0]} animationDuration={600} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="bg-white rounded-2xl shadow-card p-5 hover-lift row-enter" style={{ animationDelay: "480ms" }}>
              <h3 className="font-display font-semibold text-ink-900 mb-4">Projects by Status</h3>
              {projectStatusData.length === 0 ? (
                <div className="text-sm text-ink-300 py-12 text-center">No projects yet</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={projectStatusData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E3E7F1" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#4B5670" }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#4B5670" }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: "rgba(47,93,214,0.06)" }} />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]} animationDuration={600}>
                      {projectStatusData.map((entry, i) => <Cell key={i} fill={PROJECT_STATUS_COLORS[entry.name] || "#8892A6"} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Developer leaderboard */}
          <div className="bg-white rounded-2xl shadow-card overflow-hidden hover-lift row-enter" style={{ animationDelay: "520ms" }}>
            <div className="flex items-center gap-2 px-5 py-4 border-b border-line-200">
              <Trophy size={18} className="text-aa-orange-500" />
              <h3 className="font-display font-semibold text-ink-900">Developer Leaderboard</h3>
              <span className="text-xs text-ink-300 ml-auto">Ranked by tasks delivered, then on-time %</span>
            </div>
            {!data.developerLeaderboard?.length ? (
              <div className="px-5 py-10 text-center text-sm text-ink-300">No delivered tasks yet</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[680px]">
                  <thead className="bg-paper-50 text-ink-500 text-xs uppercase tracking-wide">
                    <tr>
                      <th className="text-left px-5 py-3 font-semibold">Rank</th>
                      <th className="text-left px-5 py-3 font-semibold">Developer</th>
                      <th className="text-left px-5 py-3 font-semibold">Delivered (Live)</th>
                      <th className="text-left px-5 py-3 font-semibold">On-Time %</th>
                      <th className="text-left px-5 py-3 font-semibold">Avg Cycle (days)</th>
                      <th className="text-left px-5 py-3 font-semibold">Current WIP</th>
                      <th className="text-left px-5 py-3 font-semibold">Reopened</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.developerLeaderboard.map((d, i) => (
                      <tr key={d.developerId} style={{ animationDelay: `${i * 30}ms` }} className="row-enter border-t border-line-200 hover:bg-paper-50/60 transition-colors">
                        <td className="px-5 py-3"><RankBadge rank={i + 1} /></td>
                        <td className="px-5 py-3 font-medium text-ink-900">{d.name}</td>
                        <td className="px-5 py-3 text-ink-700">{d.liveCount}</td>
                        <td className="px-5 py-3">
                          {d.onTimePct === null ? (
                            <span className="text-ink-300">—</span>
                          ) : (
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${d.onTimePct >= 80 ? "bg-emerald-50 text-emerald-700" : d.onTimePct >= 50 ? "bg-aa-orange-50 text-aa-orange-700" : "bg-rose-50 text-rose-700"}`}>
                              {d.onTimePct}%
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-ink-500">{d.avgCycleDays ?? "—"}</td>
                        <td className="px-5 py-3 text-ink-500">{d.wipCount}</td>
                        <td className="px-5 py-3 text-ink-500">{d.reopenedCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
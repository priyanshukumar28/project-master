import { useEffect, useState } from "react";
import api from "../api/client";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { FolderKanban, ListChecks, Bug, AlertTriangle, Clock } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { SkeletonStatCards, SkeletonCards } from "../components/Skeleton";

const STATUS_COLORS = {
  PENDING: "#8892A6", ASSIGNED: "#2F5DD6", WIP: "#FA7D0B", COMPLETED: "#10B981",
  UAT: "#A855F7", LIVE: "#059669", REOPENED: "#E11D48",
};

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

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get("/dashboard/home").then((r) => setData(r.data));
  }, []);

  const statusData = data ? Object.entries(data.statusCounts || {}).map(([name, value]) => ({ name, value })) : [];
  const lobData = data ? Object.entries(data.projectsByLob || {}).map(([name, value]) => ({ name, value })) : [];

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
          <SkeletonCards count={2} />
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard icon={FolderKanban} label="Projects" value={data.totalProjects} tone="bg-aa-blue-50 text-aa-blue-600" delay={0} />
            <StatCard icon={ListChecks} label="Tasks" value={data.totalTasks} tone="bg-aa-orange-50 text-aa-orange-600" delay={40} />
            <StatCard icon={Bug} label="Bugs" value={data.totalBugs} tone="bg-rose-50 text-rose-600" delay={80} />
            <StatCard icon={AlertTriangle} label="Overdue" value={data.overdueCount} tone="bg-rose-50 text-rose-600" delay={120} />
            <StatCard icon={Clock} label="Due Today" value={data.dueTodayCount} tone="bg-aa-orange-50 text-aa-orange-600" delay={160} />
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl shadow-card p-5 hover-lift row-enter" style={{ animationDelay: "200ms" }}>
              <h3 className="font-display font-semibold text-ink-900 mb-4">Tasks by Status</h3>
              {statusData.length === 0 ? (
                <div className="text-sm text-ink-300 py-12 text-center">No tasks yet</div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2} animationDuration={600} animationBegin={100}>
                      {statusData.map((entry, i) => (
                        <Cell key={i} fill={STATUS_COLORS[entry.name] || "#8892A6"} />
                      ))}
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

            <div className="bg-white rounded-2xl shadow-card p-5 hover-lift row-enter" style={{ animationDelay: "240ms" }}>
              <h3 className="font-display font-semibold text-ink-900 mb-4">Projects by Line of Business</h3>
              {lobData.length === 0 ? (
                <div className="text-sm text-ink-300 py-12 text-center">No projects yet</div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
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
          </div>
        </>
      )}
    </div>
  );
}
"use client";

import * as React from "react";
import { useAppStore } from "@/lib/iris/store";
import { ALL_TICKETS, getAssignee, getStudio, getDepartment } from "@/lib/iris/sample-tickets";
import { EMPLOYEES, DEPARTMENTS, STUDIOS } from "@/lib/iris/types";
import { PriorityBadge, StatusBadge, SLABadge, SLAProgressBar, StudioBadge } from "../badges";
import { formatRelativeTime, formatTimeRemaining } from "@/lib/iris/utils";
import { cn } from "@/lib/utils";
import {
  Ticket as TicketIcon,
  AlertTriangle,
  Clock,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Activity,
  Users,
  Building2,
  Sparkles,
  ArrowRight,
  Zap,
  Brain,
  Timer,
  Target,
  Flame,
  ChevronRight,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  RadialBarChart,
  RadialBar,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

const CHART_COLORS = ["#8b5cf6", "#06b6d4", "#f59e0b", "#ec4899", "#10b981", "#6366f1", "#f43f5e", "#84cc16"];

export function OverviewView() {
  const { setCurrentView, selectTicket, currentUser } = useAppStore();

  const stats = React.useMemo(() => {
    const open = ALL_TICKETS.filter((t) => t.status === "open" || t.status === "in_progress" || t.status === "awaiting_response").length;
    const unassigned = ALL_TICKETS.filter((t) => !t.assigneeId).length;
    const overdue = ALL_TICKETS.filter((t) => t.slaStatus === "breached").length;
    const critical = ALL_TICKETS.filter((t) => t.priority === "P0").length;
    const resolved = ALL_TICKETS.filter((t) => t.status === "resolved" || t.status === "closed").length;
    const escalated = ALL_TICKETS.filter((t) => t.status === "escalated").length;
    const myTickets = ALL_TICKETS.filter((t) => t.assigneeId === currentUser.id).length;
    return { open, unassigned, overdue, critical, resolved, escalated, myTickets, total: ALL_TICKETS.length };
  }, [currentUser.id]);

  const trendData = React.useMemo(() => {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    return days.map((d, i) => ({
      day: d,
      created: 12 + Math.floor(Math.random() * 8) + i,
      resolved: 10 + Math.floor(Math.random() * 7) + (i - 1),
    }));
  }, []);

  const priorityData = React.useMemo(() => {
    const counts: Record<string, number> = { P0: 0, P1: 0, P2: 0, P3: 0 };
    ALL_TICKETS.forEach((t) => (counts[t.priority] = (counts[t.priority] || 0) + 1));
    return [
      { name: "P0", value: counts.P0, color: "#f43f5e" },
      { name: "P1", value: counts.P1, color: "#f59e0b" },
      { name: "P2", value: counts.P2, color: "#06b6d4" },
      { name: "P3", value: counts.P3, color: "#10b981" },
    ];
  }, []);

  const studioData = React.useMemo(() => {
    return STUDIOS.map((s) => ({
      name: s.name.split(" ")[0],
      studio: s.name,
      tickets: ALL_TICKETS.filter((t) => t.studioCode === s.code).length,
      resolved: ALL_TICKETS.filter((t) => t.studioCode === s.code && (t.status === "resolved" || t.status === "closed")).length,
    }));
  }, []);

  const deptData = React.useMemo(() => {
    return DEPARTMENTS.map((d) => ({
      name: d.code,
      dept: d.name,
      workload: ALL_TICKETS.filter((t) => t.departmentCode === d.code).length,
    })).sort((a, b) => b.workload - a.workload).slice(0, 6);
  }, []);

  const slaCompliance = 87.5;

  const recentTickets = React.useMemo(() => {
    return [...ALL_TICKETS].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 6);
  }, []);

  const criticalTickets = React.useMemo(() => {
    return ALL_TICKETS.filter((t) => t.priority === "P0" || t.slaStatus === "breached").slice(0, 4);
  }, []);

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground mb-1">
            <span className="iris-pulse-dot" />
            Operations Overview · Live
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Good afternoon, <span className="iris-text-gradient">{currentUser.name.split(" ")[0]}</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Here's what's happening across all Physique 57 India studios today.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/60 text-[11px] font-medium">
            <Timer className="w-3.5 h-3.5 text-violet-500" />
            <span>SLA Compliance</span>
            <span className="font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{slaCompliance}%</span>
          </div>
          <button
            onClick={() => setCurrentView("ai_assistant")}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-[13px] font-medium iris-btn-glow"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Ask IRIS
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <KPICard label="Total Tickets" value={stats.total} icon={TicketIcon} trend="+8%" trendUp accent="violet" />
        <KPICard label="Open" value={stats.open} icon={Activity} accent="sky" />
        <KPICard label="Critical" value={stats.critical} icon={Flame} accent="rose" />
        <KPICard label="Escalated" value={stats.escalated} icon={AlertTriangle} accent="amber" />
        <KPICard label="Overdue" value={stats.overdue} icon={Clock} accent="rose" />
        <KPICard label="Resolved" value={stats.resolved} icon={CheckCircle2} trend="+12%" trendUp accent="emerald" />
        <KPICard label="My Queue" value={stats.myTickets} icon={Target} accent="indigo" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader title="Ticket Activity" subtitle="Daily creation vs resolution (last 7 days)" icon={TrendingUp} />
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="grad-created" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="grad-resolved" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.1} vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "currentColor", opacity: 0.6 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "currentColor", opacity: 0.6 }} axisLine={false} tickLine={false} />
                <RTooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                    color: "var(--popover-foreground)",
                  }}
                />
                <Area type="monotone" dataKey="created" name="Created" stroke="#8b5cf6" strokeWidth={2} fill="url(#grad-created)" />
                <Area type="monotone" dataKey="resolved" name="Resolved" stroke="#10b981" strokeWidth={2} fill="url(#grad-resolved)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Priority Distribution" subtitle="Active tickets by priority" icon={Target} />
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={priorityData} innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                  {priorityData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <RTooltip
                  contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-1.5 mt-2">
              {priorityData.map((p) => (
                <div key={p.name} className="flex items-center gap-1.5 text-[11px]">
                  <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                  <span className="text-muted-foreground flex-1">{p.name}</span>
                  <span className="font-semibold tabular-nums">{p.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Studio Performance" subtitle="Tickets by studio with resolution rate" icon={Building2} />
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={studioData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.1} vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "currentColor", opacity: 0.6 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "currentColor", opacity: 0.6 }} axisLine={false} tickLine={false} />
                <RTooltip
                  contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                  cursor={{ fill: "currentColor", fillOpacity: 0.05 }}
                />
                <Bar dataKey="tickets" name="Total" fill="#8b5cf6" radius={[6, 6, 0, 0]} barSize={28} />
                <Bar dataKey="resolved" name="Resolved" fill="#10b981" radius={[6, 6, 0, 0]} barSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Department Load" subtitle="Top by workload" icon={Users} />
          <CardContent>
            <div className="space-y-2.5">
              {deptData.map((d, i) => (
                <div key={d.name} className="group">
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-[12px] font-medium truncate flex-1">{d.dept}</div>
                    <div className="text-[11px] font-semibold tabular-nums text-muted-foreground ml-2">{d.workload}</div>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${(d.workload / deptData[0].workload) * 100}%`,
                        background: `linear-gradient(90deg, ${CHART_COLORS[i]}, ${CHART_COLORS[i]}99)`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader
            title="Critical & Overdue"
            subtitle={`${criticalTickets.length} tickets need attention`}
            icon={Flame}
            action={
              <button onClick={() => setCurrentView("escalations")} className="text-[11px] font-medium text-violet-600 dark:text-violet-400 flex items-center gap-1 hover:gap-1.5 transition-all">
                View all <ChevronRight className="w-3 h-3" />
              </button>
            }
          />
          <CardContent className="space-y-2 max-h-[360px] overflow-y-auto iris-scrollbar">
            {criticalTickets.map((t) => {
              const assignee = getAssignee(t);
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    selectTicket(t.id);
                    setCurrentView("all_tickets");
                  }}
                  className="w-full text-left p-3 rounded-lg border border-border hover:border-violet-500/40 hover:bg-violet-500/5 transition-all group"
                >
                  <div className="flex items-start gap-2 mb-2">
                    <PriorityBadge priority={t.priority} />
                    <SLABadge status={t.slaStatus} targetDate={t.slaResolutionTarget} />
                    <span className="text-[10px] font-mono text-muted-foreground ml-auto">{t.ticketId}</span>
                  </div>
                  <div className="text-[13px] font-medium leading-snug line-clamp-2 mb-2 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                    {t.title}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    {t.studioCode && <StudioBadge studioCode={t.studioCode} />}
                    {assignee && <span>· {assignee.name}</span>}
                    <span className="ml-auto">{formatRelativeTime(t.createdAt)}</span>
                  </div>
                </button>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader
            title="Recent Activity"
            subtitle="Latest tickets across studios"
            icon={Clock}
            action={
              <button onClick={() => setCurrentView("all_tickets")} className="text-[11px] font-medium text-violet-600 dark:text-violet-400 flex items-center gap-1 hover:gap-1.5 transition-all">
                View all <ChevronRight className="w-3 h-3" />
              </button>
            }
          />
          <CardContent className="space-y-2 max-h-[360px] overflow-y-auto iris-scrollbar">
            {recentTickets.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  selectTicket(t.id);
                  setCurrentView("all_tickets");
                }}
                className="w-full text-left p-3 rounded-lg border border-border hover:border-violet-500/40 hover:bg-violet-500/5 transition-all group"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <PriorityBadge priority={t.priority} size="xs" />
                  <StatusBadge status={t.status} size="xs" />
                  <span className="text-[10px] font-mono text-muted-foreground ml-auto">{t.ticketId}</span>
                </div>
                <div className="text-[13px] font-medium leading-snug line-clamp-1 mb-1 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                  {t.title}
                </div>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <span>{getStudio(t)?.name}</span>
                  <span>·</span>
                  <span>{getDepartment(t)?.name}</span>
                  <span className="ml-auto">{formatRelativeTime(t.createdAt)}</span>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="iris-ai-border">
        <CardHeader
          title="AI Insights & Recommendations"
          subtitle="Generated by IRIS Intelligence Agent"
          icon={Brain}
          action={<Sparkles className="w-4 h-4 text-violet-500" />}
        />
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <InsightCard type="pattern" title="Recurring HVAC Issues" description="Kwality House has reported 3 AC-related issues in 6 weeks. Recommend preventive maintenance schedule." confidence={92} />
            <InsightCard type="bottleneck" title="Resolution Bottleneck" description="Payment-related tickets are taking 28% longer than SLA target. Consider additional training or staffing." confidence={87} />
            <InsightCard type="recommendation" title="Workload Imbalance" description="Facilities team workload is 67% higher than other departments. Recommend cross-training." confidence={94} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function KPICard({
  label,
  value,
  icon: Icon,
  trend,
  trendUp,
  accent,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  trend?: string;
  trendUp?: boolean;
  accent: "violet" | "sky" | "rose" | "amber" | "emerald" | "indigo";
}) {
  const colors = {
    violet: "from-violet-500/10 to-violet-500/5 text-violet-600 dark:text-violet-400",
    sky: "from-sky-500/10 to-sky-500/5 text-sky-600 dark:text-sky-400",
    rose: "from-rose-500/10 to-rose-500/5 text-rose-600 dark:text-rose-400",
    amber: "from-amber-500/10 to-amber-500/5 text-amber-600 dark:text-amber-400",
    emerald: "from-emerald-500/10 to-emerald-500/5 text-emerald-600 dark:text-emerald-400",
    indigo: "from-indigo-500/10 to-indigo-500/5 text-indigo-600 dark:text-indigo-400",
  };
  return (
    <div className="iris-card p-3 relative overflow-hidden group hover:scale-[1.01] transition-transform">
      <div className={cn("absolute inset-0 bg-gradient-to-br opacity-50", colors[accent])} />
      <div className="relative">
        <div className="flex items-center justify-between mb-1.5">
          <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{label}</div>
          <Icon className={cn("w-3.5 h-3.5", colors[accent].split(" ").pop())} />
        </div>
        <div className="text-2xl font-bold tabular-nums iris-ticker">{value}</div>
        {trend && (
          <div className={cn("text-[10px] font-medium mt-1 flex items-center gap-0.5", trendUp ? "text-emerald-500" : "text-rose-500")}>
            {trendUp ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
            {trend} vs last week
          </div>
        )}
      </div>
    </div>
  );
}

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("iris-card overflow-hidden", className)}>{children}</div>;
}

export function CardHeader({
  title,
  subtitle,
  icon: Icon,
  action,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ComponentType<{ className?: string }>;
  action?: React.ReactNode;
}) {
  return (
    <div className="px-4 py-3 border-b border-border flex items-center gap-3">
      {Icon && (
        <div className="w-7 h-7 rounded-lg bg-violet-500/10 flex items-center justify-center">
          <Icon className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-semibold leading-tight">{title}</div>
        {subtitle && <div className="text-[11px] text-muted-foreground mt-0.5 truncate">{subtitle}</div>}
      </div>
      {action}
    </div>
  );
}

export function CardContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("p-4", className)}>{children}</div>;
}

function InsightCard({
  type,
  title,
  description,
  confidence,
}: {
  type: "pattern" | "bottleneck" | "recommendation";
  title: string;
  description: string;
  confidence: number;
}) {
  const icons = { pattern: TrendingUp, bottleneck: AlertTriangle, recommendation: Sparkles };
  const colors = { pattern: "text-violet-500 bg-violet-500/10", bottleneck: "text-amber-500 bg-amber-500/10", recommendation: "text-emerald-500 bg-emerald-500/10" };
  const Icon = icons[type];
  return (
    <div className="p-3 rounded-lg border border-border bg-card hover:border-violet-500/30 transition-colors">
      <div className="flex items-start gap-2 mb-2">
        <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0", colors[type])}>
          <Icon className="w-3.5 h-3.5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[12px] font-semibold leading-tight">{title}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wider font-medium">{type}</div>
        </div>
      </div>
      <p className="text-[12px] text-muted-foreground leading-relaxed mb-2">{description}</p>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full" style={{ width: `${confidence}%` }} />
        </div>
        <span className="text-[10px] font-semibold tabular-nums text-muted-foreground">{confidence}%</span>
      </div>
    </div>
  );
}

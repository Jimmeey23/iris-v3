"use client";

import * as React from "react";
import { useAppStore } from "@/lib/iris/store";
import { ALL_TICKETS, getAssignee, getStudio, getDepartment } from "@/lib/iris/sample-tickets";
import { EMPLOYEES, DEPARTMENTS, STUDIOS } from "@/lib/iris/types";
import { PriorityBadge, StatusBadge, SLABadge } from "../badges";
import { formatRelativeTime } from "@/lib/iris/utils";
import { cn } from "@/lib/utils";
import {
  Ticket as TicketIcon,
  AlertTriangle,
  Clock,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Activity,
  Building2,
  Sparkles,
  ArrowRight,
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
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

const CHART_COLORS = ["#6366f1", "#06b6d4", "#f59e0b", "#ec4899", "#10b981", "#8b5cf6", "#f43f5e", "#84cc16"];

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
    <div className="p-8 max-w-[1400px] mx-auto space-y-6">
      {/* Hero Section - Premium animated design */}
      <div className="relative overflow-hidden rounded-2xl border border-border p-8 iris-fade-in-up" style={{ background: "linear-gradient(135deg, rgba(0,131,255,0.08) 0%, rgba(0,131,255,0.02) 50%, transparent 100%)" }}>
        {/* Animated background orbs */}
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-20" style={{ background: "radial-gradient(circle, #0083ff, transparent 70%)", animation: "iris-orb-1 8s ease-in-out infinite" }} />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 rounded-full opacity-10" style={{ background: "radial-gradient(circle, #00d4aa, transparent 70%)", animation: "iris-orb-2 10s ease-in-out infinite" }} />
        {/* Grid pattern */}
        <div className="absolute inset-0 iris-grid-bg opacity-20" />

        <div className="relative flex items-center justify-between flex-wrap gap-6">
          <div className="flex-1 min-w-[300px]">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground mb-3">
              <span className="iris-live-dot" />
              Operations Overview - Live
            </div>
            <h1 className="text-[32px] font-bold tracking-tight leading-tight">
              Welcome back, <span className="iris-text-gradient">{currentUser.name.split(" ")[0]}</span>
            </h1>
            <p className="text-[14px] text-muted-foreground mt-2 max-w-md">
              Here's what's happening across all Physique 57 India studios today.
            </p>
            <div className="flex items-center gap-3 mt-5">
              <button
                onClick={() => setCurrentView("ai_assistant")}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-[13px] font-medium transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Ask IRIS
              </button>
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-card/80 backdrop-blur text-[11px] font-medium">
                <Timer className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">SLA</span>
                <span className="font-bold tabular-nums text-primary">{slaCompliance}%</span>
              </div>
              {/* Mini stats */}
              <div className="hidden sm:flex items-center gap-3 px-3 py-2 rounded-xl border border-border bg-card/80 backdrop-blur">
                <div className="text-center">
                  <div className="text-[14px] font-bold tabular-nums">{stats.open}</div>
                  <div className="text-[8px] text-muted-foreground uppercase tracking-wider">Open</div>
                </div>
                <div className="w-px h-8 bg-border" />
                <div className="text-center">
                  <div className="text-[14px] font-bold tabular-nums text-amber-500">{stats.critical}</div>
                  <div className="text-[8px] text-muted-foreground uppercase tracking-wider">Critical</div>
                </div>
                <div className="w-px h-8 bg-border" />
                <div className="text-center">
                  <div className="text-[14px] font-bold tabular-nums text-emerald-500">{stats.resolved}</div>
                  <div className="text-[8px] text-muted-foreground uppercase tracking-wider">Resolved</div>
                </div>
              </div>
            </div>
          </div>
          {/* Animated circular progress */}
          <div className="relative shrink-0" style={{ width: 140, height: 140 }}>
            <svg width="140" height="140" viewBox="0 0 140 140">
              <circle cx="70" cy="70" r="58" fill="none" stroke="var(--border)" strokeWidth="3" />
              <circle
                cx="70" cy="70" r="58" fill="none" stroke="var(--primary)" strokeWidth="3"
                strokeDasharray={`${(slaCompliance / 100) * 364} 364`}
                strokeLinecap="round"
                transform="rotate(-90 70 70)"
                style={{ animation: "iris-hero-ring 1.5s cubic-bezier(0.16, 1, 0.3, 1)", filter: "drop-shadow(0 0 6px rgba(0,131,255,0.3))" }}
              />
              {/* Inner rotating ring */}
              <circle cx="70" cy="70" r="48" fill="none" stroke="var(--primary)" strokeWidth="1" opacity="0.15" strokeDasharray="4 8" style={{ animation: "iris-hero-rotate 30s linear infinite", transformOrigin: "70px 70px" }} />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center flex-col">
              <span className="text-[28px] font-bold tabular-nums">{stats.total}</span>
              <span className="text-[9px] text-muted-foreground uppercase tracking-wider font-medium">Total Tickets</span>
            </div>
            <style>{`
              @keyframes iris-hero-ring { from { stroke-dashoffset: 364; } to { stroke-dashoffset: 0; } }
              @keyframes iris-hero-rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
              @keyframes iris-orb-1 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-20px,20px) scale(1.1); } }
              @keyframes iris-orb-2 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(20px,-20px) scale(0.9); } }
            `}</style>
          </div>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
        <KPICard label="Total" value={stats.total} icon={TicketIcon} trend="+8%" trendUp />
        <KPICard label="Open" value={stats.open} icon={Activity} />
        <KPICard label="Critical" value={stats.critical} icon={Flame} />
        <KPICard label="Escalated" value={stats.escalated} icon={AlertTriangle} />
        <KPICard label="Overdue" value={stats.overdue} icon={Clock} />
        <KPICard label="Resolved" value={stats.resolved} icon={CheckCircle2} trend="+12%" trendUp />
        <KPICard label="My Queue" value={stats.myTickets} icon={Target} />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader title="Ticket Activity" subtitle="Daily creation vs resolution" icon={TrendingUp} />
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={trendData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="grad-created" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="grad-resolved" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.06} vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: "currentColor", opacity: 0.5 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "currentColor", opacity: 0.5 }} axisLine={false} tickLine={false} />
                <RTooltip
                  contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 11, color: "var(--popover-foreground)" }}
                />
                <Area type="monotone" dataKey="created" name="Created" stroke="var(--primary)" strokeWidth={1.5} fill="url(#grad-created)" />
                <Area type="monotone" dataKey="resolved" name="Resolved" stroke="#10b981" strokeWidth={1.5} fill="url(#grad-resolved)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Priority" subtitle="Active tickets" icon={Target} />
          <CardContent>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={priorityData} innerRadius={45} outerRadius={70} paddingAngle={2} dataKey="value">
                  {priorityData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <RTooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-1 mt-2">
              {priorityData.map((p) => (
                <div key={p.name} className="flex items-center gap-1.5 text-[11px]">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: p.color }} />
                  <span className="text-muted-foreground flex-1">{p.name}</span>
                  <span className="font-semibold tabular-nums">{p.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Studio + Department */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader title="Studio Performance" subtitle="Tickets by studio" icon={Building2} />
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={studioData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.06} vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "currentColor", opacity: 0.5 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "currentColor", opacity: 0.5 }} axisLine={false} tickLine={false} />
                <RTooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 11 }} cursor={{ fill: "currentColor", fillOpacity: 0.03 }} />
                <Bar dataKey="tickets" name="Total" fill="var(--primary)" radius={[4, 4, 0, 0]} barSize={24} />
                <Bar dataKey="resolved" name="Resolved" fill="#10b981" radius={[4, 4, 0, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Department Load" subtitle="Top by workload" icon={Activity} />
          <CardContent>
            <div className="space-y-2.5">
              {deptData.map((d, i) => (
                <div key={d.name}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-[12px] font-medium truncate">{d.dept}</div>
                    <div className="text-[11px] font-semibold tabular-nums text-muted-foreground">{d.workload}</div>
                  </div>
                  <div className="h-1 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${(d.workload / deptData[0].workload) * 100}%`,
                        background: i === 0 ? "var(--primary)" : CHART_COLORS[i % CHART_COLORS.length],
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Critical + Recent */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader
            title="Critical & Overdue"
            subtitle={`${criticalTickets.length} tickets need attention`}
            icon={Flame}
            action={
              <button onClick={() => setCurrentView("escalations")} className="text-[11px] font-medium text-primary flex items-center gap-0.5 hover:gap-1 transition-all">
                View all <ChevronRight className="w-3 h-3" />
              </button>
            }
          />
          <CardContent className="space-y-1.5 max-h-[320px] overflow-y-auto">
            {criticalTickets.map((t) => {
              const assignee = getAssignee(t);
              return (
                <button
                  key={t.id}
                  onClick={() => { selectTicket(t.id); setCurrentView("all_tickets"); }}
                  className="w-full text-left p-2.5 rounded-lg border border-border hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <PriorityBadge priority={t.priority} />
                    <SLABadge status={t.slaStatus} targetDate={t.slaResolutionTarget} />
                    <span className="text-[10px] font-mono text-muted-foreground ml-auto">{t.ticketId}</span>
                  </div>
                  <div className="text-[12px] font-medium leading-snug line-clamp-2">{t.title}</div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-1.5">
                    {assignee && <span>{assignee.name}</span>}
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
            subtitle="Latest tickets"
            icon={Clock}
            action={
              <button onClick={() => setCurrentView("all_tickets")} className="text-[11px] font-medium text-primary flex items-center gap-0.5 hover:gap-1 transition-all">
                View all <ChevronRight className="w-3 h-3" />
              </button>
            }
          />
          <CardContent className="space-y-1.5 max-h-[320px] overflow-y-auto">
            {recentTickets.map((t) => (
              <button
                key={t.id}
                onClick={() => { selectTicket(t.id); setCurrentView("all_tickets"); }}
                className="w-full text-left p-2.5 rounded-lg border border-border hover:border-primary/30 transition-colors"
              >
                <div className="flex items-center gap-2 mb-1">
                  <PriorityBadge priority={t.priority} size="xs" />
                  <StatusBadge status={t.status} size="xs" />
                  <span className="text-[10px] font-mono text-muted-foreground ml-auto">{t.ticketId}</span>
                </div>
                <div className="text-[12px] font-medium leading-snug line-clamp-1">{t.title}</div>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-1">
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

      {/* AI Insights */}
      <Card className="iris-ai-border">
        <CardHeader
          title="AI Insights"
          subtitle="Generated by IRIS Intelligence"
          icon={Brain}
          action={<Sparkles className="w-4 h-4 text-primary" />}
        />
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <InsightCard type="pattern" title="Recurring HVAC Issues" description="Kwality House has reported 3 AC issues in 6 weeks. Preventive maintenance recommended." confidence={92} />
            <InsightCard type="bottleneck" title="Resolution Bottleneck" description="Payment tickets taking 28% longer than SLA. Consider automating verification." confidence={87} />
            <InsightCard type="recommendation" title="Workload Imbalance" description="Facilities team at 67% capacity. Cross-training could reduce load by ~20%." confidence={94} />
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
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  trend?: string;
  trendUp?: boolean;
}) {
  return (
    <div className="iris-card p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{label}</div>
        <Icon className="w-3.5 h-3.5 text-muted-foreground" />
      </div>
      <div className="text-[20px] font-semibold tabular-nums iris-ticker">{value}</div>
      {trend && (
        <div className={cn("text-[10px] font-medium mt-0.5 flex items-center gap-0.5", trendUp ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
          {trendUp ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
          {trend}
        </div>
      )}
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
    <div className="px-4 py-3 border-b border-border flex items-center gap-2.5">
      {Icon && (
        <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center">
          <Icon className="w-3.5 h-3.5 text-muted-foreground" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-semibold leading-tight">{title}</div>
        {subtitle && <div className="text-[10px] text-muted-foreground mt-0.5 truncate">{subtitle}</div>}
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
  const colors = {
    pattern: "text-primary",
    bottleneck: "text-amber-500",
    recommendation: "text-emerald-500",
  };
  const Icon = icons[type];
  return (
    <div className="p-3 rounded-lg border border-border">
      <div className="flex items-start gap-2 mb-2">
        <div className={cn("w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0")}>
          <Icon className={cn("w-3.5 h-3.5", colors[type])} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[12px] font-semibold leading-tight">{title}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wider font-medium">{type}</div>
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground leading-relaxed mb-2">{description}</p>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-primary rounded-full" style={{ width: `${confidence}%` }} />
        </div>
        <span className="text-[10px] font-semibold tabular-nums text-muted-foreground">{confidence}%</span>
      </div>
    </div>
  );
}

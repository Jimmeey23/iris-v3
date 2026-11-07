"use client";

import * as React from "react";
import { useAppStore } from "@/lib/iris/store";
import { ALL_TICKETS, getAssignee, getStudio, getDepartment } from "@/lib/iris/sample-tickets";
import { EMPLOYEES, DEPARTMENTS, STUDIOS } from "@/lib/iris/types";
import { PriorityBadge, StatusBadge, SLABadge } from "../badges";
import { formatRelativeTime } from "@/lib/iris/utils";
import { cn } from "@/lib/utils";
import {
  Ticket as TicketIcon, AlertTriangle, Clock, CheckCircle2, TrendingUp, TrendingDown,
  Activity, Building2, Sparkles, ArrowRight, Brain, Timer, Target, Flame, ChevronRight,
  Zap, Shield, Cpu, Radio, Gauge, Layers, Users, Star,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";

const CHART_COLORS = ["#007bff", "#00d4aa", "#ff9500", "#af52de", "#10b981", "#6366f1", "#f43f5e", "#84cc16"];

export function OverviewView() {
  const { setCurrentView, selectTicket, currentUser } = useAppStore();
  const [activeFeature, setActiveFeature] = React.useState(0);

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
    return days.map((d, i) => ({ day: d, created: 12 + i * 2, resolved: 10 + i * 2 - 1 }));
  }, []);

  const priorityData = React.useMemo(() => {
    const counts: Record<string, number> = { P0: 0, P1: 0, P2: 0, P3: 0 };
    ALL_TICKETS.forEach((t) => (counts[t.priority] = (counts[t.priority] || 0) + 1));
    return [
      { name: "P0", value: counts.P0, color: "#f43f5e" },
      { name: "P1", value: counts.P1, color: "#ff9500" },
      { name: "P2", value: counts.P2, color: "#06b6d4" },
      { name: "P3", value: counts.P3, color: "#10b981" },
    ];
  }, []);

  const studioData = React.useMemo(() => {
    return STUDIOS.map((s) => ({
      name: s.name.split(" ")[0], studio: s.name,
      tickets: ALL_TICKETS.filter((t) => t.studioCode === s.code).length,
      resolved: ALL_TICKETS.filter((t) => t.studioCode === s.code && (t.status === "resolved" || t.status === "closed")).length,
    }));
  }, []);

  const deptData = React.useMemo(() => {
    return DEPARTMENTS.map((d) => ({ name: d.code, dept: d.name, workload: ALL_TICKETS.filter((t) => t.departmentCode === d.code).length }))
      .sort((a, b) => b.workload - a.workload).slice(0, 6);
  }, []);

  const slaCompliance = 87.5;

  const recentTickets = React.useMemo(() => [...ALL_TICKETS].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 6), []);
  const criticalTickets = React.useMemo(() => ALL_TICKETS.filter((t) => t.priority === "P0" || t.slaStatus === "breached").slice(0, 4), []);

  // Auto-rotate features
  React.useEffect(() => {
    const timer = setInterval(() => setActiveFeature(p => (p + 1) % 4), 4000);
    return () => clearInterval(timer);
  }, []);

  const features = [
    { icon: Sparkles, label: "AI Assistant", desc: "Multi-agent conversation", view: "ai_assistant" as const, color: "#007bff" },
    { icon: BarChart3, label: "Analytics", desc: "Deep operational insights", view: "analytics" as const, color: "#00d4aa" },
    { icon: Layers, label: "Templates", desc: "110+ pre-configured", view: "templates" as const, color: "#ff9500" },
    { icon: Zap, label: "Automation", desc: "Smart routing & SLA", view: "escalations" as const, color: "#af52de" },
  ];

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-5">
      {/* === HERO SECTION === */}
      <div className="relative overflow-hidden rounded-2xl border border-border iris-fade-in-up" style={{ minHeight: 200 }}>
        {/* Animated gradient background */}
        <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(0,123,255,0.10) 0%, rgba(0,212,170,0.05) 40%, transparent 70%)" }} />
        {/* Floating orbs */}
        <div className="absolute -top-20 -right-10 w-80 h-80 rounded-full opacity-25" style={{ background: "radial-gradient(circle, #007bff, transparent 65%)", animation: "hero-orb-a 8s ease-in-out infinite" }} />
        <div className="absolute -bottom-20 left-20 w-60 h-60 rounded-full opacity-15" style={{ background: "radial-gradient(circle, #00d4aa, transparent 65%)", animation: "hero-orb-b 10s ease-in-out infinite" }} />
        {/* Grid pattern */}
        <div className="absolute inset-0 iris-grid-bg opacity-15" />
        {/* Floating icons */}
        <TicketIcon className="absolute top-8 right-32 w-5 h-5 text-primary/15" style={{ animation: "hero-float 6s ease-in-out infinite" }} />
        <Activity className="absolute top-16 right-48 w-4 h-4 text-primary/10" style={{ animation: "hero-float 7s ease-in-out infinite 1s" }} />
        <Shield className="absolute bottom-12 right-24 w-4 h-4 text-primary/10" style={{ animation: "hero-float 5s ease-in-out infinite 0.5s" }} />
        <Cpu className="absolute top-24 left-1/2 w-4 h-4 text-primary/10" style={{ animation: "hero-float 8s ease-in-out infinite 2s" }} />

        <div className="relative p-6 flex items-start justify-between flex-wrap gap-4">
          {/* Left: Welcome + stats */}
          <div className="flex-1 min-w-[280px]">
            <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground mb-2">
              <span className="iris-live-dot" />
              Operations Overview - Live
            </div>
            <h1 className="text-[26px] font-bold tracking-tight leading-tight">
              Welcome back, <span className="iris-text-gradient">{currentUser.name.split(" ")[0]}</span>
            </h1>
            <p className="text-[12px] text-muted-foreground mt-1 max-w-sm">
              Here's what's happening across all Physique 57 India studios today.
            </p>
            {/* Inline stats */}
            <div className="flex items-center gap-2 mt-3">
              <button onClick={() => setCurrentView("ai_assistant")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-[11px] font-medium transition-transform hover:scale-[1.03] active:scale-[0.97]">
                <Sparkles className="w-3 h-3" /> Ask IRIS
              </button>
              <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-border bg-card/80 backdrop-blur text-[10px] font-medium">
                <Timer className="w-3 h-3 text-muted-foreground" />
                <span className="text-muted-foreground">SLA</span>
                <span className="font-bold tabular-nums text-primary">{slaCompliance}%</span>
              </div>
              <div className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-border bg-card/80 backdrop-blur">
                <span className="text-[12px] font-bold tabular-nums">{stats.open}</span>
                <span className="text-[8px] text-muted-foreground uppercase">Open</span>
                <div className="w-px h-5 bg-border" />
                <span className="text-[12px] font-bold tabular-nums text-amber-500">{stats.critical}</span>
                <span className="text-[8px] text-muted-foreground uppercase">Critical</span>
                <div className="w-px h-5 bg-border" />
                <span className="text-[12px] font-bold tabular-nums text-emerald-500">{stats.resolved}</span>
                <span className="text-[8px] text-muted-foreground uppercase">Resolved</span>
              </div>
            </div>
          </div>

          {/* Right: Interactive feature control display */}
          <div className="flex items-center gap-1.5 shrink-0">
            {features.map((f, i) => (
              <button
                key={i}
                onClick={() => { setActiveFeature(i); setCurrentView(f.view); }}
                className={cn(
                  "relative flex flex-col items-center justify-center w-16 h-16 rounded-xl border transition-all duration-300",
                  activeFeature === i ? "border-transparent scale-110" : "border-border bg-card/60 hover:bg-card"
                )}
                style={activeFeature === i ? { background: `${f.color}15`, borderColor: `${f.color}40`, boxShadow: `0 4px 16px -4px ${f.color}40` } : undefined}
              >
                <f.icon className="w-4 h-4 mb-1 transition-colors" style={{ color: activeFeature === i ? f.color : undefined }} />
                <span className="text-[8px] font-medium text-center leading-none">{f.label}</span>
                {activeFeature === i && (
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full" style={{ background: f.color }} />
                )}
              </button>
            ))}
            {/* Circular SLA indicator */}
            <div className="relative ml-2 shrink-0" style={{ width: 72, height: 72 }}>
              <svg width="72" height="72" viewBox="0 0 72 72">
                <circle cx="36" cy="36" r="30" fill="none" stroke="var(--border)" strokeWidth="2.5" />
                <circle cx="36" cy="36" r="30" fill="none" stroke="var(--primary)" strokeWidth="2.5"
                  strokeDasharray={`${(slaCompliance / 100) * 188} 188`} strokeLinecap="round"
                  transform="rotate(-90 36 36)"
                  style={{ animation: "hero-ring 1.5s cubic-bezier(0.16,1,0.3,1)", filter: "drop-shadow(0 0 4px rgba(0,123,255,0.4))" }}
                />
                <circle cx="36" cy="36" r="24" fill="none" stroke="var(--primary)" strokeWidth="0.5" opacity="0.2" strokeDasharray="2 4"
                  style={{ animation: "hero-rotate 20s linear infinite", transformOrigin: "36px 36px" }} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[16px] font-bold tabular-nums">{stats.total}</span>
                <span className="text-[7px] text-muted-foreground uppercase tracking-wider">Tickets</span>
              </div>
            </div>
          </div>
        </div>

        {/* Active feature description bar */}
        <div className="relative px-6 pb-3 flex items-center gap-2">
          <Radio className="w-3 h-3" style={{ color: features[activeFeature].color, animation: "hero-pulse 2s ease-in-out infinite" }} />
          <span className="text-[10px] text-muted-foreground">{features[activeFeature].label}: {features[activeFeature].desc}</span>
          <span className="text-muted-foreground/40">-</span>
          <span className="text-[10px] text-muted-foreground">Click any icon to navigate</span>
        </div>

        <style>{`
          @keyframes hero-ring { from { stroke-dashoffset: 188; } to { stroke-dashoffset: 0; } }
          @keyframes hero-rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          @keyframes hero-orb-a { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-15px,15px) scale(1.1); } }
          @keyframes hero-orb-b { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(15px,-15px) scale(0.9); } }
          @keyframes hero-float { 0%,100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-8px) rotate(5deg); } }
          @keyframes hero-pulse { 0%,100% { opacity: 0.6; } 50% { opacity: 1; } }
        `}</style>
      </div>

      {/* === MARQUEE STRIP 1 - Live operations === */}
      <MarqueeStrip items={[
        `${stats.total} total tickets`,
        `${stats.open} currently open`,
        `${stats.critical} critical`,
        `${stats.resolved} resolved`,
        `SLA compliance ${slaCompliance}%`,
        `${EMPLOYEES.length} team members`,
        `${STUDIOS.length} studios`,
        `${stats.escalated} escalated`,
      ]} icon={Activity} color="#007bff" />

      {/* === METRIC CARDS with flip + tooltips + sparklines === */}
      <TooltipProvider delayDuration={300}>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
          <MetricCard label="Total" value={stats.total} icon={TicketIcon} trend="+8%" trendUp tooltip="All tickets across all studios" sparkData={trendData.map(d => d.created)} color="#007bff" />
          <MetricCard label="Open" value={stats.open} icon={Activity} tooltip="Tickets not yet resolved" sparkData={trendData.map(d => d.created - d.resolved)} color="#06b6d4" />
          <MetricCard label="Critical" value={stats.critical} icon={Flame} tooltip="P0 priority tickets requiring immediate attention" sparkData={[3,4,5,6,4,3,5]} color="#f43f5e" />
          <MetricCard label="Escalated" value={stats.escalated} icon={AlertTriangle} tooltip="Tickets that have been escalated to management" sparkData={[1,2,1,3,2,1,2]} color="#ff9500" />
          <MetricCard label="Overdue" value={stats.overdue} icon={Clock} tooltip="Tickets with breached SLA deadlines" sparkData={[0,1,2,1,0,1,2]} color="#f43f5e" />
          <MetricCard label="Resolved" value={stats.resolved} icon={CheckCircle2} trend="+12%" trendUp tooltip="Tickets resolved or closed" sparkData={trendData.map(d => d.resolved)} color="#10b981" />
          <MetricCard label="My Queue" value={stats.myTickets} icon={Target} tooltip="Tickets assigned to you" sparkData={[2,3,2,4,3,2,3]} color="#007bff" />
        </div>
      </TooltipProvider>

      {/* === MARQUEE STRIP 2 - Studio status === */}
      <MarqueeStrip items={[
        ...STUDIOS.map(s => `${s.name}: ${ALL_TICKETS.filter(t => t.studioCode === s.code).length} tickets`),
        ...DEPARTMENTS.slice(0, 5).map(d => `${d.name}: ${ALL_TICKETS.filter(t => t.departmentCode === d.code).length} active`),
      ]} icon={Building2} color="#00d4aa" />

      {/* === Charts Row === */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Ticket Activity" subtitle="Daily creation vs resolution" icon={TrendingUp} />
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={trendData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="grad-created" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#007bff" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#007bff" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="grad-resolved" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00d4aa" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#00d4aa" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.06} vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: "currentColor", opacity: 0.5 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "currentColor", opacity: 0.5 }} axisLine={false} tickLine={false} />
                <RTooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 11 }} />
                <Area type="monotone" dataKey="created" name="Created" stroke="#007bff" strokeWidth={1.5} fill="url(#grad-created)" />
                <Area type="monotone" dataKey="resolved" name="Resolved" stroke="#00d4aa" strokeWidth={1.5} fill="url(#grad-resolved)" />
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
                  {priorityData.map((entry, idx) => <Cell key={idx} fill={entry.color} stroke="none" />)}
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

      {/* === Studio + Department === */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Studio Performance" subtitle="Tickets by studio" icon={Building2} />
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={studioData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.06} vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "currentColor", opacity: 0.5 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "currentColor", opacity: 0.5 }} axisLine={false} tickLine={false} />
                <RTooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 11 }} cursor={{ fill: "currentColor", fillOpacity: 0.03 }} />
                <Bar dataKey="tickets" name="Total" fill="#007bff" radius={[4, 4, 0, 0]} barSize={24} />
                <Bar dataKey="resolved" name="Resolved" fill="#00d4aa" radius={[4, 4, 0, 0]} barSize={24} />
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
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${(d.workload / deptData[0].workload) * 100}%`, background: i === 0 ? "var(--primary)" : CHART_COLORS[i % CHART_COLORS.length] }} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* === Critical + Recent === */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card>
          <CardHeader title="Critical & Overdue" subtitle={`${criticalTickets.length} need attention`} icon={Flame}
            action={<button onClick={() => setCurrentView("escalations")} className="text-[11px] font-medium text-primary flex items-center gap-0.5 hover:gap-1 transition-all">View all <ChevronRight className="w-3 h-3" /></button>} />
          <CardContent className="space-y-1.5 max-h-[320px] overflow-y-auto">
            {criticalTickets.map((t) => {
              const assignee = getAssignee(t);
              return (
                <button key={t.id} onClick={() => { selectTicket(t.id); setCurrentView("all_tickets"); }}
                  className="w-full text-left p-2.5 rounded-lg border border-border hover:border-primary/30 transition-colors">
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
          <CardHeader title="Recent Activity" subtitle="Latest tickets" icon={Clock}
            action={<button onClick={() => setCurrentView("all_tickets")} className="text-[11px] font-medium text-primary flex items-center gap-0.5 hover:gap-1 transition-all">View all <ChevronRight className="w-3 h-3" /></button>} />
          <CardContent className="space-y-1.5 max-h-[320px] overflow-y-auto">
            {recentTickets.map((t) => (
              <button key={t.id} onClick={() => { selectTicket(t.id); setCurrentView("all_tickets"); }}
                className="w-full text-left p-2.5 rounded-lg border border-border hover:border-primary/30 transition-colors">
                <div className="flex items-center gap-2 mb-1">
                  <PriorityBadge priority={t.priority} size="xs" />
                  <StatusBadge status={t.status} size="xs" />
                  <span className="text-[10px] font-mono text-muted-foreground ml-auto">{t.ticketId}</span>
                </div>
                <div className="text-[12px] font-medium leading-snug line-clamp-1">{t.title}</div>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-1">
                  <span>{getStudio(t)?.name}</span><span>-</span>
                  <span>{getDepartment(t)?.name}</span>
                  <span className="ml-auto">{formatRelativeTime(t.createdAt)}</span>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* === MARQUEE STRIP 3 - AI insights === */}
      <MarqueeStrip items={[
        "AI: HVAC pattern detected at Kwality House",
        "AI: Payment resolution 28% over SLA target",
        "AI: Facilities team workload at 67% capacity",
        "AI: 34% of freeze requests auto-resolvable",
        "AI: Bengaluru check-in errors 3x higher",
        "AI: Org average trainer score 82%",
      ]} icon={Brain} color="#af52de" />

      {/* AI Insights */}
      <Card className="iris-ai-border">
        <CardHeader title="AI Insights" subtitle="Generated by IRIS Intelligence" icon={Brain} action={<Sparkles className="w-4 h-4 text-primary" />} />
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

// === METRIC CARD with flip, tooltip, sparkline, floating icon ===
function MetricCard({
  label, value, icon: Icon, trend, trendUp, tooltip, sparkData, color,
}: {
  label: string; value: number; icon: React.ComponentType<{ className?: string }>;
  trend?: string; trendUp?: boolean; tooltip: string; sparkData: number[]; color: string;
}) {
  const [hovered, setHovered] = React.useState(false);
  const max = Math.max(...sparkData, 1);
  const sparkPoints = sparkData.map((v, i) => `${(i / (sparkData.length - 1)) * 100},${30 - (v / max) * 25}`).join(" ");

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className="iris-card p-3 relative overflow-hidden cursor-pointer transition-all"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{ transform: hovered ? "translateY(-2px)" : undefined }}
        >
          {/* Floating background icon */}
          <Icon className="absolute -top-1 -right-1 w-8 h-8 opacity-5" style={{ color, animation: hovered ? "metric-float 2s ease-in-out" : undefined }} />
          {/* Sparkline */}
          <svg className="absolute bottom-0 left-0 w-full h-8 opacity-30" viewBox="0 0 100 30" preserveAspectRatio="none">
            <polyline points={sparkPoints} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {/* Content */}
          <div className="relative">
            <div className="flex items-center justify-between mb-1">
              <div className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider">{label}</div>
              <Icon className="w-3 h-3" style={{ color }} />
            </div>
            <div className="text-[18px] font-bold tabular-nums iris-ticker">{value}</div>
            {trend && (
              <div className={cn("text-[9px] font-medium mt-0.5 flex items-center gap-0.5", trendUp ? "text-emerald-500" : "text-rose-500")}>
                {trendUp ? <TrendingUp className="w-2 h-2" /> : <TrendingDown className="w-2 h-2" />}
                {trend}
              </div>
            )}
          </div>
          <style>{`@keyframes metric-float { 0%,100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-4px) rotate(8deg); } }`}</style>
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-[11px]">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}

// === MARQUEE STRIP ===
function MarqueeStrip({ items, icon: Icon, color }: { items: string[]; icon: React.ComponentType<{ className?: string }>; color: string }) {
  // Duplicate items for seamless loop
  const doubled = [...items, ...items];
  return (
    <div className="relative overflow-hidden rounded-lg border border-border bg-card/50 py-1.5">
      <div className="flex items-center gap-4 whitespace-nowrap" style={{ animation: "marquee-scroll 30s linear infinite" }}>
        {doubled.map((item, i) => (
          <React.Fragment key={i}>
            <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
              <Icon className="w-2.5 h-2.5 shrink-0" style={{ color }} />
              {item}
            </div>
            <span className="text-muted-foreground/20">|</span>
          </React.Fragment>
        ))}
      </div>
      <style>{`@keyframes marquee-scroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }`}</style>
    </div>
  );
}

// === SHARED COMPONENTS ===
function BarChart3({ className }: { className?: string }) { return <Activity className={className} />; }

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("iris-card overflow-hidden", className)}>{children}</div>;
}

export function CardHeader({ title, subtitle, icon: Icon, action }: { title: string; subtitle?: string; icon?: React.ComponentType<{ className?: string }>; action?: React.ReactNode }) {
  return (
    <div className="px-4 py-2.5 border-b border-border flex items-center gap-2">
      {Icon && <div className="w-6 h-6 rounded-md bg-muted flex items-center justify-center"><Icon className="w-3 h-3 text-muted-foreground" /></div>}
      <div className="flex-1 min-w-0">
        <div className="text-[12px] font-semibold leading-tight">{title}</div>
        {subtitle && <div className="text-[10px] text-muted-foreground mt-0.5 truncate">{subtitle}</div>}
      </div>
      {action}
    </div>
  );
}

export function CardContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("p-3", className)}>{children}</div>;
}

function InsightCard({ type, title, description, confidence }: { type: "pattern" | "bottleneck" | "recommendation"; title: string; description: string; confidence: number }) {
  const icons = { pattern: TrendingUp, bottleneck: AlertTriangle, recommendation: Sparkles };
  const colors = { pattern: "text-primary", bottleneck: "text-amber-500", recommendation: "text-emerald-500" };
  const Icon = icons[type];
  return (
    <div className="p-3 rounded-lg border border-border">
      <div className="flex items-start gap-2 mb-2">
        <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0">
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

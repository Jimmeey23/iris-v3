"use client";

import * as React from "react";
import { useAppStore } from "@/lib/iris/store";
import { ALL_TICKETS, isOwner, getAssignee, getStudio, getDepartment } from "@/lib/iris/sample-tickets";
import { EMPLOYEES, DEPARTMENTS, STUDIOS } from "@/lib/iris/types";
import { PriorityBadge, StatusBadge, SLABadge } from "../badges";
import { SmartBadges } from "../smart-badges";
import { RelativeTime } from "../relative-time";
import { PremiumMetricCard } from "../premium-metric-card";
import { DailyBriefing } from "../daily-briefing";
import { AnomalyFeed } from "../anomaly-feed";
import { MetricDrilldown, METRICS, dailySeries, weekTrend, type MetricId } from "../metric-drilldown";
import { IssueHotspots } from "../issue-hotspots";

const DONE = new Set(["resolved", "closed"]);
import { cn } from "@/lib/utils";
import {
  Ticket as TicketIcon, AlertTriangle, Clock, CheckCircle2, TrendingUp,
  Activity, Building2, Sparkles, ArrowRight, Brain, Timer, Target, Flame, ChevronRight,
  Layers, Gauge, Users, Star, Zap, Shield, Cpu, Radio,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

const CHART_COLORS = ["#007bff", "#00d4aa", "#ff9500", "#af52de", "#10b981", "#6366f1", "#f43f5e", "#84cc16"];

export function OverviewView() {
  const { setCurrentView, selectTicket, currentUser, dataVersion } = useAppStore();
  const [drill, setDrill] = React.useState<MetricId | null>(null);

  // Every number on this page comes from the live ticket list (ALL_TICKETS is hydrated in place).
  const live = React.useMemo(() => {
    void dataVersion;
    const list = [...ALL_TICKETS];
    const metric = (id: MetricId) => {
      const def = METRICS[id];
      const matching = list.filter((t) => def.match(t, currentUser.id));
      const series = dailySeries(matching, def, 14);
      return { value: matching.length, spark: series.slice(7), ...weekTrend(series) };
    };
    const day = 86400_000;
    const since30 = Date.now() - 30 * day;
    const resolved30 = list.filter((t) => t.resolvedAt && new Date(t.resolvedAt).getTime() >= since30 && t.slaResolutionTarget);
    const within = resolved30.filter((t) => new Date(t.resolvedAt!).getTime() <= new Date(t.slaResolutionTarget!).getTime()).length;
    const sla = resolved30.length ? Math.round((within / resolved30.length) * 1000) / 10 : null;
    const responded = list.filter((t) => t.firstResponseAt && new Date(t.createdAt).getTime() >= since30);
    const avgFirstResponseH = responded.length
      ? responded.reduce((n, t) => n + (new Date(t.firstResponseAt!).getTime() - new Date(t.createdAt).getTime()), 0) / responded.length / 3_600_000
      : null;
    const resolvedRecent = list.filter((t) => t.resolvedAt && new Date(t.resolvedAt).getTime() >= since30);
    const avgResolveH = resolvedRecent.length
      ? resolvedRecent.reduce((n, t) => n + (new Date(t.resolvedAt!).getTime() - new Date(t.createdAt).getTime()), 0) / resolvedRecent.length / 3_600_000
      : null;
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const trend = Array.from({ length: 14 }, (_, i) => {
      const from = start.getTime() - (13 - i) * day;
      const inDay = (d?: string | Date) => d && new Date(d).getTime() >= from && new Date(d).getTime() < from + day;
      return {
        day: new Date(from).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
        created: list.filter((t) => inDay(t.createdAt)).length,
        resolved: list.filter((t) => inDay(t.resolvedAt)).length,
      };
    });
    return {
      total: metric("total"), open: metric("open"), critical: metric("critical"), escalated: metric("escalated"),
      overdue: metric("overdue"), resolved: metric("resolved"), mine: metric("mine"),
      sla, slaSample: resolved30.length, avgFirstResponseH, avgResolveH, trend,
      resolved7: trend.slice(7).reduce((n, d) => n + d.resolved, 0),
      created7: trend.slice(7).reduce((n, d) => n + d.created, 0),
      unassignedOpen: list.filter((t) => !DONE.has(t.status) && !t.assigneeId).length,
    };
  }, [currentUser.id, dataVersion]);

  const stats = {
    open: live.open.value, critical: live.critical.value, resolved: live.resolved.value, escalated: live.escalated.value,
    overdue: live.overdue.value, myTickets: live.mine.value, total: live.total.value,
  };
  const trendData = live.trend;

  const priorityData = React.useMemo(() => {
    void dataVersion;
    const counts: Record<string, number> = { P0: 0, P1: 0, P2: 0, P3: 0 };
    ALL_TICKETS.filter((t) => !DONE.has(t.status)).forEach((t) => (counts[t.priority] = (counts[t.priority] || 0) + 1));
    return [
      { name: "P0", value: counts.P0, color: "#f43f5e" },
      { name: "P1", value: counts.P1, color: "#ff9500" },
      { name: "P2", value: counts.P2, color: "#06b6d4" },
      { name: "P3", value: counts.P3, color: "#10b981" },
    ];
  }, [dataVersion]);

  const studioData = React.useMemo(() => {
    void dataVersion;
    return STUDIOS.map((s) => ({
      name: s.name.split(" ")[0], studio: s.name,
      tickets: ALL_TICKETS.filter((t) => t.studioCode === s.code).length,
      resolved: ALL_TICKETS.filter((t) => t.studioCode === s.code && DONE.has(t.status)).length,
    }));
  }, [dataVersion]);

  const deptData = React.useMemo(() => {
    void dataVersion;
    return DEPARTMENTS.map((d) => ({ name: d.code, dept: d.name, workload: ALL_TICKETS.filter((t) => t.departmentCode === d.code && !DONE.has(t.status)).length }))
      .sort((a, b) => b.workload - a.workload).slice(0, 6);
  }, [dataVersion]);

  const slaCompliance = live.sla ?? 0;

  const recentTickets = React.useMemo(() => { void dataVersion; return [...ALL_TICKETS].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 6); }, [dataVersion]);
  const criticalTickets = React.useMemo(() => { void dataVersion; return ALL_TICKETS.filter((t) => !DONE.has(t.status) && (t.priority === "P0" || t.slaStatus === "breached")).slice(0, 6); }, [dataVersion]);

  const firstName = currentUser.name.split(" ")[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const narrative = [
    `${live.open.value} open ticket${live.open.value === 1 ? "" : "s"}`,
    live.overdue.value ? `${live.overdue.value} past SLA` : "none past SLA",
    live.unassignedOpen ? `${live.unassignedOpen} waiting for an owner` : null,
  ].filter(Boolean).join(" · ");
  const hours = (h: number | null) => (h === null ? "-" : h < 1 ? `${Math.round(h * 60)}m` : h < 48 ? `${h.toFixed(1)}h` : `${(h / 24).toFixed(1)}d`);

  const marqueeItems = React.useMemo(() => {
    void dataVersion;
    const open = ALL_TICKETS.filter((t) => !DONE.has(t.status));
    const busiest = STUDIOS.map((s) => ({ s, n: open.filter((t) => t.studioCode === s.code).length })).sort((a, b) => b.n - a.n)[0];
    const catCount = new Map<string, number>();
    for (const t of open) { const k = t.subcategory || t.category; if (k) catCount.set(k, (catCount.get(k) ?? 0) + 1); }
    const topCat = [...catCount.entries()].sort((a, b) => b[1] - a[1])[0];
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const raisedToday = ALL_TICKETS.filter((t) => new Date(t.createdAt) >= today).length;
    const resolvedToday = ALL_TICKETS.filter((t) => t.resolvedAt && new Date(t.resolvedAt) >= today).length;
    const items: { label: string; value: string; emphasize?: boolean }[] = [
      { label: "Open now", value: String(live.open.value), emphasize: true },
      { label: "Raised today", value: String(raisedToday) },
      { label: "Resolved today", value: String(resolvedToday) },
      { label: "Past SLA", value: String(live.overdue.value), emphasize: live.overdue.value > 0 },
      { label: "Critical open", value: String(live.critical.value), emphasize: live.critical.value > 0 },
      { label: "Unassigned", value: String(live.unassignedOpen) },
      { label: "SLA compliance", value: live.sla === null ? "-" : `${live.sla}%` },
      { label: "Avg resolution", value: hours(live.avgResolveH) },
    ];
    if (busiest?.n) items.splice(1, 0, { label: "Busiest studio", value: `${busiest.s.name.split(",")[0]} (${busiest.n})` });
    if (topCat) items.splice(2, 0, { label: "Top issue", value: `${topCat[0]} (${topCat[1]})` });
    return items;
  }, [dataVersion, live]);

  const nav = [
    { icon: Sparkles, label: "Ask IRIS", view: "ai_assistant" as const },
    { icon: TicketIcon, label: "Open tickets", view: "all_tickets" as const },
    { icon: BarChart3, label: "Analytics", view: "analytics" as const },
    { icon: Layers, label: "Templates", view: "templates" as const },
  ];

  const cards: { id: MetricId; icon: React.ComponentType<{ className?: string }>; caption: string; tooltip: string }[] = [
    { id: "total", icon: TicketIcon, caption: "raised · 7-day trend", tooltip: "All tickets across all studios" },
    { id: "open", icon: Activity, caption: "active queue", tooltip: "Tickets not yet resolved" },
    { id: "critical", icon: Flame, caption: "open P0", tooltip: "Open P0 tickets" },
    { id: "escalated", icon: AlertTriangle, caption: "open, escalated", tooltip: "Open tickets escalated past their first owner" },
    { id: "overdue", icon: Clock, caption: "open, SLA breached", tooltip: "Open tickets past their SLA target" },
    { id: "resolved", icon: CheckCircle2, caption: "resolved · 7-day trend", tooltip: "Tickets resolved or closed" },
    { id: "mine", icon: Target, caption: "open, yours", tooltip: "Open tickets you own" },
  ];

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-4">
      {/* === HERO === */}
      <section className="relative overflow-hidden rounded-2xl border border-border bg-white dark:bg-card iris-fade-in-up">
        {/* White base with a single faint accent wash (~12% at the corner, fading to white). */}
        <div className="pointer-events-none absolute inset-0" style={{ background: "linear-gradient(120deg, color-mix(in srgb, var(--primary) 12%, transparent) 0%, color-mix(in srgb, var(--primary) 4%, transparent) 45%, transparent 75%)" }} />

        <div className="relative grid lg:grid-cols-[minmax(0,1fr)_minmax(320px,400px)] lg:items-stretch">
          {/* Left */}
          <div className="min-w-0 px-6 py-4 sm:px-7 sm:py-4">
            <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
              <span className="iris-live-dot" />
              <span>Live</span>
              <span className="text-border">/</span>
              <span>{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}</span>
            </div>
            <h1 className="mt-1.5 text-[26px] sm:text-[28px] font-semibold tracking-[-0.02em] leading-[1.1]">
              {greeting}, <span className="text-primary">{firstName}</span>.
            </h1>
            <p className="mt-1 text-[13px] text-muted-foreground max-w-xl leading-relaxed">
              Across every Physique 57 India studio right now: <span className="text-foreground font-medium">{narrative}</span>.
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              {nav.map((n, i) => (
                <button key={n.label} onClick={() => setCurrentView(n.view)}
                  className={cn("inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-medium transition-all",
                    i === 0 ? "bg-primary text-primary-foreground shadow-[0_6px_20px_-8px_var(--primary)] hover:brightness-110" : "border border-border bg-card/70 backdrop-blur hover:bg-card")}>
                  <n.icon className="w-3.5 h-3.5" />{n.label}
                </button>
              ))}
            </div>

            <dl className="mt-3 grid grid-cols-3 gap-2 max-w-xl">
              {[
                { k: "Raised · 7 days", v: live.created7, sub: live.total.trend ? `${live.total.trend} vs prior week` : "" },
                { k: "Resolved · 7 days", v: live.resolved7, sub: live.resolved.trend ? `${live.resolved.trend} vs prior week` : "" },
                { k: "First response", v: hours(live.avgFirstResponseH), sub: "average · 30 days" },
              ].map((s) => (
                <div key={s.k} className="rounded-xl border border-border/70 bg-card/60 backdrop-blur px-3.5 py-2">
                  <dt className="text-[10px] uppercase tracking-[.14em] text-muted-foreground">{s.k}</dt>
                  <dd className="mt-1 text-[20px] font-semibold tabular-nums leading-none">{s.v}</dd>
                  {s.sub && <dd className="mt-1 text-[10px] text-muted-foreground">{s.sub}</dd>}
                </div>
              ))}
            </dl>
          </div>

          {/* Right: SLA panel */}
          <div className="flex flex-col justify-center border-t lg:border-t-0 lg:border-l border-border/70 bg-white/70 dark:bg-card/60 backdrop-blur-md px-6 py-4 sm:px-7">
            <div className="flex items-center gap-5">
              <div className="relative shrink-0" style={{ width: 120, height: 120 }}>
                <svg width="120" height="120" viewBox="0 0 148 148" aria-hidden>
                  <circle cx="74" cy="74" r="62" fill="none" stroke="var(--border)" strokeWidth="8" />
                  <circle cx="74" cy="74" r="62" fill="none" stroke="var(--primary)" strokeWidth="8" strokeLinecap="round"
                    strokeDasharray={`${(slaCompliance / 100) * 389.6} 389.6`} transform="rotate(-90 74 74)"
                    style={{ animation: "hero-ring 1.6s cubic-bezier(0.16,1,0.3,1)" }} />
                  <circle cx="74" cy="74" r="50" fill="none" stroke="var(--primary)" strokeWidth="0.6" opacity="0.25" strokeDasharray="2 5"
                    style={{ animation: "hero-rotate 40s linear infinite", transformOrigin: "74px 74px" }} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[24px] font-semibold tabular-nums tracking-tight">{live.sla === null ? "-" : `${live.sla}%`}</span>
                  <span className="text-[9px] uppercase tracking-[.16em] text-muted-foreground">within SLA</span>
                </div>
              </div>
              <div className="min-w-0 space-y-3">
                <div>
                  <div className="text-[13px] font-semibold">Service level</div>
                  <div className="text-[11px] text-muted-foreground">{live.slaSample ? `Based on ${live.slaSample} resolved ticket${live.slaSample === 1 ? "" : "s"} with an SLA target · 30 days` : "No resolved tickets with an SLA target in 30 days"}</div>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[11px]">
                  <div><div className="text-muted-foreground">Avg resolution</div><div className="font-semibold tabular-nums text-[13px]">{hours(live.avgResolveH)}</div></div>
                  <div><div className="text-muted-foreground">Past SLA now</div><div className={cn("font-semibold tabular-nums text-[13px]", live.overdue.value && "text-rose-600 dark:text-rose-400")}>{live.overdue.value}</div></div>
                  <div><div className="text-muted-foreground">Critical open</div><div className={cn("font-semibold tabular-nums text-[13px]", live.critical.value && "text-amber-600 dark:text-amber-400")}>{live.critical.value}</div></div>
                  <div><div className="text-muted-foreground">Unassigned</div><div className="font-semibold tabular-nums text-[13px]">{live.unassignedOpen}</div></div>
                </div>
              </div>
            </div>
            <button onClick={() => setDrill("overdue")} className="mt-3 w-full inline-flex items-center justify-between rounded-xl border border-border/70 px-3.5 py-2 text-[12px] hover:bg-muted/50 transition-colors">
              <span className="text-muted-foreground">See what&apos;s at risk</span>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Live ticker, flush with the bottom of the hero */}
        <div className="relative">
          <MarqueeStrip icon={Zap} variant="hero" items={marqueeItems} />
        </div>

        <style>{`
          @keyframes hero-ring { from { stroke-dashoffset: 389.6; } to { stroke-dashoffset: 0; } }
          @keyframes hero-rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          @keyframes hero-orb-a { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-20px,20px) scale(1.06); } }
          @keyframes hero-orb-b { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(20px,-14px) scale(0.94); } }
        `}</style>
      </section>

      {/* === METRIC CARDS - click for drill-down === */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
        {cards.map((c) => {
          const m = live[c.id];
          return (
            <PremiumMetricCard key={c.id} label={METRICS[c.id].label} value={m.value} icon={c.icon} trend={m.trend} trendUp={m.up}
              tooltip={`${c.tooltip}. Click for details.`} sparkData={m.spark} caption={c.caption} onClick={() => setDrill(c.id)} />
          );
        })}
      </div>
      <MetricDrilldown metric={drill} onClose={() => setDrill(null)} />

      {/* === Daily Briefing + Anomaly Detection (with hotspots to balance the column) === */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-start">
        <DailyBriefing />
        <div className="space-y-3">
          <AnomalyFeed />
          <IssueHotspots />
        </div>
      </div>

      {/* === Charts Row - polished with smooth bezier curves + accent-color strokes === */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Ticket Activity" subtitle="Daily creation vs resolution" icon={TrendingUp} />
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={trendData} margin={{ top: 12, right: 12, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="grad-created" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.28} />
                    <stop offset="60%" stopColor="var(--primary)" stopOpacity={0.10} />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="grad-resolved" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.24} />
                    <stop offset="60%" stopColor="#10b981" stopOpacity={0.08} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="stroke-created" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="var(--primary)" />
                    <stop offset="100%" stopColor="var(--iris-hero-to)" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 4" stroke="currentColor" strokeOpacity={0.05} vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: "currentColor", opacity: 0.5 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "currentColor", opacity: 0.5 }} axisLine={false} tickLine={false} width={32} />
                <RTooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                    fontSize: 11,
                    boxShadow: "0 4px 16px -4px rgba(0,0,0,0.12)",
                  }}
                  cursor={{ stroke: "var(--primary)", strokeWidth: 1, strokeDasharray: "3 3", strokeOpacity: 0.4 }}
                />
                <Area
                  type="monotone"
                  dataKey="created"
                  name="Created"
                  stroke="url(#stroke-created)"
                  strokeWidth={2.5}
                  fill="url(#grad-created)"
                  dot={false}
                  activeDot={{ r: 4, fill: "var(--primary)", stroke: "var(--card)", strokeWidth: 2 }}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <Area
                  type="monotone"
                  dataKey="resolved"
                  name="Resolved"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#grad-resolved)"
                  dot={false}
                  activeDot={{ r: 3.5, fill: "#10b981", stroke: "var(--card)", strokeWidth: 2 }}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Priority" subtitle="Active tickets" icon={Target} />
          <CardContent>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie
                  data={priorityData}
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="var(--card)"
                  strokeWidth={2}
                >
                  {priorityData.map((entry, idx) => <Cell key={idx} fill={entry.color} stroke="none" />)}
                </Pie>
                <RTooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                    fontSize: 11,
                    boxShadow: "0 4px 16px -4px rgba(0,0,0,0.12)",
                  }}
                />
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

      {/* === Studio + Department - polished bars with rounded corners + accent gradient === */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Studio Performance" subtitle="Tickets by studio" icon={Building2} />
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={studioData} margin={{ top: 12, right: 12, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="bar-tickets" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity={1} />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.6} />
                  </linearGradient>
                  <linearGradient id="bar-resolved" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0.6} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 4" stroke="currentColor" strokeOpacity={0.05} vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "currentColor", opacity: 0.5 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "currentColor", opacity: 0.5 }} axisLine={false} tickLine={false} width={32} />
                <RTooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                    fontSize: 11,
                    boxShadow: "0 4px 16px -4px rgba(0,0,0,0.12)",
                  }}
                  cursor={{ fill: "var(--primary)", fillOpacity: 0.04 }}
                />
                <Bar dataKey="tickets" name="Total" fill="url(#bar-tickets)" radius={[6, 6, 0, 0]} barSize={22} />
                <Bar dataKey="resolved" name="Resolved" fill="url(#bar-resolved)" radius={[6, 6, 0, 0]} barSize={22} />
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
                    <span className="ml-auto"><RelativeTime date={t.createdAt} /></span>
                  </div>
                  <SmartBadges ticket={t} variant="xs" className="mt-1.5" />
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
                  <span className="ml-auto"><RelativeTime date={t.createdAt} /></span>
                </div>
                <SmartBadges ticket={t} variant="xs" className="mt-1.5" />
              </button>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* AI Insights - only one marquee strip remains (under the hero).
          Previously there were 3 marquee strips; per user request, only the
          hero strip is kept so the page feels less cluttered. */}
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

// === MARQUEE STRIP ===
// Variants:
//   hero   - flush against hero, tinted background, slightly taller
//   studio - clean white card style with emerald accent
//   ai     - violet/purple tinted for AI insights
// (Currently only the "hero" variant is used; studio and ai variants kept
// for future use.)
type MarqueeItem = { label: string; value: string; emphasize?: boolean };

function MarqueeStrip({
  items,
  icon: Icon,
  variant = "hero",
}: {
  items: MarqueeItem[];
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  variant?: "hero" | "studio" | "ai";
}) {
  // Duplicate items for seamless loop
  const doubled = [...items, ...items, ...items];
  // Adjust duration based on content length so it scrolls at a readable pace
  const duration = Math.max(35, Math.min(80, items.length * 6));

  const wrapperClass = cn(
    "iris-marquee",
    variant === "hero" && "rounded-none border-x-0 border-b-0",
    variant === "studio" && "border-emerald-500/20",
    variant === "ai" && "border-violet-500/20 bg-violet-500/[0.03]",
  );

  const accentColor =
    variant === "hero" ? "var(--primary)" :
    variant === "studio" ? "#10b981" :
    "#af52de";

  return (
    <div className={wrapperClass} style={{ ["--marquee-duration" as string]: `${duration}s` }}>
      <div className="iris-marquee-track py-2">
        {doubled.map((item, i) => (
          <React.Fragment key={i}>
            <div className="iris-marquee-item">
              <Icon className="w-3 h-3 shrink-0" style={{ color: accentColor }} />
              <span className="text-muted-foreground">{item.label}:</span>
              <strong style={item.emphasize ? { color: accentColor } : undefined}>{item.value}</strong>
            </div>
            <span className="iris-marquee-divider">•</span>
          </React.Fragment>
        ))}
      </div>
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

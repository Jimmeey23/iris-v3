"use client";

import * as React from "react";
import { useAppStore } from "@/lib/iris/store";
import { ALL_TICKETS, isOwner, getAssignee, getStudio, getDepartment } from "@/lib/iris/sample-tickets";
import { EMPLOYEES, DEPARTMENTS, STUDIOS } from "@/lib/iris/types";
import { PriorityBadge, StatusBadge, SLABadge } from "../badges";
import { SmartBadges } from "../smart-badges";
import { RelativeTime } from "../relative-time";
import { useSharedClock } from "@/lib/iris/use-visible-interval";
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

  const now = useSharedClock();
  const pulse = React.useMemo(() => {
    void dataVersion;
    const open = ALL_TICKETS.filter((t) => !DONE.has(t.status));
    const dueNext = open
      .filter((t) => t.slaResolutionTarget && +new Date(t.slaResolutionTarget) > now && +new Date(t.slaResolutionTarget) - now < 86_400_000)
      .sort((a, b) => +new Date(a.slaResolutionTarget!) - +new Date(b.slaResolutionTarget!))
      .slice(0, 3);
    const oldest = open.reduce<number | null>((m, t) => { const c = +new Date(t.createdAt); return m === null || c < m ? c : m; }, null);
    const today = live.trend[live.trend.length - 1];
    return {
      dueNext,
      atRisk: open.filter((t) => t.slaStatus === "at_risk").length,
      oldestH: oldest === null || !now ? null : (now - oldest) / 3_600_000,
      net: today ? today.created - today.resolved : 0,
    };
  }, [dataVersion, now, live.trend]);

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
      <section className="ovh relative overflow-hidden rounded-2xl border border-border bg-white dark:bg-card iris-fade-in-up shadow-[0_1px_0_0_color-mix(in_srgb,var(--foreground)_4%,transparent),0_24px_48px_-32px_color-mix(in_srgb,var(--primary)_35%,transparent)]">
        {/* Hairline accent along the top edge */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px" style={{ background: "linear-gradient(90deg, transparent, var(--primary) 30%, color-mix(in srgb, var(--primary) 40%, transparent) 70%, transparent)" }} />
        {/* Faint accent wash + fine grid texture, both fading out to the right */}
        <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(120% 140% at 0% 0%, color-mix(in srgb, var(--primary) 10%, transparent) 0%, transparent 55%)" }} />
        <div className="ovh-grid pointer-events-none absolute inset-0" />

        <div className="relative grid lg:grid-cols-[minmax(0,1fr)_minmax(320px,400px)] lg:items-stretch">
          {/* Left */}
          <div className="min-w-0 px-6 py-5 sm:px-8">
            <div className="flex items-center gap-2.5 text-[10px] font-medium uppercase tracking-[.18em] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5 h-5 pl-1.5 pr-2 rounded-full border border-emerald-500/25 bg-emerald-500/[.06] text-emerald-700 dark:text-emerald-400 tracking-[.14em]">
                <span className="iris-live-dot" />Live
              </span>
              <span>{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}</span>
            </div>
            <h1 className="mt-2.5 text-[28px] sm:text-[32px] font-semibold tracking-[-0.025em] leading-[1.05]">
              {greeting},{" "}
              <span className="iris-wordmark-ai text-primary text-[1.12em] tracking-[-0.01em]">{firstName}</span>
            </h1>
            <p className="mt-1.5 text-[13px] text-muted-foreground max-w-xl leading-relaxed">
              Across every Physique 57 India studio: <span className="text-foreground font-medium">{narrative}</span>.
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-1.5">
              {nav.map((n, i) => (
                <button key={n.label} onClick={() => setCurrentView(n.view)}
                  className={cn("group inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[12px] font-medium transition-all",
                    i === 0
                      ? "bg-foreground text-background hover:bg-primary hover:text-primary-foreground shadow-[0_8px_20px_-10px_var(--foreground)]"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/60")}>
                  <n.icon className={cn("w-3.5 h-3.5", i === 0 && "text-primary group-hover:text-primary-foreground")} />{n.label}
                  {i === 0 && <ChevronRight className="w-3 h-3 -mr-1 opacity-60 transition-transform group-hover:translate-x-0.5" />}
                </button>
              ))}
            </div>

            <dl className="mt-4 grid grid-cols-3 max-w-xl border-t border-border/70 pt-3 divide-x divide-border/70">
              {[
                { k: "Raised", sub: "last 7 days", v: live.created7, d: live.total.trend, spark: live.trend.map((t) => t.created) },
                { k: "Resolved", sub: "last 7 days", v: live.resolved7, d: live.resolved.trend, spark: live.trend.map((t) => t.resolved) },
                { k: "First response", sub: "average · 30 days", v: hours(live.avgFirstResponseH), d: "", spark: null },
              ].map((s, i) => (
                <div key={s.k} className={cn("min-w-0", i === 0 ? "pr-4" : "px-4")}>
                  <dt className="text-[10px] uppercase tracking-[.16em] text-muted-foreground">{s.k}</dt>
                  <dd className="mt-1.5 flex items-end gap-2">
                    <span className="text-[24px] font-semibold tabular-nums leading-none tracking-tight">{s.v}</span>
                    {s.spark && <Spark values={s.spark} />}
                  </dd>
                  <dd className="mt-1 text-[10px] text-muted-foreground truncate">
                    {s.d ? <span className="text-foreground/80 font-medium tabular-nums">{s.d}</span> : null}{s.d ? " vs prior week" : s.sub}
                  </dd>
                </div>
              ))}
            </dl>

            <dl className="mt-3 max-w-xl grid grid-cols-4 gap-px rounded-xl overflow-hidden border border-border/70 bg-border/70">
              {[
                { k: "Open", v: live.open.value, tone: "" },
                { k: "Past SLA", v: live.overdue.value, tone: live.overdue.value ? "text-rose-600 dark:text-rose-400" : "" },
                { k: "At risk", v: pulse.atRisk, tone: pulse.atRisk ? "text-amber-600 dark:text-amber-400" : "" },
                { k: "Critical", v: live.critical.value, tone: live.critical.value ? "text-rose-600 dark:text-rose-400" : "" },
                { k: "Unassigned", v: live.unassignedOpen, tone: live.unassignedOpen ? "text-amber-600 dark:text-amber-400" : "" },
                { k: "Avg resolve", v: hours(live.avgResolveH), tone: "" },
                { k: "Oldest open", v: pulse.oldestH === null ? "-" : hours(pulse.oldestH), tone: "" },
                { k: "Net today", v: pulse.net > 0 ? `+${pulse.net}` : String(pulse.net), tone: pulse.net > 0 ? "text-rose-600 dark:text-rose-400" : pulse.net < 0 ? "text-emerald-600 dark:text-emerald-400" : "" },
              ].map((m) => (
                <div key={m.k} className="bg-white/90 dark:bg-card px-2 py-1.5">
                  <dt className="text-[9px] uppercase tracking-[.12em] text-muted-foreground truncate">{m.k}</dt>
                  <dd className={cn("mt-0.5 text-[14px] font-semibold tabular-nums leading-tight", m.tone)}>{m.v}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Right: service level pulse */}
          <div className="relative flex flex-col border-t lg:border-t-0 lg:border-l border-border/70 bg-[color-mix(in_srgb,var(--muted)_35%,transparent)] px-6 py-5 sm:px-7">
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="text-[10px] uppercase tracking-[.18em] text-muted-foreground">Service level · 30d</div>
                <div className="mt-1.5 flex items-baseline gap-1.5">
                  <span className="text-[30px] font-semibold tabular-nums tracking-[-0.03em] leading-none">{live.sla === null ? "-" : live.sla}</span>
                  {live.sla !== null && <span className="text-[14px] text-muted-foreground font-medium">%</span>}
                  <span className="ml-1 text-[10.5px] text-muted-foreground">within SLA</span>
                </div>
                <div className="mt-2 h-1 w-40 rounded-full bg-border overflow-hidden">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${slaCompliance}%`, transition: "width 1.2s cubic-bezier(.16,1,.3,1)" }} />
                </div>
              </div>
              <div className="text-right text-[10px] text-muted-foreground leading-relaxed">
                <div className="uppercase tracking-[.16em]">14 days</div>
                <div className="flex items-center justify-end gap-1.5"><span className="w-2.5 h-[2px] rounded bg-foreground/35" />Raised <b className="text-foreground tabular-nums font-semibold">{live.trend.reduce((n, d) => n + d.created, 0)}</b></div>
                <div className="flex items-center justify-end gap-1.5"><span className="w-2.5 h-[2px] rounded bg-primary" />Resolved <b className="text-foreground tabular-nums font-semibold">{live.trend.reduce((n, d) => n + d.resolved, 0)}</b></div>
              </div>
            </div>
            <FlowChart days={live.trend} />

            <div className="mt-3 flex items-center justify-between">
              <div className="text-[10px] uppercase tracking-[.18em] text-muted-foreground">Due next</div>
              <button onClick={() => setDrill("overdue")} className="group inline-flex items-center gap-0.5 text-[10.5px] font-medium text-muted-foreground hover:text-primary transition-colors">
                {live.overdue.value ? <span className="text-rose-600 dark:text-rose-400 tabular-nums">{live.overdue.value} past SLA</span> : "Nothing past SLA"}
                <ChevronRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>
            <ul className="mt-1.5 divide-y divide-border/60 rounded-xl border border-border/70 bg-white/90 dark:bg-card overflow-hidden">
              {pulse.dueNext.length === 0 ? (
                <li className="px-3 py-2.5 text-[11.5px] text-muted-foreground">No SLA deadlines in the next 24 hours.</li>
              ) : pulse.dueNext.map((t) => {
                const mins = Math.max(0, Math.round((+new Date(t.slaResolutionTarget!) - now) / 60000));
                const urgent = mins < 120;
                return (
                  <li key={t.id}>
                    <button onClick={() => { selectTicket(t.id); setCurrentView("all_tickets"); }}
                      className="w-full flex items-center gap-2.5 px-3 py-1.5 text-left hover:bg-muted/50 transition-colors">
                      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", urgent ? "bg-rose-500" : "bg-amber-500")} />
                      <span className="text-[10.5px] font-mono text-muted-foreground shrink-0">{t.ticketId}</span>
                      <span className="text-[11.5px] truncate flex-1">{t.title}</span>
                      <span className={cn("text-[10.5px] font-semibold tabular-nums shrink-0", urgent ? "text-rose-600 dark:text-rose-400" : "text-foreground/80")}>
                        {mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h ${mins % 60}m`}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>

          </div>
        </div>

        {/* Live ticker, flush with the bottom of the hero */}
        <div className="relative">
          <MarqueeStrip icon={Zap} variant="hero" items={marqueeItems} />
        </div>

        <style>{`
          .ovh-grid {
            background-image: linear-gradient(to right, color-mix(in srgb, var(--foreground) 5%, transparent) 1px, transparent 1px),
                              linear-gradient(to bottom, color-mix(in srgb, var(--foreground) 5%, transparent) 1px, transparent 1px);
            background-size: 28px 28px;
            mask-image: radial-gradient(90% 120% at 0% 0%, #000 0%, transparent 60%);
            -webkit-mask-image: radial-gradient(90% 120% at 0% 0%, #000 0%, transparent 60%);
          }
          @media (prefers-reduced-motion: reduce) { .ovh * { animation: none !important; } }
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

/** Tiny 14-day sparkline for the hero stats. */
function Spark({ values }: { values: number[] }) {
  const w = 56, h = 18;
  const max = Math.max(1, ...values);
  const pts = values.map((v, i) => `${(i / Math.max(1, values.length - 1)) * w},${h - (v / max) * (h - 2) - 1}`).join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="mb-0.5 overflow-visible" aria-hidden>
      <polyline points={pts} fill="none" stroke="var(--primary)" strokeWidth="1.25" strokeLinejoin="round" strokeLinecap="round" opacity="0.8" />
    </svg>
  );
}

/** 14-day raised vs resolved: two 2px lines on one axis, soft area under resolved, crosshair tooltip. */
function FlowChart({ days }: { days: { day: string; created: number; resolved: number }[] }) {
  const [hover, setHover] = React.useState<number | null>(null);
  const W = 320, H = 76, P = { t: 6, b: 14, l: 0, r: 0 };
  const max = Math.max(2, ...days.flatMap((d) => [d.created, d.resolved]));
  const x = (i: number) => P.l + (i / Math.max(1, days.length - 1)) * (W - P.l - P.r);
  const y = (v: number) => P.t + (1 - v / max) * (H - P.t - P.b);
  const path = (k: "created" | "resolved") => days.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(d[k]).toFixed(1)}`).join("");
  const base = H - P.b;
  const area = `${path("resolved")}L${x(days.length - 1)},${base}L${x(0)},${base}Z`;
  const h = hover === null ? null : days[hover];
  return (
    <div className="relative mt-2.5">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full h-[76px] overflow-visible" role="img"
        aria-label="Tickets raised and resolved per day over the last 14 days"
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const i = Math.round(((e.clientX - r.left) / r.width) * (days.length - 1));
          setHover(Math.max(0, Math.min(days.length - 1, i)));
        }}>
        <defs>
          <linearGradient id="ovh-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.5, 1].map((f) => (
          <line key={f} x1={0} x2={W} y1={y(max * f)} y2={y(max * f)} stroke="var(--foreground)" strokeOpacity="0.07" strokeDasharray="2 3" vectorEffect="non-scaling-stroke" />
        ))}
        <line x1={0} x2={W} y1={base} y2={base} stroke="var(--foreground)" strokeOpacity="0.15" vectorEffect="non-scaling-stroke" />
        <path d={area} fill="url(#ovh-area)" />
        <path d={path("created")} fill="none" stroke="var(--foreground)" strokeOpacity="0.35" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        <path d={path("resolved")} fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        {hover !== null && h && (
          <line x1={x(hover)} x2={x(hover)} y1={P.t} y2={base} stroke="var(--foreground)" strokeOpacity="0.25" vectorEffect="non-scaling-stroke" />
        )}
      </svg>
      {hover !== null && h && (
        <>
          {(["created", "resolved"] as const).map((k) => (
            <span key={k} className={cn("pointer-events-none absolute w-2 h-2 -ml-1 -mt-1 rounded-full ring-2 ring-white dark:ring-card", k === "resolved" ? "bg-primary" : "bg-foreground/45")}
              style={{ left: `${(x(hover) / W) * 100}%`, top: `${(y(h[k]) / H) * 76}px` }} />
          ))}
          <div className="pointer-events-none absolute -top-2 z-10 -translate-y-full rounded-lg border border-border bg-popover px-2.5 py-1.5 text-[10.5px] shadow-md whitespace-nowrap"
            style={{ left: `${(x(hover) / W) * 100}%`, transform: `translate(${hover > days.length / 2 ? "-100%" : "0"}, -100%)` }}>
            <div className="font-semibold mb-0.5">{h.day}</div>
            <div className="flex items-center gap-1.5 text-muted-foreground"><span className="w-2 h-[2px] bg-foreground/45" />Raised <b className="ml-auto pl-3 text-foreground tabular-nums">{h.created}</b></div>
            <div className="flex items-center gap-1.5 text-muted-foreground"><span className="w-2 h-[2px] bg-primary" />Resolved <b className="ml-auto pl-3 text-foreground tabular-nums">{h.resolved}</b></div>
          </div>
        </>
      )}
      <div className="flex justify-between text-[9px] text-muted-foreground tabular-nums">
        <span>{days[0]?.day}</span><span>Today</span>
      </div>
    </div>
  );
}

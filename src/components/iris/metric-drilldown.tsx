"use client";

import * as React from "react";
import { ArrowRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ALL_TICKETS, getAssignee, getStudio, type Ticket } from "@/lib/iris/sample-tickets";
import { useAppStore } from "@/lib/iris/store";
import { PriorityBadge, SLABadge, StatusBadge } from "./badges";
import { RelativeTime } from "./relative-time";

// ─────────────────────────────────────────────────────────────────────────────
// Metric definitions - shared by the cards (value, sparkline, trend) and the drill-down.
// ─────────────────────────────────────────────────────────────────────────────

const DONE = new Set(["resolved", "closed"]);
const isOpen = (t: Ticket) => !DONE.has(t.status);
const DAY = 86400_000;

export type MetricId = "total" | "open" | "critical" | "escalated" | "overdue" | "resolved" | "mine";

export type MetricDef = {
  id: MetricId;
  label: string;
  description: string;
  /** Which tickets the number counts. */
  match: (t: Ticket, me: string) => boolean;
  /** Which date places a ticket on the daily series. */
  dateOf: (t: Ticket) => string | Date | undefined;
  /** Filters applied when jumping to the tickets list. */
  filters?: Partial<{ status: string[]; priority: string[]; slaStatus: string[] }>;
  view?: "all_tickets" | "my_tickets" | "escalations";
};

export const METRICS: Record<MetricId, MetricDef> = {
  total: { id: "total", label: "Total", description: "Every ticket, by the day it was raised", match: () => true, dateOf: (t) => t.createdAt },
  open: { id: "open", label: "Open", description: "Not yet resolved or closed", match: isOpen, dateOf: (t) => t.createdAt },
  critical: { id: "critical", label: "Critical", description: "Open P0 tickets", match: (t) => isOpen(t) && t.priority === "P0", dateOf: (t) => t.createdAt, filters: { priority: ["P0"] } },
  escalated: { id: "escalated", label: "Escalated", description: "Open tickets escalated past their first owner", match: (t) => isOpen(t) && (t.status === "escalated" || (t.escalationLevel ?? 0) > 0), dateOf: (t) => t.createdAt, view: "escalations" },
  overdue: { id: "overdue", label: "Overdue", description: "Open tickets past their SLA resolution target", match: (t) => isOpen(t) && t.slaStatus === "breached", dateOf: (t) => t.slaResolutionTarget ?? t.createdAt, filters: { slaStatus: ["breached"] } },
  resolved: { id: "resolved", label: "Resolved", description: "Resolved or closed, by the day it was resolved", match: (t) => DONE.has(t.status), dateOf: (t) => t.resolvedAt ?? t.updatedAt, filters: { status: ["resolved", "closed"] } },
  mine: { id: "mine", label: "My Queue", description: "Open tickets you own", match: (t, me) => isOpen(t) && (t.assigneeId === me || (t.assigneeIds ?? []).includes(me)), dateOf: (t) => t.createdAt, view: "my_tickets" },
};

/** Daily counts for the last `days` days (oldest first), by the metric's date. */
export function dailySeries(list: Ticket[], def: MetricDef, days: number): number[] {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const t0 = start.getTime() - (days - 1) * DAY;
  const out = new Array<number>(days).fill(0);
  for (const t of list) {
    const d = def.dateOf(t);
    if (!d) continue;
    const i = Math.floor((new Date(d).getTime() - t0) / DAY);
    if (i >= 0 && i < days) out[i]++;
  }
  return out;
}

/** "+12%" style change of the last 7 days against the 7 before. */
export function weekTrend(series14: number[]): { trend?: string; up?: boolean } {
  const cur = series14.slice(7).reduce((a, b) => a + b, 0);
  const prev = series14.slice(0, 7).reduce((a, b) => a + b, 0);
  if (!prev && !cur) return {};
  if (!prev) return { trend: "new", up: true };
  const pct = Math.round(((cur - prev) / prev) * 100);
  return { trend: `${pct >= 0 ? "+" : ""}${pct}%`, up: pct >= 0 };
}

// ─────────────────────────────────────────────────────────────────────────────
// Drill-down dialog
// ─────────────────────────────────────────────────────────────────────────────

function Breakdown({ title, rows, total }: { title: string; rows: [string, number][]; total: number }) {
  return (
    <div className="rounded-xl border border-border/70 p-3">
      <div className="text-[10px] font-semibold uppercase tracking-[.12em] text-muted-foreground mb-2">{title}</div>
      {rows.length === 0 ? (
        <div className="text-[11px] text-muted-foreground">-</div>
      ) : (
        <ul className="space-y-1.5">
          {rows.map(([k, n]) => (
            <li key={k} className="text-[11px]">
              <div className="flex justify-between gap-2"><span className="truncate">{k}</span><span className="tabular-nums text-muted-foreground">{n}</span></div>
              <div className="h-1 rounded-full bg-muted mt-1 overflow-hidden">
                <div className="h-full rounded-full bg-primary/70" style={{ width: `${Math.max(4, (n / Math.max(total, 1)) * 100)}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function top(list: Ticket[], key: (t: Ticket) => string, n = 6): [string, number][] {
  const m = new Map<string, number>();
  for (const t of list) m.set(key(t), (m.get(key(t)) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
}

export function MetricDrilldown({ metric, onClose }: { metric: MetricId | null; onClose: () => void }) {
  const { currentUser, selectTicket, setCurrentView, setTicketFilter, resetTicketFilters, dataVersion } = useAppStore();
  const def = metric ? METRICS[metric] : null;

  const data = React.useMemo(() => {
    void dataVersion;
    if (!def) return null;
    const list = ALL_TICKETS.filter((t) => def.match(t, currentUser.id));
    const series = dailySeries(list, def, 14);
    const labels = Array.from({ length: 14 }, (_, i) => {
      const d = new Date(Date.now() - (13 - i) * DAY);
      return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
    });
    const recent = [...list].sort((a, b) => {
      const rank = (t: Ticket) => (t.slaStatus === "breached" ? 0 : t.slaStatus === "at_risk" ? 1 : 2);
      return rank(a) - rank(b) || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    return {
      list,
      chart: series.map((v, i) => ({ day: labels[i], value: v })),
      trend: weekTrend(series),
      byStudio: top(list, (t) => getStudio(t)?.name ?? "No studio"),
      byOwner: top(list, (t) => getAssignee(t)?.name ?? "Unassigned"),
      byCategory: top(list, (t) => t.subcategory || t.category || "Uncategorised"),
      byPriority: (["P0", "P1", "P2", "P3"] as const).map((p) => [p, list.filter((t) => t.priority === p).length] as [string, number]).filter(([, n]) => n),
      recent: recent.slice(0, 40),
    };
  }, [def, currentUser.id, dataVersion]);

  const openList = () => {
    if (!def) return;
    resetTicketFilters();
    for (const [k, v] of Object.entries(def.filters ?? {})) setTicketFilter(k as "status", v as string[]);
    setCurrentView(def.view ?? "all_tickets");
    onClose();
  };

  return (
    <Dialog open={Boolean(def)} onOpenChange={(o) => !o && onClose()}>
      {def && data && (
        <DialogContent className="block w-[calc(100vw-2rem)] sm:max-w-[1100px] max-h-[90vh] overflow-y-auto overflow-x-hidden iris-scrollbar p-0 gap-0">
          <DialogHeader className="px-6 py-5 border-b border-border bg-gradient-to-r from-primary/[.06] to-transparent">
            <div className="flex items-end gap-4 flex-wrap">
              <div>
                <DialogTitle className="text-[13px] font-medium text-muted-foreground">{def.label}</DialogTitle>
                <div className="text-[34px] font-bold tracking-tight tabular-nums leading-none mt-1">{data.list.length}</div>
                <DialogDescription className="text-[12px] mt-1.5">{def.description}</DialogDescription>
              </div>
              {data.trend.trend && (
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${data.trend.up ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-rose-500/10 text-rose-600 dark:text-rose-400"}`}>
                  {data.trend.trend} vs previous 7 days
                </span>
              )}
              <Button size="sm" className="h-8 text-[12px] ml-auto" onClick={openList}>
                Open in tickets <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </div>
          </DialogHeader>

          <div className="p-6 space-y-5 min-w-0">
            <div className="rounded-xl border border-border/70 p-4">
              <div className="text-[10px] font-semibold uppercase tracking-[.12em] text-muted-foreground mb-2">Last 14 days</div>
              <ResponsiveContainer width="100%" height={170}>
                <BarChart data={data.chart} margin={{ top: 6, right: 6, left: -22, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 4" stroke="currentColor" strokeOpacity={0.06} vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: "currentColor", opacity: 0.55 }} axisLine={false} tickLine={false} interval={1} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "currentColor", opacity: 0.55 }} axisLine={false} tickLine={false} />
                  <RTooltip cursor={{ fill: "currentColor", fillOpacity: 0.05 }} contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="value" name={def.label} fill="var(--primary)" radius={[5, 5, 0, 0]} maxBarSize={26} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Breakdown title="By studio" rows={data.byStudio} total={data.list.length} />
              <Breakdown title="By owner" rows={data.byOwner} total={data.list.length} />
              <Breakdown title="By issue" rows={data.byCategory} total={data.list.length} />
              <Breakdown title="By priority" rows={data.byPriority} total={data.list.length} />
            </div>

            <div className="rounded-xl border border-border/70 overflow-hidden">
              <div className="px-4 py-2.5 border-b border-border bg-muted/30 text-[10px] font-semibold uppercase tracking-[.12em] text-muted-foreground">
                Tickets {data.list.length > data.recent.length ? `· showing ${data.recent.length} most urgent of ${data.list.length}` : ""}
              </div>
              <div className="divide-y divide-border max-h-[340px] overflow-y-auto iris-scrollbar">
                {data.recent.map((t) => (
                  <button key={t.id} onClick={() => { selectTicket(t.id); setCurrentView("all_tickets"); onClose(); }}
                    className="w-full text-left flex items-center gap-2.5 px-4 py-2 hover:bg-muted/50">
                    <span className="text-[10px] font-mono text-muted-foreground w-[78px] shrink-0">{t.ticketId}</span>
                    <PriorityBadge priority={t.priority} />
                    <span className="text-[12px] truncate flex-1">{t.title}</span>
                    <span className="hidden md:block"><StatusBadge status={t.status} /></span>
                    <SLABadge status={t.slaStatus} targetDate={t.slaResolutionTarget} />
                    <span className="text-[10px] text-muted-foreground w-16 text-right shrink-0"><RelativeTime date={t.createdAt} /></span>
                  </button>
                ))}
                {!data.recent.length && <div className="px-4 py-8 text-center text-[12px] text-muted-foreground">Nothing here right now.</div>}
              </div>
            </div>
          </div>
        </DialogContent>
      )}
    </Dialog>
  );
}

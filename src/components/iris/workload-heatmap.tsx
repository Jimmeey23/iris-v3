"use client";

import * as React from "react";
import { ALL_TICKETS, type Ticket } from "@/lib/iris/sample-tickets";
import { EMPLOYEES, DEPARTMENTS } from "@/lib/iris/types";
import { useAppStore } from "@/lib/iris/store";
import { cn } from "@/lib/utils";
import { Activity, AlertTriangle, Users } from "lucide-react";

/**
 * Team Workload Heatmap - each person's live load, not just tickets created per day.
 *
 * Columns split the open queue by state, urgency, age and SLA, plus what they
 * closed in the last 30 days, so every row carries signal. Cell colour scales with
 * the value relative to that column's busiest person; SLA and P0/P1 columns run hot.
 */
const DONE = new Set(["resolved", "closed"]);
const DAY = 86400_000;

type Col = { key: string; label: string; hint: string; tone: "primary" | "amber" | "rose" | "emerald"; test: (t: Ticket, now: number) => boolean };
const COLS: Col[] = [
  { key: "open", label: "Open", hint: "Not started yet", tone: "primary", test: (t) => t.status === "open" },
  { key: "progress", label: "In progress", hint: "Being worked on", tone: "primary", test: (t) => t.status === "in_progress" },
  { key: "waiting", label: "Waiting", hint: "Awaiting response", tone: "primary", test: (t) => t.status === "awaiting_response" },
  { key: "urgent", label: "P0/P1", hint: "Critical or high priority, still open", tone: "amber", test: (t) => !DONE.has(t.status) && (t.priority === "P0" || t.priority === "P1") },
  { key: "aging", label: "> 7 days", hint: "Open for more than a week", tone: "amber", test: (t, now) => !DONE.has(t.status) && now - new Date(t.createdAt).getTime() > 7 * DAY },
  { key: "breached", label: "Past SLA", hint: "Open and past the resolution target", tone: "rose", test: (t) => !DONE.has(t.status) && t.slaStatus === "breached" },
  { key: "escalated", label: "Escalated", hint: "Escalated past the first owner", tone: "rose", test: (t) => t.status === "escalated" },
  { key: "closed30", label: "Closed 30d", hint: "Resolved or closed in the last 30 days", tone: "emerald", test: (t, now) => DONE.has(t.status) && !!t.resolvedAt && now - new Date(t.resolvedAt).getTime() < 30 * DAY },
];

const TONE: Record<Col["tone"], string[]> = {
  primary: ["bg-primary/10 text-primary", "bg-primary/20 text-primary", "bg-primary/35 text-primary"],
  amber: ["bg-amber-500/10 text-amber-700 dark:text-amber-400", "bg-amber-500/20 text-amber-700 dark:text-amber-300", "bg-amber-500/35 text-amber-800 dark:text-amber-200"],
  rose: ["bg-rose-500/10 text-rose-600 dark:text-rose-400", "bg-rose-500/20 text-rose-600 dark:text-rose-300", "bg-rose-500/35 text-rose-700 dark:text-rose-200 font-extrabold"],
  emerald: ["bg-emerald-500/10 text-emerald-700 dark:text-emerald-400", "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300", "bg-emerald-500/35 text-emerald-800 dark:text-emerald-200"],
};

const ownersOf = (t: Ticket) => (t.assigneeIds?.length ? t.assigneeIds : t.assigneeId ? [t.assigneeId] : []);

export function WorkloadHeatmap() {
  const dataVersion = useAppStore((s) => s.dataVersion);
  const [deptFilter, setDeptFilter] = React.useState<string>("all");
  const [showAll, setShowAll] = React.useState(false);

  const { rows, maxByCol, unassigned } = React.useMemo(() => {
    void dataVersion;
    const now = Date.now();
    const counts = new Map<string, Record<string, number>>();
    let unassigned = 0;
    for (const t of ALL_TICKETS) {
      const owners = ownersOf(t);
      if (!owners.length && !DONE.has(t.status)) unassigned++;
      for (const id of owners) {
        const c = counts.get(id) ?? Object.fromEntries(COLS.map((x) => [x.key, 0]));
        for (const col of COLS) if (col.test(t, now)) c[col.key]++;
        counts.set(id, c);
      }
    }
    const rows = EMPLOYEES.filter((e) => deptFilter === "all" || e.departmentCode === deptFilter)
      .map((e) => {
        const c = counts.get(e.id) ?? Object.fromEntries(COLS.map((x) => [x.key, 0]));
        const active = c.open + c.progress + c.waiting + c.escalated;
        return { e, c, active, util: e.maxWorkload ? active / e.maxWorkload : 0, any: Object.values(c).some((v) => v > 0) };
      })
      .filter((r) => showAll || r.any)
      .sort((a, b) => b.active - a.active || b.c.breached - a.c.breached || b.c.closed30 - a.c.closed30);
    const maxByCol = Object.fromEntries(COLS.map((col) => [col.key, Math.max(1, ...rows.map((r) => r.c[col.key]))]));
    return { rows, maxByCol, unassigned };
  }, [dataVersion, deptFilter, showAll]);

  const overloaded = rows.filter((r) => r.util >= 1);
  const level = (v: number, max: number) => (v / max >= 0.67 ? 2 : v / max >= 0.34 ? 1 : 0);

  return (
    <div className="iris-card overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border flex items-center gap-2 flex-wrap">
        <div className="w-6 h-6 rounded-md bg-sky-500/10 flex items-center justify-center">
          <Activity className="w-3 h-3 text-sky-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[12px] font-semibold">Team Workload Heatmap</div>
          <div className="text-[9px] text-muted-foreground">
            Live load per person · {rows.length} people · {overloaded.length} over capacity{unassigned ? ` · ${unassigned} open tickets unassigned` : ""}
          </div>
        </div>
        <label className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} className="accent-[var(--primary)]" />
          Show everyone
        </label>
        <select
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          className="h-7 text-[11px] rounded-md border border-border bg-background px-2"
        >
          <option value="all">All Departments</option>
          {DEPARTMENTS.map((d) => (
            <option key={d.code} value={d.code}>{d.name}</option>
          ))}
        </select>
      </div>

      <div className="p-3 overflow-x-auto">
        {rows.length === 0 ? (
          <div className="py-8 text-center text-[12px] text-muted-foreground">Nobody in this department has tickets right now.</div>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-left text-[9px] font-semibold uppercase tracking-wider text-muted-foreground pb-2 pr-3 sticky left-0 bg-card">Person</th>
                <th className="text-left text-[9px] font-semibold uppercase tracking-wider text-muted-foreground pb-2 pr-3 min-w-[110px]">Capacity</th>
                {COLS.map((c) => (
                  <th key={c.key} title={c.hint} className="text-center text-[9px] font-semibold text-muted-foreground pb-2 px-1 min-w-[52px] whitespace-nowrap">
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ e, c, active, util }) => (
                <tr key={e.id} className="hover:bg-muted/20">
                  <td className="py-1 pr-3 sticky left-0 bg-card">
                    <div className="text-[11px] font-medium truncate max-w-[160px]">{e.name}</div>
                    <div className="text-[9px] text-muted-foreground truncate max-w-[160px]">{e.role}</div>
                  </td>
                  <td className="py-1 pr-3">
                    <div className="flex items-center gap-1.5">
                      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className={cn("h-full rounded-full", util >= 1 ? "bg-rose-500" : util >= 0.7 ? "bg-amber-500" : "bg-emerald-500")}
                          style={{ width: `${Math.min(100, util * 100)}%` }}
                        />
                      </div>
                      <span className={cn("text-[10px] tabular-nums font-semibold", util >= 1 && "text-rose-500")}>
                        {active}/{e.maxWorkload || "?"}
                      </span>
                    </div>
                  </td>
                  {COLS.map((col) => {
                    const v = c[col.key];
                    return (
                      <td key={col.key} className="text-center px-1 py-1">
                        <div
                          className={cn(
                            "w-10 h-8 mx-auto rounded-md flex items-center justify-center text-[11px] font-bold tabular-nums",
                            v === 0 ? "bg-muted/25 text-muted-foreground/40" : TONE[col.tone][level(v, maxByCol[col.key])],
                          )}
                          title={`${e.name} · ${col.hint}: ${v}`}
                        >
                          {v || "·"}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {overloaded.length > 0 && (
        <div className="px-3 pb-3 pt-2 border-t border-border">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
            <AlertTriangle className="w-3 h-3 text-amber-500" />
            Over capacity ({overloaded.length})
          </div>
          <div className="space-y-1">
            {overloaded.slice(0, 4).map(({ e, active, c }) => (
              <div key={e.id} className="flex items-center gap-2 p-1.5 rounded-md border border-rose-500/20 bg-rose-500/5">
                <Users className="w-3 h-3 text-rose-500 shrink-0" />
                <div className="flex-1 min-w-0 text-[11px] font-medium truncate">{e.name}</div>
                <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 tabular-nums shrink-0">
                  {active} active of {e.maxWorkload} · {c.breached} past SLA
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

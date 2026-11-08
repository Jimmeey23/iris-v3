"use client";

import * as React from "react";
import { Flame, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { ALL_TICKETS, getStudio } from "@/lib/iris/sample-tickets";
import { useAppStore } from "@/lib/iris/store";
import { cn } from "@/lib/utils";

const DAY = 86400_000;

/**
 * What people are reporting most in the last 14 days, against the 14 before,
 * and where. Sits under Anomaly Detection on the Overview.
 */
export function IssueHotspots() {
  const { dataVersion, setTicketFilter, resetTicketFilters, setCurrentView } = useAppStore();
  const data = React.useMemo(() => {
    void dataVersion;
    const now = Date.now();
    const recent = ALL_TICKETS.filter((t) => now - new Date(t.createdAt).getTime() < 14 * DAY && !t.title.startsWith("[Recurrence check"));
    const prior = ALL_TICKETS.filter((t) => {
      const age = now - new Date(t.createdAt).getTime();
      return age >= 14 * DAY && age < 28 * DAY && !t.title.startsWith("[Recurrence check");
    });
    const key = (t: (typeof ALL_TICKETS)[number]) => t.subcategory || t.category || "Uncategorised";
    const count = (list: typeof ALL_TICKETS) => {
      const m = new Map<string, number>();
      for (const t of list) m.set(key(t), (m.get(key(t)) ?? 0) + 1);
      return m;
    };
    const cur = count(recent);
    const prev = count(prior);
    const issues = [...cur.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([issue, n]) => ({ issue, n, before: prev.get(issue) ?? 0 }));
    const studios = new Map<string, number>();
    for (const t of recent) {
      const s = getStudio(t)?.name ?? "No studio";
      studios.set(s, (studios.get(s) ?? 0) + 1);
    }
    return { issues, studios: [...studios.entries()].sort((a, b) => b[1] - a[1]), total: recent.length };
  }, [dataVersion]);
  const max = Math.max(1, ...data.issues.map((i) => i.n));

  const search = (q: string) => {
    resetTicketFilters();
    setTicketFilter("search", q);
    setCurrentView("all_tickets");
  };

  return (
    <div className="iris-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-orange-500/10 flex items-center justify-center">
          <Flame className="w-3.5 h-3.5 text-orange-500" />
        </div>
        <div className="flex-1">
          <div className="text-[13px] font-semibold">Issue hotspots</div>
          <div className="text-[10px] text-muted-foreground">Last 14 days vs the 14 before · {data.total} tickets</div>
        </div>
      </div>
      {data.issues.length === 0 ? (
        <div className="px-4 py-8 text-center text-[12px] text-muted-foreground">No tickets in the last 14 days.</div>
      ) : (
        <div className="p-4 space-y-4">
          <ul className="space-y-2.5">
            {data.issues.map((i) => {
              const delta = i.n - i.before;
              const Icon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
              return (
                <li key={i.issue}>
                  <button onClick={() => search(i.issue)} className="w-full text-left group">
                    <div className="flex items-center gap-2 text-[12px]">
                      <span className="truncate flex-1 group-hover:text-primary transition-colors">{i.issue}</span>
                      <span className="tabular-nums font-semibold">{i.n}</span>
                      <span className={cn("inline-flex items-center gap-0.5 text-[10px] tabular-nums w-12 justify-end",
                        delta > 0 ? "text-rose-600 dark:text-rose-400" : delta < 0 ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")}>
                        <Icon className="w-3 h-3" />{delta === 0 ? "same" : `${delta > 0 ? "+" : ""}${delta}`}
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-orange-400 to-rose-500" style={{ width: `${(i.n / max) * 100}%` }} />
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="pt-3 border-t border-border">
            <div className="text-[10px] uppercase tracking-[.12em] text-muted-foreground mb-2">By studio</div>
            <div className="flex h-2.5 rounded-full overflow-hidden bg-muted">
              {data.studios.map(([s, n], idx) => (
                <div key={s} title={`${s}: ${n}`} style={{ width: `${(n / data.total) * 100}%`, background: ["#007bff", "#00d4aa", "#ff9500", "#af52de", "#f43f5e", "#84cc16"][idx % 6] }} />
              ))}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
              {data.studios.map(([s, n], idx) => (
                <span key={s} className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                  <span className="w-2 h-2 rounded-full" style={{ background: ["#007bff", "#00d4aa", "#ff9500", "#af52de", "#f43f5e", "#84cc16"][idx % 6] }} />
                  {s} <span className="tabular-nums text-foreground">{n}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import * as React from "react";
import { useAppStore } from "@/lib/iris/store";
import { generateDailyBriefing } from "@/lib/iris/intelligence";
import { cn } from "@/lib/utils";
import {
  Sparkles, AlertTriangle, Clock, TrendingUp, Zap,
  ChevronRight, Coffee, Calendar, Download,
} from "lucide-react";
import { RelativeTime } from "./relative-time";

/**
 * Smart Daily Briefing widget — a personalized morning summary shown on the
 * Overview page. Generates a one-line headline plus sections for:
 *   - Top priorities (P0 tickets, SLA breach risks)
 *   - SLA at-risk tickets in your queue
 *   - New tickets in your queue (last 24h)
 *   - Stats summary (your open / resolved this week, team open / resolved)
 *   - Org-wide anomalies
 *
 * Uses the intelligence library to compute everything client-side from
 * ALL_TICKETS.
 */
export function DailyBriefing() {
  const { currentUser, selectTicket, setCurrentView } = useAppStore();
  const briefing = React.useMemo(
    () => generateDailyBriefing(currentUser),
    [currentUser],
  );

  const [expanded, setExpanded] = React.useState(true);

  return (
    <div className="iris-card iris-ai-border p-4">
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center shrink-0">
          <Coffee className="w-4 h-4 text-violet-600 dark:text-violet-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[13px] font-semibold">Your Daily Briefing</span>
            <span className="text-[9px] text-muted-foreground bg-muted px-1.5 py-px rounded">
              <RelativeTime date={briefing.generatedAt} />
            </span>
          </div>
          <p className="text-[12px] text-foreground/90 leading-snug">
            {briefing.headline}
          </p>
        </div>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-[11px] font-medium text-primary hover:underline shrink-0"
        >
          {expanded ? "Collapse" : "Expand"}
        </button>
      </div>

      {/* Stats row — always visible */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-3">
        <BriefingStat
          label="Your Queue"
          value={briefing.stats.yourOpenTickets}
          tone="primary"
          icon={Clock}
        />
        <BriefingStat
          label="Resolved (7d)"
          value={briefing.stats.yourResolvedThisWeek}
          tone="emerald"
          icon={TrendingUp}
        />
        <BriefingStat
          label="Critical"
          value={briefing.stats.criticalOpen}
          tone={briefing.stats.criticalOpen > 0 ? "rose" : "muted"}
          icon={AlertTriangle}
        />
        <BriefingStat
          label="Escalated 24h"
          value={briefing.stats.escalatedToday}
          tone={briefing.stats.escalatedToday > 0 ? "amber" : "muted"}
          icon={Zap}
        />
        <BriefingStat
          label="Team Open"
          value={briefing.stats.teamOpenTickets}
          tone="muted"
          icon={Clock}
        />
        <BriefingStat
          label="Team Resolved (7d)"
          value={briefing.stats.teamResolvedThisWeek}
          tone="emerald"
          icon={TrendingUp}
        />
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="space-y-3 pt-3 border-t border-border">
          {/* Top priorities */}
          {briefing.topPriorities.length > 0 && (
            <BriefingSection
              title="Top Priorities"
              icon={AlertTriangle}
              iconColor="text-rose-500"
            >
              <div className="space-y-1.5">
                {briefing.topPriorities.map((p) => (
                  <button
                    key={p.ticketId}
                    onClick={() => {
                      const ticket = useAppStore.getState().selectedTicketId;
                      setCurrentView("all_tickets");
                    }}
                    className="w-full flex items-start gap-2 p-2 rounded-md border border-border hover:border-primary/30 hover:bg-muted/30 transition-colors text-left"
                  >
                    <div className={cn(
                      "w-1.5 h-1.5 rounded-full mt-1.5 shrink-0",
                      p.severity === "critical" ? "bg-rose-500"
                      : p.severity === "high" ? "bg-amber-500"
                      : "bg-sky-500",
                    )} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-medium truncate">{p.title}</div>
                      <div className="text-[9px] text-muted-foreground">
                        <span className="font-mono">{p.ticketId}</span> · {p.reason}
                      </div>
                    </div>
                    <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0 mt-1" />
                  </button>
                ))}
              </div>
            </BriefingSection>
          )}

          {/* SLA at risk */}
          {briefing.slaAtRisk.length > 0 && (
            <BriefingSection
              title="SLA at Risk in Your Queue"
              icon={Clock}
              iconColor="text-amber-500"
            >
              <div className="space-y-1.5">
                {briefing.slaAtRisk.map((s) => (
                  <div
                    key={s.ticketId}
                    className="flex items-center gap-2 p-2 rounded-md border border-amber-500/20 bg-amber-500/5"
                  >
                    <div className="text-[10px] font-bold text-amber-600 dark:text-amber-400 tabular-nums shrink-0 w-10 text-right">
                      {s.riskScore}%
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-medium truncate">{s.title}</div>
                      <div className="text-[9px] text-muted-foreground">
                        <span className="font-mono">{s.ticketId}</span> · {s.hoursRemaining}h to SLA
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </BriefingSection>
          )}

          {/* Anomalies */}
          {briefing.anomalies.length > 0 && (
            <BriefingSection
              title="Anomalies Detected"
              icon={Sparkles}
              iconColor="text-violet-500"
            >
              <div className="space-y-1.5">
                {briefing.anomalies.map((a, i) => (
                  <div
                    key={i}
                    className={cn(
                      "p-2 rounded-md border text-[11px]",
                      a.severity === "critical"
                        ? "border-rose-500/30 bg-rose-500/5"
                        : a.severity === "warning"
                        ? "border-amber-500/30 bg-amber-500/5"
                        : "border-border bg-muted/30",
                    )}
                  >
                    <div className="font-medium">{a.title}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">{a.description}</div>
                  </div>
                ))}
              </div>
            </BriefingSection>
          )}

          {/* Export button */}
          <button
            onClick={() => {
              const text = `IRIS Daily Briefing - ${new Date(briefing.generatedAt).toLocaleString()}\n\n${briefing.headline}\n\nTop Priorities:\n${briefing.topPriorities.map((p) => `  - ${p.ticketId}: ${p.title} (${p.reason})`).join("\n")}\n\nSLA at Risk:\n${briefing.slaAtRisk.map((s) => `  - ${s.ticketId}: ${s.riskScore}% risk, ${s.hoursRemaining}h to SLA`).join("\n")}\n\nStats:\n  Your open: ${briefing.stats.yourOpenTickets}\n  Your resolved (7d): ${briefing.stats.yourResolvedThisWeek}\n  Critical open: ${briefing.stats.criticalOpen}\n  Escalated today: ${briefing.stats.escalatedToday}\n`;
              const blob = new Blob([text], { type: "text/plain" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `iris-briefing-${briefing.generatedAt.slice(0, 10)}.txt`;
              a.click();
              setTimeout(() => URL.revokeObjectURL(url), 1000);
            }}
            className="w-full mt-2 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md border border-border text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
          >
            <Download className="w-3 h-3" />
            Export briefing as .txt
          </button>
        </div>
      )}
    </div>
  );
}

function BriefingStat({
  label, value, tone, icon: Icon,
}: {
  label: string;
  value: number;
  tone: "primary" | "emerald" | "rose" | "amber" | "muted";
  icon: React.ComponentType<{ className?: string }>;
}) {
  const colorMap = {
    primary: "text-primary",
    emerald: "text-emerald-500",
    rose: "text-rose-500",
    amber: "text-amber-500",
    muted: "text-foreground",
  };
  return (
    <div className="p-2 rounded-md border border-border bg-muted/20">
      <Icon className={cn("w-2.5 h-2.5 mb-1", colorMap[tone])} />
      <div className={cn("text-[16px] font-bold tabular-nums leading-none", colorMap[tone])}>
        {value}
      </div>
      <div className="text-[8px] text-muted-foreground uppercase tracking-wider mt-0.5">
        {label}
      </div>
    </div>
  );
}

function BriefingSection({
  title, icon: Icon, iconColor, children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
        <Icon className={cn("w-3 h-3", iconColor)} />
        {title}
      </div>
      {children}
    </div>
  );
}

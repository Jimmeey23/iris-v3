"use client";

import * as React from "react";
import { detectAnomalies, type Anomaly } from "@/lib/iris/intelligence";
import { useAppStore } from "@/lib/iris/store";
import { cn } from "@/lib/utils";
import {
  AlertTriangle, TrendingUp, Sparkles, ChevronRight, Zap, Activity,
} from "lucide-react";

/**
 * Anomaly Detection feed — shows operational anomalies detected across
 * the ticket history (spikes, new patterns, drops in resolution rate).
 *
 * Compact widget for the Overview page; expands into a dedicated panel
 * when clicked.
 */
export function AnomalyFeed({ compact = false }: { compact?: boolean }) {
  const anomalies = React.useMemo(() => detectAnomalies(), []);
  const { selectTicket, setCurrentView } = useAppStore();

  if (anomalies.length === 0) {
    return (
      <div className="iris-card p-4 text-center">
        <Activity className="w-5 h-5 mx-auto text-emerald-500 mb-2" />
        <div className="text-[12px] font-medium">No anomalies detected</div>
        <div className="text-[10px] text-muted-foreground mt-0.5">
          Ticket patterns are within expected baselines.
        </div>
      </div>
    );
  }

  const displayed = compact ? anomalies.slice(0, 3) : anomalies;

  return (
    <div className="iris-card overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border flex items-center gap-2">
        <div className="w-6 h-6 rounded-md bg-amber-500/10 flex items-center justify-center">
          <Sparkles className="w-3 h-3 text-amber-500" />
        </div>
        <div className="flex-1">
          <div className="text-[12px] font-semibold">Anomaly Detection</div>
          <div className="text-[9px] text-muted-foreground">
            {anomalies.length} signal{anomalies.length === 1 ? "" : "s"} detected in the last 7 days
          </div>
        </div>
        {compact && anomalies.length > 3 && (
          <span className="text-[10px] text-muted-foreground">+{anomalies.length - 3} more</span>
        )}
      </div>
      <div className="p-2 space-y-1.5">
        {displayed.map((a) => (
          <AnomalyRow
            key={a.id}
            anomaly={a}
            onSelect={(ticketId) => {
              selectTicket(ticketId);
              setCurrentView("all_tickets");
            }}
          />
        ))}
      </div>
    </div>
  );
}

function AnomalyRow({
  anomaly, onSelect,
}: {
  anomaly: Anomaly;
  onSelect: (ticketId: string) => void;
}) {
  const tone =
    anomaly.severity === "critical"
      ? { bg: "bg-rose-500/5 border-rose-500/20", dot: "bg-rose-500", text: "text-rose-600 dark:text-rose-400" }
      : anomaly.severity === "warning"
      ? { bg: "bg-amber-500/5 border-amber-500/20", dot: "bg-amber-500", text: "text-amber-600 dark:text-amber-400" }
      : { bg: "bg-muted/30 border-border", dot: "bg-muted-foreground", text: "text-muted-foreground" };

  const Icon = anomaly.type === "spike" ? TrendingUp : anomaly.type === "new_pattern" ? Sparkles : Activity;

  return (
    <div className={cn("p-2.5 rounded-md border", tone.bg)}>
      <div className="flex items-start gap-2">
        <div className={cn("w-1.5 h-1.5 rounded-full mt-1.5 shrink-0", tone.dot)} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Icon className={cn("w-3 h-3 shrink-0", tone.text)} />
            <div className="text-[11px] font-semibold leading-tight truncate flex-1">
              {anomaly.title}
            </div>
            <span className={cn("text-[9px] font-bold uppercase tracking-wider shrink-0", tone.text)}>
              {anomaly.severity}
            </span>
          </div>
          <div className="text-[10px] text-muted-foreground leading-relaxed">
            {anomaly.description}
          </div>
          {anomaly.recommendation && (
            <div className="text-[10px] text-foreground/80 mt-1 italic">
              → {anomaly.recommendation}
            </div>
          )}
          {anomaly.sampleTicketIds.length > 0 && (
            <div className="flex items-center gap-1 mt-1.5 flex-wrap">
              <span className="text-[8px] text-muted-foreground uppercase tracking-wider">Sample:</span>
              {anomaly.sampleTicketIds.slice(0, 3).map((id) => {
                // We have IDs but we need the ticketId (IRIS-2026-XXXX). Just show the first 8 chars.
                return (
                  <button
                    key={id}
                    onClick={() => onSelect(id)}
                    className="text-[9px] font-mono text-primary hover:underline"
                  >
                    {id.slice(0, 12)}
                  </button>
                );
              })}
              <ChevronRight className="w-2.5 h-2.5 text-muted-foreground" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

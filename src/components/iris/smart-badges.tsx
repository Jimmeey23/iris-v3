"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { TrendingUp, Clock, RefreshCw, AlertTriangle, Zap } from "lucide-react";
import { type Ticket } from "@/lib/iris/sample-tickets";
import {
  predictBreachRisk,
  predictResolutionTime,
  getRecurrenceForTicket,
} from "@/lib/iris/intelligence";

/**
 * Smart badges that decorate a ticket card or detail view with
 * intelligence signals:
 *
 *   - BreachRiskBadge: probability of SLA breach (0-100%)
 *   - ResolutionTimeBadge: estimated time to resolve
 *   - RecurrenceBadge: indicates if this ticket is part of a recurring pattern
 *
 * Each badge has a `variant` prop for compact ("xs") or normal display,
 * and shows a tooltip-style title with the reason.
 */

interface BadgeProps {
  ticket: Ticket;
  variant?: "xs" | "sm";
  className?: string;
}

export function BreachRiskBadge({ ticket, variant = "sm", className }: BadgeProps) {
  const risk = React.useMemo(() => predictBreachRisk(ticket), [ticket]);
  // Don't show for low-risk or already-resolved tickets
  if (risk.level === "low" || ticket.status === "resolved" || ticket.status === "closed") return null;

  const color =
    risk.level === "high" ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30"
    : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30";

  const sizeCls = variant === "xs" ? "text-[8px] px-1 py-px" : "text-[9px] px-1.5 py-0.5";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded font-bold border tabular-nums whitespace-nowrap",
        color, sizeCls, className,
      )}
      title={risk.reason + " - " + risk.factors.filter((f) => f.impact > 0).map((f) => f.label).join("; ")}
    >
      <AlertTriangle className={variant === "xs" ? "w-2 h-2" : "w-2.5 h-2.5"} />
      {risk.score}% breach
    </span>
  );
}

export function ResolutionTimeBadge({ ticket, variant = "sm", className }: BadgeProps) {
  const est = React.useMemo(() => predictResolutionTime(ticket), [ticket]);
  if (ticket.status === "resolved" || ticket.status === "closed") return null;

  const sizeCls = variant === "xs" ? "text-[8px] px-1 py-px" : "text-[9px] px-1.5 py-0.5";

  // Confidence dot color
  const dotColor =
    est.confidence === "high" ? "bg-emerald-500"
    : est.confidence === "medium" ? "bg-amber-500"
    : "bg-rose-500";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded font-semibold border bg-muted/60 text-muted-foreground border-border tabular-nums whitespace-nowrap",
        sizeCls, className,
      )}
      title={`ETA ${est.label} · confidence: ${est.confidence} · based on ${est.sampleSize} similar resolved ticket${est.sampleSize === 1 ? "" : "s"}`}
    >
      <Clock className={variant === "xs" ? "w-2 h-2" : "w-2.5 h-2.5"} />
      {est.label}
      <span className={cn("inline-block rounded-full", dotColor)} style={{ width: 5, height: 5 }} />
    </span>
  );
}

export function RecurrenceBadge({ ticket, variant = "sm", className }: BadgeProps) {
  const pattern = React.useMemo(() => getRecurrenceForTicket(ticket), [ticket]);
  if (!pattern || pattern.count < 2) return null;

  const color =
    pattern.severity === "high" ? "bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/30"
    : pattern.severity === "medium" ? "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30"
    : "bg-muted text-muted-foreground border-border";

  const sizeCls = variant === "xs" ? "text-[8px] px-1 py-px" : "text-[9px] px-1.5 py-0.5";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded font-semibold border whitespace-nowrap",
        color, sizeCls, className,
      )}
      title={`Part of a recurring pattern: ${pattern.count} ${pattern.category} ticket${pattern.count === 1 ? "" : "s"} at ${pattern.studioName || "this studio"} in the last 60 days. ${pattern.recommendation}`}
    >
      <RefreshCw className={variant === "xs" ? "w-2 h-2" : "w-2.5 h-2.5"} />
      ×{pattern.count} recurring
    </span>
  );
}

/** Convenience: render all three smart badges in a row, for ticket cards/lists. */
export function SmartBadges({ ticket, variant = "sm", className }: BadgeProps) {
  return (
    <div className={cn("inline-flex items-center gap-1 flex-wrap", className)}>
      <BreachRiskBadge ticket={ticket} variant={variant} />
      <ResolutionTimeBadge ticket={ticket} variant={variant} />
      <RecurrenceBadge ticket={ticket} variant={variant} />
    </div>
  );
}

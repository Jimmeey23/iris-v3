"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Priority, PRIORITY_CONFIG, TicketStatus, STATUS_CONFIG, SLAStatus, SLA_STATUS_CONFIG, STUDIO_MAP, DEPT_MAP } from "@/lib/iris/types";
import { formatTimeRemaining } from "@/lib/iris/utils";
import { Clock } from "lucide-react";

export function PriorityBadge({ priority, size = "sm" }: { priority: Priority; size?: "sm" | "xs" }) {
  const config = PRIORITY_CONFIG[priority];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded font-semibold tabular-nums",
        config.bg,
        config.text,
        size === "sm" ? "px-1.5 py-px text-[10px]" : "px-1 py-px text-[9px]"
      )}
    >
      {priority}
    </span>
  );
}

export function StatusBadge({ status, size = "sm" }: { status: TicketStatus; size?: "sm" | "xs" }) {
  const config = STATUS_CONFIG[status];
  const isClosed = status === "resolved" || status === "closed";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded font-medium",
        config.bg,
        config.text,
        isClosed && "opacity-50",
        size === "sm" ? "px-1.5 py-px text-[10px]" : "px-1 py-px text-[9px]"
      )}
    >
      <span className={cn("w-1 h-1 rounded-full", config.dot)} />
      {config.label}
    </span>
  );
}

export function SLABadge({ status, targetDate }: { status: SLAStatus; targetDate?: string | Date }) {
  const config = SLA_STATUS_CONFIG[status];
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded font-medium px-1.5 py-px text-[10px]",
        config.bg,
        config.text
      )}
    >
      <Clock className="w-2.5 h-2.5" />
      {mounted && targetDate ? formatTimeRemaining(targetDate) : config.label}
    </span>
  );
}

export function SLAProgressBar({ createdAt, targetDate, breached }: { createdAt: string | Date; targetDate: string | Date; breached?: boolean }) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[9px] font-medium">
          <span className="text-muted-foreground">—</span>
          <span className="text-muted-foreground">—</span>
        </div>
        <div className="h-0.5 rounded-full bg-muted overflow-hidden" />
      </div>
    );
  }

  const created = typeof createdAt === "string" ? new Date(createdAt) : createdAt;
  const target = typeof targetDate === "string" ? new Date(targetDate) : targetDate;
  const now = new Date();
  const total = target.getTime() - created.getTime();
  const elapsed = now.getTime() - created.getTime();
  const pct = Math.min(100, Math.max(0, (elapsed / total) * 100));
  const isBreached = breached || elapsed > total;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[9px] font-medium">
        <span className="text-muted-foreground">{isBreached ? "Breached" : `${Math.round(pct)}%`}</span>
        <span className={cn(isBreached ? "text-rose-500" : pct > 80 ? "text-amber-500" : "text-emerald-500")}>
          {formatTimeRemaining(target)}
        </span>
      </div>
      <div className="h-0.5 rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            isBreached ? "bg-rose-500" : pct > 80 ? "bg-amber-500" : "bg-emerald-500"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function StudioBadge({ studioCode, showCity }: { studioCode: string; showCity?: boolean }) {
  const studio = STUDIO_MAP[studioCode];
  if (!studio) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded px-1.5 py-px text-[10px] font-medium bg-muted text-muted-foreground">
      {studio.name}
      {showCity && <span className="opacity-60">· {studio.city}</span>}
    </span>
  );
}

export function DepartmentBadge({ departmentCode }: { departmentCode: string }) {
  const dept = DEPT_MAP[departmentCode];
  if (!dept) return null;
  return (
    <span className="inline-flex items-center rounded px-1.5 py-px text-[10px] font-medium text-muted-foreground">
      {dept.name}
    </span>
  );
}

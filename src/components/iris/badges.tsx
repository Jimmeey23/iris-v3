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
        "inline-flex items-center gap-1 rounded-md font-semibold tabular-nums",
        config.bg,
        config.text,
        size === "sm" ? "px-1.5 py-0.5 text-[11px]" : "px-1 py-0.5 text-[10px]"
      )}
    >
      <span className={cn("w-1 h-1 rounded-full bg-current opacity-80")} />
      {priority}
    </span>
  );
}

export function StatusBadge({ status, size = "sm" }: { status: TicketStatus; size?: "sm" | "xs" }) {
  const config = STATUS_CONFIG[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md font-medium",
        config.bg,
        config.text,
        size === "sm" ? "px-1.5 py-0.5 text-[11px]" : "px-1 py-0.5 text-[10px]"
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full", config.dot)} />
      {config.label}
    </span>
  );
}

export function SLABadge({ status, targetDate }: { status: SLAStatus; targetDate?: string | Date }) {
  const config = SLA_STATUS_CONFIG[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md font-medium px-1.5 py-0.5 text-[11px]",
        config.bg,
        config.text
      )}
    >
      <Clock className="w-3 h-3" />
      {targetDate ? formatTimeRemaining(targetDate) : config.label}
    </span>
  );
}

export function SLAProgressBar({ createdAt, targetDate, breached }: { createdAt: string | Date; targetDate: string | Date; breached?: boolean }) {
  const created = typeof createdAt === "string" ? new Date(createdAt) : createdAt;
  const target = typeof targetDate === "string" ? new Date(targetDate) : targetDate;
  const now = new Date();
  const total = target.getTime() - created.getTime();
  const elapsed = now.getTime() - created.getTime();
  const pct = Math.min(100, Math.max(0, (elapsed / total) * 100));
  const isBreached = breached || elapsed > total;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px] font-medium">
        <span className="text-muted-foreground">{isBreached ? "Breached" : `${Math.round(pct)}% elapsed`}</span>
        <span className={cn(isBreached ? "text-rose-500" : pct > 80 ? "text-amber-500" : "text-emerald-500")}>
          {formatTimeRemaining(target)}
        </span>
      </div>
      <div className="h-1 rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            isBreached
              ? "bg-rose-500"
              : pct > 80
              ? "bg-amber-500"
              : "bg-gradient-to-r from-emerald-500 to-teal-500"
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
    <span className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium">
      <span className="w-1 h-1 rounded-full bg-violet-500" />
      {studio.name}
      {showCity && <span className="text-muted-foreground">· {studio.city}</span>}
    </span>
  );
}

export function DepartmentBadge({ departmentCode }: { departmentCode: string }) {
  const dept = DEPT_MAP[departmentCode];
  if (!dept) return null;
  return (
    <span className="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
      {dept.name}
    </span>
  );
}

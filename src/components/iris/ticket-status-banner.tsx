"use client";

import { AlertTriangle, CheckCircle2, Clock, Info, Lock, PlayCircle, Hourglass } from "lucide-react";
import type { Ticket } from "@/lib/iris/sample-tickets";
import type { TicketStatus } from "@/lib/iris/types";
import { formatDateTime } from "@/lib/iris/utils";
import { cn } from "@/lib/utils";

const LOOK: Record<TicketStatus, { label: string; hint: string; icon: typeof Clock; cls: string; iconCls: string }> = {
  open: {
    label: "OPEN",
    hint: "Not started yet. Waiting for the owner to pick it up.",
    icon: Clock,
    cls: "border-sky-500 bg-sky-500/10",
    iconCls: "bg-sky-500 text-white",
  },
  in_progress: {
    label: "IN PROGRESS",
    hint: "Being worked on. Not resolved yet.",
    icon: PlayCircle,
    cls: "border-violet-500 bg-violet-500/10",
    iconCls: "bg-violet-500 text-white",
  },
  awaiting_response: {
    label: "AWAITING RESPONSE",
    hint: "Paused until someone replies. Not resolved yet.",
    icon: Hourglass,
    cls: "border-amber-500 bg-amber-500/10",
    iconCls: "bg-amber-500 text-white",
  },
  escalated: {
    label: "ESCALATED",
    hint: "Raised to management. Needs urgent attention.",
    icon: AlertTriangle,
    cls: "border-red-500 bg-red-500/10",
    iconCls: "bg-red-500 text-white",
  },
  resolved: {
    label: "RESOLVED",
    hint: "Work is done. No further action needed.",
    icon: CheckCircle2,
    cls: "border-emerald-500 bg-emerald-500/10",
    iconCls: "bg-emerald-500 text-white",
  },
  closed: {
    label: "CLOSED",
    hint: "Finished and closed. No further action needed.",
    icon: Lock,
    cls: "border-slate-500 bg-slate-500/10",
    iconCls: "bg-slate-600 text-white",
  },
};

/** Large, unmistakable status strip shown at the top of every ticket. */
export function TicketStatusBanner({ ticket, status, infoOnly }: { ticket: Ticket; status: TicketStatus; infoOnly: boolean }) {
  if (infoOnly) {
    return (
      <div className="rounded-xl border-2 border-indigo-500 bg-indigo-500/10 p-4 flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-indigo-500 text-white flex items-center justify-center shrink-0">
          <Info className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <div className="text-[16px] font-bold tracking-wide text-indigo-700 dark:text-indigo-300">FOR INFORMATION ONLY</div>
          <div className="text-[12px] text-muted-foreground">
            Shared with the department admins to read. Not assigned to anyone, no SLA, and nothing to resolve.
          </div>
        </div>
      </div>
    );
  }
  const look = LOOK[status] ?? LOOK.open;
  const Icon = look.icon;
  const done = status === "resolved" || status === "closed";
  return (
    <div className={cn("rounded-xl border-2 p-4 flex items-start gap-3", look.cls)}>
      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0", look.iconCls)}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Status</span>
          <span className="text-[18px] font-bold tracking-wide">{look.label}</span>
          {done && ticket.resolvedAt && (
            <span className="text-[11px] text-muted-foreground">on {formatDateTime(ticket.resolvedAt)}</span>
          )}
        </div>
        <div className="text-[12px] text-muted-foreground">{look.hint}</div>
        {done && ticket.resolutionSummary && (
          <div className="mt-2 text-[12px] bg-background/60 border border-border rounded-lg p-2.5 whitespace-pre-line line-clamp-6">
            <span className="font-semibold">Resolution: </span>
            {ticket.resolutionSummary}
          </div>
        )}
      </div>
    </div>
  );
}

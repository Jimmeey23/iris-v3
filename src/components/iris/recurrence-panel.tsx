"use client";

import * as React from "react";
import { toast } from "sonner";
import { CheckCircle2, Loader2, RotateCcw, CalendarClock, XCircle, Ban, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { api, upsertTicket } from "@/lib/iris/live-data";

type Check = {
  id: string;
  kind: "bike" | "mic";
  cycle: number;
  step: number;
  day_offset: number;
  due_at: string;
  status: "scheduled" | "open" | "passed" | "failed" | "cancelled";
  outcome_note: string | null;
  parent_ticket: string;
  check_ticket: string | null;
  is_this_ticket: boolean;
};

const STATUS: Record<Check["status"], { label: string; cls: string; icon: React.ComponentType<{ className?: string }> }> = {
  scheduled: { label: "Scheduled", cls: "text-sky-600 dark:text-sky-400 bg-sky-500/10", icon: CalendarClock },
  open: { label: "Due now", cls: "text-amber-700 dark:text-amber-300 bg-amber-500/10", icon: CalendarClock },
  passed: { label: "No recurrence", cls: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10", icon: CheckCircle2 },
  failed: { label: "Fault returned", cls: "text-rose-600 dark:text-rose-400 bg-rose-500/10", icon: XCircle },
  cancelled: { label: "Cancelled", cls: "text-muted-foreground bg-muted", icon: Ban },
};

const day = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

async function refreshTicket(id: string) {
  try {
    upsertTicket((await api(`/api/tickets/${encodeURIComponent(id)}`)).ticket);
  } catch {
    // The list refresh will catch up; the outcome itself is already saved.
  }
}

/**
 * Bike / microphone recurrence checks. On a check ticket: record the outcome.
 * On the original repair ticket: the schedule and history of its checks.
 * Renders nothing for any other ticket.
 */
export function RecurrencePanel({ ticketId, readOnly }: { ticketId: string; readOnly?: boolean }) {
  const [checks, setChecks] = React.useState<Check[] | null>(null);
  const [mode, setMode] = React.useState<"idle" | "returned">("idle");
  const [note, setNote] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      setChecks((await api<{ checks: Check[] }>(`/api/tickets/${encodeURIComponent(ticketId)}/recurrence`)).checks);
    } catch {
      setChecks([]);
    }
  }, [ticketId]);
  React.useEffect(() => { void Promise.resolve().then(load); }, [load]);

  if (!checks?.length) return null;
  const mine = checks.find((c) => c.is_this_ticket);

  const record = async (outcome: "clear" | "returned") => {
    setBusy(true);
    try {
      const r = await api<{ parent_ticket: string; parent_ticket_id: string; next_day: number | null }>(
        `/api/tickets/${encodeURIComponent(ticketId)}/recurrence`,
        { method: "POST", json: { outcome, note } },
      );
      toast.success(
        outcome === "clear"
          ? r.next_day ? `Recorded. Next check on day ${r.next_day}.` : "Recorded. All checks passed."
          : `Recorded. ${r.parent_ticket} has been reopened.`,
      );
      setMode("idle");
      setNote("");
      await Promise.all([load(), refreshTicket(ticketId), refreshTicket(r.parent_ticket_id)]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't record the outcome");
    } finally {
      setBusy(false);
    }
  };

  // ── On the check ticket itself ──────────────────────────────────────────────
  if (mine) {
    const what = mine.kind === "bike" ? "bike" : "microphone";
    return (
      <div className="iris-card p-4 border border-amber-500/30">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="text-[13px] font-semibold">Day-{mine.day_offset} recurrence check</div>
          <span className={cn("ml-auto px-2 py-0.5 rounded text-[10px] font-semibold", STATUS[mine.status].cls)}>{STATUS[mine.status].label}</span>
        </div>
        <p className="text-[12px] text-muted-foreground mb-3">
          Has the {what} fault from <span className="font-mono">{mine.parent_ticket}</span> come back? If it has, the original ticket reopens for the repair owner.
        </p>
        {mine.status !== "open" ? (
          mine.outcome_note && <p className="text-[12px]"><span className="text-muted-foreground">Note: </span>{mine.outcome_note}</p>
        ) : readOnly ? null : mode === "idle" ? (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" className="h-8 text-[12px] bg-emerald-600 hover:bg-emerald-700 text-white" disabled={busy} onClick={() => record("clear")}>
              {busy ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />}
              No recurrence
            </Button>
            <Button size="sm" variant="outline" className="h-8 text-[12px] border-rose-500/40 text-rose-600 hover:bg-rose-500/10" disabled={busy} onClick={() => setMode("returned")}>
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
              Fault returned
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <label className="block">
              <span className="text-[11px] font-medium text-muted-foreground">What came back? This goes on the original ticket.</span>
              <textarea
                autoFocus
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-[12px] focus:outline-none focus:ring-2 focus:ring-ring/40"
                placeholder={mine.kind === "bike" ? "e.g. Clicking on climbs again since Tuesday" : "e.g. Drops out mid-class on channel 2"}
              />
            </label>
            <div className="flex gap-2">
              <Button size="sm" className="h-8 text-[12px] bg-rose-600 hover:bg-rose-700 text-white" disabled={busy || !note.trim()} onClick={() => record("returned")}>
                {busy ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5 mr-1.5" />}
                Reopen {mine.parent_ticket}
              </Button>
              <Button size="sm" variant="ghost" className="h-8 text-[12px]" disabled={busy} onClick={() => { setMode("idle"); setNote(""); }}>Cancel</Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── On the original repair ticket ──────────────────────────────────────────
  return (
    <div className="iris-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg bg-sky-500/10 flex items-center justify-center">
          <ShieldCheck className="w-4 h-4 text-sky-600 dark:text-sky-400" />
        </div>
        <div className="text-[13px] font-semibold">Recurrence checks</div>
        <span className="text-[11px] text-muted-foreground">({checks[0].kind === "bike" ? "bike" : "microphone"})</span>
      </div>
      <ol className="space-y-1.5">
        {checks.map((c) => {
          const s = STATUS[c.status];
          return (
            <li key={c.id} className="flex items-center gap-2 text-[12px]">
              <s.icon className={cn("w-3.5 h-3.5 shrink-0", s.cls.split(" ").filter((x) => x.startsWith("text-")).join(" "))} />
              <span className="font-medium">Day {c.day_offset}</span>
              {checks.some((x) => x.cycle > 1) && <span className="text-[10px] text-muted-foreground">round {c.cycle}</span>}
              <span className="text-muted-foreground">· {c.status === "scheduled" ? `due ${day(c.due_at)}` : s.label}</span>
              {c.check_ticket && <span className="font-mono text-[10px] text-muted-foreground">{c.check_ticket}</span>}
              {c.outcome_note && <span className="text-muted-foreground truncate">— {c.outcome_note}</span>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

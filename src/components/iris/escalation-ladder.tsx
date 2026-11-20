"use client";

/**
 * Escalation ladder panel for the ticket workspace sidebar.
 *
 * Shows the full chain (owner → reporting manager → department head → admin),
 * where the ticket stands on it, every escalation that already happened (from
 * escalation_log, automatic or manual), and a live countdown to the next
 * automatic escalation. Admins and managers can escalate / de-escalate one
 * level with a required reason, which lands in the same audit trail.
 */

import * as React from "react";
import { toast } from "sonner";
import { ticketsApi } from "@/lib/iris/live-data";
import { formatRelativeTime } from "@/lib/iris/utils";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowUpCircle, ArrowDownCircle, ChevronDown, ChevronUp, Flame, ShieldAlert, Timer, User } from "lucide-react";

type Data = Awaited<ReturnType<typeof ticketsApi.escalation>>;

function countdown(toIso: string, now: number): { text: string; overdue: boolean } {
  const ms = new Date(toIso).getTime() - now;
  const overdue = ms <= 0;
  const abs = Math.abs(ms);
  const d = Math.floor(abs / 86_400_000);
  const h = Math.floor((abs % 86_400_000) / 3_600_000);
  const m = Math.floor((abs % 3_600_000) / 60_000);
  const parts = d ? `${d}d ${h}h` : h ? `${h}h ${m}m` : `${m}m`;
  return { text: overdue ? `due ${parts} ago` : `in ${parts}`, overdue };
}

export function EscalationLadder({
  ticketId,
  level,
  canManage,
  readOnly,
  ticketClosed,
  refreshKey,
}: {
  ticketId: string;
  level: number;
  refreshKey?: string;
  canManage: boolean;
  readOnly: boolean;
  ticketClosed: boolean;
}) {
  const [data, setData] = React.useState<Data | null>(null);
  const [now, setNow] = React.useState(() => Date.now());
  const [busy, setBusy] = React.useState(false);
  const [move, setMove] = React.useState<"up" | "down" | null>(null);
  const [reason, setReason] = React.useState("");
  const [showHistory, setShowHistory] = React.useState(false);

  const load = React.useCallback(() => {
    ticketsApi.escalation(ticketId).then(setData).catch(() => {});
  }, [ticketId]);
  React.useEffect(load, [load, level, refreshKey]);
  React.useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const cur = data?.level ?? level;
  const maxLevel = data?.maxLevel ?? 3;

  const apply = async () => {
    if (!move) return;
    const next = move === "up" ? cur + 1 : cur - 1;
    setBusy(true);
    try {
      await ticketsApi.update(ticketId, {
        escalationLevel: next,
        escalationReason: reason.trim() || undefined,
        ...(move === "up" ? { status: "escalated" } : {}),
      });
      toast.success(move === "up" ? `Escalated to level ${next}` : `De-escalated to level ${next}`);
      setMove(null);
      setReason("");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't change the escalation level");
    } finally {
      setBusy(false);
    }
  };

  const cd = data?.nextEscalationAt && !ticketClosed ? countdown(data.nextEscalationAt, now) : null;
  const breached = data?.slaStatus === "breached";

  return (
    <div className="iris-card">
      <div className="px-3 py-2 border-b border-border flex items-center gap-1.5">
        <ShieldAlert className="w-3 h-3 text-muted-foreground" />
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Escalation Ladder</div>
        <span className={cn("ml-auto text-[11px] font-bold tabular-nums px-1.5 py-px rounded", cur > 0 ? "bg-rose-500/10 text-rose-600" : "bg-emerald-500/10 text-emerald-600")}>
          L{cur}
        </span>
      </div>
      <div className="p-3 space-y-2">
        {/* Rungs */}
        <div className="space-y-1">
          {(data?.ladder ?? [
            { level: 0, role: "owner", name: null },
            { level: 1, role: "reporting manager", name: null },
            { level: 2, role: "department head", name: null },
            { level: 3, role: "admin", name: null },
          ]).map((rung) => {
            // A resolved/closed ticket keeps its level for the record, but nothing is "burning".
            const active = rung.level === cur && !ticketClosed;
            const passed = rung.level < cur;
            return (
              <div
                key={rung.level}
                className={cn(
                  "flex items-center gap-2 rounded-md border px-2 py-1.5 text-[11px]",
                  active ? "border-rose-500/50 bg-rose-500/5" : passed ? "border-border bg-muted/30 opacity-60" : "border-border bg-card",
                )}
              >
                <span className={cn("w-5 text-center font-bold tabular-nums", active ? "text-rose-600" : "text-muted-foreground")}>
                  L{rung.level}
                </span>
                <span className="capitalize text-muted-foreground">{rung.role}</span>
                <span className="ml-auto flex items-center gap-1 font-medium truncate max-w-[45%]">
                  {rung.name && <User className="w-3 h-3 text-muted-foreground shrink-0" />}
                  {rung.name ?? (rung.level === 0 ? "Unassigned" : rung.role === "admin" ? "Any admin" : "Not set")}
                </span>
                {active && <Flame className="w-3 h-3 text-rose-500 shrink-0" />}
              </div>
            );
          })}
        </div>

        {/* Next automatic escalation */}
        {cd && breached && (
          <div className={cn("flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[11px]", cd.overdue ? "bg-rose-500/10 text-rose-600" : "bg-amber-500/10 text-amber-700 dark:text-amber-400")}>
            <Timer className="w-3 h-3 shrink-0" />
            <span>
              Auto-escalation to <b>L{cur + 1}</b> {cd.text}
            </span>
          </div>
        )}
        {!breached && !ticketClosed && cur < maxLevel && (
          <div className="text-[10px] text-muted-foreground">
            Escalates automatically {data?.afterBreachHours ?? 4}h per level past a breached SLA target.
          </div>
        )}

        {/* Manual controls */}
        {canManage && !readOnly && !ticketClosed && (
          <div className="flex gap-1.5">
            <Button size="sm" variant="outline" className="h-7 flex-1 text-[11px]" disabled={busy || cur >= maxLevel} onClick={() => setMove(move === "up" ? null : "up")}>
              <ArrowUpCircle className="w-3 h-3 mr-1" /> Escalate
            </Button>
            <Button size="sm" variant="outline" className="h-7 flex-1 text-[11px]" disabled={busy || cur <= 0} onClick={() => setMove(move === "down" ? null : "down")}>
              <ArrowDownCircle className="w-3 h-3 mr-1" /> De-escalate
            </Button>
          </div>
        )}
        {move && (
          <div className="space-y-1.5">
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={move === "up" ? "Why is this being escalated?" : "Why is this being de-escalated?"}
              className="text-[11px] min-h-[48px]"
              autoFocus
            />
            <div className="flex gap-1.5">
              <Button size="sm" className="h-7 text-[11px]" disabled={busy || reason.trim().length < 5} onClick={apply}>
                Confirm {move === "up" ? `L${cur + 1}` : `L${cur - 1}`}
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={() => { setMove(null); setReason(""); }}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* History */}
        {(data?.history.length ?? 0) > 0 && (
          <div>
            <button
              type="button"
              className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
              onClick={() => setShowHistory((v) => !v)}
            >
              {showHistory ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              History ({data!.history.length})
            </button>
            {showHistory && (
              <div className="mt-1.5 space-y-1.5 max-h-[160px] overflow-y-auto">
                {data!.history.map((h, i) => (
                  <div key={i} className="rounded-md border border-border bg-muted/20 p-2 text-[10px]">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold tabular-nums">L{h.level}</span>
                      <span className={cn("px-1 py-px rounded font-medium", h.automatic ? "bg-violet-500/10 text-violet-600" : "bg-sky-500/10 text-sky-600")}>
                        {h.automatic ? "auto" : "manual"}
                      </span>
                      {h.toName && <span className="text-muted-foreground truncate">→ {h.toName}</span>}
                      <span className="ml-auto text-muted-foreground shrink-0">{formatRelativeTime(h.at)}</span>
                    </div>
                    <div className="mt-0.5 text-muted-foreground leading-snug">{h.reason}</div>
                    {h.byName && !h.automatic && <div className="mt-0.5 text-muted-foreground/80">by {h.byName}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

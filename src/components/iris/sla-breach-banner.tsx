"use client";

import * as React from "react";
import { AlertTriangle, ChevronRight, Clock, X, Check } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/iris/live-data";
import { useAppStore } from "@/lib/iris/store";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Breach = {
  id: string;
  ticketId: string | null;
  title: string;
  priority: string;
  slaResolutionTarget: string | null;
  pendingRequest: { id: string; hours: number; requestedAt: string } | null;
};
type Approval = {
  id: string;
  ticket: string;
  ticketRef: string | null;
  title: string;
  hours: number;
  reason: string;
  requesterName: string | null;
  requestedAt: string;
};

const POLL_MS = 60_000;
const DISMISS_KEY = "iris.slaBanner.dismissed";
const HOUR_OPTIONS = [1, 2, 4, 8, 24, 48];

function lateBy(target: string | null, now: number) {
  if (!target) return "past SLA";
  const mins = Math.max(0, Math.floor((now - new Date(target).getTime()) / 60_000));
  const d = Math.floor(mins / 1440);
  const h = Math.floor((mins % 1440) / 60);
  const m = mins % 60;
  return `+${d ? `${d}d ` : ""}${d || h ? `${h}h ` : ""}${m}m late`;
}

function readDismissed(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(DISMISS_KEY) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}
function writeDismissed(s: Set<string>) {
  try {
    localStorage.setItem(DISMISS_KEY, JSON.stringify([...s].slice(-300)));
  } catch {
    /* storage unavailable: dismissals last for this tab only */
  }
}

/**
 * Sticky red banner on every screen while the signed-in owner has tickets past SLA.
 * The headline can't be dismissed: it stays until every ticket is resolved or back
 * within SLA after an approved extension. Individual ticket rows can be closed.
 * The list has a fixed max height and scrolls, so it never covers the page.
 */
export function SlaBreachBanner() {
  const selectTicket = useAppStore((s) => s.selectTicket);
  const [breaches, setBreaches] = React.useState<Breach[]>([]);
  const [approvals, setApprovals] = React.useState<Approval[]>([]);
  // Banner renders nothing until the first fetch lands, so reading storage here can't cause a hydration mismatch.
  const [dismissed, setDismissed] = React.useState<Set<string>>(() => (typeof window === "undefined" ? new Set() : readDismissed()));
  const [now, setNow] = React.useState(() => Date.now());
  const [askFor, setAskFor] = React.useState<Breach | null>(null);
  const [tick, setTick] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;
    api<{ breaches: Breach[]; pendingApprovals: Approval[] }>("/api/sla-extensions")
      .then((d) => {
        if (cancelled) return;
        setBreaches(d.breaches ?? []);
        setApprovals(d.pendingApprovals ?? []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [tick]);

  React.useEffect(() => {
    const refresh = () => {
      setNow(Date.now());
      setTick((t) => t + 1);
    };
    const iv = window.setInterval(refresh, POLL_MS);
    const clock = window.setInterval(() => setNow(Date.now()), 30_000);
    const onFocus = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onFocus);
    window.addEventListener("iris:sla-refresh", refresh);
    return () => {
      window.clearInterval(iv);
      window.clearInterval(clock);
      document.removeEventListener("visibilitychange", onFocus);
      window.removeEventListener("iris:sla-refresh", refresh);
    };
  }, []);

  // A dismissal is tied to the SLA target, so a ticket that breaches again shows again.
  const keyOf = (b: Breach) => `${b.id}:${b.slaResolutionTarget ?? ""}`;
  const visible = breaches.filter((b) => !dismissed.has(keyOf(b)));
  const dismiss = (b: Breach) => {
    const next = new Set(dismissed);
    next.add(keyOf(b));
    setDismissed(next);
    writeDismissed(next);
  };

  const decide = async (a: Approval, decision: "approved" | "rejected") => {
    try {
      await api(`/api/sla-extensions/${a.id}`, { method: "POST", json: { decision } });
      toast.success(decision === "approved" ? `Added ${a.hours}h to ${a.ticketRef ?? "the ticket"}` : "Request declined");
      setTick((t) => t + 1);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  if (!breaches.length && !approvals.length) return null;

  return (
    <>
      {breaches.length > 0 && (
        <div role="alert" className="iris-sla-banner relative z-10 shrink-0 text-white bg-gradient-to-r from-red-800 to-red-600">
          <div className="flex items-center gap-3 px-5 py-2.5 flex-wrap">
            <span className="iris-sla-siren grid place-items-center w-8 h-8 rounded-full bg-white/20 shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </span>
            <div className="flex-1 min-w-[220px]">
              <div className="text-[14px] font-semibold leading-tight">
                {breaches.length} of your ticket{breaches.length === 1 ? " has" : "s have"} breached SLA
              </div>
              <div className="text-[11.5px] text-white/85">
                Reply and resolve, or ask your reporting manager for more time. This stays until every ticket is resolved or back within SLA.
              </div>
            </div>
            <button
              onClick={() => selectTicket(breaches[0].id)}
              className="inline-flex items-center gap-1 rounded-lg bg-white text-red-800 px-3 py-1.5 text-[12px] font-semibold hover:bg-white/90"
            >
              Open first breached ticket <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          {visible.length > 0 && (
            <ul className="max-h-[132px] overflow-y-auto bg-black/20 px-5 py-1 iris-sla-scroll">
              {visible.map((b) => (
                <li key={b.id} className="flex items-center gap-3 py-1.5 text-[12px] border-t border-white/15 first:border-t-0">
                  <span className="font-mono text-white/80 shrink-0">{b.ticketId ?? b.id.slice(0, 8)}</span>
                  <span className="flex-1 min-w-0 truncate">{b.title}</span>
                  <span className="shrink-0 rounded-full bg-white text-red-700 px-2 py-0.5 text-[11px] font-bold tabular-nums">
                    {lateBy(b.slaResolutionTarget, now)}
                  </span>
                  <button
                    onClick={() => selectTicket(b.id)}
                    className="shrink-0 rounded-md bg-white text-red-800 px-2.5 py-1 text-[11px] font-semibold hover:bg-white/90"
                  >
                    Respond
                  </button>
                  {b.pendingRequest ? (
                    <span className="shrink-0 inline-flex items-center gap-1 rounded-md border border-white/50 px-2.5 py-1 text-[11px]">
                      <Clock className="w-3 h-3" /> +{b.pendingRequest.hours}h awaiting approval
                    </span>
                  ) : (
                    <button
                      onClick={() => setAskFor(b)}
                      className="shrink-0 rounded-md border border-white/70 px-2.5 py-1 text-[11px] font-semibold hover:bg-white/10"
                    >
                      Ask for more time
                    </button>
                  )}
                  <button
                    onClick={() => dismiss(b)}
                    aria-label={`Hide ${b.ticketId ?? "ticket"} from the banner`}
                    className="shrink-0 rounded p-1 text-white/70 hover:text-white hover:bg-white/10"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {approvals.length > 0 && (
        <div className="shrink-0 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-300/70 text-amber-950 dark:text-amber-100">
          <div className="px-5 pt-2 text-[12px] font-semibold">
            {approvals.length} request{approvals.length === 1 ? "" : "s"} for more SLA time need your approval
          </div>
          <ul className="max-h-[96px] overflow-y-auto px-5 pb-1.5">
            {approvals.map((a) => (
              <li key={a.id} className="flex items-center gap-3 py-1 text-[12px]">
                <button onClick={() => selectTicket(a.ticket)} className="font-mono shrink-0 underline-offset-2 hover:underline">
                  {a.ticketRef ?? a.ticket.slice(0, 8)}
                </button>
                <span className="flex-1 min-w-0 truncate">
                  <b>{a.requesterName ?? "Owner"}</b> asks +{a.hours}h: {a.reason}
                </span>
                <button
                  onClick={() => decide(a, "approved")}
                  className="shrink-0 inline-flex items-center gap-1 rounded-md bg-emerald-600 text-white px-2.5 py-1 text-[11px] font-semibold hover:bg-emerald-700"
                >
                  <Check className="w-3 h-3" /> Approve
                </button>
                <button
                  onClick={() => decide(a, "rejected")}
                  className="shrink-0 rounded-md border border-amber-400 px-2.5 py-1 text-[11px] font-semibold hover:bg-amber-100 dark:hover:bg-amber-900/40"
                >
                  Decline
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <ExtensionRequestDialog
        breach={askFor}
        onClose={() => setAskFor(null)}
        onSent={() => {
          setAskFor(null);
          setTick((t) => t + 1);
        }}
      />

      <style>{`
        @keyframes iris-sla-pulse { 50% { box-shadow: 0 6px 28px -4px rgba(220,38,38,.85); } }
        @keyframes iris-sla-blink { 50% { background: rgba(255,255,255,.42); } }
        .iris-sla-banner { box-shadow: 0 6px 20px -8px rgba(220,38,38,.6); animation: iris-sla-pulse 2s ease-in-out infinite; }
        .iris-sla-siren { animation: iris-sla-blink 1s steps(2) infinite; }
        .iris-sla-scroll { scrollbar-width: thin; scrollbar-color: rgba(255,255,255,.5) transparent; }
        @media (prefers-reduced-motion: reduce) { .iris-sla-banner, .iris-sla-siren { animation: none; } }
      `}</style>
    </>
  );
}

/** Ask the reporting manager for more time. Nothing is added until they approve. */
export function ExtensionRequestDialog({
  breach,
  onClose,
  onSent,
}: {
  breach: { id: string; ticketId: string | null; title: string } | null;
  onClose: () => void;
  onSent: () => void;
}) {
  const [hours, setHours] = React.useState(4);
  const [reason, setReason] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  // Reset the form each time it opens for a ticket (render-time state adjustment, no effect).
  const [openFor, setOpenFor] = React.useState<string | null>(null);
  if ((breach?.id ?? null) !== openFor) {
    setOpenFor(breach?.id ?? null);
    setHours(4);
    setReason("");
  }

  const send = async () => {
    if (!breach) return;
    setBusy(true);
    try {
      const { request } = await api<{ request: { approverName: string } }>("/api/sla-extensions", {
        method: "POST",
        json: { ticketId: breach.id, hours, reason },
      });
      toast.success(`Sent to ${request.approverName} for approval`);
      window.dispatchEvent(new Event("iris:sla-refresh"));
      onSent();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={!!breach} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ask for more time</DialogTitle>
          <DialogDescription>
            {breach?.ticketId ? `${breach.ticketId}: ` : ""}
            {breach?.title}. Your reporting manager gets the request, and the time is added only after they approve it.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <div className="text-[12px] font-medium mb-1.5">Extra time</div>
            <div className="flex flex-wrap gap-1.5">
              {HOUR_OPTIONS.map((h) => (
                <button
                  key={h}
                  onClick={() => setHours(h)}
                  className={cn(
                    "h-8 px-3 rounded-lg border text-[12px] font-medium",
                    hours === h ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted",
                  )}
                >
                  {h < 24 ? `${h}h` : `${h / 24}d`}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[12px] font-medium mb-1.5">Why do you need it?</div>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Waiting on the vendor visit booked for tomorrow morning"
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={send} disabled={busy || reason.trim().length < 5}>
            {busy ? "Sending..." : "Send for approval"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

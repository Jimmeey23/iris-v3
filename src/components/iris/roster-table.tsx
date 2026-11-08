"use client";

import * as React from "react";
import { Loader2, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { absUrl } from "@/lib/iris/utils";
import { ATTENDANCE, INTEREST, parseRoster, type RosterRow } from "@/lib/iris/roster-field";

type RosterApi = {
  data?: {
    counts: { booked: number; checkedIn: number; cancelled: number };
    roster: Array<{ bookingId: string; memberId: string | null; name: string | null; phone?: string | null; email?: string | null; checkedIn: boolean; cancelled?: boolean }>;
  };
  error?: string;
  unavailable?: boolean;
};

const cell = "px-2 py-1.5 align-top";
const sel = "h-7 w-full px-1.5 text-[11px] rounded-md border border-input bg-background";

/**
 * Everyone booked into the picked class, with per-member status, interest, follow-up
 * and notes. Rows load from Momence when the class changes; edits stay in `value`.
 */
export function RosterTable({ sessionId, value, onChange }: { sessionId: string | null; value: unknown; onChange: (v: string) => void }) {
  const rows = parseRoster(value);
  const [state, setState] = React.useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = React.useState<string | null>(null);
  const loadedFor = React.useRef<string | null>(null);
  const save = (next: RosterRow[]) => onChange(JSON.stringify(next));

  React.useEffect(() => {
    if (!sessionId || loadedFor.current === sessionId) return;
    let stale = false;
    loadedFor.current = sessionId;
    setState("loading");
    fetch(absUrl(`/api/momence/sessions/${encodeURIComponent(sessionId)}/roster?all=1`), { cache: "no-store" })
      .then((r) => r.json() as Promise<RosterApi>)
      .then((j) => {
        if (stale) return;
        if (!j.data) throw new Error(j.error ?? (j.unavailable ? "Momence doesn't allow reading this class roster." : "Couldn't load the roster."));
        const prev = new Map(parseRoster(value).map((r) => [r.bookingId, r]));
        save(
          j.data.roster.map((b) =>
            prev.get(b.bookingId) ?? {
              bookingId: b.bookingId,
              memberId: b.memberId,
              name: b.name ?? "Unknown member",
              phone: b.phone ?? null,
              email: b.email ?? null,
              attendance: b.cancelled ? "Cancelled" : b.checkedIn ? "Attended" : "No show",
              interest: "Undecided",
              followUp: false,
              followUpDate: "",
              notes: "",
            },
          ),
        );
        setState("idle");
      })
      .catch((e) => {
        if (stale) return;
        setError(e instanceof Error ? e.message : "Couldn't load the roster.");
        setState("error");
        loadedFor.current = null;
      });
    return () => {
      stale = true;
    };
    // Load once per picked class; `value` is read for merging only.
  }, [sessionId]);

  const patch = (i: number, p: Partial<RosterRow>) => save(rows.map((r, j) => (j === i ? { ...r, ...p } : r)));
  const setAll = (p: Partial<RosterRow>) => save(rows.map((r) => ({ ...r, ...p })));

  if (!sessionId) {
    return <div className="text-[12px] text-muted-foreground rounded-md border border-dashed border-border p-3">Pick the hosted class above to load everyone who booked.</div>;
  }
  if (state === "loading" && !rows.length) {
    return <div className="text-[12px] text-muted-foreground flex items-center gap-2 p-3"><Loader2 className="w-3.5 h-3.5 animate-spin" />Loading booked members from Momence…</div>;
  }
  if (state === "error" && !rows.length) {
    return <div className="text-[12px] text-rose-600 p-3">{error}</div>;
  }
  if (!rows.length) {
    return <div className="text-[12px] text-muted-foreground p-3">Nobody is booked into this class.</div>;
  }

  const stat = (label: string, n: number, tone: string) => (
    <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium", tone)}>{n} {label}</span>
  );
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="flex items-center gap-1.5 flex-wrap px-3 py-2 bg-muted/40 border-b border-border">
        <Users className="w-3.5 h-3.5 text-muted-foreground" />
        {stat("booked", rows.length, "bg-muted text-foreground")}
        {stat("attended", rows.filter((r) => r.attendance === "Attended").length, "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400")}
        {stat("late cancelled", rows.filter((r) => r.attendance === "Late cancelled").length, "bg-amber-500/10 text-amber-700 dark:text-amber-400")}
        {stat("no show", rows.filter((r) => r.attendance === "No show").length, "bg-rose-500/10 text-rose-600 dark:text-rose-400")}
        {stat("interested", rows.filter((r) => r.interest === "Interested").length, "bg-primary/10 text-primary")}
        <span className="ml-auto flex items-center gap-1.5 text-[10px]">
          <button type="button" onClick={() => setAll({ followUp: true })} className="px-2 py-0.5 rounded border border-border hover:bg-background">Follow up all</button>
          <button type="button" onClick={() => setAll({ attendance: "Attended" })} className="px-2 py-0.5 rounded border border-border hover:bg-background">Mark all attended</button>
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead className="text-[9px] uppercase tracking-wider text-muted-foreground bg-muted/20">
            <tr>
              <th className={cn(cell, "text-left min-w-[150px]")}>Member</th>
              <th className={cn(cell, "text-left min-w-[120px]")}>Status</th>
              <th className={cn(cell, "text-left min-w-[130px]")}>Interest</th>
              <th className={cn(cell, "text-center")}>Follow up</th>
              <th className={cn(cell, "text-left min-w-[130px]")}>By</th>
              <th className={cn(cell, "text-left min-w-[200px]")}>Notes / comments</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.bookingId} className="border-t border-border/70">
                <td className={cell}>
                  <div className="font-medium">{r.name}</div>
                  <div className="text-[10px] text-muted-foreground">{[r.phone, r.email].filter(Boolean).join(" · ") || r.memberId}</div>
                </td>
                <td className={cell}>
                  <select aria-label={`Status for ${r.name}`} className={sel} value={r.attendance} onChange={(e) => patch(i, { attendance: e.target.value })}>
                    {ATTENDANCE.map((o) => <option key={o}>{o}</option>)}
                  </select>
                </td>
                <td className={cell}>
                  <select aria-label={`Interest for ${r.name}`} className={sel} value={r.interest} onChange={(e) => patch(i, { interest: e.target.value })}>
                    {INTEREST.map((o) => <option key={o}>{o}</option>)}
                  </select>
                </td>
                <td className={cn(cell, "text-center")}>
                  <input type="checkbox" aria-label={`Follow up ${r.name}`} checked={r.followUp} onChange={(e) => patch(i, { followUp: e.target.checked })} className="accent-[var(--primary)] w-3.5 h-3.5 mt-1.5" />
                </td>
                <td className={cell}>
                  <input type="date" aria-label={`Follow-up date for ${r.name}`} disabled={!r.followUp} value={r.followUpDate} onChange={(e) => patch(i, { followUpDate: e.target.value })} className={cn(sel, "disabled:opacity-40")} />
                </td>
                <td className={cell}>
                  <input aria-label={`Notes for ${r.name}`} value={r.notes} onChange={(e) => patch(i, { notes: e.target.value })} placeholder="Feedback, objections, next step…" className={sel} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

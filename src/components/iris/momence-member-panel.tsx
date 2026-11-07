"use client";

import * as React from "react";
import { toast } from "sonner";
import { Loader2, Snowflake, Sun, Tag as TagIcon, X, Check, Ban, UserPlus, LogIn, Pencil, ShieldAlert } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/iris/store";

// ── Fetch helper: every section answers { data } | { unavailable } | { error } ──
type Section<T> = { data?: T; unavailable?: boolean; error?: string };

export function useMomenceSection<T = any>(url: string | null, deps: unknown[] = []) {
  const [state, setState] = React.useState<Section<T> & { loading: boolean }>({ loading: Boolean(url) });
  const [nonce, setNonce] = React.useState(0);
  React.useEffect(() => {
    if (!url) return;
    const ac = new AbortController();
    setState((s) => ({ ...s, loading: true }));
    fetch(url, { signal: ac.signal, cache: "no-store" })
      .then(async (r) => ({ ok: r.ok, j: await r.json().catch(() => ({})) }))
      .then(({ ok, j }) => setState(ok ? { ...j, loading: false } : { error: j.error ?? "Request failed", loading: false }))
      .catch((e) => e.name !== "AbortError" && setState({ error: "Network error", loading: false }));
    return () => ac.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, nonce, ...deps]);
  return { ...state, reload: () => setNonce((n) => n + 1) };
}

const fmt = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", year: "2-digit", hour: "numeric", minute: "2-digit" }) : "—";
const fmtDay = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—");
const money = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

function Box({ s, children, empty }: { s: Section<any> & { loading: boolean }; children: React.ReactNode; empty?: string }) {
  if (s.loading) return <div className="flex items-center gap-2 text-[11px] text-muted-foreground py-6 justify-center"><Loader2 className="w-3.5 h-3.5 animate-spin" />Loading from Momence…</div>;
  if (s.unavailable) return <div className="text-[11px] text-muted-foreground py-6 text-center">This section isn&apos;t available to IRIS&apos;s Momence access.</div>;
  if (s.error) return <div className="text-[11px] text-rose-500 py-6 text-center">{s.error}</div>;
  if (empty) return <div className="text-[11px] text-muted-foreground py-6 text-center">{empty}</div>;
  return <>{children}</>;
}

// ── Confirmed write actions ──────────────────────────────────────────────────
export type PendingAction = { payload: Record<string, unknown>; title: string; detail: string; danger?: boolean; onDone?: () => void };

export function ConfirmActionDialog({ pending, onClose }: { pending: PendingAction | null; onClose: () => void }) {
  const [busy, setBusy] = React.useState(false);
  const run = async () => {
    if (!pending) return;
    setBusy(true);
    try {
      const r = await fetch("/api/momence/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...pending.payload, confirm: true }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error ?? "Action failed");
      toast.success(j.message ?? "Done");
      pending.onDone?.();
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <AlertDialog open={Boolean(pending)} onOpenChange={(o) => !o && !busy && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2"><ShieldAlert className="w-4 h-4 text-amber-500" />{pending?.title}</AlertDialogTitle>
          <AlertDialogDescription>
            {pending?.detail} This changes live data in Momence and is recorded in the audit log.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={busy}
            onClick={(e) => { e.preventDefault(); run(); }}
            className={pending?.danger ? "bg-rose-600 hover:bg-rose-700 text-white" : undefined}
          >
            {busy ? "Working…" : "Confirm"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function ActBtn({ icon: Icon, children, onClick, danger }: { icon: React.ComponentType<{ className?: string }>; children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cn("inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded border transition-colors",
        danger ? "border-rose-500/30 text-rose-600 hover:bg-rose-500/10" : "border-border hover:bg-muted")}
    >
      <Icon className="w-2.5 h-2.5" />{children}
    </button>
  );
}

/** Managers and admins can write; the server enforces this too. */
export function useCanWrite() {
  const tier = useAppStore((s) => s.currentUser.tier);
  return tier === "admin" || tier === "manager";
}

// ── Tabs ─────────────────────────────────────────────────────────────────────
function MembershipsTab({ memberId, canWrite, ask }: { memberId: string; canWrite: boolean; ask: (a: PendingAction) => void }) {
  const s = useMomenceSection<any[]>(`/api/momence/members/${encodeURIComponent(memberId)}/data?section=memberships`);
  const [credits, setCredits] = React.useState<Record<string, string>>({});
  return (
    <Box s={s} empty={!s.data?.length ? "No active or frozen memberships." : undefined}>
      <div className="space-y-2">
        {s.data?.map((m) => (
          <div key={m.id} className="p-2.5 rounded-md border border-border">
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-semibold truncate">{m.name}</div>
                <div className="text-[10px] text-muted-foreground">
                  {m.type} · {m.startDate ? `from ${fmtDay(m.startDate)}` : "no start"} · {m.endDate ? `expires ${fmtDay(m.endDate)}` : "no expiry"}
                  {m.autoRenewing ? " · auto-renews" : ""}
                </div>
              </div>
              {m.isFrozen && <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-600">Frozen</span>}
              {m.declinedRenewal && <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-600">Renewal declined</span>}
            </div>
            <div className="flex flex-wrap gap-3 mt-1.5 text-[11px]">
              {m.creditsTotal != null && <span>Classes <b>{m.creditsLeft}</b> / {m.creditsTotal} left</span>}
              {m.moneyTotal != null && <span>Credit <b>{money(m.moneyLeft ?? 0)}</b> / {money(m.moneyTotal)}</span>}
              {m.usageLimitSessions != null && <span>Used {m.usedSessions ?? 0} / {m.usageLimitSessions} sessions</span>}
              {m.creditsTotal == null && m.moneyTotal == null && <span className="text-muted-foreground">Unlimited / time-based</span>}
            </div>
            {m.isFrozen && m.freeze && (
              <div className="text-[10px] text-muted-foreground mt-1">
                {Object.entries(m.freeze).filter(([, v]) => typeof v === "string" && /^\d{4}-/.test(v as string)).map(([k, v]) => `${k}: ${fmtDay(v as string)}`).join(" · ")}
              </div>
            )}
            {canWrite && (
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                {m.isFrozen ? (
                  <ActBtn icon={Sun} onClick={() => ask({
                    title: "Unfreeze membership", detail: `Unfreeze "${m.name}" now (or remove its scheduled freeze).`,
                    payload: { action: "unfreeze_membership", memberId, boughtMembershipId: m.id }, onDone: s.reload,
                  })}>Unfreeze</ActBtn>
                ) : (
                  <ActBtn icon={Snowflake} onClick={() => ask({
                    title: "Freeze membership", detail: `Freeze "${m.name}" immediately. It stays frozen until someone unfreezes it.`,
                    payload: { action: "freeze_membership", memberId, boughtMembershipId: m.id, freezeType: "now" }, onDone: s.reload,
                  })}>Freeze now</ActBtn>
                )}
                {m.creditsTotal != null && (
                  <span className="inline-flex items-center gap-1">
                    <Input
                      className="h-6 w-14 text-[11px] px-1.5" inputMode="numeric" placeholder="credits"
                      value={credits[m.id] ?? ""} onChange={(e) => setCredits((c) => ({ ...c, [m.id]: e.target.value.replace(/[^\d]/g, "") }))}
                    />
                    <ActBtn icon={Pencil} onClick={() => {
                      const v = Number(credits[m.id]);
                      if (credits[m.id] === undefined || credits[m.id] === "" || !isFinite(v)) return toast.error("Enter the new number of classes left");
                      ask({
                        title: "Update class credits", detail: `Set classes left on "${m.name}" from ${m.creditsLeft} to ${v}.`,
                        payload: { action: "update_credits", memberId, boughtMembershipId: m.id, eventCreditsLeft: v }, onDone: s.reload,
                      });
                    }}>Set credits</ActBtn>
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </Box>
  );
}

function BookingsTab({ memberId, canWrite, ask }: { memberId: string; canWrite: boolean; ask: (a: PendingAction) => void }) {
  const s = useMomenceSection<{ total: number; rows: any[]; stats: any }>(`/api/momence/members/${encodeURIComponent(memberId)}/data?section=bookings&limit=30`);
  const a = useMomenceSection<any[]>(`/api/momence/members/${encodeURIComponent(memberId)}/data?section=appointments`);
  return (
    <Box s={s} empty={!s.data?.rows.length ? "No bookings found." : undefined}>
      {s.data && (
        <div className="space-y-2">
          <div className="grid grid-cols-4 gap-2 text-center">
            {[["Total", s.data.total], ["Attended", s.data.stats.attended], ["Cancelled", s.data.stats.cancelled], ["No-shows", s.data.stats.noShows]].map(([l, v]) => (
              <div key={l as string} className="p-1.5 rounded-md border border-border bg-muted/20">
                <div className="text-[13px] font-bold tabular-nums">{v}</div>
                <div className="text-[8px] uppercase tracking-wider text-muted-foreground">{l}{l !== "Total" ? ` (last ${s.data!.stats.shown})` : ""}</div>
              </div>
            ))}
          </div>
          <div className="space-y-1 max-h-[300px] overflow-y-auto iris-scrollbar">
            {s.data.rows.map((b) => {
              const upcoming = b.session && new Date(b.session.startsAt) > new Date();
              const state = b.cancelledAt ? "Cancelled" : b.checkedIn ? "Checked in" : upcoming ? "Upcoming" : "No check-in";
              const tone = b.cancelledAt ? "text-muted-foreground" : b.checkedIn ? "text-emerald-600" : upcoming ? "text-sky-600" : "text-amber-600";
              return (
                <div key={b.bookingId} className="p-2 rounded-md border border-border">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-medium truncate">{b.session?.name ?? "Session"}</div>
                      <div className="text-[10px] text-muted-foreground truncate">
                        {fmt(b.session?.startsAt)}{b.session?.teacher ? ` · ${b.session.teacher}` : ""}{b.session?.location ? ` · ${b.session.location}` : ""}
                      </div>
                    </div>
                    <span className={cn("text-[10px] font-semibold", tone)}>{state}</span>
                  </div>
                  {canWrite && !b.cancelledAt && (
                    <div className="flex gap-1.5 mt-1.5">
                      {b.checkedIn ? (
                        <ActBtn icon={X} onClick={() => ask({ title: "Remove check-in", detail: `Mark ${b.session?.name ?? "this booking"} (${fmt(b.session?.startsAt)}) as not checked in.`, payload: { action: "remove_check_in", bookingId: b.bookingId }, onDone: s.reload })}>Remove check-in</ActBtn>
                      ) : (
                        <ActBtn icon={LogIn} onClick={() => ask({ title: "Check in", detail: `Check the member in to ${b.session?.name ?? "this class"} (${fmt(b.session?.startsAt)}).`, payload: { action: "check_in", bookingId: b.bookingId }, onDone: s.reload })}>Check in</ActBtn>
                      )}
                      {upcoming && (
                        <ActBtn danger icon={Ban} onClick={() => ask({ title: "Cancel booking", danger: true, detail: `Cancel the booking for ${b.session?.name ?? "this class"} (${fmt(b.session?.startsAt)}). No refund is issued and the member is notified.`, payload: { action: "cancel_booking", bookingId: b.bookingId, refund: false }, onDone: s.reload })}>Cancel booking</ActBtn>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {a.data && a.data.length > 0 && (
            <div>
              <div className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Appointments</div>
              {a.data.slice(0, 5).map((x) => (
                <div key={x.id} className="text-[11px] flex justify-between border-b border-border/50 py-0.5">
                  <span>{x.service ?? "Appointment"} · {fmt(x.startsAt)}</span>
                  <span className="text-muted-foreground">{x.cancelledAt ? "cancelled" : x.isPaid ? "paid" : "unpaid"}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Box>
  );
}

function PaymentsTab({ memberId }: { memberId: string }) {
  const s = useMomenceSection<{ rows: any[]; note: string }>(`/api/momence/members/${encodeURIComponent(memberId)}/data?section=payments`);
  return (
    <Box s={s}>
      {s.data && (
        <div className="space-y-1.5">
          <div className="text-[10px] text-muted-foreground">{s.data.note}. Older purchases won&apos;t appear here.</div>
          {s.data.rows.length === 0 && <div className="text-[11px] text-muted-foreground py-4 text-center">No recent purchases found.</div>}
          {s.data.rows.map((r) => (
            <div key={r.id} className="p-2 rounded-md border border-border">
              <div className="flex justify-between gap-2">
                <div className="text-[11px] font-medium min-w-0">{r.items.map((i: any) => `${i.qty}× ${i.name}`).join(", ")}</div>
                <div className="text-[11px] font-semibold tabular-nums shrink-0">{money(r.total)}</div>
              </div>
              <div className="text-[10px] text-muted-foreground">{fmt(r.date)} · {r.methods.map((m: any) => m.method).join(" + ") || "no payment"}</div>
            </div>
          ))}
        </div>
      )}
    </Box>
  );
}

function NotesTab({ memberId }: { memberId: string }) {
  const s = useMomenceSection<any[]>(`/api/momence/members/${encodeURIComponent(memberId)}/data?section=notes`);
  return (
    <Box s={s} empty={!s.data?.length ? "No notes on this profile." : undefined}>
      <div className="space-y-1.5 max-h-[340px] overflow-y-auto iris-scrollbar">
        {s.data?.map((n) => (
          <div key={n.id} className="p-2 rounded-md border border-border">
            <div className="text-[11px] whitespace-pre-wrap break-words">{n.note}</div>
            <div className="text-[9px] text-muted-foreground mt-0.5">{fmt(n.createdAt)}{n.locked ? " · locked" : ""}</div>
          </div>
        ))}
      </div>
      <div className="text-[9px] text-muted-foreground mt-2">Momence&apos;s API is read-only for notes — add them in Momence.</div>
    </Box>
  );
}

function TagsTab({ memberId, canWrite, ask }: { memberId: string; canWrite: boolean; ask: (a: PendingAction) => void }) {
  const s = useMomenceSection<{ assigned: any[]; available: any[] }>(`/api/momence/members/${encodeURIComponent(memberId)}/data?section=tags`);
  const [pick, setPick] = React.useState("");
  const assignedIds = new Set(s.data?.assigned.map((t) => t.id));
  const options = (s.data?.available ?? []).filter((t) => !assignedIds.has(t.id));
  return (
    <Box s={s}>
      {s.data && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {s.data.assigned.length === 0 && <span className="text-[11px] text-muted-foreground">No tags assigned.</span>}
            {s.data.assigned.map((t) => (
              <span key={t.id} className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-muted">
                <TagIcon className="w-2.5 h-2.5" />{t.name}
                {canWrite && (
                  <button aria-label={`Remove ${t.name}`} className="hover:text-rose-500" onClick={() => ask({ title: "Remove tag", detail: `Remove the tag "${t.name}" from this member.`, payload: { action: "unassign_tag", memberId, tagId: t.id }, onDone: s.reload })}>
                    <X className="w-2.5 h-2.5" />
                  </button>
                )}
              </span>
            ))}
          </div>
          {canWrite && options.length > 0 && (
            <div className="flex items-center gap-2">
              <select value={pick} onChange={(e) => setPick(e.target.value)} className="h-7 text-[11px] rounded-md border border-border bg-background px-2 max-w-[220px]">
                <option value="">Add a tag…</option>
                {options.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <ActBtn icon={Check} onClick={() => {
                const t = options.find((o) => o.id === pick);
                if (!t) return toast.error("Choose a tag first");
                ask({ title: "Assign tag", detail: `Add the tag "${t.name}" to this member.`, payload: { action: "assign_tag", memberId, tagId: t.id }, onDone: () => { setPick(""); s.reload(); } });
              }}>Assign</ActBtn>
            </div>
          )}
        </div>
      )}
    </Box>
  );
}

/** Tabs used inside Member 360. `lead` is rendered in the Overview tab. */
export function MomenceMemberTabs({ memberId, overview }: { memberId: string; overview: React.ReactNode }) {
  const canWrite = useCanWrite();
  const [pending, setPending] = React.useState<PendingAction | null>(null);
  return (
    <>
      <Tabs defaultValue="overview">
        <TabsList className="w-full h-8">
          {["overview", "memberships", "bookings", "payments", "notes", "tags"].map((t) => (
            <TabsTrigger key={t} value={t} className="text-[11px] capitalize flex-1">{t === "bookings" ? "Bookings" : t}</TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="overview" className="mt-3">{overview}</TabsContent>
        <TabsContent value="memberships" className="mt-3"><MembershipsTab memberId={memberId} canWrite={canWrite} ask={setPending} /></TabsContent>
        <TabsContent value="bookings" className="mt-3"><BookingsTab memberId={memberId} canWrite={canWrite} ask={setPending} /></TabsContent>
        <TabsContent value="payments" className="mt-3"><PaymentsTab memberId={memberId} /></TabsContent>
        <TabsContent value="notes" className="mt-3"><NotesTab memberId={memberId} /></TabsContent>
        <TabsContent value="tags" className="mt-3"><TagsTab memberId={memberId} canWrite={canWrite} ask={setPending} /></TabsContent>
      </Tabs>
      <ConfirmActionDialog pending={pending} onClose={() => setPending(null)} />
    </>
  );
}

// ── Ticket workspace panel ───────────────────────────────────────────────────
/** Pull a Momence id out of whatever a ticket stored ("mum:123", "123"); bare ids default to Mumbai. */
export const normalizeMomenceId = (v?: string | null) => (v && /^(mum:|blr:)?\d+$/.test(v.trim()) ? (v.includes(":") ? v.trim() : `mum:${v.trim()}`) : null);

export function MomenceContextPanel({ clientMomenceId, bookingId, sessionId }: { clientMomenceId?: string | null; bookingId?: string | null; sessionId?: string | null }) {
  const memberId = normalizeMomenceId(clientMomenceId);
  const canWrite = useCanWrite();
  const [pending, setPending] = React.useState<PendingAction | null>(null);
  const ov = useMomenceSection<any>(memberId ? `/api/momence/members/${encodeURIComponent(memberId)}/data?section=overview` : null);
  // The ticket's booking id, if it is one of the member's recent bookings, tells us which class to show.
  const bookingRaw = bookingId?.trim().replace(/^\w+:/, "");
  const fromBooking = (ov as any).bookings?.data?.rows?.find((b: any) => bookingRaw && b.bookingId.endsWith(`:${bookingRaw}`))?.session?.id as string | undefined;
  const sid = normalizeMomenceId(sessionId) ?? fromBooking ?? null;
  const ro = useMomenceSection<any>(sid ? `/api/momence/sessions/${encodeURIComponent(sid)}/roster` : null);
  if (!memberId && !sid) return null;
  return (
    <div className="iris-card p-3 space-y-3">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Momence context</div>
      {memberId && (
        <Box s={ov}>
          {(() => {
            const o = ov as any;
            const member = o.member?.data;
            const ms: any[] = o.memberships?.data ?? [];
            const bk = o.bookings?.data;
            const notes: any[] = o.notes?.data ?? [];
            return (
              <div className="space-y-2">
                {member && <div className="text-[12px] font-semibold">{member.name} <span className="font-normal text-muted-foreground">· {member.totalVisits} visits{member.tags?.length ? ` · ${member.tags.slice(0, 3).join(", ")}` : ""}</span></div>}
                {o.memberships?.unavailable ? null : (
                  <div className="space-y-1">
                    {ms.length === 0 && <div className="text-[11px] text-muted-foreground">No active memberships.</div>}
                    {ms.map((x) => (
                      <div key={x.id} className="text-[11px] flex justify-between gap-2">
                        <span className="truncate">{x.name}{x.isFrozen ? " (frozen)" : ""}</span>
                        <span className="text-muted-foreground shrink-0">{x.creditsTotal != null ? `${x.creditsLeft}/${x.creditsTotal} left` : x.endDate ? `to ${fmtDay(x.endDate)}` : "—"}</span>
                      </div>
                    ))}
                  </div>
                )}
                {bk && (
                  <div className="space-y-1">
                    <div className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Recent classes · {bk.stats.attended} attended, {bk.stats.cancelled} cancelled</div>
                    {bk.rows.slice(0, 5).map((b: any) => (
                      <div key={b.bookingId} className={cn("text-[11px] flex justify-between gap-2", bookingId && b.bookingId.endsWith(`:${bookingId.replace(/^\w+:/, "")}`) && "font-semibold")}>
                        <span className="truncate">{b.session?.name} · {fmt(b.session?.startsAt)}</span>
                        <span className="text-muted-foreground shrink-0">{b.cancelledAt ? "cancelled" : b.checkedIn ? "checked in" : "—"}</span>
                      </div>
                    ))}
                  </div>
                )}
                {notes.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Latest notes</div>
                    {notes.slice(0, 2).map((n) => <div key={n.id} className="text-[11px] line-clamp-2">{n.note}</div>)}
                  </div>
                )}
              </div>
            );
          })()}
        </Box>
      )}
      {sid && (
        <Box s={ro}>
          {ro.data && (
            <div className="space-y-1">
              <div className="text-[12px] font-semibold">{ro.data.session.name}</div>
              <div className="text-[11px] text-muted-foreground">
                {fmt(ro.data.session.startsAt)} · {ro.data.counts.booked}{ro.data.session.capacity ? `/${ro.data.session.capacity}` : ""} booked · {ro.data.counts.checkedIn} checked in
                {ro.data.waitlist ? ` · ${ro.data.waitlist} waitlisted` : ""}
              </div>
              {canWrite && memberId && (
                <div className="flex gap-1.5 pt-1">
                  <ActBtn icon={UserPlus} onClick={() => setPending({
                    title: "Add member to class", detail: `Add this member to ${ro.data.session.name} (${fmt(ro.data.session.startsAt)}) for free, without using a membership.`,
                    payload: { action: "add_to_session", sessionId: sid, memberId }, onDone: ro.reload,
                  })}>Add free</ActBtn>
                  <ActBtn icon={UserPlus} onClick={() => setPending({
                    title: "Add member to waitlist", detail: `Put this member on the waitlist for ${ro.data.session.name} (${fmt(ro.data.session.startsAt)}).`,
                    payload: { action: "add_to_session", sessionId: sid, memberId, waitlist: true }, onDone: ro.reload,
                  })}>Add to waitlist</ActBtn>
                </div>
              )}
            </div>
          )}
        </Box>
      )}
      <ConfirmActionDialog pending={pending} onClose={() => setPending(null)} />
    </div>
  );
}

"use client";

/**
 * Admin-only controls on a ticket: edit any field, set any status, reopen,
 * close, escalate / de-escalate, change priority, set the SLA target, unlock
 * imported tickets and delete. The server re-checks the admin role on every call.
 */

import * as React from "react";
import { toast } from "sonner";
import {
  ShieldCheck, Pencil, RotateCcw, XCircle, ArrowUpCircle, ArrowDownCircle, Trash2, Unlock, CheckCircle2, Loader2,
} from "lucide-react";
import { ticketsApi } from "@/lib/iris/live-data";
import type { Ticket } from "@/lib/iris/sample-tickets";
import { STUDIOS, STATUS_CONFIG, type TicketStatus } from "@/lib/iris/types";
import { CATEGORY_MAP } from "@/lib/iris/iris-constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const STATUSES: TicketStatus[] = ["open", "in_progress", "awaiting_response", "escalated", "resolved", "closed"];
const PRIORITIES = ["P0", "P1", "P2", "P3"] as const;

const sel =
  "h-8 w-full rounded-md border border-input bg-background px-2 text-[12px] focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50";

function toLocalInput(iso?: string | Date) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function AdminTicketControls({
  ticket,
  onStatus,
  onDeleted,
}: {
  ticket: Ticket;
  onStatus: (s: TicketStatus) => void;
  onDeleted: () => void;
}) {
  const [busy, setBusy] = React.useState(false);
  const [editing, setEditing] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  const run = async (changes: Record<string, unknown>, msg: string) => {
    setBusy(true);
    try {
      const t = await ticketsApi.update(ticket.id, changes);
      if (t?.status) onStatus(t.status as TicketStatus);
      toast.success(msg);
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const level = ticket.escalationLevel ?? 0;
  const closed = ticket.status === "resolved" || ticket.status === "closed";

  return (
    <div className="rounded-lg border border-primary/25 bg-primary/[0.04] p-3 space-y-2.5">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-primary">
        <ShieldCheck className="w-3.5 h-3.5" /> Admin controls
        {busy && <Loader2 className="w-3 h-3 animate-spin" />}
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Button size="sm" variant="outline" className="h-7 text-[11px]" disabled={busy} onClick={() => setEditing(true)}>
          <Pencil className="w-3 h-3 mr-1" /> Edit details
        </Button>
        {closed ? (
          <Button size="sm" variant="outline" className="h-7 text-[11px]" disabled={busy} onClick={() => run({ status: "open" }, "Ticket reopened")}>
            <RotateCcw className="w-3 h-3 mr-1" /> Reopen
          </Button>
        ) : (
          <>
            <Button size="sm" variant="outline" className="h-7 text-[11px]" disabled={busy} onClick={() => run({ status: "resolved" }, "Ticket resolved")}>
              <CheckCircle2 className="w-3 h-3 mr-1" /> Resolve
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-[11px]" disabled={busy} onClick={() => run({ status: "closed" }, "Ticket closed")}>
              <XCircle className="w-3 h-3 mr-1" /> Close
            </Button>
          </>
        )}
        <Button
          size="sm" variant="outline" className="h-7 text-[11px]" disabled={busy || level >= 5}
          onClick={() => run({ escalationLevel: level + 1, status: "escalated" }, `Escalated to level ${level + 1}`)}
        >
          <ArrowUpCircle className="w-3 h-3 mr-1" /> Escalate{level ? ` (L${level})` : ""}
        </Button>
        {level > 0 && (
          <Button
            size="sm" variant="outline" className="h-7 text-[11px]" disabled={busy}
            onClick={() => run(level === 1 ? { escalationLevel: 0, status: "in_progress" } : { escalationLevel: level - 1 }, "De-escalated")}
          >
            <ArrowDownCircle className="w-3 h-3 mr-1" /> De-escalate
          </Button>
        )}
        {(ticket.legacy || ticket.assignmentLocked) && (
          <Button size="sm" variant="outline" className="h-7 text-[11px]" disabled={busy} onClick={() => run({ unlock: true }, "Unlocked: now a normal ticket")}>
            <Unlock className="w-3 h-3 mr-1" /> Unlock imported ticket
          </Button>
        )}
        <Button
          size="sm" variant="outline" className="h-7 text-[11px] text-red-600 border-red-500/30 hover:bg-red-500/10 ml-auto"
          disabled={busy} onClick={() => setConfirmDelete(true)}
        >
          <Trash2 className="w-3 h-3 mr-1" /> Delete
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <label className="text-[10px] text-muted-foreground">
          Status
          <select className={sel} value={ticket.status} disabled={busy}
            onChange={(e) => run({ status: e.target.value }, `Status: ${STATUS_CONFIG[e.target.value as TicketStatus]?.label ?? e.target.value}`)}>
            {STATUSES.map((s) => <option key={s} value={s}>{STATUS_CONFIG[s]?.label ?? s}</option>)}
          </select>
        </label>
        <label className="text-[10px] text-muted-foreground">
          Priority
          <select className={sel} value={ticket.priority} disabled={busy}
            onChange={(e) => run({ priority: e.target.value }, `Priority: ${e.target.value}`)}>
            {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </label>
        <label className="text-[10px] text-muted-foreground">
          SLA resolution target
          <Input type="datetime-local" className="h-8 text-[12px]" disabled={busy}
            defaultValue={toLocalInput(ticket.slaResolutionTarget)}
            onBlur={(e) => {
              const v = e.target.value;
              if (v === toLocalInput(ticket.slaResolutionTarget)) return;
              run({ slaResolutionTarget: v ? new Date(v).toISOString() : null }, v ? "SLA target updated" : "SLA target cleared");
            }} />
        </label>
      </div>

      {editing && <EditDialog ticket={ticket} onClose={() => setEditing(false)} onSave={(c) => run(c, "Ticket updated")} />}

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete {ticket.ticketId}?</DialogTitle>
            <DialogDescription>
              This permanently removes the ticket with its comments and activity. A copy is kept in the audit log. It can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>Cancel</Button>
            <Button
              variant="destructive" disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await ticketsApi.remove(ticket.id);
                  toast.success(`${ticket.ticketId} deleted`);
                  setConfirmDelete(false);
                  onDeleted();
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Couldn't delete");
                } finally {
                  setBusy(false);
                }
              }}
            >
              Delete ticket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EditDialog({ ticket, onClose, onSave }: { ticket: Ticket; onClose: () => void; onSave: (c: Record<string, unknown>) => Promise<boolean> }) {
  const [f, setF] = React.useState({
    title: ticket.title,
    description: ticket.description ?? "",
    category: ticket.category,
    subcategory: ticket.subcategory ?? "",
    studioCode: ticket.studioCode ?? "",
    tags: (ticket.tags ?? []).join(", "),
    recommendedResolution: ticket.recommendedResolution ?? "",
  });
  const [saving, setSaving] = React.useState(false);
  const cats = Object.keys(CATEGORY_MAP);
  if (f.category && !cats.includes(f.category)) cats.unshift(f.category);
  const subs = [...(CATEGORY_MAP[f.category] ?? [])];
  if (f.subcategory && !subs.includes(f.subcategory)) subs.unshift(f.subcategory);

  const save = async () => {
    setSaving(true);
    const ok = await onSave({
      ...f,
      tags: f.tags.split(",").map((t) => t.trim()).filter(Boolean),
    });
    setSaving(false);
    if (ok) onClose();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto iris-scrollbar">
        <DialogHeader>
          <DialogTitle>Edit {ticket.ticketId}</DialogTitle>
          <DialogDescription>Changes are saved to the ticket and logged in its activity.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 text-[12px]">
          <label className="grid gap-1">Title<Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></label>
          <label className="grid gap-1">Description<Textarea rows={6} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="grid gap-1">Category
              <select className={sel} value={f.category} onChange={(e) => setF({ ...f, category: e.target.value, subcategory: "" })}>
                {cats.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label className="grid gap-1">Subcategory
              <select className={sel} value={f.subcategory} onChange={(e) => setF({ ...f, subcategory: e.target.value })}>
                <option value="">—</option>
                {subs.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label className="grid gap-1">Studio
              <select className={sel} value={f.studioCode} onChange={(e) => setF({ ...f, studioCode: e.target.value })}>
                <option value="">—</option>
                {STUDIOS.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
              </select>
            </label>
          </div>
          <label className="grid gap-1">Tags (comma separated)<Input value={f.tags} onChange={(e) => setF({ ...f, tags: e.target.value })} /></label>
          <label className="grid gap-1">Recommended resolution<Textarea rows={4} value={f.recommendedResolution} onChange={(e) => setF({ ...f, recommendedResolution: e.target.value })} /></label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving || !f.title.trim() || !f.category}>{saving ? "Saving…" : "Save changes"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

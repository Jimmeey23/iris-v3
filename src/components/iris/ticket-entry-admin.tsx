"use client";

import * as React from "react";
import { toast } from "sonner";
import { Pencil, Trash2, Check, X, Loader2 } from "lucide-react";
import { ticketsApi } from "@/lib/iris/live-data";

/**
 * Admin-only edit / delete for a note, comment or resolution-log entry that was already
 * posted. Renders the entry's text (via `children`) normally, or an inline editor.
 * `prefix` is a "[follow up] " style marker kept in front of the stored text.
 */
export function AdminEditableEntry({
  ticketId,
  commentId,
  text,
  prefix = "",
  isAdmin,
  children,
}: {
  ticketId: string;
  commentId?: string;
  text: string;
  prefix?: string;
  isAdmin: boolean;
  children: React.ReactNode;
}) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(text);
  const [busy, setBusy] = React.useState<null | "save" | "delete">(null);
  const canAct = isAdmin && Boolean(commentId);

  const save = async () => {
    if (!commentId || !draft.trim()) return;
    setBusy("save");
    try {
      await ticketsApi.editComment(ticketId, commentId, `${prefix}${draft.trim()}`);
      setEditing(false);
      toast.success("Entry updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't update the entry");
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    if (!commentId || !window.confirm("Delete this entry? The original text is kept in the audit log.")) return;
    setBusy("delete");
    try {
      await ticketsApi.deleteComment(ticketId, commentId);
      toast.success("Entry deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't delete the entry");
      setBusy(null);
    }
  };

  if (editing) {
    return (
      <div className="space-y-1.5">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={3}
          autoFocus
          className="w-full px-2.5 py-1.5 text-[12px] rounded-md border border-border bg-card focus:outline-none focus:border-primary resize-y"
        />
        <div className="flex gap-1.5">
          <button type="button" onClick={save} disabled={busy !== null || !draft.trim()} className="inline-flex items-center gap-1 rounded-md bg-foreground text-background px-2 py-1 text-[11px] font-medium disabled:opacity-50">
            {busy === "save" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
            Save
          </button>
          <button type="button" onClick={() => { setEditing(false); setDraft(text); }} disabled={busy !== null} className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] font-medium">
            <X className="w-3 h-3" />
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="group/entry relative">
      {children}
      {canAct && (
        <div className="absolute -top-1 right-0 hidden group-hover/entry:flex gap-0.5 rounded-md border border-border bg-card shadow-sm p-0.5">
          <button type="button" title="Edit (admin)" onClick={() => { setDraft(text); setEditing(true); }} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground">
            <Pencil className="w-3 h-3" />
          </button>
          <button type="button" title="Delete (admin)" onClick={remove} disabled={busy !== null} className="p-1 rounded hover:bg-rose-500/10 text-muted-foreground hover:text-rose-600">
            {busy === "delete" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
          </button>
        </div>
      )}
    </div>
  );
}

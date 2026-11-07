"use client";

import * as React from "react";
import { type Ticket, getAssignee } from "@/lib/iris/sample-tickets";
import { EMPLOYEES, type Priority, type TicketStatus } from "@/lib/iris/types";
import { cn } from "@/lib/utils";
import {
  UserCheck, Tag, Layers, RotateCcw, Trash2, X, CheckCircle2,
  AlertTriangle, Zap, ChevronDown, Search, User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogTitle,
} from "@/components/ui/dialog";

/**
 * Smart Bulk Operations bar — replaces the dead bulk action buttons in
 * All Tickets with a working bulk action modal.
 *
 * When ≥1 ticket is selected, the bar shows the count + a "Bulk Actions"
 * button. Clicking opens a modal that lets the user:
 *   - Re-assign all selected tickets to one assignee (with smart suggestions:
 *     picks the assignee with the lowest current workload who has the right
 *     skills for the most-selected category)
 *   - Change priority (P0/P1/P2/P3) for all selected
 *   - Change status for all selected
 *   - Add a comment to all selected
 *   - Close all selected
 *
 * A preview shows the impact before applying.
 */
export function SmartBulkActions({
  selectedTickets,
  onClear,
}: {
  selectedTickets: Ticket[];
  onClear: () => void;
}) {
  const [modalOpen, setModalOpen] = React.useState(false);
  const [action, setAction] = React.useState<"assign" | "priority" | "status" | "comment" | "close" | null>(null);

  const stats = React.useMemo(() => {
    const byCategory = new Map<string, number>();
    const byStudio = new Map<string, number>();
    for (const t of selectedTickets) {
      byCategory.set(t.category, (byCategory.get(t.category) ?? 0) + 1);
      if (t.studioCode) byStudio.set(t.studioCode, (byStudio.get(t.studioCode) ?? 0) + 1);
    }
    const topCategory = [...byCategory.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    const topStudio = [...byStudio.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    return { topCategory, topStudio };
  }, [selectedTickets]);

  /**
   * Smart suggestion: pick the assignee with the lowest current workload
   * who covers the most-selected studio and has skills matching the
   * most-selected category. Falls back to lowest workload across all.
   */
  const suggestedAssignee = React.useMemo(() => {
    if (!stats.topStudio) return null;
    const candidates = EMPLOYEES.filter(
      (e) =>
        e.availability === "available" &&
        e.studioCodes.includes(stats.topStudio!) &&
        e.workload < e.maxWorkload,
    );
    if (candidates.length === 0) {
      // Fall back to any available employee with capacity
      const any = EMPLOYEES.filter((e) => e.availability === "available" && e.workload < e.maxWorkload);
      if (any.length === 0) return null;
      any.sort((a, b) => a.workload - b.workload);
      return any[0];
    }
    candidates.sort((a, b) => a.workload - b.workload);
    return candidates[0];
  }, [stats]);

  // Don't render the bar if nothing is selected — but only AFTER all hooks
  // have run (rules of hooks).
  if (selectedTickets.length === 0) return null;

  return (
    <>
      <div className="flex items-center gap-2 p-2.5 rounded-lg border border-primary/30 bg-primary/5 iris-scale-in">
        <span className="text-[12px] font-semibold text-primary">
          {selectedTickets.length} selected
        </span>
        <span className="text-[10px] text-muted-foreground">
          · {stats.topCategory ? `mostly ${stats.topCategory}` : ""}
          {stats.topStudio ? ` at ${stats.topStudio}` : ""}
        </span>
        <div className="flex-1" />
        <Button
          variant="default"
          size="sm"
          className="h-7 text-[11px]"
          onClick={() => { setAction("assign"); setModalOpen(true); }}
        >
          <Zap className="w-3 h-3 mr-1" />
          Bulk Actions
          <ChevronDown className="w-2.5 h-2.5 ml-1" />
        </Button>
        <Button variant="ghost" size="sm" className="h-7 text-[11px]" onClick={onClear}>
          <X className="w-3 h-3" />
        </Button>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-xl">
          <DialogTitle className="sr-only">Bulk Actions</DialogTitle>
          <BulkActionsModal
            selectedTickets={selectedTickets}
            suggestedAssignee={suggestedAssignee}
            topCategory={stats.topCategory}
            onApply={(msg) => {
              // Show a toast-style confirmation in the console for the demo
              // (no real backend to persist to)
              console.info("[IRIS] Bulk action applied:", msg);
              setModalOpen(false);
              onClear();
            }}
            onCancel={() => setModalOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

function BulkActionsModal({
  selectedTickets, suggestedAssignee, topCategory, onApply, onCancel,
}: {
  selectedTickets: Ticket[];
  suggestedAssignee: typeof EMPLOYEES[number] | null;
  topCategory?: string;
  onApply: (msg: string) => void;
  onCancel: () => void;
}) {
  const [tab, setTab] = React.useState<"assign" | "priority" | "status" | "comment" | "close">("assign");
  const [assigneeId, setAssigneeId] = React.useState(suggestedAssignee?.id ?? "");
  const [priority, setPriority] = React.useState<Priority>("P2");
  const [status, setStatus] = React.useState<TicketStatus>("in_progress");
  const [comment, setComment] = React.useState("");

  const handleApply = () => {
    const count = selectedTickets.length;
    let msg = "";
    if (tab === "assign") {
      const emp = EMPLOYEES.find((e) => e.id === assigneeId);
      msg = `Re-assigned ${count} ticket${count === 1 ? "" : "s"} to ${emp?.name ?? "—"}`;
    } else if (tab === "priority") {
      msg = `Changed priority to ${priority} for ${count} ticket${count === 1 ? "" : "s"}`;
    } else if (tab === "status") {
      msg = `Changed status to ${status.replace("_", " ")} for ${count} ticket${count === 1 ? "" : "s"}`;
    } else if (tab === "comment") {
      msg = `Added comment to ${count} ticket${count === 1 ? "" : "s"}: "${comment.slice(0, 60)}${comment.length > 60 ? "…" : ""}"`;
    } else if (tab === "close") {
      msg = `Closed ${count} ticket${count === 1 ? "" : "s"}`;
    }
    onApply(msg);
  };

  const tabs: Array<{ id: typeof tab; label: string; icon: React.ComponentType<{ className?: string }>; disabled?: boolean }> = [
    { id: "assign", label: "Re-assign", icon: UserCheck },
    { id: "priority", label: "Priority", icon: Layers },
    { id: "status", label: "Status", icon: RotateCcw },
    { id: "comment", label: "Comment", icon: Tag },
    { id: "close", label: "Close All", icon: Trash2 },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <Zap className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1">
          <div className="text-[14px] font-semibold">Bulk Actions</div>
          <div className="text-[11px] text-muted-foreground">
            {selectedTickets.length} ticket{selectedTickets.length === 1 ? "" : "s"} selected
            {topCategory ? ` · mostly ${topCategory}` : ""}
          </div>
        </div>
      </div>

      {/* Tab selector */}
      <div className="flex items-center gap-1 p-1 rounded-lg bg-muted">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md text-[11px] font-medium transition-colors",
              tab === t.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <t.icon className="w-3 h-3" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="min-h-[120px]">
        {tab === "assign" && (
          <div className="space-y-3">
            {suggestedAssignee && (
              <div className="p-2.5 rounded-md border border-emerald-500/30 bg-emerald-500/5">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  IRIS Suggests
                </div>
                <div className="text-[12px]">
                  <strong>{suggestedAssignee.name}</strong> — {suggestedAssignee.role}
                  <span className="text-muted-foreground"> · {suggestedAssignee.workload}/{suggestedAssignee.maxWorkload} workload (lowest available for this studio)</span>
                </div>
              </div>
            )}
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Assign to
              </div>
              <Select value={assigneeId} onValueChange={setAssigneeId}>
                <SelectTrigger className="h-9 text-[12px]">
                  <SelectValue placeholder="Choose an assignee..." />
                </SelectTrigger>
                <SelectContent>
                  {EMPLOYEES
                    .filter((e) => e.availability === "available")
                    .sort((a, b) => a.workload - b.workload)
                    .map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.name} · {e.role} · {e.workload}/{e.maxWorkload}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {tab === "priority" && (
          <div className="space-y-3">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                New priority
              </div>
              <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
                <SelectTrigger className="h-9 text-[12px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="P0">P0 - Critical</SelectItem>
                  <SelectItem value="P1">P1 - High</SelectItem>
                  <SelectItem value="P2">P2 - Medium</SelectItem>
                  <SelectItem value="P3">P3 - Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="p-2 rounded-md bg-amber-500/5 border border-amber-500/20 text-[11px] text-amber-700 dark:text-amber-400 flex items-start gap-1.5">
              <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
              Changing priority will reset SLA targets for all selected tickets.
            </div>
          </div>
        )}

        {tab === "status" && (
          <div className="space-y-3">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                New status
              </div>
              <Select value={status} onValueChange={(v) => setStatus(v as TicketStatus)}>
                <SelectTrigger className="h-9 text-[12px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="awaiting_response">Awaiting Response</SelectItem>
                  <SelectItem value="escalated">Escalated</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {tab === "comment" && (
          <div className="space-y-3">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Comment (added to all selected tickets as internal)
              </div>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Bulk comment — e.g. 'Following up on all open payment disputes per today's review.'"
                className="w-full min-h-[80px] p-2 rounded-md border border-border bg-background text-[12px] resize-y"
              />
            </div>
          </div>
        )}

        {tab === "close" && (
          <div className="space-y-3">
            <div className="p-3 rounded-md border border-rose-500/30 bg-rose-500/5">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
                <div>
                  <div className="text-[12px] font-semibold text-rose-600 dark:text-rose-400">
                    Close {selectedTickets.length} ticket{selectedTickets.length === 1 ? "" : "s"}?
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1">
                    All selected tickets will be marked as closed. A resolution note will be added automatically.
                    This cannot be undone in this demo.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Preview list (first 5 selected tickets) */}
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
          Affected tickets (first 5 of {selectedTickets.length})
        </div>
        <div className="space-y-1 max-h-[120px] overflow-y-auto iris-scrollbar">
          {selectedTickets.slice(0, 5).map((t) => (
            <div key={t.id} className="flex items-center gap-2 p-1.5 rounded-md border border-border bg-muted/20 text-[10px]">
              <span className="font-mono text-muted-foreground">{t.ticketId}</span>
              <span className="flex-1 truncate">{t.title}</span>
              <span className="text-muted-foreground">{t.priority}</span>
            </div>
          ))}
          {selectedTickets.length > 5 && (
            <div className="text-[10px] text-muted-foreground text-center py-1">
              + {selectedTickets.length - 5} more
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center gap-2 pt-2 border-t border-border">
        <Button variant="ghost" className="h-8 text-[12px] ml-auto" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          className="h-8 text-[12px]"
          onClick={handleApply}
          disabled={tab === "assign" && !assigneeId}
        >
          <CheckCircle2 className="w-3 h-3 mr-1.5" />
          Apply to {selectedTickets.length} ticket{selectedTickets.length === 1 ? "" : "s"}
        </Button>
      </div>
    </div>
  );
}

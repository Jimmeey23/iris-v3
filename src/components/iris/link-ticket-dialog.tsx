"use client";

import * as React from "react";
import { Link2, Search, X } from "lucide-react";
import { ALL_TICKETS, type Ticket } from "@/lib/iris/sample-tickets";

/** Search the loaded tickets by number, title, member or studio and pick one to link. */
export function LinkTicketDialog({
  current,
  onPick,
  onClose,
}: {
  current: Ticket;
  onPick: (ticketNumber: string) => void;
  onClose: () => void;
}) {
  const [q, setQ] = React.useState("");
  const linked = new Set(current.relatedTickets ?? []);
  const terms = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const matches = ALL_TICKETS.filter((t) => t.id !== current.id && !linked.has(t.ticketId))
    .filter((t) => {
      if (!terms.length) return t.clientMomenceId && t.clientMomenceId === current.clientMomenceId;
      const hay = [t.ticketId, t.title, t.affectedClient, t.category, t.subcategory].join(" ").toLowerCase();
      return terms.every((x) => hay.includes(x));
    })
    .slice(0, 12);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border border-border rounded-xl max-w-lg w-full p-5 iris-scale-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-3">
          <Link2 className="w-4 h-4 text-primary" />
          <div className="text-[14px] font-semibold">Link a related ticket</div>
          <button type="button" onClick={onClose} className="ml-auto text-muted-foreground hover:text-foreground" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="relative mb-3">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Ticket number, title, member…"
            className="w-full h-8 pl-8 pr-2.5 text-[12px] rounded-md border border-border bg-card focus:outline-none focus:border-primary"
          />
        </div>
        <div className="space-y-1 max-h-[320px] overflow-y-auto">
          {matches.length === 0 ? (
            <div className="text-[11px] text-muted-foreground italic p-2">
              {terms.length ? "No tickets match." : "Type to search. Tickets for the same member appear here automatically."}
            </div>
          ) : (
            matches.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => onPick(t.ticketId)}
                className="w-full text-left flex items-center gap-2 p-2 rounded-md hover:bg-muted/60 transition-colors"
              >
                <span className="text-[11px] font-mono text-muted-foreground shrink-0">{t.ticketId}</span>
                <span className="text-[12px] truncate">{t.title}</span>
                <span className="text-[10px] text-muted-foreground ml-auto shrink-0 capitalize">{t.status.replace(/_/g, " ")}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

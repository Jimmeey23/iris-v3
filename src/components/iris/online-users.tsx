"use client";

import * as React from "react";
import { Users } from "lucide-react";
import { useAppStore } from "@/lib/iris/store";
import { useVisibleInterval } from "@/lib/iris/use-visible-interval";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { getInitials } from "@/lib/iris/utils";
import { RelativeTime } from "./relative-time";
import { ALL_TICKETS } from "@/lib/iris/sample-tickets";

type OnlineUser = { user_id: string; view: string; ticket_ref: string | null; last_seen: string; name: string; role: string };

/** Header widget: who is online right now and which page each person is on. */
export function OnlineUsers({ labels }: { labels: Record<string, string> }) {
  const view = useAppStore((s) => s.currentView);
  const ticketId = useAppStore((s) => s.selectedTicketId);
  const openTicket = useAppStore((s) => s.openTicket);
  const setCurrentView = useAppStore((s) => s.setCurrentView);
  const [online, setOnline] = React.useState<OnlineUser[]>([]);
  const [me, setMe] = React.useState<string | null>(null);

  const ticket = view === "all_tickets" ? ticketId : null;
  const beat = React.useCallback(async () => {
    try {
      const res = await fetch("/api/presence", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ view, ticket }),
      });
      if (!res.ok) return;
      const j = (await res.json()) as { online: OnlineUser[]; me: string };
      setOnline(j.online);
      setMe(j.me);
    } catch {
      /* offline: keep last list */
    }
  }, [view, ticket]);

  // Report page changes right away; otherwise one heartbeat a minute while the tab is visible.
  React.useEffect(() => {
    const id = window.setTimeout(() => void beat(), 0);
    return () => window.clearTimeout(id);
  }, [beat]);
  useVisibleInterval(() => void beat(), 60_000);

  const others = online.filter((u) => u.user_id !== me);
  const where = (u: OnlineUser) => `${labels[u.view] ?? u.view}${u.ticket_ref ? ` · ${ALL_TICKETS.find((t) => t.id === u.ticket_ref)?.ticketId ?? "a ticket"}` : ""}`;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" aria-label={`${online.length} online`} title="Who's online"
          className="flex items-center gap-1.5 h-9 pl-1.5 pr-2.5 rounded-full hover:bg-muted/60 transition-colors">
          <span className="flex -space-x-2">
            {(others.length ? others : online).slice(0, 3).map((u) => (
              <span key={u.user_id} className="w-6 h-6 rounded-full ring-2 ring-background bg-primary/15 text-primary text-[9px] font-semibold grid place-items-center">
                {getInitials(u.name)}
              </span>
            ))}
            {!online.length && <Users className="w-4 h-4 text-muted-foreground" />}
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] font-medium tabular-nums">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />{online.length}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-72 p-0">
        <div className="px-3 py-2 border-b border-border text-[12px] font-semibold flex items-center justify-between">
          Online now <span className="text-[10px] font-normal text-muted-foreground">{online.length} {online.length === 1 ? "person" : "people"}</span>
        </div>
        <div className="max-h-80 overflow-y-auto p-1">
          {online.map((u) => {
            const isMe = u.user_id === me;
            return (
              <button key={u.user_id} type="button" disabled={isMe}
                onClick={() => (u.ticket_ref ? openTicket(u.ticket_ref) : setCurrentView(u.view as never))}
                className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-left hover:bg-muted/60 disabled:hover:bg-transparent">
                <span className="relative w-7 h-7 rounded-full bg-primary/15 text-primary text-[10px] font-semibold grid place-items-center shrink-0">
                  {getInitials(u.name)}
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-popover" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[12px] font-medium truncate">{u.name}{isMe && <span className="text-muted-foreground font-normal"> (you)</span>}</span>
                  <span className="block text-[10px] text-muted-foreground truncate">On {where(u)}</span>
                </span>
                <span className="text-[9px] text-muted-foreground/70 shrink-0"><RelativeTime date={u.last_seen} /></span>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

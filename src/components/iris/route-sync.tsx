"use client";

import * as React from "react";
import { useAppStore } from "@/lib/iris/store";
import { ALL_TICKETS } from "@/lib/iris/sample-tickets";
import { parseAppPath, pathFor } from "@/lib/iris/routes";

/**
 * Keeps the address bar and the app in step, both ways:
 *  - on load, /trainers or /tickets/P57-00142 (or legacy /?ticket=...) opens that view/ticket;
 *  - navigating in the app pushes a history entry, so Back/Forward and sharing links work.
 */
export function RouteSync() {
  const currentView = useAppStore((s) => s.currentView);
  const selectedTicketId = useAppStore((s) => s.selectedTicketId);
  const dataVersion = useAppStore((s) => s.dataVersion);
  const pendingTicket = React.useRef<string | null>(null);
  const ready = React.useRef(false);
  const fromPop = React.useRef(false);

  // Initial URL -> state (runs once).
  React.useEffect(() => {
    const url = new URL(window.location.href);
    const { view, ticket } = parseAppPath(url.pathname);
    const legacy = url.searchParams.get("ticket");
    const st = useAppStore.getState();
    if (view && view !== st.currentView) st.setCurrentView(view);
    pendingTicket.current = ticket ?? legacy;
    if (legacy) {
      url.searchParams.delete("ticket");
      window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
    }
    ready.current = true;
  }, []);

  // Resolve a linked ticket once tickets have loaded (accepts the display ref or the id).
  React.useEffect(() => {
    const ref = pendingTicket.current;
    if (!ref) return;
    const t = ALL_TICKETS.find((x) => x.id === ref || x.ticketId === ref);
    if (!t) return;
    pendingTicket.current = null;
    const st = useAppStore.getState();
    const ticketViews = ["all_tickets", "my_tickets", "department_queue", "escalations"];
    if (!ticketViews.includes(st.currentView)) st.setCurrentView("all_tickets");
    st.selectTicket(t.id);
  }, [dataVersion]);

  // State -> URL.
  React.useEffect(() => {
    if (!ready.current || pendingTicket.current) return;
    const t = selectedTicketId ? ALL_TICKETS.find((x) => x.id === selectedTicketId) : null;
    const target = pathFor(currentView, t ? t.ticketId || t.id : null);
    const here = window.location.pathname;
    if (here === target) return;
    if (fromPop.current || here === "/") {
      window.history.replaceState(window.history.state, "", target + window.location.search + window.location.hash);
    } else {
      window.history.pushState(null, "", target + window.location.search + window.location.hash);
    }
    fromPop.current = false;
  }, [currentView, selectedTicketId, dataVersion]);

  // Back / Forward -> state.
  React.useEffect(() => {
    const onPop = () => {
      const { view, ticket } = parseAppPath(window.location.pathname);
      const st = useAppStore.getState();
      fromPop.current = true;
      if (view && view !== st.currentView) st.setCurrentView(view);
      if (ticket) {
        const t = ALL_TICKETS.find((x) => x.id === ticket || x.ticketId === ticket);
        st.selectTicket(t ? t.id : null);
      } else if (st.selectedTicketId) {
        st.selectTicket(null);
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  return null;
}

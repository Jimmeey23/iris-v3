/**
 * Notification event taxonomy — pure, so both the server (notify.ts, sweeps) and the
 * unit tests can import it without pulling in `server-only` or the database.
 */

export type NotifyEvent =
  | "ticket_created"
  | "ticket_assigned"
  | "owner_added"
  | "department_added"
  | "status_in_progress"
  | "status_awaiting_response"
  | "status_resolved"
  | "status_closed"
  | "status_reopened"
  | "comment_added"
  | "escalated"
  | "sla_at_risk"
  | "sla_breached";

/** Event -> notification_rules.event (the names shown in Settings > Notifications). */
export const RULE_EVENT: Record<NotifyEvent, string> = {
  ticket_created: "Ticket created",
  ticket_assigned: "Ticket assigned",
  owner_added: "Owner added",
  department_added: "Department added",
  status_in_progress: "Ticket in progress",
  status_awaiting_response: "Awaiting response",
  status_resolved: "Ticket resolved",
  status_closed: "Ticket closed",
  status_reopened: "Ticket reopened",
  comment_added: "New comment",
  escalated: "Ticket escalated",
  sla_at_risk: "SLA approaching",
  sla_breached: "SLA breached",
};

/** Map a PATCH status change onto an event, or null if the move isn't a notifying stage. */
export function statusEvent(from: string | null | undefined, to: string): NotifyEvent | null {
  if (from === to) return null;
  const reopened = (from === "resolved" || from === "closed") && (to === "open" || to === "in_progress");
  if (reopened) return "status_reopened";
  switch (to) {
    case "in_progress":
      return "status_in_progress";
    case "awaiting_response":
      return "status_awaiting_response";
    case "resolved":
      return "status_resolved";
    case "closed":
      return "status_closed";
    case "escalated":
      return "escalated";
    default:
      return null;
  }
}

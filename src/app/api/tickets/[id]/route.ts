import { NextResponse, type NextRequest } from "next/server";
import { withUser } from "@/lib/server/db";
import { dbError, requireSession } from "@/lib/server/auth";
import { fetchTicket } from "@/lib/server/tickets";
import { notifyTicketEvent, statusEvent } from "@/lib/server/notify";

const STATUSES = ["open", "in_progress", "awaiting_response", "resolved", "closed", "escalated"];
const PRIORITIES = ["P0", "P1", "P2", "P3"];
const SLA = ["on_track", "at_risk", "breached", "paused"];

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/tickets/[id]">) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;
  try {
    const ticket = await withUser(auth.session.user_id, (c) => fetchTicket(c, id));
    if (!ticket) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ticket });
  } catch (err) {
    return dbError(err);
  }
}

/** Diff the pre-update row against the saved ticket and notify each stage that changed. */
function notifyPatchChanges(
  before: { status: string; assignee_id: string | null; escalation_level: number; sla_status: string },
  ticket: NonNullable<Awaited<ReturnType<typeof fetchTicket>>>,
  session: Parameters<typeof notifyTicketEvent>[2],
) {
  const newAssignee = ticket.assigneeId ?? null;
  if (newAssignee !== before.assignee_id && newAssignee) {
    notifyTicketEvent("ticket_assigned", ticket, session, { previousAssigneeId: before.assignee_id });
  }
  const ev = statusEvent(before.status, ticket.status);
  if (ev && !(ev === "escalated" && ticket.escalationLevel > before.escalation_level)) {
    notifyTicketEvent(ev, ticket, session, { previousStatus: before.status });
  }
  if (ticket.escalationLevel > before.escalation_level) notifyTicketEvent("escalated", ticket, session);
  if (ticket.slaStatus !== before.sla_status) {
    if (ticket.slaStatus === "breached") notifyTicketEvent("sla_breached", ticket, session, { dedupe: `sla:${ticket.slaResolutionTarget}` });
    else if (ticket.slaStatus === "at_risk") notifyTicketEvent("sla_at_risk", ticket, session, { dedupe: `sla:${ticket.slaResolutionTarget}` });
  }
}

export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/tickets/[id]">) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;
  const b = await request.json().catch(() => ({}));

  const sets: string[] = [];
  const vals: unknown[] = [];
  const set = (col: string, v: unknown) => { vals.push(v); sets.push(`${col} = $${vals.length}`); };

  if (b.status !== undefined) {
    if (!STATUSES.includes(b.status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    set("status", b.status);
  }
  if (b.priority !== undefined) {
    if (!PRIORITIES.includes(b.priority)) return NextResponse.json({ error: "Invalid priority" }, { status: 400 });
    set("priority", b.priority);
  }
  if (b.slaStatus !== undefined) {
    if (!SLA.includes(b.slaStatus)) return NextResponse.json({ error: "Invalid SLA status" }, { status: 400 });
    set("sla_status", b.slaStatus);
  }
  if (b.assigneeId !== undefined) set("assignee_id", b.assigneeId || null);
  if (typeof b.resolutionSummary === "string") set("resolution_summary", b.resolutionSummary.slice(0, 5000));
  if (typeof b.resolution === "string") set("resolution", b.resolution.slice(0, 5000));
  if (typeof b.investigationNotes === "string") set("investigation_notes", b.investigationNotes.slice(0, 10000));
  if (Number.isInteger(b.escalationLevel)) set("escalation_level", Math.max(0, Math.min(5, b.escalationLevel)));
  if (Number.isFinite(b.extendSlaHours) && b.extendSlaHours > 0) {
    vals.push(Math.min(168, b.extendSlaHours));
    sets.push(`sla_resolution_target = coalesce(sla_resolution_target, now()) + make_interval(hours => $${vals.length}::int)`);
  }
  if (!sets.length) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

  try {
    let before: { status: string; assignee_id: string | null; escalation_level: number; sla_status: string } | null = null;
    const ticket = await withUser(auth.session.user_id, async (c) => {
      const cur = (await c.query("select metadata, status, assignee_id, escalation_level, sla_status from tickets where id = $1", [id])).rows[0];
      before = cur ?? null;
      if (!cur) return null;
      if (cur.metadata?.lock_assignment && b.assigneeId !== undefined) {
        throw Object.assign(new Error("Imported legacy tickets can't be reassigned"), { code: "P0001" });
      }
      if (cur.metadata?.legacy_import && (b.status !== undefined || b.extendSlaHours !== undefined || b.slaStatus !== undefined)) {
        throw Object.assign(new Error("Imported legacy tickets are closed and read-only"), { code: "P0001" });
      }
      vals.push(id);
      await c.query(`update tickets set ${sets.join(", ")} where id = $${vals.length}`, vals);
      return fetchTicket(c, id);
    });
    if (!ticket) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (before) notifyPatchChanges(before, ticket, auth.session);
    return NextResponse.json({ ticket });
  } catch (err) {
    return dbError(err);
  }
}

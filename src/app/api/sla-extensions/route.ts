import { NextResponse, type NextRequest } from "next/server";
import { asSystem, withUser } from "@/lib/server/db";
import { dbError, requireSession } from "@/lib/server/auth";
import { notifyTicketEvent } from "@/lib/server/notify";
import { RateLimitError, enforceRateLimit, userKey } from "@/lib/server/rate-limit";

/**
 * GET: what the SLA breach banner needs for the signed-in person.
 *   breaches         - open tickets they own that are past their SLA (RLS decides visibility,
 *                      so admin-only categories never reach non-admins)
 *   pendingApprovals - extension requests waiting on them as reporting manager
 *
 * POST { ticketId, hours, reason }: ask the reporting manager for more time.
 * Nothing is added to the SLA until the manager approves (see ./[id]/route.ts).
 * All notifications go to internal staff only, never to members.
 */
export async function GET() {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const { session } = auth;
  if (!session.employee_id) return NextResponse.json({ breaches: [], pendingApprovals: [] });
  try {
    const breaches = await withUser(session.user_id, async (c) =>
      (
        await c.query(
          `select t.id, t.ticket_id, t.title, t.priority, t.sla_resolution_target,
                  r.id as request_id, r.hours as request_hours, r.created_at as requested_at
             from tickets t
             left join sla_extension_requests r on r.ticket_id = t.id and r.status = 'pending'
            where t.status not in ('resolved', 'closed')
              and (t.sla_status = 'breached' or t.sla_resolution_target < now())
              and (t.assignee_id = $1 or $1 = any(coalesce(t.assignee_ids, '{}')))
            order by t.sla_resolution_target asc nulls last
            limit 200`,
          [session.employee_id],
        )
      ).rows,
    );
    const pendingApprovals = await asSystem(async (c) =>
      (
        await c.query(
          `select r.id, r.ticket_id, r.hours, r.reason, r.created_at, t.ticket_id as ticket_ref, t.title,
                  e.name as requester_name
             from sla_extension_requests r
             join tickets t on t.id = r.ticket_id
             left join employees e on e.id = r.requester_employee_id
            where r.status = 'pending' and r.approver_employee_id = $1
              and (t.category is distinct from 'Trainer Feedback' or $2)
            order by r.created_at asc
            limit 100`,
          [session.employee_id, session.role === "admin"],
        )
      ).rows,
    );
    return NextResponse.json({
      breaches: breaches.map((r) => ({
        id: r.id,
        ticketId: r.ticket_id,
        title: r.title,
        priority: r.priority,
        slaResolutionTarget: r.sla_resolution_target ? new Date(r.sla_resolution_target).toISOString() : null,
        pendingRequest: r.request_id
          ? { id: r.request_id, hours: r.request_hours, requestedAt: new Date(r.requested_at).toISOString() }
          : null,
      })),
      pendingApprovals: pendingApprovals.map((r) => ({
        id: r.id,
        ticket: r.ticket_id,
        ticketRef: r.ticket_ref,
        title: r.title,
        hours: r.hours,
        reason: r.reason,
        requesterName: r.requester_name,
        requestedAt: new Date(r.created_at).toISOString(),
      })),
    });
  } catch (err) {
    return dbError(err);
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const { session } = auth;
  try {
    await enforceRateLimit("ticket-write", userKey(session.user_id));
  } catch (e) {
    if (e instanceof RateLimitError) {
      return NextResponse.json({ error: e.message }, { status: 429, headers: { "Retry-After": String(e.resetsInSec) } });
    }
    return NextResponse.json({ error: "Try again in a moment." }, { status: 503 });
  }

  const b = await request.json().catch(() => ({}));
  const ticketId = typeof b.ticketId === "string" ? b.ticketId.trim() : "";
  const hours = Number(b.hours);
  const reason = typeof b.reason === "string" ? b.reason.trim().slice(0, 1000) : "";
  if (!ticketId) return NextResponse.json({ error: "Missing ticket" }, { status: 400 });
  if (!Number.isInteger(hours) || hours < 1 || hours > 168) {
    return NextResponse.json({ error: "Hours must be a whole number between 1 and 168" }, { status: 400 });
  }
  if (reason.length < 5) return NextResponse.json({ error: "Give a short reason for the extra time" }, { status: 400 });

  try {
    // Visibility check runs under RLS: you can only ask for time on a ticket you can see.
    const ticket = await withUser(session.user_id, async (c) =>
      (
        await c.query(
          "select id, ticket_id, title, status, assignee_id, assignee_ids, department_code from tickets where id = $1 or ticket_id = $1 limit 1",
          [ticketId],
        )
      ).rows[0],
    );
    if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    if (["resolved", "closed"].includes(ticket.status)) {
      return NextResponse.json({ error: "This ticket is already resolved" }, { status: 400 });
    }

    const requesterEmp = session.employee_id ?? ticket.assignee_id ?? null;
    const created = await asSystem(async (c) => {
      // Approver: requester's reporting manager -> ticket department head -> an active admin.
      const approver =
        (
          await c.query(
            `select m.id, m.name from employees e
               join employees m on m.name = e.reporting_manager and m.is_active
              where e.id = $1 and m.id <> e.id limit 1`,
            [requesterEmp],
          )
        ).rows[0] ??
        (
          await c.query(
            `select h.id, h.name from departments d join employees h on h.id = d.head_employee_id and h.is_active
              where d.code = $1 and h.id is distinct from $2 limit 1`,
            [ticket.department_code, requesterEmp],
          )
        ).rows[0] ??
        (
          await c.query(
            `select e.id, e.name from users u join employees e on e.id = u.employee_id
              where u.role = 'admin' and u.is_active and e.is_active and e.id is distinct from $1
              order by u.created_at asc limit 1`,
            [requesterEmp],
          )
        ).rows[0];
      if (!approver) {
        throw Object.assign(new Error("No reporting manager is set for you. Ask an admin to add one."), { code: "P0001" });
      }
      const existing = (
        await c.query("select id from sla_extension_requests where ticket_id = $1 and status = 'pending'", [ticket.id])
      ).rows[0];
      if (existing) throw Object.assign(new Error("A request for more time is already waiting for approval"), { code: "P0001" });

      const { rows } = await c.query(
        `insert into sla_extension_requests (ticket_id, requested_by_user_id, requester_employee_id, approver_employee_id, hours, reason)
         values ($1, $2, $3, $4, $5, $6) returning id, created_at`,
        [ticket.id, session.user_id, requesterEmp, approver.id, hours, reason],
      );
      const requesterName =
        ((await c.query("select name from employees where id = $1", [requesterEmp])).rows[0]?.name as string | undefined) ??
        session.email;
      await c.query(
        `insert into ticket_activities (ticket_id, activity_type, description, actor_user_id, actor_name)
         values ($1, 'sla_updated', $2, $3, $4)`,
        [ticket.id, `Requested ${hours}h more SLA time from ${approver.name}: ${reason}`, session.user_id, requesterName],
      );
      return { id: rows[0].id as string, approver, requesterName };
    });

    notifyTicketEvent("sla_extension_requested", { id: ticket.id, title: ticket.title }, session, {
      dedupe: created.id,
      extension: {
        hours,
        reason,
        requesterEmployeeId: requesterEmp,
        requesterName: created.requesterName,
        approverEmployeeId: created.approver.id,
        approverName: created.approver.name,
      },
    });
    return NextResponse.json(
      { request: { id: created.id, hours, approverName: created.approver.name, status: "pending" } },
      { status: 201 },
    );
  } catch (err) {
    return dbError(err);
  }
}

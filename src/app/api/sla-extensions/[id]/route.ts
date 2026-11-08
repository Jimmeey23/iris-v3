import { NextResponse, type NextRequest } from "next/server";
import { asSystem } from "@/lib/server/db";
import { dbError, requireSession } from "@/lib/server/auth";
import { notifyTicketEvent } from "@/lib/server/notify";

/**
 * POST { decision: "approved" | "rejected", note? }
 * Only the assigned approver (the requester's reporting manager) or an admin may decide.
 * Approval is the only path that adds time to the SLA: the new target is the later of
 * the old target and now, plus the requested hours, so the owner really gets that time.
 */
export async function POST(request: NextRequest, ctx: RouteContext<"/api/sla-extensions/[id]">) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const { session } = auth;
  const { id } = await ctx.params;
  const b = await request.json().catch(() => ({}));
  const decision = b.decision === "approved" || b.decision === "rejected" ? (b.decision as "approved" | "rejected") : null;
  if (!decision) return NextResponse.json({ error: "Decision must be approved or rejected" }, { status: 400 });
  const note = typeof b.note === "string" ? b.note.trim().slice(0, 1000) || null : null;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const out = await asSystem(async (c) => {
      const r = (
        await c.query(
          `select r.*, t.title, t.category from sla_extension_requests r join tickets t on t.id = r.ticket_id
            where r.id = $1 for update of r`,
          [id],
        )
      ).rows[0];
      if (!r) return null;
      const isAdmin = session.role === "admin";
      if (r.category === "Trainer Feedback" && !isAdmin) return null;
      if (!isAdmin && r.approver_employee_id !== session.employee_id) {
        throw Object.assign(new Error("Only the requester's reporting manager can decide this"), { code: "42501" });
      }
      if (!isAdmin && r.requester_employee_id && r.requester_employee_id === session.employee_id) {
        throw Object.assign(new Error("You can't approve your own request"), { code: "42501" });
      }
      if (r.status !== "pending") throw Object.assign(new Error(`This request was already ${r.status}`), { code: "P0001" });

      const deciderName =
        ((await c.query("select name from employees where id = $1", [session.employee_id])).rows[0]?.name as string | undefined) ??
        session.email;
      await c.query(
        `update sla_extension_requests
            set status = $2, decided_by_user_id = $3, decided_by_name = $4, decision_note = $5, decided_at = now()
          where id = $1`,
        [id, decision, session.user_id, deciderName, note],
      );
      if (decision === "approved") {
        await c.query(
          `update tickets
              set sla_resolution_target = greatest(coalesce(sla_resolution_target, now()), now()) + make_interval(hours => $2::int),
                  sla_status = 'on_track'
            where id = $1`,
          [r.ticket_id, r.hours],
        );
      }
      await c.query(
        `insert into ticket_activities (ticket_id, activity_type, description, actor_user_id, actor_name)
         values ($1, 'sla_updated', $2, $3, $4)`,
        [
          r.ticket_id,
          decision === "approved"
            ? `Approved ${r.hours}h SLA extension${note ? `: ${note}` : ""}`
            : `Declined ${r.hours}h SLA extension${note ? `: ${note}` : ""}`,
          session.user_id,
          deciderName,
        ],
      );
      return { r, deciderName };
    });
    if (!out) return NextResponse.json({ error: "Not found" }, { status: 404 });

    notifyTicketEvent("sla_extension_decided", { id: out.r.ticket_id, title: out.r.title }, session, {
      dedupe: `${id}:${decision}`,
      extension: {
        hours: out.r.hours,
        reason: out.r.reason,
        requesterEmployeeId: out.r.requester_employee_id,
        approverName: out.deciderName,
        decision,
        decisionNote: note,
      },
    });
    return NextResponse.json({ request: { id, status: decision } });
  } catch (err) {
    const e = err as { code?: string; message?: string };
    if (e.code === "42501") return NextResponse.json({ error: e.message }, { status: 403 });
    return dbError(err);
  }
}

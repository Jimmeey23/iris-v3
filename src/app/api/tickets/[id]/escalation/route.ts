import { NextResponse, type NextRequest } from "next/server";
import { pool } from "@/lib/server/db";
import { dbError, requireSession } from "@/lib/server/auth";

/**
 * The escalation ladder for one ticket: where it stands, who each level goes
 * to, the full escalation history, and when the next automatic escalation
 * fires. Read-only; level changes go through PATCH /api/tickets/[id].
 */
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/tickets/[id]/escalation">) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;

  try {
    const [ticketRes, logRes, settingsRes] = await Promise.all([
      pool.query(
        `select t.id, t.status, t.sla_status, t.sla_resolution_target, t.escalation_level,
                t.assignee_id, a.name as assignee_name,
                m.id as manager_id, m.name as manager_name,
                l2.id as policy_l2_id, l2.name as policy_l2_name,
                h.id as dept_head_id, h.name as dept_head_name
           from iris.tickets t
           left join iris.employees a on a.id = t.assignee_id
           left join iris.employees l2 on l2.id = t.collected_info->>'_escalation_l2' and l2.is_active
           left join iris.employees m on m.name = (select e.reporting_manager from iris.employees e where e.id = t.assignee_id)
                                      and m.is_active and not m.exclude_from_escalation
           left join iris.departments d on d.code = t.department_code
           left join iris.employees h on h.id = d.head_employee_id and h.is_active and not h.exclude_from_escalation
          where t.id = $1 or t.ticket_id = $1`,
        [id],
      ),
      pool.query(
        `select l.escalation_level, l.escalated_to_role, l.reason, l.automatic, l.escalated_at,
                e.name as escalated_to_name, coalesce(emp.name, u.email::text) as escalated_by_name
           from iris.escalation_log l
           left join iris.employees e on e.id = l.escalated_to_employee_id
           left join iris.users u on u.id = l.escalated_by_user_id
           left join iris.employees emp on emp.id = u.employee_id
          where l.ticket_id = (select id from iris.tickets where id = $1 or ticket_id = $1)
          order by l.escalated_at desc
          limit 50`,
        [id],
      ),
      pool.query(
        `select key, value from iris.app_settings
          where key in ('ops.escalate_after_breach_hours','ops.escalation_max_level')`,
      ),
    ]);

    const t = ticketRes.rows[0];
    if (!t) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const num = (key: string, fallback: number) => {
      const n = Number(settingsRes.rows.find((r) => r.key === key)?.value);
      return Number.isFinite(n) && n > 0 ? n : fallback;
    };
    const afterBreachHours = num("ops.escalate_after_breach_hours", 4);
    const maxLevel = num("ops.escalation_max_level", 3);

    // Mirrors escalationDecision (ops-policy.ts): level N fires afterBreachHours × N past the target.
    const level: number = t.escalation_level ?? 0;
    const open = !["resolved", "closed"].includes(t.status);
    let nextEscalationAt: string | null = null;
    if (open && t.sla_resolution_target && level < maxLevel && t.sla_status !== "paused") {
      nextEscalationAt = new Date(
        new Date(t.sla_resolution_target).getTime() + afterBreachHours * 3_600_000 * (level + 1),
      ).toISOString();
    }

    return NextResponse.json({
      level,
      maxLevel,
      afterBreachHours,
      slaStatus: t.sla_status,
      slaResolutionTarget: t.sla_resolution_target,
      nextEscalationAt,
      ladder: [
        { level: 0, role: "owner", name: t.assignee_name ?? null },
        { level: 1, role: "reporting manager", name: t.policy_l2_name ?? t.manager_name ?? null },
        { level: 2, role: "department head", name: t.dept_head_name ?? null },
        { level: 3, role: "admin", name: null },
      ].slice(0, Math.max(maxLevel, 3) + 1),
      history: logRes.rows.map((r) => ({
        level: r.escalation_level,
        toRole: r.escalated_to_role,
        toName: r.escalated_to_name ?? null,
        byName: r.escalated_by_name ?? null,
        reason: r.reason,
        automatic: r.automatic,
        at: r.escalated_at,
      })),
    });
  } catch (err) {
    return dbError(err);
  }
}

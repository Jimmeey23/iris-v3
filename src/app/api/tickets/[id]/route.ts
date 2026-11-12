import { NextResponse, type NextRequest } from "next/server";
import { asSystem, withUser } from "@/lib/server/db";
import { dbError, requireSession } from "@/lib/server/auth";
import { fetchTicket } from "@/lib/server/tickets";
import { notifyTicketEvent, statusEvent } from "@/lib/server/notify";
import { computeSlaTargets, type BusinessHoursMap } from "@/lib/iris/sla-calculator";

const STATUSES = ["open", "in_progress", "awaiting_response", "resolved", "closed", "escalated"];
const PRIORITIES = ["P0", "P1", "P2", "P3"];
const strList = (v: unknown, max = 10) =>
  Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === "string" && !!x.trim()).map((x) => x.trim().slice(0, 64)))].slice(0, max) : [];
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

interface BeforeSnapshot {
  status: string;
  priority: string;
  assignee_id: string | null;
  assignee_ids: string[] | null;
  department_codes: string[] | null;
  escalation_level: number;
  sla_status: string;
  created_at: string;
}

/** Diff the pre-update row against the saved ticket and notify each stage that changed. */
function notifyPatchChanges(
  before: BeforeSnapshot,
  ticket: NonNullable<Awaited<ReturnType<typeof fetchTicket>>>,
  session: Parameters<typeof notifyTicketEvent>[2],
) {
  const newAssignee = ticket.assigneeId ?? null;
  if (newAssignee !== before.assignee_id && newAssignee) {
    notifyTicketEvent("ticket_assigned", ticket, session, { previousAssigneeId: before.assignee_id });
  }

  const prevOwners = new Set(before.assignee_ids ?? (before.assignee_id ? [before.assignee_id] : []));
  const addedOwners = (ticket.assigneeIds ?? []).filter((oid) => !prevOwners.has(oid) && oid !== newAssignee);
  if (addedOwners.length > 0) {
    notifyTicketEvent("owner_added", ticket, session, { addedOwnerIds: addedOwners });
  }

  const prevDepts = new Set(before.department_codes ?? []);
  const addedDepts = (ticket.departmentCodes ?? []).filter((dc) => !prevDepts.has(dc) && dc !== ticket.departmentCode);
  if (addedDepts.length > 0) {
    notifyTicketEvent("department_added", ticket, session, { addedDepartmentCodes: addedDepts });
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
  if (Array.isArray(b.assigneeIds)) set("assignee_ids", strList(b.assigneeIds));
  if (Array.isArray(b.departmentCodes)) set("department_codes", strList(b.departmentCodes));
  if (b.departmentCode !== undefined) set("department_code", b.departmentCode || null);
  // Linked tickets are stored by their human ticket number (P57-…); tags are free text.
  if (Array.isArray(b.relatedTicketIds)) set("related_ticket_ids", strList(b.relatedTicketIds, 20).filter((x) => /^P57-[A-Z0-9-]{1,20}$/i.test(x)).slice(0, 20));
  if (Array.isArray(b.tags)) set("tags", strList(b.tags, 30).map((x) => x.slice(0, 60)).slice(0, 30));
  if (typeof b.resolutionSummary === "string") set("resolution_summary", b.resolutionSummary.slice(0, 5000));
  if (typeof b.resolution === "string") set("resolution", b.resolution.slice(0, 5000));
  if (typeof b.investigationNotes === "string") set("investigation_notes", b.investigationNotes.slice(0, 10000));
  if (Number.isInteger(b.escalationLevel)) set("escalation_level", Math.max(0, Math.min(5, b.escalationLevel)));
  // Non-admins can't add SLA time directly; they request it from their reporting manager
  // via /api/sla-extensions and it's added only on approval.
  if (b.slaStatus !== undefined && auth.session.role !== "admin") {
    return NextResponse.json({ error: "Only admins can pause or change the SLA" }, { status: 403 });
  }
  if (b.extendSlaHours !== undefined && auth.session.role !== "admin") {
    return NextResponse.json({ error: "Ask your reporting manager for more time instead" }, { status: 403 });
  }
  if (Number.isFinite(b.extendSlaHours) && b.extendSlaHours > 0) {
    vals.push(Math.min(168, b.extendSlaHours));
    sets.push(`sla_resolution_target = coalesce(sla_resolution_target, now()) + make_interval(hours => $${vals.length}::int)`);
  }
  if (b.acknowledge === true) {
    vals.push(
      JSON.stringify({
        _requires_acknowledgment: false,
        _acknowledged_at: new Date().toISOString(),
        _acknowledged_by: auth.session.email,
      }),
    );
    sets.push(`collected_info = coalesce(collected_info, '{}'::jsonb) || $${vals.length}::jsonb`);
    sets.push("first_response_at = coalesce(first_response_at, now())");
  }
  // Reopening clears the resolution timestamp so SLA and reports treat it as live again.
  if (b.status !== undefined && !["resolved", "closed"].includes(b.status)) sets.push("resolved_at = null");

  const isAdmin = auth.session.role === "admin";
  if (isAdmin) {
    const text = (k: string, col: string, max: number, required = false) => {
      if (typeof b[k] !== "string") return;
      const v = b[k].trim().slice(0, max);
      if (required && !v) return;
      set(col, v || null);
    };
    text("title", "title", 300, true);
    text("description", "description", 20000, true);
    text("category", "category", 120, true);
    text("subcategory", "subcategory", 160);
    text("studioCode", "studio_code", 16);
    text("recommendedResolution", "recommended_resolution", 10000);
    text("businessImpact", "business_impact", 5000);
    text("severity", "severity", 40);
    if (b.slaResolutionTarget === null || typeof b.slaResolutionTarget === "string") {
      const d = b.slaResolutionTarget ? new Date(b.slaResolutionTarget) : null;
      if (d && Number.isNaN(d.getTime())) return NextResponse.json({ error: "Invalid SLA target" }, { status: 400 });
      set("sla_resolution_target", d);
    }
    if (b.unlock === true) sets.push("metadata = metadata - 'legacy_import' - 'lock_assignment' - 'sla_exempt'");
  }
  if (!sets.length) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

  try {
    let before: BeforeSnapshot | null = null;
    const ticket = await withUser(auth.session.user_id, async (c) => {
      const cur = (
        await c.query(
          "select metadata, status, priority, assignee_id, assignee_ids, department_codes, escalation_level, sla_status, created_at from tickets where id = $1",
          [id],
        )
      ).rows[0];
      before = cur ?? null;
      if (!cur) return null;
      if (!isAdmin && cur.metadata?.lock_assignment && (b.assigneeId !== undefined || b.assigneeIds !== undefined)) {
        throw Object.assign(new Error("Imported legacy tickets can't be reassigned"), { code: "P0001" });
      }
      if (!isAdmin && cur.metadata?.legacy_import && (b.status !== undefined || b.extendSlaHours !== undefined || b.slaStatus !== undefined)) {
        throw Object.assign(new Error("Imported legacy tickets are closed and read-only"), { code: "P0001" });
      }

      // If reassigned and `routing.require_acknowledgment` is enabled, flag acknowledgment required
      if (b.assigneeId && b.assigneeId !== cur.assignee_id && b.acknowledge !== true) {
        const reqAck = (await c.query("select value from app_settings where key = 'routing.require_acknowledgment'")).rows[0];
        if (reqAck?.value === true) {
          vals.push(JSON.stringify({ _requires_acknowledgment: true, _acknowledged_at: null }));
          sets.push(`collected_info = coalesce(collected_info, '{}'::jsonb) || $${vals.length}::jsonb`);
        }
      }

      // Recompute SLA targets when priority changes (unless admin passed explicit slaResolutionTarget)
      if (b.priority && b.priority !== cur.priority && b.slaResolutionTarget === undefined) {
        const [slaRes, bhRes] = await Promise.all([
          c.query<{
            response_target_mins: number;
            resolution_target_mins: number;
            business_hours_only: boolean;
          }>(
            "select response_target_mins, resolution_target_mins, business_hours_only from sla_definitions where priority = $1 limit 1",
            [b.priority],
          ),
          c.query("select value from app_settings where key = 'sla.business_hours'"),
        ]);
        const def = slaRes.rows[0];
        if (def) {
          const targets = computeSlaTargets({
            createdAt: cur.created_at ? new Date(cur.created_at) : new Date(),
            responseTargetMins: Number(def.response_target_mins),
            resolutionTargetMins: Number(def.resolution_target_mins),
            businessHoursOnly: Boolean(def.business_hours_only),
            businessHours: (bhRes.rows[0]?.value ?? null) as BusinessHoursMap | null,
          });
          set("sla_response_target", targets.slaResponseTarget);
          set("sla_resolution_target", targets.slaResolutionTarget);
        }
      }

      vals.push(id);
      await c.query(`update tickets set ${sets.join(", ")} where id = $${vals.length}`, vals);

      if (b.acknowledge === true) {
        await c
          .query(
            `insert into ticket_activities (ticket_id, activity_type, description, actor_user_id, actor_name)
             values ($1, 'acknowledged', 'Ownership acknowledged', $2, $3)`,
            [id, auth.session.user_id, auth.session.email],
          )
          .catch(() => {});
      }

      return fetchTicket(c, id);
    });
    if (!ticket) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (before) notifyPatchChanges(before, ticket, auth.session);
    return NextResponse.json({ ticket });
  } catch (err) {
    return dbError(err);
  }
}

/** Admin-only hard delete. Activities, comments and attachments cascade; the audit log keeps a copy. */
export async function DELETE(_req: NextRequest, ctx: RouteContext<"/api/tickets/[id]">) {
  const auth = await requireSession({ admin: true });
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;
  try {
    const gone = await asSystem(async (c) => {
      const { rows } = await c.query(
        "delete from tickets where id = $1 or ticket_id = $1 returning id, ticket_id, title, status, priority, studio_code, assignee_id",
        [id],
      );
      if (!rows[0]) return null;
      await c.query(
        `insert into audit_log (actor_user_id, actor_name, action, entity_type, entity_id, before_state)
         values ($1, $2, 'ticket_deleted', 'tickets', $3, $4)`,
        [auth.session.user_id, auth.session.email, rows[0].id, JSON.stringify(rows[0])],
      );
      return rows[0];
    });
    if (!gone) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ deleted: gone.ticket_id });
  } catch (err) {
    return dbError(err);
  }
}

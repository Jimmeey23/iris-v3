import { NextResponse } from "next/server";
import { asSystem, withUser } from "@/lib/server/db";
import { dbError, requireSession } from "@/lib/server/auth";
import { notifyTicketEvent } from "@/lib/server/notify";
import { enforceRateLimit, userKey } from "@/lib/server/rate-limit";
import { normalizeIdempotencyKey, idempotentReplayHeader } from "@/lib/iris/ops-policy";
import { sweepAfterResponse } from "@/lib/server/sweeps";
import { TICKET_LIST_SELECT, attachThreads, fetchTicket, toClientTicket } from "@/lib/server/tickets";
import { evaluateRoutingRules, selectBestAssignee, type AssignableEmployee, type RoutingRuleRow } from "@/lib/iris/routing-engine";
import { computeSlaTargets, type BusinessHoursMap } from "@/lib/iris/sla-calculator";
import { decideOwnership } from "@/lib/iris/ownership-policy";
import { pool } from "@/lib/server/db";

export async function GET() {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  try {
    // RLS decides which tickets are visible; threads for exactly those ids are
    // then read in one batch without re-checking access per row.
    const rows = await withUser(auth.session.user_id, async (c) =>
      (await c.query(`${TICKET_LIST_SELECT} order by t.created_at desc`)).rows,
    );
    await asSystem((c) => attachThreads(c, rows));
    // Every open tab polls this route - the request-driven sweeps (SLA, escalation,
    // outbox drain) ride on it after the response, claimed once per window.
    sweepAfterResponse();
    return NextResponse.json({ tickets: rows.map(toClientTicket) });
  } catch (err) {
    return dbError(err);
  }
}

const PRIORITIES = ["P0", "P1", "P2", "P3"];
const SOURCES = ["manual", "ai_assistant", "email", "webhook", "form_intake", "voice"];
const strList = (v: unknown, max = 10) =>
  Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === "string" && !!x.trim()).map((x) => x.trim().slice(0, 64)))].slice(0, max) : [];
const str = (v: unknown, max = 5000) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

export async function POST(request: Request) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const { session } = auth;
  try {
    await enforceRateLimit("ticket-create", userKey(session.user_id));
  } catch (e) {
    const resetsIn = e instanceof Error && "resetsInSec" in e ? String((e as { resetsInSec: number }).resetsInSec) : "60";
    return NextResponse.json({ error: (e as Error).message }, { status: 429, headers: { "Retry-After": resetsIn } });
  }
  const b = await request.json().catch(() => ({}));
  const title = str(b.title, 300);
  const category = str(b.category, 120);
  if (!title || !category) return NextResponse.json({ error: "Title and category are required" }, { status: 400 });
  const requestedPriority = PRIORITIES.includes(b.priority) ? b.priority : "P2";
  const source = SOURCES.includes(b.source) ? b.source : "manual";
  const tags = Array.isArray(b.tags) ? b.tags.filter((t: unknown) => typeof t === "string").slice(0, 20) : [];
  const idempotencyKey = normalizeIdempotencyKey(
    request.headers.get("idempotency-key") ?? request.headers.get("x-idempotency-key") ?? b.idempotencyKey,
  );

  try {
    if (idempotencyKey) {
      const existingId = await withUser(session.user_id, async (c) => {
        const { rows } = await c.query(`select id from tickets where created_by_user_id = $1 and idempotency_key = $2`, [
          session.user_id,
          idempotencyKey,
        ]);
        return rows[0]?.id as string | undefined;
      });
      if (existingId) {
        const ticket = await withUser(session.user_id, (c) => fetchTicket(c, existingId));
        return NextResponse.json({ ticket }, { headers: idempotentReplayHeader(idempotencyKey) });
      }
    }

    // Trainer Feedback is admin-only under RLS. Anyone may still file one: the insert runs
    // as the system (values are all server-built) and the filer gets a receipt, not the record.
    const adminOnly = category === "Trainer Feedback" && session.role !== "admin";
    const run = <T,>(fn: Parameters<typeof asSystem<T>>[0]) => (adminOnly ? asSystem(fn) : withUser(session.user_id, fn));
    const ticket = await run(async (c) => {
      const studioCode = str(b.studioCode, 10);
      const subcategory = str(b.subcategory, 120);
      const description = str(b.description) ?? "";

      // Load live routing, SLA, and AI auto-investigate settings in one batch
      const [settingsRes, rulesRes, studioRes] = await Promise.all([
        c.query(
          `select key, value from app_settings
            where key in (
              'routing.auto_assign', 'routing.load_balance', 'routing.studio_affinity',
              'routing.round_robin_fallback', 'routing.require_acknowledgment',
              'sla.business_hours', 'ai.auto_investigate'
            )`,
        ),
        c.query<RoutingRuleRow>(
          "select id, name, condition, department_code, priority, sort_order, is_active from routing_rules where is_active = true order by sort_order, name",
        ),
        studioCode
          ? c.query<{ city: string }>("select city from studios where code = $1 limit 1", [studioCode])
          : Promise.resolve({ rows: [] as { city: string }[] }),
      ]);

      const settings = Object.fromEntries(settingsRes.rows.map((r) => [r.key, r.value]));
      const studioCity = studioRes.rows[0]?.city ?? null;

      // 1. Evaluate active Routing Rules (Settings -> Routing)
      const routed = evaluateRoutingRules(rulesRes.rows, {
        category,
        subcategory,
        priority: requestedPriority,
        studioCode,
        studioCity,
        departmentCode: str(b.departmentCode, 10),
        source,
        tags,
        title,
        description,
      });

      let effectiveDepartmentCode = str(b.departmentCode, 10)
        ? b.applyRoutingRules === false
          ? str(b.departmentCode, 10)
          : routed.matchedRule?.department_code && routed.matchedRule.department_code !== "Any"
            ? routed.matchedRule.department_code
            : str(b.departmentCode, 10)
        : routed.departmentCode;

      const effectivePriority =
        b.applyRoutingRules === false
          ? requestedPriority
          : routed.matchedRule && routed.priority
            ? routed.priority
            : requestedPriority;

      // 2. Ownership policy (Physique 57's standing rules) - wins over form/agent suggestions
      //    unless an admin explicitly overrides. See lib/iris/ownership-policy.ts.
      let effectiveAssigneeId = str(b.assigneeId, 64);
      let explicitAssigneeIds = strList(b.assigneeIds);
      let departmentCodes = strList(b.departmentCodes);
      let ownershipRule: string | null = null;
      let escalationL2: string | null = null;
      const overrideOwners = b.overrideOwners === true && session.role === "admin";
      if (!overrideOwners) {
        const policyInput = {
          category, subcategory, title, description, studioCode, studioCity,
          reporterEmployeeId: session.employee_id ?? null,
        };
        let policy = decideOwnership(policyInput, () => 0);
        if (policy?.roundRobinKey) {
          // Atomic per-studio counter (owner connection: app_settings is admin-write under RLS).
          const n = Number(
            (
              await pool.query(
                `insert into iris.app_settings (key, value, category) values ($1, '0'::jsonb, 'routing')
                 on conflict (key) do update set value = to_jsonb(coalesce((iris.app_settings.value #>> '{}')::int, -1) + 1), updated_at = now()
                 returning value #>> '{}' as n`,
                [`roundrobin:${policy.roundRobinKey}`],
              )
            ).rows[0]?.n ?? 0,
          );
          policy = decideOwnership(policyInput, () => n);
        }
        if (policy) {
          effectiveAssigneeId = policy.assigneeId;
          explicitAssigneeIds = policy.ownerIds;
          if (policy.departmentCodes.length) {
            departmentCodes = [...new Set([...policy.departmentCodes, ...(effectiveDepartmentCode ? [effectiveDepartmentCode] : []), ...departmentCodes])];
            effectiveDepartmentCode = policy.departmentCodes[0];
          }
          ownershipRule = policy.label;
          escalationL2 = policy.escalationL2;
        }
      }
      if (!effectiveAssigneeId && explicitAssigneeIds.length === 0) {
        const flags = {
          autoAssign: settings["routing.auto_assign"] !== false,
          loadBalance: settings["routing.load_balance"] !== false,
          studioAffinity: settings["routing.studio_affinity"] !== false,
          roundRobinFallback: settings["routing.round_robin_fallback"] !== false,
          requireAcknowledgment: Boolean(settings["routing.require_acknowledgment"]),
        };
        if (flags.autoAssign && effectiveDepartmentCode) {
          const empRows = (
            await c.query<AssignableEmployee>(
              `select id, name, department_code, studio_codes, availability, workload, max_workload, escalation_order, is_active
                 from employees
                where is_active = true`,
            )
          ).rows;
          effectiveAssigneeId = selectBestAssignee(empRows, {
            departmentCode: effectiveDepartmentCode,
            studioCode,
            flags,
          });
          // Nobody sits in the department itself: hand it to the department head.
          if (!effectiveAssigneeId) {
            effectiveAssigneeId =
              ((
                await c.query(
                  "select h.id from departments d join employees h on h.id = d.head_employee_id and h.is_active where d.code = $1",
                  [effectiveDepartmentCode],
                )
              ).rows[0]?.id as string | undefined) ?? effectiveAssigneeId;
          }
        }
      }

      const collectedInfo: Record<string, unknown> =
        b.collectedInfo && typeof b.collectedInfo === "object" ? { ...(b.collectedInfo as Record<string, unknown>) } : {};
      if (routed.matchedRule) {
        collectedInfo._routed_by_rule = routed.matchedRule.name;
      }
      if (ownershipRule) collectedInfo._ownership_rule = ownershipRule;
      if (escalationL2) collectedInfo._escalation_l2 = escalationL2;
      if (settings["routing.require_acknowledgment"] === true && (effectiveAssigneeId || explicitAssigneeIds.length > 0)) {
        collectedInfo._requires_acknowledgment = true;
      }

      const autoInvestigateNotes =
        settings["ai.auto_investigate"] === true
          ? `[Auto-Investigation Enabled]\n• Category: ${category}${subcategory ? ` › ${subcategory}` : ""}\n• Routed Department: ${effectiveDepartmentCode ?? "Unassigned"} (${effectivePriority})\n• Next Step: Verify studio/member details and confirm initial response before SLA target.`
          : null;

      const { rows } = await c.query(
        `insert into tickets (title, description, category, subcategory, priority, studio_code, department_code,
           assignee_id, reporter_id, affected_client, client_momence_id, membership_id, booking_id,
           business_impact, operational_impact, severity, recommended_resolution, investigation_notes, tags, source,
           collected_info, created_by_user_id, department_codes, assignee_ids, idempotency_key)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21::jsonb,$22,$23,$24,$25)
         returning id, created_at`,
        [
          title,
          description,
          category,
          subcategory,
          effectivePriority,
          studioCode,
          effectiveDepartmentCode,
          effectiveAssigneeId,
          session.employee_id,
          str(b.affectedClient, 200),
          str(b.clientMomenceId, 64),
          str(b.membershipId, 64),
          str(b.bookingId, 64),
          str(b.businessImpact),
          str(b.operationalImpact),
          str(b.severity, 40),
          str(b.recommendedResolution),
          autoInvestigateNotes,
          tags,
          source,
          JSON.stringify(collectedInfo),
          session.user_id,
          departmentCodes,
          explicitAssigneeIds,
          idempotencyKey,
        ],
      );
      const id = rows[0].id as string;
      const createdAt = rows[0].created_at ? new Date(rows[0].created_at) : new Date();

      // 3. Recompute SLA targets if `sla_definitions.business_hours_only` is enabled for this priority
      const slaDef = (
        await c.query<{
          response_target_mins: number;
          resolution_target_mins: number;
          business_hours_only: boolean;
        }>(
          "select response_target_mins, resolution_target_mins, business_hours_only from sla_definitions where priority = $1 limit 1",
          [effectivePriority],
        )
      ).rows[0];
      if (slaDef?.business_hours_only) {
        const targets = computeSlaTargets({
          createdAt,
          responseTargetMins: Number(slaDef.response_target_mins),
          resolutionTargetMins: Number(slaDef.resolution_target_mins),
          businessHoursOnly: true,
          businessHours: (settings["sla.business_hours"] ?? null) as BusinessHoursMap | null,
        });
        await c.query(
          "update tickets set sla_response_target = $2, sla_resolution_target = $3 where id = $1",
          [id, targets.slaResponseTarget, targets.slaResolutionTarget],
        );
      }

      return fetchTicket(c, id);
    });
    if (ticket) notifyTicketEvent("ticket_created", ticket, session);
    if (adminOnly && ticket) {
      return NextResponse.json(
        { ticket: { id: ticket.id, ticketId: ticket.ticketId, title: ticket.title, category: ticket.category, status: ticket.status }, locked: true },
        { status: 201 },
      );
    }
    return NextResponse.json({ ticket }, { status: 201 });
  } catch (err) {
    return dbError(err);
  }
}

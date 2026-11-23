import "server-only";
import type { PoolClient } from "pg";
import { asSandboxSystem, asSystemMain } from "./db";
import { MOCK_TICKETS, type MockTicket } from "./sandbox-mock";

/**
 * Training sandbox: keeps the sandbox database (SANDBOX_DATABASE_URL) usable
 * for practice.
 *
 *  - syncReferenceData(): copies the configuration people practise against
 *    (departments, studios, employees, users, SLA definitions, routing rules,
 *    templates, knowledge base, settings, ...) from the REAL database. Read-only
 *    on the real side. Secrets are never copied: integration credentials are
 *    dropped and password hashes are replaced.
 *  - resetSandbox(): wipes every ticket (and everything hanging off tickets)
 *    in the sandbox, then copies the REAL tickets with their history (comments,
 *    activity, escalations, recurrence checks...) exactly as they are, so the
 *    sandbox shows the same open tickets as live. `source: "mock"` seeds the
 *    scripted mock set instead (also the fallback when live has no tickets).
 *
 * Nothing here ever writes to the real database.
 */

/** Tables copied from the real database, in foreign-key order. */
const REFERENCE_TABLES = [
  "studios",
  "departments",
  "employees",
  "users",
  "roles",
  "sla_definitions",
  "routing_rules",
  "notification_rules",
  "app_settings",
  "ai_models",
  "templates",
  "ticket_templates",
  "knowledge_docs",
  "knowledge_articles",
  "recurring_patterns",
  "trainers",
  "equipment",
  "integrations",
  "user_preferences",
] as const;

/** Everything that hangs off tickets, cleared on reset. */
const TICKET_TABLES = [
  "tickets",
  "ticket_activities",
  "ticket_comments",
  "ticket_attachments",
  "ticket_resolutions",
  "recurrence_checks",
  "equipment_tickets",
  "escalation_log",
  "sla_extension_requests",
  "sla_trigger_log",
  "notifications",
  "outbox",
  "email_log",
  "conversations",
  "conversation_messages",
  "webhook_events",
  "ai_usage",
  "audit_log",
  "anomalies",
  "daily_briefings",
] as const;

/**
 * Ticket data copied from the real database on reset, parents before children.
 * Not copied: notifications, outbox, email/webhook logs, AI usage, conversations
 * (per-person or delivery records that would only confuse practice).
 */
const LIVE_TICKET_TABLES = [
  "tickets",
  "ticket_comments",
  "ticket_activities",
  "ticket_attachments",
  "ticket_resolutions",
  "escalation_log",
  "sla_extension_requests",
  "sla_trigger_log",
  "recurrence_checks",
  "equipment_tickets",
] as const;

type TableMeta = { cols: string[]; pk: string[] };

async function tableMeta(c: PoolClient, table: string): Promise<TableMeta | null> {
  const cols = (await c.query<{ attname: string }>(
    `select a.attname from pg_attribute a
      where a.attrelid = to_regclass('iris.' || $1) and a.attnum > 0 and not a.attisdropped and a.attgenerated = ''
      order by a.attnum`,
    [table],
  )).rows.map((r) => r.attname);
  if (!cols.length) return null;
  const pk = (await c.query<{ attname: string }>(
    `select a.attname from pg_index i
       join pg_attribute a on a.attrelid = i.indrelid and a.attnum = any(i.indkey)
      where i.indrelid = to_regclass('iris.' || $1) and i.indisprimary`,
    [table],
  )).rows.map((r) => r.attname);
  return { cols, pk };
}

const q = (ident: string) => `"${ident.replace(/"/g, '""')}"`;

/** Scrubs anything secret before it leaves the real database. */
function scrub(table: string, rows: Record<string, unknown>[]) {
  if (table === "users") {
    for (const r of rows) {
      r.password_hash = "!sandbox-no-login";
      r.reset_token_hash = null;
      r.reset_token_expires_at = null;
      r.google_sub = null;
    }
  }
  if (table === "integrations") {
    for (const r of rows) {
      r.credentials_enc = null;
      r.is_enabled = false;
      r.status = "disconnected";
    }
  }
  if (table === "departments") {
    // departments <-> employees reference each other; heads are restored after employees.
    for (const r of rows) r.head_employee_id = null;
  }
  return rows;
}

/** Copies configuration and people from the real database into the sandbox. */
export async function syncReferenceData(): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  const data: Record<string, Record<string, unknown>[]> = {};
  const heads: { code: string; head: string | null }[] = [];

  await asSystemMain(async (c) => {
    for (const t of REFERENCE_TABLES) {
      if (!(await tableMeta(c, t))) continue;
      const rows = (await c.query(`select * from iris.${q(t)}`)).rows as Record<string, unknown>[];
      if (t === "departments") for (const r of rows) heads.push({ code: String(r.code), head: (r.head_employee_id as string) ?? null });
      data[t] = scrub(t, rows);
    }
  });

  await asSandboxSystem(async (c) => {
    for (const t of REFERENCE_TABLES) {
      const rows = data[t];
      if (!rows) continue;
      const meta = await tableMeta(c, t);
      if (!meta) continue;
      const cols = meta.cols.filter((col) => rows.length === 0 || col in rows[0]);
      const list = cols.map(q).join(", ");
      const conflict = meta.pk.length
        ? `on conflict (${meta.pk.map(q).join(", ")}) do update set ${
            cols.filter((col) => !meta.pk.includes(col)).map((col) => `${q(col)} = excluded.${q(col)}`).join(", ") || `${q(meta.pk[0])} = excluded.${q(meta.pk[0])}`
          }`
        : "on conflict do nothing";
      // json_populate_recordset keeps every type (arrays, jsonb, citext, timestamps) intact.
      for (let i = 0; i < rows.length; i += 200) {
        const chunk = rows.slice(i, i + 200);
        await c.query(
          `insert into iris.${q(t)} (${list})
           select ${list} from json_populate_recordset(null::iris.${q(t)}, $1::json)
           ${conflict}`,
          [JSON.stringify(chunk)],
        );
      }
      counts[t] = rows.length;
    }
    for (const h of heads) {
      if (h.head) await c.query("update iris.departments set head_employee_id = $2 where code = $1 and exists (select 1 from iris.employees where id = $2)", [h.code, h.head]);
    }
    // Practice tickets never message anyone outside the app.
    await c.query(
      `insert into iris.app_settings (key, value, category) values ('notifications.whatsapp_enabled', 'false'::jsonb, 'notifications')
       on conflict (key) do update set value = 'false'::jsonb`,
    );
  });
  return counts;
}

/**
 * Copies every real ticket and its history into the (already emptied) sandbox, as-is:
 * same numbers, statuses, owners, SLA targets, timestamps and AI close-out questions.
 * Triggers are switched off while copying so nothing is recomputed or re-logged, then
 * each table's id sequence is moved past the copied rows. Read-only on the real side.
 */
async function copyLiveTickets(): Promise<{ open: string[]; total: number }> {
  const data: Record<string, Record<string, unknown>[]> = {};
  await asSystemMain(async (c) => {
    for (const t of LIVE_TICKET_TABLES) {
      if (!(await tableMeta(c, t))) continue;
      data[t] = (await c.query(`select * from iris.${q(t)}`)).rows as Record<string, unknown>[];
    }
  });

  await asSandboxSystem(async (c) => {
    for (const t of LIVE_TICKET_TABLES) {
      const rows = data[t];
      if (!rows?.length) continue;
      const meta = await tableMeta(c, t);
      if (!meta) continue;
      const cols = meta.cols.filter((col) => col in rows[0]);
      const list = cols.map(q).join(", ");
      await c.query(`alter table iris.${q(t)} disable trigger user`);
      try {
        for (let i = 0; i < rows.length; i += 200) {
          await c.query(
            `insert into iris.${q(t)} (${list})
             select ${list} from json_populate_recordset(null::iris.${q(t)}, $1::json)
             on conflict do nothing`,
            [JSON.stringify(rows.slice(i, i + 200))],
          );
        }
      } finally {
        await c.query(`alter table iris.${q(t)} enable trigger user`);
      }
      // Serial ids (activities, comments, logs): continue after the copied rows.
      for (const col of meta.cols) {
        const seq = (await c.query<{ s: string | null }>("select pg_get_serial_sequence($1, $2) as s", [`iris.${t}`, col])).rows[0]?.s;
        if (seq) await c.query(`select setval($1, greatest((select coalesce(max(${q(col)}), 0) from iris.${q(t)}), 1))`, [seq]);
      }
    }
    // Workload counters follow the copied assignments.
    await c.query(
      `update iris.employees e set workload = coalesce((
         select count(*) from iris.tickets t
          where t.status not in ('resolved', 'closed') and (t.assignee_id = e.id or e.id = any(coalesce(t.assignee_ids, '{}')))
       ), 0)`,
    );
  });

  const tickets = data.tickets ?? [];
  return {
    open: tickets.filter((t) => !["resolved", "closed"].includes(String(t.status))).map((t) => String(t.ticket_id)),
    total: tickets.length,
  };
}

type Pick = { id: string; name: string; dept: string; user_id: string | null };

async function people(c: PoolClient) {
  const emps = (await c.query<Pick>(
    `select e.id, e.name, e.department_code as dept, u.id as user_id
       from iris.employees e left join iris.users u on u.employee_id = e.id and u.is_active
      where e.is_active is not false order by e.name`,
  )).rows;
  const byDept = new Map<string, Pick[]>();
  for (const e of emps) byDept.set(e.dept, [...(byDept.get(e.dept) ?? []), e]);
  const studios = (await c.query<{ code: string }>("select code from iris.studios where is_active is not false order by code")).rows.map((r) => r.code);
  const depts = new Set((await c.query<{ code: string }>("select code from iris.departments")).rows.map((r) => r.code));
  return { emps, byDept, studios, depts };
}

function hoursAgo(h: number) {
  return new Date(Date.now() - h * 3_600_000).toISOString();
}

async function insertMock(
  c: PoolClient,
  m: MockTicket,
  idx: number,
  ctx: Awaited<ReturnType<typeof people>>,
  reporter: Pick,
) {
  const pickIn = (dept: string, offset = 0) => {
    const list = ctx.byDept.get(dept) ?? ctx.emps;
    return list.length ? list[(idx + offset) % list.length] : null;
  };
  const dept = ctx.depts.has(m.department) ? m.department : null;
  const owner = m.unassigned ? null : pickIn(m.department);
  const coOwner = m.coOwnerDepartment ? pickIn(m.coOwnerDepartment, 1) : null;
  const studio = ctx.studios.length ? (m.studio && ctx.studios.includes(m.studio) ? m.studio : ctx.studios[idx % ctx.studios.length]) : null;
  const createdAt = hoursAgo(m.ageHours);

  const ins = await c.query<{ id: string; ticket_id: string }>(
    `insert into iris.tickets
       (title, description, category, subcategory, priority, status, studio_code, department_code, department_codes,
        assignee_id, assignee_ids, reporter_id, affected_client, client_momence_id, equipment, business_impact,
        tags, source, created_at, updated_at, collected_info, metadata, created_by_user_id)
     values ($1, $2, $3, $4, $5, 'open', $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $18, $19, $20, $21)
     returning id, ticket_id`,
    [
      m.title, m.description, m.category, m.subcategory ?? null, m.priority, studio, dept,
      [dept, m.coOwnerDepartment].filter((d): d is string => !!d && ctx.depts.has(d)),
      owner?.id ?? null,
      [owner?.id, coOwner?.id].filter((x): x is string => !!x),
      reporter.id, m.client ?? null, m.client ? `mock-${1000 + idx}` : null, m.equipment ?? null, m.businessImpact ?? null,
      [...(m.tags ?? []), "training"], m.source ?? "manual", createdAt,
      JSON.stringify(m.collectedInfo ?? {}), JSON.stringify({ sandbox_mock: true }), reporter.user_id,
    ],
  );
  const t = ins.rows[0];

  for (const [i, cm] of (m.comments ?? []).entries()) {
    const author = i % 2 === 0 ? owner ?? reporter : reporter;
    await c.query(
      `insert into iris.ticket_comments (ticket_id, author_user_id, author_name, content, is_internal, created_at)
       values ($1, $2, $3, $4, $5, $6)`,
      [t.id, author.user_id, author.name, cm.text, cm.internal ?? false, hoursAgo(Math.max(m.ageHours - (i + 1) * 2, 0.2))],
    );
  }

  // Walk the ticket to its practice state through ordinary updates, so the real
  // triggers (first response, SLA, activity log, recurrence) do their work.
  if (m.status !== "open") {
    const resolvedAt = m.resolvedHoursAgo !== undefined ? hoursAgo(m.resolvedHoursAgo) : null;
    if (m.status === "resolved" || m.status === "closed") {
      await c.query("update iris.tickets set status = 'in_progress', first_response_at = $2 where id = $1", [t.id, hoursAgo(m.ageHours - 1)]);
      await c.query(
        `update iris.tickets set status = 'resolved', resolved_at = coalesce($2::timestamptz, now()), resolution = $3, resolution_summary = $3 where id = $1`,
        [t.id, resolvedAt, m.resolution ?? "Resolved during training seed."],
      );
      if (m.status === "closed") await c.query("update iris.tickets set status = 'closed' where id = $1", [t.id]);
    } else {
      await c.query(
        `update iris.tickets set status = $2, escalation_level = $3,
                first_response_at = case when $2 <> 'open' then $4::timestamptz else first_response_at end
          where id = $1`,
        [t.id, m.status, m.escalationLevel ?? (m.status === "escalated" ? 1 : 0), hoursAgo(Math.max(m.ageHours - 1, 0.1))],
      );
    }
  }
  return t;
}

/**
 * Wipes every sandbox ticket and seeds the mock set. Returns the ticket numbers created.
 * `reporterUserId` is the admin running the reset: they report the mock tickets, so the
 * recurrence checks (assigned to the original reporter) land in their queue.
 */
export async function resetSandbox(
  reporterUserId: string,
  opts: { source?: "live" | "mock" } = {},
): Promise<{ created: string[]; recurrenceChecks: number; source: "live" | "mock"; total: number }> {
  await syncReferenceData();
  await asSandboxSystem(async (c) => {
    const existing = (await c.query<{ t: string }>(
      `select tablename as t from pg_tables where schemaname = 'iris' and tablename = any($1)`,
      [TICKET_TABLES as unknown as string[]],
    )).rows.map((r) => `iris.${q(r.t)}`);
    if (existing.length) await c.query(`truncate ${existing.join(", ")} cascade`);
    // New practice tickets are numbered from P57-90001 so they never look like real ones.
    await c.query("select setval('iris.ticket_number_seq', 90000, true)");
    await c.query("update iris.employees set workload = 0");
  });

  if (opts.source !== "mock") {
    const live = await copyLiveTickets();
    if (live.total > 0) {
      const raised = await asSandboxSystem(async (c) =>
        Number((await c.query<{ n: number }>("select iris.materialize_recurrence_checks() as n")).rows[0]?.n ?? 0),
      );
      return { created: live.open, recurrenceChecks: raised, source: "live", total: live.total };
    }
  }
  return seedMock(reporterUserId);
}

/** Seeds the scripted mock ticket set into an emptied sandbox. */
async function seedMock(reporterUserId: string): Promise<{ created: string[]; recurrenceChecks: number; source: "mock"; total: number }> {
  return asSandboxSystem(async (c) => {
    const existing = (await c.query<{ t: string }>(
      `select tablename as t from pg_tables where schemaname = 'iris' and tablename = any($1)`,
      [TICKET_TABLES as unknown as string[]],
    )).rows.map((r) => `iris.${q(r.t)}`);
    if (existing.length) await c.query(`truncate ${existing.join(", ")} cascade`);
    // Sandbox ticket numbers start at P57-90001 so they are never mistaken for real ones.
    await c.query("select setval('iris.ticket_number_seq', 90000, true)");
    await c.query("update iris.employees set workload = 0");

    const ctx = await people(c);
    const me = ctx.emps.find((e) => e.user_id === reporterUserId) ?? ctx.emps[0];
    if (!me) throw new Error("The sandbox has no employees to work with");

    const created: string[] = [];
    for (const [i, m] of MOCK_TICKETS.entries()) {
      const reporter = m.reportedByOther ? ctx.emps[(i * 7) % ctx.emps.length] : me;
      created.push((await insertMock(c, m, i, ctx, reporter)).ticket_id);
    }

    return created;
  }).then(async (created) => {
    // Raise the recurrence checks that are already due, exactly as the sweep does.
    const raised = await asSandboxSystem(async (c) =>
      Number((await c.query<{ n: number }>("select iris.materialize_recurrence_checks() as n")).rows[0]?.n ?? 0),
    );
    return { created, recurrenceChecks: raised, source: "mock" as const, total: created.length };
  });
}

/** Counts shown on the sandbox banner. */
export async function sandboxStats() {
  return asSandboxSystem(async (c) => {
    const r = (await c.query(
      `select count(*)::int as total,
              count(*) filter (where status not in ('resolved','closed'))::int as open,
              (select count(*)::int from iris.recurrence_checks) as checks
         from iris.tickets`,
    )).rows[0];
    return r as { total: number; open: number; checks: number };
  });
}

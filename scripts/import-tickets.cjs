#!/usr/bin/env node
/**
 * Import the legacy ticket export (tickets_rows.csv) into iris.tickets.
 *
 *   node scripts/import-tickets.cjs db/import/tickets_rows.csv          # dry run
 *   node scripts/import-tickets.cjs db/import/tickets_rows.csv --commit # write
 *
 * Idempotent: rows whose ticket_id already exists are skipped.
 * Every source column not mapped to a real column is kept in metadata.legacy.
 */
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env"), quiet: true });
const fs = require("fs");
const { parse } = require("csv-parse/sync");
const { Client } = require("pg");

const file = process.argv[2];
const commit = process.argv.includes("--commit");
if (!file) throw new Error("usage: import-tickets.cjs <csv> [--commit]");

const STATUS = { resolved: "resolved", closed: "closed", assigned: "in_progress", open: "open", new: "open", in_progress: "in_progress", escalated: "escalated" };
const PRIORITY = { critical: "P0", high: "P1", medium: "P2", low: "P3" };
const DEPT = { training: "TRN", operations: "OPS", "sales-client-servicing": "SCS", marketing: "MKT", management: "MGT", accounts: "PAY" };
const SOURCE = { gmail: "email", fillout: "form_intake", iris: "ai_assistant", history: "manual", manual: "manual", system: "manual" };

const json = (s, d) => { if (!s) return d; try { return JSON.parse(s); } catch { return d; } };
const ts = (s) => { if (!s) return null; const t = Date.parse(s); return isNaN(t) ? null : new Date(t).toISOString(); };
const norm = (s) => (s || "").toLowerCase().replace(/[^a-z]/g, "");

(async () => {
  const rows = parse(fs.readFileSync(file), { columns: true, bom: true, relax_quotes: true, skip_empty_lines: true });
  const db = new Client({ connectionString: process.env.NEON_DATABASE_URL });
  await db.connect();

  const emps = (await db.query("select id, name, email::text from iris.employees")).rows;
  const studios = (await db.query("select code, name from iris.studios")).rows;
  const byEmail = new Map(emps.map((e) => [e.email.toLowerCase(), e.id]));
  const byName = new Map(emps.map((e) => [norm(e.name), e.id]));
  const byFirst = new Map();
  for (const e of emps) { const f = norm(e.name.split(" ")[0]); byFirst.set(f, byFirst.has(f) ? null : e.id); }
  const studioByName = new Map(studios.map((s) => [s.name.toLowerCase(), s.code]));

  const ALIAS = { vahishtafitter: "emp_vahishta", taahirasayyed: "emp_tahira", shainas: "emp_shaina", apiserou: "emp_wungsingla" };
  const findEmp = (email, name) =>
    (name && ALIAS[norm(name)]) ||
    (email && byEmail.get(email.toLowerCase())) || (name && (byName.get(norm(name)) || byFirst.get(norm(name.split(" ")[0])))) || null;

  const unmatched = { staff: {}, studio: {}, dept: {}, status: {}, priority: {}, reporter: {} };
  const bump = (k, v) => (unmatched[k][v] = (unmatched[k][v] || 0) + 1);

  const records = rows.map((r) => {
    const assignee = r.assigned_staff_email || r.assigned_staff_name ? findEmp(r.assigned_staff_email, r.assigned_staff_name) : null;
    if ((r.assigned_staff_email || r.assigned_staff_name) && !assignee) bump("staff", `${r.assigned_staff_name} <${r.assigned_staff_email}>`);
    const reporter = r.created_by_name ? findEmp(null, r.created_by_name) : null;
    if (r.created_by_name && !reporter) bump("reporter", r.created_by_name);
    const studio = studioByName.get((r.studio || "").toLowerCase()) || null;
    if (r.studio && !studio && r.studio !== "Not studio specific") bump("studio", r.studio);
    const dept = DEPT[r.department_id] || null;
    if (r.department_id && !dept) bump("dept", r.department_id);
    const status = STATUS[r.status];
    if (!status) bump("status", r.status);
    const priority = PRIORITY[r.priority];
    if (!priority) bump("priority", r.priority);

    const createdAt = ts(r.created_at) || new Date().toISOString();
    const legacy = {
      id: r.id, summary: r.summary, status: r.status, priority: r.priority, sentiment: r.sentiment,
      studio: r.studio, class_format: r.class_format, trainer: r.trainer, membership: r.membership,
      incident_at: r.incident_at, member_email: r.member_email, member_phone: r.member_phone,
      preferred_contact: r.preferred_contact, requested_resolution: r.requested_resolution,
      assigned_staff_id: r.assigned_staff_id, assigned_staff_name: r.assigned_staff_name,
      assigned_staff_email: r.assigned_staff_email, department_id: r.department_id,
      sla_hours: r.sla_hours, sla_due_at: r.sla_due_at, source: r.source, channel: r.channel,
      custom_fields: json(r.custom_fields, r.custom_fields), momence_context: json(r.momence_context, r.momence_context),
      template_id: r.template_id, is_escalated: r.is_escalated === "true", closed_at: r.closed_at,
      kind: r.kind, resolution_required: r.resolution_required, momence_session_id: r.momence_session_id,
      source_ref: r.source_ref, submission_key: r.submission_key, impact: r.impact, version: r.version,
      asset_id: r.asset_id, created_by_name: r.created_by_name, area: r.area,
      sla_extended_hours: r.sla_extended_hours, sla_extended_at: r.sla_extended_at,
      sla_extended_by_name: r.sla_extended_by_name, sla_extension_reason: r.sla_extension_reason,
      escalated_to_staff_id: r.escalated_to_staff_id, escalated_to_name: r.escalated_to_name,
      escalated_at: r.escalated_at, escalated_from_staff_id: r.escalated_from_staff_id,
      additional_owners: json(r.additional_owners, r.additional_owners),
      committed_resolution_at: r.committed_resolution_at,
    };
    for (const k of Object.keys(legacy)) if (legacy[k] === "" || legacy[k] == null) delete legacy[k];

    const tags = json(r.tags, []);
    return {
      ticket_id: r.ticket_number,
      title: r.title,
      description: r.description || r.summary || "",
      category: r.category || "Miscellaneous",
      subcategory: r.subcategory || null,
      priority: priority || "P2",
      status: status || "open",
      studio_code: studio,
      department_code: dept,
      assignee_id: assignee,
      reporter_id: reporter,
      affected_client: r.member_name || null,
      client_momence_id: r.momence_member_id || null,
      business_impact: r.impact || null,
      severity: r.severity || null,
      recommended_resolution: r.requested_resolution || null,
      tags: Array.isArray(tags) ? tags.map(String) : [],
      sla_resolution_target: ts(r.sla_due_at),
      resolved_at: ts(r.resolved_at) || ts(r.closed_at),
      escalation_level: r.is_escalated === "true" ? 1 : 0,
      source: SOURCE[r.source] || "manual",
      collected_info: { incident_at: ts(r.incident_at), incident_at_raw: r.incident_at || null, class_format: r.class_format || null, trainer: r.trainer || null, membership: r.membership || null },
      metadata: { imported_from: "tickets_rows.csv", legacy },
      created_at: createdAt,
      updated_at: ts(r.updated_at) || createdAt,
    };
  });

  console.log(`Parsed ${records.length} rows.`);
  for (const [k, v] of Object.entries(unmatched)) if (Object.keys(v).length) console.log(`Unmatched ${k}:`, v);

  if (!commit) { console.log("\nDry run only. Re-run with --commit to write."); await db.end(); return; }

  const cols = Object.keys(records[0]);
  await db.query("begin");
  try {
    await db.query("select set_config('iris.seeding', 'on', true)");
    let inserted = 0;
    for (const rec of records) {
      const res = await db.query(
        `insert into iris.tickets (${cols.join(",")}) values (${cols.map((_, i) => `$${i + 1}`).join(",")})
         on conflict (ticket_id) do nothing`,
        cols.map((c) => rec[c]),
      );
      inserted += res.rowCount;
    }
    const max = Math.max(...records.map((r) => parseInt((String(r.ticket_id).match(/(\d+)$/) || [])[1], 10) || 0));
    await db.query("select setval('iris.ticket_number_seq', greatest($1, (select last_value from iris.ticket_number_seq)))", [max]);
    await db.query("commit");
    console.log(`Inserted ${inserted}, skipped ${records.length - inserted} existing. Sequence >= ${max}.`);
  } catch (e) {
    await db.query("rollback");
    throw e;
  } finally {
    await db.end();
  }
})().catch((e) => { console.error(e.message); process.exit(1); });

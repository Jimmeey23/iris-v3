#!/usr/bin/env node
/**
 * Replace the historic-tickets.json import with the "P57 Ops Issues Log" Gmail sweep.
 *
 *   node scripts/import-ops-log.cjs "<csv>"           # dry run, prints what would change
 *   node scripts/import-ops-log.cjs "<csv>" --commit  # write
 *
 * 1. Deletes tickets imported from data/historic-tickets.json (source_ref "historic:*").
 * 2. Inserts every CSV row as a backdated, closed, SLA-exempt ticket (ids P57-H0001…).
 *    Rows matching a ticket already in the app are skipped.
 *
 * Writes straight to the database, so the app's create path (emails, notifications,
 * SLA targets, webhooks) never runs. The SLA/escalation sweeps only look at tickets
 * that are not resolved/closed and have a resolution target, so these are ignored.
 */
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env"), quiet: true });
const fs = require("fs");
const { parse } = require("csv-parse/sync");
const { Client } = require("pg");

const file = process.argv[2];
const commit = process.argv.includes("--commit");
if (!file) throw new Error('usage: import-ops-log.cjs "<csv>" [--commit]');

const norm = (s) => (s || "").toLowerCase().replace(/[^a-z]/g, "");
const words = (s) => new Set((s || "").toLowerCase().match(/[a-z]{4,}/g) || []);
const jaccard = (a, b) => { if (!a.size || !b.size) return 0; let n = 0; for (const w of a) if (b.has(w)) n++; return n / (a.size + b.size - n); };
const threadOf = (link) => ((link || "").match(/#all\/([0-9a-f]+)/) || [])[1] || null;
// Backdated to 10:00 IST on the reported day.
const at = (d, hh = "10:00") => new Date(`${d}T${hh}:00+05:30`).toISOString();
// System / shared mailboxes are not people.
const SYSTEM_SENDER = /physique ?57|iris|support desk|info@|^api \.?$|team$|jimmeey@physique57india\.com/i;

(async () => {
  const rows = parse(fs.readFileSync(file), { columns: true, bom: true, relax_quotes: true, skip_empty_lines: true });
  const db = new Client({ connectionString: process.env.NEON_DATABASE_URL });
  await db.connect();

  const emps = (await db.query("select id, name from iris.employees where id not like 'emp\\_%\\_jr' and id <> 'emp_6edb204311a645bfa3f0aa45bc12498a'")).rows;
  const studios = new Set((await db.query("select code from iris.studios")).rows.map((r) => r.code));
  const depts = new Set((await db.query("select code from iris.departments")).rows.map((r) => r.code));
  const byName = new Map(emps.map((e) => [norm(e.name), e.id]));
  const byFirst = new Map();
  for (const e of emps) { const f = norm(e.name.split(" ")[0]); byFirst.set(f, byFirst.has(f) ? null : e.id); }
  const ALIAS = { vahishta: "emp_vahishta", zahur: "emp_zahur", zaheer: "emp_zahur" };
  const findEmp = (name) => {
    if (!name || SYSTEM_SENDER.test(name)) return null;
    const clean = name.replace(/\(.*\)/, "").replace(/\s*\.$/, "").trim();
    return ALIAS[norm(clean)] || byName.get(norm(clean)) || byFirst.get(norm(clean.split(" ")[0])) || null;
  };

  // Existing tickets, minus the historic import we are about to delete.
  const historic = (await db.query("select id, ticket_id from iris.tickets where metadata->'legacy'->>'source_ref' like 'historic:%'")).rows;
  const existing = (await db.query(
    `select ticket_id, title, description, affected_client, created_at, metadata->'legacy'->>'source_ref' as source_ref, metadata->'legacy'->>'summary' as summary
       from iris.tickets where coalesce(metadata->'legacy'->>'source_ref','') not like 'historic:%'`,
  )).rows.map((t) => ({ ...t, day: new Date(t.created_at).getTime(), words: words(`${t.title} ${t.summary || ""} ${(t.description || "").slice(0, 600)}`), client: norm(t.affected_client) }));
  const existingIds = new Set(existing.map((t) => t.ticket_id));
  const existingThreads = new Set(existing.map((t) => (t.source_ref || "").replace(/^gmail:/, "")).filter(Boolean));

  const skipped = { thread: [], ticketRef: [], similar: [], csvDuplicate: [] };
  const seen = new Set();
  const unmatched = { owner: {}, studio: {}, dept: {} };
  const bump = (k, v) => (unmatched[k][v] = (unmatched[k][v] || 0) + 1);
  const records = [];

  for (const r of rows) {
    const n = r["#"];
    const thread = threadOf(r["Gmail Link"]);
    const key = `${thread}|${r.Summary}`;
    if (seen.has(key)) { skipped.csvDuplicate.push(n); continue; }
    seen.add(key);

    if (thread && existingThreads.has(thread)) { skipped.thread.push(n); continue; }
    const refs = (r["Email Subject"] || "").match(/P57-\d{5}/g) || [];
    const ref = refs.find((x) => existingIds.has(x));
    if (ref) { skipped.ticketRef.push(`${n}→${ref}`); continue; }

    const day = new Date(at(r.Date)).getTime();
    const w = words(`${r.Subcategory} ${r.Summary} ${r["Email Subject"]}`);
    const member = norm(r.Member);
    const twin = existing.find((t) => Math.abs(t.day - day) <= 2 * 864e5 &&
      ((member && t.client && (t.client.includes(member) || member.includes(t.client)) && jaccard(w, t.words) >= 0.12) || jaccard(w, t.words) >= 0.3));
    if (twin) { skipped.similar.push(`${n}→${twin.ticket_id}`); continue; }

    const deptCode = ((r["Department / Owner"] || "").match(/\(([A-Z]{3})\)/) || [])[1] || null;
    if (deptCode && !depts.has(deptCode)) bump("dept", deptCode);
    const ownerName = (r["Department / Owner"] || "").split("–")[1]?.trim() || null;
    const owner = findEmp(ownerName);
    if (ownerName && !owner) bump("owner", ownerName);
    const studio = studios.has(r.Studio) ? r.Studio : null;
    if (r.Studio !== "Brand-wide" && !studio) bump("studio", r.Studio);
    const reporter = findEmp(r["Reported By"]);
    const subject = r["Email Subject"] || "(no subject)";
    const who = r.Member || (studio ? r["Studio Name"] : "Brand-wide");
    const createdAt = at(r.Date);
    const closedAt = at(r.Date, "18:00");

    records.push({
      row: {
        title: `${r.Subcategory} · ${who}`.slice(0, 200),
        description: [
          r.Summary, "",
          `Issue type: ${r["Issue Type"]}`,
          `Studio: ${r["Studio Name"]}`,
          `Reported by: ${r["Reported By"]} (${r.Source})`,
          r.Member ? `Member: ${r.Member}` : null,
          r.Trainer ? `Trainer: ${r.Trainer}` : null,
          `Owner: ${r["Department / Owner"]}`,
          `Email subject: ${subject}`,
          `Gmail thread: ${r["Gmail Link"]}`,
        ].filter((x) => x !== null).join("\n"),
        category: r.Category || "Miscellaneous",
        subcategory: r.Subcategory || null,
        priority: /^P[0-3]$/.test(r.Priority) ? r.Priority : "P2",
        status: "closed",
        studio_code: studio,
        department_code: deptCode,
        department_codes: deptCode ? [deptCode] : [],
        assignee_id: owner,
        assignee_ids: owner ? [owner] : [],
        reporter_id: reporter,
        affected_client: r.Member || null,
        resolution: "Closed on backdated import. Historical issue recovered from the Gmail ops sweep; the outcome is recorded in the linked email thread.",
        resolution_summary: `Backdated record from the P57 Ops Issues Log (row ${n}). Closed on import with no SLA tracking.`,
        tags: [r["Issue Type"], r.Category, r.Subcategory, r.Priority, "backdated"].filter(Boolean),
        sla_status: "on_track",
        sla_response_target: null,
        sla_resolution_target: null,
        first_response_at: createdAt,
        resolved_at: closedAt,
        escalation_level: /escalat/i.test(subject) ? 1 : 0,
        source: r.Source === "Trainer evaluation form" ? "form_intake" : "email",
        collected_info: { incident_at: createdAt, trainer: r.Trainer || null, studio_name: r["Studio Name"], issue_type: r["Issue Type"] },
        metadata: {
          imported_from: "P57 Ops Issues Log – Gmail sweep (Jun 2022 – Nov 2026)",
          legacy_import: true, sla_exempt: true, lock_assignment: true, backdated: true, notifications_suppressed: true,
          legacy: {
            source: "ops_log", channel: "gmail", row: Number(n), source_ref: thread ? `gmail:${thread}` : null,
            summary: r.Summary, studio: r["Studio Name"], studio_code: r.Studio, reported_by: r["Reported By"],
            report_source: r.Source, issue_type: r["Issue Type"], member: r.Member || null, trainer: r.Trainer || null,
            owner: r["Department / Owner"], email_subject: r["Email Subject"] || null, gmail_link: r["Gmail Link"] || null,
            closed_at: closedAt,
          },
        },
        created_at: createdAt,
        updated_at: closedAt,
      },
      ownerName, createdAt, closedAt,
    });
  }

  console.log(`CSV rows: ${rows.length}`);
  console.log(`Historic-JSON tickets to delete: ${historic.length}`);
  console.log(`To insert: ${records.length}`);
  for (const [k, v] of Object.entries(skipped)) console.log(`Skipped (${k}): ${v.length}${v.length ? "  " + v.join(", ") : ""}`);
  for (const [k, v] of Object.entries(unmatched)) if (Object.keys(v).length) console.log(`Unmatched ${k}:`, v);

  if (!commit) { console.log("\nDry run only. Re-run with --commit to write."); await db.end(); return; }

  // Oldest first so H-numbers follow chronology.
  records.sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.row.metadata.legacy.row - b.row.metadata.legacy.row);
  const cols = ["ticket_id", ...Object.keys(records[0].row)];
  await db.query("begin");
  try {
    await db.query("select set_config('iris.seeding', 'on', true)");
    const del = await db.query("delete from iris.tickets where metadata->'legacy'->>'source_ref' like 'historic:%'");
    let inserted = 0;
    for (const [i, rec] of records.entries()) {
      const vals = [`P57-H${String(i + 1).padStart(4, "0")}`, ...Object.keys(rec.row).map((c) => rec.row[c])];
      const res = await db.query(
        `insert into iris.tickets (${cols.join(",")}) values (${cols.map((_, j) => `$${j + 1}`).join(",")})
         on conflict (ticket_id) do nothing returning id`, vals);
      if (!res.rowCount) continue;
      inserted++;
      const id = res.rows[0].id;
      await db.query(
        `insert into iris.ticket_activities (ticket_id, activity_type, description, actor_name, metadata, created_at) values
           ($1, 'created', 'Backdated ticket imported from the P57 Ops Issues Log', 'IRIS import', '{"backdated":true}', $2),
           ($1, 'status_changed', 'Closed on import (historical record, SLA-exempt)', 'IRIS import', '{"from":"open","to":"closed","backdated":true}', $3)`,
        [id, rec.createdAt, rec.closedAt]);
    }
    await db.query("commit");
    console.log(`Deleted ${del.rowCount} historic tickets. Inserted ${inserted} backdated tickets.`);
  } catch (e) {
    await db.query("rollback");
    throw e;
  } finally {
    await db.end();
  }
})().catch((e) => { console.error(e.message); process.exit(1); });

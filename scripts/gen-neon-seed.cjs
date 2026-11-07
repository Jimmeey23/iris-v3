// Generates the seed section of the IRIS Neon script from the app's own data
// files, so the database starts with exactly what the UI shows today.
// Usage: node gen-seed.cjs <repo root> > seed.sql
const path = require("path");
const root = path.resolve(process.argv[2] || ".");
const jiti = require(path.join(root, "node_modules/jiti"))(root, { alias: { "@": path.join(root, "src") } });
const L = (m) => jiti(path.join(root, "src/lib/iris", m));

const { STUDIOS, DEPARTMENTS, EMPLOYEES } = L("types");
const { ALL_TICKETS } = L("sample-tickets");
const { TICKET_TEMPLATES } = L("templates");
const { KNOWLEDGE_ARTICLES } = L("knowledge-base-data");
const { TRAINERS_FULL } = L("trainer-directory");
const { SLA_DEFINITIONS } = L("sla-definitions");
const { MEMBERS } = L("member-directory");
const { IRIS_STUDIOS, INTEGRATIONS } = L("iris-constants");

const GEN = Date.now(); // ticket times become offsets from "now" at run time

// ---- SQL literal helpers -------------------------------------------------
const q = (v) => (v === null || v === undefined || v === "" ? "null" : `'${String(v).replace(/'/g, "''")}'`);
const qs = (v) => (v === null || v === undefined ? "''" : `'${String(v).replace(/'/g, "''")}'`); // not-null text
const n = (v) => (v === null || v === undefined || Number.isNaN(Number(v)) ? "null" : String(Number(v)));
const b = (v) => (v ? "true" : "false");
const arr = (a) => (!a || !a.length ? "'{}'::text[]" : `array[${a.map((x) => q(x)).join(", ")}]::text[]`);
const js = (v) => `${q(JSON.stringify(v ?? null))}::jsonb`;
const jsA = (v) => `${q(JSON.stringify(v ?? []))}::jsonb`;
const ts = (iso) => {
  if (!iso) return "null";
  const sec = Math.round((new Date(iso).getTime() - GEN) / 1000);
  return `now() + interval '${sec} seconds'`;
};
const absTs = (iso) => (iso ? `${q(new Date(iso).toISOString())}::timestamptz` : "null");
const rows = (list) => list.map((r) => `  (${r.join(", ")})`).join(",\n");
const out = [];
const section = (t) => out.push(`\n-- ---- ${t} ${"-".repeat(Math.max(0, 70 - t.length))}`);

// ---- Studios ---------------------------------------------------------------
section("Studios");
const momence = Object.fromEntries(IRIS_STUDIOS.map((s) => [s.name, s.momenceLocationId]));
const studioRows = STUDIOS.map((s) => [q(s.id), q(s.code), q(s.name), q(s.city), q(s.address), n(momence[s.name])]);
// Extra studios that exist in the app's Momence location list but not in STUDIOS.
const extra = [
  ["studio_courtside", "CTS", "Courtside, Mumbai", "Mumbai"],
  ["studio_copper", "CCB", "the Studio by Copper & Cloves, Bengaluru", "Bengaluru"],
];
for (const [id, code, name, city] of extra) {
  const src = IRIS_STUDIOS.find((s) => s.name === name);
  if (src) studioRows.push([q(id), q(code), q(name), q(city), q(src.address), n(src.momenceLocationId)]);
}
out.push(`insert into iris.studios (id, code, name, city, address, momence_location_id) values
${rows(studioRows)}
on conflict (id) do update set code = excluded.code, name = excluded.name, city = excluded.city,
  address = excluded.address, momence_location_id = excluded.momence_location_id;`);

// ---- Departments -------------------------------------------------------------
section("Departments");
out.push(`insert into iris.departments (id, code, name, description) values
${rows(DEPARTMENTS.map((d) => [q(d.id), q(d.code), q(d.name), q(d.description)]))}
on conflict (id) do update set code = excluded.code, name = excluded.name, description = excluded.description;`);

// ---- Employees ---------------------------------------------------------------
section(`Employees (${EMPLOYEES.length})`);
out.push(`insert into iris.employees (id, employee_code, name, email, phone, role, title, department_code,
  location, reporting_manager, birthday, studio_codes, skills, availability, workload, max_workload, escalation_order) values
${rows(EMPLOYEES.map((e) => [q(e.id), q(e.employeeCode), q(e.name), q(e.email), q(e.phone), q(e.role), q(e.title),
  q(e.departmentCode), qs(e.location || "India"), q(e.reportingManager), q(e.birthday), arr(e.studioCodes), arr(e.skills),
  q(e.availability || "available"), n(e.workload ?? 0), n(e.maxWorkload ?? 12), n(e.escalationOrder ?? 3)]))}
on conflict (id) do update set employee_code = excluded.employee_code, name = excluded.name, email = excluded.email,
  role = excluded.role, title = excluded.title, department_code = excluded.department_code, location = excluded.location,
  reporting_manager = excluded.reporting_manager, birthday = excluded.birthday, studio_codes = excluded.studio_codes,
  skills = excluded.skills, max_workload = excluded.max_workload, escalation_order = excluded.escalation_order;`);

// Department heads = highest-ranked employee in each department.
out.push(`update iris.departments d set head_employee_id = (
  select e.id from iris.employees e where e.department_code = d.code order by e.escalation_order, e.employee_code limit 1)
where d.head_employee_id is null;`);

// ---- Members -------------------------------------------------------------------
section(`Members (${MEMBERS.length})`);
out.push(`insert into iris.members (id, name, email, phone, membership, credits, join_date, city, tags, avatar_color) values
${rows(MEMBERS.map((m) => [q(m.id), q(m.name), q(m.email), q(m.phone), q(m.membership), n(m.credits ?? 0),
  m.joinDate ? `${q(m.joinDate)}::date` : "null", q(m.city), arr(m.tags), q(m.avatarColor)]))}
on conflict (id) do update set name = excluded.name, email = excluded.email, phone = excluded.phone,
  membership = excluded.membership, credits = excluded.credits, city = excluded.city, tags = excluded.tags;`);

// ---- SLA definitions ---------------------------------------------------------------
section("SLA definitions (P0-P3)");
out.push(`insert into iris.sla_definitions (priority, name, description, response_target_mins, resolution_target_mins,
  escalation_threshold_mins, business_hours_only, auto_actions, escalation_rules, resolution_rules, triggers) values
${rows(SLA_DEFINITIONS.map((s) => [q(s.priority), q(s.name), qs(s.description), n(s.responseTargetMins), n(s.resolutionTargetMins),
  n(s.escalationThresholdMins), b(s.businessHoursOnly), jsA(s.autoActions), jsA(s.escalationRules), jsA(s.resolutionRules), jsA(s.triggers)]))}
on conflict (priority) do update set name = excluded.name, description = excluded.description,
  response_target_mins = excluded.response_target_mins, resolution_target_mins = excluded.resolution_target_mins,
  escalation_threshold_mins = excluded.escalation_threshold_mins, business_hours_only = excluded.business_hours_only,
  auto_actions = excluded.auto_actions, escalation_rules = excluded.escalation_rules,
  resolution_rules = excluded.resolution_rules, triggers = excluded.triggers;`);

// ---- Templates -----------------------------------------------------------------------
section(`Ticket templates (${TICKET_TEMPLATES.length})`);
const deptCodes = new Set(DEPARTMENTS.map((d) => d.code));
out.push(`insert into iris.templates (code, title, description, category, subcategory, department_code, default_priority,
  default_severity, suggested_assignee_role, required_fields, conditional_fields, custom_fields, prefilled_options,
  recommended_actions, estimated_resolution_hours) values
${rows(TICKET_TEMPLATES.map((t) => [q(t.code), q(t.title), qs(t.description), q(t.category), q(t.subcategory),
  deptCodes.has(t.departmentCode) ? q(t.departmentCode) : "null", q(t.defaultPriority || "P2"), q(t.defaultSeverity),
  q(t.suggestedAssigneeRole), arr(t.requiredFields), jsA(t.conditionalFields), jsA(t.customFields), jsA(t.prefilledOptions),
  qs(Array.isArray(t.recommendedActions) ? t.recommendedActions.join("\n") : t.recommendedActions), n(t.estimatedResolutionHours ?? 24)]))}
on conflict (code) do update set title = excluded.title, description = excluded.description, category = excluded.category,
  subcategory = excluded.subcategory, department_code = excluded.department_code, default_priority = excluded.default_priority,
  default_severity = excluded.default_severity, suggested_assignee_role = excluded.suggested_assignee_role,
  required_fields = excluded.required_fields, conditional_fields = excluded.conditional_fields,
  custom_fields = excluded.custom_fields, prefilled_options = excluded.prefilled_options,
  recommended_actions = excluded.recommended_actions, estimated_resolution_hours = excluded.estimated_resolution_hours;`);

// ---- Knowledge base ------------------------------------------------------------------
section(`Knowledge articles (${KNOWLEDGE_ARTICLES.length})`);
out.push(`insert into iris.knowledge_articles (id, title, category, summary, steps, prevention, escalation, related_templates) values
${rows(KNOWLEDGE_ARTICLES.map((k) => [q(k.id), q(k.title), q(k.category), qs(k.summary), jsA(k.steps), q(k.prevention),
  q(k.escalation), arr(k.relatedTemplates)]))}
on conflict (id) do update set title = excluded.title, category = excluded.category, summary = excluded.summary,
  steps = excluded.steps, prevention = excluded.prevention, escalation = excluded.escalation,
  related_templates = excluded.related_templates;`);

// ---- Trainers --------------------------------------------------------------------------
section(`Trainers (${TRAINERS_FULL.length})`);
const studioCodeByName = (name) => {
  if (!name) return null;
  const s = STUDIOS.find((x) => x.name.toLowerCase().startsWith(String(name).toLowerCase()));
  return s ? s.code : null;
};
const trainerId = (name) => "trn_" + name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
out.push(`insert into iris.trainers (id, name, city, primary_studio, studio_summary, total_tickets, assessment_count,
  feedback_count, compliment_count, issue_count, avg_score, band, band_tone) values
${rows(TRAINERS_FULL.map((t) => [q(trainerId(t.name)), q(t.name), q(t.city === "Bengaluru" ? "Bengaluru" : "Mumbai"),
  q(studioCodeByName(t.primaryStudio)), jsA(t.studioSummary), n(t.totalTickets ?? 0), n(t.assessmentCount ?? 0),
  n(t.feedbackCount ?? 0), n(t.complimentCount ?? 0), n(t.issueCount ?? 0), n(t.avgScore), q(t.band), q(t.bandTone)]))}
on conflict (id) do update set city = excluded.city, primary_studio = excluded.primary_studio,
  studio_summary = excluded.studio_summary, total_tickets = excluded.total_tickets,
  assessment_count = excluded.assessment_count, feedback_count = excluded.feedback_count,
  compliment_count = excluded.compliment_count, issue_count = excluded.issue_count,
  avg_score = excluded.avg_score, band = excluded.band, band_tone = excluded.band_tone;`);

const assessments = TRAINERS_FULL.flatMap((t) => (t.assessments || []).map((a) => ({ t, a })));
if (assessments.length) {
  section(`Trainer assessments (${assessments.length})`);
  out.push(`insert into iris.trainer_assessments (source_ref, trainer_id, trainer_name, ticket_number, studio, submitted_at,
  score, band, band_tone, payload) values
${rows(assessments.map(({ t, a }) => [q(String(a.id)), q(trainerId(t.name)), q(t.name), q(a.ticketNumber), q(a.studio),
  absTs(a.submittedAt || a.createdAt), n(a.score), q(a.band), q(a.bandTone), js(a)]))}
on conflict (source_ref) do update set score = excluded.score, band = excluded.band, band_tone = excluded.band_tone,
  payload = excluded.payload;`);
}
const feedback = TRAINERS_FULL.flatMap((t) => (t.recentFeedback || []).map((f) => ({ t, f })));
if (feedback.length) {
  section(`Trainer feedback (${feedback.length})`);
  out.push(`insert into iris.trainer_feedback (source_ref, trainer_id, trainer_name, ticket_number, title, kind, payload, created_at) values
${rows(feedback.map(({ t, f }) => [q(String(f.id)), q(trainerId(t.name)), q(t.name), q(f.ticketNumber), qs(f.title),
  ["compliment", "issue"].includes(f.kind) ? q(f.kind) : "null", js(f), f.createdAt ? absTs(f.createdAt) : "now()"]))}
on conflict (source_ref) do update set title = excluded.title, kind = excluded.kind, payload = excluded.payload;`);
}

// ---- Tickets ------------------------------------------------------------------
// Intentionally NOT seeded: the app's sample tickets are mock data. Real
// tickets are imported separately.

// ---- Settings page data ----------------------------------------------------------------------
section("App settings");
const settings = [
  ["app.name", "IRIS", "general", "Application name", true],
  ["app.org", "Physique 57 India", "general", "Organisation name", true],
  ["sla.business_hours", { Mon: "09:00-21:00", Tue: "09:00-21:00", Wed: "09:00-21:00", Thu: "09:00-21:00", Fri: "09:00-21:00", Sat: "09:00-21:00", Sun: "Closed" }, "sla", "Business hours per weekday", false],
  ["sla.timezone", "Asia/Kolkata", "sla", "Timezone for SLA business-hour maths", false],
  ["ai.confidence_threshold", 70, "ai", "Minimum AI confidence to auto-route", false],
  ["ai.auto_investigate", true, "ai", "Run investigation automatically after ticket creation", false],
  ["ai.daily_token_limit", 50000, "ai", "Daily token limit", false],
  ["ai.monthly_budget_usd", 500, "ai", "Monthly AI budget (USD)", false],
  ["ai.alert_threshold_pct", 80, "ai", "Alert when this % of budget is used", false],
  ["notifications.in_app_enabled", true, "notifications", "Enable in-app notifications", false],
  ["notifications.email_enabled", true, "notifications", "Enable email notifications", false],
  ["notifications.whatsapp_enabled", false, "notifications", "Enable WhatsApp notifications", false],
  ["routing.auto_assign", true, "routing", "Auto-assign tickets to the lowest-workload employee", false],
  ["routing.require_acknowledgment", true, "routing", "Require assignee acknowledgment", false],
  ["audit.retention_days", 365, "audit", "Audit log retention (days)", false],
  ["backups.frequency_hours", 24, "backups", "Automatic backup frequency (hours)", false],
  ["backups.retention_days", 90, "backups", "Backup retention (days)", false],
];
out.push(`insert into iris.app_settings (key, value, category, description, is_public) values
${rows(settings.map(([k, v, c, d, p]) => [q(k), js(v), q(c), q(d), b(p)]))}
on conflict (key) do nothing;   -- never overwrite values an admin has changed`);

section("Routing rules");
const routing = [
  ["HVAC issues → Facilities Lead", "category=Facilities AND subcategory=HVAC", "FAC", "High", true],
  ["Momence payment → Finance", "category=Payment AND source=Momence", "PAY", "Medium", true],
  ["VIP client → Director escalation", "client.tier=VIP AND priority>=P1", "MGT", "Critical", true],
  ["Bengaluru → Bengaluru team", "studio.city=Bengaluru", null, "Auto", true],
  ["Trainer complaints → HR", "category=HR AND subcategory=Performance", "HRV", "Medium", false],
];
out.push(`insert into iris.routing_rules (name, condition, department_code, priority, sort_order, is_active) values
${rows(routing.map(([nm, c, d, p, a], i) => [q(nm), q(c), q(d), q(p), n((i + 1) * 10), b(a)]))}
on conflict (name) do nothing;`);

section("AI models");
const models = [
  ["OpenAI", "GPT-4o", "Primary Conversational", 0.7, 4096, true],
  ["OpenAI", "GPT-4o-mini", "Classification & Extraction", 0.3, 2048, false],
  ["Anthropic", "Claude Sonnet 4", "Investigation & Reasoning", 0.5, 4096, false],
  ["Anthropic", "Claude Haiku", "Summarization", 0.4, 2048, false],
  ["OpenAI", "GPT-4o", "Fallback (auto)", 0.7, 4096, false],
];
out.push(`insert into iris.ai_models (provider, model, purpose, temperature, max_tokens, is_primary) values
${rows(models.map(([p, m, u, t, k, pr]) => [q(p), q(m), q(u), n(t), n(k), b(pr)]))}
on conflict (provider, model, purpose) do nothing;`);

section("Notification rules");
const notif = [
  ["Ticket assigned", 1, 1, 0], ["Ticket escalated", 1, 1, 1], ["SLA approaching", 1, 1, 0], ["SLA breached", 1, 1, 1],
  ["Ticket resolved", 1, 0, 0], ["Ticket reopened", 1, 1, 0], ["New comment", 1, 0, 0],
];
out.push(`insert into iris.notification_rules (event, in_app, email, whatsapp) values
${rows(notif.map(([e, a, m, w]) => [q(e), b(a), b(m), b(w)]))}
on conflict (event) do nothing;`);

section("Roles & permissions");
const roles = [
  ["Studio Director", "admin", ["all"], "violet"],
  ["Operations Manager", "manager", ["tickets.all", "reports.all", "settings.limited"], "indigo"],
  ["Department Manager", "manager", ["tickets.department", "reports.department"], "sky"],
  ["Front Desk Lead", "executive", ["tickets.create", "tickets.view", "memberships.read"], "emerald"],
  ["Front Desk Associate", "executive", ["tickets.create", "tickets.view.own"], "amber"],
  ["IT Administrator", "admin", ["all", "settings.system"], "rose"],
];
out.push(`insert into iris.roles (name, access_tier, permissions, color) values
${rows(roles.map(([r, t, p, c]) => [q(r), q(t), arr(p), q(c)]))}
on conflict (name) do nothing;`);

section("Integrations (catalogue only — no credentials)");
out.push(`insert into iris.integrations (id, name, category, description, type) values
${rows(INTEGRATIONS.map((i) => [q(i.id), q(i.name), q(i.category), q(i.description), q(i.type)]))}
on conflict (id) do update set name = excluded.name, category = excluded.category,
  description = excluded.description, type = excluded.type;`);

// ---- Bootstrap admin ---------------------------------------------------------------------------
section("Bootstrap admin: jimmeey@physique57india.com");
out.push(`insert into iris.users (email, password_hash, role, employee_id, must_change_password)
values ('jimmeey@physique57india.com', crypt('ChangeMe@2026', gen_salt('bf', 10)), 'admin', 'emp_jimmeey', true)
on conflict (email) do update set role = 'admin', is_active = true, employee_id = 'emp_jimmeey';
-- (password is only set on first creation; re-running never resets it)

insert into iris.user_preferences (user_id)
select id from iris.users where email = 'jimmeey@physique57india.com'
on conflict do nothing;`);

out.push(`\nset local iris.seeding = 'off';\n\ncommit;\n`);
out.push(`-- ============================================================================
-- DONE. Quick checks:
--   select * from iris.v_ticket_summary;
--   select * from iris.login('jimmeey@physique57india.com', 'ChangeMe@2026');
-- ============================================================================`);

console.log(out.join("\n"));

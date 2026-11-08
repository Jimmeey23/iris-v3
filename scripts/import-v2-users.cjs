#!/usr/bin/env node
/**
 * Import IRIS v2 workspace accounts (Supabase: app_users + auth.users +
 * auth.identities) into iris.users on Neon.
 *
 *   node scripts/import-v2-users.cjs            # dry run, prints the plan
 *   node scripts/import-v2-users.cjs --commit   # writes
 *
 * Reads V2_DATABASE_URL (falls back to DATABASE_URL when it is a postgres URL)
 * and NEON_DATABASE_URL from .env.
 *
 * - Passwords: Supabase stores bcrypt ($2a$10$…), the same format pgcrypto's
 *   crypt() checks, so people keep their v2 password. Accounts with no password
 *   (Google-only) get an unusable random hash and sign in with Google.
 * - Google: the Google subject comes from auth.identities, so the first Google
 *   sign-in on v3 links straight to the imported row.
 * - Roles: v2 agent -> v3 executive; manager and admin unchanged.
 * - Employee link: by the v2 staff record's email, then the account email.
 * - Accounts that already exist in v3 keep their password and role; only empty
 *   profile fields are filled in.
 */
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

const COMMIT = process.argv.includes("--commit");

function loadEnv() {
  const env = { ...process.env };
  const file = path.join(__dirname, "..", ".env");
  if (fs.existsSync(file)) {
    for (const line of fs.readFileSync(file, "utf8").split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !(m[1] in process.env)) env[m[1]] = m[2].replace(/^"|"$/g, "");
    }
  }
  return env;
}

const ROLE = { agent: "executive", manager: "manager", admin: "admin" };

async function main() {
  const env = loadEnv();
  const v2Url = env.V2_DATABASE_URL || (/^postgres/.test(env.DATABASE_URL || "") ? env.DATABASE_URL : null);
  if (!v2Url) throw new Error("Set V2_DATABASE_URL to the v2 Supabase Postgres connection string");
  if (!env.NEON_DATABASE_URL) throw new Error("NEON_DATABASE_URL is not set");

  const v2 = new Client({ connectionString: v2Url.split("?")[0], ssl: { rejectUnauthorized: false } });
  const neon = new Client({ connectionString: env.NEON_DATABASE_URL });
  await v2.connect();
  await neon.connect();

  const { rows: accounts } = await v2.query(`
    select a.id, lower(a.email) as email, a.name, a.username, a.role, a.active,
           a.avatar_url, a.department, a.studio, a.studios, a.reporting_manager,
           a.must_change_password, lower(s.email) as staff_email,
           u.encrypted_password,
           (select i.provider_id from auth.identities i
             where i.user_id = a.supabase_user_id and i.provider = 'google' limit 1) as google_sub
      from app_users a
      left join staff s on s.id = a.staff_id
      left join auth.users u on u.id = a.supabase_user_id
     order by a.id`);

  const { rows: employees } = await neon.query(
    "select id, lower(email) as email from iris.employees where email is not null");
  const empByEmail = new Map(employees.map((e) => [e.email, e.id]));
  const { rows: existing } = await neon.query("select id, lower(email::text) as email, employee_id from iris.users");
  const existingByEmail = new Map(existing.map((u) => [u.email, u]));
  const takenEmployees = new Set(existing.map((u) => u.employee_id).filter(Boolean));

  const plan = [];
  for (const a of accounts) {
    const hasPassword = typeof a.encrypted_password === "string" && /^\$2[aby]\$/.test(a.encrypted_password);
    let employeeId = empByEmail.get(a.staff_email) || empByEmail.get(a.email) || null;
    const current = existingByEmail.get(a.email);
    if (current) {
      plan.push({ action: "update", a, employeeId: current.employee_id ? null : employeeId, hasPassword });
      continue;
    }
    if (employeeId && takenEmployees.has(employeeId)) employeeId = null;
    if (employeeId) takenEmployees.add(employeeId);
    plan.push({ action: "insert", a, employeeId, hasPassword });
  }

  console.table(plan.map((p) => ({
    action: p.action,
    email: p.a.email,
    role: ROLE[p.a.role] || "executive",
    active: p.a.active,
    employee: p.employeeId || "-",
    password: p.hasPassword ? "kept" : "google only",
    google: p.a.google_sub ? "linked" : "-",
  })));

  if (!COMMIT) {
    console.log(`\nDry run: ${plan.length} accounts. Re-run with --commit to write.`);
  } else {
    await neon.query("begin");
    try {
      for (const { action, a, employeeId, hasPassword } of plan) {
        const studios = Array.isArray(a.studios) ? a.studios.filter((s) => typeof s === "string") : [];
        if (action === "update") {
          await neon.query(
            `update iris.users set
               name = coalesce(name, $2), username = coalesce(username, $3),
               avatar_url = coalesce(avatar_url, $4), department = coalesce(department, $5),
               studio = coalesce(studio, $6),
               studios = case when cardinality(studios) = 0 then $7::text[] else studios end,
               reporting_manager = coalesce(reporting_manager, $8),
               google_sub = coalesce(google_sub, $9), v2_user_id = $10,
               employee_id = coalesce(employee_id, $11)
             where email = $1::citext`,
            [a.email, a.name, a.username, a.avatar_url, a.department, a.studio, studios,
             a.reporting_manager, a.google_sub, a.id, employeeId],
          );
        } else {
          const { rows } = await neon.query(
            `insert into iris.users (email, password_hash, role, employee_id, is_active,
               must_change_password, name, username, avatar_url, department, studio, studios,
               reporting_manager, google_sub, v2_user_id, auth_provider)
             values ($1, coalesce($2, crypt(encode(gen_random_bytes(24), 'hex'), gen_salt('bf', 10))),
               $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::text[], $13, $14, $15, $16)
             returning id`,
            [a.email, hasPassword ? a.encrypted_password : null, ROLE[a.role] || "executive",
             employeeId, a.active, Boolean(a.must_change_password), a.name, a.username,
             a.avatar_url, a.department, a.studio, studios, a.reporting_manager, a.google_sub,
             a.id, hasPassword ? "password" : "google"],
          );
          await neon.query(
            "insert into iris.user_preferences (user_id) values ($1) on conflict do nothing", [rows[0].id]);
        }
      }
      // Savepoint: an audit_log shape difference must not abort the import.
      await neon.query("savepoint audit");
      await neon.query(
        `insert into iris.audit_log (action, entity_type, entity_id)
         values ('import_v2_users', 'users', $1)`,
        [String(plan.length)],
      ).catch(() => neon.query("rollback to savepoint audit"));
      await neon.query("commit");
      console.log(`\nImported ${plan.filter((p) => p.action === "insert").length} new, updated ${plan.filter((p) => p.action === "update").length}.`);
    } catch (err) {
      await neon.query("rollback");
      throw err;
    }
  }
  await v2.end();
  await neon.end();
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});

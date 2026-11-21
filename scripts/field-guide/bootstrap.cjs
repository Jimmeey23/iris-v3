// One-time setup on a NEW Unix-socket-only PostgreSQL cluster, never a deployed database.
// Uses only the repository schema/migrations and fictional recording cases.
const { Client } = require("pg");
const fs = require("node:fs");
const path = require("node:path");
(async () => {
  const socket = process.env.GUIDE_PG_SOCKET,
    password = process.env.GUIDE_PASSWORD;
  if (!socket?.startsWith("/") || !password || password.length < 20)
    throw Error(
      "Set the private cluster socket path and a strong temporary GUIDE_PASSWORD.",
    );
  const db = new Client({
    host: socket,
    port: Number(process.env.GUIDE_PG_PORT || 5537),
    database: "iris_academy",
    user: "postgres",
  });
  await db.connect();
  try {
    const guard = await db.query(
      "select current_database() as db, current_setting('listen_addresses') as addresses, to_regnamespace('iris') as existing",
    );
    const g = guard.rows[0];
    if (g.db !== "iris_academy" || g.addresses !== "" || g.existing !== null)
      throw Error(
        "Requires an empty iris_academy database in a private socket-only cluster",
      );
    const migrations =
      "auth-v2 first-response recurrence-checks recurrence-v2 assistant-turns equipment activity-full-trail deescalation-owner escalation-exclusions executive-scope integration-catalogue knowledge-subcategories password-reset product-feedback sla-extensions-trainer-lock sla-trigger-accuracy trainer-analysis user-presence visibility-dept-or-studio outbox-nullable-next-attempt".split(
        " ",
      );
    for (const file of [
      "iris-neon-full.sql",
      ...migrations.map((m) => "migrations-" + m + ".sql"),
    ])
      await db.query(fs.readFileSync(path.join("db", file), "utf8"));
    await db.query(
      `set search_path=iris,public; update employees set name='Studio Operator '||employee_code,email=employee_code||'@example.invalid',phone=null,birthday=null,reporting_manager=null;update users set is_active=false;insert into employees(id,employee_code,name,email,role,department_code,studio_codes) values('academy','TRAIN','Studio Lead','lead@example.invalid','Studio Manager','OPS',array['SHQ','KH'])`,
    );
    const r = await db.query(
      "insert into users(email,password_hash,role,employee_id,must_change_password) values('lead@example.invalid',crypt($1,gen_salt('bf')),'admin','academy',false) returning id",
      [password],
    );
    await db.query(
      `insert into user_preferences(user_id,theme,accent_color,preferences) values($1,'light','indigo','{"tour_v3_completed_at":"2026-11-01"}'::jsonb) on conflict(user_id) do update set theme='light',accent_color='indigo',preferences=excluded.preferences`,
      [r.rows[0].id],
    );
    await db.query(
      fs.readFileSync("scripts/field-guide/recording-cases.sql", "utf8"),
    );
    console.log("Isolated recording cases are ready.");
  } finally {
    await db.end();
  }
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});

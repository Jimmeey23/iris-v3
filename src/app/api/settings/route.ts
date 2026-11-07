import { NextResponse } from "next/server";
import { withUser } from "@/lib/server/db";
import { dbError, requireSession } from "@/lib/server/auth";
import { RESOURCES } from "@/lib/server/settings-resources";

/** Everything the Settings screen needs, in one round trip. */
export async function GET() {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const { session } = auth;
  try {
    const bundle = await withUser(session.user_id, async (c) => {
      const out: Record<string, unknown> = {};
      for (const [name, r] of Object.entries(RESOURCES)) {
        const cols = name === "integrations"
          ? "id, name, category, description, type, config, is_enabled, status, last_synced_at, last_sync_status, sync_interval_mins, (credentials_enc is not null) as has_credentials"
          : "*";
        out[name] = (await c.query(`select ${cols} from ${r.table} order by ${r.order}`)).rows;
      }
      out.app_settings = (await c.query("select key, value, description, category from app_settings order by key")).rows;
      out.audit_log = (await c.query(
        `select a.id, a.action, a.entity_type, a.entity_id, host(a.ip_address) as ip, a.created_at,
                coalesce(a.actor_name, e.name, u.email::text, 'System') as actor
         from audit_log a
         left join users u on u.id = a.actor_user_id
         left join employees e on e.id = u.employee_id
         order by a.created_at desc limit 300`,
      )).rows;
      out.users = session.role === "admin"
        ? (await c.query(
            `select u.id, u.email, u.role, u.employee_id, u.is_active, u.must_change_password, u.last_login_at, e.name
             from users u left join employees e on e.id = u.employee_id order by e.name nulls last, u.email`,
          )).rows
        : [];
      return out;
    });
    return NextResponse.json({ ...bundle, me: { tier: session.role, userId: session.user_id } });
  } catch (err) {
    return dbError(err);
  }
}

/** Save one app-wide setting: { key, value }. Admin only (RLS). */
export async function PUT(request: Request) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const b = await request.json().catch(() => ({}));
  if (typeof b.key !== "string" || !/^[a-z0-9_.]{2,80}$/.test(b.key) || b.value === undefined) {
    return NextResponse.json({ error: "Invalid setting" }, { status: 400 });
  }
  try {
    const row = await withUser(auth.session.user_id, async (c) =>
      (await c.query("select key, value from save_setting($1, $2::jsonb)", [b.key, JSON.stringify(b.value)])).rows[0],
    );
    return NextResponse.json({ setting: row });
  } catch (err) {
    return dbError(err);
  }
}

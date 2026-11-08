import { NextResponse, type NextRequest } from "next/server";
import { pool, withUser } from "@/lib/server/db";
import { dbError, requireSession } from "@/lib/server/auth";
import { RESOURCES } from "@/lib/server/settings-resources";
import { invalidateRateLimitConfigCache } from "@/lib/server/rate-limit";

export const dynamic = "force-dynamic";

/** Everything the Settings screen needs, in one round trip. */
export async function GET() {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const { session } = auth;
  try {
    const bundle = await withUser(session.user_id, async (c) => {
      const out: Record<string, unknown> = {};
      for (const [name, r] of Object.entries(RESOURCES)) {
        const cols =
          name === "integrations"
            ? "id, name, category, description, type, config, is_enabled, status, last_synced_at, last_sync_status, sync_interval_mins, (credentials_enc is not null) as has_credentials"
            : "*";
        out[name] = (await c.query(`select ${cols} from ${r.table} order by ${r.order}`)).rows;
      }
      const appSettingsRows = (await c.query("select key, value, description, category from app_settings order by key")).rows;
      out.app_settings = appSettingsRows;

      const retentionSetting = appSettingsRows.find((r) => r.key === "audit.retention_days")?.value;
      const retentionDays = Number(retentionSetting);
      const validRetention = Number.isFinite(retentionDays) && retentionDays > 0 ? Math.round(retentionDays) : null;

      out.audit_log = (
        await c.query(
          `select a.id, a.action, a.entity_type, a.entity_id, host(a.ip_address) as ip, a.created_at,
                  coalesce(a.actor_name, e.name, u.email::text, 'System') as actor
             from audit_log a
             left join users u on u.id = a.actor_user_id
             left join employees e on e.id = u.employee_id
            where ($1::int is null or a.created_at >= now() - make_interval(days => $1::int))
            order by a.created_at desc
            limit 400`,
          [validRetention],
        )
      ).rows;

      out.preferences = (await c.query("select * from user_preferences where user_id = $1", [session.user_id])).rows[0] ?? null;

      out.users =
        session.role === "admin"
          ? (
              await c.query(
                `select u.id, u.email, u.role, u.employee_id, u.is_active, u.must_change_password, u.last_login_at,
                        coalesce(e.name, u.name) as name, u.username::text as username, u.avatar_url, u.studio,
                        u.studios, u.department, u.auth_provider, (u.google_sub is not null) as has_google,
                        (u.locked_until > now()) as is_locked, u.failed_login_count, u.created_at,
                        (select count(*)::int from sessions s
                          where s.user_id = u.id and s.revoked_at is null and s.expires_at > now()) as active_sessions
                   from users u left join employees e on e.id = u.employee_id
                  order by coalesce(e.name, u.name) nulls last, u.email`,
              )
            ).rows
          : [];
      return out;
    });
    return NextResponse.json({
      ...bundle,
      me: {
        tier: session.role,
        userId: session.user_id,
        employeeId: session.employee_id,
        email: session.email,
      },
    });
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
    if (b.key === "ops.ticket_create_limit") {
      invalidateRateLimitConfigCache();
    }
    return NextResponse.json({ setting: row });
  } catch (err) {
    return dbError(err);
  }
}

/** Admin action: prune audit log entries older than `audit.retention_days`. */
export async function DELETE(req: NextRequest) {
  const auth = await requireSession({ admin: true });
  if ("error" in auth) return auth.error;
  const daysParam = Number(req.nextUrl.searchParams.get("olderThanDays"));
  try {
    const days = await withUser(auth.session.user_id, async (c) => {
      if (Number.isFinite(daysParam) && daysParam >= 7) return Math.round(daysParam);
      const row = (await c.query("select value from app_settings where key = 'audit.retention_days'")).rows[0];
      const v = Number(row?.value);
      return Number.isFinite(v) && v >= 7 ? Math.round(v) : 365;
    });
    const res = await pool.query(
      "delete from iris.audit_log where created_at < now() - make_interval(days => $1::int)",
      [days],
    );
    return NextResponse.json({ ok: true, pruned: res.rowCount ?? 0, retentionDays: days });
  } catch (err) {
    return dbError(err);
  }
}

import { NextResponse } from "next/server";
import { withUser } from "@/lib/server/db";
import { dbError, requireSession } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

/** Lookup data every screen uses: employees, departments, studios, SLA targets, roles, workspace settings, and user preferences. */
export async function GET() {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  try {
    const data = await withUser(auth.session.user_id, async (c) => {
      const [employees, departments, studios, sla, roles, settingsRows, prefRes] = await Promise.all([
        c.query("select * from employees order by name"),
        c.query("select * from departments order by name"),
        c.query("select * from studios order by name"),
        c.query("select * from sla_definitions order by priority"),
        c.query("select name, access_tier, permissions, color from roles order by name"),
        c.query(
          `select key, value from app_settings
            where key like 'org.%'
               or key like 'routing.%'
               or key like 'sla.%'
               or key like 'notifications.%'
               or key in ('ai.auto_triage', 'ai.auto_investigate')`,
        ),
        c.query("select * from user_preferences where user_id = $1", [auth.session.user_id]),
      ]);
      return {
        employees: employees.rows,
        departments: departments.rows,
        studios: studios.rows,
        sla: sla.rows,
        roles: roles.rows,
        publicSettings: Object.fromEntries(settingsRows.rows.map((r) => [r.key, r.value])),
        preferences: prefRes.rows[0] ?? null,
      };
    });
    return NextResponse.json(data);
  } catch (err) {
    return dbError(err);
  }
}

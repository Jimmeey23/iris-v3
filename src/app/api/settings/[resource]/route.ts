import { NextResponse, type NextRequest } from "next/server";
import { withUser } from "@/lib/server/db";
import { dbError, requireSession } from "@/lib/server/auth";
import { RESOURCES, coerce } from "@/lib/server/settings-resources";

type Ctx = RouteContext<"/api/settings/[resource]">;

async function setup(ctx: Ctx) {
  const auth = await requireSession();
  if ("error" in auth) return { error: auth.error } as const;
  const { resource } = await ctx.params;
  if (resource === "users") return { session: auth.session, users: true } as const;
  const r = RESOURCES[resource];
  if (!r) return { error: NextResponse.json({ error: "Unknown resource" }, { status: 404 }) } as const;
  return { session: auth.session, r } as const;
}

function pick(r: (typeof RESOURCES)[string], body: Record<string, unknown>) {
  const cols: string[] = [];
  const vals: unknown[] = [];
  for (const [col, type] of Object.entries(r.columns)) {
    if (col in body) { cols.push(col); vals.push(coerce(type, body[col])); }
  }
  return { cols, vals };
}

export async function POST(request: NextRequest, ctx: Ctx) {
  const s = await setup(ctx);
  if ("error" in s) return s.error;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  try {
    if ("users" in s) {
      if (s.session.role !== "admin") return NextResponse.json({ error: "Admins only" }, { status: 403 });
      const row = await withUser(s.session.user_id, async (c) =>
        (await c.query("select create_user($1, $2, $3, $4) as id", [
          String(body.email ?? "").trim().toLowerCase(), String(body.password ?? ""),
          ["admin", "manager", "executive"].includes(String(body.role)) ? body.role : "executive",
          body.employee_id || null,
        ])).rows[0],
      );
      return NextResponse.json({ row }, { status: 201 });
    }
    const { r } = s;
    if (!r.create) return NextResponse.json({ error: "Can't add to this list" }, { status: 400 });
    for (const k of r.required ?? []) {
      if (body[k] === undefined || body[k] === "") return NextResponse.json({ error: `${k.replace(/_/g, " ")} is required` }, { status: 400 });
    }
    const { cols, vals } = pick(r, body);
    if (r.makeId) { cols.push("id"); vals.push(r.makeId(body)); }
    const row = await withUser(s.session.user_id, async (c) => {
      if (r.table === "employees") {
        const n = (await c.query("select count(*)::int + 1 as n from employees")).rows[0].n;
        cols.push("employee_code"); vals.push(`EMP-${String(n).padStart(3, "0")}-${Date.now().toString(36).slice(-4)}`);
      }
      const ph = cols.map((col, i) => (r.columns[col] === "json" ? `$${i + 1}::jsonb` : `$${i + 1}`));
      return (await c.query(`insert into ${r.table} (${cols.join(",")}) values (${ph.join(",")}) returning *`, vals)).rows[0];
    });
    return NextResponse.json({ row }, { status: 201 });
  } catch (err) {
    return dbError(err);
  }
}

export async function PATCH(request: NextRequest, ctx: Ctx) {
  const s = await setup(ctx);
  if ("error" in s) return s.error;
  const body = (await request.json().catch(() => ({}))) as { key?: unknown; changes?: Record<string, unknown> };
  if (body.key === undefined || !body.changes || typeof body.changes !== "object") {
    return NextResponse.json({ error: "key and changes are required" }, { status: 400 });
  }
  try {
    if ("users" in s) {
      if (s.session.role !== "admin") return NextResponse.json({ error: "Admins only" }, { status: 403 });
      const ch = body.changes;
      // An admin must never be able to remove their own access, from the UI or the API.
      if (body.key === s.session.user_id && (ch.is_active === false || (ch.role !== undefined && ch.role !== "admin") || ch.revoke_sessions === true)) {
        return NextResponse.json({ error: "You can't remove your own admin access or sign yourself out here" }, { status: 400 });
      }
      const row = await withUser(s.session.user_id, async (c) => {
        if (typeof ch.password === "string") {
          await c.query("select change_password($1, '', $2)", [body.key, ch.password]);
          await c.query("update users set must_change_password = true where id = $1", [body.key]);
        }
        const sets: string[] = []; const vals: unknown[] = [];
        const set = (col: string, v: unknown) => { vals.push(v); sets.push(`${col} = $${vals.length}`); };
        if (["admin", "manager", "executive"].includes(String(ch.role))) set("role", ch.role);
        if (typeof ch.is_active === "boolean") set("is_active", ch.is_active);
        if ("name" in ch) set("name", String(ch.name ?? "").trim().slice(0, 120) || null);
        if ("username" in ch) {
          const u = String(ch.username ?? "").trim().toLowerCase();
          if (u && !/^[a-z0-9._-]{3,40}$/.test(u)) throw Object.assign(new Error("Username: 3-40 letters, numbers, dots, dashes or underscores"), { code: "P0001" });
          set("username", u || null);
        }
        if ("employee_id" in ch) set("employee_id", ch.employee_id ? String(ch.employee_id) : null);
        if ("studios" in ch) set("studios", Array.isArray(ch.studios) ? ch.studios.map(String).filter(Boolean) : []);
        if (ch.unlock === true) sets.push("locked_until = null", "failed_login_count = 0");
        if (sets.length) { vals.push(body.key); await c.query(`update users set ${sets.join(",")}, updated_at = now() where id = $${vals.length}`, vals); }
        // Deactivating or "sign out everywhere" ends every live session at once.
        if (ch.revoke_sessions === true || ch.is_active === false) {
          await c.query("update sessions set revoked_at = now() where user_id = $1 and revoked_at is null", [body.key]);
        }
        return (await c.query(
          `select u.id, u.email, u.role, u.employee_id, u.is_active, u.must_change_password,
                  u.username::text as username, u.studios, (u.locked_until > now()) as is_locked,
                  (select count(*)::int from sessions s where s.user_id = u.id and s.revoked_at is null and s.expires_at > now()) as active_sessions
             from users u where u.id = $1`, [body.key])).rows[0];
      });
      return NextResponse.json({ row });
    }
    const { r } = s;
    const { cols, vals } = pick(r, body.changes);
    if (!cols.length) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    const sets = cols.map((col, i) => `${col} = $${i + 1}${r.columns[col] === "json" ? "::jsonb" : ""}`);
    vals.push(body.key);
    const row = await withUser(s.session.user_id, async (c) => {
      if (r.table === "ai_models" && body.changes!.is_primary === true) {
        await c.query("update ai_models set is_primary = false where id <> $1 and is_primary", [body.key]);
      }
      return (await c.query(`update ${r.table} set ${sets.join(", ")} where ${r.pk} = $${vals.length} returning *`, vals)).rows[0];
    });
    if (!row) return NextResponse.json({ error: "Not found or not allowed" }, { status: 404 });
    return NextResponse.json({ row });
  } catch (err) {
    return dbError(err);
  }
}

export async function DELETE(request: NextRequest, ctx: Ctx) {
  const s = await setup(ctx);
  if ("error" in s) return s.error;
  if ("users" in s) return NextResponse.json({ error: "Deactivate users instead of deleting them" }, { status: 400 });
  const { r } = s;
  const key = request.nextUrl.searchParams.get("key");
  if (!key) return NextResponse.json({ error: "key is required" }, { status: 400 });
  if (!r.remove) return NextResponse.json({ error: "Can't delete from this list" }, { status: 400 });
  try {
    const n = await withUser(s.session.user_id, async (c) =>
      r.remove === "soft"
        ? (await c.query(`update ${r.table} set is_active = false where ${r.pk} = $1`, [key])).rowCount
        : (await c.query(`delete from ${r.table} where ${r.pk} = $1`, [key])).rowCount,
    );
    if (!n) return NextResponse.json({ error: "Not found or not allowed" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return dbError(err);
  }
}

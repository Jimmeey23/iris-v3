import "server-only";
import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { asSystem } from "./db";

export const SESSION_COOKIE = "iris_session";
const SEVEN_DAYS = 60 * 60 * 24 * 7;

export type SessionUser = {
  user_id: string;
  email: string;
  role: "admin" | "manager" | "executive";
  employee_id: string | null;
  must_change_password: boolean;
};

/** Secure cookies on HTTPS (incl. behind a proxy); plain cookies on http://localhost. */
async function isHttps() {
  const h = await headers();
  const proto = h.get("x-forwarded-proto")?.split(",")[0].trim();
  if (proto) return proto === "https";
  const host = h.get("host") ?? "";
  return !/^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host);
}

export async function setSessionCookie(token: string) {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: await isHttps(),
    sameSite: "lax",
    path: "/",
    maxAge: SEVEN_DAYS,
  });
}

export async function clearSessionCookie() {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function getSessionToken() {
  return (await cookies()).get(SESSION_COOKIE)?.value ?? null;
}

export async function getSession(): Promise<SessionUser | null> {
  const token = await getSessionToken();
  if (!token) return null;
  const rows = await asSystem(async (c) => (await c.query("select * from iris.validate_session($1)", [token])).rows);
  return (rows[0] as SessionUser) ?? null;
}

/**
 * For API routes: returns the session, or a 401/403 response to return as-is.
 * Users who must change their password can only reach the routes that allow it.
 */
export async function requireSession(opts: { allowPasswordChange?: boolean; admin?: boolean; manager?: boolean } = {}) {
  let session: SessionUser | null;
  try {
    session = await getSession();
  } catch (err) {
    // Database unreachable (timeouts, network blips): answer cleanly instead of crashing the route.
    console.error("[auth] session lookup failed:", err instanceof Error ? err.message || err.name : err);
    return {
      error: NextResponse.json({ error: "IRIS can't reach its database right now. Try again in a moment." }, { status: 503, headers: { "Retry-After": "30" } }),
    } as const;
  }
  if (!session) {
    return { error: NextResponse.json({ error: "Not signed in" }, { status: 401 }) } as const;
  }
  if (session.must_change_password && !opts.allowPasswordChange) {
    return { error: NextResponse.json({ error: "Password change required" }, { status: 403 }) } as const;
  }
  if (opts.manager && session.role !== "admin" && session.role !== "manager") {
    return { error: NextResponse.json({ error: "Managers and admins only" }, { status: 403 }) } as const;
  }
  if (opts.admin && session.role !== "admin") {
    return { error: NextResponse.json({ error: "Admins only" }, { status: 403 }) } as const;
  }
  return { session } as const;
}

/** Turn a Postgres error into a safe JSON response. */
export function dbError(err: unknown) {
  const e = err as { code?: string; message?: string };
  if (e.code === "42501") return NextResponse.json({ error: "You don't have permission to do that" }, { status: 403 });
  if (e.code === "28P01") return NextResponse.json({ error: e.message }, { status: 400 });
  if (e.code === "23505") return NextResponse.json({ error: "That already exists" }, { status: 409 });
  if (e.code === "23503") return NextResponse.json({ error: "It's still referenced by other records" }, { status: 409 });
  if (e.code === "23514" || e.code === "22P02") return NextResponse.json({ error: "Invalid value" }, { status: 400 });
  if (e.code === "P0001") return NextResponse.json({ error: e.message }, { status: 400 });
  console.error("[iris db]", err);
  return NextResponse.json({ error: "Database error" }, { status: 500 });
}

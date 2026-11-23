import { NextResponse, type NextRequest } from "next/server";

/**
 * Central CSRF guard for the JSON API. Session cookies are SameSite=Lax, which already
 * blocks most cross-site POSTs; this closes the rest (same-site subdomains, old browsers)
 * by refusing any state-changing /api request whose Origin names a different host.
 * Requests with no Origin header (curl, server-to-server, cron) are not browser CSRF
 * and are left to their own auth.
 */
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

// Called by third parties / schedulers / OAuth redirects, authenticated by secret or state.
const EXEMPT = [/^\/api\/webhooks\//, /^\/api\/momence\/webhook(\/|$)/, /^\/api\/cron\//, /^\/api\/momence\/callback(\/|$)/, /^\/api\/auth\/google/];

function allowedHosts(req: NextRequest): Set<string> {
  const hosts = new Set<string>();
  const add = (v: string | null | undefined) => {
    const h = v?.split(",")[0].trim().toLowerCase();
    if (h) hosts.add(h);
  };
  add(req.headers.get("host"));
  add(req.headers.get("x-forwarded-host"));
  try {
    if (process.env.NEXT_PUBLIC_APP_URL) add(new URL(process.env.NEXT_PUBLIC_APP_URL).host);
  } catch {
    /* malformed env: ignore */
  }
  return hosts;
}

export function proxy(req: NextRequest) {
  if (SAFE_METHODS.has(req.method)) return NextResponse.next();
  const { pathname } = req.nextUrl;
  if (EXEMPT.some((re) => re.test(pathname))) return NextResponse.next();
  const origin = req.headers.get("origin");
  if (!origin) return NextResponse.next();
  let originHost: string | null = null;
  try {
    originHost = new URL(origin).host.toLowerCase();
  } catch {
    /* "null" or garbage */
  }
  if (!originHost || !allowedHosts(req).has(originHost)) {
    return NextResponse.json({ error: "Cross-origin request blocked" }, { status: 403 });
  }
  return NextResponse.next();
}

export const config = { matcher: "/api/:path*" };

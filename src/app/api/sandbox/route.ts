import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { requireSession, isHttps } from "@/lib/server/auth";
import { SANDBOX_COOKIE, isSandboxRequest, sandboxConfigured } from "@/lib/server/db";
import { resetSandbox, sandboxStats } from "@/lib/server/sandbox";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Training sandbox (admins only).
 *   GET                          → { configured, active, isAdmin, stats? }
 *   POST { enabled: boolean }    → switch the sandbox on/off for this browser
 *   POST { action: "reset" }     → wipe sandbox tickets and re-seed the mock set
 * The sandbox is a separate database (SANDBOX_DATABASE_URL); nothing here
 * touches the real tickets.
 */
export async function GET() {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const isAdmin = auth.session.role === "admin";
  const configured = sandboxConfigured();
  const active = isAdmin && (await isSandboxRequest());
  let stats: Awaited<ReturnType<typeof sandboxStats>> | null = null;
  if (active) stats = await sandboxStats().catch(() => null);
  return NextResponse.json({ configured: configured && isAdmin, active, isAdmin, stats });
}

export async function POST(req: NextRequest) {
  const auth = await requireSession({ admin: true });
  if ("error" in auth) return auth.error;
  if (!sandboxConfigured()) {
    return NextResponse.json({ error: "The training sandbox is not set up (SANDBOX_DATABASE_URL is missing)" }, { status: 503 });
  }
  const body = (await req.json().catch(() => ({}))) as { enabled?: boolean; action?: string };
  const jar = await cookies();

  if (typeof body.enabled === "boolean") {
    if (body.enabled) {
      jar.set(SANDBOX_COOKIE, "1", { httpOnly: true, secure: await isHttps(), sameSite: "lax", path: "/", maxAge: 60 * 60 * 12 });
    } else {
      jar.delete(SANDBOX_COOKIE);
    }
    return NextResponse.json({ ok: true, active: body.enabled });
  }

  if (body.action === "reset") {
    // Only from inside the sandbox, so a reset is always a deliberate act there.
    if (!(await isSandboxRequest())) return NextResponse.json({ error: "Switch on the training sandbox first" }, { status: 400 });
    try {
      const result = await resetSandbox(auth.session.user_id);
      return NextResponse.json({ ok: true, ...result });
    } catch (err) {
      console.error("[sandbox] reset failed:", err);
      return NextResponse.json({ error: `Reset failed: ${(err as Error).message}` }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "Nothing to do" }, { status: 400 });
}

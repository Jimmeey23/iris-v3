import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { requireSession, isHttps } from "@/lib/server/auth";
import { SANDBOX_COOKIE, SANDBOX_TIERS, SANDBOX_TIER_COOKIE, asSandboxSystem, isSandboxRequest, sandboxConfigured, sandboxTier, type SandboxTier } from "@/lib/server/db";
import { resetSandbox, sandboxStats } from "@/lib/server/sandbox";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Training sandbox (admins only).
 *   GET                          → { configured, active, isAdmin, stats? }
 *   POST { enabled: true, tier } → enter the sandbox practising as admin | manager | executive
 *   POST { enabled: false }      → leave the sandbox
 *   POST { tier }                → change the practice access level while inside
 *   POST { action: "reset" }     → wipe sandbox tickets and re-seed the mock set
 * The sandbox is a separate database (SANDBOX_DATABASE_URL); nothing here
 * touches the real tickets.
 */
/**
 * Apply the practice tier inside the sandbox database: the admin's own sandbox user row
 * gets that role, so row-level security (iris.is_admin() etc.) matches production for
 * that tier. The real database is never touched.
 */
async function applySandboxTier(userId: string, tier: SandboxTier) {
  await asSandboxSystem((c) => c.query("update iris.users set role = $2 where id = $1", [userId, tier]));
}

export async function GET() {
  // Real role: an admin practising as a manager must still see the sandbox controls.
  const auth = await requireSession({ realRole: true });
  if ("error" in auth) return auth.error;
  const isAdmin = auth.session.role === "admin";
  const configured = sandboxConfigured();
  const active = isAdmin && (await isSandboxRequest());
  let stats: Awaited<ReturnType<typeof sandboxStats>> | null = null;
  if (active) stats = await sandboxStats().catch(() => null);
  const tier = active ? await sandboxTier() : null;
  return NextResponse.json({ configured: configured && isAdmin, active, isAdmin, tier, stats });
}

export async function POST(req: NextRequest) {
  const auth = await requireSession({ admin: true, realRole: true });
  if ("error" in auth) return auth.error;
  if (!sandboxConfigured()) {
    return NextResponse.json({ error: "The training sandbox is not set up (SANDBOX_DATABASE_URL is missing)" }, { status: 503 });
  }
  const body = (await req.json().catch(() => ({}))) as { enabled?: boolean; action?: string; tier?: unknown };
  const jar = await cookies();

  const tier = body.tier === undefined ? undefined : (SANDBOX_TIERS as readonly string[]).includes(String(body.tier)) ? (body.tier as SandboxTier) : null;
  if (tier === null) return NextResponse.json({ error: "tier must be admin, manager or executive" }, { status: 400 });
  const cookieOpts = { httpOnly: true, secure: await isHttps(), sameSite: "lax" as const, path: "/", maxAge: 60 * 60 * 12 };

  if (typeof body.enabled === "boolean") {
    if (body.enabled) {
      const t = tier ?? "admin";
      try {
        await applySandboxTier(auth.session.user_id, t);
      } catch (err) {
        console.error("[sandbox] applying tier failed:", err);
        return NextResponse.json({ error: "Couldn't prepare the sandbox. Try Reset mock data, then enter again." }, { status: 500 });
      }
      jar.set(SANDBOX_COOKIE, "1", cookieOpts);
      jar.set(SANDBOX_TIER_COOKIE, t, cookieOpts);
      return NextResponse.json({ ok: true, active: true, tier: t });
    }
    jar.delete(SANDBOX_COOKIE);
    jar.delete(SANDBOX_TIER_COOKIE);
    return NextResponse.json({ ok: true, active: false });
  }

  if (tier) {
    if (!(await isSandboxRequest())) return NextResponse.json({ error: "Switch on the training sandbox first" }, { status: 400 });
    await applySandboxTier(auth.session.user_id, tier);
    jar.set(SANDBOX_TIER_COOKIE, tier, cookieOpts);
    return NextResponse.json({ ok: true, active: true, tier });
  }

  if (body.action === "reset") {
    // Only from inside the sandbox, so a reset is always a deliberate act there.
    if (!(await isSandboxRequest())) return NextResponse.json({ error: "Switch on the training sandbox first" }, { status: 400 });
    try {
      const result = await resetSandbox(auth.session.user_id);
      // The reset re-copies people from the real database (admin role included); re-apply the practice tier.
      const current = await sandboxTier();
      if (current) await applySandboxTier(auth.session.user_id, current);
      return NextResponse.json({ ok: true, ...result });
    } catch (err) {
      console.error("[sandbox] reset failed:", err);
      return NextResponse.json({ error: `Reset failed: ${(err as Error).message}` }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "Nothing to do" }, { status: 400 });
}

import { NextResponse, type NextRequest } from "next/server";
import { requireSession } from "@/lib/server/auth";
import { MomenceError } from "@/lib/server/momence";
import { runMomenceAction, auditMomenceAction, ACTION_LABELS, type ActionInput } from "@/lib/server/momence-extra";

/**
 * POST /api/momence/actions - write actions against Momence.
 * Managers and admins only; the body must carry `confirm: true` (the UI sets it
 * only after an explicit confirmation dialog). Every attempt is audited.
 */
export async function POST(req: NextRequest) {
  const auth = await requireSession({ manager: true });
  if ("error" in auth) return auth.error;
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (body?.confirm !== true) return NextResponse.json({ error: "Confirmation required" }, { status: 400 });
  if (!body?.action || !(body.action in ACTION_LABELS)) return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  const { confirm: _confirm, ...input } = body;
  try {
    await runMomenceAction(input as ActionInput);
    await auditMomenceAction(auth.session, input as ActionInput, true);
    return NextResponse.json({ ok: true, message: `${ACTION_LABELS[input.action as ActionInput["action"]]}: done` });
  } catch (e) {
    const upstream = e instanceof MomenceError;
    await auditMomenceAction(auth.session, input as ActionInput, false, (e as Error).message);
    const msg = upstream ? `${(e as Error).message}${(e as MomenceError).status === 403 ? " - these Momence credentials aren't allowed to do this" : ""}` : (e as Error).message;
    return NextResponse.json({ error: msg }, { status: upstream ? 502 : 400 });
  }
}

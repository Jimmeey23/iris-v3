import { NextResponse, after } from "next/server";
import { inboundEvents } from "@/lib/iris/email-intake";
import { claimMessage, processInboundMessage, verifyMailtrapSignature } from "@/lib/server/email-intake";

export const dynamic = "force-dynamic";
// AI reading + classification + attachment copies run after the response.
export const maxDuration = 120;

const MAX_BYTES = 1_000_000;

/**
 * Mailtrap Inbound → IRIS ticket. Configure at mailtrap.io/webhooks:
 *   URL:    <app>/api/webhooks/mailtrap-inbound
 *   Source: Inbound Inboxes → the IRIS inbox
 * Signed with HMAC-SHA256 (hex) of the raw body in `Mailtrap-Signature`, keyed with
 * MAILTRAP_INBOUND_SECRET. Answers 200 straight away so Mailtrap never pauses the webhook;
 * each message is processed once (iris.webhook_events, provider 'mailtrap-inbound').
 */
export async function POST(req: Request) {
  const secret = process.env.MAILTRAP_INBOUND_SECRET;
  if (!secret) return NextResponse.json({ error: "Inbound email is not configured." }, { status: 503 });

  const raw = await req.text();
  if (Buffer.byteLength(raw) > MAX_BYTES) return NextResponse.json({ error: "Payload too large." }, { status: 413 });
  if (!verifyMailtrapSignature(raw, req.headers.get("mailtrap-signature"), secret)) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Body must be JSON." }, { status: 400 });
  }

  const events = inboundEvents(payload);
  const claimed: { logId: string; ref: (typeof events)[number] }[] = [];
  for (const ref of events) {
    const logId = await claimMessage(ref, { "user-agent": req.headers.get("user-agent") });
    if (logId) claimed.push({ logId, ref });
  }
  if (claimed.length) {
    after(async () => {
      for (const { logId, ref } of claimed) await processInboundMessage(logId, ref);
    });
  }
  return NextResponse.json({ ok: true, received: events.length, queued: claimed.length });
}

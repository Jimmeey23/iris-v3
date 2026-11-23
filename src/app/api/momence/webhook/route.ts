import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { asSystem } from "@/lib/server/db";

/**
 * Momence webhook receiver. Requests must carry the shared secret in the
 * `x-iris-webhook-secret` header (or `?secret=`), matching MOMENCE_WEBHOOK_SECRET.
 * Events are stored in iris.webhook_events for processing; the payload is never logged.
 */
const MAX_BODY_CHARS = 2_000_000;

function authorised(req: NextRequest) {
  const expected = process.env.MOMENCE_WEBHOOK_SECRET;
  if (!expected) return false;
  const header = req.headers.get("x-iris-webhook-secret");
  // Query-string secrets leak into access logs and referrers. Still accepted (the sender
  // may not be able to set headers) but deprecated: prefer the header.
  const query = header ? null : req.nextUrl.searchParams.get("secret");
  if (query) console.warn("[momence webhook] deprecated ?secret= used; send the x-iris-webhook-secret header instead.");
  const given = header ?? query ?? "";
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  if (!authorised(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const raw = await req.text();
  if (raw.length > MAX_BODY_CHARS) return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  const body = (() => {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  })();
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  const event = String(body.event ?? body.type ?? "unknown").slice(0, 100);
  try {
    await asSystem((c) =>
      c.query("insert into iris.webhook_events (provider, event_type, payload) values ('momence', $1, $2::jsonb)", [
        event,
        JSON.stringify(body),
      ]),
    );
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[momence webhook] store failed:", (err as Error).message);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}

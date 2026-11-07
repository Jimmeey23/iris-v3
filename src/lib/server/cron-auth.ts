import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

/**
 * Shared auth for the cron routes. `Authorization: Bearer $CRON_SECRET` (what Vercel
 * Cron sends) or `x-cron-secret: $CRON_SECRET` (easy curl/system-crontab). Returns
 * null when the server has no secret configured, false on a bad credential.
 */
export function authorisedCron(req: NextRequest): boolean | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) return null;
  const given = req.headers.get("x-cron-secret") ?? req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const a = Buffer.from(given);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

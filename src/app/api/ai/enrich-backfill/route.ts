import { NextResponse } from "next/server";
import { asSystem } from "@/lib/server/db";
import { requireSession } from "@/lib/server/auth";
import { enrichTicket, ENRICH_VERSION } from "@/lib/server/ai-enrich";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Admin-only: enrich tickets that have no enrichment yet, oldest first.
 *   GET                         → how many are left
 *   POST { limit, dryRun }      → process up to `limit` (max 100) per call.
 * dryRun (default true) returns what would change without saving or retitling anything.
 */
export async function GET() {
  const auth = await requireSession({ admin: true });
  if ("error" in auth) return auth.error;
  const left = await asSystem(async (c) =>
    Number(
      (
        await c.query(
          `select count(*) from iris.tickets
            where coalesce((collected_info->'_ai'->>'v')::int, 0) < $1
              and coalesce(collected_info->>'sourceRef', '') !~ '^(fillout|zite):'`,
          [ENRICH_VERSION],
        )
      ).rows[0].count,
    ),
  );
  return NextResponse.json({ remaining: left });
}

export async function POST(request: Request) {
  const auth = await requireSession({ admin: true });
  if ("error" in auth) return auth.error;
  const b = await request.json().catch(() => ({}));
  const limit = Math.max(1, Math.min(100, Number(b.limit) || 20));
  const dryRun = b.dryRun !== false;

  const ids = await asSystem(async (c) =>
    (
      await c.query(
        `select id from iris.tickets
          where coalesce((collected_info->'_ai'->>'v')::int, 0) < $1
            and coalesce(collected_info->>'sourceRef', '') !~ '^(fillout|zite):'
          order by created_at
          limit $2`,
        [ENRICH_VERSION, limit],
      )
    ).rows.map((r) => r.id as string),
  );

  const results: Array<Record<string, unknown>> = [];
  for (const id of ids) {
    const r = await enrichTicket(id, { userId: auth.session.user_id, dryRun, force: true });
    if (r.outcome === "disabled") return NextResponse.json({ error: "AI is switched off or over budget in Settings → AI.", results }, { status: 503 });
    results.push({ id, outcome: r.outcome, retitled: r.retitled ?? false, title: r.ai?.title, suggestion: r.ai?.suggestion ?? null });
  }
  return NextResponse.json({ dryRun, processed: results.length, results });
}

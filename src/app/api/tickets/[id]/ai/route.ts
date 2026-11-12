import { NextResponse, type NextRequest } from "next/server";
import { withUser } from "@/lib/server/db";
import { dbError, requireSession } from "@/lib/server/auth";
import { enrichTicket } from "@/lib/server/ai-enrich";
import { fetchTicket } from "@/lib/server/tickets";
import { RateLimitError, enforceRateLimit, userKey } from "@/lib/server/rate-limit";

export const dynamic = "force-dynamic";

/**
 * AI enrichment on one ticket.
 *   { action: "accept" }   apply the suggested category / sub-category
 *   { action: "dismiss" }  keep the current category, hide the suggestion
 *   { action: "refresh" }  re-run the enrichment (e.g. after the description changed)
 * Row-level security applies: you can only act on tickets you can see.
 */
export async function POST(request: NextRequest, ctx: RouteContext<"/api/tickets/[id]/ai">) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const { session } = auth;
  const { id } = await ctx.params;
  const b = await request.json().catch(() => ({}));
  const action = String(b.action ?? "");
  if (!["accept", "dismiss", "refresh"].includes(action)) {
    return NextResponse.json({ error: "action must be accept, dismiss or refresh" }, { status: 400 });
  }

  try {
    // Visibility check through RLS before anything runs as the system role.
    const visible = await withUser(session.user_id, async (c) =>
      (await c.query("select id, collected_info->'_ai' as ai from iris.tickets where id = $1", [id])).rows[0],
    );
    if (!visible) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

    if (action === "refresh") {
      try {
        await enforceRateLimit("ai-chat", userKey(session.user_id));
      } catch (e) {
        if (e instanceof RateLimitError) return NextResponse.json({ error: "Too many AI requests. Try again shortly." }, { status: 429 });
      }
      const r = await enrichTicket(id, { userId: session.user_id, force: true });
      if (r.outcome === "disabled") return NextResponse.json({ error: "AI is switched off or over budget in Settings → AI." }, { status: 503 });
      if (r.outcome === "failed") return NextResponse.json({ error: "The AI couldn't process this ticket. Try again later." }, { status: 502 });
    } else {
      const s = visible.ai?.suggestion;
      if (!s || s.status !== "pending") return NextResponse.json({ error: "There's no pending suggestion on this ticket." }, { status: 409 });
      await withUser(session.user_id, async (c) => {
        if (action === "accept") {
          await c.query("update iris.tickets set category = $2, subcategory = $3 where id = $1", [id, s.category, s.subcategory]);
        }
        await c.query(
          `update iris.tickets
              set collected_info = jsonb_set(collected_info, '{_ai,suggestion,status}', to_jsonb($2::text))
            where id = $1`,
          [id, action === "accept" ? "accepted" : "dismissed"],
        );
        await c.query(
          `insert into iris.audit_log (actor_user_id, action, entity_type, entity_id, after_state)
           values ($1, $2, 'tickets', $3, $4::jsonb)`,
          [session.user_id, `ai_category_${action}ed`, id, JSON.stringify({ category: s.category, subcategory: s.subcategory })],
        ).catch(() => {});
      });
    }
    const ticket = await withUser(session.user_id, (c) => fetchTicket(c, id));
    return NextResponse.json({ ticket });
  } catch (err) {
    return dbError(err);
  }
}

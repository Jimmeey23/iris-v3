import { NextResponse } from "next/server";
import { withUser } from "@/lib/server/db";
import { dbError, requireSession } from "@/lib/server/auth";
import { answerQuestion } from "@/lib/server/answerer";

export const dynamic = "force-dynamic";

const ROUTES = new Set(["rules", "kb", "history", "stats", "equipment", "trainer", "intake", "ai"]);

/**
 * POST { message }            → try to answer from IRIS data, no AI. { answered, content?, rule?, route? }
 * POST { log: route, rule? }  → record a turn answered elsewhere (client rules, intake form, escalation).
 */
export async function POST(request: Request) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const b = (await request.json().catch(() => ({}))) as { message?: unknown; log?: unknown; rule?: unknown; escalated?: unknown };
  try {
    return await withUser(auth.session.user_id, async (c) => {
      const record = (route: string, rule: string | null, escalated = false) =>
        c.query("insert into assistant_turns (user_id, route, rule, escalated) values ($1, $2, $3, $4)", [auth.session.user_id, route, rule, escalated]);

      if (typeof b.log === "string") {
        if (!ROUTES.has(b.log)) return NextResponse.json({ error: "Unknown route" }, { status: 400 });
        await record(b.log, typeof b.rule === "string" ? b.rule.slice(0, 120) : null, b.escalated === true);
        return NextResponse.json({ ok: true });
      }

      const message = typeof b.message === "string" ? b.message.trim().slice(0, 400) : "";
      if (!message) return NextResponse.json({ error: "Message is empty" }, { status: 400 });
      const answer = await answerQuestion(c, message, auth.session.role);
      if (!answer) return NextResponse.json({ answered: false });
      await record(answer.route, answer.rule);
      return NextResponse.json({ answered: true, ...answer });
    });
  } catch (err) {
    return dbError(err);
  }
}

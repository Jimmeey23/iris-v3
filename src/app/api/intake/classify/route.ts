import { NextResponse } from "next/server";
import { withUser } from "@/lib/server/db";
import { dbError, requireSession } from "@/lib/server/auth";
import { RateLimitError, enforceRateLimit, userKey } from "@/lib/server/rate-limit";
import { classify, extractFields, taxonomy, type Candidate } from "@/lib/server/intake";
import { aiClassify } from "@/lib/server/ai-classify";

/**
 * Classify a free-text report. Rules + ticket history first (free); falls
 * back to one small AI call only when those aren't confident.
 */
export async function POST(request: Request) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  // Classification may fall through to one AI call; the limit keeps a script from
  // burning the budget. Rules-only replies still count — cheaper to keep one path.
  try {
    await enforceRateLimit("intake-classify", userKey(auth.session.user_id));
  } catch (e) {
    if (e instanceof RateLimitError) {
      return NextResponse.json({ error: e.message }, { status: 429, headers: { "Retry-After": String(e.resetsInSec) } });
    }
    return NextResponse.json({ error: "Try again in a moment." }, { status: 503 });
  }
  const b = await request.json().catch(() => ({}));
  const text = typeof b.text === "string" ? b.text.trim().slice(0, 4000) : "";
  if (!text) return NextResponse.json({ error: "Text is empty" }, { status: 400 });
  const allowAi = b.allowAi !== false && Boolean(process.env.ANTHROPIC_API_KEY);

  try {
    return await withUser(auth.session.user_id, async (c) => {
      const trainers = (await c.query("select name from employees where is_active and department_code = 'TRN'")).rows.map((r) => r.name as string);
      const studios = (await c.query("select code, name from studios where is_active")).rows;
      const fields = extractFields(text, trainers);
      const det = await classify(c, text, Boolean(fields.trainerName));

      if (det.confident || !allowAi) {
        return NextResponse.json({ ...det, fields, source: "rules" });
      }

      // Rules unsure → one cheap structured AI call.
      try {
        const ai = await aiClassify(text, det.taxonomy, studios, auth.session.user_id);
        const tax = await taxonomy(c);
        const known = det.taxonomy.find((x) => x.category === ai.category);
        const candidates: Candidate[] = [...det.candidates];
        if (ai.understood && known) {
          const sub = known.subcategories.find((s) => s.name === ai.subcategory)?.name ?? null;
          const m = tax.meta(known.category, sub);
          candidates.unshift({
            category: known.category, subcategory: sub, score: 10, department: m.department ?? known.department,
            priority: ai.priority ?? m.priority, via: "ai",
          });
        }
        return NextResponse.json({
          candidates: candidates.slice(0, 5),
          confident: Boolean(ai.understood && known),
          taxonomy: det.taxonomy,
          fields: {
            ...fields,
            studioCode: fields.studioCode ?? (studios.some((s) => s.code === ai.studio_code) ? ai.studio_code : undefined),
            when: fields.when ?? ai.when ?? undefined,
            trainerName: fields.trainerName ?? ai.trainer_name ?? undefined,
            clientName: ai.client_name ?? undefined,
            title: ai.title ?? undefined,
          },
          question: ai.understood ? null : ai.clarifying_question,
          source: "ai",
        });
      } catch (e) {
        console.error("[intake ai]", (e as Error).message);
        return NextResponse.json({ ...det, fields, source: "rules", aiUnavailable: true });
      }
    });
  } catch (err) {
    return dbError(err);
  }
}

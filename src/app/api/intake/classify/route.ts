import { NextResponse } from "next/server";
import { warmMomenceSessions } from "@/lib/server/momence";
import { withUser } from "@/lib/server/db";
import { dbError, requireSession } from "@/lib/server/auth";
import { RateLimitError, enforceRateLimit, userKey } from "@/lib/server/rate-limit";
import { classify, extractFields, taxonomy, type Candidate } from "@/lib/server/intake";
import { aiClassify } from "@/lib/server/ai-classify";
import { loadEffectiveAiConfig } from "@/lib/server/ai-config";
import { evaluateRoutingRules, type RoutingRuleRow } from "@/lib/iris/routing-engine";

export async function POST(request: Request) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  // A report is starting: load Momence classes/trainers now so the pickers open instantly.
  warmMomenceSessions();
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

  try {
    const aiCfg = await loadEffectiveAiConfig();
    const allowAi =
      b.allowAi !== false && Boolean(process.env.ANTHROPIC_API_KEY) && aiCfg.enabled && aiCfg.autoTriage;

    return await withUser(auth.session.user_id, async (c) => {
      const [trainersRes, studiosRes, rulesRes] = await Promise.all([
        c.query("select name from employees where is_active and department_code = 'TRN'"),
        c.query<{ code: string; name: string; city: string }>("select code, name, city from studios where is_active"),
        c.query<RoutingRuleRow>(
          "select id, name, condition, department_code, priority, sort_order, is_active from routing_rules where is_active = true order by sort_order, name",
        ),
      ]);
      const trainers = trainersRes.rows.map((r) => r.name as string);
      const studios = studiosRes.rows;
      const fields = extractFields(text, trainers);
      const det = await classify(c, text, Boolean(fields.trainerName));

      const applyRouting = (cand: Candidate, studioCode?: string): Candidate => {
        const studioCity = studioCode ? studios.find((s) => s.code === studioCode)?.city ?? null : null;
        const routed = evaluateRoutingRules(rulesRes.rows, {
          category: cand.category,
          subcategory: cand.subcategory,
          priority: cand.priority,
          studioCode,
          studioCity,
          departmentCode: cand.department,
          source: "form_intake",
          description: text,
        });
        return {
          ...cand,
          department: routed.departmentCode ?? cand.department,
          priority: routed.priority ?? cand.priority,
        };
      };

      // Respect Settings -> AI & Models confidence threshold (`ai.confidence_threshold`)
      const topScore = det.candidates[0]?.score ?? 0;
      const meetsThreshold = det.confident && topScore >= Math.max(1, aiCfg.confidenceThreshold * 6);

      if (meetsThreshold || !allowAi) {
        return NextResponse.json({
          ...det,
          candidates: det.candidates.map((cand) => applyRouting(cand, fields.studioCode)),
          fields,
          source: "rules",
        });
      }

      try {
        const ai = await aiClassify(text, det.taxonomy, studios, auth.session.user_id, aiCfg.primaryModel);
        const tax = await taxonomy(c);
        const known = det.taxonomy.find((x) => x.category === ai.category);
        const candidates: Candidate[] = [...det.candidates];
        const resolvedStudio =
          fields.studioCode ?? (studios.some((s) => s.code === ai.studio_code) ? (ai.studio_code ?? undefined) : undefined);

        if (ai.understood && known) {
          const sub = known.subcategories.find((s) => s.name === ai.subcategory)?.name ?? null;
          const m = tax.meta(known.category, sub);
          candidates.unshift({
            category: known.category,
            subcategory: sub,
            score: 10,
            department: m.department ?? known.department,
            priority: ai.priority ?? m.priority,
            via: "ai",
          });
        }
        return NextResponse.json({
          candidates: candidates.slice(0, 5).map((cand) => applyRouting(cand, resolvedStudio)),
          confident: Boolean(ai.understood && known),
          taxonomy: det.taxonomy,
          fields: {
            ...fields,
            studioCode: resolvedStudio,
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
        return NextResponse.json({
          ...det,
          candidates: det.candidates.map((cand) => applyRouting(cand, fields.studioCode)),
          fields,
          source: "rules",
          aiUnavailable: true,
        });
      }
    });
  } catch (err) {
    return dbError(err);
  }
}

import { NextResponse, type NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { asSystem, withUser } from "@/lib/server/db";
import { dbError, requireSession } from "@/lib/server/auth";
import { loadEffectiveAiConfig } from "@/lib/server/ai-config";
import { costUsd } from "@/lib/server/ai-pricing";
import { RateLimitError, enforceRateLimit, userKey } from "@/lib/server/rate-limit";
import type { AnalysisFacts, TrainerAnalysis } from "@/lib/iris/trainer-analysis";

/**
 * POST { facts, base, signature, refresh? } (admin only)
 * Returns the cached AI wording when the signature matches; otherwise asks the model once
 * to refine the locally computed analysis, caches it, and returns it. When AI is off,
 * over budget or fails, returns { analysis: null } and the client keeps the local version.
 */
const Out = z.object({
  headline: z.string(),
  narrative: z.string(),
  strengths: z.array(z.string()).max(4),
  priorities: z.array(z.string()).max(4),
  coachingPlan: z.array(z.object({ horizon: z.string(), action: z.string() })).max(4),
});

let client: Anthropic | null = null;

export async function POST(request: NextRequest) {
  const auth = await requireSession({ admin: true });
  if ("error" in auth) return auth.error;
  const { session } = auth;
  const b = await request.json().catch(() => ({}));
  const facts = b.facts as AnalysisFacts | undefined;
  const base = b.base as TrainerAnalysis | undefined;
  const signature = typeof b.signature === "string" ? b.signature.slice(0, 200) : "";
  if (!facts?.name || !base || !signature) return NextResponse.json({ error: "Missing analysis input" }, { status: 400 });
  const key = String(facts.name).slice(0, 120);

  try {
    if (b.refresh !== true) {
      const cached = await withUser(session.user_id, async (c) =>
        (await c.query("select analysis, signature from trainer_analysis where trainer_name = $1", [key])).rows[0],
      );
      if (cached && cached.signature === signature) return NextResponse.json({ analysis: cached.analysis, cached: true });
    }

    const cfg = await loadEffectiveAiConfig();
    if (!cfg.enabled || cfg.budgetExceeded || !process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ analysis: null, reason: cfg.disabledReason ?? cfg.budgetExceededReason ?? "AI is off" });
    }
    try {
      await enforceRateLimit("ai-chat", userKey(session.user_id));
    } catch (e) {
      if (e instanceof RateLimitError) return NextResponse.json({ analysis: null, reason: e.message });
      throw e;
    }

    client ??= new Anthropic();
    const model = cfg.fallbackModel || cfg.primaryModel;
    const response = await client.messages.parse({
      model,
      max_tokens: 1500,
      system:
        "You write concise, evidence-based coaching analyses of fitness trainers for studio leadership at Physique 57 India. Use only the facts given; never invent numbers. Keep the headline under 12 words and the narrative to 3-4 sentences. Strengths and priorities: 2-3 items each, naming the rubric criterion and its percentage. Coaching plan: exactly three steps with horizons 'This week', 'This month', 'Next review'. Plain, professional tone; no emoji.",
      messages: [{ role: "user", content: JSON.stringify({ facts, draft: base }).slice(0, 12000) }],
      output_config: { effort: "low", format: zodOutputFormat(Out) },
    } as Parameters<Anthropic["messages"]["parse"]>[0]);

    const u = response.usage;
    await asSystem((c) =>
      c.query(
        `insert into iris.ai_usage (user_id, model, input_tokens, output_tokens, cache_read_tokens, cache_write_tokens, cost_usd)
         values ($1, $2, $3, $4, $5, $6, $7)`,
        [session.user_id, response.model ?? model, u.input_tokens, u.output_tokens, u.cache_read_input_tokens ?? 0, u.cache_creation_input_tokens ?? 0, costUsd(response.model ?? model, u) ?? 0],
      ),
    ).catch(() => {});

    const out = response.parsed_output as z.infer<typeof Out> | null;
    if (!out) return NextResponse.json({ analysis: null, reason: "No analysis returned" });
    const analysis: TrainerAnalysis = { ...base, ...out, engine: `AI (${response.model ?? model})` };
    await withUser(session.user_id, (c) =>
      c.query(
        `insert into trainer_analysis (trainer_name, signature, analysis, engine) values ($1, $2, $3, $4)
         on conflict (trainer_name) do update set signature = excluded.signature, analysis = excluded.analysis,
           engine = excluded.engine, updated_at = now()`,
        [key, signature, JSON.stringify(analysis), analysis.engine],
      ),
    );
    return NextResponse.json({ analysis, cached: false });
  } catch (err) {
    if (err instanceof Anthropic.APIError) return NextResponse.json({ analysis: null, reason: "AI request failed" });
    return dbError(err);
  }
}

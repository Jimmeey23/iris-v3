import "server-only";
import { asSystem } from "./db";
import { costUsd } from "./ai-pricing";

/** What an AI call was spent on. Shown in the AI usage log. */
export type AiFeature =
  | "assistant_chat"
  | "intake_classify"
  | "ticket_enrich"
  | "email_intake"
  | "pasted_report"
  | "trainer_analysis";

type Usage = {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
};

/**
 * One row per billed Claude call: who spent it, on what, on which ticket, when.
 * Runs on its own connection so the record survives a rollback of the caller's work.
 * Never throws.
 */
export async function recordAiUsage(e: {
  userId: string | null;
  model: string;
  usage: Usage;
  feature: AiFeature;
  ticketId?: string | null;
  detail?: string | null;
  cost?: number;
}): Promise<void> {
  const u = e.usage;
  const cost = e.cost ?? costUsd(e.model, u as Parameters<typeof costUsd>[1]) ?? 0;
  await asSystem((c) =>
    c.query(
      `insert into iris.ai_usage (user_id, model, input_tokens, output_tokens, cache_read_tokens, cache_write_tokens, cost_usd, feature, ticket_id, detail)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        e.userId, e.model, u.input_tokens, u.output_tokens, u.cache_read_input_tokens ?? 0, u.cache_creation_input_tokens ?? 0,
        cost, e.feature, e.ticketId ?? null, e.detail ? e.detail.replace(/\s+/g, " ").trim().slice(0, 200) : null,
      ],
    ),
  ).catch((err) => console.error("[ai usage] not recorded:", (err as Error).message));
}

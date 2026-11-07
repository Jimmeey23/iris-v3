import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { MODEL } from "./agent";
import { costUsd } from "./ai-pricing";
import { asSystem } from "./db";

/**
 * One cheap call (no tools, low effort, structured output) used only when the
 * rules and ticket history can't classify a message. Returns the category,
 * subcategory and whatever fields it can read, or a single clarifying question.
 */

const Result = z.object({
  understood: z.boolean().describe("false if the message is too vague to classify"),
  category: z.string().nullable(),
  subcategory: z.string().nullable(),
  priority: z.enum(["P0", "P1", "P2", "P3"]).nullable(),
  studio_code: z.string().nullable(),
  client_name: z.string().nullable().describe("Client/member name if one is mentioned"),
  trainer_name: z.string().nullable(),
  when: z.string().nullable().describe("When it happened, as written"),
  title: z.string().nullable().describe("Specific one-line ticket title"),
  clarifying_question: z.string().nullable().describe("If not understood: one short question to ask"),
});
export type AiClassification = z.infer<typeof Result>;

let client: Anthropic | null = null;

export async function aiClassify(
  text: string,
  taxonomy: Array<{ category: string; subcategories: Array<{ name: string }> }>,
  studios: Array<{ code: string; name: string }>,
  userId: string,
): Promise<AiClassification> {
  client ??= new Anthropic();
  const system = `You classify issue reports from staff at Physique 57 India (barre fitness studios in Mumbai and Bengaluru) into the ticket taxonomy below. Pick the closest category and subcategory exactly as written. Use P0 for safety/injury/theft or a studio unable to run classes, P1 for significant client-facing disruption, P2 for an individual client's issue, P3 for minor or informational items. If the message is too vague to classify, set understood=false and ask one short, specific question.

Studios: ${studios.map((s) => `${s.code}=${s.name}`).join("; ")}

Taxonomy:
${taxonomy.map((c) => `${c.category}: ${c.subcategories.slice(0, 25).map((s) => s.name).join(" | ")}`).join("\n")}`;

  const response = await client.messages.parse({
    model: MODEL,
    max_tokens: 2000,
    system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: text.slice(0, 4000) }],
    output_config: { effort: "low", format: zodOutputFormat(Result) },
  } as Parameters<Anthropic["messages"]["parse"]>[0]);

  const u = response.usage;
  await asSystem((c) =>
    c.query(
      `insert into iris.ai_usage (user_id, model, input_tokens, output_tokens, cache_read_tokens, cache_write_tokens, cost_usd)
       values ($1, $2, $3, $4, $5, $6, $7)`,
      [userId, response.model ?? MODEL, u.input_tokens, u.output_tokens, u.cache_read_input_tokens ?? 0, u.cache_creation_input_tokens ?? 0, costUsd(response.model ?? MODEL, u) ?? 0],
    ),
  ).catch(() => {});

  if (response.stop_reason === "refusal" || !response.parsed_output) {
    return { understood: false, category: null, subcategory: null, priority: null, studio_code: null, client_name: null, trainer_name: null, when: null, title: null, clarifying_question: "Could you describe what happened, where, and who was affected?" };
  }
  return response.parsed_output as AiClassification;
}

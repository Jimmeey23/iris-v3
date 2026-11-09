import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { costUsd } from "./ai-pricing";
import { asSystem } from "./db";
import { fieldCatalogue } from "@/lib/iris/intake-schema";

/**
 * Primary intake classifier: one Claude Haiku call per report, structured output,
 * low effort. Picks category, subcategory, department, priority and a suggested
 * owner from the live roster.
 *
 * Cost: the system prompt (taxonomy + departments + roster + studios) is built
 * deterministically (sorted, no timestamps, no workload numbers) so it is
 * byte-identical between calls and served from the prompt cache. Only the
 * report text is billed at the full input rate.
 */

export const INTAKE_MODEL = process.env.IRIS_INTAKE_MODEL || "claude-haiku-5-5";

const Result = z.object({
  understood: z.boolean().describe("false if the message is too vague to classify"),
  category: z.string().nullable(),
  subcategory: z.string().nullable(),
  department_code: z.string().nullable().describe("Department code from the Departments list that should own this"),
  owner_employee_id: z
    .string()
    .nullable()
    .describe("Employee id from the Roster best placed to own this, or null if no one clearly fits"),
  priority: z.enum(["P0", "P1", "P2", "P3"]).nullable(),
  confidence: z.number().min(0).max(1).describe("How sure you are of the category and subcategory, 0 to 1"),
  studio_code: z.string().nullable(),
  client_name: z.string().nullable().describe("Client/member name if one is mentioned"),
  trainer_name: z.string().nullable(),
  when: z.string().nullable().describe("When it happened, as written"),
  title: z.string().nullable().describe("Specific one-line ticket title"),
  clarifying_question: z.string().nullable().describe("If not understood: one short question to ask"),
  answers: z
    .array(z.object({ key: z.string(), value: z.string() }))
    .describe("Report fields the message clearly answers, using keys from the Field catalogue"),
});
export type AiClassification = z.infer<typeof Result>;

export type ClassifyContext = {
  taxonomy: Array<{ category: string; subcategories: Array<{ name: string }> }>;
  studios: Array<{ code: string; name: string }>;
  departments: Array<{ code: string; name: string; description?: string | null }>;
  employees: Array<{
    id: string;
    name: string;
    department_code: string;
    role?: string | null;
    title?: string | null;
    skills?: string[] | null;
    studio_codes?: string[] | null;
  }>;
};

const UNCLEAR: AiClassification = {
  understood: false,
  category: null,
  subcategory: null,
  department_code: null,
  owner_employee_id: null,
  priority: null,
  confidence: 0,
  studio_code: null,
  client_name: null,
  trainer_name: null,
  when: null,
  title: null,
  clarifying_question: "Could you describe what happened, where, and who was affected?",
  answers: [],
};

const byText = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/** Stable system prompt: same inputs → same bytes → cache hit. */
export function buildSystemPrompt(ctx: ClassifyContext): string {
  const tax = [...ctx.taxonomy]
    .sort((a, b) => byText(a.category, b.category))
    .map((c) => `${c.category}: ${c.subcategories.map((s) => s.name).sort(byText).join(" | ")}`)
    .join("\n");
  const depts = [...ctx.departments]
    .sort((a, b) => byText(a.code, b.code))
    .map((d) => `${d.code} = ${d.name}${d.description ? ` (${d.description.replace(/\s+/g, " ").slice(0, 140)})` : ""}`)
    .join("\n");
  const roster = [...ctx.employees]
    .sort((a, b) => byText(a.id, b.id))
    .map((e) =>
      [
        e.id,
        e.name,
        e.department_code,
        e.title || e.role || "",
        (e.skills ?? []).slice(0, 8).join(", "),
        (e.studio_codes ?? []).join(","),
      ].join(" | "),
    )
    .join("\n");
  const studios = [...ctx.studios]
    .sort((a, b) => byText(a.code, b.code))
    .map((s) => `${s.code}=${s.name}`)
    .join("; ");

  return `You triage issue reports from staff at Physique 57 India (barre fitness studios in Mumbai and Bengaluru).

For each report decide:
1. category and subcategory - copy them exactly from the Taxonomy. Classify by what the problem IS, not by words it contains.
   - Class formats (Barre, PowerCycle, Strength, Mat, Cardio Barre, FIT, Back Body Blaze, Recovery...) are also names of classes and rooms. "Can't book into PowerCycle" is a booking problem, not a bike repair. Only choose an equipment repair when a piece of equipment is described as broken, faulty or not working.
   - A client who can book one class type but not another is a booking-system issue.
2. department_code - the department from Departments that must act on it.
3. owner_employee_id - the one Roster person in that department best placed to own it (matching skills and studio). Use null if nobody clearly fits; do not guess across departments.
4. priority - P0 safety/injury/theft/harassment or a studio unable to run classes; P1 significant disruption to many clients or a whole class; P2 one client's issue; P3 minor or informational.
5. confidence - honest 0 to 1. Below 0.6 when the report could reasonably fit two subcategories.
6. answers - fill every field from the Field catalogue that the message states or clearly implies (e.g. "since Monday" → sinceWhen, "two members complained" → membersComplained=Yes). For fields with [options], use one option exactly as written. Never guess: leave out anything the message does not say.
If the report is too vague to classify, set understood=false and ask one short, specific question.

Studios: ${studios}

Departments:
${depts}

Roster (id | name | department | role | skills | studios):
${roster}

Taxonomy:
${tax}

Field catalogue (key: label [options]):
${fieldCatalogue()}`;
}

let client: Anthropic | null = null;

export async function aiClassify(
  text: string,
  ctx: ClassifyContext,
  userId: string,
  modelOverride?: string,
): Promise<AiClassification> {
  client ??= new Anthropic();
  const model = modelOverride || INTAKE_MODEL;

  const response = await client.messages.parse({
    model,
    max_tokens: 1500,
    system: [{ type: "text", text: buildSystemPrompt(ctx), cache_control: { type: "ephemeral", ttl: "1h" } }],
    messages: [{ role: "user", content: text.slice(0, 4000) }],
    output_config: { effort: "low", format: zodOutputFormat(Result) },
  } as Parameters<Anthropic["messages"]["parse"]>[0]);

  const u = response.usage;
  await asSystem((c) =>
    c.query(
      `insert into iris.ai_usage (user_id, model, input_tokens, output_tokens, cache_read_tokens, cache_write_tokens, cost_usd)
       values ($1, $2, $3, $4, $5, $6, $7)`,
      [userId, response.model ?? model, u.input_tokens, u.output_tokens, u.cache_read_input_tokens ?? 0, u.cache_creation_input_tokens ?? 0, costUsd(response.model ?? model, u) ?? 0],
    ),
  ).catch(() => {});

  if (response.stop_reason === "refusal" || !response.parsed_output) return UNCLEAR;
  return response.parsed_output as AiClassification;
}

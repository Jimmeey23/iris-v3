import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import type { PoolClient } from "pg";
import { recordAiUsage } from "./ai-usage";
import { loadEffectiveAiConfig } from "./ai-config";
import { asSystem, isSandboxRequest } from "./db";
import { MOCK_MODEL, mockEnrichment, mockLatency } from "./sandbox-ai";
import { CATEGORY_MAP } from "@/lib/iris/constants";
import { QUESTION_IDS, questionLibraryText, type StoredResolutionChoice } from "@/lib/iris/resolution-questions";

/**
 * Ticket enrichment: one Claude Haiku call per ticket that (1) writes a clean title,
 * summary and the facts staff need, and (2) second-checks the category.
 *
 * It never overwrites what a person wrote. The result is stored beside the ticket in
 * collected_info._ai; the only field it replaces is a title that was generated from the
 * category ("Membership Flexibility · Isha Sanghi"), and the original is kept. A category
 * it disagrees with is stored as a suggestion for staff to accept or dismiss.
 *
 * Cost: the system prompt (instructions + taxonomy) is deterministic and cached for an
 * hour, so a call bills the ticket text plus ~400 output tokens - about $0.001.
 */

export const ENRICH_MODEL = process.env.IRIS_ENRICH_MODEL || "claude-haiku-5-5";
/** v2: also picks the close-out questions (resolution). The backfill re-runs tickets below this. */
export const ENRICH_VERSION = 2;
/** A different category is only suggested at or above this confidence. */
const SUGGEST_AT = 0.8;
const MAX_INPUT_CHARS = 6000;

const Result = z.object({
  title: z.string().describe("Specific one-line title, max 90 characters: what happened / what is asked, who, where"),
  summary: z.string().describe("2-3 plain-English sentences: what happened, who is affected, what is being asked"),
  request: z.string().nullable().describe("The concrete ask or outcome wanted, or null if it is only a report"),
  decision_needed: z.string().nullable().describe("A decision or approval someone must make, or null"),
  facts: z
    .array(z.object({ label: z.string(), value: z.string() }))
    .describe("Key facts stated in the text: member, amounts (₹), plan/package, dates, class, trainer, studio, staff involved"),
  unknowns: z.array(z.string()).describe("Up to 4 short facts staff still need to act, that the text does not give"),
  category: z.string().describe("Best category, copied exactly from the Taxonomy"),
  subcategory: z.string().describe("Best subcategory of that category, copied exactly from the Taxonomy"),
  confidence: z.number().min(0).max(1).describe("How sure you are of category + subcategory, 0 to 1"),
  resolution_questions: z
    .array(z.enum(QUESTION_IDS))
    .describe("2-3 ids from the Close-out question library that whoever resolves THIS ticket must answer, most important first"),
  custom_resolution_question: z
    .string()
    .nullable()
    .describe("At most one extra free-text close-out question when nothing in the library covers a key fact for this ticket; otherwise null"),
});
type Enrichment = z.infer<typeof Result> & { model?: string };

export type TicketAi = {
  v: number;
  model: string;
  at: string;
  title: string;
  summary: string;
  request: string | null;
  decisionNeeded: string | null;
  facts: Array<{ label: string; value: string }>;
  unknowns: string[];
  originalTitle?: string;
  suggestion?: { category: string; subcategory: string; confidence: number; status: "pending" | "accepted" | "dismissed" } | null;
  /** Close-out questions picked for this ticket; read by getResolutionQuestions(). */
  resolution?: StoredResolutionChoice | null;
};

const byText = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/** Stable bytes → prompt-cache hit across calls. */
function systemPrompt(): string {
  const tax = Object.keys(CATEGORY_MAP)
    .sort(byText)
    .map((c) => `${c}: ${[...CATEGORY_MAP[c]].sort(byText).join(" | ")}`)
    .join("\n");
  return `You tidy up issue tickets for Physique 57 India (boutique barre / PowerCycle / strength studios in Mumbai and Bengaluru). Tickets come from staff forms, chat, emails and webhooks and are often messy: forwarded emails, metadata lines ("Issue type: … Reported by: … Email subject: …"), or titles that are just a category plus a name.

Rewrite them so the person who picks the ticket up understands it in ten seconds.

Rules:
- Use only what the ticket says. Never invent names, amounts, dates or outcomes. If something isn't stated, leave it out or list it under unknowns.
- title: specific and scannable, max 90 characters, e.g. "Transfer 4 remaining classes to sister while travelling – Kwality House". No ticket numbers, no "Re:"/"Fwd:".
- summary: 2-3 sentences, plain English, third person, no greeting or sign-off.
- facts: short label + value pairs for things stated in the text (Member, Amount, Package, Valid till, Class, Trainer, Staff involved…). Keep amounts with ₹. Leave out routing metadata the ticket already shows (owner, department, "Reported by", email subject, issue type, studio) and anything obvious from the title. At most 8.
- unknowns: at most 4 short items staff need to act and the text doesn't give (e.g. "Membership expiry date"). Empty if nothing important is missing.
- category / subcategory: classify by what the problem IS. Copy both exactly from the Taxonomy. Class formats (Barre, PowerCycle, Strength…) are also class and room names: "can't book PowerCycle" is a booking issue, not a bike repair. confidence below 0.6 when two subcategories fit equally.
- resolution_questions: pick the 2-3 questions from the Close-out question library that best prove THIS ticket was handled properly, in order of importance. Match what the problem actually is (a lost item → item_status, checks_done, member_informed; a broken bike → fixed_by, cost, verified; a refund → txn_ref, amount, member_informed). Never pick a question that cannot apply (no Momence booking question for a lost item or a repair).
- custom_resolution_question: only when a fact essential to closing this ticket is not covered by the library, one short question (max 120 characters). Otherwise null.
- Write in British/Indian English. Members' personal details stay as written; do not add any.

Taxonomy:
${tax}

Close-out question library (id: question [options]):
${questionLibraryText()}`;
}

function ticketText(t: {
  title: string;
  description: string | null;
  category: string | null;
  subcategory: string | null;
  studio: string | null;
  source: string | null;
  affected_client: string | null;
  collected_info: Record<string, unknown> | null;
}): string {
  const answers = Object.entries(t.collected_info ?? {})
    .filter(([k, v]) => !k.startsWith("_") && !["summary", "title", "description"].includes(k) && v !== "" && v != null && typeof v !== "object")
    .map(([k, v]) => `${k}: ${String(v)}`)
    .join("\n");
  const text = [
    `Current title: ${t.title}`,
    `Filed as: ${t.category ?? "?"} › ${t.subcategory ?? "?"}`,
    t.studio && `Studio: ${t.studio}`,
    t.affected_client && `Affected client: ${t.affected_client}`,
    t.source && `Source: ${t.source}`,
    answers && `Form answers:\n${answers}`,
    `Description:\n${t.description ?? ""}`,
  ]
    .filter(Boolean)
    .join("\n");
  return text.slice(0, MAX_INPUT_CHARS);
}

/** Titles built from the taxonomy rather than written by a person - safe to replace. */
export function isGeneratedTitle(title: string, category: string | null, subcategory: string | null): boolean {
  const t = title.trim().toLowerCase();
  if (t.length < 12) return true;
  const starts = [subcategory, category].filter(Boolean).map((s) => s!.toLowerCase());
  if (starts.some((s) => t === s || t.startsWith(`${s} ·`) || t.startsWith(`${s} -`) || t.startsWith(`${s} —`))) return true;
  return /^(client request|request|complaint|issue|feedback|query)\s*[-–—·:]/.test(t);
}

let client: Anthropic | null = null;

async function callModel(text: string, userId: string | null, ticketId: string, row?: Record<string, any>): Promise<Enrichment | null> {
  // Training sandbox: mock answer, no API call, no usage recorded.
  if (await isSandboxRequest()) {
    await mockLatency();
    return { ...mockEnrichment(text, { category: row?.category ?? null, subcategory: row?.subcategory ?? null, studio: row?.studio, affected_client: row?.affected_client, description: row?.description, title: row?.title }), model: MOCK_MODEL };
  }
  client ??= new Anthropic();
  const response = await client.messages.parse({
    model: ENRICH_MODEL,
    max_tokens: 1200,
    system: [{ type: "text", text: systemPrompt(), cache_control: { type: "ephemeral", ttl: "1h" } }],
    messages: [{ role: "user", content: text }],
    output_config: { effort: "low", format: zodOutputFormat(Result) },
  } as Parameters<Anthropic["messages"]["parse"]>[0]);

  const u = response.usage;
  const model = response.model ?? ENRICH_MODEL;
  await recordAiUsage({ userId, model, usage: u, feature: "ticket_enrich", ticketId, detail: "Ticket summary & tags" });

  if (response.stop_reason === "refusal" || !response.parsed_output) return null;
  return response.parsed_output as Enrichment;
}

const clip = (s: string | null | undefined, n: number) => (s ?? "").replace(/\s+/g, " ").trim().slice(0, n);

/** Turns the model's answer into what's stored, dropping anything outside the taxonomy. */
function toTicketAi(e: Enrichment, current: { category: string | null; subcategory: string | null }): TicketAi {
  const validPair = (CATEGORY_MAP[e.category] ?? []).includes(e.subcategory);
  const differs = e.category !== current.category || e.subcategory !== current.subcategory;
  return {
    v: ENRICH_VERSION,
    model: e.model ?? ENRICH_MODEL,
    at: new Date().toISOString(),
    title: clip(e.title, 120),
    summary: clip(e.summary, 800),
    request: clip(e.request, 300) || null,
    decisionNeeded: clip(e.decision_needed, 300) || null,
    facts: e.facts
      .map((f) => ({ label: clip(f.label, 40), value: clip(f.value, 200) }))
      .filter((f) => f.label && f.value)
      .slice(0, 8),
    unknowns: e.unknowns.map((x) => clip(x, 80)).filter(Boolean).slice(0, 4),
    suggestion:
      validPair && differs && e.confidence >= SUGGEST_AT
        ? { category: e.category, subcategory: e.subcategory, confidence: Math.round(e.confidence * 100) / 100, status: "pending" }
        : null,
    resolution: resolutionChoice(e, current, validPair),
  };
}

/** Valid library ids only, deduped, 2-3; null when the model gave too few to be useful. */
function resolutionChoice(
  e: Enrichment,
  current: { category: string | null; subcategory: string | null },
  validPair: boolean,
): StoredResolutionChoice | null {
  const known = new Set<string>(QUESTION_IDS);
  const ids = [...new Set((e.resolution_questions ?? []).filter((id) => known.has(id)))].slice(0, 3);
  const custom = clip(e.custom_resolution_question, 160) || null;
  if (ids.length + (custom ? 1 : 0) < 2) return null;
  return {
    ids,
    custom,
    category: current.category,
    subcategory: current.subcategory,
    suggestedCategory: validPair ? e.category : null,
  };
}

export type EnrichOutcome = "enriched" | "skipped" | "disabled" | "failed";

/**
 * Enrich one ticket. Runs as the system role (called after the response is sent, or from
 * the admin backfill). `force` re-runs a ticket that already has an enrichment.
 */
export async function enrichTicket(ticketId: string, opts: { userId?: string | null; force?: boolean; dryRun?: boolean } = {}): Promise<{ outcome: EnrichOutcome; ai?: TicketAi; retitled?: boolean }> {
  const cfg = await loadEffectiveAiConfig().catch(() => null);
  const sandbox = await isSandboxRequest();
  if (!cfg?.enabled || (!sandbox && (cfg.budgetExceeded || !process.env.ANTHROPIC_API_KEY))) return { outcome: "disabled" };
  const autoSetting = await asSystem((c) =>
    c.query("select value from iris.app_settings where key = 'ai.auto_enrich'").then((r) => r.rows[0]?.value),
  ).catch(() => undefined);
  if (autoSetting === false && !opts.force) return { outcome: "disabled" };

  const t = await asSystem(async (c: PoolClient) =>
    (
      await c.query(
        `select t.id, t.title, t.description, t.category, t.subcategory, t.source, t.affected_client, t.collected_info,
                s.name as studio
           from iris.tickets t left join iris.studios s on s.code = t.studio_code
          where t.id = $1`,
        [ticketId],
      )
    ).rows[0],
  );
  if (!t) return { outcome: "skipped" };
  if (t.collected_info?._ai?.v >= ENRICH_VERSION && !opts.force) return { outcome: "skipped" };
  // Trainer assessments are already structured scorecards.
  if ((t.collected_info?.sourceRef ?? "").toString().match(/^(fillout|zite):/)) return { outcome: "skipped" };

  let e: Enrichment | null;
  try {
    e = await callModel(ticketText(t), opts.userId ?? null, ticketId, t);
  } catch (err) {
    console.warn("[ai-enrich] failed:", err instanceof Error ? err.message : err);
    return { outcome: "failed" };
  }
  if (!e) return { outcome: "failed" };

  const ai = toTicketAi(e, t);
  const retitle = Boolean(ai.title) && isGeneratedTitle(t.title, t.category, t.subcategory);
  if (retitle) ai.originalTitle = t.title;
  if (opts.dryRun) return { outcome: "enriched", ai, retitled: retitle };

  await asSystem((c) =>
    c.query(
      `update iris.tickets
          set collected_info = coalesce(collected_info, '{}'::jsonb) || jsonb_build_object('_ai', $2::jsonb),
              title = case when $3 then $4 else title end
        where id = $1`,
      [ticketId, JSON.stringify(ai), retitle, ai.title],
    ),
  );
  return { outcome: "enriched", ai, retitled: retitle };
}

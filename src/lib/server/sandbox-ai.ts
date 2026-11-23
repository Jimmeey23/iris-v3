import "server-only";
import { keywordQuestions } from "@/lib/iris/resolution-questions";
import type Anthropic from "@anthropic-ai/sdk";
import { CATEGORY_MAP } from "@/lib/iris/constants";
import type { RoutingRuleId } from "@/lib/iris/ownership-policy";

/**
 * Mock AI for the training sandbox.
 *
 * In the sandbox no request ever reaches Anthropic and no AI usage is recorded.
 * Every AI feature gets a deterministic stand-in that returns the same shape
 * the real model returns (so the screens, routing and tool loops behave the
 * same), built from keyword rules over the IRIS taxonomy:
 *
 *  - mockEnrichment     ticket title / summary / facts / category check
 *  - mockClassify       intake triage (category, owner team, priority, fields)
 *  - mockReadReport     pasted text / inbound email → ticket draft
 *  - mockTrainerAnalysis  trainer coaching analysis
 *  - mockAgentMessage   chat assistant turns, including real tool calls
 */

export const MOCK_MODEL = "sandbox-mock-ai";

/** A short pause so the UI shows its "thinking" states like the real thing. */
export function mockLatency(min = 500, max = 1200) {
  return new Promise((r) => setTimeout(r, min + Math.floor(Math.random() * (max - min))));
}

// ── Keyword taxonomy ─────────────────────────────────────────────────────────

type Rule = { category: string; words: RegExp; dept: string; rule: RoutingRuleId | null; priority: "P0" | "P1" | "P2" | "P3"; strong?: RegExp };

const RULES: Rule[] = [
  { category: "Safety and Security", words: /\b(injur|hurt|slip|fell|fall|blood|fire|harass|unsafe|emergency|ambulance|faint)/i, dept: "MGT", rule: "safety_legal", priority: "P0" },
  { category: "Theft and Lost Items", words: /\b(lost|stolen|theft|missing (phone|wallet|bag|keys)|left (my|her|his)|lost and found|airpods)/i, dept: "OPS", rule: "facilities", priority: "P3" },
  { category: "Repair and Maintenance", words: /\b(bike|broken|leak|repair|fault|not working|ac\b|air ?con|light|plumb|towel|clean|toilet|shower|reformer|equipment)/i, dept: "FAC", rule: "facilities", priority: "P2" },
  { category: "Trainer Feedback", words: /\b(trainer|instructor|coach|late|no[- ]show|cue|cueing|adjust)/i, dept: "TRN", rule: "trainer", priority: "P2" },
  { category: "Pricing and Memberships", words: /\b(refund|membership|freeze|pause|pack|expir|price|pricing|renew|cancel(l)?ation|package)/i, dept: "MEM", rule: "refunds", priority: "P2" },
  { category: "Tech Issues", words: /\b(charged|double charge|payment|laptop|wifi|wi-fi|printer|card|invoice|billing)/i, dept: "PAY", rule: "accounts", priority: "P1", strong: /\b(charged\b[^.]{0,25}\b(twice|two times|double)|double[- ]charg|duplicate (charge|payment|debit)|laptop|wi-?fi)/i },
  { category: "Operating Systems", words: /\b(app|momence|crm|booking system|listing|notification|email.*(late|delay)|sync|login)/i, dept: "ITS", rule: "scheduling", priority: "P2" },
  { category: "Scheduling", words: /\b(schedule|waitlist|slot|substitut|time change|book(ing)?|class timing|add (a )?class)/i, dept: "SCH", rule: "scheduling", priority: "P2" },
  { category: "Class Experience", words: /\b(music|audio|mic|hot|cold|temperature|pacing|flow|crowded|class format|playlist)/i, dept: "OPS", rule: "facilities", priority: "P2" },
  { category: "Customer Service and Communication", words: /\b(rude|reply|respond|follow[- ]?up|complain|front desk|call back|no response|tone)/i, dept: "SCS", rule: "member_sales", priority: "P2" },
  { category: "Studio Amenities and Facilities", words: /\b(valet|parking|locker|changing room|water|amenit|lobby)/i, dept: "OPS", rule: "facilities", priority: "P3" },
  { category: "Brand Feedback", words: /\b(poster|marketing|instagram|brand|collateral|hosted class|event|campaign)/i, dept: "MKT", rule: "hosted_class", priority: "P3" },
  { category: "Internal Operations & Admin", words: /\b(sop|approval|policy|memo|internal|lead|process|workflow|licen[cs]e)/i, dept: "OPS", rule: null, priority: "P3" },
];

const STOP = new Set(["the", "and", "for", "with", "was", "were", "has", "have", "had", "not", "but", "this", "that", "from", "they", "she", "her", "his", "him", "our", "are", "issue", "client", "member"]);

function words(s: string) {
  return s.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !STOP.has(w));
}

/** Best subcategory of `category` by word overlap with the text. */
function bestSub(category: string, text: string, subs = CATEGORY_MAP[category] ?? []): { sub: string | null; score: number } {
  const t = new Set(words(text));
  let best: string | null = subs[0] ?? null;
  let score = 0;
  for (const s of subs) {
    const n = words(s).filter((w) => t.has(w) || [...t].some((x) => x.startsWith(w.slice(0, 5)))).length;
    if (n > score) { score = n; best = s; }
  }
  return { sub: best, score };
}

export type MockTriage = {
  category: string;
  subcategory: string | null;
  dept: string;
  rule: RoutingRuleId | null;
  also: RoutingRuleId[];
  priority: "P0" | "P1" | "P2" | "P3";
  confidence: number;
};

/** Keyword triage over the IRIS taxonomy. */
export function mockTriage(text: string, taxonomy?: Array<{ category: string; subcategories: Array<{ name: string }> }>): MockTriage | null {
  // A "strong" phrase (e.g. "charged twice") outweighs incidental words ("membership").
  const hits = RULES.map((r) => ({ r, n: (text.match(new RegExp(r.words.source, "gi")) ?? []).length + (r.strong?.test(text) ? 3 : 0) })).filter((h) => h.n > 0);
  if (!hits.length) return null;
  hits.sort((a, b) => b.n - a.n);
  const top = hits[0].r;
  const subs = taxonomy?.find((x) => x.category === top.category)?.subcategories.map((s) => s.name);
  const { sub, score } = bestSub(top.category, text, subs);
  let priority = top.priority;
  if (/\b(urgent|asap|immediately|whole class|all members|every(one)? in class|can'?t run)/i.test(text) && priority !== "P0") priority = "P1";
  const also = hits.slice(1, 2).map((h) => h.r.rule).filter((r): r is RoutingRuleId => !!r && r !== top.rule);
  return {
    category: top.category,
    subcategory: sub,
    dept: top.dept,
    rule: top.rule,
    also,
    priority,
    confidence: Math.min(0.95, 0.55 + hits[0].n * 0.1 + score * 0.08),
  };
}

// ── Little text helpers ──────────────────────────────────────────────────────

const clean = (s: string) => s.replace(/\s+/g, " ").trim();
function firstSentence(s: string, max = 90) {
  const t = clean(s).replace(/^(hi|hello|dear)[^,.!]*[,.!]\s*/i, "");
  const m = t.match(/^(.{12,}?[.!?])(\s|$)/);
  const out = (m ? m[1] : t).replace(/[.!?]$/, "");
  return out.length > max ? `${out.slice(0, max - 1).trimEnd()}…` : out;
}
function sentences(s: string, n: number) {
  return (clean(s).match(/[^.!?]+[.!?]?/g) ?? [clean(s)]).slice(0, n).map((x) => x.trim()).join(" ");
}
const NAME = /\b(?:member|client|ms\.?|mr\.?|mrs\.?)\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)/;
const AMOUNT = /(?:₹|rs\.?|inr)\s?([\d,]+)/i;
const WHEN = /\b(today|yesterday|this morning|last (?:night|week|monday|tuesday|wednesday|thursday|friday|saturday|sunday)|on (?:mon|tue|wed|thu|fri|sat|sun)[a-z]*|\d{1,2}(?::\d{2})?\s?(?:am|pm))\b/i;
const EMAIL = /[\w.+-]+@[\w-]+\.[\w.]+/;
const PHONE = /(?:\+?91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}/;

function facts(text: string, extra: Array<{ label: string; value: string | null | undefined }> = []) {
  const out: Array<{ label: string; value: string }> = [];
  const name = text.match(NAME)?.[1];
  if (name) out.push({ label: "Member", value: name });
  const amt = text.match(AMOUNT)?.[1];
  if (amt) out.push({ label: "Amount", value: `₹${amt}` });
  const when = text.match(WHEN)?.[1];
  if (when) out.push({ label: "When", value: when });
  for (const e of extra) if (e.value) out.push({ label: e.label, value: e.value });
  return out.slice(0, 8);
}

// ── Ticket enrichment ────────────────────────────────────────────────────────

export function mockEnrichment(text: string, current: { category: string | null; subcategory: string | null; studio?: string | null; affected_client?: string | null; description?: string | null; title?: string | null }) {
  const body = current.description || text;
  const tri = mockTriage(`${current.title ?? ""} ${body}`);
  const ask = body.match(/\b(?:wants?|asks?|requests?|requested|would like|need(?:s|ed)?)\b[^.!?]*/i)?.[0];
  const unknowns: string[] = [];
  if (!current.affected_client && !NAME.test(body)) unknowns.push("Member name");
  if (!WHEN.test(body)) unknowns.push("Date and time it happened");
  if (!current.studio) unknowns.push("Studio");
  if (/refund|charge/i.test(body) && !AMOUNT.test(body)) unknowns.push("Amount involved");
  return {
    title: firstSentence(current.title && current.title.length > 20 ? current.title : body),
    summary: sentences(body, 3) || "No details given.",
    request: ask ? clean(ask).replace(/^./, (c) => c.toUpperCase()) : null,
    decision_needed: /refund|approv|goodwill|waive|exception|credit/i.test(body) ? "Whether to approve the exception the member is asking for." : null,
    facts: facts(body, [
      { label: "Studio", value: current.studio },
      { label: "Client", value: current.affected_client },
    ]),
    unknowns: unknowns.slice(0, 4),
    category: tri?.category ?? current.category ?? "Miscellaneous",
    subcategory: tri?.subcategory ?? current.subcategory ?? "",
    confidence: tri?.confidence ?? 0.5,
    // Same picks the keyword rules make, so training shows realistic close-out questions.
    resolution_questions: keywordQuestions({ category: current.category, subcategory: current.subcategory, title: current.title })
      .map((q) => q.id)
      .slice(0, 3),
    custom_resolution_question: null,
  };
}

// ── Intake classification ────────────────────────────────────────────────────

export function mockClassify(
  text: string,
  ctx: {
    taxonomy: Array<{ category: string; subcategories: Array<{ name: string }> }>;
    studios: Array<{ code: string; name: string }>;
    employees: Array<{ id: string; name: string; department_code: string }>;
  },
) {
  const tri = mockTriage(text, ctx.taxonomy);
  const lower = text.toLowerCase();
  const studio = ctx.studios.find(
    (s) => s.name.toLowerCase().split(",").map((x) => x.trim()).some((part) => part.length > 3 && lower.includes(part)) || new RegExp(`\\b${s.code}\\b`).test(text),
  );
  const trainer = ctx.employees.find((e) => e.department_code === "TRN" && lower.includes(e.name.split(" ")[0].toLowerCase()));
  const owner = tri ? ctx.employees.find((e) => e.department_code === tri.dept) : undefined;
  const when = text.match(WHEN)?.[1] ?? null;
  if (!tri || clean(text).length < 15) {
    return {
      understood: false, category: null, subcategory: null, department_code: null, owner_employee_id: null,
      routing_rule: null, also_routing_rules: [], priority: null, confidence: 0.3, studio_code: studio?.code ?? null,
      client_name: null, trainer_name: null, when, title: null,
      clarifying_question: "What happened, and where? For example: which studio, which class, and who was affected?",
      answers: [], relevant_fields: [],
    };
  }
  const answers: Array<{ key: string; value: string }> = [];
  if (when) answers.push({ key: "sinceWhen", value: when });
  if (/members? complained|several members|two members|clients complained/i.test(text)) answers.push({ key: "membersComplained", value: "Yes" });
  return {
    understood: true,
    category: tri.category,
    subcategory: tri.subcategory,
    department_code: tri.dept,
    owner_employee_id: owner?.id ?? null,
    routing_rule: tri.rule,
    also_routing_rules: tri.also,
    priority: tri.priority,
    confidence: tri.confidence,
    studio_code: studio?.code ?? null,
    client_name: text.match(NAME)?.[1] ?? null,
    trainer_name: trainer?.name ?? null,
    when,
    title: firstSentence(text),
    clarifying_question: null,
    answers,
    relevant_fields: tri.category === "Repair and Maintenance" ? ["usable", "memberImpact", "sinceWhen"] : ["sinceWhen", "memberImpact", "membersComplained"],
  };
}

// ── Pasted text / inbound email ──────────────────────────────────────────────

export function mockReadReport(text: string) {
  const body = clean(
    text
      .replace(/^(from|to|sent|date|subject|cc):.*$/gim, "")
      .replace(/^-{2,}.*forwarded message.*$/gim, "")
      .replace(/\n(regards|thanks|best|cheers|warm regards)[\s\S]*$/i, ""),
  );
  const subject = text.match(/^subject:\s*(.+)$/im)?.[1]?.replace(/^(re|fwd?):\s*/i, "");
  const actionable = body.length > 25 && !/\b(unsubscribe|newsletter|out of office|auto[- ]?reply)\b/i.test(text);
  return {
    is_actionable: actionable,
    not_actionable_reason: actionable ? null : "Looks like an automatic or promotional message with nothing to act on.",
    is_forward: /forwarded message|\bfwd?:/i.test(text),
    member_name: text.match(NAME)?.[1] ?? text.match(/^from:\s*"?([^<"\n]+?)"?\s*</im)?.[1]?.trim() ?? null,
    member_email: text.match(EMAIL)?.[0] ?? null,
    member_phone: text.match(PHONE)?.[0] ?? null,
    studio_hint: text.match(/\b(kwality house|kemps corner|bandra|supreme hq|kenkere|bengaluru|courtside|copper & cloves|pop up)\b/i)?.[0] ?? null,
    title: firstSentence(subject || body),
    description: sentences(body, 6),
    issue_text: body.slice(0, 1500),
  };
}

// ── Trainer analysis ─────────────────────────────────────────────────────────

export function mockTrainerAnalysis(name: string, base: Record<string, unknown>) {
  const first = name.split(" ")[0];
  const arr = (v: unknown) => (Array.isArray(v) ? v.map(String).slice(0, 3) : []);
  const strengths = arr(base.strengths);
  const priorities = arr(base.priorities);
  return {
    headline: typeof base.headline === "string" ? base.headline : `${first}: steady performer with clear next steps`,
    narrative:
      typeof base.narrative === "string" && base.narrative
        ? base.narrative
        : `${first}'s recent assessments show consistent delivery. The strongest areas are listed below; the priorities focus on the lowest-scoring rubric criteria. This is a practice analysis generated in the training sandbox.`,
    strengths: strengths.length ? strengths : ["Class energy and engagement", "Punctual, well-prepared sessions"],
    priorities: priorities.length ? priorities : ["Clearer verbal cueing in transitions", "More hands-on adjustments"],
    coachingPlan: [
      { horizon: "This week", action: `Observe one of ${first}'s classes and share two specific cueing notes.` },
      { horizon: "This month", action: "Pair with a master trainer for a co-taught class focused on the top priority." },
      { horizon: "Next review", action: "Re-score the priority criteria and compare with this review." },
    ],
  };
}

// ── Chat assistant ───────────────────────────────────────────────────────────

type MsgParam = Anthropic.MessageParam;

function mkMessage(content: Anthropic.ContentBlock[], stop: Anthropic.Message["stop_reason"]): Anthropic.Message {
  return {
    id: `msg_sandbox_${Date.now().toString(36)}`,
    type: "message",
    role: "assistant",
    model: MOCK_MODEL,
    content,
    stop_reason: stop,
    stop_sequence: null,
    usage: { input_tokens: 0, output_tokens: 0, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 },
  } as unknown as Anthropic.Message;
}
const text = (t: string) => ({ type: "text", text: t, citations: null }) as unknown as Anthropic.ContentBlock;
let toolSeq = 0;
const toolUse = (name: string, input: Record<string, unknown>) =>
  ({ type: "tool_use", id: `toolu_sandbox_${Date.now().toString(36)}_${toolSeq++}`, name, input }) as unknown as Anthropic.ContentBlock;

function lastUserText(messages: MsgParam[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== "user") continue;
    if (typeof m.content === "string") return m.content.replace(/\n\n\(Reported by[\s\S]*$/, "");
    const t = m.content.find((b) => b.type === "text") as { text?: string } | undefined;
    if (t?.text) return t.text.replace(/\n\n\(Reported by[\s\S]*$/, "");
  }
  return "";
}

/** Tool calls the mock already made in this turn, with their results. */
function turnTools(messages: MsgParam[]) {
  const out: Array<{ name: string; result: string; error: boolean }> = [];
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role === "user" && typeof m.content === "string") break;
    if (m.role === "user" && Array.isArray(m.content) && m.content.some((b) => b.type === "text")) break;
    if (m.role !== "assistant" || !Array.isArray(m.content)) continue;
    for (const b of m.content) {
      if (b.type !== "tool_use") continue;
      const res = messages
        .slice(i + 1)
        .flatMap((x) => (Array.isArray(x.content) ? x.content : []))
        .find((r) => r.type === "tool_result" && r.tool_use_id === b.id) as Anthropic.ToolResultBlockParam | undefined;
      out.push({ name: b.name, result: typeof res?.content === "string" ? res.content : "", error: !!res?.is_error });
    }
  }
  return out;
}

const SENTIMENT = /\b(angry|upset|furious|frustrat|disappoint|unhappy|annoyed|happy|calm|fine)/i;

/**
 * One assistant step. Mirrors the real loop: look up similar tickets first, then
 * either answer a lookup or draft a ticket (asking for the client's words when a
 * client-facing draft needs them), then reply.
 */
export function mockAgentMessage(params: { messages: MsgParam[] }): Anthropic.Message {
  const msgs = params.messages;
  const said = lastUserText(msgs);
  const done = turnTools(msgs);
  const ticketRef = said.match(/\bP57-\d{3,5}\b/i)?.[0];
  const isLookup = !!ticketRef || /^(find|search|show|look ?up|what('?s| is)|status|any|list|how many)\b/i.test(said.trim()) || /\?$/.test(said.trim());
  const tri = mockTriage(said);

  // Step 1: always check ticket history first, as the real assistant does.
  if (!done.some((d) => d.name === "search_tickets")) {
    const q = ticketRef ?? words(said).slice(0, 6).join(" ");
    return mkMessage([text("Let me check the ticket history first."), toolUse("search_tickets", { query: q || said.slice(0, 60) })], "tool_use");
  }
  const history = done.find((d) => d.name === "search_tickets");
  let found: Array<Record<string, string>> = [];
  try { found = JSON.parse(history?.result ?? "{}").tickets ?? []; } catch { /* empty */ }

  // Lookups: answer from the tickets found.
  if (isLookup || !tri) {
    if (!found.length) {
      return mkMessage([text(
        tri
          ? "I couldn't find any similar tickets. If you'd like me to raise one, tell me what happened, where, when, and who was affected."
          : "I couldn't find anything matching that. Could you tell me a bit more: what happened, which studio, and who was affected?",
      )], "end_turn");
    }
    const lines = found.slice(0, 5).map((t) => `- **${t.ticket_id}** ${t.title} · ${String(t.status).replace(/_/g, " ")} · ${t.priority}${t.assignee ? ` · ${t.assignee}` : ""}`);
    return mkMessage([text(`Here's what I found (${found.length}):\n\n${lines.join("\n")}\n\nWant me to open one of these, or raise a new ticket?`)], "end_turn");
  }

  const draftCall = done.filter((d) => d.name === "draft_ticket").pop();
  if (draftCall && !draftCall.error) {
    const similar = found.length ? `\n\nHeads up: ${found.length} similar ticket${found.length === 1 ? "" : "s"} already exist, e.g. **${found[0].ticket_id}** (${String(found[0].status).replace(/_/g, " ")}).` : "";
    return mkMessage([text(`I've drafted the ticket for your review: **${tri.category}${tri.subcategory ? ` › ${tri.subcategory}` : ""}**, priority **${tri.priority}**, routed to **${tri.dept}**.${similar}\n\nCheck the details and confirm to create it.`)], "end_turn");
  }
  if (draftCall?.error && /client-facing/.test(draftCall.result)) {
    return mkMessage([text("This is a client-facing issue. What did the client say, in their own words, and how are they feeling about it (upset, frustrated, calm)?")], "end_turn");
  }

  // Client-facing drafts need the client's words and mood; the real tool enforces it.
  const clientFacing = /trainer feedback|class experience|customer service|pricing|membership/i.test(tri.category);
  const sentiment = said.match(SENTIMENT)?.[1];
  const quote = said.match(/["“]([^"”]{8,})["”]/)?.[1];
  return mkMessage([
    text("Drafting the ticket now."),
    toolUse("draft_ticket", {
      title: firstSentence(said),
      description: sentences(said, 6),
      category: tri.category,
      subcategory: tri.subcategory ?? undefined,
      priority: tri.priority,
      department_code: tri.dept,
      incident_when: said.match(WHEN)?.[1] ?? "As described by the reporter",
      affected_client: said.match(NAME)?.[1],
      ...(clientFacing && (quote || sentiment) ? { client_verbatim: quote ?? sentences(said, 2), client_sentiment: sentiment ?? "Unhappy" } : {}),
      tags: ["sandbox"],
    }),
  ], "tool_use");
}

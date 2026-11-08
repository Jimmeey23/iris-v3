/**
 * Deterministic question understanding for the assistant: decides whether a
 * question can be answered from IRIS data without calling the AI, and with
 * what parameters. Pure (no I/O) so it is unit tested; the server answers it.
 *
 * Anything not recognised with confidence returns null → the AI agent handles it.
 */
import type { KnowledgeArticle } from "./knowledge-base/compose";

export type Period = { label: string; days: number | null; offsetDays?: number };

export type Intent =
  | { kind: "equipment"; equipment: "bike" | "mic" | "ac"; number: number | null; studioHint: string | null }
  | { kind: "trainer"; name: string }
  | { kind: "stats"; period: Period; status: "open" | "breached" | "resolved" | "escalated" | null; topic: string | null; studioHint: string | null }
  | { kind: "history"; terms: string[]; studioHint: string | null; period: Period | null }
  | { kind: "kb"; terms: string[] };

const STOP = new Set(
  ("a an and any are as at be been before being by can could did do does done for from get got had has have how i if in is it its " +
    "me my of on or our should so than that the their them then there these they this those to was we were what when where which " +
    "who why will with would you your again ever happen happened happening similar previous past last time times issue issues ticket " +
    "tickets problem problems many much often recently lately before also still please tell show give know any anything about " +
    "studio studios fix fixed fixing do steps step procedure process guide way handle deal ok okay").split(" "),
);

/** Words that describe what went wrong rather than what it happened to. */
export const FAULT_VERBS = new Set(
  "broken broke break breaking failed fail failing fails leaked leak leaking leaks stopped stop stuck jammed working work works not down cut cutting dropped drop crashed noisy loud".split(" "),
);

/** Distinctive words of a studio's name, so they don't become a search topic. */
export function studioWords(studios: { code: string; name: string }[]): Set<string> {
  return new Set(studios.flatMap((s) => [s.code.toLowerCase(), ...s.name.toLowerCase().split(/[^a-z0-9]+/)]).filter(Boolean));
}

export function keyTerms(text: string): string[] {
  return [...new Set(
    text.toLowerCase().replace(/[^a-z0-9#\s-]/g, " ").split(/\s+/).map((w) => w.replace(/^-+|-+$/g, ""))
      .filter((w) => w.length >= 2 && !STOP.has(w) && !/^\d+$/.test(w)),
  )].slice(0, 6);
}

export function parsePeriod(text: string): Period | null {
  const t = text.toLowerCase();
  if (/\btoday\b/.test(t)) return { label: "today", days: 1 };
  if (/\byesterday\b/.test(t)) return { label: "yesterday", days: 1, offsetDays: 1 };
  if (/\blast week\b/.test(t)) return { label: "last week", days: 7, offsetDays: 7 };
  if (/\b(this week|past week|last 7 days|7 days)\b/.test(t)) return { label: "the last 7 days", days: 7 };
  if (/\blast month\b/.test(t)) return { label: "the previous 30 days", days: 30, offsetDays: 30 };
  if (/\b(this month|past month|last 30 days|30 days)\b/.test(t)) return { label: "the last 30 days", days: 30 };
  if (/\b(this quarter|last 90 days|90 days|3 months)\b/.test(t)) return { label: "the last 90 days", days: 90 };
  if (/\b(this year|last 12 months|12 months|year)\b/.test(t)) return { label: "the last 12 months", days: 365 };
  if (/\b(ever|all time|overall|in total)\b/.test(t)) return { label: "all time", days: null };
  return null;
}

/** A studio mentioned by a distinctive word of its name ("Bandra", "Kemps", "Supreme"). */
export function studioHint(text: string, studios: { code: string; name: string }[]): string | null {
  const t = ` ${text.toLowerCase().replace(/[^a-z0-9\s]/g, " ")} `;
  const generic = new Set(["studio", "house", "the", "hq", "and", "of", "road", "mumbai", "bengaluru", "bangalore", "corner"]);
  for (const s of studios) {
    const words = s.name.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length >= 4 && !generic.has(w));
    if (words.some((w) => t.includes(` ${w} `))) return s.code;
    if (t.includes(` ${s.code.toLowerCase()} `)) return s.code;
  }
  return null;
}

export function classifyQuestion(raw: string, studios: { code: string; name: string }[] = []): Intent | null {
  const text = raw.trim();
  const t = text.toLowerCase();
  if (text.length < 4 || text.length > 400) return null;
  // Reasoning / judgement / drafting requests belong to the AI.
  if (/\b(why|explain|recommend|suggest|should we|write|draft|summari[sz]e|compare|predict|analy[sz]e|root cause)\b/.test(t)) return null;
  // Only questions are answered from data; a statement ("the AC is broken") is a report → intake form.
  const isQuestion = /\?\s*$/.test(t) || /^(how|what|what's|whats|which|has|have|had|did|does|do|is|are|was|were|when|where|who|any|show|list|status|tell|give|count)\b/.test(t);
  if (!isQuestion) return null;
  const studio = studioHint(t, studios);
  const studioNameWords = studioWords(studios);
  const terms = () => keyTerms(t).filter((w) => !studioNameWords.has(w));

  // Equipment: "bike 8", "status of mic 2", "AC at Bandra history"
  const eq = t.match(/\b(bike|mic|microphone)\s*(?:no\.?|number|#)?\s*(\d{1,3})\b/);
  if (eq) return { kind: "equipment", equipment: eq[1] === "bike" ? "bike" : "mic", number: Number(eq[2]), studioHint: studio };
  if (/\b(ac|air.?con\w*|hvac)\b/.test(t) && /\b(status|history|faults?|how many times|failed|broken)\b/.test(t)) {
    return { kind: "equipment", equipment: "ac", number: null, studioHint: studio };
  }

  // Trainer performance (manager-only data; the server enforces that).
  const tr =
    t.match(/how (?:is|has) ([a-z][a-z .'-]{1,40}?) (?:been )?(?:doing|performing|scoring|rated)/) ??
    t.match(/(?:score|scores|assessment|assessments|rating|ratings) (?:for|of) ([a-z][a-z .'-]{1,40}?)[?.!]*$/) ??
    t.match(/^([a-z][a-z .'-]{1,40}?)'s (?:score|scores|assessment|assessments|rating)/);
  if (tr) return { kind: "trainer", name: tr[1].trim() };

  // Counts: "how many tickets this week", "how many breached at Bandra"
  if (/\b(how many|number of|count of|total)\b/.test(t) && !/\bbefore\b/.test(t)) {
    const status = /\bbreach/.test(t) ? "breached" : /\bescalat/.test(t) ? "escalated" : /\b(resolved|closed|fixed)\b/.test(t) ? "resolved" : /\b(open|pending|outstanding)\b/.test(t) ? "open" : null;
    const topic = terms().filter((w) => !["breached", "escalated", "resolved", "closed", "open", "pending", "outstanding", "week", "month", "today", "yesterday", "year", "days", "quarter"].includes(w))[0] ?? null;
    return { kind: "stats", period: parsePeriod(t) ?? { label: "the last 30 days", days: 30 }, status, topic, studioHint: studio };
  }

  // History: "has the AC failed before", "any similar issues with lockers", "how often does the mic cut out"
  if (/\b(before|again|similar|previous|past|how often|last time|recurring|happened|history of|ever)\b/.test(t)) {
    const found = terms();
    if (found.length) return { kind: "history", terms: found, studioHint: studio, period: parsePeriod(t) };
  }

  // How-to: knowledge base
  if (/^(how (do|to|can|should|would)|what (do|should|can) (i|we)|what'?s the (policy|process|procedure)|steps (to|for)|procedure for|policy (on|for)|guide (to|for))/.test(t)) {
    const found = terms();
    if (found.length) return { kind: "kb", terms: found };
  }
  return null;
}

/**
 * Best knowledge article for the terms, or null when no article is a clear match.
 * Each term scores on its own (title > tags > summary > steps > body); a match needs
 * most terms to hit, at least one in the title or tags, and a lead over the runner-up.
 */
export function bestArticle(articles: KnowledgeArticle[], terms: string[]): { article: KnowledgeArticle; score: number } | null {
  if (!terms.length) return null;
  const scored = articles
    .map((a) => {
      const title = a.title.toLowerCase();
      const tags = (a.tags ?? []).join(" ").toLowerCase();
      const summary = a.summary.toLowerCase();
      const rest = [a.steps.join(" "), a.body ?? "", a.category].join(" ").toLowerCase();
      let score = 0;
      let hits = 0;
      let strong = false;
      for (const term of terms) {
        const re = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`);
        const s = re.test(title) ? 10 : re.test(tags) ? 7 : re.test(summary) ? 4 : re.test(rest) ? 1 : 0;
        if (s) hits++;
        if (s >= 7) strong = true;
        score += s;
      }
      return { article: a, score, hits, strong };
    })
    .filter((x) => x.strong && x.hits >= Math.ceil(terms.length * 0.6))
    .sort((a, b) => b.score - a.score);
  const [top, next] = scored;
  if (!top) return null;
  if (next && next.score > top.score * 0.85) return null; // ambiguous: let the AI choose
  return { article: top.article, score: top.score };
}

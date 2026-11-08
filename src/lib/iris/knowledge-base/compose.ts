// IRIS Knowledge Base - article shape, authoring helper and body parser.
//
// Everything an article says lives in the fields Neon stores (summary, steps,
// body, prevention, escalation, tags, relatedTemplates), so articles stay
// editable in the app and sync like any other document. Richer guidance is
// written into `body` as plain markdown with a fixed set of `## ` sections;
// the reader recognises those sections and styles them (anything else a
// manager writes still renders as ordinary markdown).

export interface KnowledgeArticle {
  id: string;
  title: string;
  category: string;
  /** Second level of the Knowledge Base drill-down (see knowledge-base/taxonomy.ts). */
  subcategory?: string;
  summary: string;
  steps: string[];
  prevention?: string;
  relatedTemplates?: string[];
  escalation?: string;
  /** Free-form markdown body shown with the steps. */
  body?: string;
  tags?: string[];
}

/** Section headings the reader styles specially (order = display order in authored articles). */
export const KB_SECTIONS = {
  glance: "At a glance",
  firstFive: "First 5 minutes",
  diagnose: "If you see… do this",
  say: "What to say",
  dos: "Do",
  donts: "Don't",
  closeOut: "Before you close the ticket",
} as const;

export interface ArticleSpec {
  id: string;
  title: string;
  category: string;
  /** Must be one of the category's sub-categories in knowledge-base/taxonomy.ts (unit-tested). */
  subcategory: string;
  summary: string;
  glance: {
    /** e.g. "P1 - class can't run safely" */
    priority: string;
    owner: string;
    /** First response target, e.g. "Within 15 minutes during class hours" */
    respond: string;
    /** Resolution target, e.g. "Same day; vendor visit within 24 h" */
    resolve: string;
  };
  /** Immediate triage - what to do before anything else. */
  firstFive: string[];
  /** The full procedure, in order (stored as the article's steps). */
  steps: string[];
  /** Decision guide: [what you see, what to do]. */
  diagnose?: Array<[string, string]>;
  /** Member / staff scripts: [moment, words to use]. */
  say?: Array<[string, string]>;
  dos?: string[];
  donts?: string[];
  /** What must be true / recorded before the ticket is resolved. */
  closeOut: string[];
  prevention: string;
  escalation: string;
  relatedTemplates: string[];
  tags: string[];
  /** Extra markdown appended after the standard sections. */
  notes?: string;
}

const bullets = (items: string[]) => items.map((i) => `- ${i}`).join("\n");

/** Compose the markdown body from the structured spec. */
export function composeArticleBody(spec: ArticleSpec): string {
  const parts: string[] = [];
  const g = spec.glance;
  parts.push(
    `## ${KB_SECTIONS.glance}\n` +
      bullets([
        `**Typical priority:** ${g.priority}`,
        `**Owner:** ${g.owner}`,
        `**First response:** ${g.respond}`,
        `**Target resolution:** ${g.resolve}`,
      ]),
  );
  parts.push(`## ${KB_SECTIONS.firstFive}\n${bullets(spec.firstFive)}`);
  if (spec.diagnose?.length) {
    parts.push(`## ${KB_SECTIONS.diagnose}\n${bullets(spec.diagnose.map(([see, act]) => `**${see}** - ${act}`))}`);
  }
  if (spec.say?.length) {
    parts.push(`## ${KB_SECTIONS.say}\n${spec.say.map(([when, words]) => `> **${when}** - “${words}”`).join("\n\n")}`);
  }
  if (spec.dos?.length) parts.push(`## ${KB_SECTIONS.dos}\n${bullets(spec.dos)}`);
  if (spec.donts?.length) parts.push(`## ${KB_SECTIONS.donts}\n${bullets(spec.donts)}`);
  parts.push(`## ${KB_SECTIONS.closeOut}\n${bullets(spec.closeOut)}`);
  if (spec.notes?.trim()) parts.push(spec.notes.trim());
  return parts.join("\n\n");
}

/** Build a stored article from an authoring spec. */
export function article(spec: ArticleSpec): KnowledgeArticle {
  return {
    id: spec.id,
    title: spec.title,
    category: spec.category,
    subcategory: spec.subcategory,
    summary: spec.summary,
    steps: spec.steps,
    body: composeArticleBody(spec),
    prevention: spec.prevention,
    escalation: spec.escalation,
    relatedTemplates: spec.relatedTemplates,
    tags: spec.tags.map((t) => t.toLowerCase()),
  };
}

/* ---------------- reading ---------------- */

export interface ArticleSection {
  /** Heading text ("" for content before the first heading). */
  heading: string;
  /** Which recognised section this is, if any. */
  kind: keyof typeof KB_SECTIONS | null;
  markdown: string;
}

const KIND_BY_HEADING = new Map<string, keyof typeof KB_SECTIONS>(
  (Object.entries(KB_SECTIONS) as Array<[keyof typeof KB_SECTIONS, string]>).map(([k, h]) => [normalizeHeading(h), k]),
);

function normalizeHeading(h: string): string {
  return h
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/\.\.\.|…/g, "…")
    .replace(/[^a-z0-9'… ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Split a markdown body into its `## ` sections. */
export function splitArticleBody(body: string | undefined): ArticleSection[] {
  const text = (body ?? "").replace(/\r\n/g, "\n").trim();
  if (!text) return [];
  const sections: ArticleSection[] = [];
  let heading = "";
  let lines: string[] = [];
  const flush = () => {
    const markdown = lines.join("\n").trim();
    if (markdown || heading) sections.push({ heading, kind: heading ? KIND_BY_HEADING.get(normalizeHeading(heading)) ?? null : null, markdown });
  };
  for (const line of text.split("\n")) {
    const m = /^##\s+(.+?)\s*#*\s*$/.exec(line);
    if (m) {
      flush();
      heading = m[1];
      lines = [];
    } else {
      lines.push(line);
    }
  }
  flush();
  return sections;
}

/** "- **Label:** value" lines (the At a glance section) → [label, value] pairs. */
export function parseGlance(markdown: string): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  for (const line of markdown.split("\n")) {
    const m = /^\s*[-*]\s+\*\*(.+?):?\*\*:?\s*(\S.*)$/.exec(line);
    if (m) out.push([m[1].replace(/:$/, "").trim(), m[2].trim()]);
  }
  return out;
}

/** Rough reading time for the whole article, in minutes (min 1). */
export function readingMinutes(a: Pick<KnowledgeArticle, "summary" | "steps" | "body" | "prevention" | "escalation">): number {
  const words = [a.summary, ...a.steps, a.body ?? "", a.prevention ?? "", a.escalation ?? ""].join(" ").split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

/**
 * Ticket descriptions as readable paragraphs. Intake used to store "Details captured"
 * etc. as "- Label: value" bullet lines; this turns any description (old or new) into
 * headed paragraphs of properly capitalised, punctuated sentences. Pure.
 */

export const DESCRIPTION_HEADINGS = ["Details captured", "Still unknown", "Context", "Member profile", "Related open tickets"] as const;
const HEADING_RE = new RegExp(`^(${DESCRIPTION_HEADINGS.join("|")}):?$`, "i");
const BULLET_RE = /^\s*(?:[-*•–]|\d+[.)])\s+/;

// Common words someone typed with a stray capital mid-sentence ("AC Is leaking").
const STRAY_CAPS = /(?<=[A-Za-z0-9,]\s)(Is|Are|Was|Were|Has|Have|Had|Not|The|And|Or|But|To|Of|In|On|At|For|With|From|It|Its|This|That|Be|Been|When|Since|Still|Also|Very|After|Before)\b(?![.:])/g;
const capFirst = (s: string) => s.replace(/^(["'(“‘]?)(\p{Ll})/u, (_, q: string, c: string) => q + c.toUpperCase());

/** "nature of the problem: ac is leaking" → "Nature of the problem: Ac is leaking." */
export function toSentence(line: string): string {
  let s = line.replace(BULLET_RE, "").replace(/\s+/g, " ").trim();
  if (!s) return "";
  const m = s.match(/^([^:]{1,60}):\s+(.+)$/);
  if (m && !/^https?$/i.test(m[1])) s = `${capFirst(m[1].trim())}: ${capFirst(m[2].trim())}`;
  else s = capFirst(s);
  s = s.replace(STRAY_CAPS, (w) => w.toLowerCase());
  return /[.!?…:;]["'”’)]?$/.test(s) ? s : `${s}.`;
}

export type DescriptionBlock = { heading: string | null; text: string };

/** Lines → one paragraph. "Still unknown" is a list of field names, so it reads as one sentence. */
function paragraph(heading: string | null, lines: string[]): string {
  const items = lines.map((l) => l.replace(BULLET_RE, "").trim()).filter(Boolean);
  if (!items.length) return "";
  if (heading && /^still unknown$/i.test(heading)) return toSentence(items.map((x, i) => (i ? x.charAt(0).toLowerCase() + x.slice(1) : x)).join(", "));
  return items.map(toSentence).join(" ");
}

export function descriptionBlocks(text: string | null | undefined): DescriptionBlock[] {
  const blocks: DescriptionBlock[] = [];
  let heading: string | null = null;
  let lines: string[] = [];
  const flush = () => {
    const t = paragraph(heading, lines);
    if (t) blocks.push({ heading, text: t });
    heading = null;
    lines = [];
  };
  for (const raw of (text ?? "").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) {
      // A blank line ends a plain paragraph; inside a headed section it's just spacing.
      if (!heading) flush();
      continue;
    }
    const h = line.match(HEADING_RE);
    if (h) {
      flush();
      heading = DESCRIPTION_HEADINGS.find((x) => x.toLowerCase() === h[1].toLowerCase()) ?? h[1];
      continue;
    }
    lines.push(line);
  }
  flush();
  return blocks;
}

/** Plain-text form for storage and email: "Heading\nSentence. Sentence." blocks. */
export function descriptionText(text: string | null | undefined): string {
  return descriptionBlocks(text)
    .map((b) => (b.heading ? `${b.heading}\n${b.text}` : b.text))
    .join("\n\n");
}

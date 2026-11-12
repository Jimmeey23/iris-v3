/**
 * Ticket descriptions, structured for display. Intake writes a summary paragraph followed
 * by headed sections of "Label: value" lines (older tickets prefix those lines with "- ").
 * This parses any description - old or new - into a summary plus labelled fields, with
 * values capitalised and stray mid-sentence capitals fixed. Pure.
 */

export const DESCRIPTION_HEADINGS = ["Details captured", "Still unknown", "Context", "Member profile", "Related open tickets"] as const;
const HEADING_RE = new RegExp(`^(${DESCRIPTION_HEADINGS.join("|")}):?$`, "i");
const BULLET_RE = /^\s*(?:[-*•–]|\d+[.)])\s+/;
// Common words typed with a stray capital mid-sentence ("AC Is leaking").
const STRAY_CAPS = /(?<=[A-Za-z0-9,]\s)(Is|Are|Was|Were|Has|Have|Had|Not|The|And|Or|But|To|Of|In|On|At|For|With|From|It|Its|This|That|Be|Been|When|Since|Still|Also|Very|After|Before)\b(?![.:])/g;

const capFirst = (s: string) => s.replace(/^(["'(“‘]?)(\p{Ll})/u, (_, q: string, c: string) => q + c.toUpperCase());

/** Capitalised, single-spaced, stray capitals fixed. No trailing punctuation added. */
export function tidy(text: string): string {
  return capFirst(text.replace(/\s+/g, " ").trim()).replace(STRAY_CAPS, (w) => w.toLowerCase());
}

/** A full sentence: tidied and ending in punctuation. */
export function toSentence(text: string): string {
  const s = tidy(text);
  return !s || /[.!?…:;\]]["'”’)]?$/.test(s) ? s : `${s}.`;
}

export type DescriptionField = { label: string | null; value: string };
export type DescriptionBlock =
  | { kind: "text"; paragraphs: string[] }
  | { kind: "fields"; heading: string; fields: DescriptionField[] }
  | { kind: "chips"; heading: string; items: string[] };

function splitField(line: string): DescriptionField {
  const s = line.replace(BULLET_RE, "").trim();
  const m = s.match(/^([^:]{1,60}?):\s+(.+)$/);
  if (m && !/^https?$/i.test(m[1])) return { label: tidy(m[1]), value: tidy(m[2]) };
  return { label: null, value: tidy(s) };
}

export function descriptionBlocks(text: string | null | undefined): DescriptionBlock[] {
  const blocks: DescriptionBlock[] = [];
  let heading: string | null = null;
  let lines: string[] = [];
  let paragraphs: string[] = [];
  const flushText = () => {
    if (lines.length) paragraphs.push(lines.map((l) => toSentence(l.replace(BULLET_RE, ""))).join(" "));
    lines = [];
  };
  const flush = () => {
    if (heading) {
      const items = lines.map((l) => l.replace(BULLET_RE, "").trim()).filter(Boolean);
      if (items.length) {
        if (/^still unknown$/i.test(heading)) blocks.push({ kind: "chips", heading, items: items.map(tidy) });
        else blocks.push({ kind: "fields", heading, fields: items.map(splitField) });
      }
      lines = [];
    } else {
      flushText();
      if (paragraphs.length) blocks.push({ kind: "text", paragraphs });
      paragraphs = [];
    }
    heading = null;
  };
  for (const raw of (text ?? "").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) {
      if (!heading) flushText(); // blank line = new paragraph; inside a section it's spacing
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

/**
 * Storage / email form: summary paragraphs, then each section as a heading and one
 * "Label: Value" per line - no bullet marks.
 */
export function descriptionText(text: string | null | undefined): string {
  return descriptionBlocks(text)
    .map((b) =>
      b.kind === "text"
        ? b.paragraphs.join("\n\n")
        : b.kind === "chips"
        ? `${b.heading}\n${b.items.join(", ")}`
        : `${b.heading}\n${b.fields.map((f) => (f.label ? `${f.label}: ${f.value}` : f.value)).join("\n")}`,
    )
    .join("\n\n");
}

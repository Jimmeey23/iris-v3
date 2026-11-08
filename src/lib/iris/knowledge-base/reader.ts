// IRIS Knowledge Base - pure helpers behind the Knowledge Base view: search
// ranking, related articles, the "At a glance" facts, cross-reference linking
// (TPL-… / KB-… codes in text) and parsing the authored sections into
// structured pieces the reader can lay out (falling back to plain markdown
// whenever a manager has written something freer).

import type { Priority } from "../types";
import { parseGlance, splitArticleBody, type KnowledgeArticle } from "./compose";

/* ---------------- search ---------------- */

export interface ScoredArticle {
  article: KnowledgeArticle;
  score: number;
}

/** Search terms: lower-cased, whitespace separated, quotes stripped. */
export function searchTerms(query: string): string[] {
  return query
    .toLowerCase()
    .replace(/["“”]/g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

/**
 * Relevance of one article for the given terms (0 = not a match). Every term must
 * match somewhere; where it matches decides its weight: id > title > tags / linked
 * template codes > sub-category > summary > category > steps > everything else.
 */
export function scoreArticle(a: KnowledgeArticle, terms: string[]): number {
  if (terms.length === 0) return 1;
  const title = a.title.toLowerCase();
  const titleWords = title.split(/[^a-z0-9]+/);
  const tags = (a.tags ?? []).map((t) => t.toLowerCase());
  const codes = (a.relatedTemplates ?? []).map((c) => c.toLowerCase());
  const subcategory = (a.subcategory ?? "").toLowerCase();
  const summary = a.summary.toLowerCase();
  const category = a.category.toLowerCase();
  const steps = a.steps.join("\n").toLowerCase();
  const rest = [a.body ?? "", a.prevention ?? "", a.escalation ?? ""].join("\n").toLowerCase();

  let total = 0;
  for (const term of terms) {
    // Very short terms ("ac", "ups") only match whole words, so they don't hit "feedback".
    const has = term.length < 3 ? wordMatcher(term) : (text: string) => text.includes(term);
    let s = 0;
    if (a.id.toLowerCase() === term) s = 100;
    else if (titleWords.includes(term)) s = 12;
    else if (has(title)) s = 9;
    else if (tags.some((t) => t === term)) s = 8;
    else if (tags.some((t) => has(t)) || codes.includes(term)) s = 6;
    else if (has(subcategory)) s = 5;
    else if (has(summary)) s = 4;
    else if (has(category)) s = 3;
    else if (has(steps)) s = 2;
    else if (has(rest)) s = 1;
    if (s === 0) return 0;
    total += s;
  }
  return total;
}

function wordMatcher(term: string): (text: string) => boolean {
  const re = new RegExp(`(^|[^a-z0-9])${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|[^a-z0-9])`);
  return (text) => re.test(text);
}

/** Articles matching the query, best first (ties keep KB order). Empty query → all, in KB order. */
export function searchArticles(articles: KnowledgeArticle[], query: string): ScoredArticle[] {
  const terms = searchTerms(query);
  return articles
    .map((article, index) => ({ article, score: scoreArticle(article, terms), index }))
    .filter((r) => r.score > 0)
    .sort((x, y) => y.score - x.score || x.index - y.index)
    .map(({ article, score }) => ({ article, score }));
}

/* ---------------- facts ---------------- */

/** "At a glance" facts as [label, value] pairs (empty when the article has none). */
export function articleGlance(a: Pick<KnowledgeArticle, "body">): Array<[string, string]> {
  const section = splitArticleBody(a.body).find((s) => s.kind === "glance");
  return section ? parseGlance(section.markdown) : [];
}

/** The most urgent priority the article's "Typical priority" mentions (P0 beats P1 …), if any. */
export function articlePriority(a: Pick<KnowledgeArticle, "body">): Priority | null {
  const glance = articleGlance(a);
  const entry = glance.find(([label]) => /priority/i.test(label));
  if (!entry) return null;
  // Only the headline part ("P2 (P0 if …)" → P2): the parenthetical describes escalations.
  const headline = entry[1].split(/[(;]/)[0];
  const found = headline.match(/\bP[0-3]\b/g);
  if (!found?.length) return null;
  return [...found].sort()[0] as Priority;
}

/** Other articles that the article mentions, or that share linked templates, tags, the category or sub-category - best first. */
export function relatedArticles(a: KnowledgeArticle, all: KnowledgeArticle[], limit = 4): KnowledgeArticle[] {
  const templates = new Set(a.relatedTemplates ?? []);
  const tags = new Set(a.tags ?? []);
  const mentioned = new Set((`${a.body ?? ""}\n${a.steps.join("\n")}\n${a.escalation ?? ""}\n${a.prevention ?? ""}`).match(/\bKB-\d{3}\b/g) ?? []);
  const subcategory = (a.subcategory ?? "").trim();
  return all
    .filter((o) => o.id !== a.id)
    .map((o, index) => {
      let score = 0;
      if (mentioned.has(o.id)) score += 6;
      for (const c of o.relatedTemplates ?? []) if (templates.has(c)) score += 3;
      for (const t of o.tags ?? []) if (tags.has(t)) score += 1;
      if (o.category === a.category) {
        score += 2;
        // Guides in the same sub-category cover neighbouring situations.
        if (subcategory && (o.subcategory ?? "").trim() === subcategory) score += 2;
      }
      return { o, score, index };
    })
    .filter((r) => r.score >= 2)
    .sort((x, y) => y.score - x.score || x.index - y.index)
    .slice(0, limit)
    .map((r) => r.o);
}

/** Plain-text checklist of an article's steps (for copying into a ticket or chat). */
export function stepsAsText(a: Pick<KnowledgeArticle, "id" | "title" | "steps">): string {
  return [`${a.id} - ${a.title}`, "", ...a.steps.map((s, i) => `${i + 1}. ${s}`)].join("\n");
}

/* ---------------- cross-references ---------------- */

export type CodeKind = "template" | "article";
export type TextPiece = { text: string } | { code: string; kind: CodeKind };

const CODE_RE = /\b(TPL-\d{3}|KB-\d{3})\b/g;

export const codeKind = (code: string): CodeKind => (code.startsWith("TPL-") ? "template" : "article");

/** Split plain text into text and known TPL-/KB- code pieces (unknown codes stay text). */
export function splitCodes(text: string, isKnown: (code: string) => boolean): TextPiece[] {
  const pieces: TextPiece[] = [];
  let last = 0;
  for (const m of text.matchAll(CODE_RE)) {
    const code = m[1];
    if (!isKnown(code)) continue;
    const at = m.index ?? 0;
    if (at > last) pieces.push({ text: text.slice(last, at) });
    pieces.push({ code, kind: codeKind(code) });
    last = at + code.length;
  }
  if (last < text.length) pieces.push({ text: text.slice(last) });
  return pieces;
}

/**
 * Turn known codes in markdown into `[CODE](#CODE)` links the reader intercepts.
 * Existing links, autolinks and code spans are left alone.
 */
export function linkifyCodes(markdown: string, isKnown: (code: string) => boolean): string {
  const protectedRe = /(`[^`]*`|\[[^\]]*\]\([^)]*\)|<[^>]+>)/g;
  return markdown
    .split(protectedRe)
    .map((part, i) => (i % 2 === 1 ? part : part.replace(CODE_RE, (code) => (isKnown(code) ? `[${code}](#${code})` : code))))
    .join("");
}

/** `#TPL-034` / `#KB-005` hrefs produced by linkifyCodes → the code, else null. */
export function codeFromHref(href: string | undefined): string | null {
  const m = /^#(TPL-\d{3}|KB-\d{3})$/.exec(href ?? "");
  return m ? m[1] : null;
}

/* ---------------- section parsing ---------------- */

const nonEmptyLines = (md: string) => md.split("\n").map((l) => l.trim()).filter(Boolean);

/** "- item" lines → items; null when the section holds anything else. */
export function parseBulletList(markdown: string): string[] | null {
  const lines = nonEmptyLines(markdown);
  if (lines.length === 0) return null;
  const items: string[] = [];
  for (const line of lines) {
    const m = /^[-*+]\s+(.+)$/.exec(line);
    if (!m) return null;
    items.push(m[1].trim());
  }
  return items;
}

/** "- **What you see** - what to do" lines → pairs; null when the section holds anything else. */
export function parseDiagnose(markdown: string): Array<[string, string]> | null {
  const items = parseBulletList(markdown);
  if (!items) return null;
  const pairs: Array<[string, string]> = [];
  for (const item of items) {
    const m = /^\*\*(.+?)\*\*\s*[\u2014\u2013-]+\s*(.+)$/.exec(item);
    if (!m) return null;
    pairs.push([m[1].trim(), m[2].trim()]);
  }
  return pairs;
}

/** "> **Moment** - “words”" quotes → [moment, words]; null when the section holds anything else. */
export function parseScripts(markdown: string): Array<[string, string]> | null {
  const lines = nonEmptyLines(markdown);
  if (lines.length === 0) return null;
  const pairs: Array<[string, string]> = [];
  for (const line of lines) {
    const m = /^>\s*\*\*(.+?)\*\*\s*[\u2014\u2013-]+\s*[“"](.+)[”"]\s*$/.exec(line);
    if (!m) return null;
    pairs.push([m[1].trim(), m[2].trim()]);
  }
  return pairs;
}

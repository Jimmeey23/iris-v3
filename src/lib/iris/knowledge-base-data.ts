// IRIS Knowledge Base — the shipped articles.
//
// Articles are authored per area in ./knowledge-base/* with the `article()`
// helper (see ./knowledge-base/compose.ts), which turns a structured spec —
// triage, the full procedure, a symptom → action guide, scripts, do's and
// don'ts, close-out checks — into the fields Neon stores. Managers can still
// edit any article in the app; the server sync never overwrites their edits.

import type { KnowledgeArticle } from "./knowledge-base/compose";
import { MEMBER_EXPERIENCE_ARTICLES } from "./knowledge-base/member-experience";
import { FACILITIES_EQUIPMENT_ARTICLES } from "./knowledge-base/facilities-equipment";
import { MEMBERSHIPS_PAYMENTS_ARTICLES } from "./knowledge-base/memberships-payments";
import { SAFETY_SECURITY_ARTICLES } from "./knowledge-base/safety-security";
import { SYSTEMS_OPERATIONS_ARTICLES } from "./knowledge-base/systems-operations";

export type { KnowledgeArticle } from "./knowledge-base/compose";

const articleNumber = (id: string) => Number(/(\d+)$/.exec(id)?.[1] ?? 0);

/**
 * Live article list. On the client it is replaced in place by whatever Neon
 * returns (see library-api.ts), so treat it as the current library, not the
 * shipped defaults — use BUILTIN_KNOWLEDGE_ARTICLES for those.
 */
export const KNOWLEDGE_ARTICLES: KnowledgeArticle[] = [
  ...MEMBER_EXPERIENCE_ARTICLES,
  ...FACILITIES_EQUIPMENT_ARTICLES,
  ...MEMBERSHIPS_PAYMENTS_ARTICLES,
  ...SAFETY_SECURITY_ARTICLES,
  ...SYSTEMS_OPERATIONS_ARTICLES,
].sort((a, b) => articleNumber(a.id) - articleNumber(b.id));

/** Frozen copy of the shipped articles (KNOWLEDGE_ARTICLES is replaced in place by Neon data on the client). */
export const BUILTIN_KNOWLEDGE_ARTICLES: readonly KnowledgeArticle[] = Object.freeze(
  KNOWLEDGE_ARTICLES.map((a) =>
    Object.freeze({
      ...a,
      steps: [...a.steps],
      tags: a.tags ? [...a.tags] : undefined,
      relatedTemplates: a.relatedTemplates ? [...a.relatedTemplates] : undefined,
    }),
  ),
);

/** Live view of the categories in use (documents are editable, so this is a function). */
export function knowledgeCategories(): string[] {
  return Array.from(new Set(KNOWLEDGE_ARTICLES.map((a) => a.category))).sort();
}
export const KNOWLEDGE_CATEGORIES = knowledgeCategories();

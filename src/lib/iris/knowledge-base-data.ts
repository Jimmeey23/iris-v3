// IRIS Knowledge Base — the shipped articles.
//
// Articles are authored per area in ./knowledge-base/* with the `article()`
// helper (see ./knowledge-base/compose.ts), which turns a structured spec —
// triage, the full procedure, a symptom → action guide, scripts, do's and
// don'ts, close-out checks — into the fields Neon stores. Every article sits in
// a category and sub-category from ./knowledge-base/taxonomy.ts, which drives
// the Category → Sub-category → Guide drill-down. Managers can still edit any
// article in the app; the server sync never overwrites their edits.

import type { KnowledgeArticle } from "./knowledge-base/compose";
import { MEMBER_EXPERIENCE_ARTICLES } from "./knowledge-base/member-experience";
import { FACILITIES_EQUIPMENT_ARTICLES } from "./knowledge-base/facilities-equipment";
import { MEMBERSHIPS_PAYMENTS_ARTICLES } from "./knowledge-base/memberships-payments";
import { SAFETY_SECURITY_ARTICLES } from "./knowledge-base/safety-security";
import { SYSTEMS_OPERATIONS_ARTICLES } from "./knowledge-base/systems-operations";
import { PRICING_MEMBERSHIPS_GUIDES } from "./knowledge-base/pricing-memberships-guides";
import { SCHEDULING_GUIDES } from "./knowledge-base/scheduling-guides";
import { CLASS_EXPERIENCE_GUIDES } from "./knowledge-base/class-experience-guides";
import { TRAINER_FEEDBACK_GUIDES } from "./knowledge-base/trainer-feedback-guides";
import { CUSTOMER_SERVICE_GUIDES } from "./knowledge-base/customer-service-guides";
import { BRAND_GUIDES } from "./knowledge-base/brand-guides";
import { AMENITIES_GUIDES } from "./knowledge-base/amenities-guides";
import { REPAIR_MAINTENANCE_GUIDES } from "./knowledge-base/repair-maintenance-guides";
import { TECH_GUIDES } from "./knowledge-base/tech-guides";
import { OPERATING_SYSTEMS_GUIDES } from "./knowledge-base/operating-systems-guides";
import { SAFETY_GUIDES } from "./knowledge-base/safety-guides";
import { THEFT_LOST_GUIDES } from "./knowledge-base/theft-lost-guides";
import { INTERNAL_OPS_GUIDES } from "./knowledge-base/internal-ops-guides";

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
  // KB-051 onwards: one module per category.
  ...PRICING_MEMBERSHIPS_GUIDES,
  ...SCHEDULING_GUIDES,
  ...CLASS_EXPERIENCE_GUIDES,
  ...TRAINER_FEEDBACK_GUIDES,
  ...CUSTOMER_SERVICE_GUIDES,
  ...BRAND_GUIDES,
  ...AMENITIES_GUIDES,
  ...REPAIR_MAINTENANCE_GUIDES,
  ...TECH_GUIDES,
  ...OPERATING_SYSTEMS_GUIDES,
  ...SAFETY_GUIDES,
  ...THEFT_LOST_GUIDES,
  ...INTERNAL_OPS_GUIDES,
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

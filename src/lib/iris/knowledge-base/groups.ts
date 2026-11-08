// IRIS Knowledge Base - grouping behind the drill-down (Category → Sub-category →
// Guide). Pure helpers; safe for the client, the server and unit tests.

import type { Priority } from "../types";
import { BUILTIN_KNOWLEDGE_ARTICLES } from "../knowledge-base-data";
import type { KnowledgeArticle } from "./compose";
import { articlePriority } from "./reader";
import { KB_CATEGORY_ORDER, kbSubcategoryRank } from "./taxonomy";

/** Bucket for guides without a sub-category (e.g. created before sub-categories existed). */
export const KB_GENERAL_SUBCATEGORY = "General";
export const KB_UNCATEGORIZED = "Uncategorized";

const PRIORITIES: Priority[] = ["P0", "P1", "P2", "P3"];

export function articleCategory(a: Pick<KnowledgeArticle, "category">): string {
  return (a.category ?? "").trim() || KB_UNCATEGORIZED;
}

let builtinTaxonomy: Map<string, { category: string; subcategory?: string }> | null = null;

/**
 * The guide's sub-category: its own when set; otherwise the shipped guide's (when the
 * document still sits in the same category - e.g. rows synced before Neon stored
 * sub-categories); otherwise "General".
 */
export function articleSubcategory(
  a: Pick<KnowledgeArticle, "id" | "category" | "subcategory">,
  builtins: readonly KnowledgeArticle[] = BUILTIN_KNOWLEDGE_ARTICLES,
): string {
  const own = (a.subcategory ?? "").trim();
  if (own) return own;
  const map =
    builtins === BUILTIN_KNOWLEDGE_ARTICLES
      ? (builtinTaxonomy ??= new Map(builtins.map((b) => [b.id, { category: b.category, subcategory: b.subcategory }])))
      : new Map(builtins.map((b) => [b.id, { category: b.category, subcategory: b.subcategory }]));
  const shipped = map.get(a.id);
  if (shipped?.subcategory && shipped.category === articleCategory(a)) return shipped.subcategory;
  return KB_GENERAL_SUBCATEGORY;
}

/** The article with its category / sub-category resolved (same object when nothing changes). */
export function withResolvedTaxonomy<T extends KnowledgeArticle>(a: T): T {
  const category = articleCategory(a);
  const subcategory = articleSubcategory(a);
  return a.category === category && a.subcategory === subcategory ? a : { ...a, category, subcategory };
}

export interface KnowledgeSubcategoryGroup {
  category: string;
  subcategory: string;
  key: string;
  /** Most urgent first (P0 → P3, then unknown), then KB order. */
  articles: KnowledgeArticle[];
  count: number;
  priorityCounts: Record<Priority, number>;
  steps: number;
}

export interface KnowledgeCategoryGroup {
  category: string;
  subcategories: KnowledgeSubcategoryGroup[];
  count: number;
  subcategoryCount: number;
  priorityCounts: Record<Priority, number>;
  steps: number;
}

const emptyCounts = (): Record<Priority, number> => ({ P0: 0, P1: 0, P2: 0, P3: 0 });

/** Taxonomy order for built-in categories; any others alphabetically after them. */
export function compareKnowledgeCategories(a: string, b: string): number {
  const ia = KB_CATEGORY_ORDER.indexOf(a);
  const ib = KB_CATEGORY_ORDER.indexOf(b);
  if (ia !== -1 || ib !== -1) {
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  }
  return a.localeCompare(b);
}

/** Taxonomy order within a category, then other names alphabetically, "General" last. */
export function compareKnowledgeSubcategories(category: string, a: string, b: string): number {
  if (a === KB_GENERAL_SUBCATEGORY && b !== KB_GENERAL_SUBCATEGORY) return 1;
  if (b === KB_GENERAL_SUBCATEGORY && a !== KB_GENERAL_SUBCATEGORY) return -1;
  const ra = kbSubcategoryRank(category, a);
  const rb = kbSubcategoryRank(category, b);
  if (ra !== rb) return ra - rb;
  return a.localeCompare(b);
}

const urgency = (a: KnowledgeArticle) => {
  const p = articlePriority(a);
  return p ? PRIORITIES.indexOf(p) : PRIORITIES.length;
};
const kbNumber = (id: string) => Number(/(\d+)$/.exec(id)?.[1] ?? Number.MAX_SAFE_INTEGER);

/** Group guides by category and sub-category, in display order. */
export function groupKnowledgeArticles(articles: readonly KnowledgeArticle[]): KnowledgeCategoryGroup[] {
  const byCategory = new Map<string, Map<string, KnowledgeArticle[]>>();
  for (const a of articles) {
    const category = articleCategory(a);
    const subcategory = articleSubcategory(a);
    let subs = byCategory.get(category);
    if (!subs) byCategory.set(category, (subs = new Map()));
    const list = subs.get(subcategory);
    if (list) list.push(a);
    else subs.set(subcategory, [a]);
  }

  return [...byCategory.keys()].sort(compareKnowledgeCategories).map((category) => {
    const subs = byCategory.get(category)!;
    const subcategories = [...subs.keys()]
      .sort((x, y) => compareKnowledgeSubcategories(category, x, y))
      .map((subcategory): KnowledgeSubcategoryGroup => {
        const list = [...subs.get(subcategory)!].sort((x, y) => urgency(x) - urgency(y) || kbNumber(x.id) - kbNumber(y.id));
        const priorityCounts = emptyCounts();
        for (const a of list) {
          const p = articlePriority(a);
          if (p) priorityCounts[p] += 1;
        }
        return {
          category,
          subcategory,
          key: `${category}::${subcategory}`,
          articles: list,
          count: list.length,
          priorityCounts,
          steps: list.reduce((n, a) => n + a.steps.length, 0),
        };
      });
    const priorityCounts = emptyCounts();
    for (const s of subcategories) for (const p of PRIORITIES) priorityCounts[p] += s.priorityCounts[p];
    return {
      category,
      subcategories,
      count: subcategories.reduce((n, s) => n + s.count, 0),
      subcategoryCount: subcategories.length,
      priorityCounts,
      steps: subcategories.reduce((n, s) => n + s.steps, 0),
    };
  });
}

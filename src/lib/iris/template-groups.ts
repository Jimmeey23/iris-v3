import type { TicketTemplate } from "./templates";
import type { Priority } from "./types";

export const GENERAL_SUBCATEGORY = "General";

export interface TemplateSubcategoryGroup {
  category: string;
  subcategory: string;
  key: string;
  templates: TicketTemplate[];
  count: number;
  departments: string[];
  priorityCounts: Record<Priority, number>;
  avgResolutionHours: number;
}

export interface TemplateCategoryGroup {
  category: string;
  subcategories: TemplateSubcategoryGroup[];
  count: number;
  subcategoryCount: number;
  departments: string[];
  priorityCounts: Record<Priority, number>;
  avgResolutionHours: number;
}

/** Canonical operational ordering for built-in categories; unknown categories sort alphabetically after. */
const CANONICAL_CATEGORY_ORDER = [
  "Membership",
  "Payment",
  "Scheduling",
  "Client Experience",
  "Facilities",
  "IT",
  "Operations",
  "HR",
  "Marketing",
];

function emptyPriorityCounts(): Record<Priority, number> {
  return { P0: 0, P1: 0, P2: 0, P3: 0 };
}

export function normalizeTemplateCategory(category?: string | null): string {
  const trimmed = (category ?? "").trim();
  return trimmed || "Uncategorized";
}

export function normalizeTemplateSubcategory(subcategory?: string | null): string {
  const trimmed = (subcategory ?? "").trim();
  return trimmed || GENERAL_SUBCATEGORY;
}

/** Return distinct sorted categories with canonical categories first. */
export function sortTemplateCategories(categories: Iterable<string>): string[] {
  const unique = Array.from(new Set(Array.from(categories, (c) => normalizeTemplateCategory(c))));
  return unique.sort((a, b) => {
    const ia = CANONICAL_CATEGORY_ORDER.indexOf(a);
    const ib = CANONICAL_CATEGORY_ORDER.indexOf(b);
    if (ia !== -1 && ib !== -1) return ia - ib;
    if (ia !== -1) return -1;
    if (ib !== -1) return 1;
    return a.localeCompare(b);
  });
}

/** Extract distinct sorted subcategories available within an optional category filter. */
export function templateSubcategories(templates: TicketTemplate[], categoryFilter = "all"): string[] {
  const set = new Set<string>();
  for (const t of templates) {
    if (categoryFilter !== "all" && normalizeTemplateCategory(t.category) !== categoryFilter) continue;
    set.add(normalizeTemplateSubcategory(t.subcategory));
  }
  return Array.from(set).sort((a, b) => {
    if (a === GENERAL_SUBCATEGORY && b !== GENERAL_SUBCATEGORY) return 1;
    if (b === GENERAL_SUBCATEGORY && a !== GENERAL_SUBCATEGORY) return -1;
    return a.localeCompare(b);
  });
}

/**
 * Groups templates hierarchically into Category -> Sub-category -> Templates[],
 * computing per-group counts, priority distributions, department coverage, and average SLA hours.
 */
export function groupTemplatesByCategoryAndSubcategory(
  templates: TicketTemplate[],
): TemplateCategoryGroup[] {
  const byCategory = new Map<string, Map<string, TicketTemplate[]>>();

  for (const t of templates) {
    const cat = normalizeTemplateCategory(t.category);
    const sub = normalizeTemplateSubcategory(t.subcategory);
    let subMap = byCategory.get(cat);
    if (!subMap) {
      subMap = new Map<string, TicketTemplate[]>();
      byCategory.set(cat, subMap);
    }
    let list = subMap.get(sub);
    if (!list) {
      list = [];
      subMap.set(sub, list);
    }
    list.push(t);
  }

  const orderedCategories = sortTemplateCategories(byCategory.keys());

  return orderedCategories.map((category) => {
    const subMap = byCategory.get(category)!;
    const orderedSubNames = Array.from(subMap.keys()).sort((a, b) => {
      if (a === GENERAL_SUBCATEGORY && b !== GENERAL_SUBCATEGORY) return 1;
      if (b === GENERAL_SUBCATEGORY && a !== GENERAL_SUBCATEGORY) return -1;
      return a.localeCompare(b);
    });

    const catPriorities = emptyPriorityCounts();
    const catDepts = new Set<string>();
    let catHoursTotal = 0;
    let catCount = 0;

    const subcategories: TemplateSubcategoryGroup[] = orderedSubNames.map((subcategory) => {
      const items = [...subMap.get(subcategory)!].sort((a, b) => a.code.localeCompare(b.code));
      const priorityCounts = emptyPriorityCounts();
      const depts = new Set<string>();
      let hoursSum = 0;

      for (const item of items) {
        priorityCounts[item.defaultPriority] = (priorityCounts[item.defaultPriority] ?? 0) + 1;
        catPriorities[item.defaultPriority] = (catPriorities[item.defaultPriority] ?? 0) + 1;
        if (item.departmentCode) {
          depts.add(item.departmentCode);
          catDepts.add(item.departmentCode);
        }
        hoursSum += item.estimatedResolutionHours || 0;
        catHoursTotal += item.estimatedResolutionHours || 0;
        catCount += 1;
      }

      return {
        category,
        subcategory,
        key: `${category}::${subcategory}`,
        templates: items,
        count: items.length,
        departments: Array.from(depts).sort(),
        priorityCounts,
        avgResolutionHours: items.length ? Math.round(hoursSum / items.length) : 0,
      };
    });

    return {
      category,
      subcategories,
      count: catCount,
      subcategoryCount: subcategories.length,
      departments: Array.from(catDepts).sort(),
      priorityCounts: catPriorities,
      avgResolutionHours: catCount ? Math.round(catHoursTotal / catCount) : 0,
    };
  });
}

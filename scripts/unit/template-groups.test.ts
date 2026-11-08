import { describe, expect, it } from "bun:test";
import { TICKET_TEMPLATES } from "../../src/lib/iris/templates";
import {
  GENERAL_SUBCATEGORY,
  groupTemplatesByCategoryAndSubcategory,
  normalizeTemplateCategory,
  normalizeTemplateSubcategory,
  sortTemplateCategories,
  templateSubcategories,
} from "../../src/lib/iris/template-groups";

describe("Templates Category & Sub-category Grouping", () => {
  it("groups all 111+ built-in templates cleanly into Category -> Sub-category hierarchy without losing any item", () => {
    const groups = groupTemplatesByCategoryAndSubcategory(TICKET_TEMPLATES);
    expect(groups.length).toBeGreaterThanOrEqual(8);

    const totalFromGroups = groups.reduce((sum, g) => sum + g.count, 0);
    expect(totalFromGroups).toBe(TICKET_TEMPLATES.length);

    const totalFromSubgroups = groups.reduce(
      (sum, g) => sum + g.subcategories.reduce((s, sg) => s + sg.templates.length, 0),
      0,
    );
    expect(totalFromSubgroups).toBe(TICKET_TEMPLATES.length);

    for (const g of groups) {
      expect(g.category.length).toBeGreaterThan(0);
      expect(g.subcategories.length).toBeGreaterThanOrEqual(1);
      expect(g.subcategoryCount).toBe(g.subcategories.length);
      for (const sg of g.subcategories) {
        expect(sg.subcategory.length).toBeGreaterThan(0);
        expect(sg.count).toBe(sg.templates.length);
        for (const t of sg.templates) {
          expect(normalizeTemplateCategory(t.category)).toBe(g.category);
          expect(normalizeTemplateSubcategory(t.subcategory)).toBe(sg.subcategory);
        }
      }
    }
  });

  it("places blank sub-categories into General last and sorts named sub-categories alphabetically", () => {
    const sample = [
      { ...TICKET_TEMPLATES[0], id: "t1", category: "Custom Ops", subcategory: "Zebra Issue", defaultPriority: "P2" as const },
      { ...TICKET_TEMPLATES[0], id: "t2", category: "Custom Ops", subcategory: "", defaultPriority: "P1" as const },
      { ...TICKET_TEMPLATES[0], id: "t3", category: "Custom Ops", subcategory: "Alpha Issue", defaultPriority: "P0" as const },
    ];
    const groups = groupTemplatesByCategoryAndSubcategory(sample);
    expect(groups).toHaveLength(1);
    expect(groups[0].subcategories.map((s) => s.subcategory)).toEqual([
      "Alpha Issue",
      "Zebra Issue",
      GENERAL_SUBCATEGORY,
    ]);
    expect(groups[0].priorityCounts.P0).toBe(1);
    expect(groups[0].priorityCounts.P1).toBe(1);
    expect(groups[0].priorityCounts.P2).toBe(1);
  });

  it("returns distinct sub-categories for a selected category and canonical category order", () => {
    const firstCat = TICKET_TEMPLATES[0].category;
    const subs = templateSubcategories(TICKET_TEMPLATES, firstCat);
    expect(subs.length).toBeGreaterThanOrEqual(1);

    const sortedCats = sortTemplateCategories(["Zeta", "Facilities", "Membership"]);
    expect(sortedCats).toEqual(["Membership", "Facilities", "Zeta"]);
  });
});

import { describe, expect, it } from "bun:test";
import { renderToString } from "react-dom/server";
import { useAppStore, type TemplateNav } from "../../src/lib/iris/store";
import { TemplatesView } from "../../src/components/iris/views/templates";
import { BUILTIN_TEMPLATES } from "../../src/lib/iris/templates";
import { resolveTemplateForm } from "../../src/lib/iris/template-form";
import { TEMPLATE_TAXONOMY } from "../../src/lib/iris/template-taxonomy";

/** Render the Templates page at a given drill-down position. */
function renderAt(nav: Partial<TemplateNav>): string {
  const full: TemplateNav = { category: null, subcategory: null, templateCode: null, ...nav };
  useAppStore.setState({ templateNav: full });
  // Server rendering reads zustand's initial state snapshot, so position that too.
  (useAppStore.getInitialState() as { templateNav: TemplateNav }).templateNav = full;
  return renderToString(<TemplatesView />);
}

/** React's HTML escaping, for matching visible text in rendered markup. */
const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");
const codesIn = (html: string) => new Set([...html.matchAll(/>(TPL-(?:\d{3}|S[0-9A-Z]{7}))</g)].map((m) => m[1]));

describe("Templates page — 3-step drill-down", () => {
  it("step 1 shows only the categories, never a template list", () => {
    const html = renderAt({});
    expect(html).toContain("Choose a category");
    for (const c of TEMPLATE_TAXONOMY) expect(html).toContain(esc(c.label));
    expect(codesIn(html).size).toBe(0);
  });

  it("step 2 shows the chosen category's sub-categories and no templates", () => {
    for (const c of TEMPLATE_TAXONOMY) {
      const html = renderAt({ category: c.key });
      expect(html).toContain("Choose a sub-category");
      for (const s of c.subcategories) expect(html).toContain(esc(s.name));
      expect(codesIn(html).size).toBe(0);
    }
  });

  it("step 3 shows exactly the templates of the chosen category + sub-category", () => {
    for (const c of TEMPLATE_TAXONOMY) {
      for (const s of c.subcategories) {
        const html = renderAt({ category: c.key, subcategory: s.name });
        expect(html).toContain("Choose the template");
        const expected = BUILTIN_TEMPLATES.filter((t) => t.category === c.key && t.subcategory === s.name).map((t) => t.code);
        expect([...codesIn(html)].sort()).toEqual(expected.sort());
      }
    }
  });

  it("choosing a template opens its preset ticket builder with every scenario field", () => {
    for (const t of BUILTIN_TEMPLATES) {
      const html = renderAt({ templateCode: t.code });
      expect(html).toContain("Create ticket");
      expect(html).toContain(esc(t.title));
      for (const f of resolveTemplateForm(t).fields) expect(html).toContain(esc(f.label));
    }
  });
});

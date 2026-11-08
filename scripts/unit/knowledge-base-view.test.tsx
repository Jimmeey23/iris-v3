import { afterAll, describe, expect, it } from "bun:test";
import { renderToString } from "react-dom/server";
import { useAppStore, type CurrentUser, type KnowledgeNav } from "../../src/lib/iris/store";
import { KnowledgeBaseView } from "../../src/components/iris/views/knowledge-base";
import { KNOWLEDGE_ARTICLES } from "../../src/lib/iris/knowledge-base-data";
import { KB_TAXONOMY, kbCategoryLabel } from "../../src/lib/iris/knowledge-base/taxonomy";

const initial = useAppStore.getInitialState();
const original = { kbNav: initial.kbNav, kbArticleId: initial.kbArticleId, currentUser: initial.currentUser };

/** Render the Knowledge Base page at a given drill-down position, as a given user tier. */
function renderAt({
  nav = {},
  articleId = null,
  tier = "executive",
}: { nav?: Partial<KnowledgeNav>; articleId?: string | null; tier?: CurrentUser["tier"] } = {}): string {
  const state = {
    kbNav: { category: null, subcategory: null, ...nav },
    kbArticleId: articleId,
    currentUser: { ...original.currentUser, tier },
  };
  useAppStore.setState(state);
  // Server rendering reads zustand's initial state snapshot, so position that too.
  Object.assign(useAppStore.getInitialState(), state);
  // React separates adjacent text nodes with <!-- --> in server markup; drop them for matching.
  return renderToString(<KnowledgeBaseView />).replace(/<!-- -->/g, "");
}

afterAll(() => {
  useAppStore.setState(original);
  Object.assign(useAppStore.getInitialState(), original);
});

/** React's HTML escaping, for matching visible text in rendered markup. */
const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");
const idsIn = (html: string) => new Set([...html.matchAll(/>(KB-\d{3})</g)].map((m) => m[1]));
/** Text of the stepper button marked as the current step. */
const currentStep = (html: string) => {
  const m = /aria-current="step"[^>]*>([\s\S]*?)<\/button>/.exec(html);
  return m ? m[1].replace(/<[^>]+>/g, "") : null;
};
const subcategoryTotal = KB_TAXONOMY.reduce((n, c) => n + c.subcategories.length, 0);

describe("Knowledge Base page — 3-step drill-down", () => {
  it("step 1 shows only the categories, never a guide list", () => {
    const html = renderAt();
    expect(html).toContain("Choose a category");
    expect(html).toContain(`${KNOWLEDGE_ARTICLES.length} guides · ${KB_TAXONOMY.length} categories · ${subcategoryTotal} sub-categories`);
    for (const c of KB_TAXONOMY) expect(html).toContain(esc(c.label));
    expect(idsIn(html).size).toBe(0);
    expect(html).toContain('aria-label="Knowledge base steps"');
    expect(html).toContain('aria-label="Search the knowledge base"');
    expect(currentStep(html)).toBe("1Category");
  });

  it("step 2 shows the chosen category's sub-categories and no guides", () => {
    for (const c of KB_TAXONOMY) {
      const html = renderAt({ nav: { category: c.key } });
      expect(html, c.key).toContain("Choose a sub-category");
      expect(html, c.key).toContain("All categories");
      for (const s of c.subcategories) expect(html, `${c.key} › ${s.name}`).toContain(esc(s.name));
      expect(idsIn(html).size, c.key).toBe(0);
      expect(currentStep(html), c.key).toBe("2Sub-category");
    }
  });

  it("step 3 shows exactly the guides of the chosen category + sub-category", () => {
    for (const c of KB_TAXONOMY) {
      for (const s of c.subcategories) {
        const where = `${c.key} › ${s.name}`;
        const html = renderAt({ nav: { category: c.key, subcategory: s.name } });
        expect(html, where).toContain("Choose the guide");
        expect(html, where).toContain(`${esc(c.label)} sub-categories`);
        const expected = KNOWLEDGE_ARTICLES.filter((a) => a.category === c.key && a.subcategory === s.name).map((a) => a.id);
        expect(expected.length, where).toBeGreaterThanOrEqual(2);
        expect([...idsIn(html)].sort(), where).toEqual(expected.sort());
        expect(currentStep(html), where).toBe("3Guide");
      }
    }
  });

  it(
    "opening any guide (from the list, search, a link or a deep link) shows its checklist, ticket forms and the way back",
    () => {
      for (const a of KNOWLEDGE_ARTICLES) {
        // The drill-down position is left at step 1, as with a deep link: the guide places itself.
        const html = renderAt({ articleId: a.id });
        expect(html, a.id).toContain(esc(a.title));
        expect(html, a.id).toContain(`Back to ${esc(a.subcategory ?? "")}`);
        expect(html, a.id).toContain(esc(kbCategoryLabel(a.category)));
        expect(html, a.id).toContain(`0/${a.steps.length} done`);
        expect(html, a.id).toContain("Raise a ticket");
        for (const code of a.relatedTemplates ?? []) expect(html, `${a.id} → ${code}`).toContain(`>${code}<`);
        expect(html, a.id).not.toContain("Choose a category");
        expect(currentStep(html), a.id).toBe("4Work through it");
      }
    },
    30_000,
  );

  it("an unknown or deleted guide offers a way back instead of a blank page", () => {
    const html = renderAt({ articleId: "KB-999" });
    expect(html).toContain("Guide KB-999 isn’t available");
    expect(html).toContain("Browse all categories");
  });

  it("only managers and admins get the add, edit, duplicate and delete controls", () => {
    const c = KB_TAXONOMY[0];
    const s = c.subcategories[0].name;
    const a = KNOWLEDGE_ARTICLES.find((x) => x.category === c.key && x.subcategory === s)!;
    for (const tier of ["manager", "admin"] as const) {
      expect(renderAt({ tier }), tier).toContain("New Article");
      expect(renderAt({ tier, nav: { category: c.key } }), tier).toContain(`New guide in ${esc(c.label)}`);
      expect(renderAt({ tier, nav: { category: c.key, subcategory: s } }), tier).toContain("New guide here");
      const reader = renderAt({ tier, articleId: a.id });
      for (const label of [">Edit<", ">Duplicate<", ">Delete<"]) expect(reader, `${tier} ${label}`).toContain(label);
    }
    const staffPages = [
      renderAt(),
      renderAt({ nav: { category: c.key } }),
      renderAt({ nav: { category: c.key, subcategory: s } }),
      renderAt({ articleId: a.id }),
    ].join("");
    for (const label of ["New Article", "New guide", ">Edit<", ">Duplicate<", ">Delete<"]) expect(staffPages, label).not.toContain(label);
  });

  it("shows managers an empty sub-category as a prompt to add its first guide", () => {
    const c = KB_TAXONOMY[0];
    const s = c.subcategories[0].name;
    const shipped = [...KNOWLEDGE_ARTICLES];
    // KNOWLEDGE_ARTICLES is the live list (replaced in place by Neon data), so emulate a library without that sub-category.
    KNOWLEDGE_ARTICLES.splice(0, KNOWLEDGE_ARTICLES.length, ...shipped.filter((a) => !(a.category === c.key && a.subcategory === s)));
    try {
      const html = renderAt({ tier: "manager", nav: { category: c.key } });
      expect(html).toContain("No guides yet - add the first one.");
      expect(html).toContain(esc(s));
      expect(renderAt({ nav: { category: c.key } })).not.toContain("No guides yet");
    } finally {
      KNOWLEDGE_ARTICLES.splice(0, KNOWLEDGE_ARTICLES.length, ...shipped);
    }
  });
});

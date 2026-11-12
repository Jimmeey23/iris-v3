import { describe, expect, it } from "bun:test";
import {
  BUILTIN_KNOWLEDGE_ARTICLES,
  KNOWLEDGE_ARTICLES,
  knowledgeCategories,
  type KnowledgeArticle,
} from "../../src/lib/iris/knowledge-base-data";
import {
  KB_SECTIONS,
  article,
  composeArticleBody,
  parseGlance,
  readingMinutes,
  splitArticleBody,
  type ArticleSpec,
} from "../../src/lib/iris/knowledge-base/compose";
import {
  articlePriority,
  codeFromHref,
  linkifyCodes,
  parseBulletList,
  parseDiagnose,
  parseScripts,
  relatedArticles,
  searchArticles,
  searchTerms,
  splitCodes,
  stepsAsText,
} from "../../src/lib/iris/knowledge-base/reader";
import {
  KB_CATEGORY_ORDER,
  KB_TAXONOMY,
  kbCategoryLabel,
  kbCategoryMeta,
  kbSubcategoryDescription,
  kbSubcategoryNames,
  kbSubcategoryRank,
} from "../../src/lib/iris/knowledge-base/taxonomy";
import {
  KB_GENERAL_SUBCATEGORY,
  KB_UNCATEGORIZED,
  articleSubcategory,
  groupKnowledgeArticles,
  withResolvedTaxonomy,
} from "../../src/lib/iris/knowledge-base/groups";
import { BUILTIN_TEMPLATES, TEMPLATE_MAP } from "../../src/lib/iris/templates";
import { CATEGORY_MAP } from "../../src/lib/iris/constants";

// Mirrors the limits enforced for knowledge documents in src/lib/server/library.ts
// (server-only, so it isn't imported here).
const LIMITS = { title: 200, category: 120, summary: 2000, body: 60000, steps: 60, step: 1500, tags: 30, tag: 40, text: 3000, related: 30 };

describe("Built-in knowledge base", () => {
  it("ships 160 articles with unique, sequential ids", () => {
    const ids = KNOWLEDGE_ARTICLES.map((a) => a.id);
    expect(ids.length).toBe(160);
    expect(new Set(ids).size).toBe(ids.length);
    ids.forEach((id, i) => expect(id).toBe(`KB-${String(i + 1).padStart(3, "0")}`));
  });

  it("keeps every article inside the server's document limits", () => {
    for (const a of KNOWLEDGE_ARTICLES) {
      const where = `${a.id}`;
      expect(a.title.length, where).toBeLessThanOrEqual(LIMITS.title);
      expect(a.category.length, where).toBeLessThanOrEqual(LIMITS.category);
      expect(a.summary.length, where).toBeLessThanOrEqual(LIMITS.summary);
      expect((a.body ?? "").length, where).toBeLessThanOrEqual(LIMITS.body);
      expect(a.steps.length, where).toBeLessThanOrEqual(LIMITS.steps);
      for (const s of a.steps) expect(s.length, where).toBeLessThanOrEqual(LIMITS.step);
      expect((a.tags ?? []).length, where).toBeLessThanOrEqual(LIMITS.tags);
      for (const t of a.tags ?? []) {
        expect(t.length, where).toBeLessThanOrEqual(LIMITS.tag);
        expect(t, where).toBe(t.toLowerCase());
      }
      expect((a.prevention ?? "").length, where).toBeLessThanOrEqual(LIMITS.text);
      expect((a.escalation ?? "").length, where).toBeLessThanOrEqual(LIMITS.text);
      expect((a.relatedTemplates ?? []).length, where).toBeLessThanOrEqual(LIMITS.related);
    }
  });

  it("gives every article an actionable procedure, triage, close-out, prevention and escalation", () => {
    for (const a of KNOWLEDGE_ARTICLES) {
      const where = `${a.id} ${a.title}`;
      expect(a.summary.trim().length, where).toBeGreaterThan(40);
      expect(a.steps.length, where).toBeGreaterThanOrEqual(6);
      for (const s of a.steps) expect(s.trim().length, where).toBeGreaterThan(10);
      const kinds = splitArticleBody(a.body).map((s) => s.kind);
      expect(kinds, where).toContain("glance");
      expect(kinds, where).toContain("firstFive");
      expect(kinds, where).toContain("closeOut");
      expect((a.prevention ?? "").trim().length, where).toBeGreaterThan(20);
      expect((a.escalation ?? "").trim().length, where).toBeGreaterThan(20);
    }
  });

  it("includes a symptom → action guide or scripts in most articles", () => {
    const withGuide = KNOWLEDGE_ARTICLES.filter((a) => splitArticleBody(a.body).some((s) => s.kind === "diagnose" || s.kind === "say"));
    expect(withGuide.length).toBe(KNOWLEDGE_ARTICLES.length);
  });

  it("states priority, owner and response targets for every article", () => {
    for (const a of KNOWLEDGE_ARTICLES) {
      const glance = splitArticleBody(a.body).find((s) => s.kind === "glance");
      const labels = parseGlance(glance?.markdown ?? "").map(([label]) => label);
      expect(labels, a.id).toEqual(["Typical priority", "Owner", "First response", "Target resolution"]);
    }
  });

  it("links every article to existing templates and uses known categories", () => {
    const categories = new Set(Object.keys(CATEGORY_MAP));
    for (const a of KNOWLEDGE_ARTICLES) {
      expect(categories.has(a.category), `${a.id} category ${a.category}`).toBe(true);
      expect((a.relatedTemplates ?? []).length, a.id).toBeGreaterThan(0);
      for (const code of a.relatedTemplates ?? []) expect(TEMPLATE_MAP[code], `${a.id} → ${code}`).toBeDefined();
      // Template and article codes mentioned in the text must exist too.
      const text = [a.body ?? "", ...a.steps, a.prevention ?? "", a.escalation ?? ""].join("\n");
      for (const code of text.match(/TPL-\d{3}/g) ?? []) expect(TEMPLATE_MAP[code], `${a.id} mentions ${code}`).toBeDefined();
      for (const id of text.match(/KB-\d{3}/g) ?? []) expect(KNOWLEDGE_ARTICLES.some((k) => k.id === id), `${a.id} mentions ${id}`).toBe(true);
    }
  });

  it("covers every template category with at least one guide", () => {
    // Guides are written per section of the hand-written library (libraryGroup "Membership › …");
    // generated sub-category templates (TPL-S…) have no section and aren't linked to guides.
    const section = (code: string) => TEMPLATE_MAP[code]?.libraryGroup?.split(" › ")[0];
    const linked = new Set(KNOWLEDGE_ARTICLES.flatMap((a) => (a.relatedTemplates ?? []).map(section)));
    const handWritten = BUILTIN_TEMPLATES.filter((t) => !t.code.startsWith("TPL-S"));
    for (const s of new Set(handWritten.map((t) => section(t.code)))) expect(linked.has(s), s).toBe(true);
  });

  it("avoids markdown the reader can't render (no GFM tables or task lists)", () => {
    for (const a of KNOWLEDGE_ARTICLES) {
      const body = a.body ?? "";
      expect(/^\s*\|.*\|\s*$/m.test(body), a.id).toBe(false);
      expect(/^\s*[-*]\s+\[[ xX]\]/m.test(body), a.id).toBe(false);
    }
  });

  it("freezes the shipped copy independently of the live list", () => {
    expect(Object.isFrozen(BUILTIN_KNOWLEDGE_ARTICLES)).toBe(true);
    expect(BUILTIN_KNOWLEDGE_ARTICLES.length).toBe(KNOWLEDGE_ARTICLES.length);
    const first = BUILTIN_KNOWLEDGE_ARTICLES[0];
    expect(Object.isFrozen(first)).toBe(true);
    expect(first.steps).not.toBe(KNOWLEDGE_ARTICLES[0].steps);
    expect(first.steps).toEqual(KNOWLEDGE_ARTICLES[0].steps);
  });

  it("lists categories in use, sorted", () => {
    const cats = knowledgeCategories();
    expect(cats).toEqual([...cats].sort());
    expect(new Set(cats)).toEqual(new Set(KNOWLEDGE_ARTICLES.map((a) => a.category)));
  });
});

describe("Article composer and reader", () => {
  const spec: ArticleSpec = {
    id: "KB-999",
    title: "Test article",
    category: "Scheduling",
    subcategory: "Schedule Changes & Cover",
    summary: "A test article.",
    glance: { priority: "P2", owner: "Front Desk", respond: "1 hour", resolve: "Same day" },
    firstFive: ["Check the thing."],
    steps: ["Do one.", "Do two."],
    diagnose: [["Light is red", "Reset it."]],
    say: [["At the desk", "Thanks for waiting."]],
    dos: ["Be kind."],
    donts: ["Don't guess."],
    closeOut: ["Log it."],
    prevention: "Check daily.",
    escalation: "Call the manager.",
    relatedTemplates: ["TPL-001"],
    tags: ["Test", "Example"],
    notes: "## Extra\nAnything else.",
  };

  it("composes the standard sections in order and lower-cases tags", () => {
    const a = article(spec);
    expect(a.tags).toEqual(["test", "example"]);
    expect(a.steps).toEqual(spec.steps);
    const sections = splitArticleBody(a.body);
    expect(sections.map((s) => s.kind)).toEqual(["glance", "firstFive", "diagnose", "say", "dos", "donts", "closeOut", null]);
    expect(sections.map((s) => s.heading)).toEqual([...Object.values(KB_SECTIONS), "Extra"]);
    expect(sections.find((s) => s.kind === "diagnose")?.markdown).toBe("- **Light is red** - Reset it.");
    expect(sections.find((s) => s.kind === "say")?.markdown).toBe("> **At the desk** - “Thanks for waiting.”");
  });

  it("omits optional sections that have no content", () => {
    const body = composeArticleBody({ ...spec, diagnose: undefined, say: [], dos: undefined, donts: undefined, notes: undefined });
    expect(splitArticleBody(body).map((s) => s.kind)).toEqual(["glance", "firstFive", "closeOut"]);
  });

  it("splits manager-written markdown, keeping an intro and unknown headings", () => {
    const sections = splitArticleBody("Intro line.\r\n\r\n## what to SAY\r\n> hi\r\n\r\n## If you see... do this ##\r\n- a\r\n## Custom\r\ntext");
    expect(sections).toEqual([
      { heading: "", kind: null, markdown: "Intro line." },
      { heading: "what to SAY", kind: "say", markdown: "> hi" },
      { heading: "If you see... do this", kind: "diagnose", markdown: "- a" },
      { heading: "Custom", kind: null, markdown: "text" },
    ]);
    expect(splitArticleBody(undefined)).toEqual([]);
    expect(splitArticleBody("   ")).toEqual([]);
  });

  it("parses the glance list in either bold style", () => {
    expect(parseGlance("- **Owner:** Front Desk\n* **Priority**: P1\nnot a pair\n- **Bad** ")).toEqual([
      ["Owner", "Front Desk"],
      ["Priority", "P1"],
    ]);
  });

  it("estimates reading time with a one-minute floor", () => {
    expect(readingMinutes({ summary: "short", steps: [] })).toBe(1);
    const long = Array.from({ length: 1000 }, () => "word").join(" ");
    expect(readingMinutes({ summary: long, steps: [] })).toBe(5);
  });
});

describe("Knowledge Base reader helpers", () => {
  const byId = (id: string) => KNOWLEDGE_ARTICLES.find((a) => a.id === id)!;
  const isKnown = (code: string) => (code.startsWith("TPL-") ? Boolean(TEMPLATE_MAP[code]) : KNOWLEDGE_ARTICLES.some((a) => a.id === code));

  it("ranks search results by where the terms match", () => {
    expect(searchArticles(KNOWLEDGE_ARTICLES, "AC red light")[0].article.id).toBe("KB-006");
    expect(searchArticles(KNOWLEDGE_ARTICLES, "chest pain")[0].article.id).toBe("KB-038");
    // an id finds that guide first, then the guides that point to it
    const byCode = searchArticles(KNOWLEDGE_ARTICLES, "kb-010");
    expect(byCode[0].article.id).toBe("KB-010");
    expect(byCode.length).toBeGreaterThan(1);
    for (const r of byCode.slice(1)) {
      expect(r.score, r.article.id).toBeLessThan(byCode[0].score);
      expect(JSON.stringify(r.article), r.article.id).toContain("KB-010");
    }
    // a form code finds every guide that links that form, in KB order
    const linkingTpl034 = KNOWLEDGE_ARTICLES.filter((a) => (a.relatedTemplates ?? []).includes("TPL-034")).map((a) => a.id);
    expect(linkingTpl034).toContain("KB-005");
    expect(linkingTpl034).toContain("KB-013");
    expect(searchArticles(KNOWLEDGE_ARTICLES, "TPL-034").map((r) => r.article.id)).toEqual(linkingTpl034);
    // sub-category names are searchable
    expect(searchArticles(KNOWLEDGE_ARTICLES, "valet").slice(0, 3).every((r) => r.article.subcategory === "Valet & Parking")).toBe(true);
    // every term must match somewhere
    expect(searchArticles(KNOWLEDGE_ARTICLES, "pedal xyzzy")).toEqual([]);
    // short terms match whole words only ("ac" must not hit "feedback")
    expect(searchArticles(KNOWLEDGE_ARTICLES, "ac").some((r) => r.article.id === "KB-001")).toBe(false);
    // regex characters are safe
    expect(() => searchArticles(KNOWLEDGE_ARTICLES, "( [ *")).not.toThrow();
    // empty query keeps KB order
    expect(searchArticles(KNOWLEDGE_ARTICLES, "  ").map((r) => r.article.id)).toEqual(KNOWLEDGE_ARTICLES.map((a) => a.id));
    expect(searchTerms(" “Wi-Fi”  Down ")).toEqual(["wi-fi", "down"]);
  });

  it("reads the typical priority from the headline, not the escalation clause", () => {
    expect(articlePriority(byId("KB-005"))).toBe("P2"); // "P2 (P0 if …)"
    expect(articlePriority(byId("KB-009"))).toBe("P0");
    expect(articlePriority(byId("KB-010"))).toBe("P1"); // "P1 for safety faults …; P2 for …"
    expect(articlePriority({ body: "" })).toBeNull();
    expect(articlePriority({ body: "## At a glance\n- **Owner:** Desk" })).toBeNull();
    for (const a of KNOWLEDGE_ARTICLES) expect(articlePriority(a), a.id).not.toBeNull();
  });

  it("suggests related guides, preferring explicit mentions, shared templates and the same sub-category", () => {
    const power = byId("KB-034");
    const related = relatedArticles(power, KNOWLEDGE_ARTICLES).map((a) => a.id);
    expect(related).toContain("KB-009"); // KB-034 points to KB-009 for fire risk
    expect(byId(related[0]).subcategory).toBe(power.subcategory); // a neighbour sharing its ticket forms
    expect(related).not.toContain("KB-034");
    expect(related.length).toBeLessThanOrEqual(4);
    expect(relatedArticles(byId("KB-007"), KNOWLEDGE_ARTICLES)).toContainEqual(byId("KB-025"));

    // the sub-category only counts inside the same category
    const guide = (id: string, category: string, subcategory: string): KnowledgeArticle => ({ id, title: id, category, subcategory, summary: "s", steps: ["a"], body: "" });
    const me = guide("KB-901", "Scheduling", "Waitlists");
    const pool = [guide("KB-903", "Scheduling", "Other"), guide("KB-904", "Brand Feedback", "Waitlists"), guide("KB-902", "Scheduling", "Waitlists"), me];
    expect(relatedArticles(me, pool).map((a) => a.id)).toEqual(["KB-902", "KB-903"]);
  });

  it("links known template and article codes in text and markdown", () => {
    expect(splitCodes("See KB-009, then raise TPL-034 or TPL-999.", isKnown)).toEqual([
      { text: "See " },
      { code: "KB-009", kind: "article" },
      { text: ", then raise " },
      { code: "TPL-034", kind: "template" },
      { text: " or TPL-999." },
    ]);
    expect(splitCodes("no codes here", isKnown)).toEqual([{ text: "no codes here" }]);
    expect(linkifyCodes("Raise TPL-034 (see KB-009).", isKnown)).toBe("Raise [TPL-034](#TPL-034) (see [KB-009](#KB-009)).");
    // existing links, code spans and unknown codes are untouched
    expect(linkifyCodes("[TPL-034](https://x.y/TPL-034) `KB-009` TPL-999", isKnown)).toBe("[TPL-034](https://x.y/TPL-034) `KB-009` TPL-999");
    expect(codeFromHref("#TPL-034")).toBe("TPL-034");
    expect(codeFromHref("#KB-009")).toBe("KB-009");
    expect(codeFromHref("https://example.com/#TPL-034")).toBeNull();
    expect(codeFromHref(undefined)).toBeNull();
  });

  it("parses authored sections and refuses free-form markdown", () => {
    expect(parseBulletList("- one\n\n* two")).toEqual(["one", "two"]);
    expect(parseBulletList("- one\nplain line")).toBeNull();
    expect(parseBulletList("")).toBeNull();
    expect(parseDiagnose("- **Red light** — Reset once.\n- **Smell** – Evacuate.")).toEqual([
      ["Red light", "Reset once."],
      ["Smell", "Evacuate."],
    ]);
    expect(parseDiagnose("- no bold here")).toBeNull();
    expect(parseScripts("> **At the desk** — “Thanks for waiting.”\n\n> **Phone** — \"Hello\"")).toEqual([
      ["At the desk", "Thanks for waiting."],
      ["Phone", "Hello"],
    ]);
    expect(parseScripts("> just a quote")).toBeNull();
    // every shipped article's structured sections parse cleanly
    for (const a of KNOWLEDGE_ARTICLES) {
      for (const s of splitArticleBody(a.body)) {
        if (s.kind === "diagnose") expect(parseDiagnose(s.markdown), a.id).not.toBeNull();
        if (s.kind === "say") expect(parseScripts(s.markdown), a.id).not.toBeNull();
        if (s.kind === "firstFive" || s.kind === "dos" || s.kind === "donts" || s.kind === "closeOut") expect(parseBulletList(s.markdown), a.id).not.toBeNull();
      }
    }
  });

  it("formats steps as a numbered checklist", () => {
    expect(stepsAsText({ id: "KB-1", title: "T", steps: ["a", "b"] })).toBe("KB-1 - T\n\n1. a\n2. b");
  });
});

describe("Knowledge Base taxonomy (Category → Sub-category → Guide)", () => {
  it("defines each category once, keyed by a ticket category, with described sub-categories", () => {
    const keys = KB_TAXONOMY.map((c) => c.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(KB_CATEGORY_ORDER).toEqual(keys);
    for (const c of KB_TAXONOMY) {
      expect(Object.keys(CATEGORY_MAP), c.key).toContain(c.key);
      expect(c.label.trim().length, c.key).toBeGreaterThan(0);
      expect(c.tagline.trim().length, c.key).toBeGreaterThan(0);
      expect(c.subcategories.length, c.key).toBeGreaterThanOrEqual(2);
      const names = c.subcategories.map((s) => s.name);
      expect(new Set(names).size, c.key).toBe(names.length);
      expect(names, c.key).not.toContain(KB_GENERAL_SUBCATEGORY);
      for (const s of c.subcategories) {
        expect(s.name.length, s.name).toBeLessThanOrEqual(LIMITS.category);
        expect(s.description.trim().length, s.name).toBeGreaterThan(10);
      }
    }
  });

  it("files every shipped guide under a known category and one of its sub-categories", () => {
    for (const a of KNOWLEDGE_ARTICLES) {
      expect(kbCategoryMeta(a.category), `${a.id} ${a.category}`).toBeDefined();
      expect(kbSubcategoryNames(a.category), `${a.id} ${a.subcategory}`).toContain(a.subcategory ?? "");
    }
  });

  it("gives every sub-category at least two guides, so no step-3 list is a dead end", () => {
    for (const c of KB_TAXONOMY) {
      for (const s of c.subcategories) {
        const n = KNOWLEDGE_ARTICLES.filter((a) => a.category === c.key && a.subcategory === s.name).length;
        expect(n, `${c.key} › ${s.name}`).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it("maps labels, order and descriptions, falling back for custom categories", () => {
    expect(kbCategoryLabel("Pricing and Memberships")).toBe("Pricing & Memberships");
    expect(kbCategoryLabel("Custom Thing")).toBe("Custom Thing");
    expect(kbSubcategoryNames("Custom Thing")).toEqual([]);
    const first = KB_TAXONOMY[0];
    expect(kbSubcategoryRank(first.key, first.subcategories[1].name)).toBe(1);
    expect(kbSubcategoryRank(first.key, "Nope")).toBe(Number.MAX_SAFE_INTEGER);
    expect(kbSubcategoryDescription(first.key, first.subcategories[0].name)).toBe(first.subcategories[0].description);
    expect(kbSubcategoryDescription("Custom Thing", "Nope")).toBeUndefined();
  });
});

describe("Knowledge Base drill-down groups", () => {
  const groups = groupKnowledgeArticles(KNOWLEDGE_ARTICLES);
  const byId = (id: string) => KNOWLEDGE_ARTICLES.find((a) => a.id === id)!;
  const guide = (id: string, category: string, subcategory?: string): KnowledgeArticle => ({ id, title: id, category, subcategory, summary: "s", steps: ["a"], body: "" });

  it("groups every guide exactly once, in taxonomy order, with matching counts", () => {
    expect(groups.map((g) => g.category)).toEqual(KB_CATEGORY_ORDER);
    expect(groups.reduce((n, g) => n + g.count, 0)).toBe(KNOWLEDGE_ARTICLES.length);
    const seen = groups.flatMap((g) => g.subcategories.flatMap((s) => s.articles.map((a) => a.id)));
    expect([...seen].sort()).toEqual(KNOWLEDGE_ARTICLES.map((a) => a.id));
    for (const g of groups) {
      expect(g.subcategories.map((s) => s.subcategory), g.category).toEqual(kbSubcategoryNames(g.category));
      expect(g.subcategoryCount).toBe(g.subcategories.length);
      for (const s of g.subcategories) {
        expect(s.key).toBe(`${g.category}::${s.subcategory}`);
        expect(s.count).toBe(s.articles.length);
        expect(s.steps).toBe(s.articles.reduce((n, a) => n + a.steps.length, 0));
        expect(Object.values(s.priorityCounts).reduce((n, v) => n + v, 0), s.key).toBe(s.count);
      }
    }
  });

  it("lists the most urgent guides first, then in KB order", () => {
    const rank = (a: KnowledgeArticle) => {
      const p = articlePriority(a);
      return p ? ["P0", "P1", "P2", "P3"].indexOf(p) : 4;
    };
    const num = (a: KnowledgeArticle) => Number(a.id.slice(3));
    for (const g of groups) {
      for (const s of g.subcategories) {
        for (let i = 1; i < s.articles.length; i++) {
          const prev = s.articles[i - 1];
          const next = s.articles[i];
          expect(rank(prev) - rank(next) || num(prev) - num(next), `${s.key}: ${prev.id} before ${next.id}`).toBeLessThan(0);
        }
      }
    }
  });

  it("files guides without a sub-category under the shipped one, otherwise General", () => {
    const shipped = byId("KB-010");
    // e.g. synced to Neon before it stored sub-categories
    expect(articleSubcategory({ ...shipped, subcategory: undefined })).toBe(shipped.subcategory!);
    expect(articleSubcategory({ ...shipped, subcategory: "  " })).toBe(shipped.subcategory!);
    // moved to another category by a manager: the shipped sub-category no longer applies
    expect(articleSubcategory({ ...shipped, subcategory: undefined, category: "Scheduling" })).toBe(KB_GENERAL_SUBCATEGORY);
    expect(articleSubcategory({ id: "KB-900", category: "Scheduling" })).toBe(KB_GENERAL_SUBCATEGORY);
    expect(articleSubcategory({ ...shipped, subcategory: " Custom " })).toBe("Custom");

    expect(withResolvedTaxonomy(shipped)).toBe(shipped);
    expect(withResolvedTaxonomy<KnowledgeArticle>({ ...shipped, subcategory: undefined }).subcategory).toBe(shipped.subcategory);
    expect(withResolvedTaxonomy({ ...shipped, category: " " }).category).toBe(KB_UNCATEGORIZED);
  });

  it("puts custom categories after the taxonomy and General last within a category", () => {
    const mixed = groupKnowledgeArticles([
      guide("KB-903", "Zeta Custom"),
      guide("KB-902", "Alpha Custom", "Beta"),
      guide("KB-901", "Scheduling"),
      guide("KB-904", "Scheduling", "Aardvark"),
      ...KNOWLEDGE_ARTICLES.filter((a) => a.category === "Scheduling"),
    ]);
    expect(mixed.map((g) => g.category)).toEqual(["Scheduling", "Alpha Custom", "Zeta Custom"]);
    expect(mixed[0].subcategories.map((s) => s.subcategory)).toEqual([...kbSubcategoryNames("Scheduling"), "Aardvark", KB_GENERAL_SUBCATEGORY]);
    expect(mixed[2].subcategories.map((s) => s.subcategory)).toEqual([KB_GENERAL_SUBCATEGORY]);
    expect(groupKnowledgeArticles([])).toEqual([]);
  });
});

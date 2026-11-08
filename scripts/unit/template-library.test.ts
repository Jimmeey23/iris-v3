import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { BUILTIN_TEMPLATES, BUILTIN_TEMPLATE_CODES, TEMPLATE_MAP, TICKET_TEMPLATES } from "../../src/lib/iris/templates";
import { TEMPLATE_CATEGORY_ORDER, TEMPLATE_TAXONOMY } from "../../src/lib/iris/template-taxonomy";
import { REQUESTED_OUTCOMES } from "../../src/lib/iris/template-types";
import { CATEGORY_MAP, OCCURRED_OPTIONS, REPORTED_BY_OPTIONS, SYSTEMS } from "../../src/lib/iris/constants";
import { DEPARTMENTS } from "../../src/lib/iris/types";
import { KNOWLEDGE_ARTICLES } from "../../src/lib/iris/knowledge-base-data";

// Mirrors the server-side limits enforced by cleanForm()/templateColumns() in
// src/lib/server/library.ts (that module is server-only, so it isn't imported).
const FIELD_ID = /^[A-Za-z][A-Za-z0-9_]*$/;
const FIELD_TYPES = new Set(["text", "textarea", "number", "select", "multiselect", "checkbox", "date"]);
const DEPT_CODES = new Set(DEPARTMENTS.map((d) => d.code));
const ROOT = join(import.meta.dir, "..", "..");

describe("Built-in template library", () => {
  it("ships the original 111 templates plus at least 100 new ones, with unique sequential codes", () => {
    expect(BUILTIN_TEMPLATES.length).toBeGreaterThanOrEqual(211);
    const codes = BUILTIN_TEMPLATES.map((t) => t.code);
    expect(new Set(codes).size).toBe(codes.length);
    codes.forEach((code, i) => {
      expect(code).toMatch(/^TPL-\d{3}$/);
      expect(Number(code.slice(4))).toBe(i + 1);
    });
    for (let n = 1; n <= 111; n++) expect(BUILTIN_TEMPLATE_CODES.has(`TPL-${String(n).padStart(3, "0")}`)).toBe(true);
  });

  it("starts the live list and lookup map from the built-in catalogue", () => {
    expect(TICKET_TEMPLATES.map((t) => t.code)).toEqual(BUILTIN_TEMPLATES.map((t) => t.code));
    for (const t of BUILTIN_TEMPLATES) expect(TEMPLATE_MAP[t.code]).toBe(t);
  });

  it("has no duplicate template titles", () => {
    const titles = BUILTIN_TEMPLATES.map((t) => t.title.trim().toLowerCase());
    const dupes = titles.filter((t, i) => titles.indexOf(t) !== i);
    expect(dupes).toEqual([]);
  });

  it("files every template under a known Category -> Sub-category, and every sub-category offers a choice", () => {
    for (const t of BUILTIN_TEMPLATES) {
      expect(TEMPLATE_CATEGORY_ORDER).toContain(t.category);
      const meta = TEMPLATE_TAXONOMY.find((c) => c.key === t.category)!;
      expect(meta.subcategories.map((s) => s.name)).toContain(t.subcategory!);
    }
    for (const cat of TEMPLATE_TAXONOMY) {
      const inCat = BUILTIN_TEMPLATES.filter((t) => t.category === cat.key);
      expect(inCat.length).toBeGreaterThanOrEqual(10);
      expect(DEPT_CODES.has(cat.defaultDept)).toBe(true);
      for (const sub of cat.subcategories) {
        const n = inCat.filter((t) => t.subcategory === sub.name).length;
        if (n < 2) throw new Error(`${cat.key} › ${sub.name} has ${n} template(s)`);
      }
    }
  });

  it("gives every template valid routing metadata within the stored column limits", () => {
    for (const t of BUILTIN_TEMPLATES) {
      const where = `${t.code} ${t.title}`;
      if (!DEPT_CODES.has(t.departmentCode)) throw new Error(`${where}: unknown department ${t.departmentCode}`);
      expect(["P0", "P1", "P2", "P3"]).toContain(t.defaultPriority);
      expect(t.estimatedResolutionHours).toBeGreaterThanOrEqual(1);
      expect(t.estimatedResolutionHours).toBeLessThanOrEqual(2000);
      expect(t.title.length).toBeGreaterThan(0);
      expect(t.title.length).toBeLessThanOrEqual(200);
      expect(t.description.length).toBeGreaterThan(0);
      expect(t.description.length).toBeLessThanOrEqual(4000);
      expect((t.suggestedAssigneeRole ?? "").length).toBeGreaterThan(0);
      expect(t.recommendedActions.length).toBeLessThanOrEqual(6000);
      expect(t.recommendedActions.split("\n").length).toBeGreaterThanOrEqual(2);
    }
  });

  it("pre-fills a valid ticket taxonomy, timing, reporter, system and outcome", () => {
    for (const t of BUILTIN_TEMPLATES) {
      const where = `${t.code} ${t.title}`;
      const form = t.form;
      if (!form) throw new Error(`${where}: missing preset form`);
      const subs = CATEGORY_MAP[form.category ?? ""];
      if (!subs) throw new Error(`${where}: unknown ticket category "${form.category}"`);
      if (!subs.includes(form.subcategory ?? "")) throw new Error(`${where}: "${form.subcategory}" is not under "${form.category}"`);
      expect(OCCURRED_OPTIONS as readonly string[]).toContain(form.occurred!);
      expect(REPORTED_BY_OPTIONS as readonly string[]).toContain(form.reportedBy!);
      expect(REQUESTED_OUTCOMES as readonly string[]).toContain(form.requestedOutcome!);
      if (form.system !== undefined) expect(SYSTEMS as readonly string[]).toContain(form.system);
      for (const s of [form.titlePrefill, form.summaryPrefill]) {
        expect((s ?? "").length).toBeGreaterThan(0);
        expect((s ?? "").length).toBeLessThanOrEqual(600);
      }
      for (const list of [form.areaOptions, form.studioOptions]) {
        if (!list) continue;
        expect(list.length).toBeLessThanOrEqual(30);
        for (const a of list) expect(a.length).toBeLessThanOrEqual(120);
      }
    }
  });

  it("defines a typed scenario form for every template that survives server validation", () => {
    for (const t of BUILTIN_TEMPLATES) {
      const where = `${t.code} ${t.title}`;
      const fields = t.form!.fields;
      if (fields.length < 4 || fields.length > 10) throw new Error(`${where}: ${fields.length} fields`);
      expect(fields.some((f) => f.required)).toBe(true);
      const ids = fields.map((f) => f.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const f of fields) {
        const at = `${where} › ${f.id}`;
        if (!FIELD_ID.test(f.id) || f.id.length > 60) throw new Error(`${at}: bad field id`);
        expect(FIELD_TYPES.has(f.type)).toBe(true);
        expect(f.label.length).toBeGreaterThan(0);
        expect(f.label.length).toBeLessThanOrEqual(160);
        if (f.helper) expect(f.helper.length).toBeLessThanOrEqual(200);
        if (f.type === "select" || f.type === "multiselect") {
          const opts = f.options ?? [];
          if (opts.length < 1 || opts.length > 60) throw new Error(`${at}: ${opts.length} options`);
          expect(new Set(opts).size).toBe(opts.length);
          for (const o of opts) expect(o.length).toBeLessThanOrEqual(120);
          if (f.type === "select" && f.default !== undefined) expect(opts).toContain(f.default as string);
          if (f.type === "multiselect" && f.default !== undefined) {
            for (const d of f.default as string[]) expect(opts).toContain(d);
          }
        } else {
          expect(f.options).toBeUndefined();
        }
        if (f.type === "checkbox" && f.default !== undefined) expect(typeof f.default).toBe("boolean");
      }
      expect(t.requiredFields).toEqual(fields.filter((f) => f.required).map((f) => f.id));
    }
  });

  it("keeps every template code referenced elsewhere in the app resolvable", () => {
    const sources = ["src/lib/iris/conversation-engine.ts", "src/lib/iris/intelligence.ts", "src/lib/iris/ticket-detail-builder.ts"];
    for (const rel of sources) {
      const src = readFileSync(join(ROOT, rel), "utf8");
      for (const code of new Set(src.match(/TPL-\d{3}/g) ?? [])) {
        if (!BUILTIN_TEMPLATE_CODES.has(code)) throw new Error(`${rel} references missing ${code}`);
      }
    }
    for (const a of KNOWLEDGE_ARTICLES) {
      for (const code of a.relatedTemplates ?? []) {
        if (!BUILTIN_TEMPLATE_CODES.has(code)) throw new Error(`${a.id} links missing ${code}`);
      }
    }
  });

  it("keeps the scenario of codes the conversation engine routes to", () => {
    const expectTitle = (code: string, re: RegExp) => expect(TEMPLATE_MAP[code].title).toMatch(re);
    expectTitle("TPL-001", /froz|freez/i);
    expectTitle("TPL-005", /refund/i);
    expectTitle("TPL-021", /payment/i);
    expectTitle("TPL-033", /air conditioning/i);
    expectTitle("TPL-034", /sound/i);
    expectTitle("TPL-035", /equipment/i);
    expectTitle("TPL-036", /plumbing/i);
    expectTitle("TPL-040", /lighting/i);
    expectTitle("TPL-048", /momence/i);
    expectTitle("TPL-049", /network/i);
    expectTitle("TPL-065", /check in/i);
    expectTitle("TPL-076", /complaint/i);
  });
});

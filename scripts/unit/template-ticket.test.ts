import { describe, expect, it } from "bun:test";
import { BUILTIN_TEMPLATES, TEMPLATE_MAP, type TemplateField, type TicketTemplate } from "../../src/lib/iris/templates";
import {
  CATEGORY_FALLBACK,
  SUBCATEGORY_MAP,
  initialFieldValues,
  resolveTemplateForm,
  templateTaxonomy,
} from "../../src/lib/iris/template-form";
import { TEMPLATE_TAXONOMY } from "../../src/lib/iris/template-taxonomy";
import { CATEGORY_MAP } from "../../src/lib/iris/constants";
import {
  NOT_STUDIO_SPECIFIC,
  assembleTicketDescription,
  buildTicketPayload,
  completion,
  defaultTicketTitle,
  fieldLines,
  missingRequired,
  resolveTemplateDepartment,
  type FieldValues,
  type TemplateTicketContext,
  type TemplateTicketDraft,
} from "../../src/lib/iris/template-ticket";

function contextFor(t: TicketTemplate): TemplateTicketContext {
  const form = resolveTemplateForm(t);
  return { template: t, category: form.category, subcategory: form.subcategory, fields: form.fields };
}

function draftFor(t: TicketTemplate, values: FieldValues = {}): TemplateTicketDraft {
  const form = resolveTemplateForm(t);
  return {
    title: form.titlePrefill ?? t.title,
    summary: form.summaryPrefill ?? t.description,
    studio: "Kwality House, Kemps Corner",
    area: "",
    occurred: form.occurred ?? "",
    reportedBy: form.reportedBy ?? "",
    system: form.system ?? "",
    priority: t.defaultPriority,
    requestedOutcome: form.requestedOutcome ?? "",
    departmentCode: t.departmentCode,
    notes: "",
    values: { ...initialFieldValues(form.fields), ...values },
  };
}

/** A plausible answer for any field type. */
function sampleValue(f: TemplateField): string | boolean | string[] {
  switch (f.type) {
    case "select":
      return f.options![0];
    case "multiselect":
      return [f.options![0]];
    case "checkbox":
      return true;
    case "number":
      return "2";
    case "date":
      return "2026-11-08";
    default:
      return `Sample ${f.label}`;
  }
}

describe("Template → ticket taxonomy fallbacks", () => {
  it("maps every fallback and sub-category entry to a real CATEGORY_MAP pair", () => {
    for (const [key, [cat, sub]] of [...Object.entries(CATEGORY_FALLBACK), ...Object.entries(SUBCATEGORY_MAP)]) {
      if (!(CATEGORY_MAP[cat] ?? []).includes(sub)) throw new Error(`${key} -> ${cat} › ${sub} is not a valid pair`);
    }
  });

  it("covers every library category and sub-category", () => {
    for (const cat of TEMPLATE_TAXONOMY) {
      expect(CATEGORY_FALLBACK[cat.key]).toBeDefined();
      for (const sub of cat.subcategories) expect(SUBCATEGORY_MAP[`${cat.key}|${sub.name}`]).toBeDefined();
    }
  });

  it("resolves a form-less (user-created) template from its library sub-category", () => {
    const t: TicketTemplate = { ...TEMPLATE_MAP["TPL-001"], form: undefined, category: "Facilities", subcategory: "Electrical & Lighting" };
    expect(templateTaxonomy(t)).toEqual({ category: "Repair and Maintenance", subcategory: "Electrical & Power Issues" });
    const custom: TicketTemplate = { ...t, subcategory: "Something new" };
    expect(templateTaxonomy(custom)).toEqual({ category: "Repair and Maintenance", subcategory: "General Studio Repairs & Maintenance" });
  });
});

describe("Preset ticket builder payload", () => {
  const tpl = TEMPLATE_MAP["TPL-001"];
  const ctx = contextFor(tpl);

  it("personalises the default title with the member name", () => {
    expect(defaultTicketTitle("Membership Incorrectly Frozen", "Priya Shah")).toBe("Membership Incorrectly Frozen - Priya Shah");
    expect(defaultTicketTitle("Membership Incorrectly Frozen ", "  ")).toBe("Membership Incorrectly Frozen");
  });

  it("uses the template department when it exists, otherwise the category's queue", () => {
    const known = new Set(["MEM", "OPS", "TRN"]);
    const isKnown = (c: string) => known.has(c);
    expect(resolveTemplateDepartment("MEM", "Pricing and Memberships", isKnown)).toBe("MEM");
    expect(resolveTemplateDepartment("XYZ", "Repair and Maintenance", isKnown)).toBe("OPS");
    expect(resolveTemplateDepartment(undefined, "Trainer Feedback", isKnown)).toBe("TRN");
    expect(resolveTemplateDepartment("XYZ", "Brand Feedback", () => false)).toBe("");
  });

  it("blocks submission until the basics and required scenario fields are filled", () => {
    const empty = { ...draftFor(tpl), title: "", studio: "" };
    const missing = missingRequired(ctx, empty);
    expect(missing).toContain("Ticket title");
    expect(missing).toContain("Studio");
    for (const f of ctx.fields.filter((x) => x.required && x.type !== "checkbox")) expect(missing).toContain(f.label);
    const c = completion(ctx, empty);
    expect(c.total).toBe(3 + ctx.fields.filter((f) => f.required).length);
    expect(c.done).toBeLessThan(c.total);

    const filled = draftFor(tpl, Object.fromEntries(ctx.fields.map((f) => [f.id, sampleValue(f)])));
    expect(missingRequired(ctx, filled)).toEqual([]);
    expect(completion(ctx, filled)).toEqual({ done: c.total, total: c.total });
  });

  it("assembles a structured ticket the server accepts", () => {
    const values = Object.fromEntries(ctx.fields.map((f) => [f.id, sampleValue(f)]));
    values.memberName = "Priya Shah";
    const draft = { ...draftFor(tpl, values), title: defaultTicketTitle(tpl.title, "Priya Shah"), notes: "Called twice." };
    const body = buildTicketPayload(ctx, draft, { studioCode: "KH", idempotencyKey: "key-123456789" });

    expect(body.title).toBe("Membership Incorrectly Frozen - Priya Shah");
    expect(body.category).toBe(ctx.category);
    expect(body.subcategory).toBe(ctx.subcategory);
    expect(CATEGORY_MAP[body.category as string]).toContain(body.subcategory as string);
    expect(body.priority).toBe(tpl.defaultPriority);
    expect(body.severity).toBeTruthy();
    expect(body.studioCode).toBe("KH");
    expect(body.departmentCode).toBe(tpl.departmentCode);
    expect(body.departmentCodes).toEqual([tpl.departmentCode]);
    expect(body.affectedClient).toBe("Priya Shah");
    expect(body.source).toBe("form_intake");
    expect(body.tags).toEqual([ctx.category, ctx.subcategory, "TPL-001"]);
    expect(body.idempotencyKey).toBe("key-123456789");
    expect(String(body.recommendedResolution)).toContain(tpl.recommendedActions);

    const description = String(body.description);
    expect(description.startsWith(draft.summary)).toBe(true);
    expect(description).toContain("Template: TPL-001 · Membership Incorrectly Frozen");
    expect(description).toContain("Studio: Kwality House, Kemps Corner");
    expect(description).toContain("Member name: Priya Shah");
    expect(description).toContain("Notes: Called twice.");
    expect(description).toBe(assembleTicketDescription(ctx, draft));

    const info = body.collectedInfo as Record<string, unknown>;
    expect(info.templateCode).toBe("TPL-001");
    expect((info.templateFields as Record<string, string>)["Member name"]).toBe("Priya Shah");
    expect(info.templateValues).toEqual(draft.values);
  });

  it("never sends a studio code for tickets that aren't studio-specific", () => {
    const draft = { ...draftFor(tpl), studio: NOT_STUDIO_SPECIFIC };
    const body = buildTicketPayload(ctx, draft, { studioCode: "KH" });
    expect(body.studioCode).toBeUndefined();
    expect((body.collectedInfo as Record<string, unknown>).studio).toBeUndefined();
  });

  it("reports checkbox answers as Yes / No and skips unanswered fields", () => {
    const fields: TemplateField[] = [
      { id: "a", label: "Checked", type: "checkbox" },
      { id: "b", label: "Unchecked", type: "checkbox" },
      { id: "c", label: "Blank text", type: "text" },
      { id: "d", label: "Choices", type: "multiselect", options: ["x", "y"] },
      { id: "e", label: "What happened?", type: "select", options: ["Lost"] },
    ];
    expect(fieldLines(fields, { a: true, b: false, c: " ", d: ["x", "y"], e: "Lost" })).toEqual([
      ["Checked", "Yes"],
      ["Unchecked", "No"],
      ["Choices", "x, y"],
      ["What happened", "Lost"],
    ]);
  });

  it("builds a valid, submittable ticket from every built-in template", () => {
    for (const t of BUILTIN_TEMPLATES) {
      const c = contextFor(t);
      const draft = draftFor(t, Object.fromEntries(c.fields.filter((f) => f.required).map((f) => [f.id, sampleValue(f)])));
      const missing = missingRequired(c, draft);
      if (missing.length) throw new Error(`${t.code}: still missing ${missing.join(", ")}`);
      const body = buildTicketPayload(c, draft);
      expect((body.title as string).length).toBeGreaterThan(0);
      expect(CATEGORY_MAP[body.category as string]).toContain(body.subcategory as string);
      expect((body.tags as string[]).length).toBeLessThanOrEqual(20);
    }
  });
});

import { describe, expect, it } from "bun:test";
import { SPECS, fieldsFor, resolveSpec } from "../../src/lib/iris/intake-schema";

describe("resolveSpec", () => {
  it("matches exact keys", () => {
    expect(resolveSpec("Repair and Maintenance", "AC & Ventilation Repairs").source).toBe("exact");
  });

  it("treats & and 'and' and punctuation as equal", () => {
    const r = resolveSpec("Repair and Maintenance", "ac and ventilation repairs");
    expect(r.source).toBe("normalized");
    expect(r.matched).toBe("AC & Ventilation Repairs");
  });

  it("maps a renamed facilities subcategory by key word", () => {
    const r = resolveSpec("Repair and Maintenance", "AC and HVAC Issues");
    expect(r.source).toBe("keyword");
    expect(r.keys).toEqual(SPECS["AC & Ventilation Repairs"]);
  });

  it("keeps key words scoped to facilities categories", () => {
    expect(resolveSpec("Scheduling", "PowerCycle Waitlist Glitch").source).not.toBe("keyword");
  });

  it("uses AI-picked fields when nothing matches, always with studio and when", () => {
    const r = resolveSpec("Repair and Maintenance", "Mirror Crack", ["faultDetail", "usable"]);
    expect(r.source).toBe("ai");
    expect(r.keys).toEqual(["studio", "?area", "when", "faultDetail", "usable"]);
  });

  it("ignores AI fields once a spec matches", () => {
    expect(resolveSpec("Repair and Maintenance", "AC and HVAC Issues", ["faultDetail"]).source).toBe("keyword");
  });

  it("drops AI fields when the reporter changes category", () => {
    const aiFields = { category: "Repair and Maintenance", subcategory: "Mirror Crack", keys: ["faultDetail"] };
    const keys = (s: { category: string; subcategory: string }) => fieldsFor({ ...s, aiFields }).map((f) => f.key);
    expect(keys({ category: "Repair and Maintenance", subcategory: "Mirror Crack" })).toContain("faultDetail");
    expect(keys({ category: "Repair and Maintenance", subcategory: "Mirror Crack 2" })).toContain("equipmentItem");
  });
});

import { describe, expect, it } from "bun:test";
import { matchesRoutingCondition } from "../../src/lib/iris/routing-engine";
import { lintRoutingCondition } from "../../src/lib/iris/routing-lint";

describe("lintRoutingCondition", () => {
  it("accepts conditions the engine can evaluate", () => {
    expect(lintRoutingCondition("category=Facilities AND subcategory=HVAC")).toEqual([]);
    expect(lintRoutingCondition("studio.city=Bengaluru")).toEqual([]);
    expect(lintRoutingCondition("priority>=P1 OR tags~=vip")).toEqual([]);
    expect(lintRoutingCondition('category="Repair and Maintenance"')).toEqual([]);
  });

  it("flags unknown fields, which the engine reads as empty and never matches", () => {
    const problems = lintRoutingCondition("client.tier=VIP AND priority>=P1");
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("client.tier");
    // Confirms the lint reflects real engine behaviour.
    expect(matchesRoutingCondition("client.tier=VIP", { priority: "P0" })).toBe(false);
  });

  it("flags empty, malformed, bad-priority and text-range clauses", () => {
    expect(lintRoutingCondition("  ")).toHaveLength(1);
    expect(lintRoutingCondition("category Facilities")).toHaveLength(1);
    expect(lintRoutingCondition("priority>=Urgent")[0]).toContain("Urgent");
    expect(lintRoutingCondition("category>=Facilities")[0]).toContain("numbers");
  });
});

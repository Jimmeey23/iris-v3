import { describe, expect, it } from "bun:test";
import { addSlaMinutes, computeSlaTargets, parseBusinessWindow } from "../../src/lib/iris/sla-calculator";
import {
  evaluateRoutingRules,
  matchesRoutingCondition,
  selectBestAssignee,
  type AssignableEmployee,
  type RoutingRuleRow,
} from "../../src/lib/iris/routing-engine";

describe("Settings -> SLA Business Hours Calculator (IST)", () => {
  it("parses open windows and Closed days accurately", () => {
    expect(parseBusinessWindow("07:00-21:00")).toEqual({ openMin: 420, closeMin: 1260 });
    expect(parseBusinessWindow("Closed")).toBeNull();
    expect(parseBusinessWindow("21:00-07:00")).toBeNull();
  });

  it("rolls SLA target across closed evening hours and Closed Sundays in IST", () => {
    // Saturday 2026-11-07 14:00 UTC = Saturday 19:30 IST (30 mins before 20:00 IST Saturday close)
    const satEveningUtc = new Date("2026-11-07T14:00:00.000Z");
    const hours = {
      Mon: "07:00-21:00",
      Tue: "07:00-21:00",
      Wed: "07:00-21:00",
      Thu: "07:00-21:00",
      Fri: "07:00-21:00",
      Sat: "08:00-20:00",
      Sun: "Closed",
    };

    // 90 business minutes: 30m used Sat 19:30-20:00 IST, Sunday skipped, remaining 60m -> Monday 07:00-08:00 IST (02:30 UTC)
    const target = addSlaMinutes(satEveningUtc, 90, true, hours);
    expect(target.toISOString()).toBe("2026-11-09T02:30:00.000Z");

    // When businessHoursOnly = false, adds straight wall-clock minutes (15:30 UTC same day)
    const wallClock = addSlaMinutes(satEveningUtc, 90, false, hours);
    expect(wallClock.toISOString()).toBe("2026-11-07T15:30:00.000Z");
  });

  it("computes response and resolution targets together", () => {
    const start = new Date("2026-11-09T04:30:00.000Z"); // Monday 10:00 IST
    const out = computeSlaTargets({
      createdAt: start,
      responseTargetMins: 15,
      resolutionTargetMins: 120,
      businessHoursOnly: true,
    });
    expect(out.slaResponseTarget).toBe("2026-11-09T04:45:00.000Z");
    expect(out.slaResolutionTarget).toBe("2026-11-09T06:30:00.000Z");
  });
});

describe("Settings -> Conditional Routing Rules & Assignment Engine", () => {
  const rules: RoutingRuleRow[] = [
    {
      id: "r1",
      name: "Critical Mumbai HVAC",
      condition: "category=Repair and Maintenance AND studio.city=Mumbai AND subcategory~=AC",
      department_code: "FAC",
      priority: "Critical",
      sort_order: 1,
      is_active: true,
    },
    {
      id: "r2",
      name: "VIP Tag Escalation",
      condition: "tags~=vip OR priority>=P1",
      department_code: "MGT",
      priority: "P0",
      sort_order: 5,
      is_active: true,
    },
  ];

  it("evaluates multi-word categories, AND/OR conditions, tags, and priority comparisons", () => {
    expect(
      matchesRoutingCondition("category=Repair and Maintenance AND studio=KH", {
        category: "Repair and Maintenance",
        studioCode: "KH",
      }),
    ).toBe(true);

    const matched = evaluateRoutingRules(rules, {
      category: "Repair and Maintenance",
      subcategory: "AC & Ventilation Repairs",
      studioCode: "KH",
      studioCity: "Mumbai",
      priority: "P2",
    });
    expect(matched.matchedRule?.id).toBe("r1");
    expect(matched.departmentCode).toBe("FAC");
    expect(matched.priority).toBe("P0"); // "Critical" normalized to P0

    const vipMatched = evaluateRoutingRules(rules, {
      category: "Client Experience",
      priority: "P3",
      tags: ["vip-member", "renewal"],
    });
    expect(vipMatched.matchedRule?.id).toBe("r2");
    expect(vipMatched.departmentCode).toBe("MGT");
    expect(vipMatched.priority).toBe("P0");
  });

  it("honors autoAssign, studioAffinity, loadBalance, and roundRobinFallback flags", () => {
    const staff: AssignableEmployee[] = [
      {
        id: "emp_blr",
        department_code: "FAC",
        studio_codes: ["BLR"],
        availability: "available",
        workload: 1,
        max_workload: 10,
        escalation_order: 3,
        is_active: true,
      },
      {
        id: "emp_kh_heavy",
        department_code: "FAC",
        studio_codes: ["KH"],
        availability: "available",
        workload: 6,
        max_workload: 10,
        escalation_order: 3,
        is_active: true,
      },
      {
        id: "emp_kh_light",
        department_code: "FAC",
        studio_codes: ["KH"],
        availability: "available",
        workload: 2,
        max_workload: 10,
        escalation_order: 3,
        is_active: true,
      },
    ];

    // Studio affinity + load balancing picks KH specialist with lowest load (`emp_kh_light`)
    expect(
      selectBestAssignee(staff, {
        departmentCode: "FAC",
        studioCode: "KH",
        flags: {
          autoAssign: true,
          studioAffinity: true,
          loadBalance: true,
          roundRobinFallback: true,
          requireAcknowledgment: false,
        },
      }),
    ).toBe("emp_kh_light");

    // With studioAffinity OFF and loadBalance ON, `emp_blr` (workload 1/10) wins
    expect(
      selectBestAssignee(staff, {
        departmentCode: "FAC",
        studioCode: "KH",
        flags: {
          autoAssign: true,
          studioAffinity: false,
          loadBalance: true,
          roundRobinFallback: true,
          requireAcknowledgment: false,
        },
      }),
    ).toBe("emp_blr");

    // With autoAssign OFF, returns null
    expect(
      selectBestAssignee(staff, {
        departmentCode: "FAC",
        studioCode: "KH",
        flags: {
          autoAssign: false,
          studioAffinity: true,
          loadBalance: true,
          roundRobinFallback: true,
          requireAcknowledgment: false,
        },
      }),
    ).toBeNull();
  });
});

import { describe, expect, test } from "bun:test";
import { addSlaBusinessDays, computeSlaTargets } from "../../src/lib/iris/sla-calculator";

// Times are written in IST (+05:30). Default hours: Mon–Fri 07–21, Sat 08–20, Sun 08–18.
const ist = (s: string) => new Date(`${s}+05:30`);

describe("addSlaBusinessDays", () => {
  test("5 business days is 5 open days later, same time of day", () => {
    // Mon 23 Nov 2026 10:00 -> Sat 28 Nov 10:00 (every day is open)
    expect(addSlaBusinessDays(ist("2026-11-23T10:00:00"), 5).toISOString()).toBe(ist("2026-11-28T10:00:00").toISOString());
  });

  test("clamps to closing time on a shorter day", () => {
    // Sat 28 Nov 19:30 + 1 day -> Sun 29 Nov, which closes at 18:00
    expect(addSlaBusinessDays(ist("2026-11-28T19:30:00"), 1).toISOString()).toBe(ist("2026-11-29T18:00:00").toISOString());
  });

  test("a ticket raised after closing starts from the next opening", () => {
    // Mon 22:00 (closed) -> Tue 07:00 start -> +2 days = Thu 07:00
    expect(addSlaBusinessDays(ist("2026-11-23T22:00:00"), 2).toISOString()).toBe(ist("2026-11-26T07:00:00").toISOString());
  });

  test("closed days are skipped", () => {
    const hours = { Mon: "09:00-18:00", Tue: "09:00-18:00", Wed: "09:00-18:00", Thu: "09:00-18:00", Fri: "09:00-18:00", Sat: "Closed", Sun: "Closed" };
    // Fri 27 Nov 12:00 + 1 business day -> Mon 30 Nov 12:00
    expect(addSlaBusinessDays(ist("2026-11-27T12:00:00"), 1, hours).toISOString()).toBe(ist("2026-11-30T12:00:00").toISOString());
  });
});

describe("computeSlaTargets", () => {
  test("days win over minutes; minutes still used when days are unset", () => {
    const t = computeSlaTargets({
      createdAt: ist("2026-11-23T10:00:00"),
      responseTargetMins: 240,
      resolutionTargetMins: 99999,
      resolutionTargetDays: 2,
      businessHoursOnly: true,
    });
    expect(t.slaResponseTarget).toBe(ist("2026-11-23T14:00:00").toISOString());
    expect(t.slaResolutionTarget).toBe(ist("2026-11-25T10:00:00").toISOString());
  });
});

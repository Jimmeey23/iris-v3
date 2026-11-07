import { describe, expect, it } from "bun:test";
import { RULE_EVENT, statusEvent } from "../../src/lib/iris/notify-events";

describe("Notification status events", () => {
  it("maps the notifying stages", () => {
    expect(statusEvent("open", "in_progress")).toBe("status_in_progress");
    expect(statusEvent("in_progress", "awaiting_response")).toBe("status_awaiting_response");
    expect(statusEvent("in_progress", "resolved")).toBe("status_resolved");
    expect(statusEvent("resolved", "closed")).toBe("status_closed");
    expect(statusEvent("open", "escalated")).toBe("escalated");
  });

  it("detects a reopen from resolved or closed", () => {
    expect(statusEvent("resolved", "open")).toBe("status_reopened");
    expect(statusEvent("closed", "in_progress")).toBe("status_reopened");
    expect(statusEvent("closed", "open")).toBe("status_reopened");
  });

  it("ignores no-ops and non-notifying moves", () => {
    expect(statusEvent("open", "open")).toBe(null);
    expect(statusEvent(null, "open")).toBe(null);
    expect(statusEvent("open", "resolved")).toBe("status_resolved"); // direct resolve still notifies
    expect(statusEvent("in_progress", "open")).toBe(null); // a pull-back is not a reopen
  });

  it("every event has a notification_rules name (Settings > Notifications stays complete)", () => {
    const events = [
      "ticket_created",
      "ticket_assigned",
      "status_in_progress",
      "status_awaiting_response",
      "status_resolved",
      "status_closed",
      "status_reopened",
      "comment_added",
      "escalated",
      "sla_at_risk",
      "sla_breached",
    ] as const;
    expect(Object.keys(RULE_EVENT).sort()).toEqual([...events].sort());
    for (const name of Object.values(RULE_EVENT)) expect(typeof name).toBe("string");
  });
});

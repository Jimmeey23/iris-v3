import { describe, expect, it } from "bun:test";
import {
  OUTBOX_MAX_ATTEMPTS,
  OUTBOX_STUCK_MS,
  RATE_LIMITS,
  SLA_AT_RISK_FRACTION,
  SWEEP_WINDOWS,
  escalationDecision,
  escalationReason,
  idempotentReplayHeader,
  isSlaAtRisk,
  normalizeIdempotencyKey,
  outboxBackoffMs,
  outboxGivesUp,
  outboxIsStuck,
  rateLimitKey,
  rateWindow,
  sweepClaimKey,
  sweepDue,
} from "../../src/lib/iris/ops-policy";

const min = (n: number) => n * 60_000;

describe("Outbox backoff (ported from v2)", () => {
  it("doubles from 2 minutes and caps at 6 hours", () => {
    expect(outboxBackoffMs(1)).toBe(min(2));
    expect(outboxBackoffMs(2)).toBe(min(4));
    expect(outboxBackoffMs(3)).toBe(min(8));
    expect(outboxBackoffMs(4)).toBe(min(16));
    expect(outboxBackoffMs(5)).toBe(min(32));
    expect(outboxBackoffMs(6)).toBe(min(64));
    expect(outboxBackoffMs(7)).toBe(min(128));
    expect(outboxBackoffMs(9)).toBe(6 * 3_600_000); // capped at 6 h
    expect(outboxBackoffMs(0)).toBe(min(2)); // defensive floor
  });

  it("gives up exactly at the attempt cap, matching v2's six attempts", () => {
    expect(outboxGivesUp(OUTBOX_MAX_ATTEMPTS - 1)).toBe(false);
    expect(outboxGivesUp(OUTBOX_MAX_ATTEMPTS)).toBe(true);
    expect(outboxGivesUp(OUTBOX_MAX_ATTEMPTS + 5)).toBe(true);
    expect(OUTBOX_MAX_ATTEMPTS).toBe(6);
  });

  it("releases a 'sending' lease only after the stuck window", () => {
    const now = new Date("2026-11-08T10:00:00Z");
    expect(outboxIsStuck(new Date(now.getTime() - OUTBOX_STUCK_MS + 1_000), now)).toBe(false);
    expect(outboxIsStuck(new Date(now.getTime() - OUTBOX_STUCK_MS - 1_000), now)).toBe(true);
  });
});

describe("Sweep claims", () => {
  it("uses the same app_settings keys as v2", () => {
    expect(sweepClaimKey("outbox")).toBe("sweep:outbox");
    expect(sweepClaimKey("sla")).toBe("sweep:sla");
  });

  it("claims immediately without a previous run and inside the window otherwise", () => {
    const now = new Date("2026-11-08T10:00:00Z");
    expect(sweepDue(null, "outbox", now)).toBe(true);
    const fresh = new Date(now.getTime() - SWEEP_WINDOWS.outbox * 1000 + 5_000);
    expect(sweepDue(fresh.toISOString(), "outbox", now)).toBe(false);
    const stale = new Date(now.getTime() - SWEEP_WINDOWS.outbox * 1000 - 5_000);
    expect(sweepDue(stale.toISOString(), "outbox", now)).toBe(true);
  });
});

describe("SLA at-risk rule", () => {
  const base = {
    status: "open",
    slaStatus: "on_track",
    createdAt: "2026-11-08T00:00:00Z",
  };

  it("flags at 75% of the resolution window", () => {
    // 4h window, target 04:00; 03:00 is exactly 75%.
    const now = new Date("2026-11-08T03:00:00Z");
    expect(isSlaAtRisk({ ...base, slaResolutionTarget: "2026-11-08T04:00:00Z" }, now)).toBe(true);
    expect(isSlaAtRisk({ ...base, slaResolutionTarget: "2026-11-08T04:00:00Z" }, new Date("2026-11-08T02:59:00Z"))).toBe(false);
  });

  it("never flags resolved, closed, already-at-risk/breached or targetless tickets", () => {
    const now = new Date("2026-11-08T03:30:00Z");
    expect(isSlaAtRisk({ ...base, status: "resolved", slaResolutionTarget: "2026-11-08T04:00:00Z" }, now)).toBe(false);
    expect(isSlaAtRisk({ ...base, status: "closed", slaResolutionTarget: "2026-11-08T04:00:00Z" }, now)).toBe(false);
    expect(isSlaAtRisk({ ...base, slaStatus: "at_risk", slaResolutionTarget: "2026-11-08T04:00:00Z" }, now)).toBe(false);
    expect(isSlaAtRisk({ ...base, slaStatus: "breached", slaResolutionTarget: "2026-11-08T04:00:00Z" }, now)).toBe(false);
    expect(isSlaAtRisk({ ...base, slaStatus: "paused", slaResolutionTarget: "2026-11-08T04:00:00Z" }, now)).toBe(false);
    expect(isSlaAtRisk({ ...base, slaResolutionTarget: null }, now)).toBe(false);
  });

  it("keeps the 0.75 fraction in one place", () => {
    expect(SLA_AT_RISK_FRACTION).toBe(0.75);
  });
});

describe("Escalation decision (ported from v2's applyEscalations)", () => {
  const s = { afterBreachHours: 4, maxLevel: 3 };
  const now = new Date("2026-11-08T12:00:00Z");

  const ticket = (over: Partial<Parameters<typeof escalationDecision>[0]> = {}) => ({
    status: "open",
    slaStatus: "breached",
    slaResolutionTarget: "2026-11-08T04:00:00Z", // breached 8h ago
    escalationLevel: 0,
    ...over,
  });

  it("escalates level 1 after the breach window", () => {
    expect(escalationDecision(ticket(), s, now)).toEqual({ escalate: true, nextLevel: 1 });
  });

  it("spreads consecutive levels: level N needs afterHours x N past the target", () => {
    // 8h past: level 2 needs 8h -> due exactly now; level 3 needs 12h -> not yet.
    expect(escalationDecision(ticket({ escalationLevel: 1 }), s, now)).toEqual({ escalate: true, nextLevel: 2 });
    expect(escalationDecision(ticket({ escalationLevel: 2 }), s, now)).toEqual({ escalate: false, reason: "not-due" });
    const later = new Date("2026-11-08T16:00:00Z"); // 12h past
    expect(escalationDecision(ticket({ escalationLevel: 2 }), s, later)).toEqual({ escalate: true, nextLevel: 3 });
  });

  it("stops at the level cap and skips resolved/closed and unbreached tickets", () => {
    expect(escalationDecision(ticket({ escalationLevel: 3 }), s, now)).toEqual({ escalate: false, reason: "max-level" });
    expect(escalationDecision(ticket({ status: "resolved" }), s, now)).toEqual({ escalate: false, reason: "resolved" });
    expect(escalationDecision(ticket({ status: "closed" }), s, now)).toEqual({ escalate: false, reason: "resolved" });
    expect(escalationDecision(ticket({ slaStatus: "at_risk" }), s, now)).toEqual({ escalate: false, reason: "not-breached" });
    expect(escalationDecision(ticket({ slaResolutionTarget: null }), s, now)).toEqual({ escalate: false, reason: "no-target" });
  });

  it("writes a reason a human can read", () => {
    expect(escalationReason(2, 4)).toBe(
      "Automatic escalation level 2: SLA unresolved more than 4h past the resolution target.",
    );
  });
});

describe("Rate-limit windows", () => {
  it("every bucket is sane (positive, and tighter than a flood)", () => {
    for (const [bucket, limit] of Object.entries(RATE_LIMITS)) {
      expect(limit.max).toBeGreaterThan(0);
      expect(limit.windowSeconds).toBeGreaterThan(0);
      expect(Number.isFinite(limit.max)).toBe(true);
      void bucket;
    }
    // The AI budget is the expensive one — it must be tight.
    expect(RATE_LIMITS["ai-chat"].max).toBeLessThanOrEqual(30);
    expect(RATE_LIMITS.login.windowSeconds).toBeGreaterThanOrEqual(300);
  });

  it("counts within a window and resets when it expires", () => {
    const start = new Date("2026-11-08T10:00:00Z");
    const t29 = new Date(start.getTime() + 29_000);
    const t31 = new Date(start.getTime() + 31_000);

    let w = rateWindow(start, 30, 28, t29);
    expect(w.count).toBe(29);
    expect(w.windowStart).toEqual(start);
    expect(w.resetsInSec).toBe(1);

    w = rateWindow(start, 30, 999, t31); // window expired -> reset to 1
    expect(w.count).toBe(1);
    expect(w.windowStart).toEqual(t31);
  });

  it("handles a missing window row", () => {
    const now = new Date("2026-11-08T10:00:00Z");
    const w = rateWindow(null, 60, 0, now);
    expect(w.count).toBe(1);
    expect(w.windowStart).toEqual(now);
  });

  it("namespaces the counter key per bucket", () => {
    expect(rateLimitKey("login", "1.2.3.4|a@b.com")).toBe("login:1.2.3.4|a@b.com");
    expect(rateLimitKey("ai-chat", "uuid-1")).toBe("ai-chat:uuid-1");
  });
});

describe("Ticket idempotency keys", () => {
  it("accepts reasonable client-generated keys", () => {
    expect(normalizeIdempotencyKey("Ab3xk9Qp22Lmnn88ZZ41Dq")).toBe("Ab3xk9Qp22Lmnn88ZZ41Dq");
    expect(normalizeIdempotencyKey("  018f3c2e-9a7b-7c1d-8f2a-3b4c5d6e7f80  ")).toBe(
      "018f3c2e-9a7b-7c1d-8f2a-3b4c5d6e7f80",
    );
  });

  it("rejects absent, short, long and space-containing keys", () => {
    expect(normalizeIdempotencyKey(undefined)).toBe(null);
    expect(normalizeIdempotencyKey(42)).toBe(null);
    expect(normalizeIdempotencyKey("short")).toBe(null); // < 16 chars
    expect(normalizeIdempotencyKey("x".repeat(129))).toBe(null); // > 128
    expect(normalizeIdempotencyKey("has space inside the key value!!")).toBe(null);
    // 15 chars is still too short
    expect(normalizeIdempotencyKey("abcdefghijklmno")).toBe(null);
    expect(normalizeIdempotencyKey("abcdefghijklmnop")).toBe("abcdefghijklmnop");
  });

  it("echoes the replay through headers", () => {
    expect(idempotentReplayHeader("018f3c2e-9a7b")).toEqual({
      "Idempotency-Replayed": "true",
      "Idempotency-Key": "018f3c2e-9a7b",
    });
  });
});

import { describe, expect, it } from "bun:test";
import {
  htmlToText, inboundEvents, isStaffEmail, junkReason, parseAddress, safeFileName, staffDomains,
} from "../../src/lib/iris/email-intake";

describe("staff detection", () => {
  it("accepts all three company domains by default", () => {
    const d = staffDomains("");
    expect(isStaffEmail("a@physique57india.com", d)).toBe(true);
    expect(isStaffEmail("a@physique57mumbai.com", d)).toBe(true);
    expect(isStaffEmail("a@PHYSIQUE57BENGALURU.COM", d)).toBe(true);
    expect(isStaffEmail("member@gmail.com", d)).toBe(false);
    expect(isStaffEmail("x@notphysique57india.com", d)).toBe(false);
  });
  it("env override", () => {
    expect(staffDomains("foo.com, @bar.com")).toEqual(["foo.com", "bar.com"]);
  });
});

describe("parseAddress", () => {
  it("parses display-name form", () => {
    expect(parseAddress("John Doe <John@Example.com>")).toEqual({ name: "John Doe", email: "john@example.com" });
    expect(parseAddress('"Doe, J" <j@x.com>')).toEqual({ name: "Doe, J", email: "j@x.com" });
  });
  it("parses bare + object", () => {
    expect(parseAddress("j@x.com")).toEqual({ name: null, email: "j@x.com" });
    expect(parseAddress({ name: "J", email: "J@X.com" })).toEqual({ name: "J", email: "j@x.com" });
    expect(parseAddress("nobody")).toBeNull();
  });
});

describe("junkReason", () => {
  const base = { from: "member@gmail.com", subject: "AC not working at Bandra", text: "hi" };
  it("passes a real request", () => expect(junkReason(base)).toBeNull());
  it("flags auto replies and lists", () => {
    expect(junkReason({ ...base, headers: { "Auto-Submitted": "auto-replied" } })).toMatch(/Auto-submitted/);
    expect(junkReason({ ...base, headers: { "Auto-Submitted": "no" } })).toBeNull();
    expect(junkReason({ ...base, headers: { "List-Unsubscribe": "<mailto:x>" } })).toMatch(/newsletter/);
    expect(junkReason({ ...base, subject: "Out of Office: back Monday" })).toMatch(/Auto-reply/);
    expect(junkReason({ ...base, from: "no-reply@shop.com" })).toMatch(/Automated/);
    expect(junkReason({ ...base, from: "forwarding-noreply@google.com", subject: "(#123) Gmail Forwarding Confirmation" })).toMatch(/forwarding/);
    expect(junkReason({ from: "a@b.com", subject: "", text: "  " })).toBe("Empty email");
  });
});

describe("inboundEvents", () => {
  it("reads the documented events array", () => {
    expect(
      inboundEvents({ events: [{ event: "inbound.message_received", event_id: "e1", message_id: "m1", inbox_id: 42, from: "x" }] }),
    ).toEqual([{ eventId: "e1", messageId: "m1", inboxId: "42" }]);
  });
  it("skips non-inbound events and missing ids", () => {
    expect(inboundEvents({ events: [{ event: "delivery", message_id: "m" }, { event: "inbound.message_received" }] })).toEqual([]);
  });
});

describe("misc", () => {
  it("htmlToText", () => expect(htmlToText("<p>Hi&nbsp;there</p><br>Bye<style>x{}</style>")).toBe("Hi there\n\nBye"));
  it("safeFileName", () => expect(safeFileName("a/b:c?.pdf")).toBe("a_b_c_.pdf"));
});

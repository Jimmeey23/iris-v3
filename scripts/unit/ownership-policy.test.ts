import { describe, expect, it } from "bun:test";
import { decideOwnership, type PolicyInput } from "../../src/lib/iris/ownership-policy";

const base: PolicyInput = { category: "General", subcategory: null, title: "x", description: "", studioCode: null, studioCity: null, reporterEmployeeId: null };

describe("decideOwnership - keyword fallback", () => {
  it("sends payments and refunds to Operations: Saachi → Mitali", () => {
    const d = decideOwnership({ ...base, category: "Pricing and Memberships", subcategory: "Refund and Cancellation Policy Issue", studioCode: "KH" });
    expect(d).toMatchObject({ rule: "accounts", assigneeId: "emp_saachi", departmentCodes: ["OPS"], escalationChain: ["emp_mitali"], decidedBy: "rules" });
    expect(decideOwnership({ ...base, title: "Member double charged on Razorpay" })?.rule).toBe("accounts");
  });

  it("sends safety, theft, injury and legal to Saachi → Mitali → Jimmeey", () => {
    const d = decideOwnership({ ...base, title: "Member injured on reformer", studioCode: "SHQ" });
    expect(d).toMatchObject({ rule: "safety_legal", assigneeId: "emp_saachi", escalationChain: ["emp_mitali", "emp_jimmeey"] });
    expect(decideOwnership({ ...base, title: "Phone stolen from locker" })?.rule).toBe("safety_legal");
  });

  it("routes facilities faults by city with the full chain", () => {
    const mumbai = decideOwnership({ ...base, category: "Class Experience", subcategory: "Audio Issues", title: "Headset mic out of use with static", studioCode: "KH" });
    expect(mumbai).toMatchObject({ rule: "facilities", assigneeId: "emp_zahur", escalationChain: ["emp_saachi", "emp_mitali"], departmentCodes: ["OPS"] });
    const blr = decideOwnership({ ...base, title: "AC not working", studioCode: "KHB" });
    expect(blr).toMatchObject({ assigneeId: "emp_prathap", escalationChain: ["emp_shifa", "emp_saachi", "emp_mitali"] });
    expect(decideOwnership({ ...base, title: "Pest control needed", studioCode: "CCB" })?.assigneeId).toBe("emp_prathap");
    expect(decideOwnership({ ...base, title: "Valet late again", studioCode: "SHQ" })?.assigneeId).toBe("emp_zahur");
  });

  it("adds the studio team when a fault hurts members", () => {
    const d = decideOwnership({ ...base, title: "AC broken", description: "Affecting member experience?: Yes, significantly", studioCode: "SHQ" });
    expect(d).toMatchObject({ rule: "facilities", assigneeId: "emp_zahur", alsoRules: ["member_sales"], departmentCodes: ["OPS", "SCS"] });
    expect(d?.ownerIds).toEqual(["emp_zahur", "emp_shipra"]);
  });

  it("sends scheduling to Mrigakshi + Vivaran (Mumbai) or Pushyank (Bengaluru), escalating to Anisha", () => {
    expect(decideOwnership({ ...base, title: "Trainer swap for Saturday", studioCode: "KH" })).toMatchObject({
      rule: "scheduling", assigneeId: "emp_mrigakshi", ownerIds: ["emp_mrigakshi", "emp_vivaran"], escalationChain: ["emp_anisha"],
    });
    expect(decideOwnership({ ...base, title: "New class request: evening barre", studioCode: "KHB" })?.assigneeId).toBe("emp_pushyank");
  });

  it("sends anything about a trainer to the training leads", () => {
    const d = decideOwnership({ ...base, category: "Trainer Feedback", title: "Trainer late to class", studioCode: "SHQ" });
    expect(d).toMatchObject({ rule: "trainer", assigneeId: "emp_mrigakshi", escalationChain: ["emp_anisha"] });
    expect(d?.ownerIds).toEqual(["emp_mrigakshi", "emp_vivaran", "emp_anisha", "emp_pushyank"]);
  });

  it("sends member experience and sales to the studio team lead", () => {
    expect(decideOwnership({ ...base, title: "Membership transfer request", studioCode: "KH" })).toMatchObject({ assigneeId: "emp_akshay", escalationChain: ["emp_jimmeey", "emp_mitali"] });
    expect(decideOwnership({ ...base, title: "Discount offer query", studioCode: "SHQ" })?.assigneeId).toBe("emp_shipra");
    expect(decideOwnership({ ...base, title: "Member complaint about wait", studioCode: "KHB" })).toMatchObject({
      assigneeId: "emp_prathap", escalationChain: ["emp_shifa", "emp_jimmeey", "emp_mitali"],
    });
  });

  it("sends hosted class feedback to marketing", () => {
    expect(decideOwnership({ ...base, title: "Hosted class feedback from partner", studioCode: "KH" })).toMatchObject({
      rule: "hosted_class", assigneeId: "emp_shaina", escalationChain: ["emp_reyna", "emp_saachi", "emp_jimmeey"],
    });
    expect(decideOwnership({ ...base, title: "Hosted class feedback", studioCode: "KHB" })?.assigneeId).toBe("emp_saachi_jr");
  });

  it("returns null when nothing matches", () => {
    expect(decideOwnership({ ...base, title: "hello" })).toBeNull();
  });
});

describe("decideOwnership - AI pick", () => {
  it("uses the AI's rule over keywords, with secondary teams", () => {
    const d = decideOwnership(
      { ...base, category: "Class Experience", title: "Class felt rushed", studioCode: "KH" },
      undefined,
      { rule: "facilities", also: ["member_sales", "bogus"] },
    );
    expect(d).toMatchObject({ rule: "facilities", decidedBy: "ai", assigneeId: "emp_zahur", alsoRules: ["member_sales"], departmentCodes: ["OPS", "SCS"] });
  });

  it("falls back to keywords when the AI's rule is invalid", () => {
    expect(decideOwnership({ ...base, title: "AC leaking", studioCode: "KH" }, undefined, { rule: "nonsense" })).toMatchObject({ rule: "facilities", decidedBy: "rules" });
  });
});

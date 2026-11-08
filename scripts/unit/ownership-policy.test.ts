import { describe, expect, it } from "bun:test";
import { decideOwnership, type PolicyInput } from "../../src/lib/iris/ownership-policy";

const base: PolicyInput = { category: "Scheduling", subcategory: null, title: "x", description: "", studioCode: null, studioCity: null, reporterEmployeeId: null };
const rr = () => 0;

describe("decideOwnership", () => {
  it("sends accounts and payments to Saachi and Mitali", () => {
    const d = decideOwnership({ ...base, category: "Pricing and Memberships", subcategory: "Refund and Cancellation Policy Issue", studioCode: "KH" }, rr);
    expect(d).toMatchObject({ rule: "accounts", assigneeId: "emp_saachi", ownerIds: ["emp_saachi", "emp_mitali"], departmentCodes: ["PAY"] });
    expect(decideOwnership({ ...base, title: "Member double charged on Razorpay" }, rr)?.rule).toBe("accounts");
  });

  it("sends brand, expansion, licence and legal to Mitali", () => {
    expect(decideOwnership({ ...base, category: "Brand Feedback", studioCode: "SHQ" }, rr)).toMatchObject({ rule: "brand_legal", assigneeId: "emp_mitali" });
    expect(decideOwnership({ ...base, title: "Trade licence renewal for Bandra" }, rr)?.assigneeId).toBe("emp_mitali");
    expect(decideOwnership({ ...base, title: "Franchise expansion enquiry from Pune" }, rr)?.assigneeId).toBe("emp_mitali");
  });

  it("routes facilities by city with the right L2", () => {
    const mumbai = decideOwnership({ ...base, category: "Repair and Maintenance", subcategory: "PowerCycle Bike Fault", studioCode: "KH" }, rr);
    expect(mumbai).toMatchObject({ assigneeId: "emp_zahur", escalationL2: "emp_saachi", departmentCodes: ["FAC"] });
    const blr = decideOwnership({ ...base, category: "Studio Amenities and Facilities", studioCode: "KHB" }, rr);
    expect(blr).toMatchObject({ assigneeId: "emp_prathap", escalationL2: "emp_shifa" });
    expect(decideOwnership({ ...base, title: "Housekeeping missed the washroom", studioCode: "CCB" }, rr)?.assigneeId).toBe("emp_prathap");
  });

  it("assigns studio tickets to the reporter when on the team, else round robin", () => {
    expect(decideOwnership({ ...base, studioCode: "KH", reporterEmployeeId: "emp_sheetal" }, rr)?.assigneeId).toBe("emp_sheetal");
    const seen = [0, 1, 2, 3, 4].map((n) => decideOwnership({ ...base, studioCode: "SHQ", reporterEmployeeId: "emp_mitali" }, () => n)?.assigneeId);
    expect(seen).toEqual(["emp_shipra", "emp_nadiya", "emp_deesha", "emp_imran", "emp_shipra"]);
    // Someone from the other studio's team doesn't count as "on the team".
    expect(decideOwnership({ ...base, studioCode: "KH", reporterEmployeeId: "emp_shipra" }, rr)?.rule).toBe("studio_team");
    expect(decideOwnership({ ...base, studioCode: "KH", reporterEmployeeId: "emp_shipra" }, rr)?.assigneeId).toBe("emp_akshay");
  });

  it("keeps the order: accounts beats facilities beats studio team", () => {
    expect(decideOwnership({ ...base, category: "Repair and Maintenance", title: "Refund for broken bike class", studioCode: "KH" }, rr)?.rule).toBe("accounts");
    expect(decideOwnership({ ...base, category: "Repair and Maintenance", studioCode: "SHQ", reporterEmployeeId: "emp_imran" }, rr)?.rule).toBe("facilities");
  });

  it("falls through when no rule applies", () => {
    expect(decideOwnership({ ...base, studioCode: "KHB" }, rr)).toBeNull();
    expect(decideOwnership(base, rr)).toBeNull();
  });
});

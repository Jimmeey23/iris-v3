import { describe, expect, it } from "bun:test";
import { buildRichDraft, detailsFromText, missingDetails } from "@/lib/iris/intake-details";
import { fieldsFor, missingFields, UNKNOWN } from "@/lib/iris/intake-schema";
import type { CurrentUser, IntakeState } from "@/lib/iris/store";

const user: CurrentUser = { id: "emp_jimmeey", userId: "u1", email: "j@example.com", name: "Jimmeey Gondaa", role: "Head of SCS", tier: "admin" };

const base = (over: Partial<IntakeState> = {}): IntakeState => ({
  text: "Client complained about the trainer",
  category: "Trainer Feedback",
  subcategory: "Knowledge and Competence",
  department: "TRN",
  priority: "P2",
  prioritySuggested: true,
  studioCode: "KH",
  when: null,
  classFormat: null,
  title: null,
  member: null,
  session: null,
  trainer: { id: "mum:anmol sharma", name: "Anmol Sharma" },
  clientNameHint: null,
  trainerNameHint: null,
  suggestions: [],
  taxonomy: [],
  detectedBy: "rules",
  done: false,
  details: {},
  ...over,
});

describe("intake details", () => {
  it("asks only subcategory-relevant questions", () => {
    const ac = fieldsFor({ category: "Repair and Maintenance", subcategory: "AC & Ventilation Repairs" }).map((f) => f.key);
    expect(ac).toEqual(expect.arrayContaining(["studio", "area", "when", "sinceWhen", "acIssue", "memberImpact", "membersComplained", "membersInformed", "frontDeskSteps", "expectedResolution"]));
    expect(ac).not.toContain("bikeNumber");
    expect(ac).not.toContain("verbatim");
    const booking = fieldsFor({ category: "Tech Issues", subcategory: "Booking System Errors" }).map((f) => f.key);
    expect(booking).toEqual(expect.arrayContaining(["member", "device", "errorMessage", "worksVsFails"]));
    expect(booking).not.toContain("acIssue");
  });

  it("only asks who complained when members did complain", () => {
    const s = { category: "Repair and Maintenance", subcategory: "AC & Ventilation Repairs" };
    expect(fieldsFor(s).map((f) => f.key)).not.toContain("complaintWho");
    expect(fieldsFor({ ...s, details: { membersComplained: "Yes" } }).map((f) => f.key)).toContain("complaintWho");
  });

  it("blocks the draft until required answers are in; Don't know counts", () => {
    expect(missingDetails(base())).toContain("when it happened");
    expect(missingDetails(base())).toContain("client said");
    const all = Object.fromEntries(missingFields(base()).map((f) => [f.key, UNKNOWN]));
    expect(missingDetails(base({ when: "Today", session: { id: "s1", name: "Barre 57" }, details: all }))).toEqual([]);
  });

  it("reads quotes and mood words from the message", () => {
    const d = detailsFromText('Member was angry and said "the trainer kept getting the counts wrong"');
    expect(d.verbatim).toBe("the trainer kept getting the counts wrong");
    expect(d.sentiment).toBe("Angry");
  });

  it("builds a draft with SLA, reporter, departments, steps and tags", () => {
    const { draft, extras } = buildRichDraft(
      base({ when: "Today", details: { verbatim: "I want a refund or I'm leaving", sentiment: "Threatening to leave" } }),
      user,
    );
    expect(extras.reporter.name).toBe("Jimmeey Gondaa");
    expect(extras.departmentsInvolved).toContain("TRN");
    expect(extras.actionSteps.length).toBeGreaterThan(0);
    expect(extras.slaResolution).toBeTruthy();
    expect(draft.tags).toContain("churn-risk");
    expect(draft.tags).toContain("trainer:Anmol Sharma");
    expect(draft.description).toContain('Client said: "I want a refund or I\'m leaving"');
  });
});

import { describe, expect, it } from "bun:test";
import { buildRichDraft, detailFieldsFor, detailsFromText, missingDetails } from "@/lib/iris/intake-details";
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
  it("asks client-facing tickets for the client's words and mood", () => {
    const keys = detailFieldsFor("Trainer Feedback").filter((f) => f.need === "required").map((f) => f.key);
    expect(keys).toEqual(["verbatim", "sentiment"]);
  });

  it("blocks the draft until when, words and mood are in", () => {
    expect(missingDetails(base())).toEqual(["when it happened", "client said", "client mood"]);
    expect(missingDetails(base({ when: "Today", details: { verbatim: "She didn't know the moves", sentiment: "Frustrated" } }))).toEqual([]);
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
    expect(draft.description).toContain('Client said\n"I want a refund or I\'m leaving"');
  });
});

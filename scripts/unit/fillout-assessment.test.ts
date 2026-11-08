import { describe, expect, it } from "bun:test";
import { FilloutError, RUBRICS, answerPairs, band, parseFilloutAssessment } from "../../src/lib/iris/fillout-assessment";

const barreQuestions = (score: number) => RUBRICS.Barre.map(([label]) => ({ name: label, value: score }));

const payload = (extra: { name: string; value: unknown }[] = [], score = 4) => ({
  formId: "dSw2VkfdGqus",
  submission: {
    submissionId: "sub_123",
    submissionTime: "2026-11-01T10:00:00Z",
    questions: [
      { id: "q1", name: "Trainer name", type: "ShortAnswer", value: "Anisha Shah" },
      { id: "q2", name: "Studio", type: "Dropdown", value: "Supreme HQ" },
      { id: "q3", name: "Class format", type: "Dropdown", value: "Barre" },
      { id: "q4", name: "Evaluator", type: "ShortAnswer", value: "Reyaan Malhotra" },
      { id: "q5", name: "Key strengths observed", value: "Clear layered cues" },
      ...barreQuestions(score),
      ...extra,
    ],
  },
});

describe("parseFilloutAssessment", () => {
  it("scores a Barre submission with the weighted rubric", () => {
    const a = parseFilloutAssessment(payload(), { studios: ["Supreme HQ, Mumbai", "Kwality House, Kemps Corner"] });
    expect(a.sourceRef).toBe("fillout:dSw2VkfdGqus:sub_123");
    expect(a.format).toBe("Barre");
    expect(a.trainer).toBe("Anisha Shah");
    expect(a.studio).toBe("Supreme HQ, Mumbai");
    expect(a.evaluator).toBe("Reyaan Malhotra");
    expect(a.strengths).toBe("Clear layered cues");
    expect(a.score).toBe(80); // 4/5 on every criterion
    expect(a.band).toBe("Good");
    expect(a.rubric).toHaveLength(10);
    expect(a.rubric[0]).toEqual({ category: "Client attendance", weightage: 12.5, score: 10, pct: 80 });
  });

  it("supports by-weight scoring and the field map", () => {
    const qs = RUBRICS.Barre.map(([, w], i) => ({ name: `Q${i}`, value: w })); // full marks
    const map = Object.fromEntries(RUBRICS.Barre.map((_, i) => [`rating${i}`, `Q${i}`]));
    const a = parseFilloutAssessment(
      { formId: "f", submission: { submissionId: "s", questions: [{ name: "Trainer", value: "X" }, { name: "Class format", value: "Barre" }, ...qs] } },
      { scoreScale: "weight", fieldMap: map },
    );
    expect(a.score).toBe(100);
    expect(a.band).toBe("Exceptional");
  });

  it("refuses incomplete or out-of-range submissions with a reason", () => {
    expect(() => parseFilloutAssessment({ submission: {} })).toThrow(FilloutError);
    expect(() => parseFilloutAssessment(payload().submission ? { formId: "f", submission: { submissionId: "s", questions: [] } } : {})).toThrow(/trainer/);
    const missing = payload();
    missing.submission.questions = missing.submission.questions.filter((q) => q.name !== "Musicality");
    expect(() => parseFilloutAssessment(missing)).toThrow(/Musicality/);
    expect(() => parseFilloutAssessment(payload([], 7))).toThrow(/score scale/);
  });

  it("finds answers nested anywhere and bands scores", () => {
    expect(answerPairs({ a: { b: [{ label: "Trainer", value: { label: "Y" } }] } })).toEqual([{ label: "Trainer", value: "Y" }]);
    expect(band(69)).toEqual({ band: "Poor", tone: "amber" });
    expect(band(55).tone).toBe("red");
    expect(band(90).band).toBe("Exceptional");
  });

  it("accepts Zite flat records with the form id from the webhook URL", () => {
    const record = Object.fromEntries([
      ["id", "rec_9"], ["Trainer", "Anisha Shah"], ["Studio", "Supreme HQ"], ["Class format", "Barre"],
      ...RUBRICS.Barre.map(([label]) => [label, 5]),
    ]);
    const a = parseFilloutAssessment({ record }, { sourceId: "pdtcpzhxas" });
    expect(a.sourceRef).toBe("fillout:pdtcpzhxas:rec_9");
    expect(a.trainer).toBe("Anisha Shah");
    expect(a.score).toBe(100);
    expect(() => parseFilloutAssessment({ record })).toThrow(/source/);
  });
});

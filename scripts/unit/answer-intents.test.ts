import { describe, expect, it } from "bun:test";
import { bestArticle, classifyQuestion, keyTerms, parsePeriod, studioHint } from "../../src/lib/iris/answer-intents";
import type { KnowledgeArticle } from "../../src/lib/iris/knowledge-base/compose";

const STUDIOS = [
  { code: "KWALITY", name: "Kwality House, Kemps Corner" },
  { code: "SUPREME", name: "Supreme HQ, Bandra" },
];

describe("classifyQuestion", () => {
  it("routes equipment questions", () => {
    expect(classifyQuestion("what's the status of bike 8 at Bandra?", STUDIOS)).toEqual({ kind: "equipment", equipment: "bike", number: 8, studioHint: "SUPREME" });
    expect(classifyQuestion("how many times has the AC failed at Kemps", STUDIOS)).toMatchObject({ kind: "equipment", equipment: "ac", studioHint: "KWALITY" });
  });

  it("routes trainer performance", () => {
    expect(classifyQuestion("How is Anisha Shah doing?")).toEqual({ kind: "trainer", name: "anisha shah" });
    expect(classifyQuestion("show scores for anmol sharma")).toEqual({ kind: "trainer", name: "anmol sharma" });
  });

  it("routes counts with period, status and studio", () => {
    expect(classifyQuestion("how many breached tickets this week at Bandra?", STUDIOS)).toMatchObject({
      kind: "stats", status: "breached", studioHint: "SUPREME", period: { days: 7 },
    });
    expect(classifyQuestion("how many locker issues last month")).toMatchObject({ kind: "stats", topic: "locker", period: { days: 30, offsetDays: 30 } });
  });

  it("routes history and how-to questions", () => {
    expect(classifyQuestion("has the locker door broken before?")).toMatchObject({ kind: "history", terms: ["locker", "door", "broken"] });
    expect(classifyQuestion("how do I process a membership freeze?")).toMatchObject({ kind: "kb", terms: ["membership", "freeze"] });
  });

  it("leaves reasoning and drafting to the AI", () => {
    expect(classifyQuestion("why do bikes keep failing at Bandra?", STUDIOS)).toBeNull();
    expect(classifyQuestion("draft a reply to the member about the refund")).toBeNull();
    expect(classifyQuestion("compare Bandra and Kemps this month", STUDIOS)).toBeNull();
    expect(classifyQuestion("the AC is broken in studio 2")).toBeNull(); // a report, not a question
    expect(classifyQuestion("bike 8 is clicking at Bandra", STUDIOS)).toBeNull();
  });
});

describe("helpers", () => {
  it("extracts key terms and periods", () => {
    expect(keyTerms("Has the AC failed before at the studio?")).toEqual(["ac", "failed"]);
    expect(parsePeriod("anything yesterday")).toEqual({ label: "yesterday", days: 1, offsetDays: 1 });
    expect(parsePeriod("no period")).toBeNull();
    expect(studioHint("over at kemps", STUDIOS)).toBe("KWALITY");
    expect(studioHint("in mumbai", STUDIOS)).toBeNull();
  });

  it("picks a knowledge article only when it's a clear match", () => {
    const a = (id: string, title: string, tags: string[] = []): KnowledgeArticle => ({ id, title, category: "x", summary: "", steps: [], tags });
    const kb = [a("KB-1", "Membership freeze requests", ["freeze", "pause"]), a("KB-2", "Bike resistance knob stuck", ["powercycle"]), a("KB-3", "Refund processing")];
    expect(bestArticle(kb, ["membership", "freeze"])?.article.id).toBe("KB-1");
    expect(bestArticle(kb, ["bike", "resistance"])?.article.id).toBe("KB-2");
    expect(bestArticle(kb, ["parking"])).toBeNull();
  });
});

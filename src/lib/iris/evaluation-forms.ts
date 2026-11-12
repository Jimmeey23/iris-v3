/**
 * The four evaluation forms the studios use, ported from iris-ai-v2 (`lib/forms.ts`).
 * Fillout serves two embed runtimes: the classic form builder (`fillout-v1`) and Zite,
 * its app builder (`zite-v2`); each needs its own loader script and `data-*` attributes.
 */
export type EmbedKind = "fillout-v1" | "zite-v2";

export type EmbeddedForm = {
  key: string;
  name: string;
  blurb: string;
  /** Assessment rubric this form scores against. */
  template: string;
  embedId: string;
  embedKind: EmbedKind;
  height: number;
  art: string;
  /** Zite apps are not on the Fillout submissions API; only webhooks deliver them. */
  apiPollable: boolean;
};

export const EVALUATION_FORMS: EmbeddedForm[] = [
  { key: "strength", name: "Strength Lab feedback", blurb: "Trainer QA & Assessment — FIT & Strength Lab", template: "Strength Lab", embedId: "srq1c6n7br", embedKind: "zite-v2", height: 700, art: "/evaluation-forms/strength.jpg", apiPollable: false },
  { key: "cycle", name: "powerCycle feedback", blurb: "Ride programming, musicality, safety and fill rate", template: "powerCycle", embedId: "pdtcpzhxas", embedKind: "zite-v2", height: 700, art: "/evaluation-forms/cycle.jpg", apiPollable: false },
  { key: "barre", name: "Barre assessment", blurb: "Training Quality Assessment — weighted Barre rubric", template: "Barre", embedId: "dSw2VkfdGqus", embedKind: "fillout-v1", height: 560, art: "/evaluation-forms/barre.jpg", apiPollable: true },
  { key: "nontechnical", name: "Non-technical feedback", blurb: "Member-facing class experience and retention signals", template: "General", embedId: "syTsvPww8nus", embedKind: "fillout-v1", height: 560, art: "/evaluation-forms/nontechnical.jpg", apiPollable: true },
];

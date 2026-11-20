/**
 * Mandatory close-out questions shown in the Resolve dialog. Two or three per ticket,
 * picked from the ticket's department, category, subcategory and title, so whoever
 * resolves it has to record the facts that matter for that kind of issue.
 */

export type ResolutionQuestion = {
  id: string;
  label: string;
  kind: "text" | "choice";
  options?: string[];
  placeholder?: string;
};

type Rule = { match: RegExp; dept?: string[]; questions: ResolutionQuestion[] };

const yesNo = ["Yes", "No", "Not applicable"];

const RULES: Rule[] = [
  {
    match: /refund|payment|charge|invoice|billing|razorpay|pine ?labs|upi|credit/i,
    dept: ["FIN", "ACC"],
    questions: [
      { id: "txn_ref", label: "Transaction / refund reference number", kind: "text", placeholder: "e.g. Razorpay rfnd_… or Momence sale ID" },
      { id: "amount", label: "Amount refunded, credited or corrected (₹)", kind: "text", placeholder: "0 if no money moved" },
      { id: "member_informed", label: "Was the member informed of the outcome?", kind: "choice", options: yesNo },
    ],
  },
  {
    match: /membership|package|renewal|freeze|pause|guest pass|transfer|upgrade/i,
    dept: ["MEM"],
    questions: [
      { id: "momence_updated", label: "Was the member's record updated in Momence?", kind: "choice", options: yesNo },
      { id: "change_made", label: "What exactly changed on the membership?", kind: "text", placeholder: "e.g. frozen 12 Nov – 26 Nov, 4 credits added" },
      { id: "member_informed", label: "Was the member informed of the outcome?", kind: "choice", options: yesNo },
    ],
  },
  {
    match: /booking|waitlist|schedule|check.?in|class (full|cancel)|late cancel|no.?show/i,
    dept: ["FRT", "OPS"],
    questions: [
      { id: "booking_fixed", label: "Was the booking / check-in corrected in Momence?", kind: "choice", options: yesNo },
      { id: "member_informed", label: "Was the member informed?", kind: "choice", options: yesNo },
      { id: "cause", label: "Why did it happen?", kind: "text", placeholder: "e.g. app sync delay, staff error, member error" },
    ],
  },
  {
    match: /trainer|instructor|class quality|coaching|assessment|evaluation/i,
    dept: ["TRN"],
    questions: [
      { id: "trainer_spoken", label: "Has the feedback been discussed with the trainer?", kind: "choice", options: yesNo },
      { id: "action_agreed", label: "Action agreed with the trainer", kind: "text", placeholder: "e.g. cueing refresher, shadow session on 28 Nov" },
      { id: "member_informed", label: "Was the member who raised it updated?", kind: "choice", options: yesNo },
    ],
  },
  {
    match: /\bac\b|hvac|air ?con|plumb|leak|washroom|shower|electric|\blights?\b|repair|broken|maintenance|facilit|equipment|reformer|\bbikes?\b|spring|\bmats?\b/i,
    dept: ["FAC", "MNT"],
    questions: [
      { id: "fixed_by", label: "Who fixed it?", kind: "choice", options: ["In-house staff", "External vendor", "Manufacturer / warranty", "Not fixed - workaround in place"] },
      { id: "cost", label: "Cost incurred (₹) and vendor name", kind: "text", placeholder: "0 if none" },
      { id: "verified", label: "Was the fix checked on site and working?", kind: "choice", options: yesNo },
    ],
  },
  {
    match: /email|laptop|wifi|wi-fi|network|password|login|access|software|\bapp\b|system|printer/i,
    dept: ["ITS", "IT"],
    questions: [
      { id: "fix_applied", label: "What fix was applied?", kind: "text", placeholder: "e.g. reset password, replaced router" },
      { id: "user_confirmed", label: "Did the affected person confirm it works?", kind: "choice", options: yesNo },
    ],
  },
  {
    match: /complaint|rude|behaviou?r|staff|front desk|service|experience/i,
    questions: [
      { id: "member_contacted", label: "Was the member contacted personally?", kind: "choice", options: yesNo },
      { id: "outcome", label: "What was offered or agreed with the member?", kind: "text", placeholder: "e.g. apology call, complimentary class" },
      { id: "staff_briefed", label: "Were the staff involved briefed?", kind: "choice", options: yesNo },
    ],
  },
  {
    match: /\bhr\b|leave|salary|payroll|attendance|hiring|employee/i,
    dept: ["HR"],
    questions: [
      { id: "employee_informed", label: "Was the employee informed of the outcome?", kind: "choice", options: yesNo },
      { id: "record_updated", label: "Which record or system was updated?", kind: "text", placeholder: "e.g. payroll sheet, leave tracker" },
    ],
  },
];

const FALLBACK: ResolutionQuestion[] = [
  { id: "outcome_confirmed", label: "Has the person who raised this confirmed it is sorted?", kind: "choice", options: yesNo },
  { id: "prevent", label: "What will stop this from happening again?", kind: "text", placeholder: "Write 'Nothing needed' if it was a one-off" },
];

type TicketLike = {
  category?: string | null;
  subcategory?: string | null;
  title?: string | null;
  departmentCode?: string | null;
  department?: string | null;
};

export function getResolutionQuestions(t: TicketLike): ResolutionQuestion[] {
  const dept = (t.departmentCode ?? t.department ?? "").toUpperCase();
  const text = [t.category, t.subcategory, t.title].filter(Boolean).join(" ");
  const byText = RULES.find((r) => r.match.test(text));
  const byDept = RULES.find((r) => r.dept?.includes(dept));
  const rule = byText ?? byDept;
  return (rule?.questions ?? FALLBACK).slice(0, 3);
}

export function resolutionAnswersComplete(questions: ResolutionQuestion[], answers: Record<string, string>): boolean {
  return questions.every((q) => (answers[q.id] ?? "").trim().length > 0);
}

export function formatResolutionAnswers(questions: ResolutionQuestion[], answers: Record<string, string>): string {
  return questions.map((q) => `${q.label}: ${(answers[q.id] ?? "").trim()}`).join("\n");
}

/** Assessment tickets are filed for Training admins to read; nobody works them. */
export function isInfoOnlyTicket(t: { tags?: string[] | null; status?: string | null }): boolean {
  return Boolean(t.tags?.includes("info-only"));
}

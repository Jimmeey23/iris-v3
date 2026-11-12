// IRIS - Ticket template types, shared option lists and the preset-form builders
// used by the built-in template catalogue (src/lib/iris/template-library/*).
//
// Every built-in template is a *preset ticket form*: it pre-selects the ticket
// taxonomy (CATEGORY_MAP category + subcategory), priority, department, timing,
// reporter and requested outcome, and defines the exact typed fields the person
// raising the ticket fills in. The Templates page renders that form and submits
// a real ticket from it.

import {
  CLASS_FORMATS,
  MEMBERSHIPS,
  OCCURRED_OPTIONS,
  REPORTED_BY_OPTIONS,
  SYSTEMS,
  TRAINERS,
} from "./constants";

export type TemplateFieldType = "text" | "textarea" | "number" | "select" | "multiselect" | "checkbox" | "date" | "session" | "roster";
export type TemplatePriority = "P0" | "P1" | "P2" | "P3";

/** One input rendered by the preset ticket form. */
export interface TemplateField {
  id: string;
  label: string;
  type: TemplateFieldType;
  required?: boolean;
  options?: string[];
  /** Initial value: string for text/select/date/number, boolean for checkbox, string[] for multiselect. */
  default?: string | boolean | string[];
  helper?: string;
  /** type "session": Momence session types to search (e.g. ["private"] for hosted classes). */
  sessionTypes?: string[];
  /** type "roster": id of the "session" field whose booked members this table lists. */
  sessionField?: string;
}

/** What a template pre-fills when it is used to raise a ticket. */
export interface TemplateForm {
  /** CATEGORY_MAP key + one of its subcategories (the ticket's own taxonomy). */
  category?: string;
  subcategory?: string;
  /** Pre-selected studio (full IRIS studio name) and area. */
  studio?: string;
  area?: string;
  /** Restrict the studio / area pickers to these names. */
  studioOptions?: string[];
  areaOptions?: string[];
  occurred?: string;
  reportedBy?: string;
  system?: string;
  requestedOutcome?: string;
  titlePrefill?: string;
  summaryPrefill?: string;
  /** The exact field set this template collects. */
  fields: TemplateField[];
}

export interface TicketTemplate {
  code: string;
  title: string;
  description: string;
  /** IRIS issue category / sub-category (CATEGORY_MAP) - drives the Templates page drill-down. */
  category: string;
  subcategory?: string;
  /** Section of the hand-written library it came from (search only; not stored). */
  libraryGroup?: string;
  departmentCode: string;
  defaultPriority: TemplatePriority;
  defaultSeverity?: string;
  suggestedAssigneeRole?: string;
  requiredFields: string[];
  conditionalFields?: { field: string; condition: string; options: string[] }[];
  customFields?: { name: string; type: string; options?: string[] }[];
  prefilledOptions?: { field: string; options: string[] }[];
  /** Handling playbook for whoever picks the ticket up (numbered lines). */
  recommendedActions: string;
  estimatedResolutionHours: number;
  /** Preset ticket form. Every built-in template carries one; legacy rows may not (see template-form.ts). */
  form?: TemplateForm;
}

/* ------------------------------------------------------------------ */
/* Option lists (kept in step with the dynamic intake form)            */
/* ------------------------------------------------------------------ */

export const REQUESTED_OUTCOMES = [
  "Fix the issue",
  "Action the request",
  "Refund / credit",
  "Information only",
  "Process change",
  "Escalate to management",
] as const;
export type RequestedOutcome = (typeof REQUESTED_OUTCOMES)[number];
export type OccurredOption = (typeof OCCURRED_OPTIONS)[number];
export type ReportedByOption = (typeof REPORTED_BY_OPTIONS)[number];
export type SystemOption = (typeof SYSTEMS)[number];

export const SEVERITY_BY_PRIORITY: Record<TemplatePriority, string> = {
  P0: "Critical",
  P1: "High",
  P2: "Medium",
  P3: "Low",
};

const OTHER = "Other / not listed";

/** Real Momence plan & package names (constants.MEMBERSHIPS) plus a catch-all. */
export const OPT_PLANS: string[] = [...MEMBERSHIPS, "Corporate wellness plan", OTHER];
export const OPT_CLASS_FORMATS: string[] = [...CLASS_FORMATS, OTHER];
export const OPT_TRAINERS: string[] = [...TRAINERS, "Guest / substitute trainer", OTHER];
export const OPT_STUDIOS_SHORT = ["Kwality House", "Supreme HQ", "Kenkere House", "Courtside", "Copper & Cloves"];
export const OPT_PAYMENT_METHODS = [
  "UPI (GPay / PhonePe / Paytm)",
  "Credit card",
  "Debit card",
  "Razorpay payment link",
  "POS card machine (Pine Labs)",
  "Net banking / NEFT / IMPS",
  "Stripe (international card)",
  "Momence wallet / account credit",
  "Cash",
  "Cheque",
];
export const OPT_BIKES = [
  ...Array.from({ length: 14 }, (_, i) => `Bike ${i + 1}`),
  "Instructor bike",
];
export const OPT_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
export const OPT_TIME_BANDS = [
  "Early morning (6–8 AM)",
  "Morning (8–11 AM)",
  "Midday (11 AM–4 PM)",
  "Evening (4–8 PM)",
  "Late evening (after 8 PM)",
];
export const OPT_CONTACT_CHANNELS = ["WhatsApp", "Phone call", "Email", "In person at the desk", "Instagram DM", "Google review"];
export const OPT_YES_NO_UNSURE = ["Yes", "No", "Not sure"];

/* ------------------------------------------------------------------ */
/* Field builders - ids must match /^[A-Za-z][A-Za-z0-9_]*$/            */
/* ------------------------------------------------------------------ */

type Extra = { helper?: string; def?: string };

function base(id: string, label: string, type: TemplateFieldType, required: boolean, extra?: Extra): TemplateField {
  const f: TemplateField = { id, label, type };
  if (required) f.required = true;
  if (extra?.def !== undefined) f.default = extra.def;
  if (extra?.helper) f.helper = extra.helper;
  return f;
}

/** Short text. */
export const text = (id: string, label: string, required = false, helper?: string, def?: string) =>
  base(id, label, "text", required, { helper, def });
/** Long text. */
export const area = (id: string, label: string, required = false, helper?: string, def?: string) =>
  base(id, label, "textarea", required, { helper, def });
/** Number (amounts in ₹, counts, minutes…). */
export const num = (id: string, label: string, required = false, helper?: string, def?: string) =>
  base(id, label, "number", required, { helper, def });
/** Calendar date. */
export const date = (id: string, label: string, required = false, helper?: string) =>
  base(id, label, "date", required, { helper });
/** Single choice. */
export function pick(id: string, label: string, options: string[], required = false, def?: string, helper?: string): TemplateField {
  const f = base(id, label, "select", required, { helper, def });
  f.options = [...options];
  return f;
}
/** Multiple choice. */
export function multi(id: string, label: string, options: string[], required = false, def?: string[], helper?: string): TemplateField {
  const f: TemplateField = { id, label, type: "multiselect", options: [...options] };
  if (required) f.required = true;
  if (def?.length) f.default = [...def];
  if (helper) f.helper = helper;
  return f;
}
/** Momence class picker. `types` narrows the search, e.g. ["private"] for hosted classes. */
export function session(id: string, label: string, required = false, types?: string[], helper?: string): TemplateField {
  const f = base(id, label, "session", required, { helper });
  if (types?.length) f.sessionTypes = [...types];
  return f;
}
/** Per-member follow-up table for everyone booked into the class picked in `sessionField`. */
export function roster(id: string, label: string, sessionField: string, required = false, helper?: string): TemplateField {
  const f = base(id, label, "roster", required, { helper });
  f.sessionField = sessionField;
  return f;
}

/** Yes / no checkbox. */
export function check(id: string, label: string, def = false, helper?: string): TemplateField {
  const f: TemplateField = { id, label, type: "checkbox", default: def };
  if (helper) f.helper = helper;
  return f;
}

/* Reusable fields ---------------------------------------------------- */

export const F = {
  memberName: () => text("memberName", "Member name", true, "As it appears in Momence"),
  memberContact: () => text("memberContact", "Member phone / email", false, "WhatsApp number preferred for follow-up"),
  momenceId: () => text("momenceMemberId", "Momence member ID", false, "From the member profile URL in Momence"),
  plan: (required = true) => pick("membershipPlan", "Membership / package", OPT_PLANS, required),
  classFormat: (required = true) => pick("classFormat", "Class format", OPT_CLASS_FORMATS, required),
  trainer: (required = true, label = "Trainer") => pick("trainerName", label, OPT_TRAINERS, required),
  classDate: (required = true, label = "Class date") => date("classDate", label, required),
  classTime: (required = true) => text("classTime", "Class start time", required, "e.g. 7:30 AM"),
  amount: (label = "Amount (₹)", required = true) => num("amount", label, required),
  paymentMethod: (required = true) => pick("paymentMethod", "Payment method", OPT_PAYMENT_METHODS, required),
  paymentDate: (required = true) => date("paymentDate", "Payment date", required),
  txnRef: (required = false) =>
    text("transactionRef", "Transaction / UTR reference", required, "UPI UTR, Razorpay pay_ ID, POS slip or bank reference"),
  employeeName: (label = "Employee name") => text("employeeName", label, true),
  bike: (required = true) => pick("bikeNumber", "Bike number", OPT_BIKES, required),
  takenOutOfUse: (label = "Taken out of use / tagged ‘Do not use’") => check("outOfService", label, true),
  photos: () => check("photosAttached", "Photos / screenshots shared on the ticket thread", false),
  notes: (label = "Anything else the assignee should know") => area("additionalNotes", label, false),
};

/* ------------------------------------------------------------------ */
/* Catalogue spec → TicketTemplate                                      */
/* ------------------------------------------------------------------ */

/** Compact authoring shape for one built-in template. */
export interface TemplateSpec {
  code: string;
  title: string;
  /** Library sub-category (Step 2 of the drill-down). */
  sub: string;
  dept: string;
  prio: TemplatePriority;
  role: string;
  hrs: number;
  desc: string;
  /** CATEGORY_MAP [category, subcategory] the ticket is filed under. */
  map: [string, string];
  outcome: RequestedOutcome;
  when?: OccurredOption;
  by?: ReportedByOption;
  sys?: SystemOption;
  /** Restrict the area picker (studio-aware areas are offered when omitted). */
  areas?: string[];
  /** Ticket title prefill (defaults to the template title). */
  tp?: string;
  /** Ticket summary prefill (defaults to the description). */
  sum?: string;
  /** Handling playbook steps for the assignee. */
  act: string[];
  /** The preset form's scenario fields. */
  f: TemplateField[];
}

export function defineTemplates(category: string, specs: TemplateSpec[]): TicketTemplate[] {
  return specs.map((s) => {
    const form: TemplateForm = {
      category: s.map[0],
      subcategory: s.map[1],
      titlePrefill: s.tp ?? s.title,
      summaryPrefill: s.sum ?? s.desc,
      occurred: s.when ?? "Earlier today",
      reportedBy: s.by ?? "A member told me about it",
      requestedOutcome: s.outcome,
      fields: s.f,
    };
    if (s.sys) form.system = s.sys;
    if (s.areas?.length) form.areaOptions = [...s.areas];
    return {
      code: s.code,
      title: s.title,
      description: s.desc,
      // The Templates page groups by the IRIS issue taxonomy (what the ticket is filed under);
      // the library section this spec was written in is kept for search.
      category: s.map[0],
      subcategory: s.map[1],
      libraryGroup: `${category} › ${s.sub}`,
      departmentCode: s.dept,
      defaultPriority: s.prio,
      defaultSeverity: SEVERITY_BY_PRIORITY[s.prio],
      suggestedAssigneeRole: s.role,
      requiredFields: s.f.filter((f) => f.required).map((f) => f.id),
      recommendedActions: s.act.map((a, i) => `${i + 1}. ${a}`).join("\n"),
      estimatedResolutionHours: s.hrs,
      form,
    };
  });
}

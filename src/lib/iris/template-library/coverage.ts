/**
 * One template for every IRIS sub-category the hand-written library doesn't cover yet.
 *
 * The Templates page is organised by the IRIS issue taxonomy (CATEGORY_MAP), so every
 * sub-category needs at least one template. Hand-written templates always win: this only
 * fills the gaps, from what IRIS already knows about each sub-category - the intake
 * questions (intake-schema specs), its priority (inferPriority) and the department / role
 * the hand-written templates in the same category use.
 *
 * Codes are a hash of "category|sub-category", so they stay stable when CATEGORY_MAP
 * grows or is reordered (library sync keys on the code).
 */
import { CATEGORY_MAP } from "../constants";
import { inferPriority, PRIORITY_SLA_HOURS } from "../iris-constants";
import { FIELDS, specFor } from "../intake-schema";
import {
  OPT_TRAINERS,
  SEVERITY_BY_PRIORITY,
  type RequestedOutcome,
  type TemplateField,
  type TemplatePriority,
  type TicketTemplate,
} from "../template-types";

const PRIORITY: Record<ReturnType<typeof inferPriority>, TemplatePriority> = { critical: "P0", high: "P1", medium: "P2", low: "P3" };

/** Used when a category has no hand-written template to borrow a department / role from. */
const CATEGORY_DEFAULTS: Record<string, { dept: string; role: string; outcome: RequestedOutcome }> = {
  Scheduling: { dept: "SCH", role: "Scheduling Lead", outcome: "Action the request" },
  "Class Experience": { dept: "TRN", role: "Training Manager", outcome: "Fix the issue" },
  "Trainer Feedback": { dept: "TRN", role: "Training Manager", outcome: "Process change" },
  "Repair and Maintenance": { dept: "FAC", role: "Facilities Manager", outcome: "Fix the issue" },
  "Studio Amenities and Facilities": { dept: "FAC", role: "Facilities Manager", outcome: "Fix the issue" },
  "Operating Systems": { dept: "ITS", role: "IT & Systems Lead", outcome: "Fix the issue" },
  "Tech Issues": { dept: "ITS", role: "IT & Systems Lead", outcome: "Fix the issue" },
  "Pricing and Memberships": { dept: "MEM", role: "Memberships Manager", outcome: "Action the request" },
  "Customer Service and Communication": { dept: "SCS", role: "Client Servicing Lead", outcome: "Fix the issue" },
  "Brand Feedback": { dept: "MKT", role: "Marketing Manager", outcome: "Information only" },
  "Safety and Security": { dept: "MGT", role: "Studio Manager", outcome: "Escalate to management" },
  "Theft and Lost Items": { dept: "OPS", role: "Studio Manager", outcome: "Action the request" },
  Miscellaneous: { dept: "OPS", role: "Studio Manager", outcome: "Action the request" },
  "Internal Operations & Admin": { dept: "OPS", role: "Operations Manager", outcome: "Process change" },
};

const CATEGORY_STEPS: Record<string, string[]> = {
  Scheduling: [
    "Check the class, slot or booking in Momence and confirm exactly what was requested or went wrong.",
    "Confirm trainer and room availability before promising any change.",
    "Make the change (or explain why it can't be made) and update the schedule in Momence.",
    "Tell every affected member, and note the outcome on the ticket.",
  ],
  "Class Experience": [
    "Acknowledge the member and apologise for the experience.",
    "Check the class roster, trainer notes and studio log for that session.",
    "Fix the root cause with the trainer or studio team.",
    "Follow up with the member, offer a make-up class if warranted, and record what changed.",
  ],
  "Trainer Feedback": [
    "Call the member within the response SLA and acknowledge the feedback.",
    "Share the feedback privately with the trainer and their lead; get the trainer's account.",
    "Agree a coaching action and a date to review it.",
    "Close the loop with the member and log the outcome against the trainer.",
  ],
  "Repair and Maintenance": [
    "Inspect the fault and decide whether the item or room is safe to use; take it out of use if not.",
    "Put a temporary workaround in place so classes can run.",
    "Contact the vendor / AMC, log the visit date and get a quote if needed.",
    "Confirm the fix with the studio team and close with the vendor's notes and cost.",
  ],
  "Studio Amenities and Facilities": [
    "Check the amenity on site and confirm what is missing, broken or below standard.",
    "Restock, clean or arrange a temporary alternative straight away.",
    "Raise a purchase or vendor request for anything that needs replacing.",
    "Confirm it is back to standard and tell members who complained.",
  ],
  "Operating Systems": [
    "Reproduce the problem and capture the exact error, screen and user account.",
    "Check whether other staff or studios see the same thing.",
    "Apply the known fix, or raise it with the vendor's support with screenshots and log the case ID.",
    "Confirm it works for the person who reported it and note the fix on the ticket.",
  ],
  "Tech Issues": [
    "Get the member's or staff member's device, app version and the exact error.",
    "Reproduce it; check payment, booking and account records in Momence.",
    "Fix the record, or escalate to the vendor with screenshots and log the case ID.",
    "Confirm with the person affected and correct any charge or booking it caused.",
  ],
  "Pricing and Memberships": [
    "Pull up the member's membership and payment history in Momence.",
    "Check the request against the current pricing and membership policy.",
    "Get approval for any exception from the Memberships Manager before promising it.",
    "Action the change in Momence, confirm it to the member in writing, and record the decision.",
  ],
  "Customer Service and Communication": [
    "Call the member back and confirm what they need.",
    "Review the interaction with the staff member involved.",
    "Resolve the member's request and apologise where the service fell short.",
    "Agree any coaching or process change and note it on the ticket.",
  ],
  "Brand Feedback": [
    "Capture the feedback in the member's own words, with where they saw it.",
    "Share it with Marketing with any screenshots or links.",
    "Decide whether anything should change and who owns it.",
    "Reply to the member if they asked for a response, and record the decision.",
  ],
  "Safety and Security": [
    "Make the area safe and make sure nobody is at risk; call emergency services if needed.",
    "Inform the studio manager and management immediately.",
    "Record what happened, who was involved, witnesses and any CCTV references.",
    "Agree corrective actions, follow up with anyone affected, and log the incident report.",
  ],
  "Theft and Lost Items": [
    "Record the item, owner, where and when it was last seen.",
    "Check the lost-and-found, lockers and CCTV for that time window.",
    "Inform the member of the outcome and how long found items are held.",
    "If theft is suspected, inform management and record any police complaint number.",
  ],
  Miscellaneous: [
    "Confirm what the person is asking for and who it affects.",
    "Route it to the team that owns it, or handle it at the studio if you can.",
    "Act on it and keep the reporter updated.",
    "Close with what was done and any follow-up owner.",
  ],
  "Internal Operations & Admin": [
    "Confirm the request, the deadline and who needs it.",
    "Check the relevant policy, roster or records.",
    "Complete the task or assign it to the right owner with a due date.",
    "Confirm completion and file any records on the ticket.",
  ],
};

const GENERIC_STEPS = CATEGORY_STEPS.Miscellaneous;

/** FNV-1a, base 36: stable short code from the taxonomy pair. */
function codeFor(category: string, subcategory: string) {
  let h = 0x811c9dc5;
  for (const ch of `${category}|${subcategory}`) {
    h ^= ch.codePointAt(0)!;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `TPL-S${h.toString(36).toUpperCase().padStart(7, "0")}`;
}

/** Intake keys the template builder collects in its own steps, or pickers that map to built-in fields. */
const BUILDER_OWNED = new Set(["studio", "area", "when", "member"]);

function fieldFromSpec(rawKey: string): TemplateField | null {
  const optional = rawKey.startsWith("?");
  const key = rawKey.replace(/^\?/, "");
  if (BUILDER_OWNED.has(key)) return null;
  if (key === "trainer") return { id: "trainer", label: "Trainer", type: "select", required: !optional, options: OPT_TRAINERS };
  if (key === "session") return { id: "session", label: "Class", type: "session", required: !optional };
  const def = FIELDS[key];
  if (!def) return null;
  // A conditional question can't be expressed in a template form, so it's offered but never required.
  const required = !optional && !def.showIf;
  const helper = def.placeholder;
  switch (def.kind) {
    case "chips":
      return { id: key, label: def.label, type: "select", required, options: def.options ?? [], helper };
    case "multi":
      return { id: key, label: def.label, type: "multiselect", required, options: def.options ?? [], default: [], helper };
    case "yesno":
      return { id: key, label: def.label, type: "select", required, options: ["Yes", "No"], helper };
    case "textarea":
    case "text":
    case "date":
    case "number":
      return { id: key, label: def.label, type: def.kind, required, helper };
  }
}

function mostCommon<T>(values: T[]): T | undefined {
  const counts = new Map<T, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
}

/** Asked when a sub-category's spec yields fewer than four questions of its own. */
const PADDING = ["actionsTaken", "sinceWhen", "memberImpact", "photoTaken", "managerInformed"];
const MIN_FIELDS = 4;
const MAX_FIELDS = 10;

function formFields(category: string, subcategory: string): TemplateField[] {
  const fields = specFor(category, subcategory).map(fieldFromSpec).filter((f): f is TemplateField => f !== null);
  for (const key of PADDING) {
    if (fields.length >= MIN_FIELDS) break;
    if (fields.some((f) => f.id === key)) continue;
    const f = fieldFromSpec(`?${key}`);
    if (f) fields.push(f);
  }
  const out = fields.slice(0, MAX_FIELDS);
  // Every form needs at least one answer before it can be filed.
  if (!out.some((f) => f.required)) {
    const first = out.find((f) => f.type === "textarea" || f.type === "text") ?? out[0];
    if (first) first.required = true;
  }
  return out;
}

export function coverageTemplates(existing: readonly TicketTemplate[]): TicketTemplate[] {
  const titles = new Set(existing.map((t) => t.title.trim().toLowerCase()));
  const covered = new Set(existing.map((t) => `${t.form?.category ?? t.category}|${t.form?.subcategory ?? t.subcategory}`));
  const out: TicketTemplate[] = [];
  for (const [category, subs] of Object.entries(CATEGORY_MAP)) {
    const siblings = existing.filter((t) => (t.form?.category ?? t.category) === category);
    const base = CATEGORY_DEFAULTS[category] ?? CATEGORY_DEFAULTS.Miscellaneous;
    const dept = mostCommon(siblings.map((t) => t.departmentCode)) ?? base.dept;
    const role = mostCommon(siblings.map((t) => t.suggestedAssigneeRole).filter(Boolean) as string[]) ?? base.role;
    const outcome = (mostCommon(siblings.map((t) => t.form?.requestedOutcome).filter(Boolean) as string[]) ?? base.outcome) as RequestedOutcome;
    const steps = CATEGORY_STEPS[category] ?? GENERIC_STEPS;

    for (const subcategory of subs) {
      if (covered.has(`${category}|${subcategory}`)) continue;
      const pri = inferPriority(subcategory);
      const prio = PRIORITY[pri];
      const fields = formFields(category, subcategory);
      // Some sub-category names exist under two categories ("Engagement with Clients").
      let title = subcategory.replace(/\/$/, "");
      if (titles.has(title.toLowerCase())) title = `${title} (${category})`;
      titles.add(title.toLowerCase());
      const description = `Report a ${category.toLowerCase()} issue about ${subcategory.replace(/\/$/, "").toLowerCase()}: capture the details below so the right team can act on it first time.`;
      out.push({
        code: codeFor(category, subcategory),
        title,
        description,
        category,
        subcategory,
        departmentCode: dept,
        defaultPriority: prio,
        defaultSeverity: SEVERITY_BY_PRIORITY[prio],
        suggestedAssigneeRole: role,
        requiredFields: fields.filter((f) => f.required).map((f) => f.id),
        recommendedActions: steps.map((s, i) => `${i + 1}. ${s}`).join("\n"),
        estimatedResolutionHours: PRIORITY_SLA_HOURS[pri],
        form: {
          category,
          subcategory,
          titlePrefill: title,
          summaryPrefill: description,
          occurred: "Earlier today",
          reportedBy: "A member told me about it",
          requestedOutcome: outcome,
          fields,
        },
      });
    }
  }
  return out;
}

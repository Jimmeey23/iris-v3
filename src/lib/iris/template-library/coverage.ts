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
  playbookText,
  RESOLVED_WHEN,
} from "../template-types";

const HOURS_BY_PRIORITY: Record<TemplatePriority, number> = {
  P0: PRIORITY_SLA_HOURS.critical,
  P1: PRIORITY_SLA_HOURS.high,
  P2: PRIORITY_SLA_HOURS.medium,
  P3: PRIORITY_SLA_HOURS.low,
};
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

/**
 * Sub-category rules, first match wins. The per-category steps above are the fallback;
 * these fix the cases where one category holds very different situations (theft vs a lost
 * water bottle, an idea vs an incident, studio speakers vs online streaming) and where the
 * category's usual department or priority is wrong for the sub-category.
 */
type SubRule = {
  match: RegExp;
  dept?: string;
  role?: string;
  prio?: TemplatePriority;
  outcome?: RequestedOutcome;
  /** What the situation is and when to use this template (replaces the generic line). */
  desc?: string;
  steps?: string[];
  done?: string[];
  /** A suggestion or preference, not an incident: nothing is required beyond the idea itself. */
  idea?: boolean;
};

const THEFT_STEPS = [
  "Make sure the member is safe and calm; do not accuse or confront anyone.",
  "Note exactly what was taken, its value, where and when it was last seen, and who was around.",
  "Ask Facilities to save the CCTV for that window today, before it is overwritten.",
  "Inform the studio manager; offer the member help filing a police complaint and record their choice.",
  "Agree what will change (locker checks, staff watch at busy times) and tell the member the outcome.",
];
const THEFT_DONE = [
  "CCTV for the window is saved or reviewed, and what it showed is noted.",
  "The member's choice on a police complaint is recorded (and the FIR number if filed).",
  "The member has been told the outcome and any change made.",
];

const SUB_RULES: SubRule[] = [
  {
    match: /staff theft|items taken from trainer|payment held by staff|cash deposit discrepancy/i,
    dept: "MGT", role: "Studio Manager", prio: "P0", outcome: "Escalate to management",
    desc: "Money or belongings may have been taken or held back by a staff member. Handle discreetly: only the studio manager and HR should see the details.",
    steps: [
      "Tell the studio manager straight away; do not discuss it with the team or confront the person.",
      "Secure the evidence: cash count, Momence / POS records, CCTV for the window.",
      "Record the facts only (amounts, times, who had access) - no conclusions.",
      "Studio manager and HR decide the next step (statement, suspension, recovery).",
    ],
    done: [
      "Evidence is secured and the facts are recorded.",
      "HR and management have decided and recorded the outcome.",
      "Any money owed to a member or the studio is recovered or refunded, with the reference noted.",
    ],
  },
  {
    match: /theft|stolen/i,
    dept: "MGT", role: "Studio Manager", prio: "P1", outcome: "Escalate to management",
    desc: "A member's or the studio's belongings are believed stolen at the studio. Not for items simply left behind - use lost & found for those.",
    steps: THEFT_STEPS, done: THEFT_DONE,
  },
  {
    match: /missing towels/i,
    dept: "FAC", role: "Facilities Manager", prio: "P2", outcome: "Fix the issue",
    desc: "Towels are running short or disappearing. Count what was issued against what came back before assuming theft.",
    steps: [
      "Count towels in stock, in laundry and issued today.",
      "Compare with the opening count and the laundry log.",
      "Restock from the backup or order more so classes are covered.",
      "If the gap keeps recurring, start an issue / return log at the desk.",
    ],
    done: ["Counts are reconciled and stock is back to the class requirement.", "Any order raised is noted with quantity and cost."],
  },
  {
    match: /lost|forgetting|misplaced|shoes\/workout gear/i,
    dept: "OPS", role: "Studio Manager", prio: "P3", outcome: "Action the request",
    desc: "Something was left behind or misplaced at the studio. If it may have been stolen, use the theft template instead.",
  },
  {
    match: /harassment|abusive|disruptive|trespass/i,
    dept: "MGT", role: "Studio Manager", prio: "P0", outcome: "Escalate to management",
    desc: "Someone has been harassed, threatened or made unsafe, or a person is behaving abusively or is somewhere they shouldn't be. Keep the details confidential.",
    steps: [
      "Make everyone safe: separate the people involved; call building security or 112 if there is any threat.",
      "Inform the studio manager immediately. If a staff member is involved, inform HR / the POSH committee.",
      "Record what happened in the reporter's words, with time, place, witnesses and CCTV reference.",
      "Studio manager decides on a warning, ban or membership suspension in Momence, and tells the person in writing.",
      "Check in with the person affected within 24 hours and record what support was offered.",
    ],
    done: [
      "The people affected are safe and have been followed up.",
      "The decision (warning, ban, suspension, police) is recorded and actioned in Momence.",
      "Only those who need to know have the details.",
    ],
  },
  {
    match: /physical discomfort|cramping|dizziness/i,
    dept: "TRN", role: "Training Manager", prio: "P1", outcome: "Fix the issue",
    desc: "A member felt unwell or uncomfortable during class (cramp, dizziness, nausea). For an actual injury, use the client injury report.",
    steps: [
      "Stop the member, sit them down, give water and stay with them; call 108 if symptoms don't settle.",
      "Note the symptoms, class, time and what they were doing.",
      "Trainer checks the member before they leave and advises them to see a doctor if needed.",
      "Call the member the next day and record how they are.",
    ],
    done: ["The member was checked on the next day and how they are is recorded.", "The trainer's account and any change to cueing or modifications are noted."],
  },
  {
    match: /camera surveillance|cctv/i,
    dept: "FAC", role: "Facilities Manager", prio: "P2", outcome: "Fix the issue",
    desc: "A CCTV camera, the recorder or footage access isn't working.",
    steps: [
      "Check which cameras are down and whether the recorder (DVR / NVR) is recording.",
      "Restart the recorder and check power / network to the affected cameras.",
      "Call the CCTV vendor if not back within the day; note the job number.",
      "Confirm all cameras record and footage can be played back.",
    ],
    done: ["Every camera records and playback works.", "The vendor job number and cost are noted."],
  },
  {
    match: /music system|music volume|speaker/i,
    dept: "FAC", role: "Facilities Manager", prio: "P2", outcome: "Fix the issue",
    desc: "In-studio sound is too loud, too quiet or cutting out during classes.",
    steps: [
      "Check the volume limits on the amplifier and mixer against the studio standard.",
      "Test each speaker and the trainer mic channel.",
      "Call the AV vendor for faults the team can't fix; note the job number.",
      "Confirm with the next class's trainer that sound is right.",
    ],
    done: ["Sound is at the studio standard, confirmed by a trainer.", "Any vendor job number and cost are noted."],
  },
  {
    match: /streaming|virtual class video/i,
    dept: "ITS", role: "IT & Systems Lead", prio: "P2", outcome: "Fix the issue",
    desc: "Online / virtual class video or streaming is buffering, poor quality or failing.",
  },
  {
    match: /website|social media/i,
    dept: "MKT", role: "Marketing Manager", prio: "P3", outcome: "Fix the issue",
    desc: "Something on the website or social media isn't working, is wrong, or a message hasn't been answered.",
    steps: [
      "Capture the page / post, device and a screenshot of what's wrong.",
      "Fix it, or raise it with the web or social agency with the screenshot.",
      "Reply to any member who reported it.",
    ],
    done: ["The page or post is fixed and checked on mobile.", "Anyone who reported it has had a reply."],
  },
  {
    match: /cash counting machine/i,
    dept: "FAC", role: "Facilities Manager", prio: "P2", outcome: "Fix the issue",
    desc: "The cash counting machine at the desk isn't working or counts wrongly.",
  },
  {
    match: /class capacity|overcrowding in class/i,
    dept: "SCH", role: "Scheduling Lead", prio: "P1", outcome: "Action the request",
    desc: "A class is over capacity, members are being turned away, or the room is too full to train safely.",
    steps: [
      "Check booked count against the room's safe capacity in Momence.",
      "For today: move the class to a bigger room, open the waitlist, or add a slot if a trainer is free.",
      "Tell members who were turned away and offer the next slot.",
      "Review the grid so the class has the right capacity going forward.",
    ],
    done: ["The class is within safe capacity in Momence.", "Members affected have been offered another slot."],
  },
  {
    match: /compensation for service/i,
    dept: "SCS", role: "Client Servicing Lead", prio: "P2", outcome: "Action the request",
    desc: "A member is owed goodwill (a class credit, extension or refund) because the service fell short.",
    steps: [
      "Confirm what went wrong and what the member is asking for.",
      "Decide the goodwill within your limit; anything above it needs the Client Servicing Lead's approval.",
      "Add the credit / extension in Momence, or raise the refund with Payments.",
      "Confirm it to the member in writing.",
    ],
    done: ["The goodwill is applied in Momence (or refund raised) with the amount noted.", "Approval is on the ticket when it was above your limit.", "The member has it in writing."],
  },
  {
    match: /cancellation \/ discontinuation/i,
    dept: "MEM", role: "Memberships Manager", prio: "P2", outcome: "Action the request",
    desc: "A member wants to cancel or stop their membership. Check the notice period and whether a freeze or transfer would suit them better.",
    steps: [
      "Call the member and understand why; offer a freeze or transfer if it fits - no pressure.",
      "Check the plan's notice period and any dues in Momence.",
      "Process the cancellation in Momence with the end date and reason.",
      "Stop any auto-debit and confirm the end date in writing.",
    ],
    done: ["Cancellation is processed in Momence with the end date.", "Any auto-debit is stopped.", "The member has the end date in writing."],
  },
  {
    match: /over-promising|miscommunication on offers|knowledge of membership policies|tandc/i,
    dept: "SCS", role: "Client Servicing Lead", prio: "P2", outcome: "Fix the issue",
    desc: "A member was told something that isn't right - an offer, policy or promise that doesn't match what we deliver.",
    steps: [
      "Record exactly what was promised or said, by whom and when.",
      "Check it against the current offer / policy and decide whether to honour it.",
      "Call the member with the correct position and any goodwill.",
      "Brief or coach the staff member and fix the source (script, post, T&Cs wording).",
    ],
    done: ["The member has the correct position and any goodwill is applied.", "The staff member is briefed and the source wording is corrected."],
  },
  {
    match: /competitor solicitation|poaching/i,
    dept: "MGT", role: "Studio Manager", prio: "P1", outcome: "Escalate to management",
    desc: "Someone (often a trainer or ex-staff member) is soliciting our members for a competitor.",
    steps: [
      "Collect the evidence: screenshots, messages, which members were approached and by whom.",
      "Inform the studio manager and HR; do not confront the person.",
      "HR checks the contract terms and decides the action.",
      "Reassure affected members if needed.",
    ],
    done: ["Evidence is on the ticket.", "HR's decision is recorded."],
  },
  {
    match: /themed classes|challenges and rewards|sustainable|charging stations|background music selection|music preferences|decor|child-friendly|lighting preferences|scent|coffee and refreshments|merchandise|member recognition|brand (positioning|perception|event)|collaborations|additional (classes|waiting area)|seating|session length|weekend vs|class frequency|class duration|trainer preferences|feedback fatigue|lockers needed|perception of pricing/i,
    prio: "P3", outcome: "Information only", idea: true,
  },
];

function ruleFor(subcategory: string): SubRule | undefined {
  return SUB_RULES.find((r) => r.match.test(subcategory));
}

/** Questions about how the client felt only belong where a client was part of it. */
const NO_CLIENT_VOICE = new Set(["Repair and Maintenance", "Studio Amenities and Facilities", "Operating Systems", "Tech Issues", "Internal Operations & Admin"]);
const CLIENT_VOICE_KEYS = new Set(["verbatim", "sentiment"]);

/** One plain line on when to use a generated template, per category. */
const CATEGORY_WHEN: Record<string, (sub: string) => string> = {
  "Repair and Maintenance": (s) => `Something at the studio needs repair or servicing: ${s}. Say where it is, whether it's safe to use, and since when.`,
  "Studio Amenities and Facilities": (s) => `An amenity isn't up to standard: ${s}. Say what's missing or wrong and whether members noticed.`,
  "Operating Systems": (s) => `A studio system or tool isn't working: ${s}. Include the exact error, who's affected and a screenshot.`,
  "Tech Issues": (s) => `A tech problem affecting members or staff: ${s}. Include the device, the exact error and a screenshot.`,
  "Pricing and Memberships": (s) => `A membership or pricing request or question: ${s}. Link the member in Momence and say what they're asking for.`,
  Scheduling: (s) => `A schedule or class request: ${s}. Say which class / slot, what should change and who asked.`,
  "Class Experience": (s) => `Feedback about a class: ${s}. Say which class, trainer and what happened.`,
  "Trainer Feedback": (s) => `Feedback about a trainer: ${s}. Say which class and what was observed; it's shared with the trainer privately.`,
  "Customer Service and Communication": (s) => `A member's experience with our team: ${s}. Say who they dealt with and what they want now.`,
  "Brand Feedback": (s) => `Feedback about the brand: ${s}. Capture it in the member's words, with where they saw it.`,
  "Safety and Security": (s) => `A safety or security concern: ${s}. If anyone is at risk right now, make them safe first.`,
  "Theft and Lost Items": (s) => `${s}. Record the item, where and when it was last seen.`,
  "Internal Operations & Admin": (s) => `An internal task or request: ${s}. Say what's needed, by when and who needs it.`,
  Miscellaneous: (s) => `${s}. Say what happened, where, and who it affects.`,
};


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
const MAX_REQUIRED = 5;

function formFields(category: string, subcategory: string, idea = false): TemplateField[] {
  const fields = specFor(category, subcategory)
    .filter((k) => !(NO_CLIENT_VOICE.has(category) && CLIENT_VOICE_KEYS.has(k.replace(/^\?/, ""))))
    .map(fieldFromSpec)
    .filter((f): f is TemplateField => f !== null);
  // An idea only needs the idea itself; every other question is optional.
  if (idea) fields.forEach((f, i) => (f.required = i === 0));
  for (const key of PADDING) {
    if (fields.length >= MIN_FIELDS) break;
    if (fields.some((f) => f.id === key)) continue;
    const f = fieldFromSpec(`?${key}`);
    if (f) fields.push(f);
  }
  const out = fields.slice(0, MAX_FIELDS);
  // Only what staff can answer in the first minute is required; the rest stays optional.
  let required = 0;
  for (const f of out) if (f.required && ++required > MAX_REQUIRED) f.required = false;
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
      const rule = ruleFor(subcategory);
      const pri = inferPriority(subcategory);
      const prio = rule?.prio ?? PRIORITY[pri];
      const fields = formFields(category, subcategory, rule?.idea);
      // Some sub-category names exist under two categories ("Engagement with Clients").
      let title = subcategory.replace(/\/$/, "").replace(/TandC/g, "T&Cs");
      if (titles.has(title.toLowerCase())) title = `${title} (${category})`;
      titles.add(title.toLowerCase());
      const subName = subcategory.replace(/\/$/, "").replace(/TandC/g, "T&Cs");
      const description =
        rule?.desc ??
        (rule?.idea
          ? `A suggestion or preference about ${subName.toLowerCase()}. Capture the idea and who asked; it goes to the owning team to consider.`
          : (CATEGORY_WHEN[category] ?? CATEGORY_WHEN.Miscellaneous)(subName));
      const ideaSteps = [
        "Capture the suggestion in the member's (or staff member's) words, and how many people asked.",
        "Share it with the owning team at their next review.",
        "Record the decision (do it / later / no) and tell whoever asked.",
      ];
      const playSteps = rule?.steps ?? (rule?.idea ? ideaSteps : steps);
      const done = rule?.done ?? (rule?.idea ? ["The owning team has decided and whoever asked has been told."] : RESOLVED_WHEN[category]);
      out.push({
        code: codeFor(category, subcategory),
        title,
        description,
        category,
        subcategory,
        departmentCode: rule?.dept ?? dept,
        defaultPriority: prio,
        defaultSeverity: SEVERITY_BY_PRIORITY[prio],
        suggestedAssigneeRole: rule?.role ?? role,
        requiredFields: fields.filter((f) => f.required).map((f) => f.id),
        recommendedActions: playbookText(playSteps, done),
        estimatedResolutionHours: rule?.prio ? HOURS_BY_PRIORITY[rule.prio] : PRIORITY_SLA_HOURS[pri],
        form: {
          category,
          subcategory,
          titlePrefill: title,
          summaryPrefill: description,
          occurred: "Earlier today",
          reportedBy: "A member told me about it",
          requestedOutcome: rule?.outcome ?? outcome,
          fields,
        },
      });
    }
  }
  return out;
}

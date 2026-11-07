// Maps a library template onto the dynamic form builder.
//
// A template stores its own taxonomy ("Membership" / "Freeze Issue") while the
// builder works in the CATEGORY_MAP taxonomy ("Pricing and Memberships" /
// "Membership Pause and Freeze Policy"). resolveTemplateForm() bridges the two
// and returns everything the builder needs to prefill: category, subcategory,
// studio/area restrictions and the exact field set.

import { CATEGORY_MAP, IRIS_STUDIOS, SYSTEMS } from "./iris-constants";
import type { TicketTemplate, TemplateField, TemplateForm } from "./templates";
import type { Priority } from "./types";

type Pair = [category: string, subcategory: string];

/** Fallback per template category. */
const CATEGORY_FALLBACK: Record<string, Pair> = {
  Membership: ["Pricing and Memberships", "Membership Upgrade/Downgrade"],
  Payment: ["Pricing and Memberships", "Refund and Cancellation Policy Issue"],
  Facilities: ["Repair and Maintenance", "General Studio Repairs & Maintenance"],
  IT: ["Operating Systems", "Technical Assistance"],
  Scheduling: ["Scheduling", "Booking Restrictions"],
  "Client Experience": ["Customer Service and Communication", "Handling of Complaints"],
  HR: ["Internal Operations & Admin", "Performance Review / Payroll / Leave (HR-Admin)"],
  Marketing: ["Brand Feedback", "Marketing Collateral Production & Review"],
  Operations: ["Internal Operations & Admin", "Internal Operations Memo / Escalation"],
};

/** `${template category}|${template subcategory}` -> builder category/subcategory. */
const SUBCATEGORY_MAP: Record<string, Pair> = {
  "Membership|Freeze Issue": ["Pricing and Memberships", "Membership Pause and Freeze Policy"],
  "Membership|Freeze Request": ["Pricing and Memberships", "Membership Pause and Freeze Policy"],
  "Membership|Policy Exception": ["Pricing and Memberships", "Membership Pause and Freeze Policy"],
  "Membership|Credit Discrepancy": ["Pricing and Memberships", "Class Pack Expiry Confusion"],
  "Membership|Expiry": ["Pricing and Memberships", "Class Pack Expiry Confusion"],
  "Membership|Change Request": ["Pricing and Memberships", "Membership Upgrade/Downgrade"],
  "Membership|Upgrade": ["Pricing and Memberships", "Membership Upgrade/Downgrade"],
  "Membership|Transfer": ["Pricing and Memberships", "Studio Location & Pricing Preference"],
  "Membership|Cancellation": ["Pricing and Memberships", "Refund and Cancellation Policy Issue"],
  "Membership|Refund": ["Pricing and Memberships", "Refund and Cancellation Policy Issue"],
  "Membership|Payment Issue": ["Pricing and Memberships", "Auto-Renewal Concerns"],
  "Membership|Renewal": ["Pricing and Memberships", "Auto-Renewal Concerns"],
  "Membership|Auto-Renewal": ["Pricing and Memberships", "Auto-Renewal Concerns"],
  "Membership|Billing Error": ["Tech Issues", "Incorrect Charges on Account"],
  "Membership|Promo Code": ["Pricing and Memberships", "Discounts and Offers Confusion"],
  "Membership|Referral": ["Pricing and Memberships", "Referral Discount Issues"],
  "Membership|Corporate": ["Pricing and Memberships", "Corporate Wellness Program Pricing"],
  "Membership|Documentation": ["Pricing and Memberships", "Transparency in TandC/"],
  "Membership|Guest Pass": ["Pricing and Memberships", "Additional Membership Perks"],
  "Membership|Reactivation": ["Pricing and Memberships", "Membership Flexibility"],
  "Payment|Missing Transaction": ["Tech Issues", "Payment Processing Delays"],
  "Payment|Refund Delay": ["Pricing and Memberships", "Refund and Cancellation Policy Issue"],
  "Payment|Wrong Amount": ["Tech Issues", "Incorrect Charges on Account"],
  "Payment|Retry": ["Tech Issues", "Payment Processing Delays"],
  "Payment|Gateway Issue": ["Operating Systems", "Stripe and Razorpay"],
  "Payment|Invoice": ["Tech Issues", "Digital Receipts and Invoices"],
  "Payment|GST": ["Tech Issues", "Digital Receipts and Invoices"],
  "Payment|Payment Plan": ["Pricing and Memberships", "Lack of Payment Plan Options"],
  "Payment|Authorization": ["Pricing and Memberships", "Policy Non-Compliance / Unauthorised Refunds"],
  "Facilities|HVAC": ["Repair and Maintenance", "AC & Ventilation Repairs"],
  "Facilities|HVAC Maintenance": ["Repair and Maintenance", "AC & Ventilation Repairs"],
  "Facilities|Audio": ["Repair and Maintenance", "Audio, Mic & Headphone Malfunction"],
  "Facilities|Equipment": ["Repair and Maintenance", "Strength Studio Equipment Repairs"],
  "Facilities|Equipment Request": ["Studio Amenities and Facilities", "Availability of Gym Accessories"],
  "Facilities|Plumbing": ["Repair and Maintenance", "Washroom & Plumbing Repairs"],
  "Facilities|Electrical": ["Repair and Maintenance", "Electrical & Power Issues"],
  "Facilities|Cleaning": ["Repair and Maintenance", "Housekeeping & Cleaning Issues"],
  "Facilities|Lockers": ["Studio Amenities and Facilities", "Locker Availability"],
  "Facilities|Lighting": ["Repair and Maintenance", "Studio Lighting Malfunction & Repairs"],
  "Facilities|Pest Control": ["Repair and Maintenance", "Pest Control Needed"],
  "Facilities|Safety": ["Repair and Maintenance", "Fire Safety Compliance"],
  "Facilities|Amenities": ["Repair and Maintenance", "Water Dispenser Issues"],
  "Facilities|Signage": ["Miscellaneous", "Outdoor Signage Visibility"],
  "IT|Momence": ["Operating Systems", "Software Bugs"],
  "IT|Network": ["Operating Systems", "Router Connectivity"],
  "IT|POS": ["Operating Systems", "POS System Malfunctions"],
  "IT|Hardware": ["Tech Issues", "Laptops Not Functioning"],
  "IT|Software": ["Operating Systems", "Technical Assistance"],
  "IT|Email": ["Operating Systems", "Technical Assistance"],
  "IT|Mobile": ["Operating Systems", "Mobile App Freezing"],
  "IT|Security": ["Safety and Security", "CCTV Malfunction"],
  "IT|Integration": ["Operating Systems", "CRM System Errors"],
  "IT|Access": ["Tech Issues", "Password and Login Issues"],
  "IT|Backup": ["Operating Systems", "Data Security Issues"],
  "Scheduling|Recurring": ["Scheduling", "Booking Confirmation Issues"],
  "Scheduling|Check-in": ["Repair and Maintenance", "Attendance / Check-in Discrepancy"],
  "Scheduling|Cancellation": ["Scheduling", "Last-minute Cancellations"],
  "Scheduling|Waitlist": ["Scheduling", "Waitlist Concerns"],
  "Scheduling|Schedule Change": ["Scheduling", "Time Change"],
  "Scheduling|Booking Error": ["Tech Issues", "Wrong Class Bookings"],
  "Scheduling|Instructor": ["Trainer Feedback", "Trainer No-Show / Late Arrival"],
  "Scheduling|Overbooking": ["Scheduling", "Class Overbooking / Unregistered Attendance"],
  "Scheduling|Attendance": ["Operating Systems", "Attendance Record Discrepancies"],
  "Scheduling|Notifications": ["Tech Issues", "Notifications Not Received"],
  "Scheduling|Special Event": ["Scheduling", "Workshop / Event Capacity & Planning"],
  "Scheduling|Refund": ["Tech Issues", "Wrong Class Bookings"],
  "Client Experience|Complaint": ["Class Experience", "Class Format Satisfaction"],
  "Client Experience|Safety": ["Class Experience", "Member Injury During Class"],
  "Client Experience|Feedback": ["Brand Feedback", "Client Testimonials Management"],
  "Client Experience|Suggestion": ["Customer Service and Communication", "Proactive Client Engagement"],
  "Client Experience|Accommodation": ["Scheduling", "Special Request Accommodations"],
  "Client Experience|Lost & Found": ["Theft and Lost Items", "Items Left Behind by Clients"],
  "Client Experience|Conduct": ["Safety and Security", "Client Harassment Reports"],
  "Client Experience|Policy Dispute": ["Scheduling", "Cancellation Policy"],
  "Client Experience|Engagement": ["Brand Feedback", "Member Recognition Efforts"],
  "Client Experience|VIP": ["Customer Service and Communication", "Proactive Client Engagement"],
  "HR|Leave": ["Internal Operations & Admin", "Performance Review / Payroll / Leave (HR-Admin)"],
  "HR|Scheduling": ["Internal Operations & Admin", "Handover / Shift Reporting Gap"],
  "HR|Payroll": ["Internal Operations & Admin", "Performance Review / Payroll / Leave (HR-Admin)"],
  "HR|Onboarding": ["Internal Operations & Admin", "HRIS & Shift Tooling Access (Zoho Shift)"],
  "HR|Offboarding": ["Internal Operations & Admin", "HRIS & Shift Tooling Access (Zoho Shift)"],
  "HR|Training": ["Customer Service and Communication", "Training of Customer Service Team"],
  "HR|Uniform": ["Repair and Maintenance", "Staff Uniforms Not Clean"],
  "Marketing|Campaign": ["Brand Feedback", "Marketing Collateral Production & Review"],
  "Marketing|Content": ["Brand Feedback", "Social Media Engagement"],
  "Marketing|Email": ["Brand Feedback", "Newsletter Effectiveness"],
  "Marketing|Promotion": ["Pricing and Memberships", "Discounts and Offers Confusion"],
  "Marketing|Communication": ["Customer Service and Communication", "Miscommunication on Offers"],
  "Marketing|Brand": ["Brand Feedback", "Branded Content Guidelines"],
  "Operations|Vendor": ["Repair and Maintenance", "Vendor / AMC Management"],
  "Operations|Inventory": ["Repair and Maintenance", "Toiletries and Supplies Low"],
  "Operations|Compliance": ["Internal Operations & Admin", "Quality Assurance Audit / Checklist Sign-off"],
  "Operations|Audit": ["Internal Operations & Admin", "Quality Assurance Audit / Checklist Sign-off"],
  "Operations|Access": ["Repair and Maintenance", "Doors, Locks & Fixture Repairs"],
  "Operations|Branding": ["Miscellaneous", "Outdoor Signage Visibility"],
  "Operations|Safety": ["Safety and Security", "Fire Drills Not Conducted"],
  "Operations|Closure": ["Internal Operations & Admin", "Internal Operations Memo / Escalation"],
  "Operations|Process": ["Internal Operations & Admin", "SOP & Policy Governance (issue, version, publish)"],
  "Operations|Insurance": ["Internal Operations & Admin", "Internal Operations Memo / Escalation"],
};

/** Template priority <-> the builder's priority words. */
export const PRIORITY_TO_FORM: Record<Priority, "critical" | "high" | "medium" | "low"> = {
  P0: "critical", P1: "high", P2: "medium", P3: "low",
};
export const FORM_TO_PRIORITY: Record<string, Priority> = { critical: "P0", high: "P1", medium: "P2", low: "P3" };

function isValidPair(c?: string, s?: string): c is string {
  return !!c && !!s && (CATEGORY_MAP[c] ?? []).includes(s);
}

/** Resolve the builder category/subcategory for a template. */
export function templateTaxonomy(t: TicketTemplate): { category: string; subcategory: string } {
  const f = t.form;
  if (f?.category && isValidPair(f.category, f.subcategory)) return { category: f.category, subcategory: f.subcategory! };
  const hit = SUBCATEGORY_MAP[`${t.category}|${t.subcategory ?? ""}`];
  if (hit && isValidPair(hit[0], hit[1])) return { category: hit[0], subcategory: hit[1] };
  const fb = CATEGORY_FALLBACK[t.category];
  if (fb && isValidPair(fb[0], fb[1])) return { category: fb[0], subcategory: fb[1] };
  if (f?.category && CATEGORY_MAP[f.category]) return { category: f.category, subcategory: f.subcategory && CATEGORY_MAP[f.category].includes(f.subcategory) ? f.subcategory : "" };
  return { category: "", subcategory: "" };
}

/* ---------------- field derivation ---------------- */

/** Fields the builder already collects in its own steps. */
const BUILT_IN_FIELDS = new Set(["clientName", "studio", "location", "area", "issueDescription"]);

export function humanize(id: string): string {
  const spaced = id.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ").trim().toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function inferType(id: string): TemplateField["type"] {
  if (/(^|[a-z])date$|^date$|^deadline$|^startTime$|lastWorkingDay|lastSuccessfulSync|lastBackupDate|approvedDate/i.test(id)) return "date";
  if (/amount|price|quantity|budget|cost|count|capacity|bookedCount|installment|waitlistPosition|expectedBalance|showingBalance|refundAmount|totalAmount|chargedAmount|correctAmount/i.test(id)) return "number";
  if (/description|details|reason|notes|narrative|suggestion|message|content|justification|feedback|complaint|grievance|injury|damage|error|behavior|conflict|dispute|finding|scope|items|bookingDetails|sessionDetails|incorrectRecord|correctRecord|newDetails|expectedDetails|expectedResult/i.test(id)) return "textarea";
  return "text";
}

/** Whether the studio picker should be restricted, and to which full names. */
function studioNames(shortNames: string[]): string[] {
  const out: string[] = [];
  for (const short of shortNames) {
    const key = short.toLowerCase();
    const hit = IRIS_STUDIOS.find((s) => s.name.toLowerCase().startsWith(key) || key.startsWith(s.name.toLowerCase().split(",")[0]));
    if (hit && !out.includes(hit.name)) out.push(hit.name);
  }
  return out;
}

/**
 * The effective form definition for a template: the stored `form` when it has
 * fields, otherwise one derived from requiredFields / conditionalFields /
 * customFields / prefilledOptions.
 */
export function resolveTemplateForm(t: TicketTemplate): TemplateForm & { category: string; subcategory: string } {
  const tax = templateTaxonomy(t);
  if (t.form && t.form.fields) {
    return { ...t.form, category: tax.category, subcategory: tax.subcategory };
  }
  const fields = new Map<string, TemplateField>();
  for (const id of t.requiredFields) {
    if (BUILT_IN_FIELDS.has(id)) continue;
    fields.set(id, { id, label: humanize(id), type: inferType(id), required: true });
  }
  for (const c of t.conditionalFields ?? []) {
    if (BUILT_IN_FIELDS.has(c.field)) continue;
    const prev = fields.get(c.field);
    fields.set(c.field, {
      id: c.field,
      label: c.condition.replace(/\?$/, "") || humanize(c.field),
      type: "select",
      options: [...c.options],
      required: prev?.required ?? false,
    });
  }
  for (const c of t.customFields ?? []) {
    if (fields.has(c.name) || BUILT_IN_FIELDS.has(c.name)) continue;
    const type: TemplateField["type"] =
      c.type === "boolean" ? "checkbox" : c.type === "number" ? "number" : c.type === "date" ? "date" : c.options?.length ? "select" : "text";
    fields.set(c.name, { id: c.name, label: humanize(c.name), type, options: c.options, default: type === "checkbox" ? false : undefined });
  }
  let studioOptions: string[] | undefined;
  let areaOptions: string[] | undefined;
  for (const p of t.prefilledOptions ?? []) {
    if (p.field === "studio") studioOptions = studioNames(p.options);
    else if (p.field === "location") areaOptions = [...p.options];
    else if (fields.has(p.field)) {
      const f = fields.get(p.field)!;
      fields.set(p.field, { ...f, type: "select", options: [...p.options] });
    }
  }
  const system = t.category === "IT" && /momence/i.test(t.subcategory ?? "") ? "Momence" : t.departmentCode === "ITS" && /Wi-?Fi/i.test(t.title) ? "Wi-Fi / router" : undefined;
  return {
    category: tax.category,
    subcategory: tax.subcategory,
    system: system && (SYSTEMS as readonly string[]).includes(system) ? system : undefined,
    studioOptions: studioOptions?.length ? studioOptions : undefined,
    areaOptions,
    fields: [...fields.values()],
  };
}

/** Initial values for a template's fields (checkbox/select/other defaults). */
export function initialFieldValues(fields: TemplateField[]): Record<string, string | boolean | string[]> {
  const out: Record<string, string | boolean | string[]> = {};
  for (const f of fields) {
    if (f.default !== undefined) out[f.id] = f.default;
    else if (f.type === "checkbox") out[f.id] = false;
    else if (f.type === "multiselect") out[f.id] = [];
    else out[f.id] = "";
  }
  return out;
}

export function isFieldFilled(f: TemplateField, v: string | boolean | string[] | undefined): boolean {
  if (f.type === "checkbox") return true; // a checkbox always has an answer
  if (Array.isArray(v)) return v.length > 0;
  return typeof v === "string" && v.trim().length > 0;
}

export function formatFieldValue(v: string | boolean | string[] | undefined): string {
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (Array.isArray(v)) return v.join(", ");
  return (v ?? "").toString().trim();
}

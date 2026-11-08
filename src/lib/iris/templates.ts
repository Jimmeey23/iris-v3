// IRIS — Ticket template library for Physique 57 India.
//
// 260+ built-in preset ticket forms covering operational scenarios across the
// Mumbai & Bengaluru studios. Each template lives in a category catalogue under
// ./template-library and is organised by the Category → Sub-category taxonomy
// in ./template-taxonomy (which drives the Templates page drill-down).
//
// TICKET_TEMPLATES is the *live* list: library-api.ts replaces its contents in
// place with the rows stored in Neon (templates are editable by managers).
// BUILTIN_TEMPLATES is the immutable in-code catalogue.

import type { TicketTemplate } from "./template-types";
import { MEMBERSHIP_TEMPLATES } from "./template-library/membership";
import { PAYMENT_TEMPLATES } from "./template-library/payment";
import { SCHEDULING_TEMPLATES } from "./template-library/scheduling";
import { CLASS_TRAINER_TEMPLATES } from "./template-library/class-trainer";
import { CLIENT_EXPERIENCE_TEMPLATES } from "./template-library/client-experience";
import { FACILITIES_TEMPLATES } from "./template-library/facilities";
import { EQUIPMENT_TEMPLATES } from "./template-library/equipment";
import { IT_TEMPLATES } from "./template-library/it-systems";
import { SAFETY_TEMPLATES } from "./template-library/safety";
import { OPERATIONS_TEMPLATES } from "./template-library/operations";
import { HR_TEMPLATES } from "./template-library/hr";
import { MARKETING_TEMPLATES } from "./template-library/marketing";

export type { TicketTemplate, TemplateField, TemplateForm, TemplateFieldType, TemplatePriority } from "./template-types";

function codeNumber(code: string): number {
  const n = Number.parseInt(code.replace(/\D+/g, ""), 10);
  return Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER;
}

/** Immutable built-in catalogue, ordered by template code. */
export const BUILTIN_TEMPLATES: readonly TicketTemplate[] = Object.freeze(
  [
    ...MEMBERSHIP_TEMPLATES,
    ...PAYMENT_TEMPLATES,
    ...SCHEDULING_TEMPLATES,
    ...CLASS_TRAINER_TEMPLATES,
    ...CLIENT_EXPERIENCE_TEMPLATES,
    ...FACILITIES_TEMPLATES,
    ...EQUIPMENT_TEMPLATES,
    ...IT_TEMPLATES,
    ...SAFETY_TEMPLATES,
    ...OPERATIONS_TEMPLATES,
    ...HR_TEMPLATES,
    ...MARKETING_TEMPLATES,
  ].sort((a, b) => codeNumber(a.code) - codeNumber(b.code)),
);

export const BUILTIN_TEMPLATE_CODES: ReadonlySet<string> = new Set(BUILTIN_TEMPLATES.map((t) => t.code));

/** Live, mutable template list (hydrated from Neon by library-api.ts). */
export const TICKET_TEMPLATES: TicketTemplate[] = [...BUILTIN_TEMPLATES];

/** Live view of the categories in use (templates are editable, so this is a function). */
export function templateCategories(): string[] {
  return Array.from(new Set(TICKET_TEMPLATES.map((t) => t.category))).sort();
}
export const TEMPLATE_CATEGORIES = templateCategories();

export const TEMPLATE_MAP: Record<string, TicketTemplate> = Object.fromEntries(
  TICKET_TEMPLATES.map((t) => [t.code, t]),
);

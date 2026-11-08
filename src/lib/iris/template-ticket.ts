// IRIS - Turn a filled-in preset template form into a real ticket payload.
//
// Pure functions (no React, no network) shared by the Preset Ticket Builder on
// the Templates page and covered by scripts/unit/template-ticket.test.ts. The
// builder previews exactly what assembleTicketDescription() produces, and
// submits exactly what buildTicketPayload() returns, via ticketsApi.create().

import { inferDepartment } from "./iris-constants";
import { formatFieldValue, isFieldFilled } from "./template-form";
import { SEVERITY_BY_PRIORITY } from "./template-types";
import type { TemplateField, TemplatePriority, TicketTemplate } from "./template-types";

export type FieldValue = string | boolean | string[];
export type FieldValues = Record<string, FieldValue>;

/** Studio choice for tickets that aren't tied to one studio (head office, all studios). */
export const NOT_STUDIO_SPECIFIC = "All studios / not studio-specific";

/** Routing-queue id returned by inferDepartment() -> department code (mirrors the intake form). */
export const QUEUE_TO_DEPARTMENT: Record<string, string> = {
  training: "TRN",
  operations: "OPS",
  "sales-client-servicing": "SCS",
  marketing: "MKT",
  management: "MGT",
  accounts: "PAY",
};

export const MIN_TITLE_LENGTH = 6;
export const MIN_SUMMARY_LENGTH = 12;

/** The template + its resolved preset form (see resolveTemplateForm). */
export interface TemplateTicketContext {
  template: TicketTemplate;
  /** CATEGORY_MAP category / subcategory the ticket is filed under. */
  category: string;
  subcategory: string;
  fields: TemplateField[];
}

/** Everything the person raising the ticket has entered. */
export interface TemplateTicketDraft {
  title: string;
  summary: string;
  /** Full IRIS studio name, NOT_STUDIO_SPECIFIC, or "" when not chosen yet. */
  studio: string;
  area: string;
  occurred: string;
  reportedBy: string;
  system: string;
  priority: TemplatePriority;
  requestedOutcome: string;
  /** Department code, or "" to let server-side routing decide. */
  departmentCode: string;
  notes: string;
  values: FieldValues;
}

export interface TicketPayloadOptions {
  /** Studio code from the live STUDIOS list (omit when the studio has no code). */
  studioCode?: string;
  idempotencyKey?: string;
}

/** Ticket title: the template's prefill, personalised with the member's name when known. */
export function defaultTicketTitle(prefill: string, memberName?: string): string {
  const base = prefill.trim();
  const who = (memberName ?? "").trim();
  return who ? `${base} - ${who}` : base;
}

/** Department for the ticket: the template's own when it exists, else the queue inferred from the category. */
export function resolveTemplateDepartment(
  templateDept: string | undefined,
  ticketCategory: string,
  isKnownDepartment: (code: string) => boolean,
): string {
  if (templateDept && isKnownDepartment(templateDept)) return templateDept;
  const inferred = QUEUE_TO_DEPARTMENT[inferDepartment(ticketCategory)];
  return inferred && isKnownDepartment(inferred) ? inferred : "";
}

/** Labels of everything that still blocks submission, in form order. */
export function missingRequired(ctx: TemplateTicketContext, draft: TemplateTicketDraft): string[] {
  const out: string[] = [];
  if (draft.title.trim().length < MIN_TITLE_LENGTH) out.push("Ticket title");
  if (draft.summary.trim().length < MIN_SUMMARY_LENGTH) out.push("Summary");
  if (!draft.studio) out.push("Studio");
  for (const f of ctx.fields) {
    if (f.required && !isFieldFilled(f, draft.values[f.id])) out.push(f.label);
  }
  return out;
}

/** Required items (basics + required scenario fields) and how many are complete. */
export function completion(ctx: TemplateTicketContext, draft: TemplateTicketDraft): { done: number; total: number } {
  const total = 3 + ctx.fields.filter((f) => f.required).length;
  return { done: total - missingRequired(ctx, draft).length, total };
}

/** "Label: value" pairs for every answered scenario field (checkboxes always answer Yes / No). */
export function fieldLines(fields: TemplateField[], values: FieldValues): Array<[label: string, value: string]> {
  const out: Array<[string, string]> = [];
  for (const f of fields) {
    const v = values[f.id];
    if (f.type !== "checkbox" && !isFieldFilled(f, v)) continue;
    const text = formatFieldValue(f.type === "checkbox" ? v === true : v);
    // "What happened?" reads better as "What happened: …" in the ticket.
    if (text) out.push([f.label.trim().replace(/[?:]+$/, ""), text]);
  }
  return out;
}

function memberName(values: FieldValues): string {
  const v = values.memberName;
  return typeof v === "string" ? v.trim() : "";
}

/** The ticket description: summary, context, scenario answers, requested outcome and notes. */
export function assembleTicketDescription(ctx: TemplateTicketContext, draft: TemplateTicketDraft): string {
  const { template } = ctx;
  const context: Array<[string, string]> = [
    ["Template", `${template.code} · ${template.title}`],
    ["Studio", draft.studio],
    ["Area", draft.area],
    ["When", draft.occurred],
    ["Reported by", draft.reportedBy],
    ["System", draft.system],
  ];
  const lines = (pairs: Array<[string, string]>) =>
    pairs
      .filter(([, v]) => v && v.trim())
      .map(([k, v]) => `${k}: ${v.trim()}`)
      .join("\n");
  const details = fieldLines(ctx.fields, draft.values);
  const closing: Array<[string, string]> = [
    ["Requested outcome", draft.requestedOutcome],
    ["Notes", draft.notes],
  ];
  return [
    draft.summary.trim(),
    lines(context),
    details.length ? `Details\n${lines(details)}` : "",
    lines(closing),
  ]
    .filter(Boolean)
    .join("\n\n");
}

/** Body for POST /api/tickets (ticketsApi.create). */
export function buildTicketPayload(
  ctx: TemplateTicketContext,
  draft: TemplateTicketDraft,
  opts: TicketPayloadOptions = {},
): Record<string, unknown> {
  const { template } = ctx;
  const details = fieldLines(ctx.fields, draft.values);
  const client = memberName(draft.values);
  const contact = typeof draft.values.memberContact === "string" ? draft.values.memberContact.trim() : "";
  const studio = draft.studio === NOT_STUDIO_SPECIFIC ? "" : draft.studio;
  const payload: Record<string, unknown> = {
    title: draft.title.trim().slice(0, 200),
    description: assembleTicketDescription(ctx, draft),
    category: ctx.category,
    subcategory: ctx.subcategory || undefined,
    priority: draft.priority,
    severity: SEVERITY_BY_PRIORITY[draft.priority],
    studioCode: studio && opts.studioCode ? opts.studioCode : undefined,
    departmentCode: draft.departmentCode || undefined,
    departmentCodes: draft.departmentCode ? [draft.departmentCode] : undefined,
    affectedClient: client || undefined,
    recommendedResolution:
      [draft.requestedOutcome && `Requested outcome: ${draft.requestedOutcome}`, template.recommendedActions]
        .filter(Boolean)
        .join("\n\n") || undefined,
    source: "form_intake",
    tags: [ctx.category, ctx.subcategory, template.code].filter(Boolean),
    collectedInfo: {
      templateCode: template.code,
      templateTitle: template.title,
      templateCategory: template.category,
      templateSubcategory: template.subcategory,
      studio: studio || undefined,
      area: draft.area || undefined,
      occurred: draft.occurred || undefined,
      reportedBy: draft.reportedBy || undefined,
      system: draft.system || undefined,
      requestedOutcome: draft.requestedOutcome || undefined,
      notes: draft.notes.trim() || undefined,
      affectedClient: client || undefined,
      memberContact: contact || undefined,
      templateFields: Object.fromEntries(details),
      templateValues: draft.values,
    },
  };
  if (opts.idempotencyKey) payload.idempotencyKey = opts.idempotencyKey;
  return payload;
}

import "server-only";
import type { PoolClient } from "pg";

/**
 * Row <-> API mapping and validation for iris.ticket_templates and
 * iris.knowledge_docs. Writes are guarded by RLS (manager/admin only); this
 * file only shapes and sanity-checks the payloads.
 */

type Row = Record<string, any>;
const PRIORITIES = ["P0", "P1", "P2", "P3"];
const FIELD_TYPES = ["text", "textarea", "number", "select", "multiselect", "checkbox", "date"];

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : undefined);
const strList = (v: unknown, max = 100, len = 200) =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").map((x) => x.trim().slice(0, len)).filter(Boolean).slice(0, max) : undefined;

/* ---------------- templates ---------------- */

export function templateFromRow(r: Row) {
  return {
    code: r.code,
    title: r.title,
    description: r.description,
    category: r.category,
    subcategory: r.subcategory ?? undefined,
    departmentCode: r.department_code ?? "",
    defaultPriority: r.default_priority,
    defaultSeverity: r.default_severity ?? undefined,
    suggestedAssigneeRole: r.suggested_assignee_role ?? undefined,
    requiredFields: r.required_fields ?? [],
    conditionalFields: r.conditional_fields ?? [],
    customFields: r.custom_fields ?? [],
    prefilledOptions: r.prefilled_options ?? [],
    recommendedActions: r.recommended_actions,
    estimatedResolutionHours: r.estimated_resolution_hours,
    form: r.form ?? undefined,
  };
}

function cleanForm(v: any): { ok: true; value: Row | null } | { ok: false; error: string } {
  if (v === null) return { ok: true, value: null };
  if (typeof v !== "object" || !Array.isArray(v.fields)) return { ok: false, error: "Invalid form definition" };
  if (v.fields.length > 80) return { ok: false, error: "Too many form fields (max 80)" };
  const seen = new Set<string>();
  const fields: Row[] = [];
  for (const f of v.fields) {
    const id = str(f?.id, 60);
    const label = str(f?.label, 160);
    if (!id || !/^[A-Za-z][A-Za-z0-9_]*$/.test(id)) return { ok: false, error: `Field id "${id ?? ""}" must be letters, numbers or _` };
    if (seen.has(id)) return { ok: false, error: `Duplicate field id "${id}"` };
    seen.add(id);
    if (!label) return { ok: false, error: `Field "${id}" needs a label` };
    if (!FIELD_TYPES.includes(f.type)) return { ok: false, error: `Field "${id}" has an invalid type` };
    const options = strList(f.options, 60, 120);
    if ((f.type === "select" || f.type === "multiselect") && !options?.length) return { ok: false, error: `Field "${label}" needs at least one option` };
    const out: Row = { id, label, type: f.type };
    if (f.required) out.required = true;
    if (options?.length && (f.type === "select" || f.type === "multiselect")) out.options = options;
    if (f.default !== undefined && f.default !== "") out.default = f.default;
    const helper = str(f.helper, 200);
    if (helper) out.helper = helper;
    fields.push(out);
  }
  const out: Row = { fields };
  for (const k of ["category", "subcategory", "studio", "area", "occurred", "reportedBy", "system", "requestedOutcome", "titlePrefill", "summaryPrefill"]) {
    const s = str(v[k], 600);
    if (s) out[k] = s;
  }
  for (const k of ["studioOptions", "areaOptions"]) {
    const l = strList(v[k], 30, 120);
    if (l?.length) out[k] = l;
  }
  return { ok: true, value: out };
}

/** Build a column->value map from a request body. `create` requires title/category. */
export function templateColumns(b: Row, create: boolean): { cols: Record<string, unknown>; error?: string } {
  const cols: Record<string, unknown> = {};
  const title = str(b.title, 200);
  if (create && !title) return { cols, error: "Title is required" };
  if (b.title !== undefined) {
    if (!title) return { cols, error: "Title is required" };
    cols.title = title;
  }
  const category = str(b.category, 120);
  if (create && !category) return { cols, error: "Category is required" };
  if (b.category !== undefined) {
    if (!category) return { cols, error: "Category is required" };
    cols.category = category;
  }
  if (b.description !== undefined) cols.description = str(b.description, 4000) ?? "";
  if (b.subcategory !== undefined) cols.subcategory = str(b.subcategory, 200) || null;
  if (b.departmentCode !== undefined) cols.department_code = str(b.departmentCode, 20)?.toUpperCase() || null;
  if (b.defaultPriority !== undefined) {
    if (!PRIORITIES.includes(b.defaultPriority)) return { cols, error: "Invalid priority" };
    cols.default_priority = b.defaultPriority;
  }
  if (b.defaultSeverity !== undefined) cols.default_severity = str(b.defaultSeverity, 40) || null;
  if (b.suggestedAssigneeRole !== undefined) cols.suggested_assignee_role = str(b.suggestedAssigneeRole, 120) || null;
  if (b.recommendedActions !== undefined) cols.recommended_actions = str(b.recommendedActions, 6000) ?? "";
  if (b.estimatedResolutionHours !== undefined) {
    const h = Number(b.estimatedResolutionHours);
    if (!Number.isFinite(h) || h < 1 || h > 2000) return { cols, error: "Estimated hours must be between 1 and 2000" };
    cols.estimated_resolution_hours = Math.round(h);
  }
  for (const [key, col] of [["requiredFields", "required_fields"], ["conditionalFields", "conditional_fields"], ["customFields", "custom_fields"], ["prefilledOptions", "prefilled_options"]] as const) {
    if (b[key] !== undefined) {
      if (!Array.isArray(b[key]) || b[key].length > 200) return { cols, error: `Invalid ${key}` };
      cols[col] = JSON.stringify(b[key]);
    }
  }
  if (b.form !== undefined) {
    const f = cleanForm(b.form);
    if (!f.ok) return { cols, error: f.error };
    cols.form = f.value === null ? null : JSON.stringify(f.value);
  }
  return { cols };
}

/* ---------------- knowledge docs ---------------- */

export function docFromRow(r: Row) {
  return {
    id: r.id,
    title: r.title,
    category: r.category,
    // Absent until db/migrations-knowledge-subcategories.sql runs; the client then falls
    // back to the shipped guide's sub-category (knowledge-base/groups.ts).
    subcategory: r.subcategory ?? undefined,
    summary: r.summary,
    steps: r.steps ?? [],
    body: r.body ?? "",
    tags: r.tags ?? [],
    prevention: r.prevention ?? undefined,
    escalation: r.escalation ?? undefined,
    relatedTemplates: r.related_templates ?? [],
  };
}

export function docColumns(b: Row, create: boolean): { cols: Record<string, unknown>; error?: string } {
  const cols: Record<string, unknown> = {};
  const title = str(b.title, 200);
  if (create && !title) return { cols, error: "Title is required" };
  if (b.title !== undefined) {
    if (!title) return { cols, error: "Title is required" };
    cols.title = title;
  }
  const category = str(b.category, 120);
  if (create && !category) return { cols, error: "Category is required" };
  if (b.category !== undefined) {
    if (!category) return { cols, error: "Category is required" };
    cols.category = category;
  }
  if (b.subcategory !== undefined) cols.subcategory = str(b.subcategory, 120) || null;
  if (b.summary !== undefined) cols.summary = str(b.summary, 2000) ?? "";
  if (b.body !== undefined) cols.body = typeof b.body === "string" ? b.body.slice(0, 60_000) : "";
  if (b.steps !== undefined) {
    const steps = strList(b.steps, 60, 1500);
    if (!steps) return { cols, error: "Invalid steps" };
    cols.steps = JSON.stringify(steps);
  }
  if (b.tags !== undefined) cols.tags = (strList(b.tags, 30, 40) ?? []).map((t) => t.toLowerCase());
  if (b.prevention !== undefined) cols.prevention = str(b.prevention, 3000) || null;
  if (b.escalation !== undefined) cols.escalation = str(b.escalation, 3000) || null;
  if (b.relatedTemplates !== undefined) cols.related_templates = strList(b.relatedTemplates, 30, 40) ?? [];
  return { cols };
}

// Migrations are applied by hand (README), so a deploy can briefly run against a
// database without knowledge_docs.subcategory. Remember the answer: once the column
// exists it stays; a "missing" answer is re-checked every minute.
let subcategoryColumn: { ok: boolean; at: number } | null = null;

export async function knowledgeSubcategorySupported(c: PoolClient): Promise<boolean> {
  if (subcategoryColumn?.ok) return true;
  if (subcategoryColumn && Date.now() - subcategoryColumn.at < 60_000) return false;
  const r = await c.query<{ ok: boolean }>(
    `select exists (
       select 1 from pg_attribute
        where attrelid = to_regclass('knowledge_docs') and attname = 'subcategory' and not attisdropped
     ) as ok`,
  );
  subcategoryColumn = { ok: r.rows[0]?.ok === true, at: Date.now() };
  return subcategoryColumn.ok;
}

/** Document columns the connected database can store (drops `subcategory` until its migration runs). */
export async function storableDocColumns(c: PoolClient, cols: Record<string, unknown>): Promise<Record<string, unknown>> {
  if (!("subcategory" in cols) || (await knowledgeSubcategorySupported(c))) return cols;
  const { subcategory: _unsupported, ...rest } = cols;
  return rest;
}

export const validId = (s: unknown, prefix?: string): s is string =>
  typeof s === "string" && /^[A-Za-z0-9][A-Za-z0-9_-]{1,39}$/.test(s) && (!prefix || s.startsWith(prefix));

/** Next sequential id such as TPL-112 / KB-026. */
export async function nextId(c: PoolClient, table: "ticket_templates" | "knowledge_docs") {
  const [col, prefix] = table === "ticket_templates" ? (["code", "TPL"] as const) : (["id", "KB"] as const);
  const r = await c.query(
    `select coalesce(max(substring(${col} from '^${prefix}-(\\d+)$')::int), 0) + 1 as n from ${table}`,
  );
  return `${prefix}-${String(r.rows[0].n).padStart(3, "0")}`;
}

export function insertSql(table: string, cols: Record<string, unknown>) {
  const keys = Object.keys(cols);
  return {
    text: `insert into ${table} (${keys.join(", ")}) values (${keys.map((_, i) => `$${i + 1}`).join(", ")}) returning *`,
    values: keys.map((k) => cols[k]),
  };
}

export function updateSql(table: string, keyCol: string, key: string, cols: Record<string, unknown>) {
  const keys = Object.keys(cols);
  return {
    text: `update ${table} set ${keys.map((k, i) => `${k} = $${i + 1}`).join(", ")} where ${keyCol} = $${keys.length + 1} returning *`,
    values: [...keys.map((k) => cols[k]), key],
  };
}

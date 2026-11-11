import { FIELDS, UNKNOWN, isSpecial, type FieldDef } from "./fields";
import { specFor } from "./specs";

export { FIELDS, UNKNOWN, isSpecial, SPECIAL_KEYS } from "./fields";
export type { FieldDef, FieldKind, SpecialKey } from "./fields";
export { SPECS, specFor, resolveSpec, normName, type SpecSource } from "./specs";

export type SpecField = FieldDef & { required: boolean };

/** Minimal view of intake state the schema needs (keeps this module UI-free). */
export type SchemaState = {
  category: string | null;
  subcategory: string | null;
  studioCode?: string | null;
  area?: string | null;
  member?: unknown;
  trainer?: unknown;
  session?: unknown;
  when?: string | null;
  details?: Record<string, string | undefined>;
  /** Fields the AI picked for a report whose subcategory has no spec; only used for that exact pick. */
  aiFields?: AiFields | null;
};

export type AiFields = { category: string; subcategory: string | null; keys: string[] };

/** The AI's field picks apply only while the reporter keeps the AI's category. */
export const aiKeysFor = (s: Pick<SchemaState, "category" | "subcategory" | "aiFields">) =>
  s.aiFields && s.aiFields.category === s.category && s.aiFields.subcategory === s.subcategory ? s.aiFields.keys : null;

/** Max fields the AI may add, so an AI-built form stays short. */
export const MAX_AI_FIELDS = 5;

/** Keep AI-picked keys that exist in the library and aren't pickers. */
export function cleanAiFields(keys: string[] | null | undefined): string[] {
  const out: string[] = [];
  for (const k of keys ?? []) {
    if (FIELDS[k] && !isSpecial(k) && !out.includes(k)) out.push(k);
    if (out.length >= MAX_AI_FIELDS) break;
  }
  return out;
}

const specialValue = (s: SchemaState, key: string): string => {
  switch (key) {
    case "studio": return s.studioCode ?? "";
    case "area": return s.area ?? "";
    case "member": return s.member ? "set" : s.details?.member ?? "";
    case "trainer": return s.trainer ? "set" : s.details?.trainer ?? "";
    case "session": return s.session ? "set" : s.details?.session ?? "";
    case "when": return s.when ?? "";
    default: return "";
  }
};

export const answerOf = (s: SchemaState, key: string): string =>
  (isSpecial(key) ? specialValue(s, key) : s.details?.[key] ?? "").trim();

/** The fields to show for this report, in order, with conditionals resolved. */
export function fieldsFor(s: SchemaState): SpecField[] {
  return specFor(s.category, s.subcategory, aiKeysFor(s))
    .map((raw) => {
      const key = raw.replace(/^\?/, "");
      const def = FIELDS[key];
      return def ? { ...def, required: !raw.startsWith("?") } : null;
    })
    .filter((d): d is SpecField => !!d)
    .filter((d) => !d.showIf || d.showIf.in.includes(answerOf(s, d.showIf.key)));
}

/** Required fields still unanswered ("Don't know" counts as answered). */
export function missingFields(s: SchemaState): SpecField[] {
  if (!s.category) return [];
  return fieldsFor(s).filter((f) => f.required && !answerOf(s, f.key));
}

export function progress(s: SchemaState) {
  const req = fieldsFor(s).filter((f) => f.required);
  const done = req.filter((f) => answerOf(s, f.key)).length;
  return { done, total: req.length };
}

export const isUnknown = (v: string | undefined) => v === UNKNOWN;

/**
 * Compact catalogue for the AI prompt: every non-picker field with its allowed
 * options. Stable order so the cached prompt never changes between calls.
 */
export function fieldCatalogue(): string {
  return Object.values(FIELDS)
    .filter((d) => !isSpecial(d.key))
    .sort((a, b) => (a.key < b.key ? -1 : 1))
    .map((d) => `${d.key}: ${d.label}${d.options ? ` [${d.options.join(" / ")}]` : d.kind === "yesno" ? " [Yes / No]" : ""}`)
    .join("\n");
}

/** Keep only answers that belong to this report's spec and match the field's options. */
export function cleanAnswers(
  category: string | null,
  subcategory: string | null,
  answers: Array<{ key: string; value: string }>,
  aiKeys?: string[] | null,
) {
  const allowed = new Set(specFor(category, subcategory, aiKeys).map((k) => k.replace(/^\?/, "")));
  const out: Record<string, string> = {};
  for (const a of answers) {
    const def = FIELDS[a.key];
    const v = (a.value ?? "").trim().slice(0, 600);
    if (!def || isSpecial(a.key) || !allowed.has(a.key) || !v || v === UNKNOWN) continue;
    if (def.kind === "chips" && !def.options!.includes(v)) continue;
    if (def.kind === "yesno" && v !== "Yes" && v !== "No") continue;
    out[a.key] = v;
  }
  return out;
}

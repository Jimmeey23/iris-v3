import { normalizeRoutePriority } from "./routing-engine";

function unquote(v: string): string {
  const t = v.trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) return t.slice(1, -1).trim();
  return t;
}

/** Fields routing-engine `readTicketField` understands. Anything else reads as "" and never matches. */
export const ROUTING_FIELDS = [
  "category", "subcategory", "priority", "studio", "studio_code", "studio.city", "city",
  "department", "department_code", "source", "tags", "title", "description",
] as const;

/**
 * Problems that make a routing condition silently dead or misleading.
 * Mirrors the parsing in `matchesRoutingCondition`, so an empty result means
 * every clause is one the engine can evaluate.
 */
export function lintRoutingCondition(condition: string): string[] {
  const trimmed = (condition ?? "").trim();
  if (!trimmed) return ["Condition is empty, so the rule never matches."];
  const problems: string[] = [];
  const clauses = trimmed
    .split(/\s+OR\s+(?=[a-zA-Z0-9_.]+\s*(?:~=|!=|>=|<=|=))/i)
    .flatMap((g) => g.split(/\s+AND\s+(?=[a-zA-Z0-9_.]+\s*(?:~=|!=|>=|<=|=))/i))
    .map((c) => c.trim())
    .filter(Boolean);
  for (const clause of clauses) {
    const m = clause.match(/^([a-zA-Z0-9_.]+)\s*(~=|!=|>=|<=|=)\s*(.+)$/);
    if (!m) {
      problems.push(`"${clause}" isn't a field-operator-value clause.`);
      continue;
    }
    const field = m[1].toLowerCase();
    if (!(ROUTING_FIELDS as readonly string[]).includes(field)) {
      problems.push(`Unknown field "${m[1]}" — the clause can never be true.`);
    } else if (field === "priority" && !normalizeRoutePriority(unquote(m[3]))) {
      problems.push(`"${unquote(m[3])}" isn't a priority (use P0–P3 or Critical/High/Medium/Low).`);
    } else if ((m[2] === ">=" || m[2] === "<=") && field !== "priority" && !Number.isFinite(Number(unquote(m[3])))) {
      problems.push(`"${clause}" compares text with ${m[2]}, which only works on numbers.`);
    }
  }
  return problems;
}

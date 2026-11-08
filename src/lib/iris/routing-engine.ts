import type { Priority } from "./types";

export interface RoutingRuleRow {
  id: string;
  name: string;
  condition: string;
  department_code: string | null;
  priority: string;
  sort_order: number;
  is_active: boolean;
}

export interface RoutingTicketContext {
  category?: string | null;
  subcategory?: string | null;
  priority?: Priority | string | null;
  studioCode?: string | null;
  studioCity?: string | null;
  departmentCode?: string | null;
  source?: string | null;
  tags?: string[] | null;
  title?: string | null;
  description?: string | null;
}

export interface RoutingPolicyFlags {
  autoAssign: boolean;
  loadBalance: boolean;
  studioAffinity: boolean;
  roundRobinFallback: boolean;
  requireAcknowledgment: boolean;
}

export interface AssignableEmployee {
  id: string;
  name?: string;
  department_code: string;
  studio_codes: string[];
  availability: string;
  workload: number;
  max_workload: number;
  escalation_order: number;
  is_active: boolean;
}

const PRIORITY_WORD_MAP: Record<string, Priority> = {
  p0: "P0",
  critical: "P0",
  p1: "P1",
  high: "P1",
  p2: "P2",
  medium: "P2",
  p3: "P3",
  low: "P3",
};

const PRIORITY_URGENCY: Record<Priority, number> = {
  P0: 4,
  P1: 3,
  P2: 2,
  P3: 1,
};

export function normalizeRoutePriority(raw?: string | null): Priority | null {
  if (!raw) return null;
  const key = raw.trim().toLowerCase();
  if (key === "auto" || key === "") return null;
  return PRIORITY_WORD_MAP[key] ?? null;
}

function unquote(v: string): string {
  const t = v.trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1).trim();
  }
  return t;
}

function readTicketField(field: string, ctx: RoutingTicketContext): string {
  const f = field.trim().toLowerCase();
  switch (f) {
    case "category":
      return ctx.category ?? "";
    case "subcategory":
      return ctx.subcategory ?? "";
    case "priority":
      return normalizeRoutePriority(ctx.priority) ?? (ctx.priority ?? "");
    case "studio":
    case "studio_code":
      return ctx.studioCode ?? "";
    case "studio.city":
    case "city":
      return ctx.studioCity ?? "";
    case "department":
    case "department_code":
      return ctx.departmentCode ?? "";
    case "source":
      return ctx.source ?? "";
    case "tags":
      return (ctx.tags ?? []).join(",");
    case "title":
      return ctx.title ?? "";
    case "description":
      return ctx.description ?? "";
    default:
      return "";
  }
}

function evalClause(clause: string, ctx: RoutingTicketContext): boolean {
  const m = clause.trim().match(/^([a-zA-Z0-9_.]+)\s*(~=|!=|>=|<=|=)\s*(.+)$/);
  if (!m) return false;
  const [, rawField, op, rawRight] = m;
  const field = rawField.toLowerCase();
  const target = unquote(rawRight);
  const actual = readTicketField(field, ctx);

  if (field === "priority" && (op === ">=" || op === "<=" || op === "=" || op === "!=")) {
    const actualP = normalizeRoutePriority(actual);
    const targetP = normalizeRoutePriority(target);
    if (actualP && targetP) {
      const aRank = PRIORITY_URGENCY[actualP];
      const tRank = PRIORITY_URGENCY[targetP];
      if (op === "=") return aRank === tRank;
      if (op === "!=") return aRank !== tRank;
      if (op === ">=") return aRank >= tRank;
      if (op === "<=") return aRank <= tRank;
    }
  }

  const aLower = actual.trim().toLowerCase();
  const tLower = target.trim().toLowerCase();

  if (field === "tags") {
    const tagList = (ctx.tags ?? []).map((x) => x.trim().toLowerCase());
    if (op === "=") return tagList.includes(tLower);
    if (op === "!=") return !tagList.includes(tLower);
    if (op === "~=") return tagList.some((x) => x.includes(tLower));
  }

  switch (op) {
    case "=":
      return aLower === tLower;
    case "!=":
      return aLower !== tLower;
    case "~=":
      return tLower.length > 0 && aLower.includes(tLower);
    case ">=":
      return Number(actual) >= Number(target);
    case "<=":
      return Number(actual) <= Number(target);
    default:
      return false;
  }
}

export function matchesRoutingCondition(condition: string, ctx: RoutingTicketContext): boolean {
  const trimmed = (condition ?? "").trim();
  if (!trimmed) return false;

  // Split by top-level OR groups first, then AND clauses inside each OR group.
  // Use lookahead for `<field><op>` so multi-word values like "Repair and Maintenance" are never split.
  const orGroups = trimmed.split(/\s+OR\s+(?=[a-zA-Z0-9_.]+\s*(?:~=|!=|>=|<=|=))/i);
  return orGroups.some((group) => {
    const andClauses = group
      .split(/\s+AND\s+(?=[a-zA-Z0-9_.]+\s*(?:~=|!=|>=|<=|=))/i)
      .map((c) => c.trim())
      .filter(Boolean);
    if (!andClauses.length) return false;
    return andClauses.every((clause) => evalClause(clause, ctx));
  });
}

export function evaluateRoutingRules(
  rules: RoutingRuleRow[],
  ctx: RoutingTicketContext,
): {
  matchedRule: RoutingRuleRow | null;
  departmentCode: string | null;
  priority: Priority;
} {
  const ordered = [...rules]
    .filter((r) => r.is_active !== false)
    .sort((a, b) => (a.sort_order ?? 100) - (b.sort_order ?? 100) || a.name.localeCompare(b.name));

  let dept = ctx.departmentCode ?? null;
  let prio: Priority = normalizeRoutePriority(ctx.priority) ?? "P2";

  for (const rule of ordered) {
    if (matchesRoutingCondition(rule.condition, { ...ctx, departmentCode: dept, priority: prio })) {
      if (rule.department_code && rule.department_code !== "Any") {
        dept = rule.department_code;
      }
      const mappedPriority = normalizeRoutePriority(rule.priority);
      if (mappedPriority) {
        prio = mappedPriority;
      }
      return {
        matchedRule: rule,
        departmentCode: dept,
        priority: prio,
      };
    }
  }

  return {
    matchedRule: null,
    departmentCode: dept,
    priority: prio,
  };
}

/**
 * Selects the best owner for a ticket according to Settings > Routing toggles:
 *  - `autoAssign`: when false, returns null immediately.
 *  - `studioAffinity`: prefers candidates assigned to `studioCode`.
 *  - `loadBalance`: prefers candidates below `max_workload` with lowest utilization ratio;
 *    when false, picks in deterministic roster / specialist order.
 *  - `roundRobinFallback`: when all `available` below-cap department specialists are full or offline,
 *    falls back to `busy` active members in the department (or `MGT` operations), ordered by least load.
 */
export function selectBestAssignee(
  employees: AssignableEmployee[],
  opts: {
    departmentCode?: string | null;
    studioCode?: string | null;
    flags: RoutingPolicyFlags;
  },
): string | null {
  const { departmentCode, studioCode, flags } = opts;
  if (!flags.autoAssign || !departmentCode) return null;

  const active = employees.filter((e) => e.is_active !== false);
  const rankCandidates = (pool: AssignableEmployee[]) => {
    return [...pool].sort((a, b) => {
      // 1. Studio affinity first (if enabled and ticket has a studio)
      if (flags.studioAffinity && studioCode) {
        const aStudio = Array.isArray(a.studio_codes) && a.studio_codes.includes(studioCode) ? 0 : 1;
        const bStudio = Array.isArray(b.studio_codes) && b.studio_codes.includes(studioCode) ? 0 : 1;
        if (aStudio !== bStudio) return aStudio - bStudio;
      }
      // 2. Below max_workload before overloaded
      const aFull = a.workload >= Math.max(1, a.max_workload) ? 1 : 0;
      const bFull = b.workload >= Math.max(1, b.max_workload) ? 1 : 0;
      if (aFull !== bFull) return aFull - bFull;

      // 3. Load-balanced utilization ratio (when enabled)
      if (flags.loadBalance) {
        const aRatio = a.workload / Math.max(1, a.max_workload);
        const bRatio = b.workload / Math.max(1, b.max_workload);
        if (Math.abs(aRatio - bRatio) > 0.001) return aRatio - bRatio;
        if (a.workload !== b.workload) return a.workload - b.workload;
      }

      // 4. Prefer frontline specialists/executives (higher escalation_order) over directors/owners
      if ((b.escalation_order ?? 3) !== (a.escalation_order ?? 3)) {
        return (b.escalation_order ?? 3) - (a.escalation_order ?? 3);
      }
      return a.id.localeCompare(b.id);
    });
  };

  // Primary pool: available & below max_workload in target department
  const primaryPool = active.filter(
    (e) =>
      e.department_code === departmentCode &&
      e.availability === "available" &&
      e.workload < Math.max(1, e.max_workload),
  );
  if (primaryPool.length > 0) {
    return rankCandidates(primaryPool)[0].id;
  }

  if (!flags.roundRobinFallback) {
    return null;
  }

  // Fallback 1: available or busy in target department (even if at max_workload)
  const deptFallback = active.filter(
    (e) => e.department_code === departmentCode && (e.availability === "available" || e.availability === "busy"),
  );
  if (deptFallback.length > 0) {
    return rankCandidates(deptFallback)[0].id;
  }

  // Fallback 2: Operations/Management ('MGT') available staff
  const opsFallback = active.filter(
    (e) => e.department_code === "MGT" && e.availability === "available",
  );
  if (opsFallback.length > 0) {
    return rankCandidates(opsFallback)[0].id;
  }

  return null;
}

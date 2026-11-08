import "server-only";
import type { PoolClient } from "pg";
import { lintRoutingCondition } from "@/lib/iris/routing-lint";
import { normalizeRoutePriority } from "@/lib/iris/routing-engine";
import { googleConfigured } from "@/lib/server/google-auth";

export type HealthIssue = {
  id: string;
  severity: "error" | "warning";
  area: "routing" | "escalation" | "sla" | "access" | "notifications";
  title: string;
  detail: string;
  section: string; // settings section that fixes it
};

/**
 * Configuration checks for the rules that keep tickets moving: routing,
 * escalation, SLA, access. Read-only; runs under the caller's RLS.
 * Shared by Settings → Health Check and the weekly digest.
 */
export async function runHealthChecks(
  c: PoolClient,
  role: string,
): Promise<HealthIssue[]> {
  const out: HealthIssue[] = [];
  const q = async (sql: string) => (await c.query(sql)).rows;

  const departments = await q("select code, name, is_active, head_employee_id from departments");
  const activeDept = new Set(
    departments.filter((d) => d.is_active).map((d) => d.code),
  );
  const deptName = new Map(departments.map((d) => [d.code, d.name]));

  // ---- Routing -------------------------------------------------------
  const rules = await q(
    "select id, name, condition, department_code, priority, is_active from routing_rules where is_active",
  );
  for (const r of rules) {
    for (const p of lintRoutingCondition(r.condition)) {
      out.push({
        id: `route-cond-${r.id}-${p}`,
        severity: "error",
        area: "routing",
        title: `Rule "${r.name}" can't match as written`,
        detail: p,
        section: "routing",
      });
    }
    if (
      r.department_code &&
      r.department_code !== "Any" &&
      !activeDept.has(r.department_code)
    ) {
      out.push({
        id: `route-dept-${r.id}`,
        severity: "error",
        area: "routing",
        title: `Rule "${r.name}" routes to a missing or inactive department`,
        detail: `Department "${r.department_code}" isn't active, so matched tickets have no team.`,
        section: "routing",
      });
    }
    if (
      r.priority &&
      r.priority !== "Auto" &&
      !normalizeRoutePriority(r.priority)
    ) {
      out.push({
        id: `route-prio-${r.id}`,
        severity: "warning",
        area: "routing",
        title: `Rule "${r.name}" sets an unknown priority`,
        detail: `"${r.priority}" is ignored; the ticket keeps its own priority.`,
        section: "routing",
      });
    }
  }
  const dupes = new Map<string, string[]>();
  for (const r of rules) {
    const k = r.condition.trim().toLowerCase().replace(/\s+/g, " ");
    dupes.set(k, [...(dupes.get(k) ?? []), r.name]);
  }
  for (const [cond, names] of dupes)
    if (names.length > 1) {
      out.push({
        id: `route-dupe-${cond}`,
        severity: "warning",
        area: "routing",
        title: "Rules with the same condition",
        detail: `${names.join(", ")} - only the first in sort order ever applies.`,
        section: "routing",
      });
    }

  // ---- Escalation / staffing ----------------------------------------
  const staffing = await q(`
      select d.code,
             count(e.*) filter (where e.is_active) as active,
             count(e.*) filter (where e.is_active and not coalesce(e.exclude_from_escalation, false)) as escalatable
        from departments d
        -- members, plus the department head (who may sit in another department)
        left join employees e on (e.department_code = d.code or e.id = d.head_employee_id)
       where d.is_active group by d.code`);
  for (const s of staffing) {
    const name = deptName.get(s.code) ?? s.code;
    if (Number(s.active) === 0) {
      const routedBy = rules
        .filter((r) => r.department_code === s.code)
        .map((r) => `"${r.name}"`);
      out.push({
        id: `dept-empty-${s.code}`,
        severity: routedBy.length ? "error" : "warning",
        area: "escalation",
        title: `${name} has no active people`,
        detail: routedBy.length
          ? `${routedBy.join(", ")} route${routedBy.length === 1 ? "s" : ""} tickets here, and nobody can pick them up or be escalated to.`
          : "Tickets filed under this department can't be assigned or escalated.",
        section: "employees",
      });
    } else if (Number(s.escalatable) === 0) {
      out.push({
        id: `dept-noesc-${s.code}`,
        severity: "warning",
        area: "escalation",
        title: `Nobody in ${name} can receive escalations`,
        detail:
          "Everyone is excluded from escalation, so breaches stop at the first owner.",
        section: "employees",
      });
    }
  }
  const activeEmp = new Set((await q("select id from employees where is_active")).map((r) => r.id as string));
  const noHead = departments.filter((d) => d.is_active && (!d.head_employee_id || !activeEmp.has(d.head_employee_id)));
  if (noHead.length) {
    out.push({
      id: "dept-nohead",
      severity: "warning",
      area: "escalation",
      title: `${noHead.length} department${noHead.length > 1 ? "s have" : " has"} no head`,
      detail: `${noHead.map((d) => d.name).join(", ")} - the top escalation level has nobody to reach.`,
      section: "departments",
    });
  }

  // ---- SLA -----------------------------------------------------------
  for (const s of await q(
    "select priority, name, response_target_mins r, resolution_target_mins res, escalation_threshold_mins esc from sla_definitions",
  )) {
    if (s.r != null && s.res != null && s.r > s.res) {
      out.push({
        id: `sla-order-${s.priority}`,
        severity: "error",
        area: "sla",
        title: `${s.priority} responds slower than it resolves`,
        detail: `Response target ${s.r}m is longer than resolution target ${s.res}m.`,
        section: "sla",
      });
    }
    if (s.esc != null && s.res != null && s.esc > s.res) {
      out.push({
        id: `sla-esc-${s.priority}`,
        severity: "warning",
        area: "sla",
        title: `${s.priority} escalates after the SLA is already breached`,
        detail: `Escalation at ${s.esc}m, resolution due at ${s.res}m.`,
        section: "sla",
      });
    }
  }

  // ---- Access (admins only: RLS hides other users' rows from managers) --
  if (role === "admin") await checkAccess();
  async function checkAccess() {
    const [acc] = await q(`
      select count(*) filter (where role = 'admin' and is_active) as admins,
             count(*) filter (where is_active and employee_id is null) as unlinked,
             count(*) filter (where locked_until > now()) as locked
        from users`);
    if (Number(acc.admins) < 2) {
      out.push({
        id: "acc-admins",
        severity: "warning",
        area: "access",
        title: "Only one active admin",
        detail: "If that account is locked out, nobody can change settings.",
        section: "users",
      });
    }
    if (Number(acc.unlinked) > 0) {
      out.push({
        id: "acc-unlinked",
        severity: "warning",
        area: "access",
        title: `${acc.unlinked} active account${Number(acc.unlinked) > 1 ? "s aren't" : " isn't"} linked to an employee`,
        detail:
          "They can sign in but won't be assigned tickets or see their own queue.",
        section: "users",
      });
    }
    if (Number(acc.locked) > 0) {
      out.push({
        id: "acc-locked",
        severity: "warning",
        area: "access",
        title: `${acc.locked} account${Number(acc.locked) > 1 ? "s are" : " is"} locked`,
        detail: "Locked after 5 wrong passwords; unlock from Users & Access.",
        section: "users",
      });
    }
    if (!googleConfigured()) {
      out.push({
        id: "acc-google",
        severity: "warning",
        area: "access",
        title: "Google sign-in isn't configured",
        detail:
          "Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET. Google-only accounts can't sign in until then.",
        section: "users",
      });
    }
  }

  // ---- Notifications -------------------------------------------------
  if (!process.env.MAILTRAP_API_KEY && !process.env.MAILTRAP_SMTP_HOST) {
    out.push({
      id: "mail-none",
      severity: "warning",
      area: "notifications",
      title: "Email delivery isn't configured",
      detail: "Assignment, SLA and escalation emails are logged as skipped.",
      section: "notifications",
    });
  }
  out.sort((a, b) =>
    a.severity === b.severity ? 0 : a.severity === "error" ? -1 : 1,
  );
  return out;
}

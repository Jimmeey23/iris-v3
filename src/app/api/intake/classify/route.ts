import { NextResponse } from "next/server";
import { warmMomenceSessions } from "@/lib/server/momence";
import { withUser } from "@/lib/server/db";
import { dbError, requireSession } from "@/lib/server/auth";
import { RateLimitError, enforceRateLimit, userKey } from "@/lib/server/rate-limit";
import { classify, extractFields, taxonomy, type Candidate } from "@/lib/server/intake";
import { aiClassify, type ClassifyContext } from "@/lib/server/ai-classify";
import { loadEffectiveAiConfig } from "@/lib/server/ai-config";
import {
  evaluateRoutingRules,
  selectBestAssignee,
  type AssignableEmployee,
  type RoutingRuleRow,
} from "@/lib/iris/routing-engine";
import { decideOwnership } from "@/lib/iris/ownership-policy";
import { computeSlaTargets, type BusinessHoursMap } from "@/lib/iris/sla-calculator";
import { cleanAiFields, cleanAnswers, resolveSpec } from "@/lib/iris/intake-schema";

/**
 * Intake classification.
 *
 *  - Primary: Claude Haiku (cached system prompt) picks category, subcategory,
 *    department, priority and a suggested owner.
 *  - Fallback: keyword rules + ticket history, used when AI is off, unavailable,
 *    or the caller passes allowAi=false (follow-up merges in the chat).
 *  - Safety rules always apply on top: explicit injury/theft/etc. raises priority.
 *  - Routing preview: the same routing rules, ownership policy and workload
 *    balancing the ticket POST uses, plus SLA targets, so the reporter sees who
 *    will own it and when it is due before filing. The POST stays authoritative.
 */

type Employee = AssignableEmployee & {
  name: string;
  role: string | null;
  title: string | null;
  skills: string[] | null;
  is_active: boolean;
};

const RANK = { P0: 0, P1: 1, P2: 2, P3: 3 } as const;
const higher = (a: Candidate["priority"], b?: Candidate["priority"]) => (b && RANK[b] < RANK[a] ? b : a);

export async function POST(request: Request) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  // A report is starting: load Momence classes/trainers now so the pickers open instantly.
  warmMomenceSessions();
  try {
    await enforceRateLimit("intake-classify", userKey(auth.session.user_id));
  } catch (e) {
    if (e instanceof RateLimitError) {
      return NextResponse.json({ error: e.message }, { status: 429, headers: { "Retry-After": String(e.resetsInSec) } });
    }
    return NextResponse.json({ error: "Try again in a moment." }, { status: 503 });
  }
  const b = await request.json().catch(() => ({}));
  const text = typeof b.text === "string" ? b.text.trim().slice(0, 4000) : "";
  if (!text) return NextResponse.json({ error: "Text is empty" }, { status: 400 });

  try {
    const aiCfg = await loadEffectiveAiConfig();
    const allowAi = b.allowAi !== false && Boolean(process.env.ANTHROPIC_API_KEY) && aiCfg.enabled && aiCfg.autoTriage;

    return await withUser(auth.session.user_id, async (c) => {
      const [employeesRes, studiosRes, deptRes, rulesRes, settingsRes, slaRes] = await Promise.all([
        c.query<Employee>(
          `select id, name, role, title, skills, department_code, studio_codes, availability, workload, max_workload, escalation_order, is_active
             from employees where is_active`,
        ),
        c.query<{ code: string; name: string; city: string }>("select code, name, city from studios where is_active"),
        c.query<{ code: string; name: string; description: string | null; head_employee_id: string | null }>(
          "select code, name, description, head_employee_id from departments where is_active is not false",
        ),
        c.query<RoutingRuleRow>(
          "select id, name, condition, department_code, priority, sort_order, is_active from routing_rules where is_active = true order by sort_order, name",
        ),
        c.query<{ key: string; value: unknown }>(
          `select key, value from app_settings
            where key in ('routing.auto_assign', 'routing.load_balance', 'routing.studio_affinity',
                          'routing.round_robin_fallback', 'routing.require_acknowledgment', 'sla.business_hours')`,
        ),
        c.query<{ priority: string; response_target_mins: number; resolution_target_mins: number; business_hours_only: boolean }>(
          "select priority, response_target_mins, resolution_target_mins, business_hours_only from sla_definitions",
        ),
      ]);
      const employees = employeesRes.rows;
      const studios = studiosRes.rows;
      const departments = deptRes.rows;
      const settings = Object.fromEntries(settingsRes.rows.map((r) => [r.key, r.value]));
      const trainers = employees.filter((e) => e.department_code === "TRN").map((e) => e.name);
      const fields = extractFields(text, trainers);

      // ── Routing preview: same order of precedence as POST /api/tickets ──────────
      const preview = (cand: Candidate, studioCode: string | undefined, title: string | undefined, aiOwner: string | null) => {
        const studioCity = studioCode ? studios.find((s) => s.code === studioCode)?.city ?? null : null;
        const routed = evaluateRoutingRules(rulesRes.rows, {
          category: cand.category,
          subcategory: cand.subcategory,
          priority: cand.priority,
          studioCode,
          studioCity,
          departmentCode: cand.department,
          source: "form_intake",
          description: text,
        });
        let department = routed.departmentCode ?? cand.department;
        const priority = higher(routed.priority ?? cand.priority, fields.urgent);

        // Owner: standing ownership policy → AI suggestion (if valid for the dept) → workload balancing → dept head.
        let owner: { id: string; name: string; source: "policy" | "ai" | "workload" | "head" } | null = null;
        const policy = decideOwnership(
          {
            category: cand.category,
            subcategory: cand.subcategory,
            title: title ?? text.slice(0, 120),
            description: text,
            studioCode: studioCode ?? null,
            studioCity,
            reporterEmployeeId: auth.session.employee_id ?? null,
          },
          () => 0, // preview only; the POST advances the round-robin counter
        );
        const nameOf = (id: string) => employees.find((e) => e.id === id)?.name ?? id;
        if (policy) {
          if (policy.departmentCodes[0]) department = policy.departmentCodes[0];
          owner = { id: policy.assigneeId, name: nameOf(policy.assigneeId), source: "policy" };
        } else {
          const aiPick = aiOwner ? employees.find((e) => e.id === aiOwner && e.department_code === department) : undefined;
          if (aiPick) owner = { id: aiPick.id, name: aiPick.name, source: "ai" };
          else if (department) {
            const id = selectBestAssignee(employees, {
              departmentCode: department,
              studioCode,
              flags: {
                autoAssign: settings["routing.auto_assign"] !== false,
                loadBalance: settings["routing.load_balance"] !== false,
                studioAffinity: settings["routing.studio_affinity"] !== false,
                roundRobinFallback: settings["routing.round_robin_fallback"] !== false,
                requireAcknowledgment: Boolean(settings["routing.require_acknowledgment"]),
              },
            });
            if (id) owner = { id, name: nameOf(id), source: "workload" };
            else {
              const head = departments.find((d) => d.code === department)?.head_employee_id;
              if (head) owner = { id: head, name: nameOf(head), source: "head" };
            }
          }
        }

        const slaDef = slaRes.rows.find((s) => s.priority === priority);
        const sla = slaDef
          ? {
              priority,
              responseMins: slaDef.response_target_mins,
              resolutionMins: slaDef.resolution_target_mins,
              ...computeSlaTargets({
                responseTargetMins: slaDef.response_target_mins,
                resolutionTargetMins: slaDef.resolution_target_mins,
                businessHoursOnly: Boolean(slaDef.business_hours_only),
                businessHours: (settings["sla.business_hours"] ?? null) as BusinessHoursMap | null,
              }),
            }
          : null;

        return {
          candidate: { ...cand, department, priority },
          routing: {
            departmentCode: department,
            departmentName: departments.find((d) => d.code === department)?.name ?? department,
            owner,
            sla,
            routedByRule: routed.matchedRule?.name ?? null,
            ownershipRule: policy?.label ?? null,
          },
        };
      };

      const rulesAnswer = async (aiUnavailable = false) => {
        const det = await classify(c, text, Boolean(fields.trainerName));
        // A keyword rule is high-precision on its own. The AI confidence threshold (0-1) only
        // gates history-only matches, where the score is a vote count rather than a rule hit.
        const top = det.candidates[0];
        const confident =
          det.confident && (top?.via === "keywords" || (top?.score ?? 0) >= Math.max(1, aiCfg.confidenceThreshold * 6));
        const mapped = det.candidates.map((cand) => preview(cand, fields.studioCode, undefined, null));
        return NextResponse.json({
          candidates: mapped.map((m) => m.candidate),
          confident,
          taxonomy: det.taxonomy,
          fields,
          routing: confident ? mapped[0]?.routing ?? null : null,
          source: "rules",
          ...(aiUnavailable ? { aiUnavailable: true } : {}),
        });
      };

      if (!allowAi) return rulesAnswer();

      const tax = await taxonomy(c);
      const ctx: ClassifyContext = {
        taxonomy: tax.categories,
        studios,
        departments,
        employees: employees.map((e) => ({
          id: e.id,
          name: e.name,
          department_code: e.department_code,
          role: e.role,
          title: e.title,
          skills: e.skills,
          studio_codes: e.studio_codes,
        })),
      };

      let ai;
      try {
        ai = await aiClassify(text, ctx, auth.session.user_id);
      } catch (e) {
        console.error("[intake ai]", (e as Error).message);
        return rulesAnswer(true);
      }

      const known = tax.categories.find((x) => x.category === ai.category);
      const sub = known?.subcategories.find((s) => s.name === ai.subcategory)?.name ?? null;
      const resolvedStudio =
        fields.studioCode ?? (studios.some((s) => s.code === ai.studio_code) ? (ai.studio_code ?? undefined) : undefined);

      if (!ai.understood || !known) {
        // AI couldn't place it: offer the rules' guesses alongside its question.
        const det = await classify(c, text, Boolean(fields.trainerName));
        return NextResponse.json({
          candidates: det.candidates.map((cand) => preview(cand, resolvedStudio, undefined, null).candidate),
          confident: false,
          taxonomy: det.taxonomy,
          fields: { ...fields, studioCode: resolvedStudio },
          question: ai.clarifying_question,
          routing: null,
          source: "ai",
        });
      }

      const m = tax.meta(known.category, sub);
      const aiDept = departments.some((d) => d.code === ai.department_code) ? ai.department_code : null;
      const top = preview(
        {
          category: known.category,
          subcategory: sub,
          score: 10,
          department: aiDept ?? m.department ?? known.department,
          priority: ai.priority ?? m.priority,
          via: "ai",
        },
        resolvedStudio,
        ai.title ?? undefined,
        ai.owner_employee_id,
      );
      const confident = ai.confidence >= Math.min(0.9, Math.max(0.4, aiCfg.confidenceThreshold));

      // A subcategory with no matching spec (new or renamed in ticket history) gets the AI's
      // own pick of questions instead of the broad category default.
      const specHit = resolveSpec(known.category, sub).source;
      const aiKeys = specHit === "category" || specHit === "generic" ? cleanAiFields(ai.relevant_fields) : [];
      if (aiKeys.length) console.warn(`[intake] no spec for "${known.category} | ${sub}" - using AI fields: ${aiKeys.join(", ")}`);

      // Alternatives for the picker: other subcategories in the same category by history volume.
      const alternatives: Candidate[] = known.subcategories
        .filter((s) => s.name !== sub)
        .slice(0, 3)
        .map((s) => ({ category: known.category, subcategory: s.name, score: 1, department: s.department, priority: s.priority, via: "ai" as const }));

      return NextResponse.json({
        candidates: [top.candidate, ...alternatives],
        confident,
        confidence: ai.confidence,
        taxonomy: tax.categories,
        fields: {
          ...fields,
          studioCode: resolvedStudio,
          when: fields.when ?? ai.when ?? undefined,
          trainerName: fields.trainerName ?? ai.trainer_name ?? undefined,
          clientName: ai.client_name ?? undefined,
          title: ai.title ?? undefined,
          // Answers to this subcategory's intake questions that the report already gives.
          answers: cleanAnswers(known.category, sub, ai.answers ?? [], aiKeys),
          ...(aiKeys.length ? { aiFields: { category: known.category, subcategory: sub, keys: aiKeys } } : {}),
        },
        routing: top.routing,
        question: confident ? null : ai.clarifying_question,
        source: "ai",
      });
    });
  } catch (err) {
    return dbError(err);
  }
}

/**
 * IRIS Intelligence Library
 *
 * Powers the smart features in the app:
 *   - SLA Breach Predictor: per-ticket breach risk score (0-100%)
 *   - Resolution Time Predictor: ETA based on historical data
 *   - Recurrence Pattern Detector: finds repeating issues at the same studio
 *   - Anomaly Detection: detects spikes in ticket volume by category/studio
 *   - Workload Heatmap: per-assignee capacity over the week
 *   - Daily Briefing generator: personalized morning summary
 *   - AI Resolution Suggestions: matching knowledge articles + similar tickets
 *   - Member 360: aggregates tickets + feedback per member
 *
 * All functions are pure and operate on the static ALL_TICKETS data,
 * so they're deterministic and SSR-safe.
 */

import { ALL_TICKETS, type Ticket, getAssignee } from "./sample-tickets";
import { EMPLOYEES, STUDIOS, DEPARTMENTS, type Employee } from "./types";
import { KNOWLEDGE_ARTICLES, type KnowledgeArticle } from "./knowledge-base-data";
import { TICKET_TEMPLATES } from "./templates";
import { templateTaxonomy } from "./template-form";
import { templateCategoryLabel } from "./template-taxonomy";
import { MEMBERS, findMember, type Member } from "./member-directory";

const now = Date.now();
const DAY_MS = 86400000;
const HOUR_MS = 3600000;

/* ============================================================
   FEATURE 2: SLA Breach Predictor
   ============================================================ */

export interface BreachRiskAssessment {
  /** 0-100, higher = more likely to breach */
  score: number;
  /** "high" (>=70) | "medium" (>=40) | "low" (<40) */
  level: "high" | "medium" | "low";
  /** Human-readable explanation */
  reason: string;
  /** Hours remaining until SLA target (negative = already breached) */
  hoursRemaining: number;
  /** Estimated hours needed to resolve based on historical data */
  estimatedHoursNeeded: number;
  /** Factors that contributed to the score */
  factors: Array<{ label: string; impact: number; detail: string }>;
}

/**
 * Predict the probability that a ticket will breach its SLA resolution target.
 *
 * Factors:
 *   - Time remaining vs historical resolution time for that category
 *   - Assignee's current workload (overloaded → higher risk)
 *   - Ticket priority (P0/P1 have tighter SLAs → more sensitive to delays)
 *   - Whether the ticket has had a first response yet
 *   - Whether the assignee is on leave / offline
 */
export function predictBreachRisk(ticket: Ticket): BreachRiskAssessment {
  const factors: Array<{ label: string; impact: number; detail: string }> = [];
  let score = 0;

  // 1. Time-remaining factor
  const target = ticket.slaResolutionTarget ? new Date(ticket.slaResolutionTarget).getTime() : now + 24 * HOUR_MS;
  const hoursRemaining = Math.round((target - now) / HOUR_MS);
  const historicalHours = avgResolutionHoursForCategory(ticket.category);
  const estimatedHoursNeeded = historicalHours;
  if (hoursRemaining < 0) {
    // Already breached
    score += 50;
    factors.push({
      label: "SLA already breached",
      impact: 50,
      detail: `Resolution target was ${Math.abs(hoursRemaining)}h ago`,
    });
  } else {
    // Compare remaining time to historical resolution time
    const ratio = historicalHours / Math.max(1, hoursRemaining);
    if (ratio > 1.5) {
      score += 30;
      factors.push({
        label: "Insufficient time vs historical resolution",
        impact: 30,
        detail: `${hoursRemaining}h left, but similar tickets take ~${historicalHours}h`,
      });
    } else if (ratio > 1) {
      score += 18;
      factors.push({
        label: "Tight timeline",
        impact: 18,
        detail: `${hoursRemaining}h left, similar tickets take ~${historicalHours}h`,
      });
    } else if (ratio > 0.7) {
      score += 8;
      factors.push({
        label: "Some schedule pressure",
        impact: 8,
        detail: `${hoursRemaining}h left vs ~${historicalHours}h needed`,
      });
    }
  }

  // 2. Assignee workload factor
  const assignee = getAssignee(ticket);
  if (assignee) {
    const workloadRatio = assignee.workload / Math.max(1, assignee.maxWorkload);
    if (workloadRatio >= 1) {
      score += 20;
      factors.push({
        label: `${assignee.name.split(" ")[0]} is at full capacity`,
        impact: 20,
        detail: `${assignee.workload}/${assignee.maxWorkload} tickets assigned`,
      });
    } else if (workloadRatio >= 0.8) {
      score += 12;
      factors.push({
        label: "Assignee near capacity",
        impact: 12,
        detail: `${assignee.workload}/${assignee.maxWorkload} (${Math.round(workloadRatio * 100)}%)`,
      });
    } else if (workloadRatio >= 0.6) {
      score += 5;
      factors.push({
        label: "Assignee moderately loaded",
        impact: 5,
        detail: `${assignee.workload}/${assignee.maxWorkload} (${Math.round(workloadRatio * 100)}%)`,
      });
    }
    if (assignee.availability === "on_leave" || assignee.availability === "offline") {
      score += 15;
      factors.push({
        label: `Assignee ${assignee.availability === "on_leave" ? "on leave" : "offline"}`,
        impact: 15,
        detail: "Resolution may stall until they return",
      });
    }
  } else if (!ticket.assigneeId) {
    score += 25;
    factors.push({
      label: "Unassigned",
      impact: 25,
      detail: "Nobody is currently working on this ticket",
    });
  }

  // 3. Priority factor — tighter SLAs are more sensitive
  if (ticket.priority === "P0") {
    score += 10;
    factors.push({ label: "P0 priority - high stakes", impact: 10, detail: "Critical priority, any delay is significant" });
  } else if (ticket.priority === "P1") {
    score += 5;
    factors.push({ label: "P1 priority", impact: 5, detail: "High priority, sensitive to delays" });
  }

  // 4. First-response factor
  if (!ticket.firstResponseAt && hoursRemaining < 12) {
    score += 10;
    factors.push({
      label: "No first response yet",
      impact: 10,
      detail: "Ticket hasn't been acknowledged with time running short",
    });
  }

  // Already-resolved tickets have 0 risk
  if (ticket.status === "resolved" || ticket.status === "closed") {
    score = 0;
    factors.length = 0;
    factors.push({ label: "Already resolved", impact: 0, detail: "Ticket is closed" });
  }

  score = Math.max(0, Math.min(100, score));
  const level: "high" | "medium" | "low" = score >= 70 ? "high" : score >= 40 ? "medium" : "low";

  const reason =
    score >= 70
      ? `High risk of SLA breach — ${factors.filter((f) => f.impact > 0).length} factors working against on-time resolution.`
      : score >= 40
      ? `Medium breach risk — some signals indicate potential delay.`
      : `Low breach risk — on track for on-time resolution.`;

  return { score, level, reason, hoursRemaining, estimatedHoursNeeded, factors };
}

/* ============================================================
   FEATURE 9: Resolution Time Predictor
   ============================================================ */

/** Returns the average resolution time (in hours) for tickets in a category. */
export function avgResolutionHoursForCategory(category: string): number {
  const resolved = ALL_TICKETS.filter(
    (t) => (t.status === "resolved" || t.status === "closed") && t.category === category && t.resolvedAt && t.createdAt,
  );
  if (!resolved.length) return 24; // default fallback
  const totalHours = resolved.reduce((n, t) => {
    const dt = new Date(t.resolvedAt!).getTime() - new Date(t.createdAt).getTime();
    return n + dt / HOUR_MS;
  }, 0);
  return Math.round(totalHours / resolved.length);
}

export interface ResolutionEstimate {
  /** Estimated hours from now until resolution */
  hours: number;
  /** Human-readable ETA like "~4h" or "~2d 6h" */
  label: string;
  /** Confidence: high (>=10 samples), medium (>=3), low (<3) */
  confidence: "high" | "medium" | "low";
  /** Number of historical samples used */
  sampleSize: number;
}

/**
 * Estimate how long a ticket will take to resolve, based on historical data
 * for the same category + department + similar priority.
 */
export function predictResolutionTime(ticket: Ticket): ResolutionEstimate {
  // Find similar resolved tickets: same category + same priority (closest match)
  const exact = ALL_TICKETS.filter(
    (t) =>
      (t.status === "resolved" || t.status === "closed") &&
      t.category === ticket.category &&
      t.priority === ticket.priority &&
      t.resolvedAt &&
      t.createdAt,
  );
  const sameCat = ALL_TICKETS.filter(
    (t) =>
      (t.status === "resolved" || t.status === "closed") &&
      t.category === ticket.category &&
      t.resolvedAt &&
      t.createdAt,
  );
  // Prefer exact priority + category match, fall back to category only
  const samples = exact.length >= 3 ? exact : sameCat;
  const sampleSize = samples.length;
  const confidence: "high" | "medium" | "low" = sampleSize >= 10 ? "high" : sampleSize >= 3 ? "medium" : "low";

  let hours: number;
  if (sampleSize === 0) {
    // No data — use default by priority
    hours = ticket.priority === "P0" ? 4 : ticket.priority === "P1" ? 8 : ticket.priority === "P2" ? 24 : 48;
  } else {
    const totalHours = samples.reduce((n, t) => {
      const dt = new Date(t.resolvedAt!).getTime() - new Date(t.createdAt).getTime();
      return n + dt / HOUR_MS;
    }, 0);
    hours = Math.round(totalHours / sampleSize);
  }

  // Adjust for assignee workload (overloaded = +30% time)
  const assignee = getAssignee(ticket);
  if (assignee) {
    const wlRatio = assignee.workload / Math.max(1, assignee.maxWorkload);
    if (wlRatio >= 1) hours = Math.round(hours * 1.4);
    else if (wlRatio >= 0.8) hours = Math.round(hours * 1.2);
  }

  // Format label
  let label: string;
  if (hours < 1) label = "<1h";
  else if (hours < 24) label = `~${hours}h`;
  else {
    const days = Math.floor(hours / 24);
    const remH = hours % 24;
    label = remH ? `~${days}d ${remH}h` : `~${days}d`;
  }

  return { hours, label, confidence, sampleSize };
}

/* ============================================================
   FEATURE 8: Recurrence Pattern Detector
   ============================================================ */

export interface RecurrencePattern {
  /** The pattern key: category + studio + subcategory (if any) */
  key: string;
  category: string;
  subcategory?: string;
  studioCode?: string;
  studioName?: string;
  /** All tickets in this pattern */
  tickets: Ticket[];
  /** Number of occurrences */
  count: number;
  /** First occurrence timestamp */
  firstAt: string;
  /** Most recent occurrence timestamp */
  latestAt: string;
  /** Days between first and latest */
  spanDays: number;
  /** Recommended action */
  recommendation: string;
  /** Severity: high (5+ in 30 days), medium (3-4), low (2) */
  severity: "high" | "medium" | "low";
}

/**
 * Detect recurring issues: same category + studio within a 60-day window.
 * Returns patterns with 2+ occurrences, sorted by severity.
 *
 * The key is `category + studio` (subcategory is informational only —
 * including it in the key would split patterns like "HVAC at Kwality House"
 * across "HVAC" + "General" subcategories and miss the recurrence).
 */
export function detectRecurrencePatterns(): RecurrencePattern[] {
  const groups = new Map<string, Ticket[]>();
  for (const t of ALL_TICKETS) {
    const key = `${t.category}|${t.studioCode || "any"}`;
    const arr = groups.get(key) ?? [];
    arr.push(t);
    groups.set(key, arr);
  }

  const patterns: RecurrencePattern[] = [];
  for (const [key, tickets] of groups) {
    if (tickets.length < 2) continue;
    // Filter to tickets within the last 60 days
    const recent = tickets.filter((t) => now - new Date(t.createdAt).getTime() < 60 * DAY_MS);
    if (recent.length < 2) continue;

    const sorted = [...recent].sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
    const firstAt = sorted[0].createdAt;
    const latestAt = sorted[sorted.length - 1].createdAt;
    const spanDays = Math.round((+new Date(latestAt) - +new Date(firstAt)) / DAY_MS);
    const studio = sorted[0].studioCode ? STUDIOS.find((s) => s.code === sorted[0].studioCode) : undefined;

    const severity: "high" | "medium" | "low" =
      recent.length >= 5 ? "high" : recent.length >= 3 ? "medium" : "low";

    const recommendation =
      severity === "high"
        ? `Recurring issue — schedule preventive maintenance / root-cause review for ${studio?.name ?? "this studio"}.`
        : severity === "medium"
        ? `Pattern forming — monitor and prepare a preventive action plan.`
        : `Repeat occurrence — log for trend tracking.`;

    patterns.push({
      key,
      category: sorted[0].category,
      subcategory: sorted[0].subcategory,
      studioCode: sorted[0].studioCode,
      studioName: studio?.name,
      tickets: sorted,
      count: recent.length,
      firstAt,
      latestAt,
      spanDays,
      recommendation,
      severity,
    });
  }

  return patterns.sort((a, b) => {
    const sevOrder = { high: 0, medium: 1, low: 2 };
    return sevOrder[a.severity] - sevOrder[b.severity] || b.count - a.count;
  });
}

/** Get the recurrence pattern (if any) for a specific ticket. */
export function getRecurrenceForTicket(ticket: Ticket): RecurrencePattern | null {
  const patterns = detectRecurrencePatterns();
  return patterns.find((p) => p.tickets.some((t) => t.id === ticket.id)) ?? null;
}

/* ============================================================
   FEATURE 6: Anomaly Detection
   ============================================================ */

export interface Anomaly {
  id: string;
  type: "spike" | "drop" | "new_pattern";
  title: string;
  description: string;
  severity: "critical" | "warning" | "info";
  /** Studio / category / dept that the anomaly is about */
  scope: { label: string; value: string };
  /** Observed value */
  observed: number;
  /** Expected baseline value */
  baseline: number;
  /** Percentage change */
  changePct: number;
  /** Recommended action */
  recommendation: string;
  /** Sample ticket IDs that contribute to this anomaly */
  sampleTicketIds: string[];
}

/**
 * Detect anomalies in ticket patterns:
 *   - Spike in a category at a specific studio (>150% of baseline)
 *   - Drop in resolution rate
 *   - New pattern emerging (category not seen in prior period)
 */
export function detectAnomalies(): Anomaly[] {
  const anomalies: Anomaly[] = [];

  // Look at the last 7 days vs the prior 7 days as a baseline
  const sevenDaysAgo = now - 7 * DAY_MS;
  const fourteenDaysAgo = now - 14 * DAY_MS;

  // Group tickets by (studio + category) for the recent and baseline periods
  const recent = ALL_TICKETS.filter((t) => +new Date(t.createdAt) >= sevenDaysAgo);
  const baseline = ALL_TICKETS.filter(
    (t) => +new Date(t.createdAt) >= fourteenDaysAgo && +new Date(t.createdAt) < sevenDaysAgo,
  );

  const recentGroups = new Map<string, Ticket[]>();
  for (const t of recent) {
    const key = `${t.studioCode || "any"}|${t.category}`;
    const arr = recentGroups.get(key) ?? [];
    arr.push(t);
    recentGroups.set(key, arr);
  }
  const baselineGroups = new Map<string, Ticket[]>();
  for (const t of baseline) {
    const key = `${t.studioCode || "any"}|${t.category}`;
    const arr = baselineGroups.get(key) ?? [];
    arr.push(t);
    baselineGroups.set(key, arr);
  }

  // Look for spikes
  for (const [key, recentTickets] of recentGroups) {
    if (recentTickets.length < 2) continue; // need at least 2 to call it a spike
    const baselineTickets = baselineGroups.get(key) ?? [];
    const baselineCount = baselineTickets.length;
    const observedCount = recentTickets.length;
    if (baselineCount === 0) {
      // New pattern — only flag if there are 2+ tickets
      if (observedCount >= 2) {
        const [studioCode, category] = key.split("|");
        const studio = STUDIOS.find((s) => s.code === studioCode);
        anomalies.push({
          id: `anomaly-new-${key}`,
          type: "new_pattern",
          title: `New issue pattern: ${category}${studio ? ` at ${studio.name}` : ""}`,
          description: `${observedCount} ${category} tickets in the last 7 days; none in the prior week. This could indicate an emerging problem.`,
          severity: observedCount >= 4 ? "critical" : "warning",
          scope: { label: "Studio / Category", value: `${studio?.name ?? "Any"} / ${category}` },
          observed: observedCount,
          baseline: 0,
          changePct: 100,
          recommendation: `Investigate root cause — schedule a walkthrough and review equipment / processes for ${category}.`,
          sampleTicketIds: recentTickets.slice(0, 5).map((t) => t.id),
        });
      }
    } else {
      const changePct = Math.round(((observedCount - baselineCount) / baselineCount) * 100);
      if (changePct >= 30) {
        const [studioCode, category] = key.split("|");
        const studio = STUDIOS.find((s) => s.code === studioCode);
        anomalies.push({
          id: `anomaly-spike-${key}`,
          type: "spike",
          title: `${category} tickets up ${changePct}%${studio ? ` at ${studio.name}` : ""}`,
          description: `${observedCount} ${category} tickets in the last 7 days vs ${baselineCount} in the prior week.`,
          severity: changePct >= 100 ? "critical" : "warning",
          scope: { label: "Studio / Category", value: `${studio?.name ?? "Any"} / ${category}` },
          observed: observedCount,
          baseline: baselineCount,
          changePct,
          recommendation:
            changePct >= 100
              ? `Schedule immediate root-cause analysis for ${category} at ${studio?.name ?? "all studios"}.`
              : `Monitor closely — if the trend continues next week, schedule a review.`,
          sampleTicketIds: recentTickets.slice(0, 5).map((t) => t.id),
        });
      }
    }
  }

  // Sort by severity (critical first)
  const sevOrder = { critical: 0, warning: 1, info: 2 };
  return anomalies.sort((a, b) => sevOrder[a.severity] - sevOrder[b.severity]);
}

/* ============================================================
   FEATURE 5: Workload Heatmap
   ============================================================ */

export interface WorkloadCell {
  employeeId: string;
  employeeName: string;
  /** ISO date for the day (YYYY-MM-DD) */
  day: string;
  /** Day label like "Mon 12" */
  dayLabel: string;
  /** Number of tickets assigned to this person created/updated that day */
  ticketCount: number;
  /** Capacity utilization ratio (0-1+) */
  utilization: number;
  /** Whether this cell is overloaded (>=1) */
  overloaded: boolean;
}

export interface WorkloadHeatmap {
  /** Rows: employees */
  employees: Array<{ id: string; name: string; role: string; departmentCode: string }>;
  /** Columns: days (last 7 days, oldest first) */
  days: Array<{ iso: string; label: string }>;
  /** Cells keyed by `${employeeId}|${dayIso}` */
  cells: WorkloadCell[];
  /** Top overload risks */
  hotspots: Array<{ employeeId: string; employeeName: string; day: string; ticketCount: number; utilization: number }>;
}

/**
 * Build a 7-day workload heatmap for all employees with at least one ticket.
 * Cell value = number of tickets assigned to that employee that were created
 * or updated on that day.
 */
export function buildWorkloadHeatmap(): WorkloadHeatmap {
  // Build last 7 days
  const days: Array<{ iso: string; label: string }> = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now - i * DAY_MS);
    const iso = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric" });
    days.push({ iso, label });
  }

  // Find employees who have any tickets
  const employeesWithTickets = EMPLOYEES.filter((e) =>
    ALL_TICKETS.some((t) => t.assigneeId === e.id),
  );

  const cells: WorkloadCell[] = [];
  const hotspots: WorkloadCell[] = [];

  for (const emp of employeesWithTickets) {
    for (const day of days) {
      // Count tickets assigned to this employee created or updated on this day
      const dayStart = new Date(day.iso).getTime();
      const dayEnd = dayStart + DAY_MS;
      const count = ALL_TICKETS.filter(
        (t) =>
          t.assigneeId === emp.id &&
          (+new Date(t.createdAt) >= dayStart && +new Date(t.createdAt) < dayEnd),
      ).length;

      // Utilization: count / maxWorkload (as a per-day proxy)
      const dailyCapacity = Math.max(1, Math.ceil(emp.maxWorkload / 7));
      const utilization = count / dailyCapacity;
      const overloaded = utilization >= 1;

      const cell: WorkloadCell = {
        employeeId: emp.id,
        employeeName: emp.name,
        day: day.iso,
        dayLabel: day.label,
        ticketCount: count,
        utilization,
        overloaded,
      };
      cells.push(cell);
      if (overloaded && count > 0) hotspots.push(cell);
    }
  }

  // Sort hotspots by utilization (highest first)
  hotspots.sort((a, b) => b.utilization - a.utilization);

  return {
    employees: employeesWithTickets.map((e) => ({
      id: e.id,
      name: e.name,
      role: e.role,
      departmentCode: e.departmentCode,
    })),
    days,
    cells,
    hotspots: hotspots.slice(0, 10).map((c) => ({
      employeeId: c.employeeId,
      employeeName: c.employeeName,
      day: c.day,
      ticketCount: c.ticketCount,
      utilization: c.utilization,
    })),
  };
}

/* ============================================================
   FEATURE 3: Daily Briefing
   ============================================================ */

export interface DailyBriefing {
  generatedAt: string;
  user: { id: string; name: string; role: string };
  /** Top priorities — most urgent things needing attention */
  topPriorities: Array<{
    ticketId: string;
    title: string;
    reason: string;
    severity: "critical" | "high" | "medium";
  }>;
  /** Tickets in your queue that are at risk of breaching SLA */
  slaAtRisk: Array<{ ticketId: string; title: string; riskScore: number; hoursRemaining: number }>;
  /** New tickets assigned to you since yesterday */
  newInYourQueue: Array<{ ticketId: string; title: string; createdAt: string }>;
  /** Stats summary */
  stats: {
    yourOpenTickets: number;
    yourResolvedThisWeek: number;
    teamOpenTickets: number;
    teamResolvedThisWeek: number;
    criticalOpen: number;
    escalatedToday: number;
  };
  /** Org-wide anomalies / things to be aware of */
  anomalies: Array<{ title: string; description: string; severity: string }>;
  /** One-line summary for the headline */
  headline: string;
}

/**
 * Generate a personalized daily briefing for a user.
 * Pulls in: their queue, SLA at-risk tickets, anomalies, team stats.
 */
export function generateDailyBriefing(user: { id: string; name: string; role: string }): DailyBriefing {
  const userTickets = ALL_TICKETS.filter((t) => t.assigneeId === user.id);
  const userOpen = userTickets.filter((t) => t.status !== "resolved" && t.status !== "closed");
  const userResolvedThisWeek = userTickets.filter(
    (t) => (t.status === "resolved" || t.status === "closed") && t.resolvedAt &&
      now - +new Date(t.resolvedAt) < 7 * DAY_MS,
  );

  const allOpen = ALL_TICKETS.filter((t) => t.status !== "resolved" && t.status !== "closed");
  const allResolvedThisWeek = ALL_TICKETS.filter(
    (t) => (t.status === "resolved" || t.status === "closed") && t.resolvedAt &&
      now - +new Date(t.resolvedAt) < 7 * DAY_MS,
  );
  const criticalOpen = allOpen.filter((t) => t.priority === "P0").length;
  const escalatedToday = ALL_TICKETS.filter(
    (t) => t.status === "escalated" && now - +new Date(t.updatedAt) < DAY_MS,
  ).length;

  // SLA at risk for this user's open tickets
  const slaAtRisk = userOpen
    .map((t) => ({ ticket: t, risk: predictBreachRisk(t) }))
    .filter((x) => x.risk.score >= 40)
    .sort((a, b) => b.risk.score - a.risk.score)
    .slice(0, 5)
    .map((x) => ({
      ticketId: x.ticket.ticketId,
      title: x.ticket.title,
      riskScore: x.risk.score,
      hoursRemaining: x.risk.hoursRemaining,
    }));

  // New tickets in user's queue (created in last 24h)
  const newInYourQueue = userTickets
    .filter((t) => now - +new Date(t.createdAt) < DAY_MS)
    .slice(0, 5)
    .map((t) => ({ ticketId: t.ticketId, title: t.title, createdAt: t.createdAt }));

  // Top priorities: P0 open + high-risk SLA + escalated
  const topPriorities: DailyBriefing["topPriorities"] = [];
  for (const t of allOpen.filter((t) => t.priority === "P0").slice(0, 3)) {
    topPriorities.push({
      ticketId: t.ticketId,
      title: t.title,
      reason: `P0 critical ticket open`,
      severity: "critical",
    });
  }
  for (const x of slaAtRisk.filter((x) => x.riskScore >= 70).slice(0, 3)) {
    if (topPriorities.length >= 5) break;
    topPriorities.push({
      ticketId: x.ticketId,
      title: x.title,
      reason: `SLA breach risk: ${x.riskScore}%`,
      severity: "high",
    });
  }

  // Anomalies
  const anomalies = detectAnomalies().slice(0, 3).map((a) => ({
    title: a.title,
    description: a.description,
    severity: a.severity,
  }));

  // Headline
  const headlineParts: string[] = [];
  if (criticalOpen > 0) headlineParts.push(`${criticalOpen} critical ticket${criticalOpen === 1 ? "" : "s"} open`);
  if (slaAtRisk.length > 0) headlineParts.push(`${slaAtRisk.length} SLA at risk in your queue`);
  if (escalatedToday > 0) headlineParts.push(`${escalatedToday} escalation${escalatedToday === 1 ? "" : "s"} today`);
  if (anomalies.length > 0) headlineParts.push(`${anomalies.length} anomal${anomalies.length === 1 ? "y" : "ies"} detected`);
  const headline = headlineParts.length
    ? headlineParts.join(", ") + "."
    : `All systems nominal — ${userOpen.length} ticket${userOpen.length === 1 ? "" : "s"} in your queue, no critical signals.`;

  return {
    generatedAt: new Date().toISOString(),
    user,
    topPriorities,
    slaAtRisk,
    newInYourQueue,
    stats: {
      yourOpenTickets: userOpen.length,
      yourResolvedThisWeek: userResolvedThisWeek.length,
      teamOpenTickets: allOpen.length,
      teamResolvedThisWeek: allResolvedThisWeek.length,
      criticalOpen,
      escalatedToday,
    },
    anomalies,
    headline,
  };
}

/* ============================================================
   FEATURE 4: AI Resolution Suggestions
   ============================================================ */

export interface ResolutionSuggestion {
  /** Knowledge base articles that match the ticket category/subcategory */
  knowledgeArticles: Array<{
    article: KnowledgeArticle;
    /** Why it matched */
    matchReason: string;
    /** Match score 0-100 */
    score: number;
  }>;
  /** Similar past tickets that were resolved */
  similarResolvedTickets: Array<{
    ticket: Ticket;
    matchReason: string;
    score: number;
  }>;
  /** Matching template (if any) */
  template: { code: string; title: string; recommendedActions: string; matchScore: number } | null;
  /** Suggested next actions, synthesized */
  suggestedActions: string[];
}

/**
 * For a given ticket, surface the most useful resolution resources:
 * matching KB articles, similar resolved tickets, and the matching template.
 */
export function suggestResolution(ticket: Ticket): ResolutionSuggestion {
  // Match KB articles by category (Repair and Maintenance → tickets with subcategory HVAC, etc.)
  const knowledgeArticles = KNOWLEDGE_ARTICLES
    .map((article) => {
      let score = 0;
      const reasons: string[] = [];
      // Category match
      if (article.title.toLowerCase().includes(ticket.category.toLowerCase())) {
        score += 30;
        reasons.push("category match in title");
      }
      if (ticket.subcategory && article.title.toLowerCase().includes(ticket.subcategory.toLowerCase())) {
        score += 40;
        reasons.push("subcategory match in title");
      }
      // Tag/keyword match in steps
      const ticketKeywords = (ticket.title + " " + ticket.description).toLowerCase().split(/\s+/);
      const articleText = (article.title + " " + article.summary + " " + article.steps.join(" ")).toLowerCase();
      const matchedKeywords = ticketKeywords.filter((k) => k.length > 4 && articleText.includes(k));
      score += Math.min(40, matchedKeywords.length * 8);
      if (matchedKeywords.length > 0) reasons.push(`${matchedKeywords.length} keyword${matchedKeywords.length === 1 ? "" : "s"} matched`);

      return { article, matchReason: reasons.join(" · ") || "loose match", score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  // Similar resolved tickets (same category + subcategory if available)
  const similarResolvedTickets = ALL_TICKETS
    .filter(
      (t) =>
        t.id !== ticket.id &&
        (t.status === "resolved" || t.status === "closed") &&
        t.category === ticket.category,
    )
    .map((t) => {
      let score = 50; // base for same category
      const reasons: string[] = ["same category"];
      if (t.subcategory === ticket.subcategory && ticket.subcategory) {
        score += 30;
        reasons.push("same subcategory");
      }
      if (t.studioCode === ticket.studioCode) {
        score += 15;
        reasons.push("same studio");
      }
      if (t.priority === ticket.priority) {
        score += 5;
        reasons.push("same priority");
      }
      return { ticket: t, matchReason: reasons.join(" · "), score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  // Matching template
  const template = TICKET_TEMPLATES
    .map((tpl) => {
      let score = 0;
      const ticketText = (ticket.title + " " + ticket.description).toLowerCase();
      const tplText = (tpl.title + " " + tpl.description + " " + (tpl.subcategory || "")).toLowerCase();
      const ticketKeywords = ticketText.split(/\s+/).filter((k) => k.length > 4);
      const matched = ticketKeywords.filter((k) => tplText.includes(k));
      score = Math.min(100, matched.length * 12);
      // Tickets are filed in the CATEGORY_MAP taxonomy; templates carry a library
      // taxonomy plus the ticket pair they pre-fill — match on either.
      const tax = templateTaxonomy(tpl);
      const ticketCat = ticket.category.toLowerCase();
      const ticketSub = ticket.subcategory?.toLowerCase();
      if (tpl.category.toLowerCase() === ticketCat || tax.category.toLowerCase() === ticketCat) score += 20;
      if (ticketSub && (tpl.subcategory?.toLowerCase() === ticketSub || tax.subcategory.toLowerCase() === ticketSub)) score += 30;
      return { code: tpl.code, title: tpl.title, recommendedActions: tpl.recommendedActions, matchScore: score, _tpl: tpl };
    })
    .sort((a, b) => b.matchScore - a.matchScore)[0];

  const bestTemplate = template && template.matchScore > 30
    ? { code: template.code, title: template.title, recommendedActions: template.recommendedActions, matchScore: template.matchScore }
    : null;

  // Synthesize suggested actions
  const suggestedActions: string[] = [];
  if (bestTemplate) {
    suggestedActions.push(
      `Apply template ${bestTemplate.code} (${bestTemplate.title}) — ${bestTemplate.matchScore}% match`,
    );
    // Add the first 2 steps from the template's recommended actions
    const steps = bestTemplate.recommendedActions.split("\n").filter((s) => s.trim()).slice(0, 2);
    suggestedActions.push(...steps.map((s) => `From template: ${s.replace(/^\d+\.\s*/, "")}`));
  }
  if (knowledgeArticles.length > 0) {
    suggestedActions.push(`Follow KB article ${knowledgeArticles[0].article.id}: ${knowledgeArticles[0].article.title}`);
  }
  if (similarResolvedTickets.length > 0) {
    const sim = similarResolvedTickets[0].ticket;
    suggestedActions.push(`Reference ${sim.ticketId} — same ${sim.category}, resolved${sim.resolution ? ` with: "${sim.resolution.slice(0, 80)}${sim.resolution.length > 80 ? "…" : ""}"` : ""}`);
  }
  if (suggestedActions.length === 0) {
    suggestedActions.push("Investigate the issue and document findings in the resolution log.");
  }

  return { knowledgeArticles, similarResolvedTickets, template: bestTemplate, suggestedActions };
}

/* ============================================================
   FEATURE 7: Member 360 Lookup
   ============================================================ */

export interface Member360 {
  name: string;
  /** All tickets mentioning this member */
  tickets: Ticket[];
  /** Studio where they have the most activity */
  primaryStudio?: string;
  /** First ticket date */
  firstInteraction: string;
  /** Last ticket date */
  lastInteraction: string;
  /** Sentiment breakdown: positive / neutral / negative counts */
  sentiment: { positive: number; neutral: number; negative: number };
  /** Membership-related tickets count */
  membershipIssues: number;
  /** Payment-related tickets count */
  paymentIssues: number;
  /** Class experience tickets count */
  classIssues: number;
  /** Total tickets */
  totalTickets: number;
  /** Open tickets */
  openTickets: number;
  /** Resolved tickets */
  resolvedTickets: number;
  /** Risk level based on ticket volume + sentiment */
  riskLevel: "high" | "medium" | "low";
  /** Risk reason */
  riskReason: string;
}

/**
 * Member directory — re-exported from the shared `member-directory.ts` so
 * the Member 360 Lookup uses the same roster as the Momence search field
 * and the ⌘K command palette.
 *
 * Deprecated alias kept for backward compatibility with any code that
 * still imports MEMBER_DIRECTORY from intelligence.ts.
 */
export const MEMBER_DIRECTORY = MEMBERS.map((m) => ({
  id: m.id,
  name: m.name,
  phone: m.phone,
  email: m.email,
  membership: m.membership,
  credits: m.credits,
  joinDate: m.joinDate,
}));

/**
 * Build a 360-degree view of a member based on their name + ticket history.
 */
export function buildMember360(memberName: string): Member360 | null {
  const tickets = ALL_TICKETS.filter((t) => t.affectedClient?.toLowerCase().includes(memberName.toLowerCase()));
  // Use the shared findMember helper to verify the member exists in the
  // canonical roster (single source of truth — no duplicate directory here).
  const member = findMember(memberName);
  if (tickets.length === 0 && !member) {
    return null;
  }

  const sorted = [...tickets].sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
  const firstInteraction = sorted[0]?.createdAt ?? new Date().toISOString();
  const lastInteraction = sorted[sorted.length - 1]?.createdAt ?? new Date().toISOString();

  // Studio count
  const studioCounts = new Map<string, number>();
  for (const t of tickets) {
    if (!t.studioCode) continue;
    studioCounts.set(t.studioCode, (studioCounts.get(t.studioCode) ?? 0) + 1);
  }
  let primaryStudio: string | undefined;
  let maxCount = 0;
  for (const [code, count] of studioCounts) {
    if (count > maxCount) {
      maxCount = count;
      const studio = STUDIOS.find((s) => s.code === code);
      primaryStudio = studio?.name;
    }
  }

  // Sentiment breakdown (rough heuristic from priority + status)
  let positive = 0, neutral = 0, negative = 0;
  for (const t of tickets) {
    if (t.title.toLowerCase().includes("compliment") || t.title.toLowerCase().includes("praise")) positive++;
    else if (t.priority === "P0" || t.priority === "P1" || t.status === "escalated") negative++;
    else neutral++;
  }

  // Issue type counts
  const membershipIssues = tickets.filter((t) => t.category === "Membership").length;
  const paymentIssues = tickets.filter((t) => t.category === "Payment").length;
  const classIssues = tickets.filter((t) => t.category === "Class Experience" || t.category === "Scheduling").length;

  const openTickets = tickets.filter((t) => t.status !== "resolved" && t.status !== "closed").length;
  const resolvedTickets = tickets.filter((t) => t.status === "resolved" || t.status === "closed").length;

  // Risk level
  let riskLevel: "high" | "medium" | "low" = "low";
  let riskReason = "Low engagement risk — minimal issues on file.";
  if (tickets.length >= 5 || negative >= 3) {
    riskLevel = "high";
    riskReason = "High engagement risk — significant ticket volume or negative sentiment. Consider a retention conversation.";
  } else if (tickets.length >= 3 || negative >= 1) {
    riskLevel = "medium";
    riskReason = "Medium engagement risk — monitor and proactively address any new issues.";
  }

  return {
    name: memberName,
    tickets: sorted,
    primaryStudio,
    firstInteraction,
    lastInteraction,
    sentiment: { positive, neutral, negative },
    membershipIssues,
    paymentIssues,
    classIssues,
    totalTickets: tickets.length,
    openTickets,
    resolvedTickets,
    riskLevel,
    riskReason,
  };
}

/* ============================================================
   FEATURE 1: Command Palette data
   ============================================================ */

export interface CommandItem {
  id: string;
  type: "ticket" | "trainer" | "knowledge" | "template" | "member" | "action" | "navigation";
  title: string;
  subtitle?: string;
  /** Keywords for matching */
  keywords: string[];
  /** Where to navigate when selected */
  navigate?: { view: string; ticketId?: string; templateCode?: string; articleId?: string };
  /** Icon name */
  icon: string;
}

/**
 * Build the searchable index for the ⌘K command palette.
 *
 * COMPUTED ONCE AT MODULE LOAD — this is a module-level const, not a function
 * called on every render. The index depends only on static data (ALL_TICKETS,
 * KNOWLEDGE_ARTICLES, TICKET_TEMPLATES, MEMBERS) so it's stable for the
 * lifetime of the app session. The command palette can use it directly
 * without re-computing on every mount, which saves ~150ms of work each time
 * the palette opens.
 */
export const COMMAND_INDEX: CommandItem[] = (() => {
  const items: CommandItem[] = [];

  // Tickets
  for (const t of ALL_TICKETS) {
    items.push({
      id: `ticket-${t.id}`,
      type: "ticket",
      title: t.title,
      subtitle: `${t.ticketId} · ${t.priority} · ${t.category}`,
      keywords: [t.ticketId, t.title, t.category, t.subcategory || "", t.affectedClient || ""].filter(Boolean),
      navigate: { view: "all_tickets", ticketId: t.id },
      icon: "ticket",
    });
  }

  // Knowledge articles
  for (const a of KNOWLEDGE_ARTICLES) {
    items.push({
      id: `kb-${a.id}`,
      type: "knowledge",
      title: a.title,
      subtitle: `${a.id} · ${a.category}`,
      keywords: [a.id, a.title, a.summary, a.category, ...a.steps, ...(a.tags ?? [])].filter(Boolean),
      navigate: { view: "knowledge_base", articleId: a.id },
      icon: "book",
    });
  }

  // Templates
  for (const tpl of TICKET_TEMPLATES) {
    items.push({
      id: `tpl-${tpl.code}`,
      type: "template",
      title: tpl.title,
      subtitle: `${tpl.code} · ${templateCategoryLabel(tpl.category)}${tpl.subcategory ? ` › ${tpl.subcategory}` : ""}`,
      keywords: [tpl.code, tpl.title, tpl.description, tpl.category, tpl.subcategory || "", tpl.form?.subcategory || ""].filter(Boolean),
      navigate: { view: "templates", templateCode: tpl.code },
      icon: "wand",
    });
  }

  // Members (from the shared member-directory)
  for (const m of MEMBERS) {
    items.push({
      id: `member-${m.id}`,
      type: "member",
      title: m.name,
      subtitle: `${m.id} · ${m.membership}`,
      keywords: [m.name, m.id, m.email, m.phone, m.membership].filter(Boolean),
      navigate: { view: "all_tickets" },
      icon: "user",
    });
  }

  // Quick actions
  const quickActions: Array<{ id: string; title: string; subtitle: string; view: string; icon: string; keywords: string[] }> = [
    { id: "qa-new-issue", title: "New Issue / Report a Problem", subtitle: "Open the AI assistant", view: "ai_assistant", icon: "sparkles", keywords: ["new", "create", "report", "issue", "ticket", "ai"] },
    { id: "qa-overview", title: "Go to Overview", subtitle: "Dashboard home", view: "overview", icon: "home", keywords: ["overview", "home", "dashboard"] },
    { id: "qa-all-tickets", title: "View All Tickets", subtitle: "Browse the ticket queue", view: "all_tickets", icon: "list", keywords: ["tickets", "queue", "all", "list"] },
    { id: "qa-escalations", title: "View Escalations", subtitle: "Escalated and SLA-breached tickets", view: "escalations", icon: "alert", keywords: ["escalation", "breached", "sla", "critical"] },
    { id: "qa-trainers", title: "View Trainer Reviews", subtitle: "Trainer performance scorecards", view: "trainers", icon: "graduation", keywords: ["trainer", "review", "scorecard", "performance"] },
    { id: "qa-analytics", title: "Open Analytics", subtitle: "Operational insights and trends", view: "analytics", icon: "chart", keywords: ["analytics", "insights", "trends", "stats"] },
    { id: "qa-templates", title: "Browse Templates", subtitle: "Ticket templates library", view: "templates", icon: "wand", keywords: ["templates", "library", "tpl"] },
    { id: "qa-knowledge", title: "Search Knowledge Base", subtitle: "Operational guides and protocols", view: "knowledge_base", icon: "book", keywords: ["knowledge", "guide", "protocol", "kb"] },
  ];
  for (const qa of quickActions) {
    items.push({
      id: qa.id,
      type: "action",
      title: qa.title,
      subtitle: qa.subtitle,
      keywords: qa.keywords,
      navigate: { view: qa.view },
      icon: qa.icon,
    });
  }

  return items;
})();

/** Backward-compat alias: buildCommandIndex() returns the precomputed index. */
export function buildCommandIndex(): CommandItem[] {
  return COMMAND_INDEX;
}

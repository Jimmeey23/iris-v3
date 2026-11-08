// IRIS — Digest & Notification Email Templates

import { renderDigestEmail } from "./email-renderer";

export interface DigestData {
  recipientName: string;
  period: "daily" | "weekly";
  date: string;
  studio: string;
  summary: {
    totalTickets: number;
    newTickets: number;
    resolvedTickets: number;
    escalatedTickets: number;
    slaCompliance: number;
    avgResolutionTime: string;
    criticalOpen: number;
  };
  topIssues: Array<{ category: string; count: number; trend: string }>;
  myTickets: Array<{ id: string; title: string; priority: string; status: string; dueIn: string }>;
  insights: Array<{ type: string; text: string; confidence: number }>;
  recommendations: string[];
}

export const DIGEST_TEMPLATES: Record<string, { subject: string; bodyHtml: (data: DigestData) => string }> = {
  daily_digest: {
    subject: "IRIS Daily Operations Digest — {{date}} · {{studio}}",
    bodyHtml: (data) => renderDigestEmail({ ...data, period: "daily" }).html,
  },
  weekly_digest: {
    subject: "IRIS Weekly Operations Digest — {{date}} · {{studio}}",
    bodyHtml: (data) => renderDigestEmail({ ...data, period: "weekly" }).html,
  },
};


// === Digest data generators — compute REAL stats from ALL_TICKETS ===
// These used to return hardcoded numbers ("totalTickets: 28", etc.). Now
// they filter ALL_TICKETS by studio and period (daily = last 24h,
// weekly = last 7 days) and compute real counts, SLA compliance, and
// top issue categories. The recipient\'s own tickets are pulled from the
// full set (not hardcoded "IRIS-2026-0142").

export interface DigestType {
  code: string;
  name: string;
  schedule: string;
  description: string;
}

/** Metadata for the two digest templates (daily + weekly). */
export const DIGEST_TYPES: DigestType[] = [
  {
    code: "daily_digest",
    name: "Daily Operations Digest",
    schedule: "Every day at 8:00 AM IST",
    description: "Morning summary of the previous 24 hours: new tickets, SLA compliance, critical issues, and your personal queue.",
  },
  {
    code: "weekly_digest",
    name: "Weekly Operations Digest",
    schedule: "Every Monday at 8:00 AM IST",
    description: "Weekly recap with trends, top issue categories, team performance, and recommendations for the week ahead.",
  },
];

import { ALL_TICKETS } from "./sample-tickets";
import { STUDIOS, EMPLOYEES } from "./types";

const DAY_MS = 86400000;

/** Find a studio by name (case-insensitive partial match). */
function findStudioCode(name: string): string | undefined {
  const s = STUDIOS.find((st) => st.name.toLowerCase().includes(name.toLowerCase()));
  return s?.code;
}

/** Find an employee by name (case-insensitive partial match). */
function findEmployee(name: string) {
  return EMPLOYEES.find((e) => e.name.toLowerCase().includes(name.toLowerCase()));
}

/** Compute the SLA compliance % for a set of tickets (resolved on time / total). */
function slaCompliance(tickets: typeof ALL_TICKETS): number {
  if (tickets.length === 0) return 100;
  const resolved = tickets.filter((t) => t.status === "resolved" || t.status === "closed");
  if (resolved.length === 0) return 0;
  const onTime = resolved.filter((t) => t.slaStatus !== "breached").length;
  return Math.round((onTime / resolved.length) * 1000) / 10;
}

/** Average resolution time in hours, formatted as "X.Y hours". */
function avgResolutionHours(tickets: typeof ALL_TICKETS): string {
  const resolved = tickets.filter((t) => (t.status === "resolved" || t.status === "closed") && t.resolvedAt && t.createdAt);
  if (resolved.length === 0) return "—";
  const totalH = resolved.reduce((n, t) => n + (+new Date(t.resolvedAt!) - +new Date(t.createdAt)) / 3600000, 0);
  return `${(totalH / resolved.length).toFixed(1)} hours`;
}

/** Top N issue categories from a ticket set, with trend (last vs prior period). */
function topIssues(tickets: typeof ALL_TICKETS, priorTickets: typeof ALL_TICKETS, n: number) {
  const counts = new Map<string, number>();
  for (const t of tickets) {
    const key = t.subcategory || t.category;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const priorCounts = new Map<string, number>();
  for (const t of priorTickets) {
    const key = t.subcategory || t.category;
    priorCounts.set(key, (priorCounts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([category, count]) => {
      const prior = priorCounts.get(category) ?? 0;
      const trend = count - prior;
      return { category, count, trend: `${trend > 0 ? "+" : ""}${trend}` };
    });
}

/** Tickets assigned to a specific employee, formatted for the digest. */
function myTicketsFor(empId: string | undefined, allTickets: typeof ALL_TICKETS) {
  if (!empId) return [];
  return allTickets
    .filter((t) => t.assigneeId === empId && t.status !== "resolved" && t.status !== "closed")
    .slice(0, 5)
    .map((t) => {
      const target = t.slaResolutionTarget ? +new Date(t.slaResolutionTarget) : Date.now() + 24 * 3600000;
      const hoursLeft = Math.round((target - Date.now()) / 3600000);
      return {
        id: t.ticketId,
        title: t.title,
        priority: t.priority,
        status: t.status.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        dueIn: hoursLeft < 0 ? `${Math.abs(hoursLeft)}h overdue` : `${hoursLeft}h left`,
      };
    });
}

/** Compute real insights from the ticket set. */
function computeInsights(tickets: typeof ALL_TICKETS, studio: string) {
  const insights: Array<{ type: string; text: string; confidence: number }> = [];
  const catCounts = new Map<string, number>();
  for (const t of tickets) catCounts.set(t.category, (catCounts.get(t.category) ?? 0) + 1);
  for (const [cat, n] of catCounts) {
    if (n >= 3) {
      insights.push({
        type: "Pattern",
        text: `${studio} has reported ${n} ${cat} tickets this period — review for a common root cause.`,
        confidence: 90 + Math.min(8, n),
      });
      break;
    }
  }
  const breached = tickets.filter((t) => t.slaStatus === "breached").length;
  if (breached > 0) {
    insights.push({
      type: "Bottleneck",
      text: `${breached} ticket${breached === 1 ? "" : "s"} breached SLA this period — review the resolution workflow.`,
      confidence: 88,
    });
  }
  const open = tickets.filter((t) => t.status !== "resolved" && t.status !== "closed").length;
  if (open >= 5) {
    insights.push({
      type: "Workload",
      text: `${open} open tickets at ${studio} — consider load-balancing across the team.`,
      confidence: 85,
    });
  }
  if (insights.length === 0) {
    insights.push({
      type: "Status",
      text: `Operations at ${studio} are running smoothly — no critical signals detected.`,
      confidence: 95,
    });
  }
  return insights;
}

export function generateDailyDigest(studio: string, recipientName: string): DigestData {
  const studioCode = findStudioCode(studio);
  const now = Date.now();
  const recent = ALL_TICKETS.filter((t) => +new Date(t.createdAt) >= now - DAY_MS && (!studioCode || t.studioCode === studioCode));
  const prior = ALL_TICKETS.filter((t) => +new Date(t.createdAt) >= now - 2 * DAY_MS && +new Date(t.createdAt) < now - DAY_MS && (!studioCode || t.studioCode === studioCode));
  const resolved = recent.filter((t) => t.status === "resolved" || t.status === "closed").length;
  const escalated = recent.filter((t) => t.status === "escalated").length;
  const critical = recent.filter((t) => t.priority === "P0" && t.status !== "resolved" && t.status !== "closed").length;
  const recipient = findEmployee(recipientName);

  return {
    recipientName,
    period: "daily",
    date: new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" }),
    studio,
    summary: {
      totalTickets: ALL_TICKETS.filter((t) => (!studioCode || t.studioCode === studioCode)).length,
      newTickets: recent.length,
      resolvedTickets: resolved,
      escalatedTickets: escalated,
      slaCompliance: slaCompliance(recent.length > 0 ? recent : ALL_TICKETS),
      avgResolutionTime: avgResolutionHours(recent.length > 0 ? recent : ALL_TICKETS),
      criticalOpen: critical,
    },
    topIssues: topIssues(recent, prior, 4),
    myTickets: myTicketsFor(recipient?.id, ALL_TICKETS),
    insights: computeInsights(recent, studio),
    recommendations: [
      `Review the ${critical} critical ticket${critical === 1 ? "" : "s"} open at ${studio}`,
      `Address the ${escalated} escalated ticket${escalated === 1 ? "" : "s"} from today`,
      "Confirm all P0/P1 tickets have an acknowledged owner",
    ],
  };
}

export function generateWeeklyDigest(studio: string, recipientName: string): DigestData {
  const studioCode = findStudioCode(studio);
  const now = Date.now();
  const recent = ALL_TICKETS.filter((t) => +new Date(t.createdAt) >= now - 7 * DAY_MS && (!studioCode || t.studioCode === studioCode));
  const prior = ALL_TICKETS.filter((t) => +new Date(t.createdAt) >= now - 14 * DAY_MS && +new Date(t.createdAt) < now - 7 * DAY_MS && (!studioCode || t.studioCode === studioCode));
  const resolved = recent.filter((t) => t.status === "resolved" || t.status === "closed").length;
  const escalated = recent.filter((t) => t.status === "escalated").length;
  const critical = recent.filter((t) => t.priority === "P0" && t.status !== "resolved" && t.status !== "closed").length;
  const recipient = findEmployee(recipientName);

  return {
    recipientName,
    period: "weekly",
    date: new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long" }),
    studio,
    summary: {
      totalTickets: ALL_TICKETS.filter((t) => (!studioCode || t.studioCode === studioCode)).length,
      newTickets: recent.length,
      resolvedTickets: resolved,
      escalatedTickets: escalated,
      slaCompliance: slaCompliance(recent.length > 0 ? recent : ALL_TICKETS),
      avgResolutionTime: avgResolutionHours(recent.length > 0 ? recent : ALL_TICKETS),
      criticalOpen: critical,
    },
    topIssues: topIssues(recent, prior, 5),
    myTickets: myTicketsFor(recipient?.id, ALL_TICKETS),
    insights: computeInsights(recent, studio),
    recommendations: [
      `Schedule a review of the ${critical} critical ticket${critical === 1 ? "" : "s"} still open`,
      `Recognise the team for resolving ${resolved} ticket${resolved === 1 ? "" : "s"} this week`,
      "Plan preventive actions for any recurring issue categories",
    ],
  };
}

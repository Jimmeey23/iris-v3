// IRIS — Digest & Notification Email Templates

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
    subject: "📊 IRIS Daily Digest — {{date}} · {{studio}}",
    bodyHtml: (data) => `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 640px; margin: 0 auto; background: #f5f5f7; padding: 20px;">
  <div style="background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.06);">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 50%, #a855f7 100%); padding: 28px 32px; position: relative; overflow: hidden;">
      <div style="position: absolute; top: -20px; right: -20px; width: 120px; height: 120px; background: rgba(255,255,255,0.08); border-radius: 50%;"></div>
      <div style="position: absolute; bottom: -30px; left: -10px; width: 80px; height: 80px; background: rgba(255,255,255,0.06); border-radius: 50%;"></div>
      <div style="position: relative;">
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
          <div style="width: 36px; height: 36px; background: rgba(255,255,255,0.2); border-radius: 10px; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(10px);">
            <span style="color: white; font-weight: 700; font-size: 16px;">IR</span>
          </div>
          <div>
            <div style="color: white; font-weight: 700; font-size: 15px; letter-spacing: -0.3px;">IRIS Daily Digest</div>
            <div style="color: rgba(255,255,255,0.8); font-size: 11px; font-weight: 500;">${data.date} · ${data.studio}</div>
          </div>
        </div>
        <div style="color: rgba(255,255,255,0.9); font-size: 13px; line-height: 1.5; margin-top: 12px;">
          Hi ${data.recipientName}, here's your operations summary for today.
        </div>
      </div>
    </div>

    <!-- KPI Grid -->
    <div style="padding: 24px 32px;">
      <div style="font-size: 11px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 12px;">Today's Summary</div>
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 24px;">
        ${kpiCard("Total", String(data.summary.totalTickets), "#8b5cf6")}
        ${kpiCard("New Today", String(data.summary.newTickets), "#10b981")}
        ${kpiCard("Resolved", String(data.summary.resolvedTickets), "#06b6d4")}
        ${kpiCard("Critical Open", String(data.summary.criticalOpen), "#f43f5e")}
        ${kpiCard("Escalated", String(data.summary.escalatedTickets), "#f59e0b")}
        ${kpiCard("SLA %", String(data.summary.slaCompliance) + "%", "#8b5cf6")}
      </div>

      <!-- Avg Resolution -->
      <div style="background: linear-gradient(135deg, #f0f9ff, #e0f2fe); border: 1px solid #bae6fd; border-radius: 12px; padding: 16px; margin-bottom: 24px; display: flex; align-items: center; gap: 16px;">
        <div style="width: 44px; height: 44px; background: linear-gradient(135deg, #0ea5e9, #0284c7); border-radius: 12px; display: flex; align-items: center; justify-content: center;">
          <span style="color: white; font-size: 20px;">⏱</span>
        </div>
        <div style="flex: 1;">
          <div style="font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Average Resolution Time</div>
          <div style="font-size: 20px; font-weight: 700; color: #0c4a6e; margin-top: 2px;">${data.summary.avgResolutionTime}</div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 11px; color: #64748b;">SLA Compliance</div>
          <div style="font-size: 16px; font-weight: 700; color: ${data.summary.slaCompliance > 90 ? "#10b981" : data.summary.slaCompliance > 80 ? "#f59e0b" : "#ef4444"};">${data.summary.slaCompliance}%</div>
        </div>
      </div>

      <!-- Top Issues -->
      ${data.topIssues.length > 0 ? `
      <div style="font-size: 11px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 10px;">Top Issue Categories</div>
      <div style="margin-bottom: 24px;">
        ${data.topIssues.map((issue, i) => `
          <div style="display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: ${i < data.topIssues.length - 1 ? "1px solid #f3f4f6" : "none"};">
            <div style="width: 32px; height: 32px; background: #f3e8ff; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; color: #7c3aed;">${issue.count}</div>
            <div style="flex: 1;">
              <div style="font-size: 13px; font-weight: 600; color: #111827;">${issue.category}</div>
            </div>
            <div style="font-size: 11px; font-weight: 600; color: ${issue.trend.startsWith("+") ? "#ef4444" : "#10b981"}; background: ${issue.trend.startsWith("+") ? "#fef2f2" : "#f0fdf4"}; padding: 3px 8px; border-radius: 6px;">${issue.trend}</div>
          </div>
        `).join("")}
      </div>` : ""}

      <!-- My Tickets -->
      ${data.myTickets.length > 0 ? `
      <div style="font-size: 11px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 10px;">Your Active Tickets (${data.myTickets.length})</div>
      <div style="margin-bottom: 24px;">
        ${data.myTickets.map((t) => `
          <div style="background: #fafafa; border: 1px solid #f3f4f6; border-radius: 10px; padding: 12px; margin-bottom: 8px; display: flex; align-items: center; gap: 12px;">
            <div style="padding: 3px 8px; border-radius: 5px; font-size: 10px; font-weight: 700; ${priorityColor(t.priority)}">${t.priority}</div>
            <div style="flex: 1; min-width: 0;">
              <div style="font-size: 12px; font-weight: 600; color: #111827; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${t.title}</div>
              <div style="font-size: 10px; color: #6b7280; margin-top: 2px;">${t.id} · ${t.status}</div>
            </div>
            <div style="font-size: 10px; color: #6b7280; font-weight: 600;">Due: ${t.dueIn}</div>
          </div>
        `).join("")}
      </div>` : ""}

      <!-- AI Insights -->
      ${data.insights.length > 0 ? `
      <div style="background: linear-gradient(135deg, #faf5ff, #f3e8ff); border: 1px solid #d8b4fe; border-radius: 12px; padding: 16px; margin-bottom: 16px;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
          <div style="width: 24px; height: 24px; background: linear-gradient(135deg, #8b5cf6, #6366f1); border-radius: 6px; display: flex; align-items: center; justify-content: center;">
            <span style="color: white; font-size: 12px;">✨</span>
          </div>
          <div style="font-size: 12px; font-weight: 700; color: #6b21a8;">AI Insights & Recommendations</div>
        </div>
        ${data.insights.map((insight) => `
          <div style="margin-bottom: 10px; padding: 10px; background: white; border-radius: 8px; border: 1px solid #e9d5ff;">
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
              <span style="font-size: 10px; font-weight: 700; color: #7c3aed; text-transform: uppercase; letter-spacing: 0.05em;">${insight.type}</span>
              <span style="font-size: 10px; color: #6b7280;">· ${insight.confidence}% confidence</span>
            </div>
            <div style="font-size: 12px; color: #374151; line-height: 1.5;">${insight.text}</div>
          </div>
        `).join("")}
        ${data.recommendations.length > 0 ? `
        <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e9d5ff;">
          <div style="font-size: 11px; font-weight: 700; color: #6b21a8; margin-bottom: 6px;">Recommended Actions:</div>
          ${data.recommendations.map((r) => `<div style="font-size: 11px; color: #374151; padding: 3px 0; padding-left: 16px; position: relative;">→ ${r}</div>`).join("")}
        </div>` : ""}
      </div>` : ""}

      <!-- Footer -->
      <div style="text-align: center; padding-top: 16px; border-top: 1px solid #f3f4f6;">
        <a href="#" style="display: inline-block; background: linear-gradient(135deg, #8b5cf6, #6366f1); color: white; padding: 10px 24px; border-radius: 10px; text-decoration: none; font-size: 13px; font-weight: 600;">Open IRIS Dashboard →</a>
        <div style="margin-top: 12px; font-size: 10px; color: #9ca3af;">You're receiving this because you have an active IRIS account. Manage digest preferences in Settings.</div>
      </div>
    </div>
  </div>
</div>`,
  },

  weekly_digest: {
    subject: "📈 IRIS Weekly Summary — {{date}} · {{studio}}",
    bodyHtml: (data) => `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 640px; margin: 0 auto; background: #f5f5f7; padding: 20px;">
  <div style="background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.06);">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%); padding: 32px;">
      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
        <div style="width: 40px; height: 40px; background: rgba(255,255,255,0.2); border-radius: 10px; display: flex; align-items: center; justify-content: center;">
          <span style="color: white; font-weight: 700; font-size: 18px;">IR</span>
        </div>
        <div>
          <div style="color: white; font-weight: 700; font-size: 16px;">IRIS Weekly Summary</div>
          <div style="color: rgba(255,255,255,0.8); font-size: 12px;">Week of ${data.date} · ${data.studio}</div>
        </div>
      </div>
      <div style="color: rgba(255,255,255,0.95); font-size: 14px; line-height: 1.6; margin-top: 16px;">
        Hi ${data.recipientName}, here's your complete weekly operations intelligence report.
      </div>
    </div>

    <div style="padding: 28px 32px;">
      <!-- Weekly KPIs -->
      <div style="font-size: 11px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 12px;">Weekly Performance</div>
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 24px;">
        ${kpiCard("Total", String(data.summary.totalTickets), "#6366f1")}
        ${kpiCard("New", String(data.summary.newTickets), "#10b981")}
        ${kpiCard("Resolved", String(data.summary.resolvedTickets), "#06b6d4")}
        ${kpiCard("SLA %", String(data.summary.slaCompliance) + "%", "#8b5cf6")}
      </div>

      <!-- Highlights -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 24px;">
        <div style="background: linear-gradient(135deg, #f0fdf4, #dcfce7); border: 1px solid #bbf7d0; border-radius: 12px; padding: 16px;">
          <div style="font-size: 11px; font-weight: 600; color: #166534; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Avg Resolution</div>
          <div style="font-size: 22px; font-weight: 700; color: #14532d;">${data.summary.avgResolutionTime}</div>
        </div>
        <div style="background: linear-gradient(135deg, #fef2f2, #fee2e2); border: 1px solid #fecaca; border-radius: 12px; padding: 16px;">
          <div style="font-size: 11px; font-weight: 600; color: #991b1b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Critical Open</div>
          <div style="font-size: 22px; font-weight: 700; color: #7f1d1d;">${data.summary.criticalOpen}</div>
        </div>
      </div>

      <!-- Top Issues -->
      ${data.topIssues.length > 0 ? `
      <div style="font-size: 11px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 10px;">Issue Patterns This Week</div>
      <div style="margin-bottom: 24px;">
        ${data.topIssues.map((issue, i) => `
          <div style="display: flex; align-items: center; gap: 12px; padding: 12px; background: #fafafa; border-radius: 10px; margin-bottom: 6px;">
            <div style="width: 36px; height: 36px; background: linear-gradient(135deg, #ede9fe, #ddd6fe); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700; color: #6d28e9;">${issue.count}</div>
            <div style="flex: 1;">
              <div style="font-size: 13px; font-weight: 600; color: #111827;">${issue.category}</div>
            </div>
            <div style="font-size: 11px; font-weight: 600; color: ${issue.trend.startsWith("+") ? "#dc2626" : "#16a34a"}; background: ${issue.trend.startsWith("+") ? "#fef2f2" : "#f0fdf4"}; padding: 4px 10px; border-radius: 6px;">${issue.trend} this week</div>
          </div>
        `).join("")}
      </div>` : ""}

      <!-- AI Insights -->
      ${data.insights.length > 0 ? `
      <div style="background: linear-gradient(135deg, #faf5ff, #ede9fe); border: 1px solid #c4b5fd; border-radius: 14px; padding: 20px; margin-bottom: 20px;">
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 16px;">
          <div style="width: 32px; height: 32px; background: linear-gradient(135deg, #8b5cf6, #6366f1); border-radius: 8px; display: flex; align-items: center; justify-content: center;">
            <span style="color: white; font-size: 14px;">✨</span>
          </div>
          <div>
            <div style="font-size: 14px; font-weight: 700; color: #5b21b6;">Weekly AI Insights</div>
            <div style="font-size: 10px; color: #7c3aed;">Generated by IRIS Intelligence Agent</div>
          </div>
        </div>
        ${data.insights.map((insight) => `
          <div style="margin-bottom: 12px; padding: 14px; background: white; border-radius: 10px; border: 1px solid #ddd6fe;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
              <span style="font-size: 10px; font-weight: 700; color: #6d28e9; background: #ede9fe; padding: 3px 8px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.05em;">${insight.type}</span>
              <span style="font-size: 10px; color: #6b7280;">${insight.confidence}% confidence</span>
            </div>
            <div style="font-size: 13px; color: #1f2937; line-height: 1.6;">${insight.text}</div>
          </div>
        `).join("")}
        ${data.recommendations.length > 0 ? `
        <div style="margin-top: 16px; padding: 14px; background: linear-gradient(135deg, #f0fdf4, #dcfce7); border-radius: 10px;">
          <div style="font-size: 12px; font-weight: 700; color: #166534; margin-bottom: 8px;">📋 Recommended Actions for Next Week:</div>
          ${data.recommendations.map((r, i) => `<div style="font-size: 12px; color: #14532d; padding: 4px 0; padding-left: 24px; position: relative;"><span style="position: absolute; left: 0; color: #16a34a; font-weight: 700;">${i + 1}.</span> ${r}</div>`).join("")}
        </div>` : ""}
      </div>` : ""}

      <!-- Footer -->
      <div style="text-align: center; padding-top: 20px; border-top: 1px solid #f3f4f6;">
        <a href="#" style="display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 12px 28px; border-radius: 12px; text-decoration: none; font-size: 13px; font-weight: 600;">View Full Analytics →</a>
        <div style="margin-top: 14px; font-size: 10px; color: #9ca3af;">IRIS · Physique 57 India · Issue Resolution & Intelligence System</div>
      </div>
    </div>
  </div>
</div>`,
  },
};

function kpiCard(label: string, value: string, color: string): string {
  return `
    <div style="background: #fafafa; border: 1px solid #f3f4f6; border-radius: 10px; padding: 12px; text-align: center;">
      <div style="font-size: 10px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">${label}</div>
      <div style="font-size: 22px; font-weight: 700; color: ${color}; margin-top: 4px;">${value}</div>
    </div>`;
}

function priorityColor(priority: string): string {
  const map: Record<string, string> = {
    P0: "background: #fee2e2; color: #dc2626;",
    P1: "background: #fef3c7; color: #d97706;",
    P2: "background: #dbeafe; color: #2563eb;",
    P3: "background: #d1fae5; color: #059669;",
  };
  return map[priority] || map.P3;
}

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

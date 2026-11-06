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

// Sample digest data generators
export function generateDailyDigest(studio: string, recipientName: string): DigestData {
  return {
    recipientName,
    period: "daily",
    date: new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" }),
    studio,
    summary: {
      totalTickets: 28,
      newTickets: 8,
      resolvedTickets: 12,
      escalatedTickets: 2,
      slaCompliance: 87.5,
      avgResolutionTime: "11.4 hours",
      criticalOpen: 1,
    },
    topIssues: [
      { category: "HVAC Issues", count: 5, trend: "+2" },
      { category: "Membership Freezes", count: 4, trend: "+1" },
      { category: "Payment Sync", count: 3, trend: "-1" },
      { category: "Booking Errors", count: 2, trend: "+1" },
    ],
    myTickets: [
      { id: "IRIS-2026-0142", title: "AC Malfunction — Kwality House", priority: "P1", status: "In Progress", dueIn: "3h left" },
      { id: "IRIS-2026-0138", title: "Payment Not In System — ₹3,500", priority: "P1", status: "Open", dueIn: "21h left" },
      { id: "IRIS-2026-0135", title: "Attendance Record Correction", priority: "P2", status: "Awaiting Response", dueIn: "26h left" },
    ],
    insights: [
      { type: "Pattern", text: "Kwality House has reported 3 AC issues in 6 weeks — preventive maintenance recommended.", confidence: 94 },
      { type: "Bottleneck", text: "Payment tickets are taking 28% longer than SLA. Consider automating bank verification.", confidence: 89 },
      { type: "Workload", text: "Facilities team at 67% capacity. Cross-training front desk on basic maintenance could reduce load.", confidence: 91 },
    ],
    recommendations: [
      "Schedule HVAC preventive maintenance at Kwality House",
      "Review payment verification workflow for automation",
      "Plan cross-training session for front desk staff",
    ],
  };
}

export function generateWeeklyDigest(studio: string, recipientName: string): DigestData {
  return {
    recipientName,
    period: "weekly",
    date: new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long" }),
    studio,
    summary: {
      totalTickets: 247,
      newTickets: 68,
      resolvedTickets: 72,
      escalatedTickets: 8,
      slaCompliance: 87.5,
      avgResolutionTime: "11.4 hours",
      criticalOpen: 3,
    },
    topIssues: [
      { category: "HVAC Issues", count: 12, trend: "+3" },
      { category: "Membership Freezes", count: 8, trend: "+1" },
      { category: "Payment Sync", count: 7, trend: "+2" },
      { category: "Sound System", count: 5, trend: "-1" },
      { category: "Booking Errors", count: 4, trend: "+1" },
    ],
    myTickets: [
      { id: "IRIS-2026-0142", title: "AC Malfunction — Kwality House", priority: "P1", status: "In Progress", dueIn: "3h left" },
      { id: "IRIS-2026-0140", title: "Sound System Failure — Supreme HQ", priority: "P0", status: "Escalated", dueIn: "1h left" },
    ],
    insights: [
      { type: "Trend", text: "Ticket volume increased 8% this week, driven primarily by facilities issues at Kwality House.", confidence: 92 },
      { type: "Pattern", text: "Payment sync issues spike on Mondays — likely related to weekend transaction batching.", confidence: 88 },
      { type: "Performance", text: "Resolution time improved 12% this week — automation features are paying off.", confidence: 95 },
      { type: "Risk", text: "3 critical tickets open longer than 2 hours — recommend immediate attention.", confidence: 96 },
    ],
    recommendations: [
      "Implement pre-class AC check protocol during summer months",
      "Automate 34% of membership freeze requests with rule-based approval",
      "Adjust P2 SLA target from 48h to 36h based on resolution trends",
      "Schedule cross-training for front desk on basic facilities troubleshooting",
    ],
  };
}

export const DIGEST_TYPES = [
  { code: "daily_digest", name: "Daily Digest", description: "Sent every morning at 9:00 AM with yesterday's summary and today's outlook", schedule: "Daily · 9:00 AM IST" },
  { code: "weekly_digest", name: "Weekly Summary", description: "Sent every Monday at 9:00 AM with last week's complete intelligence report", schedule: "Weekly · Monday 9:00 AM IST" },
];

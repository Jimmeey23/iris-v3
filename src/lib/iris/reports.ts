// IRIS — 100+ Reports Library

export interface ReportItem {
  code: string;
  name: string;
  description: string;
  category: string;
  type: "tabular" | "chart" | "summary" | "matrix";
  dataSource: string;
  outputFormats: string[];
  visualizations?: string[];
}

export const REPORTS: ReportItem[] = [
  // === Ticket Operations (20) ===
  { code: "RPT-001", name: "All Tickets Summary", description: "Complete summary of all tickets across studios", category: "Ticket Operations", type: "summary", dataSource: "tickets", outputFormats: ["csv", "xlsx", "pdf", "json"], visualizations: ["kpi", "trend"] },
  { code: "RPT-002", name: "Open Tickets by Studio", description: "Currently open tickets grouped by studio", category: "Ticket Operations", type: "tabular", dataSource: "tickets", outputFormats: ["csv", "xlsx", "pdf"], visualizations: ["bar"] },
  { code: "RPT-003", name: "Tickets by Priority Distribution", description: "Distribution of tickets across priority levels", category: "Ticket Operations", type: "chart", dataSource: "tickets", outputFormats: ["pdf", "png", "csv"], visualizations: ["pie", "bar"] },
  { code: "RPT-004", name: "Tickets by Status Distribution", description: "Current status distribution of all tickets", category: "Ticket Operations", type: "chart", dataSource: "tickets", outputFormats: ["pdf", "png"], visualizations: ["donut"] },
  { code: "RPT-005", name: "Ticket Volume Trend — Daily", description: "Daily ticket creation trend over selected period", category: "Ticket Operations", type: "chart", dataSource: "tickets", outputFormats: ["pdf", "png", "csv"], visualizations: ["line"] },
  { code: "RPT-006", name: "Ticket Volume Trend — Weekly", description: "Weekly ticket creation trend", category: "Ticket Operations", type: "chart", dataSource: "tickets", outputFormats: ["pdf", "png", "csv"], visualizations: ["line", "bar"] },
  { code: "RPT-007", name: "Ticket Volume Trend — Monthly", description: "Monthly ticket creation trend", category: "Ticket Operations", type: "chart", dataSource: "tickets", outputFormats: ["pdf", "png", "csv"], visualizations: ["line", "bar"] },
  { code: "RPT-008", name: "Ticket Resolution Time Analysis", description: "Average resolution time by category and priority", category: "Ticket Operations", type: "matrix", dataSource: "tickets", outputFormats: ["xlsx", "pdf", "csv"], visualizations: ["heatmap"] },
  { code: "RPT-009", name: "First Response Time Analysis", description: "First response time metrics by priority", category: "Ticket Operations", type: "tabular", dataSource: "tickets", outputFormats: ["xlsx", "csv", "pdf"], visualizations: ["bar"] },
  { code: "RPT-010", name: "Reopened Tickets Report", description: "Tickets that have been reopened", category: "Ticket Operations", type: "tabular", dataSource: "tickets", outputFormats: ["xlsx", "csv", "pdf"] },
  { code: "RPT-011", name: "Escalated Tickets Report", description: "All escalated tickets with escalation reasons", category: "Ticket Operations", type: "tabular", dataSource: "tickets", outputFormats: ["xlsx", "csv", "pdf"] },
  { code: "RPT-012", name: "Tickets by Category", description: "Ticket distribution by issue category", category: "Ticket Operations", type: "chart", dataSource: "tickets", outputFormats: ["pdf", "png", "csv"], visualizations: ["bar", "pie"] },
  { code: "RPT-013", name: "Tickets by Subcategory", description: "Detailed breakdown by subcategory", category: "Ticket Operations", type: "tabular", dataSource: "tickets", outputFormats: ["xlsx", "csv"] },
  { code: "RPT-014", name: "Ticket Source Analysis", description: "Tickets by source (AI Assistant, manual, email, etc.)", category: "Ticket Operations", type: "chart", dataSource: "tickets", outputFormats: ["pdf", "png"], visualizations: ["pie"] },
  { code: "RPT-015", name: "Unassigned Tickets Report", description: "Tickets currently without an assignee", category: "Ticket Operations", type: "tabular", dataSource: "tickets", outputFormats: ["xlsx", "csv", "pdf"] },
  { code: "RPT-016", name: "Aging Tickets Report", description: "Tickets open beyond defined thresholds", category: "Ticket Operations", type: "tabular", dataSource: "tickets", outputFormats: ["xlsx", "csv", "pdf"], visualizations: ["bar"] },
  { code: "RPT-017", name: "Ticket Closure Rate", description: "Closure rate over selected period", category: "Ticket Operations", type: "summary", dataSource: "tickets", outputFormats: ["pdf", "csv"], visualizations: ["kpi", "trend"] },
  { code: "RPT-018", name: "Ticket Activity Log", description: "Detailed activity log for selected tickets", category: "Ticket Operations", type: "tabular", dataSource: "tickets", outputFormats: ["xlsx", "csv"] },
  { code: "RPT-019", name: "Bulk Ticket Export", description: "Export all ticket data with filters", category: "Ticket Operations", type: "tabular", dataSource: "tickets", outputFormats: ["xlsx", "csv", "json"] },
  { code: "RPT-020", name: "Ticket Search Results Export", description: "Export search results from ticket search", category: "Ticket Operations", type: "tabular", dataSource: "tickets", outputFormats: ["xlsx", "csv"] },

  // === SLA & Performance (15) ===
  { code: "RPT-021", name: "SLA Compliance Overview", description: "Overall SLA compliance percentage", category: "SLA & Performance", type: "summary", dataSource: "tickets", outputFormats: ["pdf", "xlsx"], visualizations: ["kpi", "gauge"] },
  { code: "RPT-022", name: "SLA Compliance by Priority", description: "SLA compliance broken down by priority level", category: "SLA & Performance", type: "tabular", dataSource: "tickets", outputFormats: ["xlsx", "csv", "pdf"], visualizations: ["bar"] },
  { code: "RPT-023", name: "SLA Breach Report", description: "All SLA breaches with details", category: "SLA & Performance", type: "tabular", dataSource: "tickets", outputFormats: ["xlsx", "csv", "pdf"] },
  { code: "RPT-024", name: "SLA At-Risk Tickets", description: "Tickets approaching SLA breach", category: "SLA & Performance", type: "tabular", dataSource: "tickets", outputFormats: ["xlsx", "csv", "pdf"] },
  { code: "RPT-025", name: "Average Resolution Time Trends", description: "Trends in average resolution time", category: "SLA & Performance", type: "chart", dataSource: "tickets", outputFormats: ["pdf", "png", "csv"], visualizations: ["line"] },
  { code: "RPT-026", name: "Average First Response Time Trends", description: "Trends in first response time", category: "SLA & Performance", type: "chart", dataSource: "tickets", outputFormats: ["pdf", "png", "csv"], visualizations: ["line"] },
  { code: "RPT-027", name: "Department SLA Performance", description: "SLA performance by department", category: "SLA & Performance", type: "matrix", dataSource: "tickets", outputFormats: ["xlsx", "pdf"], visualizations: ["heatmap", "bar"] },
  { code: "RPT-028", name: "Studio SLA Performance", description: "SLA performance by studio", category: "SLA & Performance", type: "matrix", dataSource: "tickets", outputFormats: ["xlsx", "pdf"], visualizations: ["heatmap"] },
  { code: "RPT-029", name: "Employee SLA Performance", description: "SLA performance by individual employee", category: "SLA & Performance", type: "tabular", dataSource: "tickets", outputFormats: ["xlsx", "csv", "pdf"], visualizations: ["bar"] },
  { code: "RPT-030", name: "Escalation Rate Analysis", description: "Rate of ticket escalations over time", category: "SLA & Performance", type: "chart", dataSource: "tickets", outputFormats: ["pdf", "png", "csv"], visualizations: ["line"] },
  { code: "RPT-031", name: "Response Time Distribution", description: "Distribution of response times", category: "SLA & Performance", type: "chart", dataSource: "tickets", outputFormats: ["pdf", "png"], visualizations: ["histogram"] },
  { code: "RPT-032", name: "Resolution Time Distribution", description: "Distribution of resolution times", category: "SLA & Performance", type: "chart", dataSource: "tickets", outputFormats: ["pdf", "png"], visualizations: ["histogram"] },
  { code: "RPT-033", name: "SLA Breach Root Cause Analysis", description: "Common causes for SLA breaches", category: "SLA & Performance", type: "summary", dataSource: "tickets", outputFormats: ["pdf", "xlsx"] },
  { code: "RPT-034", name: "Business Hours vs After-Hours SLA", description: "SLA compliance comparison for business vs after hours", category: "SLA & Performance", type: "matrix", dataSource: "tickets", outputFormats: ["xlsx", "pdf"] },
  { code: "RPT-035", name: "SLA Performance Trend — Monthly", description: "Monthly SLA compliance trend", category: "SLA & Performance", type: "chart", dataSource: "tickets", outputFormats: ["pdf", "png", "csv"], visualizations: ["line"] },

  // === Department & Employee (15) ===
  { code: "RPT-036", name: "Department Workload Distribution", description: "Ticket workload across departments", category: "Department & Employee", type: "chart", dataSource: "tickets", outputFormats: ["pdf", "png", "csv"], visualizations: ["bar", "pie"] },
  { code: "RPT-037", name: "Employee Workload Report", description: "Open tickets per employee", category: "Department & Employee", type: "tabular", dataSource: "tickets", outputFormats: ["xlsx", "csv", "pdf"], visualizations: ["bar"] },
  { code: "RPT-038", name: "Employee Performance Summary", description: "Individual employee performance metrics", category: "Department & Employee", type: "summary", dataSource: "tickets", outputFormats: ["pdf", "xlsx"] },
  { code: "RPT-039", name: "Top Performers — Resolution", description: "Employees with best resolution metrics", category: "Department & Employee", type: "tabular", dataSource: "tickets", outputFormats: ["xlsx", "pdf"], visualizations: ["bar"] },
  { code: "RPT-040", name: "Department Response Time", description: "Average response time by department", category: "Department & Employee", type: "tabular", dataSource: "tickets", outputFormats: ["xlsx", "csv", "pdf"], visualizations: ["bar"] },
  { code: "RPT-041", name: "Department Resolution Time", description: "Average resolution time by department", category: "Department & Employee", type: "tabular", dataSource: "tickets", outputFormats: ["xlsx", "csv", "pdf"], visualizations: ["bar"] },
  { code: "RPT-042", name: "Employee Availability Status", description: "Current availability of all employees", category: "Department & Employee", type: "tabular", dataSource: "employees", outputFormats: ["xlsx", "csv", "pdf"] },
  { code: "RPT-043", name: "Department Capacity Analysis", description: "Department workload vs capacity", category: "Department & Employee", type: "matrix", dataSource: "tickets", outputFormats: ["xlsx", "pdf"], visualizations: ["gauge"] },
  { code: "RPT-044", name: "Employee Assignment History", description: "Historical assignments for an employee", category: "Department & Employee", type: "tabular", dataSource: "tickets", outputFormats: ["xlsx", "csv"] },
  { code: "RPT-045", name: "Cross-Department Tickets", description: "Tickets requiring multiple departments", category: "Department & Employee", type: "tabular", dataSource: "tickets", outputFormats: ["xlsx", "csv", "pdf"] },
  { code: "RPT-046", name: "Workload Balance Analysis", description: "Analysis of workload distribution fairness", category: "Department & Employee", type: "summary", dataSource: "tickets", outputFormats: ["pdf", "xlsx"] },
  { code: "RPT-047", name: "Employee Skills Matrix", description: "Skills mapping for routing optimization", category: "Department & Employee", type: "matrix", dataSource: "employees", outputFormats: ["xlsx", "pdf"] },
  { code: "RPT-048", name: "Department Hierarchy Report", description: "Organizational structure overview", category: "Department & Employee", type: "summary", dataSource: "departments", outputFormats: ["pdf"] },
  { code: "RPT-049", name: "Escalation Chain Report", description: "Escalation hierarchy by department", category: "Department & Employee", type: "tabular", dataSource: "employees", outputFormats: ["xlsx", "pdf"] },
  { code: "RPT-050", name: "Employee Productivity Index", description: "Composite productivity score per employee", category: "Department & Employee", type: "tabular", dataSource: "tickets", outputFormats: ["xlsx", "csv", "pdf"], visualizations: ["bar"] },

  // === Studio Operations (12) ===
  { code: "RPT-051", name: "Studio Operations Overview", description: "Complete operational overview by studio", category: "Studio Operations", type: "summary", dataSource: "tickets", outputFormats: ["pdf", "xlsx"], visualizations: ["kpi"] },
  { code: "RPT-052", name: "Studio Comparison Matrix", description: "Side-by-side studio comparison", category: "Studio Operations", type: "matrix", dataSource: "tickets", outputFormats: ["xlsx", "pdf"], visualizations: ["heatmap"] },
  { code: "RPT-053", name: "Mumbai Studios Performance", description: "Performance across Mumbai studios", category: "Studio Operations", type: "summary", dataSource: "tickets", outputFormats: ["pdf", "xlsx"] },
  { code: "RPT-054", name: "Bengaluru Studios Performance", description: "Performance across Bengaluru studios", category: "Studio Operations", type: "summary", dataSource: "tickets", outputFormats: ["pdf", "xlsx"] },
  { code: "RPT-055", name: "Studio Issue Frequency", description: "Most frequent issues by studio", category: "Studio Operations", type: "tabular", dataSource: "tickets", outputFormats: ["xlsx", "csv", "pdf"], visualizations: ["bar"] },
  { code: "RPT-056", name: "Studio Operational Health", description: "Composite health score per studio", category: "Studio Operations", type: "summary", dataSource: "tickets", outputFormats: ["pdf"], visualizations: ["gauge"] },
  { code: "RPT-057", name: "Recurring Studio Issues", description: "Issues that recur at the same studio", category: "Studio Operations", type: "tabular", dataSource: "tickets", outputFormats: ["xlsx", "csv", "pdf"] },
  { code: "RPT-058", name: "Studio Equipment Issues", description: "Equipment-related issues by studio", category: "Studio Operations", type: "tabular", dataSource: "tickets", outputFormats: ["xlsx", "csv", "pdf"] },
  { code: "RPT-059", name: "Studio Facility Issues", description: "Facility-related issues by studio", category: "Studio Operations", type: "tabular", dataSource: "tickets", outputFormats: ["xlsx", "csv", "pdf"] },
  { code: "RPT-060", name: "Studio Client Complaints", description: "Client complaints by studio", category: "Studio Operations", type: "tabular", dataSource: "tickets", outputFormats: ["xlsx", "csv", "pdf"] },
  { code: "RPT-061", name: "Studio Resolution Efficiency", description: "Resolution efficiency metrics by studio", category: "Studio Operations", type: "tabular", dataSource: "tickets", outputFormats: ["xlsx", "csv", "pdf"], visualizations: ["bar"] },
  { code: "RPT-062", name: "Cross-Studio Issue Patterns", description: "Issues appearing across multiple studios", category: "Studio Operations", type: "summary", dataSource: "tickets", outputFormats: ["pdf", "xlsx"] },

  // === Momence & Member (12) ===
  { code: "RPT-063", name: "Momence-Related Tickets", description: "All tickets involving Momence issues", category: "Momence & Member", type: "tabular", dataSource: "tickets", outputFormats: ["xlsx", "csv", "pdf"] },
  { code: "RPT-064", name: "Member-Related Issues", description: "Issues affecting specific members", category: "Momence & Member", type: "tabular", dataSource: "tickets", outputFormats: ["xlsx", "csv", "pdf"] },
  { code: "RPT-065", name: "Membership Issue Trends", description: "Trends in membership-related issues", category: "Momence & Member", type: "chart", dataSource: "tickets", outputFormats: ["pdf", "png", "csv"], visualizations: ["line"] },
  { code: "RPT-066", name: "Payment Issue Analysis", description: "Analysis of payment-related issues", category: "Momence & Member", type: "summary", dataSource: "tickets", outputFormats: ["pdf", "xlsx"] },
  { code: "RPT-067", name: "Booking Issue Analysis", description: "Analysis of booking-related issues", category: "Momence & Member", type: "summary", dataSource: "tickets", outputFormats: ["pdf", "xlsx"] },
  { code: "RPT-068", name: "Refund Processing Report", description: "All refund-related tickets and outcomes", category: "Momence & Member", type: "tabular", dataSource: "tickets", outputFormats: ["xlsx", "csv", "pdf"] },
  { code: "RPT-069", name: "Membership Freeze Report", description: "Membership freeze requests and processing", category: "Momence & Member", type: "tabular", dataSource: "tickets", outputFormats: ["xlsx", "csv", "pdf"] },
  { code: "RPT-070", name: "Credit Adjustment Report", description: "Credit adjustment requests and processing", category: "Momence & Member", type: "tabular", dataSource: "tickets", outputFormats: ["xlsx", "csv", "pdf"] },
  { code: "RPT-071", name: "Momence Integration Health", description: "Health metrics for Momence integration", category: "Momence & Member", type: "summary", dataSource: "integrations", outputFormats: ["pdf"], visualizations: ["gauge"] },
  { code: "RPT-072", name: "API Usage Report", description: "Momence API usage statistics", category: "Momence & Member", type: "tabular", dataSource: "audit_logs", outputFormats: ["xlsx", "csv", "pdf"] },
  { code: "RPT-073", name: "Member Search Activity", description: "Track member search usage patterns", category: "Momence & Member", type: "tabular", dataSource: "audit_logs", outputFormats: ["xlsx", "csv"] },
  { code: "RPT-074", name: "Momence Sync Errors", description: "Errors during Momence data synchronization", category: "Momence & Member", type: "tabular", dataSource: "audit_logs", outputFormats: ["xlsx", "csv", "pdf"] },

  // === AI & Automation (10) ===
  { code: "RPT-075", name: "AI Agent Activity Report", description: "Activity metrics for each AI agent", category: "AI & Automation", type: "summary", dataSource: "audit_logs", outputFormats: ["pdf", "xlsx"] },
  { code: "RPT-076", name: "AI Resolution Rate", description: "Tickets resolved through AI automation", category: "AI & Automation", type: "summary", dataSource: "tickets", outputFormats: ["pdf", "csv"], visualizations: ["kpi", "gauge"] },
  { code: "RPT-077", name: "AI Model Usage Analytics", description: "Token usage and cost per AI model", category: "AI & Automation", type: "tabular", dataSource: "audit_logs", outputFormats: ["xlsx", "csv", "pdf"], visualizations: ["bar"] },
  { code: "RPT-078", name: "AI Accuracy Metrics", description: "Classification accuracy and routing accuracy", category: "AI & Automation", type: "summary", dataSource: "tickets", outputFormats: ["pdf", "xlsx"], visualizations: ["gauge"] },
  { code: "RPT-079", name: "Model Routing Analysis", description: "How tickets are routed across models", category: "AI & Automation", type: "chart", dataSource: "audit_logs", outputFormats: ["pdf", "png"], visualizations: ["sankey"] },
  { code: "RPT-080", name: "AI Cost Analysis", description: "Cost breakdown of AI operations", category: "AI & Automation", type: "summary", dataSource: "audit_logs", outputFormats: ["pdf", "xlsx"], visualizations: ["pie"] },
  { code: "RPT-081", name: "Token Consumption Trends", description: "Daily token consumption trends", category: "AI & Automation", type: "chart", dataSource: "audit_logs", outputFormats: ["pdf", "png", "csv"], visualizations: ["line"] },
  { code: "RPT-082", name: "AI Fallback Frequency", description: "How often fallback models are used", category: "AI & Automation", type: "summary", dataSource: "audit_logs", outputFormats: ["pdf", "csv"] },
  { code: "RPT-083", name: "Auto-Resolution Success Rate", description: "Success rate of AI auto-resolution attempts", category: "AI & Automation", type: "summary", dataSource: "tickets", outputFormats: ["pdf", "csv"], visualizations: ["gauge"] },
  { code: "RPT-084", name: "Conversational Flow Analytics", description: "Analysis of AI conversation patterns", category: "AI & Automation", type: "summary", dataSource: "audit_logs", outputFormats: ["pdf", "xlsx"] },

  // === Historical Intelligence (8) ===
  { code: "RPT-085", name: "Recurring Issue Detection", description: "Issues that recur over time", category: "Historical Intelligence", type: "tabular", dataSource: "tickets", outputFormats: ["xlsx", "csv", "pdf"] },
  { code: "RPT-086", name: "Issue Pattern Analysis", description: "Patterns in issue occurrence", category: "Historical Intelligence", type: "summary", dataSource: "tickets", outputFormats: ["pdf", "xlsx"] },
  { code: "RPT-087", name: "Similar Ticket Clustering", description: "Groups of similar historical tickets", category: "Historical Intelligence", type: "tabular", dataSource: "tickets", outputFormats: ["xlsx", "csv"] },
  { code: "RPT-088", name: "Resolution Knowledge Base", description: "Successful resolutions for knowledge base", category: "Historical Intelligence", type: "tabular", dataSource: "tickets", outputFormats: ["xlsx", "pdf"] },
  { code: "RPT-089", name: "Issue Seasonality Report", description: "Seasonal patterns in issues", category: "Historical Intelligence", type: "chart", dataSource: "tickets", outputFormats: ["pdf", "png", "csv"], visualizations: ["heatmap"] },
  { code: "RPT-090", name: "Preventive Recommendations", description: "AI-generated preventive recommendations", category: "Historical Intelligence", type: "summary", dataSource: "tickets", outputFormats: ["pdf"] },
  { code: "RPT-091", name: "Bottleneck Analysis", description: "Identify resolution bottlenecks", category: "Historical Intelligence", type: "summary", dataSource: "tickets", outputFormats: ["pdf", "xlsx"] },
  { code: "RPT-092", name: "Resolution Time Prediction", description: "Predicted resolution times based on history", category: "Historical Intelligence", type: "tabular", dataSource: "tickets", outputFormats: ["xlsx", "csv", "pdf"] },

  // === Audit & Compliance (10) ===
  { code: "RPT-093", name: "Audit Trail Report", description: "Complete audit trail for selected period", category: "Audit & Compliance", type: "tabular", dataSource: "audit_logs", outputFormats: ["xlsx", "csv", "pdf"] },
  { code: "RPT-094", name: "Sensitive Action Audit", description: "Audit of sensitive operations", category: "Audit & Compliance", type: "tabular", dataSource: "audit_logs", outputFormats: ["xlsx", "csv", "pdf"] },
  { code: "RPT-095", name: "Permission Changes Audit", description: "All permission changes", category: "Audit & Compliance", type: "tabular", dataSource: "audit_logs", outputFormats: ["xlsx", "csv", "pdf"] },
  { code: "RPT-096", name: "Momence Action Audit", description: "Audit of all Momence API actions", category: "Audit & Compliance", type: "tabular", dataSource: "audit_logs", outputFormats: ["xlsx", "csv", "pdf"] },
  { code: "RPT-097", name: "Failed Authorization Attempts", description: "Failed authorization events", category: "Audit & Compliance", type: "tabular", dataSource: "audit_logs", outputFormats: ["xlsx", "csv", "pdf"] },
  { code: "RPT-098", name: "Data Access Audit", description: "Audit of data access events", category: "Audit & Compliance", type: "tabular", dataSource: "audit_logs", outputFormats: ["xlsx", "csv", "pdf"] },
  { code: "RPT-099", name: "Configuration Changes Audit", description: "Audit of system configuration changes", category: "Audit & Compliance", type: "tabular", dataSource: "audit_logs", outputFormats: ["xlsx", "csv", "pdf"] },
  { code: "RPT-100", name: "Compliance Status Report", description: "Overall compliance status", category: "Audit & Compliance", type: "summary", dataSource: "audit_logs", outputFormats: ["pdf"], visualizations: ["gauge"] },
  { code: "RPT-101", name: "User Activity Report", description: "Activity report per user", category: "Audit & Compliance", type: "tabular", dataSource: "audit_logs", outputFormats: ["xlsx", "csv", "pdf"] },
  { code: "RPT-102", name: "Security Incident Report", description: "Security-related incidents", category: "Audit & Compliance", type: "tabular", dataSource: "audit_logs", outputFormats: ["xlsx", "csv", "pdf"] },

  // === Notifications & Communications (8) ===
  { code: "RPT-103", name: "Notification Delivery Report", description: "Notification delivery success rates", category: "Notifications", type: "summary", dataSource: "notifications", outputFormats: ["pdf", "xlsx"], visualizations: ["gauge"] },
  { code: "RPT-104", name: "Email Template Performance", description: "Performance metrics for email templates", category: "Notifications", type: "tabular", dataSource: "notifications", outputFormats: ["xlsx", "csv", "pdf"] },
  { code: "RPT-105", name: "Notification Frequency Analysis", description: "Notification frequency per user", category: "Notifications", type: "tabular", dataSource: "notifications", outputFormats: ["xlsx", "csv", "pdf"] },
  { code: "RPT-106", name: "Escalation Notification Audit", description: "Audit of escalation notifications", category: "Notifications", type: "tabular", dataSource: "notifications", outputFormats: ["xlsx", "csv", "pdf"] },
  { code: "RPT-107", name: "Reminder Effectiveness", description: "Effectiveness of reminder notifications", category: "Notifications", type: "summary", dataSource: "tickets", outputFormats: ["pdf", "csv"] },
  { code: "RPT-108", name: "Notification Preferences Report", description: "User notification preferences summary", category: "Notifications", type: "tabular", dataSource: "users", outputFormats: ["xlsx", "csv"] },
  { code: "RPT-109", name: "Communication Channel Usage", description: "Usage by channel (email, WhatsApp, in-app)", category: "Notifications", type: "chart", dataSource: "notifications", outputFormats: ["pdf", "png"], visualizations: ["pie"] },
  { code: "RPT-110", name: "Notification Failure Report", description: "Failed notification delivery attempts", category: "Notifications", type: "tabular", dataSource: "notifications", outputFormats: ["xlsx", "csv", "pdf"] },
];

export const REPORT_CATEGORIES = Array.from(
  new Set(REPORTS.map((r) => r.category))
).sort();

export const REPORT_MAP: Record<string, ReportItem> = Object.fromEntries(
  REPORTS.map((r) => [r.code, r])
);

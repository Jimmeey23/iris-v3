// IRIS - Definitive SLA Rules Engine
// Auto-triggered escalation and resolution rules

export interface SLADefinition {
  priority: "P0" | "P1" | "P2" | "P3";
  name: string;
  description: string;
  responseTargetMins: number;
  resolutionTargetMins: number;
  escalationThresholdMins: number;
  businessHoursOnly: boolean;
  autoActions: AutoAction[];
  escalationRules: EscalationRule[];
  resolutionRules: ResolutionRule[];
  triggers: SLATrigger[];
}

export interface AutoAction {
  id: string;
  trigger: string;
  action: string;
  type: "notify" | "escalate" | "auto_resolve" | "pause_sla" | "resume_sla" | "reassign";
  target: string;
  timing: string;
  automatic: boolean;
}

export interface EscalationRule {
  id: string;
  trigger: string;
  condition: string;
  escalateTo: string;
  timeframe: string;
  automatic: boolean;
}

export interface ResolutionRule {
  id: string;
  trigger: string;
  condition: string;
  action: string;
  automatic: boolean;
}

export interface SLATrigger {
  id: string;
  event: string;
  condition: string;
  action: string;
  timing: string;
}

export const SLA_DEFINITIONS: SLADefinition[] = [
  {
    priority: "P0",
    name: "Critical",
    description: "Safety incidents, major studio operational disruptions, critical system failures affecting multiple operations. Immediate intervention required.",
    responseTargetMins: 15,
    resolutionTargetMins: 240,
    escalationThresholdMins: 30,
    businessHoursOnly: false,
    autoActions: [
      {
        id: "P0-A1",
        trigger: "On ticket creation",
        action: "Notify assignee + department head + studio director immediately via in-app, email, and WhatsApp",
        type: "notify",
        target: "Assignee + Department Head + Studio Director",
        timing: "0 min",
        automatic: true,
      },
      {
        id: "P0-A2",
        trigger: "No acknowledgment in 5 minutes",
        action: "Auto-escalate to next-level contact and notify director",
        type: "escalate",
        target: "Escalation Chain L2",
        timing: "5 min",
        automatic: true,
      },
      {
        id: "P0-A3",
        trigger: "No response in 15 minutes",
        action: "Escalate to all stakeholders, trigger emergency protocol",
        type: "escalate",
        target: "All stakeholders + Director",
        timing: "15 min",
        automatic: true,
      },
      {
        id: "P0-A4",
        trigger: "30 minutes without resolution progress",
        action: "Auto-create escalation ticket and notify management",
        type: "escalate",
        target: "Management",
        timing: "30 min",
        automatic: true,
      },
      {
        id: "P0-A5",
        trigger: "4 hours without resolution",
        action: "Critical breach - notify board, activate incident response",
        type: "escalate",
        target: "Board + All Directors",
        timing: "4 hours",
        automatic: true,
      },
    ],
    escalationRules: [
      { id: "P0-E1", trigger: "5 min no response", condition: "firstResponseAt is null AND now > created + 5min", escalateTo: "L2 - Department Manager", timeframe: "5 min", automatic: true },
      { id: "P0-E2", trigger: "15 min no response", condition: "firstResponseAt is null AND now > created + 15min", escalateTo: "L3 - Studio Director", timeframe: "15 min", automatic: true },
      { id: "P0-E3", trigger: "30 min unresolved", condition: "status != resolved AND now > created + 30min", escalateTo: "L4 - India Director", timeframe: "30 min", automatic: true },
      { id: "P0-E4", trigger: "2 hours unresolved", condition: "status != resolved AND now > created + 2h", escalateTo: "L5 - Emergency Response Team", timeframe: "2 hours", automatic: true },
      { id: "P0-E5", trigger: "4 hours (SLA breach)", condition: "status != resolved AND now > created + 4h", escalateTo: "Board Notification", timeframe: "4 hours", automatic: true },
    ],
    resolutionRules: [
      { id: "P0-R1", trigger: "Status changed to resolved", condition: "assignee confirms resolution with verified action", action: "Require Quality Agent verification before closure", automatic: true },
      { id: "P0-R2", trigger: "Auto-resolve attempt", condition: "system action succeeded (API response verified)", action: "Mark as auto-resolved with audit entry, notify reporter for confirmation", automatic: true },
      { id: "P0-R3", trigger: "Reopen within 24h", condition: "reporter reopens ticket", action: "Auto-escalate to P0+ priority, notify director immediately", automatic: true },
    ],
    triggers: [
      { id: "P0-T1", event: "ticket_created", condition: "priority = P0", action: "Immediate notification blast (in-app + email + WhatsApp) to assignee, dept head, director", timing: "0 min" },
      { id: "P0-T2", event: "sla_50%", condition: "elapsed > 50% of resolution target", action: "Notify assignee of approaching deadline", timing: "2 hours" },
      { id: "P0-T3", event: "sla_75%", condition: "elapsed > 75% of resolution target", action: "Warn assignee + notify department head", timing: "3 hours" },
      { id: "P0-T4", event: "sla_breached", condition: "now > resolutionTarget", action: "Critical breach alert to all stakeholders", timing: "4 hours" },
      { id: "P0-T5", event: "no_acknowledgment", condition: "firstResponseAt is null AND elapsed > 5min", action: "Auto-escalate to L2", timing: "5 min" },
    ],
  },
  {
    priority: "P1",
    name: "High",
    description: "Significant client-facing disruptions, payment or membership issues with substantial impact, essential equipment failures, issues affecting scheduled classes or service delivery.",
    responseTargetMins: 60,
    resolutionTargetMins: 720,
    escalationThresholdMins: 90,
    businessHoursOnly: false,
    autoActions: [
      {
        id: "P1-A1",
        trigger: "On ticket creation",
        action: "Notify assignee via in-app + email immediately",
        type: "notify",
        target: "Assignee",
        timing: "0 min",
        automatic: true,
      },
      {
        id: "P1-A2",
        trigger: "No acknowledgment in 30 minutes",
        action: "Notify department head",
        type: "notify",
        target: "Department Head",
        timing: "30 min",
        automatic: true,
      },
      {
        id: "P1-A3",
        trigger: "No response in 60 minutes",
        action: "Escalate to department manager, flag SLA risk",
        type: "escalate",
        target: "Department Manager",
        timing: "60 min",
        automatic: true,
      },
      {
        id: "P1-A4",
        trigger: "6 hours without resolution",
        action: "Escalate to operations manager",
        type: "escalate",
        target: "Operations Manager",
        timing: "6 hours",
        automatic: true,
      },
      {
        id: "P1-A5",
        trigger: "12 hours (SLA breach)",
        action: "Notify studio director, mark as breached",
        type: "escalate",
        target: "Studio Director",
        timing: "12 hours",
        automatic: true,
      },
    ],
    escalationRules: [
      { id: "P1-E1", trigger: "30 min no response", condition: "firstResponseAt is null AND now > created + 30min", escalateTo: "L2 - Department Manager", timeframe: "30 min", automatic: true },
      { id: "P1-E2", trigger: "60 min no response", condition: "firstResponseAt is null AND now > created + 60min", escalateTo: "L3 - Operations Manager", timeframe: "60 min", automatic: true },
      { id: "P1-E3", trigger: "6 hours unresolved", condition: "status != resolved AND now > created + 6h", escalateTo: "L4 - Studio Director", timeframe: "6 hours", automatic: true },
      { id: "P1-E4", trigger: "12 hours (SLA breach)", condition: "status != resolved AND now > created + 12h", escalateTo: "L5 - Director + Board notification", timeframe: "12 hours", automatic: true },
    ],
    resolutionRules: [
      { id: "P1-R1", trigger: "Status changed to resolved", condition: "assignee confirms resolution", action: "Notify reporter, start 48h reopen window", automatic: true },
      { id: "P1-R2", trigger: "Auto-resolve attempt", condition: "system action succeeded and verified", action: "Mark as auto-resolved, require reporter confirmation within 48h", automatic: true },
      { id: "P1-R3", trigger: "48h reopen window expired", condition: "reporter did not reopen", action: "Auto-close ticket, log resolution metrics", automatic: true },
    ],
    triggers: [
      { id: "P1-T1", event: "ticket_created", condition: "priority = P1", action: "Notify assignee + email", timing: "0 min" },
      { id: "P1-T2", event: "sla_50%", condition: "elapsed > 50%", action: "Notify assignee - halfway reminder", timing: "6 hours" },
      { id: "P1-T3", event: "sla_75%", condition: "elapsed > 75%", action: "Warn assignee + dept head", timing: "9 hours" },
      { id: "P1-T4", event: "3h_before_due", condition: "remaining = 3h", action: "Send 'due in 3 hours' email to assignee", timing: "9 hours" },
      { id: "P1-T5", event: "due_today", condition: "resolution target is today", action: "Send 'due today' email", timing: "Today" },
      { id: "P1-T6", event: "sla_breached", condition: "now > resolutionTarget", action: "Breach alert to director", timing: "12 hours" },
      { id: "P1-T7", event: "3h_past_due", condition: "now > resolutionTarget + 3h", action: "Send '3 hours past due' alert", timing: "15 hours" },
    ],
  },
  {
    priority: "P2",
    name: "Medium",
    description: "Individual client requests, non-critical technical issues, maintenance requirements that do not immediately disrupt operations.",
    responseTargetMins: 240,
    resolutionTargetMins: 2880,
    escalationThresholdMins: 360,
    businessHoursOnly: true,
    autoActions: [
      {
        id: "P2-A1",
        trigger: "On ticket creation",
        action: "Notify assignee via in-app notification",
        type: "notify",
        target: "Assignee",
        timing: "0 min",
        automatic: true,
      },
      {
        id: "P2-A2",
        trigger: "No acknowledgment in 4 hours",
        action: "Send reminder to assignee",
        type: "notify",
        target: "Assignee",
        timing: "4 hours",
        automatic: true,
      },
      {
        id: "P2-A3",
        trigger: "No response in 8 hours",
        action: "Notify department manager",
        type: "notify",
        target: "Department Manager",
        timing: "8 hours",
        automatic: true,
      },
      {
        id: "P2-A4",
        trigger: "24 hours without resolution",
        action: "Escalate to department manager",
        type: "escalate",
        target: "Department Manager",
        timing: "24 hours",
        automatic: true,
      },
      {
        id: "P2-A5",
        trigger: "48 hours (SLA breach)",
        action: "Escalate to operations manager, mark as breached",
        type: "escalate",
        target: "Operations Manager",
        timing: "48 hours",
        automatic: true,
      },
    ],
    escalationRules: [
      { id: "P2-E1", trigger: "8 hours no response", condition: "firstResponseAt is null AND now > created + 8h", escalateTo: "L2 - Department Manager", timeframe: "8 hours", automatic: true },
      { id: "P2-E2", trigger: "24 hours unresolved", condition: "status != resolved AND now > created + 24h", escalateTo: "L3 - Operations Manager", timeframe: "24 hours", automatic: true },
      { id: "P2-E3", trigger: "48 hours (SLA breach)", condition: "status != resolved AND now > created + 48h", escalateTo: "L4 - Studio Director", timeframe: "48 hours", automatic: true },
    ],
    resolutionRules: [
      { id: "P2-R1", trigger: "Status changed to resolved", condition: "assignee confirms resolution", action: "Notify reporter, start 72h reopen window", automatic: true },
      { id: "P2-R2", trigger: "Auto-resolve (low-risk)", condition: "reversible action verified (e.g., credit adjustment)", action: "Auto-resolve with audit entry", automatic: true },
      { id: "P2-R3", trigger: "72h reopen window expired", condition: "reporter did not reopen", action: "Auto-close ticket", automatic: true },
    ],
    triggers: [
      { id: "P2-T1", event: "ticket_created", condition: "priority = P2", action: "In-app notify assignee", timing: "0 min" },
      { id: "P2-T2", event: "4h_no_ack", condition: "firstResponseAt is null AND elapsed > 4h", action: "Reminder to assignee", timing: "4 hours" },
      { id: "P2-T3", event: "sla_50%", condition: "elapsed > 50%", action: "Notify assignee - halfway reminder", timing: "24 hours" },
      { id: "P2-T4", event: "sla_75%", condition: "elapsed > 75%", action: "Warn assignee + dept head", timing: "36 hours" },
      { id: "P2-T5", event: "sla_breached", condition: "now > resolutionTarget", action: "Breach alert to ops manager", timing: "48 hours" },
    ],
  },
  {
    priority: "P3",
    name: "Low",
    description: "General enquiries, minor improvements, non-urgent administrative requests.",
    responseTargetMins: 720,
    resolutionTargetMins: 10080,
    escalationThresholdMins: 1440,
    businessHoursOnly: true,
    autoActions: [
      {
        id: "P3-A1",
        trigger: "On ticket creation",
        action: "Add to department queue, notify assignee",
        type: "notify",
        target: "Assignee",
        timing: "0 min",
        automatic: true,
      },
      {
        id: "P3-A2",
        trigger: "No acknowledgment in 12 hours",
        action: "Send reminder",
        type: "notify",
        target: "Assignee",
        timing: "12 hours",
        automatic: true,
      },
      {
        id: "P3-A3",
        trigger: "3 days without resolution",
        action: "Notify department manager",
        type: "notify",
        target: "Department Manager",
        timing: "3 days",
        automatic: true,
      },
      {
        id: "P3-A4",
        trigger: "7 days (SLA breach)",
        action: "Escalate to operations manager",
        type: "escalate",
        target: "Operations Manager",
        timing: "7 days",
        automatic: true,
      },
    ],
    escalationRules: [
      { id: "P3-E1", trigger: "12 hours no response", condition: "firstResponseAt is null AND now > created + 12h", escalateTo: "L2 - Department Manager", timeframe: "12 hours", automatic: true },
      { id: "P3-E2", trigger: "3 days unresolved", condition: "status != resolved AND now > created + 3d", escalateTo: "L3 - Operations Manager", timeframe: "3 days", automatic: true },
      { id: "P3-E3", trigger: "7 days (SLA breach)", condition: "status != resolved AND now > created + 7d", escalateTo: "L4 - Studio Director", timeframe: "7 days", automatic: true },
    ],
    resolutionRules: [
      { id: "P3-R1", trigger: "Status changed to resolved", condition: "assignee confirms", action: "Notify reporter, start 7-day reopen window", automatic: true },
      { id: "P3-R2", trigger: "7 days reopen window expired", condition: "reporter did not reopen", action: "Auto-close ticket", automatic: true },
    ],
    triggers: [
      { id: "P3-T1", event: "ticket_created", condition: "priority = P3", action: "Add to queue, notify assignee", timing: "0 min" },
      { id: "P3-T2", event: "12h_no_ack", condition: "firstResponseAt is null AND elapsed > 12h", action: "Reminder", timing: "12 hours" },
      { id: "P3-T3", event: "sla_50%", condition: "elapsed > 50%", action: "Notify - halfway", timing: "3.5 days" },
      { id: "P3-T4", event: "sla_breached", condition: "now > resolutionTarget", action: "Breach alert", timing: "7 days" },
    ],
  },
];

export const SLA_MAP: Record<string, SLADefinition> = Object.fromEntries(
  SLA_DEFINITIONS.map((s) => [s.priority, s])
);

export function formatSLADuration(mins: number): string {
  if (mins < 60) return `${mins} minutes`;
  if (mins < 1440) {
    const h = mins / 60;
    return `${h} hour${h > 1 ? "s" : ""}`;
  }
  const d = mins / 1440;
  return `${d} day${d > 1 ? "s" : ""}`;
}

// Auto-trigger evaluation - given a ticket's current state, what actions should fire?
export function evaluateSLATriggers(
  priority: string,
  createdAt: Date,
  firstResponseAt: Date | null,
  status: string
): Array<{ trigger: string; action: string; shouldFire: boolean; timing: string }> {
  const sla = SLA_MAP[priority];
  if (!sla) return [];

  const now = new Date();
  const elapsedMins = (now.getTime() - createdAt.getTime()) / (1000 * 60);
  const results: Array<{ trigger: string; action: string; shouldFire: boolean; timing: string }> = [];

  // Check each trigger
  for (const trigger of sla.triggers) {
    let shouldFire = false;
    let timing = trigger.timing;

    if (trigger.event === "ticket_created") {
      shouldFire = elapsedMins < 1; // Just created
    } else if (trigger.event === "sla_50%") {
      shouldFire = elapsedMins > sla.resolutionTargetMins * 0.5 && status !== "resolved";
      timing = formatSLADuration(sla.resolutionTargetMins * 0.5);
    } else if (trigger.event === "sla_75%") {
      shouldFire = elapsedMins > sla.resolutionTargetMins * 0.75 && status !== "resolved";
      timing = formatSLADuration(sla.resolutionTargetMins * 0.75);
    } else if (trigger.event === "sla_breached") {
      shouldFire = elapsedMins > sla.resolutionTargetMins && status !== "resolved";
      timing = formatSLADuration(sla.resolutionTargetMins);
    } else if (trigger.event === "no_acknowledgment") {
      const ackThreshold = priority === "P0" ? 5 : priority === "P1" ? 30 : priority === "P2" ? 240 : 720;
      shouldFire = !firstResponseAt && elapsedMins > ackThreshold;
      timing = formatSLADuration(ackThreshold);
    } else if (trigger.event === "3h_before_due") {
      const threeHoursBefore = sla.resolutionTargetMins - 180;
      shouldFire = elapsedMins > threeHoursBefore && elapsedMins < sla.resolutionTargetMins && status !== "resolved";
      timing = formatSLADuration(threeHoursBefore);
    } else if (trigger.event === "3h_past_due") {
      shouldFire = elapsedMins > sla.resolutionTargetMins + 180 && status !== "resolved";
      timing = formatSLADuration(sla.resolutionTargetMins + 180);
    }

    results.push({
      trigger: trigger.event,
      action: trigger.action,
      shouldFire,
      timing,
    });
  }

  return results;
}

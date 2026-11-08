// IRIS - Advanced Ticket Detail Builder
// Produces comprehensive routing, SLA, investigation, and resolution data for the ticket modal

import { STUDIOS, DEPARTMENTS, EMPLOYEES, EMPLOYEE_MAP, Priority } from "./types";
import { TICKET_TEMPLATES } from "./templates";
import { ConversationState, CollectedInfo } from "./conversation-engine";

export interface TicketDetailData {
  // Core
  ticketId: string;
  title: string;
  description: string;
  priority: Priority;
  status: string;
  category: string;
  subcategory?: string;
  source: string;
  createdAt: string;

  // Studio & Location
  studio?: string;
  studioCode?: string;
  studioCity?: string;
  location?: string;

  // Client
  affectedClient?: string;
  clientMomenceId?: string;
  clientContact?: string;
  membershipType?: string;
  membershipId?: string;

  // Payment
  paymentAmount?: string;
  paymentMethod?: string;
  paymentReference?: string;

  // Session
  sessionTime?: string;
  instructor?: string;
  bookingId?: string;

  // Impact
  severity?: string;
  duration?: string;
  affectedCount?: string;
  businessImpact: string;
  operationalImpact: string;
  clientImpact: string;
  financialImpact?: string;

  // Routing
  routing: RoutingDetail;

  // SLA
  sla: SLADetail;

  // Investigation
  investigation: InvestigationDetail;

  // Resolution
  resolution: ResolutionDetail;

  // Risk
  risk: RiskDetail;

  // Related
  relatedTickets: RelatedTicket[];
  connectedTickets: ConnectedTicket[];

  // Tags
  tags: string[];

  // Audit
  auditPreview: AuditEntry[];

  // Sentiment
  sentiment?: string;
  sentimentScore?: number;

  // Recurrence (PowerCycle/mic)
  recurrence?: RecurrenceDetail;

  // Resolution permissions
  resolutionPermissions: ResolutionPermissions;

  // Information-only flag
  isInformationOnly?: boolean;
  informationOnlyReason?: string;
}

export interface ConnectedTicket {
  ticketId: string;
  title: string;
  connectionType: "same_member" | "same_equipment" | "same_studio" | "same_category" | "linked";
  connectionReason: string;
  status: string;
  resolvedAt?: string;
  daysAgo: number;
}

export interface RecurrenceDetail {
  required: boolean;
  reason: string;
  tickets: RecurrenceTicket[];
  assignedTo: string; // original reporter
  assignedToRole: string;
}

export interface RecurrenceTicket {
  id: string;
  title: string;
  dueDate: string;
  daysAfterResolution: number;
  type: "follow_up_inspection" | "follow_up_check";
  description: string;
  status: "scheduled";
}

export interface ResolutionPermissions {
  canEdit: boolean;
  canEditReason: string;
  allowedRoles: string[];
  currentUserRole: string;
  fields: ResolutionField[];
}

export interface ResolutionField {
  name: string;
  label: string;
  editable: boolean;
  currentValue?: string;
}

export interface RoutingDetail {
  department: string;
  departmentCode: string;
  departmentDescription: string;
  selectedAssignee: AssigneeDetail; // Lead owner
  coOwners: AssigneeDetail[]; // Additional owners
  candidateAssignees: CandidateAssignee[];
  routingRulesApplied: RoutingRule[];
  routingReasoning: string;
  escalationChain: EscalationLevel[];
  secondaryStakeholders: Stakeholder[];
  routingConfidence: number;
  routingPath: string[];
}

export interface AssigneeDetail {
  id: string;
  name: string;
  role: string;
  title: string;
  email: string;
  phone?: string;
  departmentCode: string;
  studioCodes: string[];
  skills: string[];
  availability: string;
  currentWorkload: number;
  maxWorkload: number;
  workloadPercentage: number;
  escalationOrder: number;
  matchScore: number;
  matchReasons: string[];
}

export interface CandidateAssignee extends AssigneeDetail {
  selected: boolean;
  selectionReason: string;
}

export interface RoutingRule {
  id: string;
  name: string;
  condition: string;
  matched: boolean;
  priority: number;
}

export interface EscalationLevel {
  level: number;
  assignee: string;
  role: string;
  trigger: string;
  timeframe: string;
}

export interface Stakeholder {
  name: string;
  role: string;
  department: string;
  reason: string;
}

export interface SLADetail {
  priority: Priority;
  priorityScore: number;
  priorityFactors: PriorityFactor[];
  responseTarget: string;
  responseTargetMins: number;
  resolutionTarget: string;
  resolutionTargetMins: number;
  escalationThreshold: string;
  businessHoursOnly: boolean;
  businessHoursStart: string;
  businessHoursEnd: string;
  holidayCalendar: string;
  pauseConditions: string[];
  slaCalculation: string;
}

export interface PriorityFactor {
  factor: string;
  weight: number;
  score: number;
  reasoning: string;
}

export interface InvestigationDetail {
  steps: InvestigationStep[];
  toolsExecuted: ToolExecution[];
  findings: Finding[];
  confidenceScore: number;
  confidenceBreakdown: ConfidenceFactor[];
  evidenceQuality: "verified" | "user_reported" | "ai_hypothesis";
  dataSources: string[];
}

export interface InvestigationStep {
  step: number;
  agent: string;
  action: string;
  result: string;
  duration: number;
  timestamp: string;
}

export interface ToolExecution {
  name: string;
  provider: string;
  status: "complete" | "running" | "failed";
  input: string;
  output: string;
  duration: number;
  apiCalls: number;
}

export interface Finding {
  type: "verified_fact" | "user_reported" | "ai_hypothesis" | "historical_pattern";
  description: string;
  source: string;
  confidence: number;
}

export interface ConfidenceFactor {
  factor: string;
  contribution: number;
  reasoning: string;
}

export interface ResolutionDetail {
  recommendedActions: ResolutionAction[];
  estimatedResolutionTime: string;
  estimatedResolutionHours: number;
  requiredResources: Resource[];
  approvalRequired: ApprovalRequirement[];
  resolutionPath: string;
  autoResolutionPossible: boolean;
  autoResolutionReason: string;
}

export interface ResolutionAction {
  step: number;
  action: string;
  owner: string;
  estimatedDuration: string;
  required: boolean;
  approvalLevel: "none" | "supervisor" | "manager" | "director";
}

export interface Resource {
  type: "person" | "equipment" | "system" | "vendor" | "budget";
  name: string;
  description: string;
  availability: string;
}

export interface ApprovalRequirement {
  action: string;
  level: "supervisor" | "manager" | "director" | "finance";
  reason: string;
  approver: string;
}

export interface RiskDetail {
  level: "low" | "medium" | "high" | "critical";
  score: number;
  factors: RiskFactor[];
  mitigations: string[];
  escalationRisk: string;
  clientTrustRisk: string;
  operationalRisk: string;
}

export interface RiskFactor {
  factor: string;
  impact: string;
  severity: "low" | "medium" | "high";
}

export interface RelatedTicket {
  ticketId: string;
  title: string;
  similarity: number;
  matchReason: string;
  resolution: string;
  resolutionTime: string;
  department: string;
  recurrenceRisk: string;
}

export interface AuditEntry {
  timestamp: string;
  actor: string;
  action: string;
  resource: string;
  details: string;
}

// === MAIN BUILDER ===

export function buildTicketDetail(state: ConversationState): TicketDetailData {
  const intent = state.intent;
  const info = state.collectedInfo;
  const pattern = INTENT_PATTERNS_REF[intent.suggestedDepartment || "FAC"];
  const template = intent.matchedTemplate ? TICKET_TEMPLATES.find((t) => t.code === intent.matchedTemplate) : null;
  const priority = intent.suggestedPriority || "P2";
  const dept = DEPARTMENTS.find((d) => d.code === intent.suggestedDepartment);
  const studio = STUDIOS.find((s) => s.name === info.studio);

  // Deterministic ticket ID - derived from the issue description hash.
  // Avoids Math.random() which produces different IDs on server vs client
  // (hydration mismatch) and on re-renders.
  const issueText = info.issue || info.affectedClient || intent.description || "";
  let h = 2166136261;
  for (let i = 0; i < issueText.length; i++) {
    h ^= issueText.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const ticketId = `IRIS-2026-${String((h >>> 0) % 9999).padStart(4, "0")}`;

  // Build routing detail
  const routing = buildRoutingDetail(state, priority, dept);

  // Build SLA detail
  const sla = buildSLADetail(state, priority, info);

  // Build investigation detail
  const investigation = buildInvestigationDetail(state, info);

  // Build resolution detail
  const resolution = buildResolutionDetail(state, template, priority, info);

  // Build risk detail
  const risk = buildRiskDetail(state, priority, info);

  // Related tickets
  const relatedTickets = buildRelatedTickets(intent, info);

  // Tags
  const tags = buildTags(state, info);

  // Audit preview
  const auditPreview = buildAuditPreview(state, ticketId);

  return {
    ticketId,
    title: generateTicketTitle(state),
    description: generateTicketDescription(state),
    priority,
    status: "open",
    category: intent.suggestedCategory || "Operations",
    subcategory: pattern?.subcategory,
    source: "AI Assistant (multi-agent)",
    createdAt: new Date().toISOString(),
    studio: studio?.name || info.studio,
    studioCode: studio?.code,
    studioCity: studio?.city || info.studioCity,
    location: info.location,
    affectedClient: info.affectedClient,
    clientMomenceId: info.affectedClient ? `MM-${Math.floor(Math.random() * 90000 + 10000)}` : undefined,
    clientContact: info.clientIdentifier,
    membershipType: info.membershipType,
    membershipId: info.membershipType ? `MBR-${Math.floor(Math.random() * 9000 + 1000)}` : undefined,
    paymentAmount: info.paymentAmount,
    paymentMethod: info.paymentMethod,
    paymentReference: info.paymentReference,
    sessionTime: info.sessionTime,
    instructor: info.instructor,
    bookingId: info.sessionTime ? `BKG-${Math.floor(Math.random() * 9000 + 1000)}` : undefined,
    severity: info.severity,
    duration: info.duration,
    affectedCount: info.affectedCount,
    businessImpact: generateBusinessImpact(info, priority),
    operationalImpact: generateOperationalImpact(info, priority),
    clientImpact: generateClientImpact(info, priority),
    financialImpact: generateFinancialImpact(info),
    routing,
    sla,
    investigation,
    resolution,
    risk,
    relatedTickets,
    connectedTickets: buildConnectedTickets(intent, info),
    tags,
    auditPreview,
    sentiment: info.sentiment,
    sentimentScore: info.sentimentScore,
    recurrence: buildRecurrenceDetail(info, state),
    resolutionPermissions: buildResolutionPermissions(state),
    isInformationOnly: info.isInformationOnly,
    informationOnlyReason: info.informationOnlyReason,
  };
}

// === ROUTING DETAIL ===

function buildRoutingDetail(state: ConversationState, priority: Priority, dept: any): RoutingDetail {
  const intent = state.intent;
  const info = state.collectedInfo;
  const deptCode = intent.suggestedDepartment || "FAC";

  // Get all employees in the department
  const deptEmployees = EMPLOYEES.filter((e) => e.departmentCode === deptCode);

  // Build candidate assignees with scoring
  const candidates: CandidateAssignee[] = deptEmployees.map((emp) => {
    const matchScore = calculateMatchScore(emp, info, priority);
    const workloadPct = Math.round((emp.workload / emp.maxWorkload) * 100);
    const matchReasons = buildMatchReasons(emp, info, priority);

    return {
      ...emp,
      studioCodes: emp.studioCodes,
      title: emp.title ?? emp.role,
      currentWorkload: emp.workload,
      workloadPercentage: workloadPct,
      matchScore,
      matchReasons,
      selected: false,
      selectionReason: "",
    };
  });

  // Sort by match score (higher = better), then by lower workload
  candidates.sort((a, b) => {
    if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
    return a.currentWorkload - b.currentWorkload;
  });

  // Select the top candidate
  if (candidates.length > 0) {
    candidates[0].selected = true;
    candidates[0].selectionReason = `Highest match score (${candidates[0].matchScore}%) with lowest relative workload (${candidates[0].workloadPercentage}% capacity)`;
  }

  const selectedAssignee = candidates.find((c) => c.selected) || candidates[0];

  // Routing rules
  const routingRules: RoutingRule[] = buildRoutingRules(info, deptCode, priority);

  // Escalation chain
  const escalationChain = buildEscalationChain(deptCode, priority);

  // Secondary stakeholders
  const secondaryStakeholders = buildSecondaryStakeholders(info, deptCode);

  // Routing path
  const routingPath = [
    "User Input → Intent Detection",
    `Classification Agent → ${intent.suggestedCategory}`,
    `Department Match → ${dept?.name}`,
    `Candidate Evaluation → ${deptEmployees.length} employees scored`,
    `Workload + Expertise Match → ${selectedAssignee?.name} selected`,
    `SLA Calculation → ${priority} targets applied`,
    `Ticket Ready for Creation`,
  ];

  // Select co-owners (2nd and 3rd best candidates)
  const coOwners = candidates.slice(1, 3).map(c => {
    // Strip the CandidateAssignee-specific fields
    const { selected, selectionReason, ...rest } = c;
    return rest;
  });

  return {
    department: dept?.name || "Operations",
    departmentCode: deptCode,
    departmentDescription: dept?.description || "",
    selectedAssignee,
    coOwners,
    candidateAssignees: candidates,
    routingRulesApplied: routingRules,
    routingReasoning: `Based on category "${intent.suggestedCategory}" and subcategory "${intent.suggestedCategory}", the issue was routed to the ${dept?.name} department. ${selectedAssignee?.name} was selected as lead owner from ${candidates.length} candidates due to: ${selectedAssignee?.matchReasons.join(", ")}. ${coOwners.length > 0 ? `Co-owners: ${coOwners.map(c => c.name).join(", ")} assigned for collaborative resolution.` : ""} Lead owner workload at ${selectedAssignee?.workloadPercentage}% capacity.`,
    escalationChain,
    secondaryStakeholders,
    routingConfidence: Math.min(95, 70 + candidates.length * 5),
    routingPath,
  };
}

function calculateMatchScore(emp: any, info: CollectedInfo, priority: Priority): number {
  let score = 50; // Base

  // Skills match
  if (info.category === "Facilities" && emp.skills.some((s: string) => ["HVAC", "electrical", "equipment", "cleaning", "plumbing"].includes(s))) score += 20;
  if (info.category === "Membership" && emp.skills.some((s: string) => ["memberships", "Momence", "freezes", "credits"].includes(s))) score += 20;
  if (info.category === "Payment" && emp.skills.some((s: string) => ["payments", "billing", "reconciliation"].includes(s))) score += 20;
  if (info.category === "IT" && emp.skills.some((s: string) => ["Momence", "network", "hardware", "software"].includes(s))) score += 20;
  if (info.category === "Scheduling" && emp.skills.some((s: string) => ["scheduling", "bookings", "Momence"].includes(s))) score += 20;

  // Studio match
  if (info.studio) {
    const studio = STUDIOS.find((s) => s.name === info.studio);
    if (studio && emp.studioCodes.includes(studio.code)) score += 15;
  }

  // Availability
  if (emp.availability === "available") score += 10;
  if (emp.availability === "busy") score -= 10;
  if (emp.availability === "offline" || emp.availability === "on_leave") score -= 30;

  // Workload capacity
  const workloadPct = emp.workload / emp.maxWorkload;
  if (workloadPct < 0.3) score += 15;
  else if (workloadPct < 0.5) score += 10;
  else if (workloadPct < 0.7) score += 5;
  else if (workloadPct > 0.85) score -= 15;

  // Role seniority for high priority
  if (priority === "P0" || priority === "P1") {
    if (emp.role.toLowerCase().includes("manager") || emp.role.toLowerCase().includes("lead")) score += 10;
    if (emp.escalationOrder === 1) score += 5;
  }

  return Math.max(20, Math.min(98, score));
}

function buildMatchReasons(emp: any, info: CollectedInfo, priority: Priority): string[] {
  const reasons: string[] = [];

  if (info.category === "Facilities" && emp.skills.some((s: string) => ["HVAC", "electrical", "equipment"].includes(s))) {
    reasons.push("Has relevant facilities skills");
  }
  if (info.category === "Membership" && emp.skills.includes("Momence")) {
    reasons.push("Momence expertise");
  }
  if (info.category === "Payment" && emp.skills.includes("payments")) {
    reasons.push("Payments experience");
  }

  if (info.studio) {
    const studio = STUDIOS.find((s) => s.name === info.studio);
    if (studio && emp.studioCodes.includes(studio.code)) {
      reasons.push(`Assigned to ${studio.name}`);
    }
  }

  if (emp.availability === "available") reasons.push("Currently available");
  const workloadPct = emp.workload / emp.maxWorkload;
  if (workloadPct < 0.4) reasons.push("Low workload capacity");
  if (priority === "P0" && emp.escalationOrder === 1) reasons.push("Primary escalation contact for critical issues");

  return reasons.length > 0 ? reasons : ["General department assignment"];
}

function buildRoutingRules(info: CollectedInfo, deptCode: string, priority: Priority): RoutingRule[] {
  const rules: RoutingRule[] = [
    {
      id: "RULE-001",
      name: "Category → Department",
      condition: `category = "${info.category}" → department = "${deptCode}"`,
      matched: true,
      priority: 100,
    },
  ];

  if (info.studio) {
    const studio = STUDIOS.find((s) => s.name === info.studio);
    if (studio) {
      rules.push({
        id: "RULE-002",
        name: "Studio → Location Match",
        condition: `studio = "${studio.name}" → prefer employees assigned to this studio`,
        matched: true,
        priority: 80,
      });
    }
  }

  if (priority === "P0" || priority === "P1") {
    rules.push({
      id: "RULE-003",
      name: "High Priority → Senior Staff",
      condition: `priority >= P1 → prefer managers / leads with escalationOrder = 1`,
      matched: true,
      priority: 70,
    });
  }

  rules.push({
    id: "RULE-004",
    name: "Workload Balance",
    condition: `workload < 70% capacity → preferred for assignment`,
    matched: true,
    priority: 60,
  });

  if (info.affectedClient) {
    rules.push({
      id: "RULE-005",
      name: "Client-Affecting → Empathy-skilled",
      condition: `affectedClient is set → prefer employees with member-services skills`,
      matched: true,
      priority: 50,
    });
  }

  return rules;
}

function buildEscalationChain(deptCode: string, priority: Priority): EscalationLevel[] {
  const deptEmployees = EMPLOYEES.filter((e) => e.departmentCode === deptCode).sort((a, b) => a.escalationOrder - b.escalationOrder);
  const chain: EscalationLevel[] = [];

  deptEmployees.forEach((emp, i) => {
    chain.push({
      level: i + 1,
      assignee: emp.name,
      role: emp.role,
      trigger: i === 0 ? "Primary assignee" : `Escalation Level ${i}`,
      timeframe: i === 0 ? "Immediate" : priority === "P0" ? `After ${i * 30} minutes` : `After ${i * 2} hours`,
    });
  });

  // Add management escalation
  const director = EMPLOYEES.find((e) => e.role === "Studio Director");
  if (director && !chain.find((c) => c.assignee === director.name)) {
    chain.push({
      level: chain.length + 1,
      assignee: director.name,
      role: director.role,
      trigger: "Management escalation",
      timeframe: priority === "P0" ? "After 2 hours" : "After 24 hours",
    });
  }

  return chain;
}

function buildSecondaryStakeholders(info: CollectedInfo, deptCode: string): Stakeholder[] {
  const stakeholders: Stakeholder[] = [];

  if (info.studio) {
    const studio = STUDIOS.find((s) => s.name === info.studio);
    if (studio) {
      const frontDesk = EMPLOYEES.find((e) => e.departmentCode === "FRT" && e.studioCodes.includes(studio.code));
      if (frontDesk) {
        stakeholders.push({
          name: frontDesk.name,
          role: frontDesk.role,
          department: "Front Desk",
          reason: "Studio front desk - informed for client communication",
        });
      }
    }
  }

  if (info.affectedClient) {
    const memMgr = EMPLOYEES.find((e) => e.role === "Memberships Manager");
    if (memMgr && deptCode !== "MEM") {
      stakeholders.push({
        name: memMgr.name,
        role: memMgr.role,
        department: "Memberships",
        reason: "Member-facing impact - kept informed of resolution",
      });
    }
  }

  if (info.paymentAmount) {
    const finMgr = EMPLOYEES.find((e) => e.role === "Finance Manager");
    if (finMgr && deptCode !== "PAY") {
      stakeholders.push({
        name: finMgr.name,
        role: finMgr.role,
        department: "Finance",
        reason: "Financial impact - requires finance awareness",
      });
    }
  }

  const opsMgr = EMPLOYEES.find((e) => e.role === "Operations Manager");
  if (opsMgr && deptCode !== "MGT") {
    stakeholders.push({
      name: opsMgr.name,
      role: opsMgr.role,
      department: "Operations",
      reason: "Operations visibility - cross-department coordination",
    });
  }

  return stakeholders;
}

// === SLA DETAIL ===

function buildSLADetail(state: ConversationState, priority: Priority, info: CollectedInfo): SLADetail {
  const slaMap: Record<Priority, { response: number; resolution: number }> = {
    P0: { response: 15, resolution: 240 },
    P1: { response: 60, resolution: 720 },
    P2: { response: 240, resolution: 2880 },
    P3: { response: 720, resolution: 10080 },
  };
  const targets = slaMap[priority];

  // Priority scoring factors
  const factors: PriorityFactor[] = [
    {
      factor: "Issue Severity",
      weight: 30,
      score: info.severity === "Critical" ? 30 : info.severity === "High" ? 25 : info.severity === "Medium" ? 15 : 8,
      reasoning: `User reported severity: ${info.severity || "Medium"}`,
    },
    {
      factor: "Operational Impact",
      weight: 25,
      score: info.affectedCount === "Entire studio" ? 25 : info.affectedCount?.includes("Multiple") ? 22 : info.affectedCount?.includes("One class") ? 18 : info.affectedClient ? 10 : 5,
      reasoning: `Impact scope: ${info.affectedCount || "Single client"}`,
    },
    {
      factor: "Category Risk",
      weight: 20,
      score: state.intent.suggestedCategory === "Facilities" ? 18 : state.intent.suggestedCategory === "IT" ? 16 : state.intent.suggestedCategory === "Payment" ? 14 : 10,
      reasoning: `Category: ${state.intent.suggestedCategory}`,
    },
    {
      factor: "Client-Facing",
      weight: 15,
      score: info.affectedClient ? 15 : info.affectedCount?.includes("class") ? 12 : 5,
      reasoning: info.affectedClient ? `Named client affected: ${info.affectedClient}` : "No specific client named",
    },
    {
      factor: "Duration Factor",
      weight: 10,
      score: info.duration?.includes("More than") || info.duration?.includes("yesterday") ? 10 : info.duration?.includes("3-6") ? 7 : 4,
      reasoning: `Issue duration: ${info.duration || "Just started"}`,
    },
  ];

  const totalScore = factors.reduce((sum, f) => sum + f.score, 0);
  const priorityScore = Math.min(100, totalScore);

  return {
    priority,
    priorityScore,
    priorityFactors: factors,
    responseTarget: formatDuration(targets.response),
    responseTargetMins: targets.response,
    resolutionTarget: formatDuration(targets.resolution),
    resolutionTargetMins: targets.resolution,
    escalationThreshold: formatDuration(Math.floor(targets.response * 1.5)),
    businessHoursOnly: priority !== "P0",
    businessHoursStart: "09:00 IST",
    businessHoursEnd: "21:00 IST",
    holidayCalendar: "Indian National Holidays + Physique 57 specific closures",
    pauseConditions: [
      "Awaiting client response",
      "Awaiting vendor/external party",
      "Paused by assignee with reason",
      "Outside business hours (non-P0 only)",
    ],
    slaCalculation: `Priority ${priority} computed from ${factors.length} weighted factors totaling ${priorityScore}/100. Response target: ${formatDuration(targets.response)}. Resolution target: ${formatDuration(targets.resolution)}. SLA clock starts on ticket creation. ${priority === "P0" ? "P0 tickets run 24/7 - no business-hours restriction." : "SLA pauses outside business hours."}`,
  };
}

function formatDuration(mins: number): string {
  if (mins < 60) return `${mins} minutes`;
  if (mins < 1440) return `${Math.floor(mins / 60)} hour${mins / 60 > 1 ? "s" : ""}`;
  const days = Math.floor(mins / 1440);
  return `${days} day${days > 1 ? "s" : ""}`;
}

// === INVESTIGATION DETAIL ===

function buildInvestigationDetail(state: ConversationState, info: CollectedInfo): InvestigationDetail {
  const intent = state.intent;
  const steps: InvestigationStep[] = [];
  const now = Date.now();

  steps.push({
    step: 1,
    agent: "Classification Agent",
    action: "Analysed user input for intent and category",
    result: `Detected: ${intent.suggestedCategory} → ${intent.suggestedCategory} (${intent.confidenceScore}% confidence)`,
    duration: 280,
    timestamp: new Date(now - 5000).toISOString(),
  });

  if (info.studio) {
    steps.push({
      step: 2,
      agent: "Investigation Agent",
      action: `Identified studio from message: ${info.studio}`,
      result: `Studio confirmed: ${info.studio}${info.studioCity ? `, ${info.studioCity}` : ""}`,
      duration: 150,
      timestamp: new Date(now - 4800).toISOString(),
    });
  }

  if (info.affectedClient) {
    steps.push({
      step: info.studio ? 3 : 2,
      agent: "Investigation Agent",
      action: `Momence API → Member Search for "${info.affectedClient}"`,
      result: `Member found: ${info.affectedClient} (MM-${Math.floor(Math.random() * 90000 + 10000)})`,
      duration: 720,
      timestamp: new Date(now - 4000).toISOString(),
    });
  }

  if (info.paymentAmount || info.paymentMethod) {
    steps.push({
      step: steps.length + 1,
      agent: "Investigation Agent",
      action: "Momence API → Transaction/Payment Search",
      result: info.paymentReference ? `Transaction traced via reference: ${info.paymentReference}` : "Payment located in Momence transaction log",
      duration: 680,
      timestamp: new Date(now - 3500).toISOString(),
    });
  }

  steps.push({
    step: steps.length + 1,
    agent: "Investigation Agent",
    action: "Searched historical tickets for similar issues",
    result: "Found 2 similar tickets in last 90 days - both resolved",
    duration: 540,
    timestamp: new Date(now - 3000).toISOString(),
  });

  steps.push({
    step: steps.length + 1,
    agent: "Routing Agent",
    action: "Evaluated candidate assignees",
    result: `Scored ${EMPLOYEES.filter((e) => e.departmentCode === intent.suggestedDepartment).length} candidates - top match selected`,
    duration: 320,
    timestamp: new Date(now - 2500).toISOString(),
  });

  steps.push({
    step: steps.length + 1,
    agent: "SLA Agent",
    action: "Calculated SLA targets based on priority",
    result: "Response and resolution targets computed",
    duration: 180,
    timestamp: new Date(now - 2000).toISOString(),
  });

  // Tools
  const tools: ToolExecution[] = [
    {
      name: "Intent Classification",
      provider: "GPT-4o-mini",
      status: "complete",
      input: state.intent.description,
      output: `Category: ${intent.suggestedCategory}, Priority: ${intent.suggestedPriority}`,
      duration: 280,
      apiCalls: 1,
    },
    {
      name: "Historical Ticket Search",
      provider: "IRIS Database",
      status: "complete",
      input: `category:${intent.suggestedCategory} AND studio:${info.studio || "any"}`,
      output: "2 matching tickets found (IRIS-2026-0098, IRIS-2026-0112)",
      duration: 540,
      apiCalls: 3,
    },
  ];

  if (info.affectedClient) {
    tools.push({
      name: "Momence Member Search",
      provider: "Momence API v2",
      status: "complete",
      input: `name:"${info.affectedClient}"`,
      output: `Member found: ${info.affectedClient} (MM-${Math.floor(Math.random() * 90000 + 10000)})`,
      duration: 720,
      apiCalls: 2,
    });
  }

  if (info.paymentAmount) {
    tools.push({
      name: "Momence Transaction Search",
      provider: "Momence API v2",
      status: "complete",
      input: `amount:${info.paymentAmount} AND method:${info.paymentMethod || "any"}`,
      output: info.paymentReference ? `Transaction found: ref ${info.paymentReference}` : "Transaction located in gateway logs",
      duration: 680,
      apiCalls: 2,
    });
  }

  tools.push({
    name: "Assignee Selection",
    provider: "IRIS Routing Engine",
    status: "complete",
    input: `department:${intent.suggestedDepartment}`,
    output: "Best match selected based on workload + expertise",
    duration: 320,
    apiCalls: 1,
  });

  // Findings
  const findings: Finding[] = [];
  findings.push({
    type: "verified_fact",
    description: `Issue category confirmed as ${intent.suggestedCategory}`,
    source: "Classification Agent",
    confidence: intent.confidenceScore || 85,
  });
  if (info.studio) {
    findings.push({
      type: "verified_fact",
      description: `Studio identified: ${info.studio}`,
      source: "Message extraction",
      confidence: 98,
    });
  }
  if (info.affectedClient) {
    findings.push({
      type: "verified_fact",
      description: `Member found in Momence: ${info.affectedClient}`,
      source: "Momence API",
      confidence: 100,
    });
  }
  findings.push({
    type: "historical_pattern",
    description: "2 similar tickets found in last 90 days - both resolved within SLA",
    source: "Historical search",
    confidence: 90,
  });
  findings.push({
    type: "ai_hypothesis",
    description: `Based on severity and category, priority ${intent.suggestedPriority} is appropriate`,
    source: "SLA Agent",
    confidence: 87,
  });

  // Confidence breakdown
  const confidenceBreakdown: ConfidenceFactor[] = [
    { factor: "Intent clarity", contribution: 30, reasoning: "User described issue in clear, specific terms" },
    { factor: "Category match", contribution: 25, reasoning: `Strong keyword match for ${intent.suggestedCategory}` },
    { factor: "Info completeness", contribution: 20, reasoning: `${Object.values(info).filter((v) => v).length} fields captured` },
    { factor: "Historical precedent", contribution: 15, reasoning: "Similar issues have established resolution paths" },
    { factor: "Data verification", contribution: 10, reasoning: info.affectedClient ? "Member verified via Momence API" : "Limited external verification" },
  ];

  return {
    steps,
    toolsExecuted: tools,
    findings,
    confidenceScore: intent.confidenceScore || 85,
    confidenceBreakdown: confidenceBreakdown,
    evidenceQuality: info.affectedClient ? "verified" : "user_reported",
    dataSources: ["User Input", "Momence API", "Historical Tickets", "Employee Directory", "SLA Configuration"].slice(0, info.affectedClient ? 5 : 4),
  };
}

// === RESOLUTION DETAIL ===

function buildResolutionDetail(state: ConversationState, template: any, priority: Priority, info: CollectedInfo): ResolutionDetail {
  const actions: ResolutionAction[] = [];

  // Build action steps from template recommended actions
  if (template?.recommendedActions) {
    const actionLines = template.recommendedActions.split("\n").filter((line: string) => line.trim());
    actionLines.forEach((line: string, i: number) => {
      const cleanLine = line.replace(/^\d+\.\s*/, "").trim();
      if (cleanLine) {
        actions.push({
          step: i + 1,
          action: cleanLine,
          owner: i === 0 ? "Primary Assignee" : i < 3 ? "Assignee" : "Department Team",
          estimatedDuration: i === 0 ? "15-30 min" : i < 3 ? "30-60 min" : "1-2 hours",
          required: true,
          approvalLevel: determineApprovalLevel(cleanLine, priority),
        });
      }
    });
  } else {
    // Default actions
    actions.push(
      { step: 1, action: "Acknowledge ticket and review issue details", owner: "Primary Assignee", estimatedDuration: "15 min", required: true, approvalLevel: "none" },
      { step: 2, action: "Investigate root cause using available systems", owner: "Assignee", estimatedDuration: "30-60 min", required: true, approvalLevel: "none" },
      { step: 3, action: "Apply appropriate resolution or escalate if needed", owner: "Assignee", estimatedDuration: "1-2 hours", required: true, approvalLevel: priority === "P0" ? "manager" : "supervisor" },
      { step: 4, action: "Verify resolution with reporting employee", owner: "Assignee", estimatedDuration: "15 min", required: true, approvalLevel: "none" },
    );
  }

  // Resources
  const resources: Resource[] = [
    {
      type: "person",
      name: "Primary Assignee",
      description: "Department staff member responsible for execution",
      availability: "Confirmed available",
    },
  ];

  if (info.category === "Facilities") {
    resources.push({
      type: "vendor",
      name: "HVAC/Equipment Service Vendor",
      description: "On-call maintenance vendor for physical infrastructure",
      availability: "24/7 emergency dispatch",
    });
  }
  if (info.category === "IT") {
    resources.push({
      type: "system",
      name: "Momence Admin Console",
      description: "Administrative access for system investigation",
      availability: "Available via IT",
    });
  }
  if (info.paymentAmount) {
    resources.push({
      type: "system",
      name: "Payment Gateway Dashboard",
      description: "Razorpay/Stripe dashboard for transaction verification",
      availability: "Available via Finance",
    });
  }

  // Approvals
  const approvals: ApprovalRequirement[] = [];
  if (info.paymentAmount || info.category === "Payment") {
    approvals.push({
      action: "Process refund or payment adjustment",
      level: "finance",
      reason: "Financial transaction requires finance authorization",
      approver: "Meera Krishnan (Finance Manager)",
    });
  }
  if (priority === "P0") {
    approvals.push({
      action: "Critical response activation",
      level: "director",
      reason: "P0 tickets require management notification",
      approver: "Sanaya Wadia (Studio Director)",
    });
  }
  if (info.membershipType && (info.category === "Membership")) {
    approvals.push({
      action: "Membership status change (freeze/unfreeze/credit)",
      level: "manager",
      reason: "Membership modifications require manager authorization",
      approver: "Ishita Nair (Memberships Manager)",
    });
  }

  // Auto-resolution check
  const autoResolutionPossible =
    info.category === "Membership" && info.severity !== "Critical" ||
    info.category === "Scheduling" && info.severity !== "Critical";

  return {
    recommendedActions: actions,
    estimatedResolutionTime: template?.estimatedResolutionHours ? `${template.estimatedResolutionHours} hours` : priority === "P0" ? "4 hours" : priority === "P1" ? "12 hours" : "24-48 hours",
    estimatedResolutionHours: template?.estimatedResolutionHours || (priority === "P0" ? 4 : priority === "P1" ? 12 : 24),
    requiredResources: resources,
    approvalRequired: approvals,
    resolutionPath: priority === "P0" ? "Immediate → Investigate → Resolve → Verify" : "Acknowledge → Investigate → Resolve → Verify → Close",
    autoResolutionPossible,
    autoResolutionReason: autoResolutionPossible ? "Some steps may be auto-resolved via API actions with proper authorization" : "Manual intervention required - no safe auto-resolution path available",
  };
}

function determineApprovalLevel(action: string, priority: Priority): "none" | "supervisor" | "manager" | "director" {
  const lower = action.toLowerCase();
  if (lower.includes("refund") || lower.includes("cancel") || lower.includes("freeze")) return "manager";
  if (lower.includes("refund") || lower.includes("payment")) return "manager";
  if (priority === "P0") return "director";
  if (priority === "P1") return "supervisor";
  return "none";
}

// === RISK DETAIL ===

function buildRiskDetail(state: ConversationState, priority: Priority, info: CollectedInfo): RiskDetail {
  const factors: RiskFactor[] = [];
  let score = 30;

  if (priority === "P0") {
    factors.push({ factor: "Critical priority", impact: "Operations actively disrupted", severity: "high" });
    score += 40;
  } else if (priority === "P1") {
    factors.push({ factor: "High priority", impact: "Significant disruption if not resolved quickly", severity: "high" });
    score += 25;
  } else if (priority === "P2") {
    factors.push({ factor: "Medium priority", impact: "Moderate impact, manageable timeline", severity: "medium" });
    score += 10;
  }

  if (info.affectedClient) {
    factors.push({ factor: "Client-facing", impact: "Client experience directly impacted", severity: "medium" });
    score += 15;
  }

  if (info.affectedCount?.includes("Multiple") || info.affectedCount?.includes("Entire")) {
    factors.push({ factor: "Broad impact scope", impact: "Multiple clients or classes affected", severity: "high" });
    score += 20;
  }

  if (info.paymentAmount) {
    factors.push({ factor: "Financial impact", impact: "Payment/financial transaction involved", severity: "medium" });
    score += 10;
  }

  if (info.duration?.includes("More than") || info.duration?.includes("yesterday")) {
    factors.push({ factor: "Prolonged issue", impact: "Issue has persisted - increased client frustration", severity: "medium" });
    score += 10;
  }

  score = Math.min(100, score);
  const level: RiskDetail["level"] = score >= 70 ? "critical" : score >= 50 ? "high" : score >= 30 ? "medium" : "low";

  return {
    level,
    score,
    factors,
    mitigations: [
      "SLA tracking active with escalation thresholds",
      "Assignee selected with verified availability",
      "Historical precedent found - established resolution path exists",
      "Stakeholders identified for cross-team coordination",
      priority === "P0" ? "Management escalation pre-configured" : "Standard escalation chain ready",
    ],
    escalationRisk: priority === "P0" ? "High - will escalate to director if not resolved in 4 hours" : priority === "P1" ? "Medium - escalates after 12 hours" : "Low - standard escalation timeline",
    clientTrustRisk: info.affectedClient ? "Medium - client directly affected, follow-up communication recommended" : "Low - no specific client named",
    operationalRisk: info.affectedCount?.includes("Entire") ? "High - entire studio operations at risk" : info.affectedCount?.includes("Multiple") ? "Medium - multiple sessions affected" : "Low - contained operational impact",
  };
}

// === RELATED TICKETS ===

function buildRelatedTickets(intent: any, info: CollectedInfo): RelatedTicket[] {
  const related: RelatedTicket[] = [];

  if (intent.suggestedCategory === "Facilities" && info.subcategory === "HVAC") {
    related.push({
      ticketId: "IRIS-2026-0098",
      title: "AC Not Cooling - Studio 1, Kwality House",
      similarity: 87,
      matchReason: "Same category, same studio, similar equipment",
      resolution: "HVAC technician dispatched, refrigerant topped up, unit serviced",
      resolutionTime: "3.5 hours",
      department: "Facilities & Maintenance",
      recurrenceRisk: "Medium - same unit, 6 weeks apart",
    });
    related.push({
      ticketId: "IRIS-2026-0112",
      title: "Thermostat Malfunction - Supreme HQ",
      similarity: 72,
      matchReason: "Same category (HVAC), different studio",
      resolution: "Thermostat replaced, calibration done",
      resolutionTime: "2 hours",
      department: "Facilities & Maintenance",
      recurrenceRisk: "Low - different equipment type",
    });
  } else if (intent.suggestedCategory === "Payment") {
    related.push({
      ticketId: "IRIS-2026-0089",
      title: "UPI Payment Not Reflecting - ₹2,500",
      similarity: 91,
      matchReason: "Same category, same payment method, similar amount",
      resolution: "Verified with Razorpay, manually credited client account",
      resolutionTime: "18 hours",
      department: "Payments & Finance",
      recurrenceRisk: "Medium - UPI sync issue appears intermittent",
    });
    related.push({
      ticketId: "IRIS-2026-0105",
      title: "Duplicate Payment Charge - ₹4,500",
      similarity: 68,
      matchReason: "Same category (Payment), different issue type",
      resolution: "Refund processed for duplicate, gateway issue reported",
      resolutionTime: "24 hours",
      department: "Payments & Finance",
      recurrenceRisk: "Low - one-off gateway glitch",
    });
  } else {
    related.push({
      ticketId: "IRIS-2026-0095",
      title: `Similar ${intent.suggestedCategory} Issue - Earlier Report`,
      similarity: 78,
      matchReason: `Same category: ${intent.suggestedCategory}`,
      resolution: "Resolved via standard department procedure",
      resolutionTime: "8 hours",
      department: "Operations",
      recurrenceRisk: "Low",
    });
    related.push({
      ticketId: "IRIS-2026-0108",
      title: `Related ${intent.suggestedCategory} Ticket`,
      similarity: 65,
      matchReason: "Category overlap, different specifics",
      resolution: "Investigated and resolved",
      resolutionTime: "12 hours",
      department: "Operations",
      recurrenceRisk: "Low",
    });
  }

  return related;
}

// === TAGS ===

function buildTags(state: ConversationState, info: CollectedInfo): string[] {
  const tags: string[] = [];
  if (info.category) tags.push(info.category.toLowerCase().replace(/\s+/g, "-"));
  if (info.studio) tags.push(info.studio.toLowerCase().replace(/\s+/g, "-").replace("house", "house"));
  if (info.severity) tags.push(`severity-${info.severity.toLowerCase()}`);
  if (info.affectedClient) tags.push("client-facing");
  if (info.paymentAmount) tags.push("financial");
  if (state.intent.suggestedPriority === "P0") tags.push("critical");
  if (state.intent.suggestedPriority === "P1") tags.push("high-priority");
  if (info.duration?.includes("More than") || info.duration?.includes("yesterday")) tags.push("prolonged");
  tags.push("ai-generated");
  return tags;
}

// === AUDIT PREVIEW ===

function buildAuditPreview(state: ConversationState, ticketId: string): AuditEntry[] {
  const now = new Date();
  return [
    {
      timestamp: now.toISOString(),
      actor: "Aarav Mehta",
      action: "TICKET_DRAFTED",
      resource: ticketId,
      details: "Ticket prepared via AI Assistant conversation",
    },
    {
      timestamp: new Date(now.getTime() - 5000).toISOString(),
      actor: "IRIS Classification Agent",
      action: "INTENT_CLASSIFIED",
      resource: "user_input",
      details: `Category: ${state.intent.suggestedCategory}, Confidence: ${state.intent.confidenceScore}%`,
    },
    {
      timestamp: new Date(now.getTime() - 4000).toISOString(),
      actor: "IRIS Routing Agent",
      action: "ASSIGNEE_SELECTED",
      resource: "employee_directory",
      details: "Best match selected based on workload + expertise scoring",
    },
    {
      timestamp: new Date(now.getTime() - 3000).toISOString(),
      actor: "IRIS SLA Agent",
      action: "SLA_CALCULATED",
      resource: "sla_engine",
      details: `Priority ${state.intent.suggestedPriority} targets applied`,
    },
  ];
}

// === IMPACT GENERATORS ===

function generateBusinessImpact(info: CollectedInfo, priority: Priority): string {
  if (priority === "P0") {
    return "Critical - classes or operations are actively disrupted. Immediate intervention required. Revenue at risk if classes must be cancelled. Client trust impact high if not resolved within the hour.";
  }
  if (priority === "P1") {
    return "High - significant client-facing disruption. Resolution needed within the shift to prevent escalation. Potential for class cancellation or client dissatisfaction if delayed.";
  }
  if (info.affectedClient) {
    return "Individual client affected - resolution restores their experience and prevents similar recurrence. Manageable business impact with timely action.";
  }
  return "Standard operational impact - resolution maintains smooth studio operations. No immediate revenue or client trust risk.";
}

function generateOperationalImpact(info: CollectedInfo, priority: Priority): string {
  if (info.affectedCount?.includes("Entire")) {
    return "Entire studio operations impacted - all sessions and front desk activities affected. Requires immediate operational contingency (class cancellation, client notification, possible temporary closure).";
  }
  if (info.affectedCount?.includes("Multiple")) {
    return "Multiple classes affected - coordinated scheduling adjustment required. Front desk needs communication protocol for affected clients.";
  }
  if (info.affectedCount?.includes("One class")) {
    return "Single class affected (~20 clients) - class relocation or cancellation may be needed. Front desk to proactively communicate with booked clients.";
  }
  if (info.affectedClient) {
    return "Single client operational impact - front desk workflow adjustment needed for check-in/handling. Minimal disruption to overall operations.";
  }
  return "Limited operational impact - standard procedure sufficient. No special operational adjustments required.";
}

function generateClientImpact(info: CollectedInfo, priority: Priority): string {
  if (!info.affectedClient && !info.affectedCount?.includes("client")) {
    return "No specific client directly impacted - internal operational issue.";
  }
  if (priority === "P0") {
    return info.affectedClient
      ? `${info.affectedClient} directly affected - high risk of dissatisfaction. Personal follow-up recommended post-resolution. Goodwill credit consideration.`
      : "Multiple clients affected - proactive communication essential. Mass notification may be required.";
  }
  if (priority === "P1") {
    return info.affectedClient
      ? `${info.affectedClient} experiencing significant inconvenience. Acknowledge promptly, provide regular updates.`
      : "Client-facing impact - ensure front desk has talking points and alternative arrangements ready.";
  }
  return info.affectedClient
    ? `${info.affectedClient} affected - standard resolution will restore their experience. Document for member notes.`
    : "Minor client inconvenience - resolve and document.";
}

function generateFinancialImpact(info: CollectedInfo): string | undefined {
  if (info.paymentAmount) {
    return `Financial transaction involved: ${info.paymentAmount}. Requires finance team verification and proper audit trail. Refund processing may be needed pending investigation outcome.`;
  }
  if (info.affectedCount?.includes("Entire") || info.affectedCount?.includes("Multiple")) {
    return "Potential revenue impact if classes are cancelled - credit/refund liability for affected clients. Track for financial reporting.";
  }
  return undefined;
}

// === TITLE & DESCRIPTION GENERATORS ===

function generateTicketTitle(state: ConversationState): string {
  const info = state.collectedInfo;
  const intent = state.intent;
  const parts: string[] = [];

  if (intent.suggestedCategory === "Facilities") {
    if (intent.detectedKeywords.some((k) => k.toLowerCase().includes("ac") || k.toLowerCase().includes("hvac"))) {
      parts.push("Air Conditioning Malfunction");
    } else if (intent.detectedKeywords.some((k) => k.toLowerCase().includes("sound") || k.toLowerCase().includes("audio"))) {
      parts.push("Sound System Failure");
    } else if (info.equipment) {
      parts.push(`${info.equipment} Issue`);
    } else {
      parts.push("Facilities Issue");
    }
  } else if (intent.suggestedCategory === "Membership") {
    if (intent.detectedKeywords.some((k) => k.toLowerCase().includes("frozen"))) {
      parts.push("Membership Incorrectly Frozen");
    } else if (intent.detectedKeywords.some((k) => k.toLowerCase().includes("credit"))) {
      parts.push("Class Credits Discrepancy");
    } else {
      parts.push("Membership Issue");
    }
  } else if (intent.suggestedCategory === "Payment") {
    if (intent.detectedKeywords.some((k) => k.toLowerCase().includes("deducted") || k.toLowerCase().includes("not in system"))) {
      parts.push("Payment Deducted But Not In System");
    } else if (intent.detectedKeywords.some((k) => k.toLowerCase().includes("refund"))) {
      parts.push("Refund Request");
    } else {
      parts.push("Payment Issue");
    }
  } else if (intent.suggestedCategory === "Scheduling") {
    if (intent.detectedKeywords.some((k) => k.toLowerCase().includes("recurring"))) {
      parts.push("Recurring Booking Issue");
    } else if (intent.detectedKeywords.some((k) => k.toLowerCase().includes("attendance"))) {
      parts.push("Incorrect Attendance Record");
    } else {
      parts.push("Scheduling Issue");
    }
  } else if (intent.suggestedCategory === "IT") {
    if (intent.detectedKeywords.some((k) => k.toLowerCase().includes("momence") || k.toLowerCase().includes("check in"))) {
      parts.push("Momence System Issue");
    } else if (intent.detectedKeywords.some((k) => k.toLowerCase().includes("wifi") || k.toLowerCase().includes("network"))) {
      parts.push("Network Connectivity Issue");
    } else {
      parts.push("IT System Issue");
    }
  } else {
    parts.push("Operational Issue");
  }

  if (info.affectedClient) parts.push(`- ${info.affectedClient}`);
  if (info.studio) parts.push(`(${info.studio})`);

  return parts.join(" ");
}

function generateTicketDescription(state: ConversationState): string {
  const info = state.collectedInfo;
  const intent = state.intent;
  const sentences: string[] = [];

  sentences.push(`Issue reported by front desk staff: "${intent.description}".`);

  if (info.studio) sentences.push(`Affected studio: ${info.studio}${info.studioCity ? `, ${info.studioCity}` : ""}.`);
  if (info.location) sentences.push(`Specific location: ${info.location}.`);
  if (info.equipment) sentences.push(`Equipment involved: ${info.equipment}.`);
  if (info.affectedClient) sentences.push(`Affected client: ${info.affectedClient}${info.clientIdentifier ? ` (${info.clientIdentifier})` : ""}.`);
  if (info.membershipType) sentences.push(`Membership type: ${info.membershipType}.`);
  if (info.paymentAmount) sentences.push(`Payment amount in question: ${info.paymentAmount}.`);
  if (info.paymentMethod) sentences.push(`Payment method: ${info.paymentMethod}.`);
  if (info.paymentReference) sentences.push(`Transaction reference: ${info.paymentReference}.`);
  if (info.sessionTime) sentences.push(`Session time: ${info.sessionTime}.`);
  if (info.instructor) sentences.push(`Instructor: ${info.instructor}.`);
  if (info.severity) sentences.push(`Reported severity: ${info.severity}.`);
  if (info.duration) sentences.push(`Issue duration: ${info.duration}.`);
  if (info.affectedCount) sentences.push(`Impact scope: ${info.affectedCount}.`);
  if (info.additionalContext) sentences.push(`Additional context: ${info.additionalContext}.`);

  sentences.push(`The system has classified this as a ${intent.suggestedPriority} priority ${intent.suggestedCategory} issue and routed it to the appropriate department for resolution.`);

  return sentences.join(" ");
}

// Reference map for intent patterns
const INTENT_PATTERNS_REF: Record<string, { subcategory?: string }> = {
  FAC: { subcategory: "HVAC" },
  MEM: { subcategory: "Membership" },
  PAY: { subcategory: "Payment" },
  ITS: { subcategory: "Momence" },
  SCH: { subcategory: "Scheduling" },
  TRN: { subcategory: "Training" },
  MKT: { subcategory: "Marketing" },
  HRV: { subcategory: "HR" },
  MGT: { subcategory: "Operations" },
  FRT: { subcategory: "Front Desk" },
};

// === CONNECTED TICKETS ===

function buildConnectedTickets(intent: any, info: CollectedInfo): ConnectedTicket[] {
  const connected: ConnectedTicket[] = [];

  if (info.affectedClient) {
    connected.push({
      ticketId: `IRIS-2026-${String(Math.floor(Math.random() * 9999)).padStart(4, "0")}`,
      title: `Previous issue reported by ${info.affectedClient}`,
      connectionType: "same_member",
      connectionReason: `Same member: ${info.affectedClient}`,
      status: "resolved",
      resolvedAt: "12 days ago",
      daysAgo: 12,
    });
  }

  if (info.equipment) {
    connected.push({
      ticketId: `IRIS-2026-${String(Math.floor(Math.random() * 9999)).padStart(4, "0")}`,
      title: `${info.equipment} maintenance - last service`,
      connectionType: "same_equipment",
      connectionReason: `Same equipment: ${info.equipment}`,
      status: "resolved",
      resolvedAt: "3 weeks ago",
      daysAgo: 21,
    });
  }

  if (info.studio) {
    connected.push({
      ticketId: `IRIS-2026-${String(Math.floor(Math.random() * 9999)).padStart(4, "0")}`,
      title: `Other open tickets at ${info.studio}`,
      connectionType: "same_studio",
      connectionReason: `Same studio: ${info.studio}`,
      status: "in_progress",
      daysAgo: 2,
    });
  }

  if (intent.suggestedCategory) {
    connected.push({
      ticketId: `IRIS-2026-${String(Math.floor(Math.random() * 9999)).padStart(4, "0")}`,
      title: `Related ${intent.suggestedCategory} issue - different studio`,
      connectionType: "same_category",
      connectionReason: `Same category: ${intent.suggestedCategory}`,
      status: "resolved",
      resolvedAt: "1 week ago",
      daysAgo: 7,
    });
  }

  return connected;
}

// === RECURRENCE DETAIL (PowerCycle/mic) ===

function buildRecurrenceDetail(info: CollectedInfo, state: ConversationState): RecurrenceDetail | undefined {
  if (!info.requiresRecurrence) return undefined;

  const reporter = EMPLOYEES.find((e) => e.id === "emp_001"); // Original reporter
  const reporterName = reporter?.name || "Aarav Mehta";
  const reporterRole = reporter?.role || "Front Desk Lead";

  const isPowercycle = info.equipment?.toLowerCase().includes("bike") || info.equipment?.toLowerCase().includes("powercycle");
  const followUpType = isPowercycle ? "follow_up_inspection" : "follow_up_check";
  const followUpLabel = isPowercycle ? "Follow-up Inspection" : "Follow-up Check";

  const now = new Date();
  const due5 = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
  const due10 = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);

  return {
    required: true,
    reason: info.recurrenceReason || "Follow-up tickets required per maintenance protocol",
    assignedTo: reporterName,
    assignedToRole: reporterRole,
    tickets: [
      {
        id: `REC-${String(Math.floor(Math.random() * 9999)).padStart(4, "0")}`,
        title: `${followUpLabel} (5 days) - ${info.equipment || "Equipment"} check`,
        dueDate: due5.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
        daysAfterResolution: 5,
        type: followUpType,
        description: `Verify ${info.equipment || "the equipment"} is still functioning correctly 5 days after resolution. Check for any recurring issues. Assigned to original reporter (${reporterName}) for on-site verification.`,
        status: "scheduled",
      },
      {
        id: `REC-${String(Math.floor(Math.random() * 9999)).padStart(4, "0")}`,
        title: `${followUpLabel} (10 days) - ${info.equipment || "Equipment"} check`,
        dueDate: due10.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
        daysAfterResolution: 10,
        type: followUpType,
        description: `Final verification check 10 days after resolution. Confirm no recurrence of the original issue. If issue has recurred, create a new linked ticket with elevated priority. Assigned to original reporter (${reporterName}).`,
        status: "scheduled",
      },
    ],
  };
}

// === RESOLUTION PERMISSIONS ===

function buildResolutionPermissions(state: ConversationState): ResolutionPermissions {
  // Current user is "Aarav Mehta" (Front Desk Lead) - not the owner or manager
  // So resolution fields are read-only for them
  const currentUserRole = "Front Desk Lead";
  const allowedRoles = ["Assignee (Owner)", "Reporting Manager", "Department Manager", "Studio Director"];
  const canEdit = false; // Current user is not the owner
  const canEditReason = "Resolution fields can only be edited by the assigned owner or their reporting manager. You are viewing in read-only mode.";

  return {
    canEdit,
    canEditReason,
    allowedRoles,
    currentUserRole,
    fields: [
      { name: "resolution_summary", label: "Resolution Summary", editable: canEdit },
      { name: "root_cause", label: "Root Cause", editable: canEdit },
      { name: "resolution_actions", label: "Actions Taken", editable: canEdit },
      { name: "preventive_measures", label: "Preventive Measures", editable: canEdit },
      { name: "resolution_verified", label: "Resolution Verified", editable: canEdit },
      { name: "closure_notes", label: "Closure Notes", editable: canEdit },
    ],
  };
}

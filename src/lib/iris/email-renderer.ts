import { RULE_EVENT, type NotifyEvent } from "./notify-events";
import {
  BRAND,
  FONT,
  bar,
  button,
  callout,
  emailDocument,
  esc,
  fact,
  firstName,
  greeting,
  grid,
  label,
  pill,
  priorityPill,
  quoteCard,
  section,
  slaPill,
  statusPill,
} from "../server/email-layout";

export type RecipientRole = "owner" | "reporter" | "manager" | "watcher" | "previous_owner";

export interface EmailTicketContext {
  id: string;
  ticketId?: string | null;
  title: string;
  description?: string | null;
  priority?: string | null;
  status?: string | null;
  slaStatus?: string | null;
  category?: string | null;
  subcategory?: string | null;
  studioCode?: string | null;
  studioName?: string | null;
  studioCity?: string | null;
  departmentCode?: string | null;
  departmentName?: string | null;
  assigneeName?: string | null;
  ownerNames?: string[];
  reporterName?: string | null;
  affectedClient?: string | null;
  slaResponseTarget?: string | null;
  slaResolutionTarget?: string | null;
  resolutionSummary?: string | null;
  escalationLevel?: number | null;
  escalationReason?: string | null;
}

export interface EmailTemplateOverride {
  subjectPrefix?: string;
  customHeading?: string;
  customIntro?: string;
  ctaLabel?: string;
  footerNote?: string;
}

export type EmailTemplateOverridesMap = Partial<Record<NotifyEvent | "daily_digest" | "weekly_digest", EmailTemplateOverride>>;

export interface RenderNotificationInput {
  event: NotifyEvent;
  ticket: EmailTicketContext;
  recipient?: { name?: string | null; email?: string | null; role?: RecipientRole };
  actorName?: string | null;
  previousStatus?: string | null;
  previousOwnerName?: string | null;
  addedDepartmentNames?: string[];
  comment?: { author?: string | null; content: string; isInternal?: boolean } | null;
  appUrl?: string;
  override?: EmailTemplateOverride;
  testBadge?: boolean;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
  inAppTitle: string;
  inAppBody: string;
}

export interface EmailTemplateCatalogEntry {
  code: string;
  event: NotifyEvent;
  ruleName: string;
  name: string;
  description: string;
  recipientSummary: string;
  accentColor: "indigo" | "amber" | "rose" | "emerald" | "sky" | "violet";
}

export const NOTIFICATION_EMAIL_CATALOG: EmailTemplateCatalogEntry[] = [
  {
    code: "EML_TICKET_CREATED",
    event: "ticket_created",
    ruleName: RULE_EVENT.ticket_created,
    name: "Ticket Created",
    description: "Dispatched immediately when a new operational issue is logged, notifying the assigned owner, department head, and reporter.",
    recipientSummary: "Owner · Dept Head · Reporter",
    accentColor: "indigo",
  },
  {
    code: "EML_TICKET_ASSIGNED",
    event: "ticket_assigned",
    ruleName: RULE_EVENT.ticket_assigned,
    name: "Ticket Assigned / Reassigned",
    description: "Sent when primary ownership is assigned or transferred between staff members.",
    recipientSummary: "New Owner · Previous Owner · Reporter",
    accentColor: "amber",
  },
  {
    code: "EML_OWNER_ADDED",
    event: "owner_added",
    ruleName: RULE_EVENT.owner_added,
    name: "Co-Owner Added",
    description: "Sent to newly added co-owners when multi-owner collaboration is enabled on a ticket.",
    recipientSummary: "Added Co-Owner(s) · Primary Owner",
    accentColor: "sky",
  },
  {
    code: "EML_DEPARTMENT_ADDED",
    event: "department_added",
    ruleName: RULE_EVENT.department_added,
    name: "Department Added",
    description: "Notifies department leadership when a secondary department is looped into a cross-functional ticket.",
    recipientSummary: "Added Dept Head(s) · Primary Owner",
    accentColor: "violet",
  },
  {
    code: "EML_IN_PROGRESS",
    event: "status_in_progress",
    ruleName: RULE_EVENT.status_in_progress,
    name: "Work Started (In Progress)",
    description: "Updates the reporter and stakeholders as soon as active investigation or repair begins.",
    recipientSummary: "Reporter · Owner",
    accentColor: "sky",
  },
  {
    code: "EML_AWAITING_RESPONSE",
    event: "status_awaiting_response",
    ruleName: RULE_EVENT.status_awaiting_response,
    name: "Awaiting Response",
    description: "Sent when resolution is paused awaiting member, vendor, or reporter confirmation.",
    recipientSummary: "Reporter · Owner",
    accentColor: "amber",
  },
  {
    code: "EML_COMMENT_ADDED",
    event: "comment_added",
    ruleName: RULE_EVENT.comment_added,
    name: "New Comment / Note",
    description: "Delivers formatted staff comments or internal investigation notes directly to ticket followers.",
    recipientSummary: "Owner · Reporter · Watchers",
    accentColor: "violet",
  },
  {
    code: "EML_SLA_AT_RISK",
    event: "sla_at_risk",
    ruleName: RULE_EVENT.sla_at_risk,
    name: "SLA Approaching (75% Elapsed)",
    description: "Proactive warning when 75% of the resolution window has elapsed so teams can act before breach.",
    recipientSummary: "Owner · Reporting Manager",
    accentColor: "amber",
  },
  {
    code: "EML_SLA_BREACHED",
    event: "sla_breached",
    ruleName: RULE_EVENT.sla_breached,
    name: "SLA Breached",
    description: "High-priority alert sent the moment a ticket crosses its SLA resolution deadline.",
    recipientSummary: "Owner · Reporting Manager · Dept Head",
    accentColor: "rose",
  },
  {
    code: "EML_ESCALATED",
    event: "escalated",
    ruleName: RULE_EVENT.escalated,
    name: "Ticket Escalated",
    description: "Urgent escalation alert routed up the management chain with SLA context and required action steps.",
    recipientSummary: "Owner · Reporting Manager · Dept Head · Reporter",
    accentColor: "rose",
  },
  {
    code: "EML_RESOLVED",
    event: "status_resolved",
    ruleName: RULE_EVENT.status_resolved,
    name: "Ticket Resolved",
    description: "Confirms resolution details to the reporter with a one-click path to verify or reopen if needed.",
    recipientSummary: "Reporter · Owner",
    accentColor: "emerald",
  },
  {
    code: "EML_CLOSED",
    event: "status_closed",
    ruleName: RULE_EVENT.status_closed,
    name: "Ticket Closed",
    description: "Final closure confirmation archived for audit and stakeholder visibility.",
    recipientSummary: "Reporter · Owner",
    accentColor: "emerald",
  },
  {
    code: "EML_REOPENED",
    event: "status_reopened",
    ruleName: RULE_EVENT.status_reopened,
    name: "Ticket Reopened",
    description: "Alerts the owner and department head immediately when a previously resolved/closed issue recurs.",
    recipientSummary: "Owner · Dept Head · Reporter",
    accentColor: "rose",
  },
];

export function formatIst(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return (
    d.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }) + " IST"
  );
}

function cleanOrigin(appUrl?: string): string {
  return (appUrl?.trim() || "http://localhost:3000").replace(/\/+$/, "");
}

export function renderNotificationEmail(input: RenderNotificationInput): RenderedEmail {
  const { event, ticket: t, recipient, actorName, previousStatus, previousOwnerName, addedDepartmentNames, comment, override, testBadge } = input;
  const role: RecipientRole = recipient?.role ?? "owner";
  const ref = t.ticketId || t.id;
  const labelRef = `${ref}: ${t.title}`;
  const isOwner = role === "owner";
  const actor = actorName ? firstName(actorName) ?? actorName : null;
  const statusDisplay = (t.status ?? "open").replace(/_/g, " ");
  const studioDisplay = t.studioName
    ? `${t.studioName}${t.studioCity ? ` · ${t.studioCity}` : ""}`
    : t.studioCode || null;
  const deptDisplay = t.departmentName || t.departmentCode || null;
  const categoryDisplay = t.category
    ? `${t.category}${t.subcategory ? ` › ${t.subcategory}` : ""}`
    : null;
  const ownersDisplay = t.ownerNames?.length
    ? t.ownerNames.join(", ")
    : t.assigneeName || "Unassigned";
  const dueDisplay = formatIst(t.slaResolutionTarget);
  const responseDueDisplay = formatIst(t.slaResponseTarget);

  type EventSpec = {
    subject: string;
    context: string;
    accent: string;
    heading: string;
    lede: string;
    calloutBlock?: string;
    steps: string[];
    cta: string;
    why: string;
    inApp: string;
  };

  const descSnippet = t.description?.trim()
    ? t.description.trim().slice(0, 420) + (t.description.trim().length > 420 ? "…" : "")
    : null;

  const specs: Record<NotifyEvent, EventSpec> = {
    ticket_created: {
      subject: `[${ref}] New Ticket: ${t.title}`,
      context: "New Ticket",
      accent: BRAND.indigo,
      heading: isOwner ? "A new ticket is assigned to you" : "A new ticket has been logged",
      lede: `${t.title}${t.affectedClient ? ` (Member: ${t.affectedClient})` : ""} was logged${actor ? ` by ${actor}` : ""}.`,
      calloutBlock: descSnippet ? callout({ title: "Issue Summary", body: descSnippet, tone: "neutral" }) : undefined,
      steps: isOwner
        ? [
            "Review the issue details and acknowledge ownership in IRIS.",
            "Move the status to In Progress once work begins and post your initial update.",
          ]
        : [],
      cta: "Open Ticket in IRIS",
      why: "a new ticket was created in your studio or department",
      inApp: "New ticket logged",
    },
    ticket_assigned: {
      subject:
        role === "previous_owner"
          ? `[${ref}] Handed Over: ${t.title}`
          : `[${ref}] Assigned to You: ${t.title}`,
      context: "Assignment",
      accent: "#d97706",
      heading:
        role === "previous_owner"
          ? "Ticket ownership was transferred"
          : isOwner
            ? "This ticket is now assigned to you"
            : "Ticket ownership updated",
      lede:
        role === "previous_owner"
          ? `${t.title} has been reassigned${t.assigneeName ? ` to ${t.assigneeName}` : ""}${actor ? ` by ${actor}` : ""}.`
          : `${t.title} is now owned by ${isOwner ? "you" : ownersDisplay}${previousOwnerName ? ` (previously ${previousOwnerName})` : ""}.`,
      calloutBlock: descSnippet ? callout({ title: "Ticket Context", body: descSnippet, tone: "info" }) : undefined,
      steps: isOwner
        ? [
            "Review prior activity and SLA target on the ticket timeline.",
            "Send an update to the reporter or affected member as soon as you begin.",
          ]
        : [],
      cta: "Review Assignment",
      why: "you are an assigned owner or stakeholder on this ticket",
      inApp: role === "previous_owner" ? "Ticket reassigned" : "Ticket assigned to you",
    },
    owner_added: {
      subject: `[${ref}] Added as Co-Owner: ${t.title}`,
      context: "Co-Ownership",
      accent: BRAND.blue,
      heading: "You were added as a co-owner",
      lede: `${actor || "A teammate"} added co-ownership on ${t.title} so multiple specialists can collaborate.`,
      calloutBlock: descSnippet ? callout({ title: "Shared Ticket Summary", body: descSnippet, tone: "info" }) : undefined,
      steps: [
        "Coordinate with the primary owner in the ticket comments.",
        "Log your investigation steps so the audit trail stays complete.",
      ],
      cta: "Collaborate on Ticket",
      why: "you were added as an owner on this ticket",
      inApp: "Added as co-owner",
    },
    department_added: {
      subject: `[${ref}] Cross-Department Escalation: ${t.title}`,
      context: "Department Routed",
      accent: BRAND.violet,
      heading: "Your department was looped into a ticket",
      lede: `${t.title} now includes ${addedDepartmentNames?.length ? addedDepartmentNames.join(", ") : deptDisplay || "your department"} for cross-functional resolution.`,
      calloutBlock: descSnippet ? callout({ title: "Operational Context", body: descSnippet, tone: "neutral" }) : undefined,
      steps: [
        "Assign a specialist from your department if dedicated follow-up is needed.",
        "Post departmental findings directly on the ticket.",
      ],
      cta: "Inspect Ticket",
      why: "your department was added to this ticket",
      inApp: "Department added to ticket",
    },
    status_in_progress: {
      subject: `[${ref}] In Progress: ${t.title}`,
      context: "In Progress",
      accent: BRAND.blue,
      heading: "Active work has started",
      lede: `${t.title} was moved to In Progress${actor ? ` by ${actor}` : ""}.`,
      steps: [],
      cta: "View Live Progress",
      why: "you reported or follow this ticket",
      inApp: "Ticket in progress",
    },
    status_awaiting_response: {
      subject: `[${ref}] Action Needed - Awaiting Response: ${t.title}`,
      context: "Awaiting Reply",
      accent: "#d97706",
      heading: "Waiting on a response to proceed",
      lede: `${t.title} is currently awaiting additional details or confirmation${actor ? ` (updated by ${actor})` : ""}.`,
      calloutBlock: callout({
        title: "Response Requested",
        body: "Please check the latest comment on the ticket and reply with any pending confirmation, member update, or vendor details.",
        tone: "warning",
      }),
      steps: isOwner ? ["Follow up if no response arrives before the SLA window tightens."] : ["Open the ticket and post your reply so resolution can continue."],
      cta: "Reply on Ticket",
      why: "this ticket is waiting on an update",
      inApp: "Awaiting response",
    },
    status_resolved: {
      subject: `[${ref}] Resolved: ${t.title}`,
      context: "Resolved",
      accent: BRAND.green,
      heading: "This ticket has been resolved",
      lede: `${t.title} was marked resolved${actor ? ` by ${actor}` : ""}.`,
      calloutBlock: t.resolutionSummary
        ? callout({ title: "Resolution Summary", body: t.resolutionSummary, tone: "success" })
        : callout({ title: "Marked Resolved", body: "All operational steps were completed. Please verify at the studio if needed.", tone: "success" }),
      steps: role === "reporter" ? ["Verify the fix on the floor - if anything recurs, you can reopen the ticket in one click."] : [],
      cta: "Verify Resolution",
      why: "you reported or own this ticket",
      inApp: "Ticket resolved",
    },
    status_closed: {
      subject: `[${ref}] Closed: ${t.title}`,
      context: "Closed",
      accent: BRAND.green,
      heading: "Ticket closed and archived",
      lede: `${t.title} has been verified and closed${actor ? ` by ${actor}` : ""}.`,
      calloutBlock: t.resolutionSummary
        ? callout({ title: "Final Resolution Record", body: t.resolutionSummary, tone: "success" })
        : undefined,
      steps: [],
      cta: "View Archived Ticket",
      why: "you were involved in this ticket",
      inApp: "Ticket closed",
    },
    status_reopened: {
      subject: `[${ref}] Reopened: ${t.title}`,
      context: "Reopened",
      accent: BRAND.red,
      heading: "This ticket was reopened",
      lede: `${t.title} is back to ${statusDisplay}${previousStatus ? ` (was ${previousStatus.replace(/_/g, " ")})` : ""}${actor ? ` by ${actor}` : ""}.`,
      calloutBlock: callout({
        title: "Follow-up Required",
        body: "The issue was reopened because symptoms recurred or verification was incomplete. Please review the latest note immediately.",
        tone: "danger",
      }),
      steps: isOwner
        ? ["Check the reopen comment and inspect root cause.", "Confirm updated timeline with the studio or affected member."]
        : [],
      cta: "Investigate Reopened Ticket",
      why: "a ticket in your queue was reopened",
      inApp: "Ticket reopened",
    },
    comment_added: {
      subject: `[${ref}] New ${comment?.isInternal ? "Internal Note" : "Comment"}: ${t.title}`,
      context: comment?.isInternal ? "Internal Note" : "New Comment",
      accent: BRAND.violet,
      heading: `${comment?.author ? firstName(comment.author) ?? comment.author : actor || "A teammate"} posted ${comment?.isInternal ? "an internal note" : "a comment"}`,
      lede: `New update on ${t.title}:`,
      calloutBlock: quoteCard({
        author: comment?.author || actorName || "IRIS Staff",
        badgeText: comment?.isInternal ? "Internal Note" : "Comment",
        content: comment?.content
          ? comment.content.slice(0, 650) + (comment.content.length > 650 ? "…" : "")
          : "A new comment was posted on this ticket.",
      }),
      steps: [],
      cta: "Read & Reply",
      why: "you follow updates on this ticket",
      inApp: `New comment on ${ref}`,
    },
    escalated: {
      subject: `[ESCALATED · L${t.escalationLevel || 1}] ${ref} - ${t.title}`,
      context: `Escalation · Level ${t.escalationLevel || 1}`,
      accent: BRAND.red,
      heading: isOwner ? "Your ticket has been escalated" : "Urgent: Ticket escalated for intervention",
      lede: `${t.title} has been escalated${t.escalationLevel ? ` to Level ${t.escalationLevel}` : ""} and requires management attention.`,
      calloutBlock: callout({
        title: `Escalation Level ${t.escalationLevel || 1}`,
        body:
          t.escalationReason ||
          (dueDisplay
            ? `Resolution SLA target (${dueDisplay}) requires immediate leadership review and owner coordination.`
            : "Immediate leadership review and resolution plan required."),
        tone: "danger",
      }),
      steps: [
        "Confirm active ownership or reassign immediately if the current owner is blocked.",
        "Ensure the affected studio or member has received a direct status update.",
        "Record the recovery action plan on the ticket.",
      ],
      cta: "Take Action on Escalation",
      why: "this ticket was escalated in your reporting line",
      inApp: "Ticket escalated",
    },
    sla_at_risk: {
      subject: `[SLA Warning] ${ref} - Approaching Deadline: ${t.title}`,
      context: "SLA Approaching",
      accent: "#d97706",
      heading: "SLA deadline is approaching",
      lede: `${t.title} has consumed over 75% of its resolution window${dueDisplay ? ` (target: ${dueDisplay})` : ""}.`,
      calloutBlock: callout({
        title: dueDisplay ? `Resolution Target: ${dueDisplay}` : "75% of SLA Window Elapsed",
        body: "Prioritize resolution now or request a documented SLA extension if waiting on an external vendor or client.",
        tone: "warning",
      }),
      steps: isOwner
        ? ["Complete resolution or log an update with expected completion time."]
        : ["Check in with the assigned owner to remove any blockers."],
      cta: "Open Ticket Before Breach",
      why: "this ticket is approaching its SLA resolution deadline",
      inApp: "SLA approaching",
    },
    sla_breached: {
      subject: `[SLA BREACHED] ${ref} - Overdue: ${t.title}`,
      context: "SLA Breached",
      accent: BRAND.red,
      heading: "SLA resolution target has been breached",
      lede: `${t.title} passed its committed resolution target${dueDisplay ? ` (${dueDisplay})` : ""} without closure.`,
      calloutBlock: callout({
        title: dueDisplay ? `Target Passed: ${dueDisplay}` : "SLA Resolution Window Exceeded",
        body: "Automatic escalation rules apply to breached tickets. Please resolve or escalate with a recovery note immediately.",
        tone: "danger",
      }),
      steps: [
        "Post an immediate status update explaining current blocker and ETA.",
        "Notify the studio manager or affected client.",
      ],
      cta: "Resolve Breached Ticket",
      why: "a ticket in your scope breached its SLA target",
      inApp: "SLA breached",
    },
  };

  const spec = specs[event];
  const finalHeading = override?.customHeading?.trim() || spec.heading;
  const finalLede = override?.customIntro?.trim() || spec.lede;
  const finalCta = override?.ctaLabel?.trim() || spec.cta;
  const rawSubject = override?.subjectPrefix?.trim()
    ? `${override.subjectPrefix.trim()} ${spec.subject}`
    : spec.subject;
  const finalSubject = testBadge ? `[TEST] ${rawSubject}` : rawSubject;

  const url = `${cleanOrigin(input.appUrl)}/?ticket=${encodeURIComponent(t.id)}`;

  const badgesRow = [
    priorityPill(t.priority ?? "P2"),
    statusPill(t.status ?? "open"),
    slaPill(t.slaStatus ?? (event === "sla_breached" ? "breached" : event === "sla_at_risk" ? "at_risk" : null)),
  ]
    .filter(Boolean)
    .join("&nbsp;&nbsp;");

  const metadataFacts = [
    fact("Ticket ID", ref),
    fact("Studio", studioDisplay),
    fact("Department", deptDisplay),
    fact("Category", categoryDisplay),
    fact("Owner(s)", ownersDisplay),
    fact("Reported By", t.reporterName || null),
    fact("Affected Member", t.affectedClient || null),
    fact("Resolution Target", dueDisplay || responseDueDisplay),
  ].filter(Boolean);

  const stepsHtml = spec.steps.length
    ? section(
        `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${BRAND.soft};border:1px solid ${BRAND.line};border-radius:10px;">
          <tr><td style="padding:14px 18px;">
            ${label("Recommended Next Steps", BRAND.ink)}
            <ol style="margin:4px 0 0;padding-left:18px;font-family:${FONT};font-size:13.5px;line-height:1.65;color:${BRAND.body};">
              ${spec.steps.map((step) => `<li style="margin-bottom:4px;">${esc(step)}</li>`).join("")}
            </ol>
          </td></tr>
        </table>`,
        "0 34px 22px",
      )
    : "";

  const body = [
    testBadge
      ? section(
          callout({
            title: "Test Notification Preview",
            body: `Triggered manually from IRIS Email Templates for rule "${RULE_EVENT[event]}".`,
            tone: "info",
          }),
          "0 34px 18px",
        )
      : "",
    section(
      `${label(`${spec.context} · ${RULE_EVENT[event]}`, spec.accent)}
       <h1 class="e-h1" style="margin:0 0 10px;font-family:${FONT};font-size:24px;line-height:1.25;font-weight:800;color:${BRAND.ink};letter-spacing:-.015em;">${esc(finalHeading)}</h1>
       <p style="margin:0;font-family:${FONT};font-size:14.5px;line-height:1.6;color:${BRAND.body};">${esc(greeting(recipient?.name))} ${esc(finalLede)}</p>`,
      "0 34px 18px",
    ),
    badgesRow ? section(badgesRow, "0 34px 18px") : "",
    spec.calloutBlock ? section(spec.calloutBlock, "0 34px 20px") : "",
    section(grid(metadataFacts, 2, 10), "0 34px 20px"),
    stepsHtml,
    section(button(url, finalCta, spec.accent === BRAND.red ? BRAND.red : BRAND.obsidian), "4px 34px 30px"),
  ]
    .filter(Boolean)
    .join("");

  const footerExtra = override?.footerNote?.trim() ? ` ${esc(override.footerNote.trim())}` : "";
  const html = emailDocument({
    title: finalSubject,
    preheader: `${finalLede} (${ref})`.slice(0, 130),
    context: spec.context,
    ticketRef: ref,
    accent: spec.accent,
    body,
    footer: `Sent by IRIS rule <strong>${esc(RULE_EVENT[event])}</strong> because ${esc(spec.why)}.${footerExtra}`,
  });

  const textLines = [
    testBadge ? "[TEST NOTIFICATION]" : null,
    `${greeting(recipient?.name)}`,
    "",
    finalHeading,
    finalLede,
    "",
    `Ticket: ${labelRef}`,
    `Priority: ${t.priority ?? "P2"} | Status: ${statusDisplay}`,
    studioDisplay ? `Studio: ${studioDisplay}` : null,
    deptDisplay ? `Department: ${deptDisplay}` : null,
    categoryDisplay ? `Category: ${categoryDisplay}` : null,
    `Owner(s): ${ownersDisplay}`,
    t.affectedClient ? `Member: ${t.affectedClient}` : null,
    dueDisplay ? `Resolution Target: ${dueDisplay}` : null,
    comment?.content ? `\n${comment.author || "Comment"}: "${comment.content}"` : null,
    t.resolutionSummary && (event === "status_resolved" || event === "status_closed")
      ? `\nResolution: ${t.resolutionSummary}`
      : null,
    spec.steps.length ? `\nNext steps:\n${spec.steps.map((x, i) => `${i + 1}. ${x}`).join("\n")}` : null,
    "",
    `${finalCta}: ${url}`,
  ].filter((x): x is string => x !== null);

  return {
    subject: finalSubject,
    html,
    text: textLines.join("\n"),
    inAppTitle: spec.inApp,
    inAppBody: `${labelRef}${event === "comment_added" && comment ? ` - ${comment.content.slice(0, 100)}` : ""}`,
  };
}

export interface DigestRenderPayload {
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

/**
 * Email-client-safe (table-based, fully HTML-escaped) renderer for Daily & Weekly Intelligence Digests.
 */
export function renderDigestEmail(
  data: DigestRenderPayload,
  opts: { appUrl?: string; override?: EmailTemplateOverride; testBadge?: boolean } = {},
): { subject: string; html: string; text: string } {
  const isWeekly = data.period === "weekly";
  const accent = isWeekly ? BRAND.violet : BRAND.indigo;
  const baseSubject = isWeekly
    ? `IRIS Weekly Operations Digest - ${data.date} · ${data.studio}`
    : `IRIS Daily Operations Digest - ${data.date} · ${data.studio}`;
  const prefixed = opts.override?.subjectPrefix?.trim()
    ? `${opts.override.subjectPrefix.trim()} ${baseSubject}`
    : baseSubject;
  const subject = opts.testBadge ? `[TEST] ${prefixed}` : prefixed;
  const dashboardUrl = cleanOrigin(opts.appUrl);

  const kpiTile = (name: string, val: string | number, color: string) =>
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${BRAND.soft};border:1px solid ${BRAND.line};border-radius:10px;">
      <tr><td align="center" style="padding:12px 8px;">
        <div style="font-family:${FONT};font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:${BRAND.faint};">${esc(name)}</div>
        <div style="font-family:${FONT};font-size:21px;font-weight:800;line-height:1.25;color:${color};margin-top:4px;">${esc(val)}</div>
      </td></tr>
    </table>`;

  const kpiGrid = grid(
    [
      kpiTile("Open / Total", data.summary.totalTickets, BRAND.ink),
      kpiTile(isWeekly ? "New (7d)" : "New (24h)", data.summary.newTickets, BRAND.indigo),
      kpiTile("Resolved", data.summary.resolvedTickets, BRAND.green),
      kpiTile("Critical P0", data.summary.criticalOpen, data.summary.criticalOpen > 0 ? BRAND.red : BRAND.muted),
      kpiTile("Escalated", data.summary.escalatedTickets, data.summary.escalatedTickets > 0 ? "#d97706" : BRAND.muted),
      kpiTile("SLA Compliance", `${data.summary.slaCompliance}%`, data.summary.slaCompliance >= 90 ? BRAND.green : "#d97706"),
    ],
    3,
    10,
  );

  const maxIssueCount = Math.max(1, ...data.topIssues.map((i) => i.count));
  const topIssuesHtml = data.topIssues.length
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border:1px solid ${BRAND.line};border-radius:10px;overflow:hidden;">
        ${data.topIssues
          .map(
            (issue, idx) => `
          <tr style="${idx > 0 ? `border-top:1px solid ${BRAND.line};` : ""}">
            <td style="padding:11px 14px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="font-family:${FONT};font-size:13px;font-weight:600;color:${BRAND.ink};">${esc(issue.category)}</td>
                  <td align="right" style="font-family:${FONT};font-size:12px;font-weight:700;color:${BRAND.muted};">${esc(issue.count)} tickets &nbsp;${pill(issue.trend, issue.trend.startsWith("+") ? BRAND.red : BRAND.green, issue.trend.startsWith("+") ? BRAND.redSoft : BRAND.greenSoft)}</td>
                </tr>
                <tr><td colspan="2" style="padding-top:6px;">${bar(issue.count / maxIssueCount, accent)}</td></tr>
              </table>
            </td>
          </tr>`,
          )
          .join("")}
      </table>`
    : "";

  const queueHtml = data.myTickets.length
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border:1px solid ${BRAND.line};border-radius:10px;overflow:hidden;">
        ${data.myTickets
          .map(
            (t, idx) => `
          <tr style="${idx > 0 ? `border-top:1px solid ${BRAND.line};` : ""}background:#ffffff;">
            <td style="padding:11px 14px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
                <td width="96" valign="middle">${priorityPill(t.priority)}</td>
                <td valign="middle" style="padding:0 10px;">
                  <div style="font-family:${FONT};font-size:13px;font-weight:600;color:${BRAND.ink};">${esc(t.title)}</div>
                  <div style="font-family:${FONT};font-size:11px;color:${BRAND.faint};margin-top:2px;">${esc(t.id)} · ${esc(t.status)}</div>
                </td>
                <td align="right" valign="middle" style="font-family:${FONT};font-size:11.5px;font-weight:700;color:${t.dueIn.includes("overdue") ? BRAND.red : BRAND.muted};white-space:nowrap;">${esc(t.dueIn)}</td>
              </tr></table>
            </td>
          </tr>`,
          )
          .join("")}
      </table>`
    : "";

  const insightsHtml = data.insights.length
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${BRAND.violetSoft};border:1px solid #ddd6fe;border-radius:12px;">
        <tr><td style="padding:16px 18px;">
          ${label("IRIS Operational Intelligence", BRAND.violet)}
          ${data.insights
            .map(
              (ins) => `
            <div style="background:#ffffff;border:1px solid #e9d5ff;border-radius:8px;padding:10px 12px;margin-top:8px;">
              <div style="font-family:${FONT};font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:${BRAND.violet};">${esc(ins.type)} · ${esc(ins.confidence)}% confidence</div>
              <div style="font-family:${FONT};font-size:13px;line-height:1.5;color:${BRAND.body};margin-top:3px;">${esc(ins.text)}</div>
            </div>`,
            )
            .join("")}
          ${
            data.recommendations.length
              ? `<div style="margin-top:12px;padding-top:10px;border-top:1px solid #ddd6fe;">
                  <div style="font-family:${FONT};font-size:11px;font-weight:700;color:${BRAND.ink};margin-bottom:4px;">Recommended Focus Areas:</div>
                  <ul style="margin:0;padding-left:18px;font-family:${FONT};font-size:12.5px;line-height:1.6;color:${BRAND.body};">
                    ${data.recommendations.map((rec) => `<li>${esc(rec)}</li>`).join("")}
                  </ul>
                </div>`
              : ""
          }
        </td></tr>
      </table>`
    : "";

  const heading =
    opts.override?.customHeading?.trim() ||
    (isWeekly ? "Weekly Studio Intelligence Summary" : "Morning Operations Briefing");
  const intro =
    opts.override?.customIntro?.trim() ||
    `Here is your ${isWeekly ? "7-day" : "24-hour"} operational snapshot for ${data.studio} (${data.date}). Average resolution time stands at ${data.summary.avgResolutionTime}.`;

  const body = [
    opts.testBadge
      ? section(
          callout({
            title: "Test Digest Delivery",
            body: "Generated from live IRIS workspace metrics and dispatched on demand.",
            tone: "info",
          }),
          "0 34px 18px",
        )
      : "",
    section(
      `${label(`${isWeekly ? "Weekly Digest" : "Daily Digest"} · ${data.studio}`, accent)}
       <h1 class="e-h1" style="margin:0 0 10px;font-family:${FONT};font-size:24px;line-height:1.25;font-weight:800;color:${BRAND.ink};">${esc(heading)}</h1>
       <p style="margin:0;font-family:${FONT};font-size:14.5px;line-height:1.6;color:${BRAND.body};">${esc(greeting(data.recipientName))} ${esc(intro)}</p>`,
      "0 34px 20px",
    ),
    section(`${label("Key Metrics")}${kpiGrid}`, "0 34px 18px"),
    topIssuesHtml ? section(`${label("Top Issue Categories")}${topIssuesHtml}`, "0 34px 20px") : "",
    queueHtml ? section(`${label(`Active Queue (${data.myTickets.length})`)}${queueHtml}`, "0 34px 20px") : "",
    insightsHtml ? section(insightsHtml, "0 34px 22px") : "",
    section(button(dashboardUrl, opts.override?.ctaLabel?.trim() || "Open IRIS Workspace", BRAND.obsidian), "0 34px 30px"),
  ]
    .filter(Boolean)
    .join("");

  const html = emailDocument({
    title: subject,
    preheader: `${data.summary.newTickets} new, ${data.summary.resolvedTickets} resolved, ${data.summary.slaCompliance}% SLA compliance at ${data.studio}`,
    context: isWeekly ? "Weekly Digest" : "Daily Digest",
    ticketRef: data.studio,
    accent,
    body,
    footer: `Scheduled IRIS ${isWeekly ? "weekly" : "daily"} operational briefing for <strong>${esc(data.studio)}</strong>. Manage digest schedules in IRIS &rarr; Emails.`,
  });

  const text = [
    `${greeting(data.recipientName)}`,
    "",
    `${heading} - ${data.studio} (${data.date})`,
    intro,
    "",
    `Total: ${data.summary.totalTickets} | New: ${data.summary.newTickets} | Resolved: ${data.summary.resolvedTickets} | Critical Open: ${data.summary.criticalOpen} | Escalated: ${data.summary.escalatedTickets} | SLA: ${data.summary.slaCompliance}%`,
    data.topIssues.length
      ? `\nTop Categories:\n${data.topIssues.map((i) => `- ${i.category}: ${i.count} (${i.trend})`).join("\n")}`
      : "",
    data.myTickets.length
      ? `\nYour Active Queue:\n${data.myTickets.map((t) => `- [${t.priority}] ${t.id}: ${t.title} (${t.dueIn})`).join("\n")}`
      : "",
    data.recommendations.length
      ? `\nRecommendations:\n${data.recommendations.map((r, idx) => `${idx + 1}. ${r}`).join("\n")}`
      : "",
    "",
    `Open IRIS Workspace: ${dashboardUrl}`,
  ]
    .filter(Boolean)
    .join("\n");

  return { subject, html, text };
}

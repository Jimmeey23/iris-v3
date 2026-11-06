// IRIS — Email Templates for Ticket Lifecycle Notifications

export interface EmailTemplateItem {
  code: string;
  name: string;
  trigger: string;
  description: string;
  subject: string;
  preview: string;
  bodyHtml: string;
  recipientType: "assignee" | "reporter" | "client" | "escalation_manager" | "all_stakeholders";
}

const baseStyle = `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08); border: 1px solid #e8e8ed;">
    <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 28px 32px;">
      <div style="display: flex; align-items: center; gap: 12px;">
        <div style="width: 36px; height: 36px; background: rgba(255,255,255,0.15); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 700; color: white; font-size: 18px; letter-spacing: -0.5px;">IR</div>
        <div>
          <div style="color: white; font-weight: 600; font-size: 16px; letter-spacing: -0.3px;">IRIS</div>
          <div style="color: rgba(255,255,255,0.75); font-size: 11px; font-weight: 500;">Issue Resolution & Intelligence System</div>
        </div>
      </div>
    </div>
    <div style="padding: 32px;">
`;

const footerStyle = `
    </div>
    <div style="padding: 20px 32px; background: #f9fafb; border-top: 1px solid #f0f0f3;">
      <div style="color: #6b7280; font-size: 11px; line-height: 1.6;">
        <div style="margin-bottom: 8px;">This is an automated notification from IRIS — Issue Resolution & Intelligence System.</div>
        <div>Physique 57 India · Mumbai & Bengaluru Studios</div>
        <div style="margin-top: 8px;">Need help? Contact <a href="mailto:iris-support@physique57.in" style="color: #6366f1; text-decoration: none;">iris-support@physique57.in</a></div>
      </div>
    </div>
  </div>
`;

export const EMAIL_TEMPLATES: EmailTemplateItem[] = [
  {
    code: "EML_NEW_TICKET",
    name: "New Ticket Created",
    trigger: "ticket_created",
    description: "Sent to the assigned employee when a new ticket is created and assigned.",
    subject: "[{{ticketId}}] New Ticket Assigned: {{ticketTitle}}",
    preview: "You've been assigned a new ticket. Priority: {{priority}}",
    recipientType: "assignee",
    bodyHtml: `${baseStyle}
      <div style="color: #111827; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
        Hi <strong>{{assigneeName}}</strong>,
      </div>
      <div style="color: #374151; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
        A new ticket has been assigned to you. Please review and acknowledge at your earliest convenience.
      </div>
      <div style="background: #f3f4f6; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
          <span style="display: inline-block; padding: 2px 8px; background: {{priorityColor}}; color: white; font-size: 11px; font-weight: 600; border-radius: 4px; letter-spacing: 0.5px;">{{priority}}</span>
          <span style="color: #6b7280; font-size: 12px; font-family: monospace;">{{ticketId}}</span>
        </div>
        <div style="color: #111827; font-weight: 600; font-size: 16px; line-height: 1.4; margin-bottom: 12px;">{{ticketTitle}}</div>
        <div style="color: #4b5563; font-size: 13px; line-height: 1.6;">{{ticketDescription}}</div>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 24px;">
        <div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px;">
          <div style="color: #6b7280; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Studio</div>
          <div style="color: #111827; font-size: 14px; font-weight: 500;">{{studioName}}</div>
        </div>
        <div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px;">
          <div style="color: #6b7280; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Department</div>
          <div style="color: #111827; font-size: 14px; font-weight: 500;">{{departmentName}}</div>
        </div>
        <div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px;">
          <div style="color: #6b7280; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Reported by</div>
          <div style="color: #111827; font-size: 14px; font-weight: 500;">{{reporterName}}</div>
        </div>
        <div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px;">
          <div style="color: #6b7280; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Response Due</div>
          <div style="color: #111827; font-size: 14px; font-weight: 500;">{{responseDue}}</div>
        </div>
      </div>
      <a href="{{ticketUrl}}" style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500; font-size: 14px;">View Ticket &rarr;</a>
      ${footerStyle}`,
  },
  {
    code: "EML_ESCALATION",
    name: "Ticket Escalated",
    trigger: "escalation",
    description: "Sent to escalation managers when a ticket is escalated.",
    subject: "[ESCALATED] {{ticketId}} — {{ticketTitle}}",
    preview: "A ticket has been escalated to you. Immediate attention required.",
    recipientType: "escalation_manager",
    bodyHtml: `${baseStyle}
      <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin-bottom: 24px; display: flex; align-items: flex-start; gap: 12px;">
        <div style="color: #dc2626; font-size: 20px;">&#9888;</div>
        <div>
          <div style="color: #991b1b; font-weight: 600; font-size: 14px; margin-bottom: 4px;">Ticket Escalated</div>
          <div style="color: #7f1d1d; font-size: 13px; line-height: 1.5;">This ticket has been escalated due to SLA risk/breach and requires your immediate attention.</div>
        </div>
      </div>
      <div style="color: #111827; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
        Hi <strong>{{managerName}}</strong>,
      </div>
      <div style="color: #374151; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
        The following ticket has been escalated to you:
      </div>
      <div style="background: #f3f4f6; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
        <div style="color: #111827; font-weight: 600; font-size: 16px; line-height: 1.4; margin-bottom: 8px;">{{ticketTitle}}</div>
        <div style="color: #6b7280; font-size: 12px; font-family: monospace; margin-bottom: 12px;">{{ticketId}}</div>
        <div style="color: #4b5563; font-size: 13px; line-height: 1.6;">{{escalationReason}}</div>
      </div>
      <a href="{{ticketUrl}}" style="display: inline-block; background: #dc2626; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500; font-size: 14px;">Review Escalation &rarr;</a>
      ${footerStyle}`,
  },
  {
    code: "EML_ASSIGNMENT",
    name: "Ticket Reassigned",
    trigger: "assignment",
    description: "Sent when a ticket is reassigned to a different employee.",
    subject: "[{{ticketId}}] Ticket Reassigned to You",
    preview: "A ticket has been reassigned to you.",
    recipientType: "assignee",
    bodyHtml: `${baseStyle}
      <div style="color: #111827; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
        Hi <strong>{{newAssigneeName}}</strong>,
      </div>
      <div style="color: #374151; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
        The following ticket has been reassigned to you from <strong>{{previousAssigneeName}}</strong>.
      </div>
      <div style="background: #f3f4f6; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
        <div style="color: #111827; font-weight: 600; font-size: 16px; line-height: 1.4; margin-bottom: 8px;">{{ticketTitle}}</div>
        <div style="color: #6b7280; font-size: 12px; font-family: monospace; margin-bottom: 12px;">{{ticketId}}</div>
        <div style="color: #4b5563; font-size: 13px; line-height: 1.6;">{{reassignmentReason}}</div>
      </div>
      <a href="{{ticketUrl}}" style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500; font-size: 14px;">View Ticket &rarr;</a>
      ${footerStyle}`,
  },
  {
    code: "EML_DUE_3H",
    name: "Due in 3 Hours",
    trigger: "due_3h",
    description: "Reminder sent 3 hours before ticket resolution deadline.",
    subject: "[REMINDER] {{ticketId}} — Resolution due in 3 hours",
    preview: "This ticket is due in 3 hours. Please take action if needed.",
    recipientType: "assignee",
    bodyHtml: `${baseStyle}
      <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 16px; margin-bottom: 24px; display: flex; align-items: flex-start; gap: 12px;">
        <div style="color: #d97706; font-size: 20px;">&#9200;</div>
        <div>
          <div style="color: #92400e; font-weight: 600; font-size: 14px; margin-bottom: 4px;">Resolution Due in 3 Hours</div>
          <div style="color: #78350f; font-size: 13px; line-height: 1.5;">This ticket is approaching its resolution deadline. Please take action if needed.</div>
        </div>
      </div>
      <div style="color: #111827; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
        Hi <strong>{{assigneeName}}</strong>,
      </div>
      <div style="background: #f3f4f6; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
        <div style="color: #111827; font-weight: 600; font-size: 16px; line-height: 1.4; margin-bottom: 8px;">{{ticketTitle}}</div>
        <div style="color: #6b7280; font-size: 12px; font-family: monospace; margin-bottom: 8px;">{{ticketId}}</div>
        <div style="color: #4b5563; font-size: 13px; line-height: 1.6;">Current status: <strong>{{ticketStatus}}</strong></div>
      </div>
      <a href="{{ticketUrl}}" style="display: inline-block; background: #d97706; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500; font-size: 14px;">Update Ticket &rarr;</a>
      ${footerStyle}`,
  },
  {
    code: "EML_DUE_TODAY",
    name: "Due Today",
    trigger: "due_today",
    description: "Reminder sent on the day ticket resolution is due.",
    subject: "[DUE TODAY] {{ticketId}} — {{ticketTitle}}",
    preview: "This ticket is due for resolution today.",
    recipientType: "assignee",
    bodyHtml: `${baseStyle}
      <div style="background: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; padding: 16px; margin-bottom: 24px; display: flex; align-items: flex-start; gap: 12px;">
        <div style="color: #ea580c; font-size: 20px;">&#128197;</div>
        <div>
          <div style="color: #9a3412; font-weight: 600; font-size: 14px; margin-bottom: 4px;">Due for Resolution Today</div>
          <div style="color: #7c2d12; font-size: 13px; line-height: 1.5;">This ticket is scheduled for resolution today. Please ensure timely completion.</div>
        </div>
      </div>
      <div style="color: #111827; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
        Hi <strong>{{assigneeName}}</strong>,
      </div>
      <div style="background: #f3f4f6; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
        <div style="color: #111827; font-weight: 600; font-size: 16px; line-height: 1.4; margin-bottom: 8px;">{{ticketTitle}}</div>
        <div style="color: #6b7280; font-size: 12px; font-family: monospace; margin-bottom: 8px;">{{ticketId}}</div>
        <div style="color: #4b5563; font-size: 13px; line-height: 1.6;">Resolution deadline: <strong>{{resolutionDeadline}}</strong></div>
      </div>
      <a href="{{ticketUrl}}" style="display: inline-block; background: #ea580c; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500; font-size: 14px;">Resolve Ticket &rarr;</a>
      ${footerStyle}`,
  },
  {
    code: "EML_PAST_DUE_3H",
    name: "3 Hours Past Due",
    trigger: "past_due_3h",
    description: "Alert sent 3 hours after ticket resolution deadline has passed.",
    subject: "[OVERDUE] {{ticketId}} — Resolution 3 hours past due",
    preview: "This ticket is now 3 hours past its resolution deadline.",
    recipientType: "all_stakeholders",
    bodyHtml: `${baseStyle}
      <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin-bottom: 24px; display: flex; align-items: flex-start; gap: 12px;">
        <div style="color: #dc2626; font-size: 20px;">&#10071;</div>
        <div>
          <div style="color: #991b1b; font-weight: 600; font-size: 14px; margin-bottom: 4px;">3 Hours Past Resolution Deadline</div>
          <div style="color: #7f1d1d; font-size: 13px; line-height: 1.5;">This ticket has now breached its resolution SLA by 3 hours. Escalation may be triggered if not resolved.</div>
        </div>
      </div>
      <div style="color: #111827; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
        Hi <strong>{{assigneeName}}</strong>,
      </div>
      <div style="background: #f3f4f6; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
        <div style="color: #111827; font-weight: 600; font-size: 16px; line-height: 1.4; margin-bottom: 8px;">{{ticketTitle}}</div>
        <div style="color: #6b7280; font-size: 12px; font-family: monospace; margin-bottom: 8px;">{{ticketId}}</div>
        <div style="color: #4b5563; font-size: 13px; line-height: 1.6;">Original deadline: <strong>{{resolutionDeadline}}</strong></div>
      </div>
      <a href="{{ticketUrl}}" style="display: inline-block; background: #dc2626; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500; font-size: 14px;">Take Action Now &rarr;</a>
      ${footerStyle}`,
  },
  {
    code: "EML_RESOLVED",
    name: "Ticket Resolved",
    trigger: "resolved",
    description: "Sent to reporter and stakeholders when a ticket is resolved.",
    subject: "[RESOLVED] {{ticketId}} — {{ticketTitle}}",
    preview: "Your ticket has been resolved. Please confirm.",
    recipientType: "reporter",
    bodyHtml: `${baseStyle}
      <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 16px; margin-bottom: 24px; display: flex; align-items: flex-start; gap: 12px;">
        <div style="color: #059669; font-size: 20px;">&#10003;</div>
        <div>
          <div style="color: #065f46; font-weight: 600; font-size: 14px; margin-bottom: 4px;">Ticket Resolved</div>
          <div style="color: #064e3b; font-size: 13px; line-height: 1.5;">Your ticket has been marked as resolved. Please review and confirm closure.</div>
        </div>
      </div>
      <div style="color: #111827; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
        Hi <strong>{{reporterName}}</strong>,
      </div>
      <div style="color: #374151; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
        The ticket you reported has been resolved by <strong>{{assigneeName}}</strong>.
      </div>
      <div style="background: #f3f4f6; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
        <div style="color: #111827; font-weight: 600; font-size: 16px; line-height: 1.4; margin-bottom: 12px;">{{ticketTitle}}</div>
        <div style="color: #6b7280; font-size: 12px; font-family: monospace; margin-bottom: 12px;">{{ticketId}}</div>
        <div style="color: #4b5563; font-size: 13px; line-height: 1.6;">
          <div style="font-weight: 600; margin-bottom: 4px;">Resolution Summary</div>
          {{resolutionSummary}}
        </div>
      </div>
      <a href="{{ticketUrl}}" style="display: inline-block; background: #059669; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500; font-size: 14px;">Review & Confirm &rarr;</a>
      ${footerStyle}`,
  },
  {
    code: "EML_REOPENED",
    name: "Ticket Reopened",
    trigger: "reopened",
    description: "Sent to assignee when a ticket is reopened by reporter.",
    subject: "[REOPENED] {{ticketId}} — {{ticketTitle}}",
    preview: "A ticket has been reopened by the reporter.",
    recipientType: "assignee",
    bodyHtml: `${baseStyle}
      <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 16px; margin-bottom: 24px; display: flex; align-items: flex-start; gap: 12px;">
        <div style="color: #2563eb; font-size: 20px;">&#8634;</div>
        <div>
          <div style="color: #1e40af; font-weight: 600; font-size: 14px; margin-bottom: 4px;">Ticket Reopened</div>
          <div style="color: #1e3a8a; font-size: 13px; line-height: 1.5;">The reporter has reopened this ticket. Please review and take appropriate action.</div>
        </div>
      </div>
      <div style="color: #111827; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
        Hi <strong>{{assigneeName}}</strong>,
      </div>
      <div style="background: #f3f4f6; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
        <div style="color: #111827; font-weight: 600; font-size: 16px; line-height: 1.4; margin-bottom: 8px;">{{ticketTitle}}</div>
        <div style="color: #6b7280; font-size: 12px; font-family: monospace; margin-bottom: 12px;">{{ticketId}}</div>
        <div style="color: #4b5563; font-size: 13px; line-height: 1.6;">
          <div style="font-weight: 600; margin-bottom: 4px;">Reopen Reason</div>
          {{reopenReason}}
        </div>
      </div>
      <a href="{{ticketUrl}}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500; font-size: 14px;">View Ticket &rarr;</a>
      ${footerStyle}`,
  },
];

export const EMAIL_TRIGGERS = [
  { code: "ticket_created", label: "New Ticket Created", description: "When a ticket is created and assigned" },
  { code: "escalation", label: "Ticket Escalated", description: "When a ticket is escalated" },
  { code: "assignment", label: "Ticket Reassigned", description: "When a ticket is reassigned" },
  { code: "due_3h", label: "3 Hours Before Due", description: "3 hours before resolution deadline" },
  { code: "due_today", label: "Due Today", description: "On the day resolution is due" },
  { code: "past_due_3h", label: "3 Hours Past Due", description: "3 hours after resolution deadline" },
  { code: "resolved", label: "Ticket Resolved", description: "When a ticket is marked resolved" },
  { code: "reopened", label: "Ticket Reopened", description: "When a ticket is reopened" },
];

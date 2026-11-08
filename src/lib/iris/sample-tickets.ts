// IRIS - ticket model + the live ticket list.
//
// ALL_TICKETS starts empty and is filled from Neon (GET /api/tickets) by
// <AuthGate> before any screen renders. It is mutated in place so every module
// that imported it sees the live data. Use the helpers in ./live-data to change it.

import { EMPLOYEE_MAP, DEPT_MAP, STUDIO_MAP, Priority, TicketStatus, SLAStatus } from "./types";

export interface Ticket {
  id: string;
  ticketId: string;
  title: string;
  description: string;
  category: string;
  subcategory?: string;
  priority: Priority;
  status: TicketStatus;
  studioCode?: string;
  departmentCode?: string;
  assigneeId?: string;
  /** Full owner / department sets (primary included). */
  assigneeIds?: string[];
  departmentCodes?: string[];
  reporterId: string;
  affectedClient?: string;
  clientMomenceId?: string;
  membershipId?: string;
  bookingId?: string;
  equipment?: string;
  businessImpact?: string;
  operationalImpact?: string;
  severity?: string;
  resolution?: string;
  resolutionSummary?: string;
  investigationNotes?: string;
  recommendedResolution?: string;
  attachments?: string[];
  relatedTickets?: string[];
  tags?: string[];
  slaStatus: SLAStatus;
  slaResponseTarget?: Date;
  slaResolutionTarget?: Date;
  firstResponseAt?: Date;
  resolvedAt?: Date;
  escalationLevel: number;
  source: string;
  createdAt: string;
  updatedAt: string;
  /** Imported from the legacy system: closed, read-only, SLA-exempt. */
  legacy?: boolean;
  assignmentLocked?: boolean;
  requiresAcknowledgment?: boolean;
  acknowledgedAt?: string;
  routedByRule?: string;
  collectedInfo?: Record<string, unknown>;
  activities: { type: string; description: string; actor?: string; timestamp: string }[];
  comments: { id?: string; author: string; content: string; isInternal: boolean; timestamp: string }[];
}

export const ALL_TICKETS: Ticket[] = [];

export function getAssignee(ticket: Ticket) {
  return ticket.assigneeId ? EMPLOYEE_MAP[ticket.assigneeId] ?? null : null;
}
/** All owners (primary first). */
export function getAssignees(ticket: Ticket) {
  const ids = ticket.assigneeIds?.length ? ticket.assigneeIds : ticket.assigneeId ? [ticket.assigneeId] : [];
  return ids.map((id) => EMPLOYEE_MAP[id]).filter(Boolean);
}
/** True if the employee is the primary or a secondary owner. */
export function isOwner(ticket: Ticket, employeeId: string) {
  return ticket.assigneeId === employeeId || !!ticket.assigneeIds?.includes(employeeId);
}
export function isMine(ticket: Ticket, employeeId: string) {
  return isOwner(ticket, employeeId) || ticket.reporterId === employeeId;
}
export function getReporter(ticket: Ticket) {
  return EMPLOYEE_MAP[ticket.reporterId];
}
export function getDepartment(ticket: Ticket) {
  return ticket.departmentCode ? DEPT_MAP[ticket.departmentCode] ?? null : null;
}
export function getStudio(ticket: Ticket) {
  return ticket.studioCode ? STUDIO_MAP[ticket.studioCode] ?? null : null;
}

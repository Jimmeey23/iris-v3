import "server-only";
import type { PoolClient } from "pg";

/** Select tickets with their comments and activities, shaped for the client `Ticket` type. */
export const TICKET_SELECT = `
  select t.*,
    coalesce((select json_agg(json_build_object(
        'type', a.activity_type, 'description', a.description,
        'actor', a.actor_name, 'timestamp', a.created_at) order by a.created_at)
      from ticket_activities a where a.ticket_id = t.id), '[]') as activities_json,
    coalesce((select json_agg(json_build_object(
        'id', c.id, 'author', c.author_name, 'content', c.content,
        'isInternal', c.is_internal, 'timestamp', c.created_at) order by c.created_at)
      from ticket_comments c where c.ticket_id = t.id), '[]') as comments_json
  from tickets t`;

const iso = (d: Date | string | null) => (d ? new Date(d).toISOString() : undefined);

export function toClientTicket(r: Record<string, any>) {
  return {
    id: r.id,
    ticketId: r.ticket_id,
    title: r.title,
    description: r.description,
    category: r.category,
    subcategory: r.subcategory ?? undefined,
    priority: r.priority,
    status: r.status,
    studioCode: r.studio_code ?? undefined,
    departmentCode: r.department_code ?? undefined,
    assigneeId: r.assignee_id ?? undefined,
    reporterId: r.reporter_id ?? "",
    affectedClient: r.affected_client ?? undefined,
    clientMomenceId: r.client_momence_id ?? undefined,
    membershipId: r.membership_id ?? undefined,
    bookingId: r.booking_id ?? undefined,
    equipment: r.equipment ?? undefined,
    businessImpact: r.business_impact ?? undefined,
    operationalImpact: r.operational_impact ?? undefined,
    severity: r.severity ?? undefined,
    resolution: r.resolution ?? undefined,
    resolutionSummary: r.resolution_summary ?? undefined,
    investigationNotes: r.investigation_notes ?? undefined,
    recommendedResolution: r.recommended_resolution ?? undefined,
    attachments: r.attachments ?? [],
    relatedTickets: r.related_ticket_ids ?? [],
    tags: r.tags ?? [],
    slaStatus: r.sla_status,
    slaResponseTarget: iso(r.sla_response_target),
    slaResolutionTarget: iso(r.sla_resolution_target),
    firstResponseAt: iso(r.first_response_at),
    resolvedAt: iso(r.resolved_at),
    escalationLevel: r.escalation_level,
    source: r.source,
    createdAt: iso(r.created_at)!,
    updatedAt: iso(r.updated_at)!,
    legacy: Boolean(r.metadata?.legacy_import),
    assignmentLocked: Boolean(r.metadata?.lock_assignment),
    activities: r.activities_json ?? [],
    comments: r.comments_json ?? [],
  };
}

export async function fetchTicket(c: PoolClient, id: string) {
  const { rows } = await c.query(`${TICKET_SELECT} where t.id = $1`, [id]);
  return rows[0] ? toClientTicket(rows[0]) : null;
}

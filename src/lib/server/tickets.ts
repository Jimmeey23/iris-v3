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

/**
 * List query: tickets only. Activities and comments are attached afterwards in
 * one batched query (see attachThreads) — correlated subqueries re-ran the RLS
 * access check for every activity row and took 15s+ for ~800 tickets.
 */
// The list drops search_vector and the raw imported CSV row (metadata.legacy):
// together ~70% of the bytes, and the client never reads them.
export const TICKET_LIST_SELECT = `select t.id, t.ticket_id, t.title, t.description, t.category, t.subcategory, t.priority, t.status, t.studio_code, t.department_code, t.assignee_id, t.reporter_id, t.affected_client, t.client_momence_id, t.membership_id, t.booking_id, t.equipment, t.business_impact, t.operational_impact, t.severity, t.resolution, t.resolution_summary, t.investigation_notes, t.recommended_resolution, t.attachments, t.related_ticket_ids, t.tags, t.sla_status, t.sla_response_target, t.sla_resolution_target, t.first_response_at, t.resolved_at, t.escalation_level, t.source, t.conversation_id, t.collected_info, t.created_by_user_id, t.created_at, t.updated_at, t.department_codes, t.assignee_ids,
    jsonb_build_object('legacy_import', t.metadata->'legacy_import', 'lock_assignment', t.metadata->'lock_assignment') as metadata,
    '[]'::json as activities_json, '[]'::json as comments_json
  from tickets t`;

/** Attach activities/comments for tickets the caller already proved access to. */
export async function attachThreads(c: PoolClient, rows: Record<string, any>[]) {
  if (!rows.length) return rows;
  const ids = rows.map((r) => r.id);
  const [acts, coms] = await Promise.all([
    c.query(
      `select ticket_id, json_agg(json_build_object('type', activity_type, 'description', description,
         'actor', actor_name, 'timestamp', created_at) order by created_at) j
       from iris.ticket_activities where ticket_id = any($1) group by ticket_id`, [ids]),
    c.query(
      `select ticket_id, json_agg(json_build_object('id', id, 'author', author_name, 'content', content,
         'isInternal', is_internal, 'timestamp', created_at) order by created_at) j
       from iris.ticket_comments where ticket_id = any($1) group by ticket_id`, [ids]),
  ]);
  const a = new Map(acts.rows.map((r) => [r.ticket_id, r.j]));
  const m = new Map(coms.rows.map((r) => [r.ticket_id, r.j]));
  for (const r of rows) {
    r.activities_json = a.get(r.id) ?? [];
    r.comments_json = m.get(r.id) ?? [];
  }
  return rows;
}

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
    departmentCodes: r.department_codes?.length ? r.department_codes : r.department_code ? [r.department_code] : [],
    assigneeIds: r.assignee_ids?.length ? r.assignee_ids : r.assignee_id ? [r.assignee_id] : [],
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

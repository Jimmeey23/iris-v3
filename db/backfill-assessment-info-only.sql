-- Optional backfill: turn existing trainer-assessment tickets into information-only tickets
-- (closed, unassigned, tagged info-only). New assessments are filed this way by the app.
update iris.tickets
   set status = 'closed',
       assignee_id = null,
       assignee_ids = '{}',
       tags = case when 'info-only' = any(tags) then tags else array_append(tags, 'info-only') end,
       resolution_summary = coalesce(nullif(resolution_summary, ''), 'For information only. Shared with the Training department admins; no action tracked in IRIS.'),
       resolved_at = coalesce(resolved_at, now())
 where 'trainer-assessment' = any(tags);

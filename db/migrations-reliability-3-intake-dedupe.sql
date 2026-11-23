-- Inbound email intake: one webhook_events row per (provider, message_id).
-- Makes claimMessage() atomic (insert .. on conflict) so concurrent redeliveries cannot file
-- duplicate tickets. Idempotent and re-runnable.

-- Existing duplicates would block the unique index: keep the best row per message (processed
-- first, then ticketed, then newest) and move the others' message_id aside.
with ranked as (
  select id,
         row_number() over (
           partition by provider, payload->>'message_id'
           order by (status = 'processed') desc, (ticket_id is not null) desc, received_at desc, id
         ) as rn
    from iris.webhook_events
   where payload->>'message_id' is not null
)
update iris.webhook_events w
   set payload = (w.payload - 'message_id') || jsonb_build_object('duplicate_message_id', w.payload->'message_id')
  from ranked r
 where r.id = w.id and r.rn > 1;

create unique index if not exists uq_webhook_events_provider_message
  on iris.webhook_events (provider, (payload->>'message_id'))
  where payload->>'message_id' is not null;

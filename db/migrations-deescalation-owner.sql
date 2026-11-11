-- ============================================================================
-- De-escalating a ticket hands it back to the owner it had before that level.
--
-- Escalation (SLA sweep or by hand) can reassign the ticket to a manager or
-- department head. Lowering escalation_level used to leave that person as the
-- owner. Now, on every ticket update:
--   * level goes UP   -> the owner before each new level is remembered in
--                        collected_info._escalation_owners {"1": "emp_x", ...}
--   * level goes DOWN -> the owner remembered for the level being left is
--                        restored, unless the same update names a new owner or
--                        that person is no longer active.
-- Runs before trg_normalize_multi (name order), so assignee_ids follows: the
-- escalated owner is dropped and the original owner put back.
-- Re-runnable.
-- ============================================================================

create or replace function iris.escalation_owner_memory()
returns trigger language plpgsql security definer set search_path = iris, public as $$
declare
  v_owners jsonb := coalesce(new.collected_info -> '_escalation_owners', '{}'::jsonb);
  v_target text;
  l int;
begin
  if current_setting('iris.seeding', true) = 'on' then return new; end if;
  if new.escalation_level is not distinct from old.escalation_level then return new; end if;

  if new.escalation_level > old.escalation_level then
    for l in (old.escalation_level + 1) .. new.escalation_level loop
      if not v_owners ? l::text and old.assignee_id is not null then
        v_owners := v_owners || jsonb_build_object(l::text, old.assignee_id);
      end if;
    end loop;
  else
    -- Owner before the lowest level being left, i.e. the owner at the new level.
    v_target := v_owners ->> (new.escalation_level + 1)::text;
    if v_target is not null
       and new.assignee_id is not distinct from old.assignee_id
       and exists (select 1 from iris.employees e where e.id = v_target and e.is_active) then
      new.assignee_id := v_target;
    end if;
    for l in (new.escalation_level + 1) .. old.escalation_level loop
      v_owners := v_owners - l::text;
    end loop;
  end if;

  new.collected_info := coalesce(new.collected_info, '{}'::jsonb)
    || jsonb_build_object('_escalation_owners', v_owners);
  return new;
end $$;

drop trigger if exists trg_escalation_owner on iris.tickets;
create trigger trg_escalation_owner
  before update of escalation_level on iris.tickets
  for each row execute function iris.escalation_owner_memory();

-- ---------------------------------------------------------------------------
-- Backfill: tickets escalated before this existed. The owner before each level
-- comes from the audit log row where the level first reached it.
-- ---------------------------------------------------------------------------
with steps as (
  select t.id, l.lvl,
         (select a.before_state ->> 'assignee_id'
            from iris.audit_log a
           where a.entity_type = 'tickets' and a.entity_id = t.ticket_id and a.action = 'update'
             and coalesce((a.before_state ->> 'escalation_level')::int, 0) < l.lvl
             and coalesce((a.after_state  ->> 'escalation_level')::int, 0) >= l.lvl
           order by a.created_at desc
           limit 1) as owner
    from iris.tickets t
    cross join lateral generate_series(1, t.escalation_level) as l(lvl)
   where t.escalation_level > 0
     and not coalesce(t.collected_info, '{}'::jsonb) ? '_escalation_owners'
),
agg as (
  select id, jsonb_object_agg(lvl::text, owner) filter (where owner is not null) as owners
    from steps group by id
)
update iris.tickets t
   set collected_info = coalesce(t.collected_info, '{}'::jsonb)
                        || jsonb_build_object('_escalation_owners', coalesce(agg.owners, '{}'::jsonb))
  from agg
 where t.id = agg.id;

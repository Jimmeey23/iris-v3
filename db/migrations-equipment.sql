-- ============================================================================
-- Equipment register: every bike, microphone and AC system per studio, with its
-- fault history, so "Bike #8 has failed 3 times this quarter" is visible and a
-- replacement can be decided on.
--
--   iris.equipment          the register (auto-filled from tickets, editable)
--   iris.equipment_tickets  which fault tickets concern which item
--
-- Links live in their own table so ticket rows are never rewritten (no
-- updated_at churn, no audit noise). A trigger links new and edited tickets;
-- the backfill at the bottom links history. Recurrence-check tickets are not
-- faults and are not linked; their outcomes are read from recurrence_checks.
-- Re-runnable.
-- ============================================================================

create table if not exists iris.equipment (
  id           uuid primary key default gen_random_uuid(),
  studio_code  text not null references iris.studios(code) on update cascade on delete cascade,
  kind         text not null check (kind in ('bike','mic','ac')),
  number       int,                                   -- null for un-numbered items (AC, "a mic")
  label        text not null,
  model        text,
  serial       text,
  status       text not null default 'in_service' check (status in ('in_service','out_of_service','retired')),
  notes        text,
  auto_created boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
-- One row per (studio, kind, number); un-numbered items share a single row per studio and kind.
create unique index if not exists equipment_identity_key
  on iris.equipment (studio_code, kind, coalesce(number, -1));

create table if not exists iris.equipment_tickets (
  equipment_id uuid not null references iris.equipment(id) on delete cascade,
  ticket_id    text not null references iris.tickets(id) on delete cascade,
  linked_at    timestamptz not null default now(),
  primary key (ticket_id)
);
create index if not exists equipment_tickets_equipment_idx on iris.equipment_tickets (equipment_id);

alter table iris.equipment enable row level security;
alter table iris.equipment_tickets enable row level security;
drop policy if exists p_read on iris.equipment;
create policy p_read on iris.equipment for select
  using (iris.is_manager_or_admin() or studio_code = any(iris.current_studios()));
drop policy if exists p_write on iris.equipment;
create policy p_write on iris.equipment for update using (iris.is_manager_or_admin());
drop policy if exists p_read on iris.equipment_tickets;
create policy p_read on iris.equipment_tickets for select using (iris.can_access_ticket_id(ticket_id));
grant select, update on iris.equipment to iris_app;
grant select on iris.equipment_tickets to iris_app;

-- ---------------------------------------------------------------------------
-- What equipment a ticket is about: (kind, number) or nothing.
-- ---------------------------------------------------------------------------
create or replace function iris.equipment_ref(
  p_category text, p_subcategory text, p_equipment text, p_title text, p_description text,
  p_tags text[], p_metadata jsonb)
returns table (kind text, number int) language sql immutable as $$
  with k as (
    select coalesce(
      iris.recurrence_kind(p_category, p_subcategory, p_equipment, p_title, p_description, p_tags, p_metadata),
      case when (p_metadata ? 'recurrence_check') or p_title like '[Recurrence check%' then null
           when coalesce(p_subcategory, '') ~* '\m(ac|hvac|ventilation|air.?condition)'
             or coalesce(p_equipment, '') ~* '\m(ac|hvac|air.?condition)' then 'ac' end) as kind,
      coalesce(p_equipment, '') || ' ' || p_title || ' ' || coalesce(p_description, '') as txt
  )
  select k.kind,
         case k.kind
           when 'bike' then (substring(k.txt from '(?i)bike\s*(?:no\.?|number|#)?\s*(\d{1,3})\M'))::int
           when 'mic'  then (substring(k.txt from '(?i)\mmic(?:rophone)?\s*(?:no\.?|number|#)?\s*(\d{1,2})\M'))::int
         end
    from k where k.kind is not null
$$;

-- Find the item, registering it on first sight.
create or replace function iris.equipment_for_ticket(p_ticket iris.tickets)
returns uuid language plpgsql security definer set search_path = iris, public as $$
declare
  r record;
  v_id uuid;
begin
  if p_ticket.studio_code is null then return null; end if;
  select * into r from iris.equipment_ref(p_ticket.category, p_ticket.subcategory, p_ticket.equipment,
                                          p_ticket.title, p_ticket.description, p_ticket.tags, p_ticket.metadata);
  if r.kind is null then return null; end if;
  select id into v_id from iris.equipment
   where studio_code = p_ticket.studio_code and kind = r.kind and coalesce(number, -1) = coalesce(r.number, -1);
  if v_id is null then
    insert into iris.equipment (studio_code, kind, number, label)
    values (p_ticket.studio_code, r.kind, r.number,
            case r.kind when 'bike' then coalesce('Bike #' || r.number, 'PowerCycle bike (unnumbered)')
                        when 'mic' then coalesce('Mic #' || r.number, 'Microphone (unnumbered)')
                        else 'Air-conditioning' end)
    on conflict do nothing
    returning id into v_id;
    if v_id is null then  -- lost a race: read the winner
      select id into v_id from iris.equipment
       where studio_code = p_ticket.studio_code and kind = r.kind and coalesce(number, -1) = coalesce(r.number, -1);
    end if;
  end if;
  return v_id;
end $$;

create or replace function iris.link_ticket_equipment()
returns trigger language plpgsql security definer set search_path = iris, public as $$
declare v_id uuid;
begin
  v_id := iris.equipment_for_ticket(new);
  if v_id is null then
    delete from iris.equipment_tickets where ticket_id = new.id;
  else
    insert into iris.equipment_tickets (equipment_id, ticket_id) values (v_id, new.id)
    on conflict (ticket_id) do update set equipment_id = excluded.equipment_id
      where iris.equipment_tickets.equipment_id is distinct from excluded.equipment_id;
  end if;
  return new;
end $$;

drop trigger if exists trg_link_ticket_equipment on iris.tickets;
create trigger trg_link_ticket_equipment
  after insert or update of title, description, category, subcategory, studio_code, equipment on iris.tickets
  for each row execute function iris.link_ticket_equipment();

-- ---------------------------------------------------------------------------
-- Health per item. A replacement candidate: 3+ faults in 90 days, or 2+ failed re-checks.
-- ---------------------------------------------------------------------------
create or replace view iris.v_equipment_health with (security_invoker = true) as
select e.id, e.studio_code, s.name as studio_name, s.city, e.kind, e.number, e.label, e.model, e.serial,
       e.status, e.notes, e.auto_created,
       count(t.id)::int                                                              as faults_total,
       count(t.id) filter (where t.created_at >= now() - interval '90 days')::int    as faults_90d,
       count(t.id) filter (where t.status not in ('resolved','closed'))::int         as open_faults,
       max(t.created_at)                                                             as last_fault_at,
       round(avg(extract(epoch from (t.resolved_at - t.created_at)) / 3600)
             filter (where t.resolved_at is not null)::numeric, 1)                   as avg_repair_h,
       (select count(*) from iris.recurrence_checks rc
          join iris.equipment_tickets x on x.ticket_id = rc.parent_ticket_id
         where x.equipment_id = e.id and rc.status = 'failed')::int                  as rechecks_failed,
       (select count(*) from iris.recurrence_checks rc
          join iris.equipment_tickets x on x.ticket_id = rc.parent_ticket_id
         where x.equipment_id = e.id and rc.status = 'passed')::int                  as rechecks_passed
  from iris.equipment e
  join iris.studios s on s.code = e.studio_code
  left join iris.equipment_tickets et on et.equipment_id = e.id
  left join iris.tickets t on t.id = et.ticket_id
 group by e.id, s.name, s.city;
grant select on iris.v_equipment_health to iris_app;

-- ---------------------------------------------------------------------------
-- Backfill history. No ticket row is touched.
-- ---------------------------------------------------------------------------
insert into iris.equipment_tickets (equipment_id, ticket_id)
select v_id, id from (select t.id, iris.equipment_for_ticket(t) as v_id from iris.tickets t) x
 where v_id is not null
on conflict (ticket_id) do nothing;

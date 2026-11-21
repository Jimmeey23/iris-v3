-- Equipment register: read every bike / mic a ticket names, not just the first.
--
--  * Numbers come from structured intake fields (assetName, bikeNumber) as well as the
--    text, and lists are split: "bikes 7, 8 and 13" links the ticket to all three.
--  * Mics with no number are told apart by where they are ("Studio 2", "Front desk",
--    "Strength Studio") via the new equipment.location column.
--  * Speakers / music systems filed under "Audio, Mic & Headphone" are their own kind,
--    'audio', instead of being counted as unnumbered mics.
--  * One ticket can link to several items (equipment_tickets key is now ticket + item).
-- Re-runnable.

alter table iris.equipment add column if not exists location text;

alter table iris.equipment drop constraint if exists equipment_kind_check;
alter table iris.equipment add constraint equipment_kind_check check (kind in ('bike', 'mic', 'audio', 'ac'));

drop index if exists iris.equipment_identity_key;
create unique index if not exists equipment_identity_key2
  on iris.equipment (studio_code, kind, coalesce(number, -1), coalesce(location, ''));

alter table iris.equipment_tickets drop constraint if exists equipment_tickets_pkey;
alter table iris.equipment_tickets add constraint equipment_tickets_pkey primary key (ticket_id, equipment_id);
create index if not exists equipment_tickets_ticket_idx on iris.equipment_tickets (ticket_id);

-- Every (kind, number, location) a ticket is about. Zero rows when it isn't equipment.
create or replace function iris.equipment_refs(p iris.tickets)
returns table (kind text, number int, location text) language plpgsql stable as $$
declare
  v_kind text;
  v_txt text;
  v_structured text;
  v_nums int[];
  v_loc text;
  m text[];
begin
  select r.kind into v_kind
    from iris.equipment_ref(p.category, p.subcategory, p.equipment, p.title, p.description, p.tags, p.metadata) r;
  if v_kind is null then return; end if;

  v_structured := coalesce((
    select string_agg(x #>> '{}', ' ')
      from jsonb_path_query(coalesce(p.collected_info, '{}') || coalesce(p.metadata, '{}'),
                            'strict $.**.assetName') x), '') || ' ' || coalesce((
    select string_agg(x #>> '{}', ' ')
      from jsonb_path_query(coalesce(p.collected_info, '{}'), 'strict $.**.bikeNumber') x), '');
  -- Drop the parts that name other things: the subcategory label in imported titles,
  -- the "Related open tickets" / "Member profile" sections, and the "front desk" form label.
  v_txt := v_structured || ' ' || coalesce(p.equipment, '') || ' ' || p.title || ' ' ||
           regexp_replace(coalesce(p.description, ''), '\n(Related open tickets|Member profile)\n.*$', '');
  v_txt := regexp_replace(v_txt, '(?i)audio, mic & headphone malfunction|steps taken by front desk', ' ', 'g');

  -- Speakers / music system, not a mic.
  if v_kind = 'mic'
     and v_txt ~* '\m(speakers?|music system|sound system|bluetooth|amplifier|amp)\M'
     and v_txt !~* '\m(mics?|microphones?|headsets?|mic packs?)\M' then
    v_kind := 'audio';
  end if;

  if v_kind in ('bike', 'mic') then
    for m in
      select regexp_matches(v_txt,
        case v_kind
          when 'bike' then '(?i)\mbikes?\s*(?:no\.?|number|#)?\s*(\d{1,2}(?:(?:\s*(?:,|and|&|/)\s*)+\d{1,2})*)\M'
          else '(?i)\m(?:mic(?:rophone)?s?|headsets?|mic packs?)\s*(?:no\.?|number|#)?\s*(\d{1,2}(?:(?:\s*(?:,|and|&|/)\s*)+\d{1,2})*)\M'
        end, 'g')
    loop
      v_nums := v_nums || array(select n::int from regexp_split_to_table(m[1], '\D+') n where n <> '' and n::int between 1 and 40);
    end loop;
  end if;

  if cardinality(v_nums) > 0 then
    return query select v_kind, n, null::text from (select distinct unnest(v_nums) n) u order by n;
    return;
  end if;

  if v_kind in ('mic', 'audio') then
    v_loc := coalesce(
      (select 'Studio ' || (regexp_match(v_txt, '(?i)\mstudio\s*(\d)\M'))[1]),
      (select initcap((regexp_match(v_txt, '(?i)\m(barre|power ?cycle|strength|mat|reformer)\s+(?:studio|room)\M'))[1]) || ' Studio'),
      case when v_txt ~* '\m(front desk|reception)\M' then 'Front desk' end,
      nullif(initcap(p.collected_info #>> '{intake,details,area}'), ''),
      nullif(initcap(p.collected_info ->> 'area'), ''));
  end if;
  return query select v_kind, null::int, v_loc;
end $$;

create or replace function iris.relink_ticket_equipment(p iris.tickets)
returns void language plpgsql security definer set search_path = iris, public as $$
declare
  r record;
  v_id uuid;
  v_ids uuid[] := '{}';
begin
  if p.studio_code is not null then
    for r in select * from iris.equipment_refs(p) loop
      select id into v_id from iris.equipment e
       where e.studio_code = p.studio_code and e.kind = r.kind
         and coalesce(e.number, -1) = coalesce(r.number, -1) and coalesce(e.location, '') = coalesce(r.location, '');
      if v_id is null then
        insert into iris.equipment (studio_code, kind, number, location, label)
        values (p.studio_code, r.kind, r.number, r.location,
                case r.kind
                  when 'bike'  then coalesce('Bike #' || r.number, 'PowerCycle bike (unnumbered)')
                  when 'mic'   then coalesce('Mic #' || r.number, 'Mic · ' || r.location, 'Microphone (unnumbered)')
                  when 'audio' then coalesce('Speakers / music · ' || r.location, 'Speakers / music system')
                  else 'Air-conditioning' end)
        on conflict do nothing
        returning id into v_id;
        if v_id is null then
          select id into v_id from iris.equipment e
           where e.studio_code = p.studio_code and e.kind = r.kind
             and coalesce(e.number, -1) = coalesce(r.number, -1) and coalesce(e.location, '') = coalesce(r.location, '');
        end if;
      end if;
      v_ids := v_ids || v_id;
      insert into iris.equipment_tickets (equipment_id, ticket_id) values (v_id, p.id) on conflict do nothing;
    end loop;
  end if;
  delete from iris.equipment_tickets where ticket_id = p.id and not (equipment_id = any (v_ids));
end $$;

create or replace function iris.link_ticket_equipment()
returns trigger language plpgsql security definer set search_path = iris, public as $$
begin
  perform iris.relink_ticket_equipment(new);
  return new;
end $$;

drop trigger if exists trg_link_ticket_equipment on iris.tickets;
create trigger trg_link_ticket_equipment
  after insert or update of title, description, category, subcategory, studio_code, equipment, collected_info on iris.tickets
  for each row execute function iris.link_ticket_equipment();

-- View gains location.
drop view if exists iris.v_equipment_health;
create view iris.v_equipment_health with (security_invoker = true) as
select e.id, e.studio_code, s.name as studio_name, s.city, e.kind, e.number, e.location, e.label, e.model, e.serial,
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

-- Backfill: relink every ticket, then drop auto-created items nothing points at.
do $$
declare t iris.tickets;
begin
  for t in select * from iris.tickets loop
    perform iris.relink_ticket_equipment(t);
  end loop;
end $$;
delete from iris.equipment e
 where e.auto_created and e.model is null and e.serial is null and e.notes is null
   and not exists (select 1 from iris.equipment_tickets x where x.equipment_id = e.id);

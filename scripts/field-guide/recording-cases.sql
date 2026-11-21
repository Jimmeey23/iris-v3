-- LOCAL DISPOSABLE RECORDING DB ONLY. Requires the separately provisioned training operator.
begin;
set local search_path=iris,public;
do $$ begin if not exists(select 1 from employees where id='academy' and email='lead@example.invalid') or exists(select 1 from tickets) then raise exception 'Expected a fresh recording database'; end if; end $$;
insert into tickets (id,title,description,category,subcategory,equipment,priority,status,studio_code,department_code,assignee_id,reporter_id,created_at)
select 'case-'||n,title,description,'Repair and Maintenance',sub,equipment,p,status,studio,'OPS',case when n=4 then null else 'academy' end,'academy',now()-make_interval(hours=>n*2) from (values
(1,'Mic 02 loses sound during class','Headset mic 02 drops out when the instructor turns. Spare mic available for the next class.','Audio, Mic & Headphone Malfunction','Mic 02','P2','open','SHQ'),
(2,'Replacement cable for mic 02','Check stock of spare headset cables before the afternoon sound check.','Audio, Mic & Headphone Malfunction','Cable','P2','in_progress','SHQ'),
(3,'Studio speaker crackles','The left speaker distorts during warm-up. Vendor visit requested.','Audio, Mic & Headphone Malfunction','Studio speaker','P1','in_progress','KH'),
(4,'Cooling stopped in the main studio','Air conditioning stopped before the evening session. Move class until a technician checks the unit.','AC & Ventilation Repairs','AC unit','P1','open','KH'),
(5,'Mic 05 cable dropout','Audio dropped when the headset cable moved. Cable replaced and tested.','Audio, Mic & Headphone Malfunction','Mic 05','P2','in_progress','SHQ'),
(6,'Bike 12 pedal clicks','Pedal clicked during climbs. Crank bolt tightened and ride-tested.','PowerCycle Bike Malfunction & Repairs','Bike 12','P2','in_progress','KH')) v(n,title,description,sub,equipment,p,status,studio);
update tickets set status='resolved',resolution='Repaired and tested under class conditions.' where id in ('case-5','case-6');
update recurrence_checks set due_at=now()-interval '1 minute' where step=1;
select iris.materialize_recurrence_checks();
commit;

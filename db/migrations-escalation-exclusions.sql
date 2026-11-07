-- People who must never receive an escalated ticket (e.g. the Owner).
alter table iris.employees add column if not exists exclude_from_escalation boolean not null default false;
update iris.employees set exclude_from_escalation = true where id = 'emp_mallika';

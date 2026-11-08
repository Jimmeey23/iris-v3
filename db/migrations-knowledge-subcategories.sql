-- Knowledge Base sub-categories (Category → Sub-category → Guide drill-down).
--
-- Adds iris.knowledge_docs.subcategory. Additive and idempotent, and safe in any
-- order relative to db/migrations-templates-knowledge.sql: when the table doesn't
-- exist yet this is a no-op, because that file creates it with the column.
--
-- The app works before this is applied (built-in guides take their sub-category
-- from the shipped library); applying it lets managers save their own choice.

do $$
begin
  if to_regclass('iris.knowledge_docs') is not null then
    alter table iris.knowledge_docs add column if not exists subcategory text;
  end if;
end $$;

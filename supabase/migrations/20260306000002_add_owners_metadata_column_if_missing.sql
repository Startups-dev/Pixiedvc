-- Ensure legacy environments have owners.metadata used by onboarding + agreement APIs.
alter table if exists public.owners
  add column if not exists metadata jsonb;

alter table if exists public.owners
  alter column metadata set default '{}'::jsonb;

-- Refresh PostgREST schema cache so new column is immediately visible to API writes.
select pg_notify('pgrst', 'reload schema');

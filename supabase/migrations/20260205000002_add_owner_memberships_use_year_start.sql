-- Enable per-use-year rows for owner memberships

alter table if exists public.owner_memberships
  add column if not exists contract_year integer;

update public.owner_memberships
set contract_year = extract(year from current_date)::int
where contract_year is null;

alter table if exists public.owner_memberships
  alter column contract_year set not null;

-- Drop legacy unique index (owner_id,resort_id,use_year) if present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'owner_memberships_owner_resort_useyear_idx'
  ) THEN
    EXECUTE 'DROP INDEX public.owner_memberships_owner_resort_useyear_idx';
  END IF;
END $$;

create unique index if not exists owner_memberships_owner_resort_useyear_contract_year_idx
  on public.owner_memberships (owner_id, resort_id, use_year, contract_year);

comment on column public.owner_memberships.contract_year is
  'Start year for the use-year bucket (e.g., 2025).';

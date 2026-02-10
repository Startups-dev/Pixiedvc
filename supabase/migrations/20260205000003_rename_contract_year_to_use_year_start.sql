-- Rename contract_year to use_year_start and update unique index

alter table if exists public.owner_memberships
  rename column contract_year to use_year_start;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'owner_memberships_owner_resort_useyear_contract_year_idx'
  ) THEN
    EXECUTE 'DROP INDEX public.owner_memberships_owner_resort_useyear_contract_year_idx';
  END IF;
END $$;

create unique index if not exists owner_memberships_owner_resort_useyear_start_idx
  on public.owner_memberships (owner_id, resort_id, use_year, use_year_start);

comment on column public.owner_memberships.use_year_start is
  'Start year for the use-year bucket (e.g., 2025).';

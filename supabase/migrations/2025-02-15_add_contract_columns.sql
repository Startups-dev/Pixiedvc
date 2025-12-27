alter table public.owners
  add column if not exists points_available integer,
  add column if not exists contract_year integer;

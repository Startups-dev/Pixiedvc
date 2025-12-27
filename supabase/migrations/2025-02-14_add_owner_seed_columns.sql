alter table public.owners
  add column if not exists home_resort text,
  add column if not exists use_year text,
  add column if not exists points_owned integer,
  add column if not exists contract_year text,
  add column if not exists points_available integer;

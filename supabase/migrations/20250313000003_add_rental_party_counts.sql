alter table public.rentals
  add column if not exists adults integer,
  add column if not exists youths integer;

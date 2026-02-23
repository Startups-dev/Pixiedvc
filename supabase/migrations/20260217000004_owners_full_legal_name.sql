alter table if exists public.owners
  add column if not exists full_legal_name text;

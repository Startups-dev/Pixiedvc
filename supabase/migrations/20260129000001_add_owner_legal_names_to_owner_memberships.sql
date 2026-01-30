alter table public.owner_memberships
  add column if not exists owner_legal_full_name text,
  add column if not exists co_owner_legal_full_name text;

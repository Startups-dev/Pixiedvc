alter table public.owners
  add column if not exists agreement_version text not null default 'v1',
  add column if not exists agreement_accepted_at timestamptz,
  add column if not exists agreement_signed_name text,
  add column if not exists agreement_accepted_ip text;

do $$
begin
  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'owners'
      and indexdef ilike '%(user_id)%'
  ) then
    create index owners_user_id_idx on public.owners (user_id);
  end if;
end
$$;

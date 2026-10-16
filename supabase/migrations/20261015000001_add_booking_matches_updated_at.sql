-- Keep booking match timestamps consistent with the application's payout and
-- status update paths. Preserve creation time when backfilling existing rows.
alter table public.booking_matches
  add column if not exists updated_at timestamptz;

update public.booking_matches
set updated_at = coalesce(updated_at, created_at, now())
where updated_at is null;

alter table public.booking_matches
  alter column updated_at set default now(),
  alter column updated_at set not null;

-- Reuse the project's shared timestamp trigger when one is not already
-- attached to this table. The application also writes updated_at explicitly
-- in the payout persistence path.
do $$
begin
  if not exists (
    select 1
    from pg_trigger t
    join pg_proc p on p.oid = t.tgfoid
    join pg_namespace n on n.oid = p.pronamespace
    where t.tgrelid = 'public.booking_matches'::regclass
      and not t.tgisinternal
      and p.proname = 'set_updated_at'
      and n.nspname = 'public'
  ) then
    create trigger booking_matches_set_updated_at
      before update on public.booking_matches
      for each row execute function public.set_updated_at();
  end if;
end;
$$;

-- Enforce use_year_start day-1 constraint and auto-fill use_year_end

alter table if exists public.owner_memberships
  add constraint owner_memberships_use_year_start_day_1
  check (extract(day from use_year_start) = 1) not valid;

alter table public.owner_memberships
  validate constraint owner_memberships_use_year_start_day_1;

create or replace function public.set_owner_membership_use_year_end()
returns trigger
language plpgsql
as $$
begin
  if new.use_year_start is null then
    return new;
  end if;

  if new.use_year_end is null then
    new.use_year_end := (new.use_year_start + interval '1 year' - interval '1 day')::date;
  end if;

  return new;
end;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'owner_memberships_set_use_year_end'
  ) THEN
    CREATE TRIGGER owner_memberships_set_use_year_end
    BEFORE INSERT OR UPDATE ON public.owner_memberships
    FOR EACH ROW
    EXECUTE FUNCTION public.set_owner_membership_use_year_end();
  END IF;
END $$;

update public.owner_memberships
set use_year_end = (use_year_start + interval '1 year' - interval '1 day')::date
where use_year_start is not null
  and use_year_end is null;

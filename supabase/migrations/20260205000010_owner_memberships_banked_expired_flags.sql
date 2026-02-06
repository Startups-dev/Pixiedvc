alter table public.owner_memberships
  add column if not exists banked_assumed_at timestamptz,
  add column if not exists banked_assumed_reason text,
  add column if not exists expired_assumed_at timestamptz;

comment on column public.owner_memberships.banked_assumed_at is 'Timestamp when owner confirmed points were banked.';
comment on column public.owner_memberships.banked_assumed_reason is 'Optional reason/source for banked confirmation.';
comment on column public.owner_memberships.expired_assumed_at is 'Timestamp when points were auto-marked expired.';

create or replace function public.owner_memberships_points_available_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.banked_assumed_at is not null or new.expired_assumed_at is not null then
    new.points_available := 0;
  else
    new.points_available := greatest(
      0,
      coalesce(new.points_owned, 0) -
      coalesce(new.points_rented, 0) -
      coalesce(new.points_reserved, 0)
    );
  end if;
  return new;
end;
$$;

update public.owner_memberships
set points_available = 0
where banked_assumed_at is not null
   or expired_assumed_at is not null;

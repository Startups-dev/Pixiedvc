alter table public.owner_memberships
  add column if not exists banked_points_amount int;

comment on column public.owner_memberships.banked_points_amount is 'Number of points owner confirmed as banked.';

create or replace function public.owner_memberships_points_available_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.points_available := greatest(
    0,
    coalesce(new.points_owned, 0) -
    coalesce(new.points_rented, 0) -
    coalesce(new.points_reserved, 0)
  );
  return new;
end;
$$;

update public.owner_memberships
set points_available = greatest(
  0,
  coalesce(points_owned, 0) -
  coalesce(points_rented, 0) -
  coalesce(points_reserved, 0)
);

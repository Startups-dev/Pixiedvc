-- Recompute points_available on all memberships and keep it in sync.

update public.owner_memberships
set points_available = greatest(
  0,
  coalesce(points_owned, 0) -
  coalesce(points_rented, 0) -
  coalesce(points_reserved, 0)
);

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

drop trigger if exists owner_memberships_points_available_sync on public.owner_memberships;

create trigger owner_memberships_points_available_sync
before insert or update on public.owner_memberships
for each row execute function public.owner_memberships_points_available_trigger();

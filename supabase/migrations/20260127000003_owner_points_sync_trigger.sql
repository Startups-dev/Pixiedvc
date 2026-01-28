create or replace function public.recompute_owner_points(owner_uuid uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  owned_total integer;
  available_total integer;
begin
  select
    coalesce(sum(points_owned), 0),
    coalesce(sum(points_owned), 0) - coalesce(sum(points_rented), 0) - coalesce(sum(points_reserved), 0)
  into owned_total, available_total
  from public.owner_memberships
  where owner_id = owner_uuid;

  update public.owners
  set points_owned = owned_total,
      points_available = available_total
  where id = owner_uuid;
end;
$$;

create or replace function public.owner_memberships_points_sync_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.recompute_owner_points(coalesce(new.owner_id, old.owner_id));
  return null;
end;
$$;

drop trigger if exists owner_memberships_points_sync on public.owner_memberships;

create trigger owner_memberships_points_sync
after insert or update or delete on public.owner_memberships
for each row execute function public.owner_memberships_points_sync_trigger();

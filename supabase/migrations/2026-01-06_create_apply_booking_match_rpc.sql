-- RPC used by cron matcher to atomically reserve points, create a booking match,
-- and move the booking request into pending_owner.
create or replace function public.apply_booking_match(
  p_booking_id uuid,
  p_borrow_membership_id uuid,
  p_expires_at timestamptz,
  p_owner_base_rate_per_point_cents int,
  p_owner_home_resort_premium_applied boolean,
  p_owner_id uuid,
  p_owner_membership_id uuid,
  p_owner_premium_per_point_cents int,
  p_owner_rate_per_point_cents int,
  p_owner_total_cents int,
  p_points_reserved int,
  p_points_reserved_borrowed int,
  p_points_reserved_current int
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_available int;
  current_reserved int;
  borrow_available int;
  borrow_reserved int;
  match_id uuid;
begin
  if not exists (
    select 1
    from public.booking_requests
    where id = p_booking_id
      and status = 'submitted'
  ) then
    raise exception 'booking_not_submitted';
  end if;

  select points_available, points_reserved
    into current_available, current_reserved
  from public.owner_memberships
  where id = p_owner_membership_id
  for update;

  if not found then
    raise exception 'membership_not_found';
  end if;

  if p_points_reserved_current > 0 then
    if current_available is null then
      raise exception 'membership_points_available_null';
    end if;
    if (current_available - coalesce(current_reserved, 0)) < p_points_reserved_current then
      raise exception 'insufficient_points';
    end if;

    update public.owner_memberships
      set points_reserved = coalesce(points_reserved, 0) + p_points_reserved_current
    where id = p_owner_membership_id;
  end if;

  if p_points_reserved_borrowed > 0 then
    if p_borrow_membership_id is null then
      raise exception 'missing_borrow_membership';
    end if;

    select points_available, points_reserved
      into borrow_available, borrow_reserved
    from public.owner_memberships
    where id = p_borrow_membership_id
    for update;

    if not found then
      raise exception 'borrow_membership_not_found';
    end if;

    if borrow_available is null then
      raise exception 'borrow_points_available_null';
    end if;
    if (borrow_available - coalesce(borrow_reserved, 0)) < p_points_reserved_borrowed then
      raise exception 'insufficient_borrow_points';
    end if;

    update public.owner_memberships
      set points_reserved = coalesce(points_reserved, 0) + p_points_reserved_borrowed
    where id = p_borrow_membership_id;
  end if;

  insert into public.booking_matches (
    booking_id,
    owner_id,
    owner_membership_id,
    points_reserved,
    points_reserved_current,
    points_reserved_borrowed,
    status,
    expires_at,
    owner_base_rate_per_point_cents,
    owner_premium_per_point_cents,
    owner_rate_per_point_cents,
    owner_total_cents,
    owner_home_resort_premium_applied
  ) values (
    p_booking_id,
    p_owner_id,
    p_owner_membership_id,
    p_points_reserved,
    coalesce(p_points_reserved_current, 0),
    coalesce(p_points_reserved_borrowed, 0),
    'pending_owner',
    p_expires_at,
    p_owner_base_rate_per_point_cents,
    p_owner_premium_per_point_cents,
    p_owner_rate_per_point_cents,
    p_owner_total_cents,
    p_owner_home_resort_premium_applied
  )
  returning id into match_id;

  update public.booking_requests
    set status = 'pending_owner',
        updated_at = now()
  where id = p_booking_id
    and status = 'submitted';

  return match_id;
end;
$$;

grant execute on function public.apply_booking_match(
  uuid,
  uuid,
  timestamptz,
  int,
  boolean,
  uuid,
  uuid,
  int,
  int,
  int,
  int,
  int,
  int
) to service_role;

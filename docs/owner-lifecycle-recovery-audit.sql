-- Owner lifecycle recovery audit.
-- READ ONLY. These queries identify orphan signatures after possible physical owner deletion.

-- 1. Profiles with owner role but no owners row.
select
  p.id as profile_id,
  p.email,
  p.display_name,
  p.role,
  p.created_at
from public.profiles p
left join public.owners o on o.user_id = p.id
where p.role = 'owner'
  and o.id is null
order by p.created_at desc;

-- 2. Auth users that appear to be owners but have no owners row.
select
  u.id as auth_user_id,
  u.email,
  u.created_at,
  u.raw_user_meta_data
from auth.users u
left join public.owners o on o.user_id = u.id
where o.id is null
  and (
    u.raw_user_meta_data ? 'owner_id'
    or u.raw_user_meta_data ? 'owner'
    or u.raw_user_meta_data->>'role' = 'owner'
    or exists (
      select 1
      from public.profiles p
      where p.id = u.id
        and p.role = 'owner'
    )
  )
order by u.created_at desc;

-- 3. Rentals where owner_id is null.
select
  r.id as rental_id,
  r.owner_user_id,
  r.guest_user_id,
  r.resort_code,
  r.check_in,
  r.check_out,
  r.status,
  r.created_at
from public.rentals r
where r.owner_id is null
order by r.created_at desc;

-- 4. Ready Stays tied to rentals with missing owner linkage.
select
  rs.id as ready_stay_id,
  rs.owner_id as ready_stay_owner_profile_id,
  rs.rental_id,
  rs.status as ready_stay_status,
  rs.sold_booking_request_id,
  r.owner_id as rental_owner_id,
  r.owner_user_id as rental_owner_user_id,
  r.status as rental_status,
  rs.created_at
from public.ready_stays rs
left join public.rentals r on r.id = rs.rental_id
where r.id is null
   or r.owner_id is null
order by rs.created_at desc;

-- 5. Point liquidation requests where owner_id is null.
select
  plr.id as point_liquidation_request_id,
  plr.owner_user_id,
  plr.resort_id,
  plr.use_year,
  plr.points_available,
  plr.status,
  plr.created_at
from public.point_liquidation_requests plr
where plr.owner_id is null
order by plr.created_at desc;

-- 6. Owner memberships whose owner row is missing.
select
  m.id as owner_membership_id,
  m.owner_id,
  m.resort_id,
  m.use_year,
  m.use_year_start,
  m.points_owned,
  m.points_available,
  m.points_reserved,
  m.points_rented,
  m.created_at
from public.owner_memberships m
left join public.owners o on o.id = m.owner_id
where o.id is null
order by m.created_at desc;

-- 7. Booking matches whose owner row is missing.
select
  bm.id as booking_match_id,
  bm.booking_id,
  bm.owner_id,
  bm.owner_membership_id,
  bm.status,
  bm.points_reserved,
  bm.created_at
from public.booking_matches bm
left join public.owners o on o.id = bm.owner_id
where o.id is null
order by bm.created_at desc;

-- 8. Ready Stays where the profile owner exists but the corresponding owners row is missing.
select
  rs.id as ready_stay_id,
  rs.owner_id as profile_id,
  p.email,
  p.role,
  rs.rental_id,
  rs.status,
  rs.sold_booking_request_id,
  rs.created_at
from public.ready_stays rs
join public.profiles p on p.id = rs.owner_id
left join public.owners o on o.user_id = p.id
where o.id is null
order by rs.created_at desc;

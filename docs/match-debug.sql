-- Debug matching eligibility (read-only).
-- Replace <BOOKING_ID> with the booking you want to inspect.

-- 1) Booking request details
select
  b.id,
  b.status,
  b.primary_resort_id,
  b.total_points,
  b.check_in,
  b.check_out
from public.booking_requests b
where b.id = '<BOOKING_ID>';

-- 2) Existing matches for the booking
select
  m.id,
  m.status,
  m.owner_id,
  m.owner_membership_id,
  m.points_reserved,
  m.created_at
from public.booking_matches m
where m.booking_id = '<BOOKING_ID>'
order by m.created_at desc;

-- 3) Candidate memberships for the booking's resort
select
  m.id,
  m.owner_id,
  m.resort_id,
  m.home_resort,
  m.contract_year,
  m.use_year_start,
  m.use_year_end,
  m.points_owned,
  m.points_available,
  m.points_reserved,
  m.borrowing_enabled,
  m.max_points_to_borrow,
  o.verification
from public.owner_memberships m
join public.owners o on o.id = m.owner_id
where (
  m.resort_id = (
    select b.primary_resort_id
    from public.booking_requests b
    where b.id = '<BOOKING_ID>'
  )
  or m.home_resort = (
    select r.calculator_code
    from public.booking_requests b
    join public.resorts r on r.id = b.primary_resort_id
    where b.id = '<BOOKING_ID>'
  )
)
order by m.points_available desc;

-- Seed helper: create a sample rental + milestones for a specific owner.
-- Replace OWNER_USER_ID with an auth.users id (literal UUID).

begin;

-- Create rental
insert into public.rentals (
  owner_user_id,
  resort_code,
  room_type,
  check_in,
  check_out,
  points_required,
  rental_amount_cents,
  status
) values (
  'OWNER_USER_ID',
  'BLT',
  'Studio',
  current_date + interval '30 days',
  current_date + interval '37 days',
  120,
  450000,
  'awaiting_owner_approval'
) returning id;

-- Example milestone insert (use the id returned above).
-- insert into public.rental_milestones (rental_id, code, status, occurred_at)
-- values (:rental_id, 'matched', 'completed', now());

commit;

-- Notes:
-- 1) Capture the rental id from the first insert.
-- 2) Insert milestones using that rental id.
-- 3) Use /owner/rentals/[id] to see the record.

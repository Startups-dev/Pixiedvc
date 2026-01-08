-- Dev seed helper: creates a rental + milestones for a specific owner.
-- Replace OWNER_USER_ID with a real auth.users id (UUID).

-- Optional: find your auth.users id
-- select id, email from auth.users where email = 'YOUR_EMAIL@example.com';

with new_rental as (
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
  )
  returning id
), inserted_milestones as (
  insert into public.rental_milestones (rental_id, code, status, occurred_at)
  select
    new_rental.id,
    v.code,
    case when v.code = 'matched' then 'completed' else 'pending' end,
    case when v.code = 'matched' then now() else null end
  from new_rental
  cross join (
    values
      ('matched'),
      ('guest_verified'),
      ('payment_verified'),
      ('booking_package_sent'),
      ('agreement_sent'),
      ('owner_approved'),
      ('owner_booked'),
      ('check_in'),
      ('check_out')
  ) as v(code)
  returning rental_id
)
select id from new_rental;

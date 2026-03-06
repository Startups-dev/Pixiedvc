alter table public.booking_requests
  add column if not exists building_preference text not null default 'none';

update public.booking_requests
set building_preference = 'none'
where building_preference is null;

alter table public.booking_requests
  drop constraint if exists booking_requests_building_preference_check;

alter table public.booking_requests
  add constraint booking_requests_building_preference_check
  check (building_preference in ('none', 'jambo', 'kidani'));

drop index if exists public.booking_requests_active_signature_unique;

create unique index if not exists booking_requests_active_signature_unique
on public.booking_requests (
  renter_id,
  primary_resort_id,
  check_in,
  check_out,
  total_points,
  primary_room,
  building_preference
)
where status in ('draft', 'submitted', 'pending_match', 'pending_owner');

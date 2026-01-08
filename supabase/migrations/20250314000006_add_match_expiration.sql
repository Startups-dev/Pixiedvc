alter table public.booking_matches
  add column if not exists expires_at timestamptz;

update public.booking_matches
set expires_at = created_at + interval '60 minutes'
where expires_at is null;

alter table public.booking_matches
  drop constraint if exists booking_matches_status_check;

alter table public.booking_matches
  add constraint booking_matches_status_check
  check (status in ('pending_owner','accepted','declined','booked','expired'));

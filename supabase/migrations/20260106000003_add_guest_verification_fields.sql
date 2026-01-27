alter table public.booking_requests
  add column if not exists guest_profile_complete_at timestamptz,
  add column if not exists guest_agreement_accepted_at timestamptz;

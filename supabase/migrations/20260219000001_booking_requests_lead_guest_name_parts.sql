alter table public.booking_requests
  add column if not exists lead_guest_title text,
  add column if not exists lead_guest_middle_initial text,
  add column if not exists lead_guest_suffix text;

alter table public.booking_requests
  add column if not exists guest_link_ready_notified_at timestamp with time zone;

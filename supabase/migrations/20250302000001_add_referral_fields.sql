alter table if exists public.booking_requests
  add column if not exists referral_code text,
  add column if not exists referral_set_at timestamptz,
  add column if not exists referral_landing text;

create table if not exists public.confirmed_bookings (
  id uuid primary key default gen_random_uuid(),
  booking_request_id uuid unique references public.booking_requests(id) on delete set null,
  referral_code text,
  referral_set_at timestamptz,
  referral_landing text,
  created_at timestamptz not null default now()
);

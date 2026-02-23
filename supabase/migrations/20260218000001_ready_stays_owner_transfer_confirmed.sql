alter table if exists public.booking_requests
  add column if not exists owner_transfer_confirmed_at timestamptz null,
  add column if not exists owner_transfer_confirmed_by uuid null references auth.users(id) on delete set null;

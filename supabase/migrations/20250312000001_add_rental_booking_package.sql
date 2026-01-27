alter table public.rentals
  add column if not exists booking_package jsonb not null default '{}'::jsonb,
  add column if not exists lead_guest_name text,
  add column if not exists lead_guest_email text,
  add column if not exists lead_guest_phone text,
  add column if not exists lead_guest_address jsonb,
  add column if not exists party_size integer,
  add column if not exists special_needs boolean not null default false,
  add column if not exists special_needs_notes text;

create type booking_status as enum ('draft','submitted','matched','confirmed','cancelled');

create table if not exists public.booking_requests (
  id uuid primary key default gen_random_uuid(),
  renter_id uuid references auth.users(id) on delete cascade,
  status booking_status not null default 'draft',
  check_in date,
  check_out date,
  nights integer,
  primary_resort_id uuid references public.resorts(id),
  primary_room text,
  primary_view text,
  requires_accessibility boolean,
  secondary_resort_id uuid references public.resorts(id),
  secondary_room text,
  tertiary_resort_id uuid references public.resorts(id),
  tertiary_room text,
  adults integer,
  youths integer,
  marketing_source text,
  comments text,
  phone text,
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  postal_code text,
  country text,
  lead_guest_name text,
  lead_guest_email text,
  lead_guest_phone text,
  matched_owner_id uuid references public.owners(id),
  total_points integer,
  deposit_due numeric(10,2),
  deposit_paid numeric(10,2),
  deposit_currency text default 'USD',
  accepted_terms boolean default false,
  accepted_insurance boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.booking_request_guests (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.booking_requests(id) on delete cascade,
  title text,
  first_name text,
  last_name text,
  email text,
  phone text,
  age_category text check (age_category in ('adult','youth')), -- youth = 17 and under
  created_at timestamptz not null default now()
);

comment on table public.booking_requests is 'Multi-step booking wizard submissions per renter.';
comment on table public.booking_request_guests is 'Individual guest roster entries tied to booking requests.';

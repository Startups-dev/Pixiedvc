create table if not exists public.renter_requests (
  id uuid primary key default gen_random_uuid(),
  renter_id uuid references auth.users(id) on delete cascade,
  resort_id uuid references public.resorts(id),
  room_type text,
  check_in date,
  check_out date,
  adults integer,
  children integer,
  max_price_per_point numeric(10,2),
  status text not null default 'submitted',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.public_market_metrics (
  id uuid primary key default gen_random_uuid(),
  market_key text not null unique,
  availability_confidence text not null check (availability_confidence in ('low', 'medium', 'high')),
  typical_match_time_label text not null,
  verified_owners_ready integer not null default 0,
  booking_window_supported boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.public_market_metrics enable row level security;

create policy "Public read market metrics"
on public.public_market_metrics
for select
using (true);

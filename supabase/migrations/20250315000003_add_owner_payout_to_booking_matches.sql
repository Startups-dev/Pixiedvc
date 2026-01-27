alter table public.booking_matches
  add column if not exists owner_base_rate_per_point_cents integer not null default 1600,
  add column if not exists owner_premium_per_point_cents integer not null default 0,
  add column if not exists owner_rate_per_point_cents integer not null default 1600,
  add column if not exists owner_total_cents integer not null default 0,
  add column if not exists owner_home_resort_premium_applied boolean not null default false;

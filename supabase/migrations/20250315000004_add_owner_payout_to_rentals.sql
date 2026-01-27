alter table public.rentals
  add column if not exists owner_base_rate_per_point_cents integer,
  add column if not exists owner_premium_per_point_cents integer,
  add column if not exists owner_rate_per_point_cents integer,
  add column if not exists owner_total_cents integer,
  add column if not exists owner_home_resort_premium_applied boolean,
  add column if not exists guest_rate_per_point_cents integer,
  add column if not exists guest_total_cents integer;

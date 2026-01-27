alter table public.owner_memberships
  add column if not exists borrowing_enabled boolean not null default false,
  add column if not exists max_points_to_borrow integer not null default 0;

alter table public.booking_matches
  add column if not exists points_reserved_current integer not null default 0,
  add column if not exists points_reserved_borrowed integer not null default 0;

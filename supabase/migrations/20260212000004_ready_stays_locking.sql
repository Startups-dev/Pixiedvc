-- Ready Stays locking + rental uniqueness
alter table if exists public.ready_stays
  add column if not exists locked_until timestamptz null,
  add column if not exists lock_session_id uuid null;

create unique index if not exists ready_stays_unique_rental
  on public.ready_stays (rental_id)
  where status in ('draft', 'active');

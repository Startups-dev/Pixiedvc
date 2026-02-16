-- Ready Stays booking adapter locking support.
-- Safe/idempotent migration for lock fields used by /ready-stays/[id]/book and Stripe webhook.

alter table if exists public.ready_stays
  add column if not exists locked_until timestamptz null,
  add column if not exists lock_session_id uuid null;

-- Enforce one active/draft listing per rental.
create unique index if not exists ready_stays_unique_rental
  on public.ready_stays (rental_id)
  where status in ('draft', 'active');

-- Speeds webhook/session resolution by lock session id.
create index if not exists ready_stays_lock_session_id_idx
  on public.ready_stays (lock_session_id)
  where lock_session_id is not null;

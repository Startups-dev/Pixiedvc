alter table if exists public.support_handoffs
  add column if not exists closed_at timestamptz;

alter table if exists public.support_handoffs
  drop constraint if exists support_handoffs_status_check;

alter table if exists public.support_handoffs
  add constraint support_handoffs_status_check
  check (status in ('open', 'claimed', 'resolved', 'closed'));

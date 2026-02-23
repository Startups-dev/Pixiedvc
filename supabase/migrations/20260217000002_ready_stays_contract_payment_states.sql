-- Ready Stays contract payment states.

alter table if exists public.contracts
  add column if not exists signed_at timestamptz;

alter table if exists public.contracts
  drop constraint if exists contracts_status_check;

alter table if exists public.contracts
  add constraint contracts_status_check
  check (status in ('draft', 'sent', 'pending_payment', 'accepted', 'active', 'rejected', 'void', 'cancelled'));

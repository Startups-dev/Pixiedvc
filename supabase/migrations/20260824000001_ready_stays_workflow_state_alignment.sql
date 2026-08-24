alter type public.ready_stay_status add value if not exists 'paused';

alter table if exists public.ready_stays
  drop constraint if exists ready_stays_verification_status_check;

alter table if exists public.ready_stays
  add constraint ready_stays_verification_status_check
  check (
    verification_status in ('not_submitted', 'proof_uploaded', 'submitted', 'approved', 'rejected')
  );

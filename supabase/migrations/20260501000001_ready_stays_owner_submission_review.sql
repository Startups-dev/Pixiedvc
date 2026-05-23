alter table if exists public.ready_stays
  add column if not exists reservation_proof_path text,
  add column if not exists reservation_proof_name text,
  add column if not exists reservation_proof_uploaded_at timestamptz,
  add column if not exists verification_status text not null default 'not_submitted',
  add column if not exists verification_submitted_at timestamptz,
  add column if not exists verification_approved_at timestamptz,
  add column if not exists verification_rejected_at timestamptz,
  add column if not exists verification_review_notes text,
  add column if not exists verification_reviewed_by uuid references auth.users(id) on delete set null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'ready_stays_verification_status_check'
      and conrelid = 'public.ready_stays'::regclass
  ) then
    alter table public.ready_stays
      add constraint ready_stays_verification_status_check
      check (
        verification_status in ('not_submitted', 'submitted', 'approved', 'rejected')
      );
  end if;
end $$;

update public.ready_stays
set
  verification_status = case
    when status = 'active'::public.ready_stay_status then 'approved'
    when status in ('sold'::public.ready_stay_status, 'expired'::public.ready_stay_status, 'removed'::public.ready_stay_status)
      then 'approved'
    else verification_status
  end,
  verification_approved_at = case
    when status in ('active'::public.ready_stay_status, 'sold'::public.ready_stay_status, 'expired'::public.ready_stay_status, 'removed'::public.ready_stay_status)
      then coalesce(verification_approved_at, updated_at, created_at)
    else verification_approved_at
  end
where verification_status = 'not_submitted';

create index if not exists ready_stays_verification_status_idx
  on public.ready_stays (verification_status, created_at desc);

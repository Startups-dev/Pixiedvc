-- Add a durable marker for onboarding completion.

alter table public.profiles
  add column if not exists onboarding_completed_at timestamptz;

comment on column public.profiles.onboarding_completed_at is 'Timestamp set when the onboarding wizard finishes.';

-- Backfill existing owners/complete profiles to avoid re-running onboarding without intent.
update public.profiles p
set onboarding_completed_at = now()
where onboarding_completed_at is null
  and (
    p.onboarding_completed
    or exists (
      select 1
      from public.owner_memberships m
      where m.owner_id = p.id
    )
  );

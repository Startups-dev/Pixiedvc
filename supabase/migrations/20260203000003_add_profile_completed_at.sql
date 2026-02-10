alter table public.profiles
  add column if not exists profile_completed_at timestamptz;

comment on column public.profiles.profile_completed_at is 'Timestamp set when profile step is first completed.';

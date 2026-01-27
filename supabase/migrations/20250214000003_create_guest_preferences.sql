create table if not exists public.guest_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  dates_pref text,
  favorite_resorts text[]
);

comment on table public.guest_preferences is 'Guest onboarding preferences captured during onboarding.';

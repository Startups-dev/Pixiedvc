-- Add app_settings for promotions enrollment flags and add rewards enrollment timestamps.

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid null
);

alter table public.app_settings enable row level security;

drop policy if exists app_settings_service_role on public.app_settings;
create policy app_settings_service_role
  on public.app_settings
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

insert into public.app_settings (key, value)
values
  ('promotions_guest_enrollment_enabled', '{"enabled": true}'),
  ('promotions_owner_enrollment_enabled', '{"enabled": true}')
on conflict (key) do update
set value = excluded.value;

alter table public.profiles
  add column if not exists guest_rewards_enrolled_at timestamptz null;

alter table public.profiles
  add column if not exists owner_rewards_enrolled_at timestamptz null;

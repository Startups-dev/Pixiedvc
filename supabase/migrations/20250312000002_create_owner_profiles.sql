create table if not exists public.owner_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  payout_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger owner_profiles_updated_at
before update on public.owner_profiles
for each row execute function public.set_updated_at();

alter table public.owner_profiles enable row level security;

-- Owners can view their own profile.
drop policy if exists "Owners can view owner profiles" on public.owner_profiles;
create policy "Owners can view owner profiles"
  on public.owner_profiles
  for select
  using (user_id = auth.uid());

-- Owners can insert their own profile.
drop policy if exists "Owners can insert owner profiles" on public.owner_profiles;
create policy "Owners can insert owner profiles"
  on public.owner_profiles
  for insert
  with check (user_id = auth.uid());

-- Owners can update their own profile.
drop policy if exists "Owners can update owner profiles" on public.owner_profiles;
create policy "Owners can update owner profiles"
  on public.owner_profiles
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Service role can manage all owner profiles.
drop policy if exists "Service role can manage owner profiles" on public.owner_profiles;
create policy "Service role can manage owner profiles"
  on public.owner_profiles
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- 20260106000002_owner_verification_onboarding.sql
-- Owner verification + expanded profile fields + payout email backfill
-- NOTE: Storage policies for the `owner-verification` bucket must be created
-- in the Supabase Dashboard (Storage > Policies) because we are not the owner
-- of storage.objects in hosted Supabase.

begin;

-- 1) Extend profiles
alter table public.profiles
  add column if not exists full_name text,
  add column if not exists address_line1 text,
  add column if not exists address_line2 text,
  add column if not exists city text,
  add column if not exists region text,
  add column if not exists postal_code text,
  add column if not exists country text,
  add column if not exists payout_email text,
  add column if not exists payout_email_same_as_login boolean not null default true,
  add column if not exists dvc_member_last4 text;

-- 2) Owner verifications table
create table if not exists public.owner_verifications (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references public.profiles(id) on delete cascade,
  status text not null default 'not_started'
    check (status in ('not_started','submitted','approved','rejected')),
  submitted_at timestamptz,
  approved_at timestamptz,
  rejected_at timestamptz,
  reviewed_by uuid,
  review_notes text,
  proof_files jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- updated_at trigger (assumes public.set_updated_at() exists)
do $$
begin
  if exists (
    select 1
    from pg_proc
    where proname = 'set_updated_at'
      and pg_function_is_visible(oid)
  ) then
    drop trigger if exists owner_verifications_updated_at on public.owner_verifications;
    create trigger owner_verifications_updated_at
      before update on public.owner_verifications
      for each row execute function public.set_updated_at();
  end if;
end $$;

alter table public.owner_verifications enable row level security;

-- 3) RLS policies
drop policy if exists "Owners can view owner verifications" on public.owner_verifications;
create policy "Owners can view owner verifications"
  on public.owner_verifications
  for select
  to authenticated
  using (owner_id = auth.uid());

drop policy if exists "Owners can insert owner verifications" on public.owner_verifications;
create policy "Owners can insert owner verifications"
  on public.owner_verifications
  for insert
  to authenticated
  with check (owner_id = auth.uid());

drop policy if exists "Owners can update owner verifications" on public.owner_verifications;
create policy "Owners can update owner verifications"
  on public.owner_verifications
  for update
  to authenticated
  using (owner_id = auth.uid() and status in ('not_started','submitted'))
  with check (owner_id = auth.uid() and status in ('not_started','submitted'));

-- service_role policy (kept for completeness; service_role bypasses RLS anyway)
drop policy if exists "Service role can manage owner verifications" on public.owner_verifications;
create policy "Service role can manage owner verifications"
  on public.owner_verifications
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- 4) Backfill: seed verifications for legacy owners table (if it exists)
do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'owners'
  ) then
    insert into public.owner_verifications (owner_id)
    select id
    from public.owners
    on conflict (owner_id) do nothing;

    update public.owner_verifications v
    set status = 'approved',
        submitted_at = coalesce(v.submitted_at, o.verified_at),
        approved_at = coalesce(v.approved_at, o.verified_at)
    from public.owners o
    where o.id = v.owner_id
      and o.verification = 'verified';

    update public.profiles p
    set payout_email = coalesce(p.payout_email, o.payout_email, p.email),
        payout_email_same_as_login = coalesce(p.payout_email_same_as_login, true)
    from public.owners o
    where o.user_id = p.id
      and p.payout_email is null;
  end if;
end $$;

-- 5) Ensure payout_email is always populated (fallback to login email)
update public.profiles
set payout_email = coalesce(payout_email, email),
    payout_email_same_as_login = coalesce(payout_email_same_as_login, true)
where payout_email is null;

-- 6) Create the private bucket (this is allowed)
insert into storage.buckets (id, name, public)
values ('owner-verification', 'owner-verification', false)
on conflict (id) do nothing;

commit;

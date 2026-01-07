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

create trigger owner_verifications_updated_at
before update on public.owner_verifications
for each row execute function public.set_updated_at();

alter table public.owner_verifications enable row level security;

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

drop policy if exists "Service role can manage owner verifications" on public.owner_verifications;
create policy "Service role can manage owner verifications"
  on public.owner_verifications
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

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

update public.profiles
set payout_email = coalesce(payout_email, email),
    payout_email_same_as_login = coalesce(payout_email_same_as_login, true)
where payout_email is null;

insert into storage.buckets (id, name, public)
values ('owner-verification', 'owner-verification', false)
on conflict (id) do nothing;

alter table storage.objects enable row level security;

drop policy if exists "Owners can upload verification files" on storage.objects;
create policy "Owners can upload verification files"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'owner-verification'
    and auth.uid()::text = split_part(name, '/', 1)
  );

drop policy if exists "Owners can read verification files" on storage.objects;
create policy "Owners can read verification files"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'owner-verification'
    and auth.uid()::text = split_part(name, '/', 1)
  );

drop policy if exists "Owners can delete verification files" on storage.objects;
create policy "Owners can delete verification files"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'owner-verification'
    and auth.uid()::text = split_part(name, '/', 1)
  );

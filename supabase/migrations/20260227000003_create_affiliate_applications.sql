create table if not exists public.affiliate_applications (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'pending',
  username text not null,
  email text not null,
  company_name text,
  checks_payable_to text,
  website_url text,
  first_name text not null,
  last_name text not null,
  street_address text not null,
  additional_address text,
  city text not null,
  state_province text not null,
  phone_number text not null,
  fax_number text,
  zip_code text not null,
  country text not null default 'United States',
  payment_method text not null default 'account_credit',
  heard_about text,
  terms_accepted_at timestamptz not null,
  auth_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists affiliate_applications_status_idx
  on public.affiliate_applications (status, created_at desc);

create index if not exists affiliate_applications_email_idx
  on public.affiliate_applications (email);

create trigger affiliate_applications_updated_at
before update on public.affiliate_applications
for each row execute function public.set_updated_at();

alter table public.affiliate_applications enable row level security;

drop policy if exists "Admin can manage affiliate applications" on public.affiliate_applications;
create policy "Admin can manage affiliate applications"
  on public.affiliate_applications
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  );

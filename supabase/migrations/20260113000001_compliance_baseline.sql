create table if not exists public.compliance_environments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  hosting_provider text not null,
  database_provider text not null,
  auth_provider text not null,
  notes text null,
  created_at timestamptz not null default now()
);

create unique index if not exists compliance_environments_name_key
  on public.compliance_environments (name);

create table if not exists public.compliance_vendors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  service_category text not null,
  data_accessed text not null,
  compliance_reference text null,
  in_scope boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index if not exists compliance_vendors_name_key
  on public.compliance_vendors (name);

create table if not exists public.compliance_data_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists compliance_data_categories_name_key
  on public.compliance_data_categories (name);

create table if not exists public.compliance_components (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null,
  in_scope boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index if not exists compliance_components_name_key
  on public.compliance_components (name);

alter table public.compliance_environments enable row level security;
alter table public.compliance_vendors enable row level security;
alter table public.compliance_data_categories enable row level security;
alter table public.compliance_components enable row level security;

drop policy if exists "Compliance environments admin access" on public.compliance_environments;
create policy "Compliance environments admin access"
on public.compliance_environments
for all
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);

drop policy if exists "Compliance vendors admin access" on public.compliance_vendors;
create policy "Compliance vendors admin access"
on public.compliance_vendors
for all
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);

drop policy if exists "Compliance data categories admin access" on public.compliance_data_categories;
create policy "Compliance data categories admin access"
on public.compliance_data_categories
for all
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);

drop policy if exists "Compliance components admin access" on public.compliance_components;
create policy "Compliance components admin access"
on public.compliance_components
for all
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);

insert into public.compliance_environments (name, hosting_provider, database_provider, auth_provider, notes)
values
  ('Production', 'TBD', 'Supabase', 'Supabase', 'Public production environment.'),
  ('Staging', 'TBD', 'Supabase', 'Supabase', 'Staging environment if provisioned.'),
  ('Development', 'Local/Engineer workstation', 'Supabase', 'Supabase', 'Local development environment.')
on conflict (name) do nothing;

insert into public.compliance_vendors (name, service_category, data_accessed, compliance_reference, in_scope)
values
  ('Supabase', 'DB/Auth', 'PII, admin audit data', 'SOC 2 Type II', true),
  ('Stripe', 'Payments', 'Payment metadata', 'SOC 2 / PCI', true),
  ('PayPal', 'Payments', 'Payment metadata', 'SOC 2 / PCI', true),
  ('Hosting provider', 'Hosting', 'PII, application logs', 'TBD', true),
  ('Email provider', 'Email', 'PII, communications', 'TBD', true)
on conflict (name) do nothing;

insert into public.compliance_data_categories (name, description)
values
  ('PII', 'Names, emails, phone numbers, addresses'),
  ('Payment metadata', 'Payment intents, processor references, non-card details'),
  ('Contracts / agreements', 'Booking agreements and owner contracts'),
  ('Operational logs', 'System and application logs'),
  ('Admin audit data', 'Admin actions and audit trails')
on conflict (name) do nothing;

insert into public.compliance_components (name, description, in_scope)
values
  ('Public web app', 'Guest-facing web experience and marketing site', true),
  ('Admin interface', 'Back-office tools for operations and support', true),
  ('Payments processing', 'Payment collection and transaction ledger', true),
  ('Matching engine', 'Automated booking match generation', true),
  ('Reporting / ledger', 'Operational and finance reporting surfaces', true)
on conflict (name) do nothing;

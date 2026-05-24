create table if not exists public.outbound_emails (
  id uuid primary key default gen_random_uuid(),
  template_key text not null,
  recipient_email text not null,
  recipient_user_id uuid null,
  related_entity_type text null,
  related_entity_id uuid null,
  subject text not null,
  status text not null check (status in ('pending', 'sent', 'failed')),
  provider text not null,
  provider_message_id text null,
  error_message text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  sent_at timestamptz null,
  failed_at timestamptz null
);

create index if not exists outbound_emails_recipient_email_idx
  on public.outbound_emails (recipient_email);

create index if not exists outbound_emails_template_key_idx
  on public.outbound_emails (template_key);

create index if not exists outbound_emails_status_idx
  on public.outbound_emails (status);

create index if not exists outbound_emails_created_at_desc_idx
  on public.outbound_emails (created_at desc);

alter table public.outbound_emails enable row level security;

drop policy if exists "Outbound emails admin access" on public.outbound_emails;
create policy "Outbound emails admin access"
on public.outbound_emails
for all
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

drop policy if exists outbound_emails_service_role on public.outbound_emails;
create policy outbound_emails_service_role
on public.outbound_emails
for all
to service_role
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

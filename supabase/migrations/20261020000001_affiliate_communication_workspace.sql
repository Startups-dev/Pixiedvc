-- Affiliate communication context and idempotent transactional email tracking.
-- Existing inbox conversations remain staff-only; these links add context only.

alter table public.support_conversations
  add column if not exists affiliate_id uuid references public.affiliates(id) on delete set null,
  add column if not exists affiliate_application_id uuid references public.affiliate_applications(id) on delete set null;

create index if not exists support_conversations_affiliate_id_idx
  on public.support_conversations (affiliate_id, updated_at desc)
  where affiliate_id is not null;

create index if not exists support_conversations_affiliate_application_id_idx
  on public.support_conversations (affiliate_application_id)
  where affiliate_application_id is not null;

alter table public.outbound_emails
  add column if not exists idempotency_key text,
  add column if not exists provider_delivery_status text not null default 'unknown';

create unique index if not exists affiliate_applications_one_active_per_email_uidx
  on public.affiliate_applications (lower(email))
  where status in ('pending', 'approved');

update public.outbound_emails
set provider_delivery_status = 'accepted'
where status = 'sent' and provider_delivery_status = 'unknown';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'outbound_emails_provider_delivery_status_check'
      and conrelid = 'public.outbound_emails'::regclass
  ) then
    alter table public.outbound_emails
      add constraint outbound_emails_provider_delivery_status_check
      check (provider_delivery_status in ('unknown', 'accepted', 'delivered', 'delayed', 'bounced', 'complained', 'failed', 'suppressed'));
  end if;
end;
$$;

create unique index if not exists outbound_emails_idempotency_key_uidx
  on public.outbound_emails (idempotency_key)
  where idempotency_key is not null;

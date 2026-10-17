-- Phase 2 Zoho Mail ingestion. No mailbox contents are imported by this migration.
alter table public.support_conversations
  drop constraint if exists support_conversations_inbox_source_check;
alter table public.support_conversations
  add constraint support_conversations_inbox_source_check
  check (inbox_source in ('support_handoff', 'contact_form', 'email'));

alter table public.support_messages
  add column if not exists inbox_idempotency_key text;
alter table public.support_messages
  drop constraint if exists support_messages_delivery_status_check;
alter table public.support_messages
  add constraint support_messages_delivery_status_check
  check (delivery_status is null or delivery_status in ('pending', 'sending', 'sent', 'failed', 'not_applicable'));
create unique index if not exists support_messages_inbox_idempotency_uidx
  on public.support_messages(inbox_idempotency_key)
  where inbox_idempotency_key is not null;

create table if not exists public.support_email_connection (
  singleton boolean primary key default true check (singleton),
  zoho_account_id text,
  zoho_inbox_folder_id text,
  refresh_token_ciphertext text,
  access_token_ciphertext text,
  access_token_expires_at timestamptz,
  webhook_secret_ciphertext text,
  refresh_token_expires_at timestamptz,
  connected_at timestamptz,
  import_started_at timestamptz,
  last_webhook_at timestamptz,
  last_reconciled_at timestamptz,
  reconcile_start integer not null default 1 check (reconcile_start > 0),
  last_error text,
  updated_at timestamptz not null default now()
);

create table if not exists public.support_email_message_links (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('zoho', 'resend')),
  provider_message_id text not null,
  rfc_message_id text,
  provider_thread_id text,
  direction text not null check (direction in ('inbound', 'outbound')),
  conversation_id uuid not null references public.support_conversations(id) on delete cascade,
  support_message_id uuid references public.support_messages(id) on delete set null,
  related_message_ids text[] not null default '{}',
  occurred_at timestamptz,
  created_at timestamptz not null default now(),
  unique(provider, provider_message_id)
);

create unique index if not exists support_email_message_links_rfc_uidx
  on public.support_email_message_links(provider, rfc_message_id)
  where rfc_message_id is not null;
create index if not exists support_email_message_links_conversation_idx
  on public.support_email_message_links(conversation_id, occurred_at desc);

create table if not exists public.support_email_webhook_events (
  id bigint generated always as identity primary key,
  provider text not null check (provider in ('zoho', 'resend')),
  event_id text not null,
  event_type text not null,
  status text not null default 'pending' check (status in ('pending', 'processed', 'failed', 'ignored')),
  error_code text,
  provider_message_id text,
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  unique(provider, event_id)
);

alter table public.support_email_connection enable row level security;
alter table public.support_email_message_links enable row level security;
alter table public.support_email_webhook_events enable row level security;
revoke all on public.support_email_connection from anon, authenticated;
revoke all on public.support_email_message_links from anon, authenticated;
revoke all on public.support_email_webhook_events from anon, authenticated;
grant all on public.support_email_connection to service_role;
grant all on public.support_email_message_links to service_role;
grant all on public.support_email_webhook_events to service_role;
grant usage, select on sequence public.support_email_webhook_events_id_seq to service_role;

create or replace function public.import_zoho_support_email(
  p_provider_message_id text,
  p_provider_thread_id text,
  p_rfc_message_id text,
  p_references text[],
  p_sender_email text,
  p_sender_name text,
  p_subject text,
  p_body text,
  p_occurred_at timestamptz
) returns table(conversation_id uuid, support_message_id uuid, inserted boolean)
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_conversation_id uuid;
  v_message_id uuid;
  v_existing public.support_email_message_links%rowtype;
begin
  select * into v_existing from public.support_email_message_links
  where provider = 'zoho' and provider_message_id = p_provider_message_id;
  if found then
    return query select v_existing.conversation_id, v_existing.support_message_id, false;
    return;
  end if;

  select links.conversation_id into v_conversation_id
  from public.support_email_message_links links
  where links.rfc_message_id = any(coalesce(p_references, '{}'::text[]))
  order by array_position(coalesce(p_references, '{}'::text[]), links.rfc_message_id)
  limit 1;

  if v_conversation_id is null and nullif(trim(p_provider_thread_id), '') is not null then
    select links.conversation_id into v_conversation_id
    from public.support_email_message_links links
    where links.provider = 'zoho' and links.provider_thread_id = p_provider_thread_id
    order by links.occurred_at desc
    limit 1;
  end if;

  if v_conversation_id is null then
    insert into public.support_conversations (
      guest_email, guest_name, guest_type, topic, intake_message, inbox_source,
      inbox_status, unread_for_staff, status, created_at, updated_at, context
    ) values (
      lower(trim(p_sender_email)), nullif(trim(p_sender_name), ''), 'anonymous',
      nullif(trim(p_subject), ''), left(p_body, 10000), 'email',
      'needs_reply', true, 'handoff', p_occurred_at, p_occurred_at,
      jsonb_build_object('channel', 'zoho_email')
    ) returning id into v_conversation_id;
  end if;

  insert into public.support_messages (
    conversation_id, sender, sender_type, sender_display_name, content, message,
    visibility, metadata, created_at
  ) values (
    v_conversation_id, 'guest', 'guest', nullif(trim(p_sender_name), ''),
    left(p_body, 10000), left(p_body, 10000), 'customer',
    jsonb_build_object('channel', 'email', 'provider', 'zoho'), p_occurred_at
  ) returning id into v_message_id;

  insert into public.support_email_message_links (
    provider, provider_message_id, rfc_message_id, provider_thread_id,
    direction, conversation_id, support_message_id, related_message_ids, occurred_at
  ) values (
    'zoho', p_provider_message_id, nullif(trim(p_rfc_message_id), ''),
    nullif(trim(p_provider_thread_id), ''), 'inbound', v_conversation_id,
    v_message_id, coalesce(p_references, '{}'::text[]), p_occurred_at
  );

  return query select v_conversation_id, v_message_id, true;
end;
$$;

revoke all on function public.import_zoho_support_email(text, text, text, text[], text, text, text, text, timestamptz) from public, anon, authenticated;
grant execute on function public.import_zoho_support_email(text, text, text, text[], text, text, text, text, timestamptz) to service_role;

create or replace function public.link_resend_support_email(
  p_rfc_message_id text,
  p_conversation_id uuid
) returns void
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_orphan_id uuid;
begin
  for v_orphan_id in
    select distinct links.conversation_id
    from public.support_email_message_links links
    where links.provider = 'zoho'
      and links.direction = 'inbound'
      and links.conversation_id <> p_conversation_id
      and links.related_message_ids @> array[p_rfc_message_id]
  loop
    update public.support_messages set conversation_id = p_conversation_id where conversation_id = v_orphan_id;
    update public.support_email_message_links set conversation_id = p_conversation_id where conversation_id = v_orphan_id;
    update public.outbound_emails
      set related_entity_id = p_conversation_id
      where related_entity_type = 'support_conversation' and related_entity_id = v_orphan_id;
    delete from public.support_conversations c
    where c.id = v_orphan_id
      and c.inbox_source = 'email'
      and not exists (select 1 from public.support_messages m where m.conversation_id = c.id)
      and not exists (select 1 from public.support_email_message_links l where l.conversation_id = c.id);
  end loop;

  update public.support_conversations
  set inbox_status = 'needs_reply', unread_for_staff = true,
      status = case when status = 'closed' then 'handoff' else status end,
      closed_at = null, updated_at = greatest(now(), updated_at)
  where id = p_conversation_id;
end;
$$;

revoke all on function public.link_resend_support_email(text, uuid) from public, anon, authenticated;
grant execute on function public.link_resend_support_email(text, uuid) to service_role;

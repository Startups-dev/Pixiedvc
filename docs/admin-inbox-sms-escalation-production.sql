-- SQL Editor copy of supabase/migrations/20261021000001_admin_inbox_sms_escalation.sql.
-- Run as one transaction. No customer records are backfilled or modified.
BEGIN;

-- Durable, opt-in SMS escalation for the Admin Inbox. No existing conversations
-- are backfilled; only customer messages inserted after this trigger is installed
-- can create queued escalation events.

create table if not exists public.admin_inbox_sms_installation (
  singleton boolean primary key default true check (singleton),
  installed_at timestamptz not null default now()
);
insert into public.admin_inbox_sms_installation(singleton) values (true)
on conflict (singleton) do nothing;

create table if not exists public.admin_inbox_sms_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  phone_ciphertext text,
  phone_last4 text,
  phone_verified_at timestamptz,
  opted_in boolean not null default false,
  enabled boolean not null default false,
  new_inquiry_enabled boolean not null default true,
  assigned_reply_enabled boolean not null default true,
  escalation_delay_minutes integer not null default 5
    check (escalation_delay_minutes between 1 and 60),
  quiet_hours_enabled boolean not null default false,
  quiet_hours_start time,
  quiet_hours_end time,
  time_zone text not null default 'America/Toronto',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_inbox_sms_phone_last4_check
    check (phone_last4 is null or phone_last4 ~ '^[0-9]{4}$'),
  constraint admin_inbox_sms_quiet_hours_check
    check (not quiet_hours_enabled or (quiet_hours_start is not null and quiet_hours_end is not null))
);

create table if not exists public.admin_inbox_sms_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  phone_ciphertext text not null,
  phone_last4 text not null check (phone_last4 ~ '^[0-9]{4}$'),
  code_hash text not null,
  status text not null default 'pending'
    check (status in ('pending', 'verified', 'expired', 'failed')),
  attempts integer not null default 0 check (attempts between 0 and 5),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  verified_at timestamptz
);

create index if not exists admin_inbox_sms_verifications_user_created_idx
  on public.admin_inbox_sms_verifications(user_id, created_at desc);

create table if not exists public.admin_inbox_sms_events (
  id uuid primary key default gen_random_uuid(),
  event_key text not null unique,
  event_type text not null check (event_type in ('new_inquiry', 'assigned_reply', 'verification', 'test')),
  conversation_id uuid references public.support_conversations(id) on delete set null,
  source_message_id uuid references public.support_messages(id) on delete set null,
  recipient_user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'queued'
    check (status in ('queued', 'sending', 'accepted', 'delivered', 'failed', 'cancelled', 'unknown')),
  due_at timestamptz not null default now(),
  provider_message_sid text unique,
  provider_status text,
  error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  attempted_at timestamptz,
  accepted_at timestamptz,
  delivered_at timestamptz
);

create index if not exists admin_inbox_sms_events_due_idx
  on public.admin_inbox_sms_events(status, due_at)
  where event_type in ('new_inquiry', 'assigned_reply') and status = 'queued';
create index if not exists admin_inbox_sms_events_recipient_recent_idx
  on public.admin_inbox_sms_events(recipient_user_id, accepted_at desc)
  where accepted_at is not null;
create index if not exists admin_inbox_sms_events_conversation_idx
  on public.admin_inbox_sms_events(conversation_id, recipient_user_id, created_at desc)
  where conversation_id is not null;
create unique index if not exists admin_inbox_sms_one_queued_escalation_per_thread_uidx
  on public.admin_inbox_sms_events(conversation_id, recipient_user_id, event_type)
  where event_type in ('new_inquiry', 'assigned_reply') and status = 'queued';

create table if not exists public.admin_inbox_sms_callbacks (
  id uuid primary key default gen_random_uuid(),
  provider_message_sid text not null,
  provider_status text not null,
  error_code text,
  received_at timestamptz not null default now(),
  applied_at timestamptz,
  unique(provider_message_sid, provider_status)
);
create index if not exists admin_inbox_sms_callbacks_sid_received_idx
  on public.admin_inbox_sms_callbacks(provider_message_sid, received_at desc);

alter table public.admin_inbox_sms_preferences enable row level security;
alter table public.admin_inbox_sms_verifications enable row level security;
alter table public.admin_inbox_sms_events enable row level security;
alter table public.admin_inbox_sms_callbacks enable row level security;
alter table public.admin_inbox_sms_installation enable row level security;

revoke all on public.admin_inbox_sms_preferences from public, anon, authenticated;
revoke all on public.admin_inbox_sms_verifications from public, anon, authenticated;
revoke all on public.admin_inbox_sms_events from public, anon, authenticated;
revoke all on public.admin_inbox_sms_callbacks from public, anon, authenticated;
revoke all on public.admin_inbox_sms_installation from public, anon, authenticated;
grant all on public.admin_inbox_sms_preferences to service_role;
grant all on public.admin_inbox_sms_verifications to service_role;
grant all on public.admin_inbox_sms_events to service_role;
grant all on public.admin_inbox_sms_callbacks to service_role;
grant all on public.admin_inbox_sms_installation to service_role;

create or replace function public.reserve_admin_inbox_sms_send(
  p_recipient_user_id uuid,
  p_event_id uuid,
  p_now timestamptz default now()
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_recipient_user_id::text, 971031));
  select count(*) into v_count
  from public.admin_inbox_sms_events as e
  where e.recipient_user_id = p_recipient_user_id
    and e.id <> p_event_id
    and e.attempted_at >= p_now - interval '1 minute';
  if v_count >= 1 then return false; end if;
  select count(*) into v_count
  from public.admin_inbox_sms_events as e
  where e.recipient_user_id = p_recipient_user_id
    and e.id <> p_event_id
    and e.attempted_at >= p_now - interval '1 hour';
  if v_count >= 3 then return false; end if;
  select count(*) into v_count
  from public.admin_inbox_sms_events as e
  where e.recipient_user_id = p_recipient_user_id
    and e.id <> p_event_id
    and e.attempted_at >= p_now - interval '1 day';
  if v_count >= 10 then return false; end if;
  return true;
end;
$$;

revoke all on function public.reserve_admin_inbox_sms_send(uuid, uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.reserve_admin_inbox_sms_send(uuid, uuid, timestamptz) to service_role;

create or replace function public.reserve_admin_inbox_sms_verification(
  p_user_id uuid,
  p_now timestamptz default now()
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text, 971032));
  select count(*) into v_count
  from public.admin_inbox_sms_verifications as v
  where v.user_id = p_user_id
    and v.created_at >= p_now - interval '1 hour';
  return v_count < 3;
end;
$$;

revoke all on function public.reserve_admin_inbox_sms_verification(uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.reserve_admin_inbox_sms_verification(uuid, timestamptz) to service_role;

create or replace function public.queue_admin_inbox_sms_for_message(p_message_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_message public.support_messages%rowtype;
  v_assigned_user_id uuid;
  v_inbox_source text;
  v_inbox_status text;
  v_latest_staff_reply timestamptz;
  v_pref record;
  v_kind text;
begin
  select * into v_message from public.support_messages where id = p_message_id;
  if not found
     or coalesce(v_message.sender_type, v_message.sender) <> 'guest'
     or coalesce(v_message.visibility, 'customer') <> 'customer'
     or coalesce(v_message.metadata ->> 'historical_import', 'false') = 'true'
     or coalesce(v_message.metadata ->> 'source', '') in ('historical_import', 'legacy_backfill') then
    return;
  end if;

  select c.inbox_source, c.inbox_status into v_inbox_source, v_inbox_status
  from public.support_conversations as c
  where c.id = v_message.conversation_id;
  select h.assigned_agent_user_id into v_assigned_user_id
  from public.support_handoffs as h
  where h.conversation_id = v_message.conversation_id;
  if v_inbox_status <> 'needs_reply' then return; end if;
  if v_inbox_source not in ('contact_form', 'email') and not exists (
    select 1 from public.support_handoffs as h where h.conversation_id = v_message.conversation_id
  ) then
    return;
  end if;

  select max(m.created_at) into v_latest_staff_reply
  from public.support_messages as m
  where m.conversation_id = v_message.conversation_id
    and coalesce(m.sender_type, m.sender) = 'agent'
    and coalesce(m.visibility, 'customer') = 'customer'
    and m.delivery_status = 'sent';

  if v_assigned_user_id is not null then
    v_kind := 'assigned_reply';
    for v_pref in
      select p.user_id, p.escalation_delay_minutes
      from public.admin_inbox_sms_preferences as p
      where p.user_id = v_assigned_user_id
        and p.opted_in = true and p.enabled = true
        and p.assigned_reply_enabled = true and p.phone_verified_at is not null
    loop
      if not exists (
        select 1 from public.admin_inbox_sms_events as e
        where e.conversation_id = v_message.conversation_id
          and e.recipient_user_id = v_pref.user_id
          and e.event_type = v_kind
          and e.status in ('queued', 'sending', 'accepted', 'delivered')
          and e.created_at > coalesce(v_latest_staff_reply, '-infinity'::timestamptz)
      ) then
        insert into public.admin_inbox_sms_events (
          event_key, event_type, conversation_id, source_message_id,
          recipient_user_id, due_at
        ) values (
          'assigned_reply:' || v_message.id::text || ':' || v_pref.user_id::text,
          v_kind, v_message.conversation_id, v_message.id, v_pref.user_id,
          coalesce(v_message.created_at, now()) + make_interval(mins => v_pref.escalation_delay_minutes)
        ) on conflict do nothing;
      end if;
    end loop;
  else
    v_kind := 'new_inquiry';
    for v_pref in
      select p.user_id, p.escalation_delay_minutes
      from public.admin_inbox_sms_preferences as p
      where p.opted_in = true and p.enabled = true
        and p.new_inquiry_enabled = true and p.phone_verified_at is not null
    loop
      if not exists (
        select 1 from public.admin_inbox_sms_events as e
        where e.conversation_id = v_message.conversation_id
          and e.recipient_user_id = v_pref.user_id
          and e.event_type = v_kind
          and e.status in ('queued', 'sending', 'accepted', 'delivered')
          and e.created_at > coalesce(v_latest_staff_reply, '-infinity'::timestamptz)
      ) then
        insert into public.admin_inbox_sms_events (
          event_key, event_type, conversation_id, source_message_id,
          recipient_user_id, due_at
        ) values (
          'new_inquiry:' || v_message.id::text || ':' || v_pref.user_id::text,
          v_kind, v_message.conversation_id, v_message.id, v_pref.user_id,
          coalesce(v_message.created_at, now()) + make_interval(mins => v_pref.escalation_delay_minutes)
        ) on conflict do nothing;
      end if;
    end loop;
  end if;
  return;
end;
$$;

create or replace function public.queue_admin_inbox_sms_escalation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.queue_admin_inbox_sms_for_message(new.id);
  return new;
end;
$$;

create or replace function public.queue_admin_inbox_sms_after_handoff()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_message_id uuid;
  v_installed_at timestamptz;
begin
  if new.assigned_agent_user_id is not null then return new; end if;
  select i.installed_at into v_installed_at
  from public.admin_inbox_sms_installation as i
  where i.singleton = true;
  if v_installed_at is null then return new; end if;
  select m.id into v_message_id
  from public.support_messages as m
  where m.conversation_id = new.conversation_id
    and coalesce(m.sender_type, m.sender) = 'guest'
    and coalesce(m.visibility, 'customer') = 'customer'
    and m.created_at >= v_installed_at
    and coalesce(m.metadata ->> 'historical_import', 'false') <> 'true'
    and coalesce(m.metadata ->> 'source', '') not in ('historical_import', 'legacy_backfill')
  order by m.created_at desc, m.id desc
  limit 1;
  if v_message_id is not null then
    perform public.queue_admin_inbox_sms_for_message(v_message_id);
  end if;
  return new;
end;
$$;

create or replace function public.cancel_admin_inbox_sms_escalation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_table_name = 'support_handoffs' then
    if new.assigned_agent_user_id is not null
       and (tg_op = 'INSERT' or new.assigned_agent_user_id is distinct from old.assigned_agent_user_id) then
      update public.admin_inbox_sms_events
      set status = 'cancelled', updated_at = now(), error_code = null
      where conversation_id = new.conversation_id and status = 'queued'
        and event_type in ('new_inquiry', 'assigned_reply');
    end if;
  elsif tg_table_name = 'support_conversations' then
    if new.inbox_status = 'closed' and old.inbox_status is distinct from new.inbox_status then
      update public.admin_inbox_sms_events
      set status = 'cancelled', updated_at = now(), error_code = null
      where conversation_id = new.id and status = 'queued'
        and event_type in ('new_inquiry', 'assigned_reply');
    end if;
  elsif tg_table_name = 'support_messages' then
    if coalesce(new.sender_type, new.sender) = 'agent'
       and coalesce(new.visibility, 'customer') = 'customer'
       and new.delivery_status = 'sent'
       and old.delivery_status is distinct from new.delivery_status then
      update public.admin_inbox_sms_events
      set status = 'cancelled', updated_at = now(), error_code = null
      where conversation_id = new.conversation_id and status = 'queued'
        and event_type in ('new_inquiry', 'assigned_reply');
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists support_customer_message_queue_sms on public.support_messages;
create trigger support_customer_message_queue_sms
after insert on public.support_messages
for each row execute function public.queue_admin_inbox_sms_escalation();

drop trigger if exists support_handoff_queue_sms on public.support_handoffs;
create trigger support_handoff_queue_sms
after insert on public.support_handoffs
for each row execute function public.queue_admin_inbox_sms_after_handoff();

drop trigger if exists support_handoff_cancel_sms on public.support_handoffs;
create trigger support_handoff_cancel_sms
after insert or update of assigned_agent_user_id on public.support_handoffs
for each row execute function public.cancel_admin_inbox_sms_escalation();

drop trigger if exists support_conversation_cancel_sms on public.support_conversations;
create trigger support_conversation_cancel_sms
after update of inbox_status on public.support_conversations
for each row execute function public.cancel_admin_inbox_sms_escalation();

drop trigger if exists support_staff_reply_cancel_sms on public.support_messages;
create trigger support_staff_reply_cancel_sms
after update of delivery_status on public.support_messages
for each row execute function public.cancel_admin_inbox_sms_escalation();

revoke all on function public.queue_admin_inbox_sms_for_message(uuid) from public, anon, authenticated;
revoke all on function public.queue_admin_inbox_sms_escalation() from public, anon, authenticated;
revoke all on function public.queue_admin_inbox_sms_after_handoff() from public, anon, authenticated;
revoke all on function public.cancel_admin_inbox_sms_escalation() from public, anon, authenticated;
grant execute on function public.queue_admin_inbox_sms_for_message(uuid) to service_role;
grant execute on function public.queue_admin_inbox_sms_escalation() to service_role;
grant execute on function public.queue_admin_inbox_sms_after_handoff() to service_role;
grant execute on function public.cancel_admin_inbox_sms_escalation() to service_role;

-- Record only this reviewed forward migration for SQL Editor execution.
insert into supabase_migrations.schema_migrations (version, statements, name)
values ('20261021000001', null, 'admin_inbox_sms_escalation')
on conflict (version) do nothing;

COMMIT;

alter table public.support_conversations
  add column if not exists inbox_source text not null default 'support_handoff',
  add column if not exists inbox_status text not null default 'needs_reply',
  add column if not exists unread_for_staff boolean not null default true,
  add column if not exists contact_fingerprint text,
  add column if not exists contact_ack_status text,
  add column if not exists contact_staff_alert_status text;

alter table public.support_conversations
  drop constraint if exists support_conversations_inbox_source_check;
alter table public.support_conversations
  add constraint support_conversations_inbox_source_check
  check (inbox_source in ('support_handoff', 'contact_form'));

alter table public.support_conversations
  drop constraint if exists support_conversations_inbox_status_check;
alter table public.support_conversations
  add constraint support_conversations_inbox_status_check
  check (inbox_status in ('needs_reply', 'waiting_customer', 'closed'));

alter table public.support_messages
  add column if not exists visibility text not null default 'customer',
  add column if not exists delivery_status text;

alter table public.support_messages
  drop constraint if exists support_messages_visibility_check;
alter table public.support_messages
  add constraint support_messages_visibility_check
  check (visibility in ('customer', 'internal'));

alter table public.support_messages
  drop constraint if exists support_messages_delivery_status_check;
alter table public.support_messages
  add constraint support_messages_delivery_status_check
  check (delivery_status is null or delivery_status in ('pending', 'sent', 'failed', 'not_applicable'));

update public.support_messages
set visibility = 'internal'
where sender_type = 'internal_note'
   or coalesce(message, content, '') ~* '^\s*\[internal note\]';

with latest_message as (
  select distinct on (conversation_id)
    conversation_id,
    coalesce(sender_type, sender) as sender_type,
    created_at
  from public.support_messages
  order by conversation_id, created_at desc, id desc
)
update public.support_conversations c
set inbox_status = case
      when c.status = 'closed' then 'closed'
      when latest.sender_type in ('agent', 'internal_note') then 'waiting_customer'
      else 'needs_reply'
    end,
    unread_for_staff = case
      when c.status = 'closed' then false
      else coalesce(latest.sender_type not in ('agent', 'internal_note', 'system'), true)
    end,
    updated_at = greatest(c.updated_at, coalesce(latest.created_at, c.updated_at))
from (
  select c2.id as conversation_id, lm.sender_type, lm.created_at
  from public.support_conversations c2
  left join latest_message lm on lm.conversation_id = c2.id
) latest
where latest.conversation_id = c.id;

create unique index if not exists support_conversations_contact_fingerprint_uidx
  on public.support_conversations (contact_fingerprint)
  where inbox_source = 'contact_form' and contact_fingerprint is not null;

create index if not exists support_conversations_inbox_queue_idx
  on public.support_conversations (inbox_status, unread_for_staff, updated_at desc);

create table if not exists public.contact_submission_attempts (
  id bigint generated always as identity primary key,
  ip_fingerprint text not null,
  created_at timestamptz not null default now()
);

create index if not exists contact_submission_attempts_ip_time_idx
  on public.contact_submission_attempts (ip_fingerprint, created_at desc);

alter table public.contact_submission_attempts enable row level security;
revoke all on public.contact_submission_attempts from anon, authenticated;
grant all on public.contact_submission_attempts to service_role;
grant usage, select on sequence public.contact_submission_attempts_id_seq to service_role;

create or replace function public.on_support_customer_message_for_inbox()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inbox_source text;
  v_has_handoff boolean;
begin
  if coalesce(new.sender_type, new.sender) = 'guest' and new.visibility = 'customer' then
    select inbox_source into v_inbox_source
    from public.support_conversations
    where id = new.conversation_id;

    select exists (
      select 1 from public.support_handoffs
      where conversation_id = new.conversation_id
    ) into v_has_handoff;

    update public.support_conversations
    set inbox_status = 'needs_reply',
        unread_for_staff = true,
        status = case when status = 'closed' then 'handoff' else status end,
        closed_at = null,
        updated_at = greatest(now(), coalesce(new.created_at, now()))
    where id = new.conversation_id;

    if v_inbox_source = 'contact_form' or v_has_handoff then
      insert into public.support_handoffs (conversation_id, status)
      values (new.conversation_id, 'open')
      on conflict (conversation_id) do update
        set status = case when support_handoffs.status in ('closed', 'resolved') then 'open' else support_handoffs.status end,
            closed_at = null,
            resolved_at = null;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists support_customer_message_inbox_state on public.support_messages;
create trigger support_customer_message_inbox_state
after insert on public.support_messages
for each row execute function public.on_support_customer_message_for_inbox();

grant execute on function public.on_support_customer_message_for_inbox() to service_role;

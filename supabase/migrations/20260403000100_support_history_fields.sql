alter table if exists public.support_agents
  add column if not exists nickname text;

alter table if exists public.support_conversations
  add column if not exists guest_type text not null default 'anonymous',
  add column if not exists agent_user_id uuid references auth.users,
  add column if not exists agent_nickname text,
  add column if not exists source_page text,
  add column if not exists summary text,
  add column if not exists tags text[] default '{}',
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists closed_at timestamptz;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'support_conversations'
      and column_name = 'status'
  ) then
    alter table public.support_conversations
      drop constraint if exists support_conversations_status_check;
    alter table public.support_conversations
      add constraint support_conversations_status_check
      check (status in ('ai','handoff','open','claimed','closed'));
  end if;
end $$;

alter table if exists public.support_messages
  add column if not exists sender_type text,
  add column if not exists sender_user_id uuid references auth.users,
  add column if not exists sender_display_name text,
  add column if not exists message text;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'support_messages'
      and column_name = 'sender'
  ) then
    alter table public.support_messages
      drop constraint if exists support_messages_sender_check;
    alter table public.support_messages
      add constraint support_messages_sender_check
      check (sender in ('guest','ai','agent','system'));
  end if;
end $$;

update public.support_messages
set
  sender_type = coalesce(sender_type, sender),
  message = coalesce(message, content),
  sender_user_id = coalesce(sender_user_id, agent_user_id),
  sender_display_name = coalesce(
    sender_display_name,
    case
      when coalesce(sender_type, sender) = 'ai' then 'Pixie Concierge'
      when coalesce(sender_type, sender) = 'agent' then 'Concierge'
      when coalesce(sender_type, sender) = 'guest' then 'Guest'
      when coalesce(sender_type, sender) = 'system' then 'System'
      else 'System'
    end
  )
where sender_type is null
   or message is null
   or sender_display_name is null;

update public.support_conversations
set
  source_page = coalesce(source_page, page_url),
  guest_type = coalesce(
    guest_type,
    case
      when guest_user_id is null then 'anonymous'
      else 'authenticated'
    end
  ),
  updated_at = coalesce(updated_at, created_at, now())
where source_page is null
   or guest_type is null
   or updated_at is null;

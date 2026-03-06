alter table if exists public.support_conversations
  add column if not exists page_url text,
  add column if not exists context jsonb not null default '{}'::jsonb,
  add column if not exists guest_name text,
  add column if not exists topic text,
  add column if not exists intake_message text;

alter table if exists public.support_messages
  add column if not exists metadata jsonb not null default '{}'::jsonb;

-- Forward-only compatibility repair for production databases where the earlier
-- support history migration is absent from schema_migrations but support
-- messages still have the legacy sender/content columns.
-- Apply before 20261018000002_unified_communication_inbox.sql.

-- This table may already exist from an earlier partial/manual setup. Adding a
-- nullable fingerprint preserves old attempt rows without inventing an IP.
create table if not exists public.contact_submission_attempts (
  id bigint generated always as identity primary key,
  ip_fingerprint text not null,
  created_at timestamptz not null default now()
);

alter table public.contact_submission_attempts
  add column if not exists ip_fingerprint text;

alter table public.support_messages
  add column if not exists sender_type text,
  add column if not exists sender_user_id uuid references auth.users(id),
  add column if not exists sender_display_name text,
  add column if not exists message text;

update public.support_messages
set
  sender_type = coalesce(sender_type, sender),
  message = coalesce(message, content),
  sender_user_id = coalesce(sender_user_id, agent_user_id),
  sender_display_name = coalesce(
    sender_display_name,
    case coalesce(sender_type, sender)
      when 'ai' then 'Pixie Concierge'
      when 'agent' then 'Concierge'
      when 'guest' then 'Guest'
      when 'system' then 'System'
      else 'System'
    end
  )
where sender_type is null
   or message is null
   or sender_display_name is null;

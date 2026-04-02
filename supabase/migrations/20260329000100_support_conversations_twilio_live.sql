alter table if exists public.support_conversations
  add column if not exists guest_user_id uuid references auth.users,
  add column if not exists twilio_conversation_sid text unique,
  add column if not exists handoff_mode text not null default 'offline'
    check (handoff_mode in ('offline', 'twilio_live'));

alter table public.email_campaigns
  add column if not exists name text null,
  add column if not exists body_text text null,
  add column if not exists content_json jsonb not null default '{}'::jsonb;

create table if not exists public.admin_audit_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  admin_user_id uuid null,
  admin_email text null,
  action text not null,
  entity_type text not null,
  entity_id text not null,
  before jsonb null,
  after jsonb null,
  meta jsonb not null default '{}'::jsonb
);

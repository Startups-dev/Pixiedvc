alter table public.email_subscribers
  add column if not exists email_preferences jsonb not null default '{}'::jsonb,
  add column if not exists bounce_count integer not null default 0,
  add column if not exists last_bounced_at timestamptz,
  add column if not exists suppressed_at timestamptz,
  add column if not exists suppression_reason text,
  add column if not exists last_email_sent_at timestamptz,
  add column if not exists last_opened_at timestamptz,
  add column if not exists last_clicked_at timestamptz,
  add column if not exists welcome_sequence_started_at timestamptz,
  add column if not exists welcome_sequence_completed_at timestamptz,
  add column if not exists welcome_sequence_step integer;

alter table public.email_subscribers
  drop constraint if exists email_subscribers_welcome_sequence_step_check;

alter table public.email_subscribers
  add constraint email_subscribers_welcome_sequence_step_check
  check (welcome_sequence_step is null or welcome_sequence_step between 0 and 30);

create index if not exists email_subscribers_suppressed_at_idx
  on public.email_subscribers (suppressed_at)
  where suppressed_at is not null;

create index if not exists email_subscribers_last_email_sent_at_desc_idx
  on public.email_subscribers (last_email_sent_at desc)
  where last_email_sent_at is not null;

create index if not exists email_subscribers_welcome_sequence_step_idx
  on public.email_subscribers (welcome_sequence_step)
  where welcome_sequence_step is not null;

create index if not exists email_subscribers_welcome_sequence_started_at_desc_idx
  on public.email_subscribers (welcome_sequence_started_at desc)
  where welcome_sequence_started_at is not null;

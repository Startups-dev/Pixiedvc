alter table public.outbound_emails
  add column if not exists retry_count integer not null default 0,
  add column if not exists last_retry_at timestamptz null;

create index if not exists outbound_emails_last_retry_at_idx
  on public.outbound_emails (last_retry_at desc);

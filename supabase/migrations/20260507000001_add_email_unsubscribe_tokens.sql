alter table public.email_subscribers
  add column if not exists unsubscribe_token_hash text,
  add column if not exists unsubscribe_token_created_at timestamptz,
  add column if not exists unsubscribe_token_rotated_at timestamptz;

create unique index if not exists email_subscribers_unsubscribe_token_hash_uidx
  on public.email_subscribers (unsubscribe_token_hash)
  where unsubscribe_token_hash is not null;

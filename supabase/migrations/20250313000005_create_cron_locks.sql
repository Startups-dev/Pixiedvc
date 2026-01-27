create table if not exists public.cron_locks (
  name text primary key,
  locked_until timestamptz not null
);

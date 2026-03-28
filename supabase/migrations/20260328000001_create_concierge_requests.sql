create table if not exists concierge_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  name text,
  email text not null,
  message text not null,
  context jsonb,
  source_page text,
  status text default 'new',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

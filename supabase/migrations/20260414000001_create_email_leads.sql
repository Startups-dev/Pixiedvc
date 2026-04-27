create table if not exists public.email_leads (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  source text not null check (source in ('hero_bar', 'post_intent', 'resort_section', 'bottom_cta')),
  created_at timestamptz not null default now(),
  unique (email, source)
);

create index if not exists email_leads_source_created_at_idx
  on public.email_leads (source, created_at desc);

alter table public.email_leads enable row level security;

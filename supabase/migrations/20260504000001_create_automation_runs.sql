create table if not exists public.automation_runs (
  id uuid primary key default gen_random_uuid(),
  automation_key text not null,
  status text not null check (status in ('running', 'completed', 'completed_with_errors', 'failed')),
  started_at timestamptz not null,
  completed_at timestamptz null,
  duration_ms integer null,
  candidates integer not null default 0,
  sent integer not null default 0,
  skipped integer not null default 0,
  errors integer not null default 0,
  last_error text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists automation_runs_automation_key_idx
  on public.automation_runs (automation_key);

create index if not exists automation_runs_created_at_desc_idx
  on public.automation_runs (created_at desc);

create index if not exists automation_runs_status_idx
  on public.automation_runs (status);

alter table public.automation_runs enable row level security;

drop policy if exists "Automation runs admin access" on public.automation_runs;
create policy "Automation runs admin access"
on public.automation_runs
for all
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);

drop policy if exists automation_runs_service_role on public.automation_runs;
create policy automation_runs_service_role
on public.automation_runs
for all
to service_role
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

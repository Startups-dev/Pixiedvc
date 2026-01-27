alter table public.admin_audit_events
  add column if not exists actor_email text default 'unknown',
  add column if not exists actor_user_id uuid null,
  add column if not exists ip text null,
  add column if not exists user_agent text null,
  add column if not exists request_id text null;

update public.admin_audit_events
set actor_email = coalesce(actor_email, admin_email, 'unknown')
where actor_email is null;

update public.admin_audit_events
set actor_user_id = coalesce(actor_user_id, admin_user_id)
where actor_user_id is null;

alter table public.admin_audit_events
  alter column actor_email set not null;

alter table public.admin_audit_events
  alter column entity_type drop not null,
  alter column entity_id drop not null;

alter table public.admin_audit_events enable row level security;

drop policy if exists "Admin audit events admin access" on public.admin_audit_events;
create policy "Admin audit events admin access"
on public.admin_audit_events
for all
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);

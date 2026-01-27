alter table public.notifications enable row level security;

-- Owners can insert notifications for themselves.
drop policy if exists "Owners can insert notifications" on public.notifications;
create policy "Owners can insert notifications"
  on public.notifications
  for insert
  with check (user_id = auth.uid());

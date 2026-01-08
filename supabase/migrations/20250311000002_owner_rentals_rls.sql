alter table public.rentals enable row level security;
alter table public.rental_milestones enable row level security;
alter table public.rental_documents enable row level security;
alter table public.payout_ledger enable row level security;
alter table public.notifications enable row level security;
alter table public.rental_exceptions enable row level security;

-- Rentals: owners can view their own rentals.
drop policy if exists "Owners can view rentals" on public.rentals;
create policy "Owners can view rentals"
  on public.rentals
  for select
  using (owner_user_id = auth.uid());

-- Milestones: owners can view their own milestones.
drop policy if exists "Owners can view milestones" on public.rental_milestones;
create policy "Owners can view milestones"
  on public.rental_milestones
  for select
  using (
    exists (
      select 1 from public.rentals r
      where r.id = rental_id
        and r.owner_user_id = auth.uid()
    )
  );

-- Owners can mark approval milestone complete.
drop policy if exists "Owners can complete approval milestone" on public.rental_milestones;
create policy "Owners can complete approval milestone"
  on public.rental_milestones
  for update
  using (
    code = 'owner_approved'
    and exists (
      select 1 from public.rentals r
      where r.id = rental_id
        and r.owner_user_id = auth.uid()
    )
  )
  with check (
    code = 'owner_approved'
    and status = 'completed'
    and exists (
      select 1 from public.rentals r
      where r.id = rental_id
        and r.owner_user_id = auth.uid()
    )
  );

-- Documents: owners can view their rental docs.
drop policy if exists "Owners can view rental documents" on public.rental_documents;
create policy "Owners can view rental documents"
  on public.rental_documents
  for select
  using (
    exists (
      select 1 from public.rentals r
      where r.id = rental_id
        and r.owner_user_id = auth.uid()
    )
  );

-- Documents: owners can upload docs for their rentals.
drop policy if exists "Owners can upload rental documents" on public.rental_documents;
create policy "Owners can upload rental documents"
  on public.rental_documents
  for insert
  with check (
    uploaded_by_user_id = auth.uid()
    and type in ('agreement_pdf','disney_confirmation_email','invoice','booking_package','other')
    and exists (
      select 1 from public.rentals r
      where r.id = rental_id
        and r.owner_user_id = auth.uid()
    )
  );

-- Payouts: owners can view their own payout ledger.
drop policy if exists "Owners can view payout ledger" on public.payout_ledger;
create policy "Owners can view payout ledger"
  on public.payout_ledger
  for select
  using (owner_user_id = auth.uid());

-- Notifications: owners can view and mark their notifications read.
drop policy if exists "Owners can view notifications" on public.notifications;
create policy "Owners can view notifications"
  on public.notifications
  for select
  using (user_id = auth.uid());

drop policy if exists "Owners can update notifications" on public.notifications;
create policy "Owners can update notifications"
  on public.notifications
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Exceptions: owners can view and create their own exceptions.
drop policy if exists "Owners can view rental exceptions" on public.rental_exceptions;
create policy "Owners can view rental exceptions"
  on public.rental_exceptions
  for select
  using (owner_user_id = auth.uid());

drop policy if exists "Owners can create rental exceptions" on public.rental_exceptions;
create policy "Owners can create rental exceptions"
  on public.rental_exceptions
  for insert
  with check (owner_user_id = auth.uid());

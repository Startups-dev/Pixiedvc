alter table public.rentals enable row level security;

-- Owners can mark their rental approved once owner_approved milestone is completed.
drop policy if exists "Owners can mark rental approved" on public.rentals;
create policy "Owners can mark rental approved"
  on public.rentals
  for update
  using (
    owner_user_id = auth.uid()
  )
  with check (
    owner_user_id = auth.uid()
    and status = 'approved'
    and exists (
      select 1
      from public.rental_milestones m
      where m.rental_id = id
        and m.code = 'owner_approved'
        and m.status = 'completed'
    )
  );

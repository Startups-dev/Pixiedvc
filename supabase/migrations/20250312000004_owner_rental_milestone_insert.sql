alter table public.rental_milestones enable row level security;

-- Owners can insert only the owner_approved milestone.
drop policy if exists "Owners can insert approval milestone" on public.rental_milestones;
create policy "Owners can insert approval milestone"
  on public.rental_milestones
  for insert
  with check (
    code = 'owner_approved'
    and status = 'completed'
    and exists (
      select 1 from public.rentals r
      where r.id = rental_id
        and r.owner_user_id = auth.uid()
    )
  );

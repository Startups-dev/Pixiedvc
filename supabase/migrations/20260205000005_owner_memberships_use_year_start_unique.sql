-- Ensure unique constraint for owner_memberships upsert

create unique index if not exists owner_memberships_owner_resort_use_year_start_uniq
  on public.owner_memberships (owner_id, resort_id, use_year, use_year_start);

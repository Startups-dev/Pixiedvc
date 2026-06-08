alter type public.ready_stay_status add value if not exists 'test';

alter table if exists public.ready_stays
  add column if not exists is_test_listing boolean not null default false,
  add column if not exists is_visible_publicly boolean not null default false,
  add column if not exists test_created_by uuid references auth.users(id) on delete set null,
  add column if not exists test_notes text,
  add column if not exists test_guest_total_cents integer,
  add column if not exists test_owner_payout_cents integer;

create index if not exists ready_stays_test_listing_idx
  on public.ready_stays (is_test_listing, is_visible_publicly, created_at desc);

create index if not exists ready_stays_test_created_by_idx
  on public.ready_stays (test_created_by, created_at desc)
  where test_created_by is not null;

drop policy if exists "Public can view active ready stays showcase" on public.ready_stays;
create policy "Public can view active ready stays showcase"
  on public.ready_stays
  for select
  to anon, authenticated
  using (
    (
      status = 'active'::ready_stay_status
      or (
        status = 'test'::ready_stay_status
        and coalesce(is_visible_publicly, false) = true
      )
    )
    and coalesce(nullif(slug, ''), '') <> ''
    and coalesce(nullif(title, ''), '') <> ''
    and coalesce(nullif(image_url, ''), '') <> ''
    and check_out >= current_date
    and (expires_at is null or expires_at > now())
  );

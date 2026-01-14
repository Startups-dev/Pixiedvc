begin;

create extension if not exists btree_gist;

create unique index if not exists affiliate_payout_runs_period_unique
  on public.affiliate_payout_runs (period_start, period_end);

-- Prevent overlapping payout runs using a GiST exclusion constraint on the DATE range.
do $$
begin
  alter table public.affiliate_payout_runs
    add constraint affiliate_payout_runs_no_overlap
    exclude using gist (
      daterange(period_start, period_end, '[]') with &&
    );
exception
  when duplicate_object then null;
end;
$$;

alter table public.affiliate_payout_runs enable row level security;
alter table public.affiliate_payout_items enable row level security;

-- Drop policies before recreating to allow rerunning this migration safely.
drop policy if exists "Affiliates can view own payout runs" on public.affiliate_payout_runs;
drop policy if exists "Admin can manage affiliate payout runs" on public.affiliate_payout_runs;

drop policy if exists "Affiliates can view own payout items" on public.affiliate_payout_items;
drop policy if exists "Admin can manage affiliate payout items" on public.affiliate_payout_items;

create policy "Affiliates can view own payout runs"
  on public.affiliate_payout_runs
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.affiliate_payout_items items
      join public.affiliates a on a.id = items.affiliate_id
      where items.payout_run_id = public.affiliate_payout_runs.id
        and a.auth_user_id = auth.uid()
    )
  );

create policy "Admin can manage affiliate payout runs"
  on public.affiliate_payout_runs
  for all
  to authenticated
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

create policy "Affiliates can view own payout items"
  on public.affiliate_payout_items
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.affiliates a
      where a.id = public.affiliate_payout_items.affiliate_id
        and a.auth_user_id = auth.uid()
    )
  );

create policy "Admin can manage affiliate payout items"
  on public.affiliate_payout_items
  for all
  to authenticated
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

commit;

begin;

create extension if not exists pgcrypto;

-- Canonical conversion -> payout run linkage
alter table if exists public.affiliate_conversions
  add column if not exists payout_run_id uuid references public.affiliate_payout_runs(id) on delete set null;

alter table if exists public.affiliate_payout_items
  add column if not exists conversion_id uuid references public.affiliate_conversions(id) on delete set null;

-- Keep one conversion per booking request (already exists in most environments)
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.affiliate_conversions'::regclass
      and contype = 'u'
      and conkey = array[
        (select attnum
         from pg_attribute
         where attrelid = 'public.affiliate_conversions'::regclass
           and attname = 'booking_request_id'
         limit 1)
      ]::smallint[]
  ) then
    alter table public.affiliate_conversions
      add constraint affiliate_conversions_booking_request_id_unique unique (booking_request_id);
  end if;
end;
$$;

-- One payout item per conversion (idempotent payout generation)
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'affiliate_payout_run_items_conversion_id_unique'
      and conrelid = 'public.affiliate_payout_items'::regclass
  ) then
    alter table public.affiliate_payout_items
      add constraint affiliate_payout_run_items_conversion_id_unique unique (conversion_id);
  end if;
end;
$$;

-- Click ingestion idempotency key
-- click_id uniqueness is already enforced by existing schema/indexes.

commit;

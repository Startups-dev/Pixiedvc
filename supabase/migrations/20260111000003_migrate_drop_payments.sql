do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'transactions'
      and column_name = 'notes'
  ) then
    alter table public.transactions add column notes text null;
  end if;
end $$;

do $$
begin
  if to_regclass('public.payments') is not null then
    insert into public.transactions (
      id,
      booking_request_id,
      match_id,
      direction,
      txn_type,
      amount_cents,
      currency,
      processor,
      processor_ref,
      status,
      paid_at,
      meta,
      notes,
      created_at,
      updated_at
    )
    select
      p.id,
      p.booking_request_id,
      p.match_id,
      p.direction,
      p.payment_type,
      p.amount_cents,
      p.currency,
      p.processor,
      p.processor_ref,
      p.status,
      p.paid_at,
      null::jsonb,
      p.notes,
      p.created_at,
      p.updated_at
    from public.payments p
    where not exists (
      select 1 from public.transactions t where t.id = p.id
    );
  end if;
end $$;

do $$
begin
  if to_regclass('public.payment_splits') is not null then
    drop table public.payment_splits;
  end if;
  if to_regclass('public.payments') is not null then
    drop table public.payments;
  end if;
end $$;

create unique index if not exists transactions_match_type_in_unique
  on public.transactions (match_id, txn_type, direction)
  where direction = 'in' and txn_type in ('deposit','booking','checkin');

alter table public.transaction_splits
  drop constraint if exists transaction_splits_tax_authority_check;

alter table public.transaction_splits
  add constraint transaction_splits_tax_authority_check
  check (
    recipient_type <> 'tax_authority' or jurisdiction_id is not null
  );

update public.tax_jurisdictions
set is_active = true
where country_code = 'BR';

update public.tax_rates
set rate_bps = 0,
    notes = 'Configure per municipality; ISS often 2–5%'
where jurisdiction_id in (
  select id from public.tax_jurisdictions where country_code = 'BR'
);

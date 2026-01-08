create type affiliate_status as enum ('active', 'paused', 'closed');
create type affiliate_lead_status as enum ('lead', 'invalid');
create type affiliate_conversion_status as enum ('pending', 'approved', 'paid', 'void');
create type affiliate_payout_status as enum ('scheduled', 'processing', 'paid', 'void');

create table if not exists public.affiliates (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  slug text not null unique,
  referral_code text unique,
  display_name text not null,
  email text not null,
  status affiliate_status not null default 'active',
  tier text not null default 'standard',
  commission_rate numeric(4,3) not null default 0.07,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.affiliate_clicks (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid not null references public.affiliates(id) on delete cascade,
  click_id uuid not null unique,
  clicked_at timestamptz not null default now(),
  landing_path text,
  referrer text,
  user_agent text,
  session_id uuid
);

create table if not exists public.affiliate_leads (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid not null references public.affiliates(id) on delete cascade,
  click_id uuid references public.affiliate_clicks(click_id) on delete set null,
  booking_request_id uuid not null unique references public.booking_requests(id) on delete cascade,
  lead_status affiliate_lead_status not null default 'lead',
  attribution_type text not null default 'last_click',
  created_at timestamptz not null default now()
);

create table if not exists public.affiliate_payouts (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid not null references public.affiliates(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  status affiliate_payout_status not null default 'scheduled',
  total_amount_usd numeric(10,2) not null default 0,
  paypal_reference text,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create table if not exists public.affiliate_conversions (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid not null references public.affiliates(id) on delete cascade,
  lead_id uuid references public.affiliate_leads(id) on delete set null,
  booking_request_id uuid not null unique references public.booking_requests(id) on delete cascade,
  status affiliate_conversion_status not null default 'pending',
  booking_amount_usd numeric(10,2),
  commission_rate numeric(4,3) not null default 0.07,
  commission_amount_usd numeric(10,2),
  confirmed_at timestamptz,
  payout_id uuid references public.affiliate_payouts(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists affiliate_clicks_affiliate_idx
  on public.affiliate_clicks (affiliate_id, clicked_at desc);

create index if not exists affiliate_clicks_click_id_idx
  on public.affiliate_clicks (click_id);

create index if not exists affiliate_leads_affiliate_idx
  on public.affiliate_leads (affiliate_id, created_at desc);

create index if not exists affiliate_conversions_affiliate_idx
  on public.affiliate_conversions (affiliate_id, created_at desc);

create index if not exists affiliate_payouts_affiliate_idx
  on public.affiliate_payouts (affiliate_id, period_start desc);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger affiliates_updated_at
before update on public.affiliates
for each row execute function public.set_updated_at();

create trigger affiliate_conversions_updated_at
before update on public.affiliate_conversions
for each row execute function public.set_updated_at();

create or replace function public.set_affiliate_commission()
returns trigger as $$
begin
  if new.booking_amount_usd is not null then
    new.commission_amount_usd = round(new.booking_amount_usd * new.commission_rate, 2);
  end if;
  return new;
end;
$$ language plpgsql;

create trigger affiliate_conversions_commission
before insert or update on public.affiliate_conversions
for each row execute function public.set_affiliate_commission();

create or replace function public.create_affiliate_conversion_for_booking()
returns trigger as $$
declare
  lead_record record;
  commission numeric;
begin
  if new.status = 'confirmed'
     and (old.status is distinct from new.status)
     and new.deposit_paid is not null
     and new.deposit_paid >= coalesce(new.deposit_due, 0) then
    select l.id, l.affiliate_id
      into lead_record
      from public.affiliate_leads l
      where l.booking_request_id = new.id
      order by l.created_at desc
      limit 1;

    if lead_record.id is not null then
      select commission_rate
        into commission
        from public.affiliates
        where id = lead_record.affiliate_id;

      insert into public.affiliate_conversions (
        affiliate_id,
        lead_id,
        booking_request_id,
        status,
        commission_rate,
        confirmed_at
      ) values (
        lead_record.affiliate_id,
        lead_record.id,
        new.id,
        'pending',
        coalesce(commission, 0.07),
        now()
      )
      on conflict (booking_request_id) do nothing;
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger booking_requests_affiliate_conversion
after update of status on public.booking_requests
for each row execute function public.create_affiliate_conversion_for_booking();

create or replace function public.resolve_affiliate(slug_or_code text)
returns table (affiliate_id uuid, commission_rate numeric) as $$
  select id, commission_rate
  from public.affiliates
  where status = 'active'
    and (slug = slug_or_code or referral_code = slug_or_code)
  limit 1;
$$ language sql stable security definer;

grant execute on function public.resolve_affiliate(text) to anon, authenticated;

alter table public.affiliates enable row level security;
alter table public.affiliate_clicks enable row level security;
alter table public.affiliate_leads enable row level security;
alter table public.affiliate_conversions enable row level security;
alter table public.affiliate_payouts enable row level security;

create policy "Affiliates can view own profile"
  on public.affiliates
  for select
  to authenticated
  using (auth_user_id = auth.uid());

create policy "Admin can manage affiliates"
  on public.affiliates
  for all
  to authenticated
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

create policy "Public can insert affiliate clicks"
  on public.affiliate_clicks
  for insert
  to public
  with check (
    exists (
      select 1 from public.affiliates a
      where a.id = affiliate_id
        and a.status = 'active'
    )
  );

create policy "Affiliates can view own clicks"
  on public.affiliate_clicks
  for select
  to authenticated
  using (
    exists (
      select 1 from public.affiliates a
      where a.id = affiliate_id
        and a.auth_user_id = auth.uid()
    )
  );

create policy "Admin can view clicks"
  on public.affiliate_clicks
  for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  );

create policy "Authenticated can insert affiliate leads"
  on public.affiliate_leads
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.affiliates a
      where a.id = affiliate_id
        and a.status = 'active'
    )
  );

create policy "Affiliates can view own leads"
  on public.affiliate_leads
  for select
  to authenticated
  using (
    exists (
      select 1 from public.affiliates a
      where a.id = affiliate_id
        and a.auth_user_id = auth.uid()
    )
  );

create policy "Admin can manage leads"
  on public.affiliate_leads
  for all
  to authenticated
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

create policy "Affiliates can view own conversions"
  on public.affiliate_conversions
  for select
  to authenticated
  using (
    exists (
      select 1 from public.affiliates a
      where a.id = affiliate_id
        and a.auth_user_id = auth.uid()
    )
  );

create policy "Admin can manage conversions"
  on public.affiliate_conversions
  for all
  to authenticated
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

create policy "Affiliates can view own payouts"
  on public.affiliate_payouts
  for select
  to authenticated
  using (
    exists (
      select 1 from public.affiliates a
      where a.id = affiliate_id
        and a.auth_user_id = auth.uid()
    )
  );

create policy "Admin can manage payouts"
  on public.affiliate_payouts
  for all
  to authenticated
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

alter table public.booking_requests
  add column if not exists primary_view text;

alter table public.resorts
  add column if not exists calculator_code text;

comment on column public.booking_requests.primary_view is 'Room view code tied to calculator rates (e.g., TP, SV).';
comment on column public.resorts.calculator_code is 'Identifier used by the pixiedvc-calculator package (e.g., BLT, AKV).';

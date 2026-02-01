create sequence if not exists public.booking_requests_request_number_seq;

alter table public.booking_requests
  add column if not exists request_number bigint unique;

alter table public.booking_requests
  alter column request_number set default nextval('public.booking_requests_request_number_seq');

with ordered as (
  select id,
         row_number() over (order by created_at asc, id asc) as rn
  from public.booking_requests
  where request_number is null
)
update public.booking_requests
set request_number = ordered.rn
from ordered
where public.booking_requests.id = ordered.id;

select setval(
  'public.booking_requests_request_number_seq',
  coalesce((select max(request_number) from public.booking_requests), 0)
);

alter table public.rentals
  add column if not exists calculator_room_code text,
  add column if not exists calculator_view_code text;

alter table public.ready_stays
  add column if not exists calculator_room_code text,
  add column if not exists calculator_view_code text;

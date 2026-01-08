create table if not exists public.resort_photos (
  id uuid primary key default gen_random_uuid(),
  resort_id uuid not null references public.resorts(id) on delete cascade,
  url text not null,
  caption text,
  sort_order integer not null,
  created_at timestamptz not null default now()
);

create unique index if not exists resort_photos_resort_id_sort_order_key
  on public.resort_photos(resort_id, sort_order);

alter table if exists public.affiliate_applications
  add column if not exists display_name text,
  add column if not exists website text,
  add column if not exists social_links jsonb not null default '[]'::jsonb,
  add column if not exists traffic_estimate text,
  add column if not exists promotion_description text,
  add column if not exists admin_notes text,
  add column if not exists approved_at timestamptz,
  add column if not exists rejected_at timestamptz;

update public.affiliate_applications
set display_name = coalesce(
  nullif(trim(display_name), ''),
  nullif(trim(concat_ws(' ', first_name, last_name)), ''),
  username
)
where display_name is null;

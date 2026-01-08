create table if not exists public.testimonial_submissions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  status text not null default 'pending',
  quote text not null,
  author text not null,
  location text not null,
  email text null,
  consent boolean not null default false,
  admin_notes text null
);

create index if not exists testimonial_submissions_status_idx
  on public.testimonial_submissions (status);

create index if not exists testimonial_submissions_created_at_idx
  on public.testimonial_submissions (created_at);

alter table public.testimonial_submissions enable row level security;

create policy "Allow testimonial submissions"
  on public.testimonial_submissions
  for insert
  to anon, authenticated
  with check (
    consent = true
    and char_length(quote) between 20 and 500
    and char_length(author) between 2 and 60
    and char_length(location) between 2 and 60
  );

create policy "Deny testimonial selects"
  on public.testimonial_submissions
  for select
  to anon, authenticated
  using (false);

create policy "Deny testimonial updates"
  on public.testimonial_submissions
  for update
  to anon, authenticated
  using (false);

create policy "Deny testimonial deletes"
  on public.testimonial_submissions
  for delete
  to anon, authenticated
  using (false);

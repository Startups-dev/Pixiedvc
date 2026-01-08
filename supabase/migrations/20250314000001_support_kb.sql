create extension if not exists vector;

create table if not exists support_kb_documents (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  category text not null,
  title text not null,
  content text not null,
  content_hash text not null,
  audience text,
  updated_at timestamptz not null,
  created_at timestamptz default now(),
  embedding vector(1536)
);

create index if not exists support_kb_documents_category_idx
  on support_kb_documents (category);

create index if not exists support_kb_documents_embedding_idx
  on support_kb_documents using ivfflat (embedding vector_cosine_ops) with (lists = 100);

alter table support_kb_documents enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'support_kb_documents'
      and policyname = 'support_kb_documents_select'
  ) then
    create policy support_kb_documents_select
      on support_kb_documents
      for select
      using (true);
  end if;
end $$;

create table if not exists support_handoffs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  name text,
  email text,
  topic text,
  message text,
  transcript jsonb not null,
  page_url text,
  status text not null default 'new'
);

alter table support_handoffs enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'support_handoffs'
      and policyname = 'support_handoffs_insert'
  ) then
    create policy support_handoffs_insert
      on support_handoffs
      for insert
      with check (true);
  end if;
end $$;

create or replace function match_support_kb_documents(
  query_embedding vector(1536),
  match_count int default 6,
  min_similarity float default 0.75
)
returns table (
  id uuid,
  slug text,
  category text,
  title text,
  content text,
  audience text,
  updated_at timestamptz,
  similarity float
)
language sql
stable
as $$
  select
    id,
    slug,
    category,
    title,
    content,
    audience,
    updated_at,
    1 - (embedding <=> query_embedding) as similarity
  from support_kb_documents
  where embedding is not null
    and 1 - (embedding <=> query_embedding) >= min_similarity
  order by embedding <=> query_embedding
  limit match_count;
$$;

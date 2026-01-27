drop table if exists support_handoffs;

create table if not exists support_agents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users unique not null,
  role text not null default 'agent' check (role in ('admin','agent')),
  active boolean not null default true,
  online boolean not null default false,
  max_concurrent int not null default 1,
  last_assigned_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists support_conversations (
  id uuid primary key default gen_random_uuid(),
  guest_email text,
  status text not null default 'ai' check (status in ('ai','handoff','closed')),
  created_at timestamptz default now()
);

create table if not exists support_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references support_conversations on delete cascade not null,
  sender text not null check (sender in ('guest','ai','agent')),
  agent_user_id uuid references auth.users,
  content text not null,
  created_at timestamptz default now()
);

create table if not exists support_handoffs (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references support_conversations on delete cascade unique,
  assigned_agent_user_id uuid references auth.users,
  status text not null default 'open' check (status in ('open','claimed','resolved')),
  created_at timestamptz default now(),
  claimed_at timestamptz,
  resolved_at timestamptz
);

create index if not exists support_messages_conversation_idx
  on support_messages (conversation_id);

create index if not exists support_handoffs_status_idx
  on support_handoffs (status);

alter table support_agents enable row level security;
alter table support_conversations enable row level security;
alter table support_messages enable row level security;
alter table support_handoffs enable row level security;

create policy support_agents_self_select
  on support_agents
  for select
  using (user_id = auth.uid());

create policy support_agents_self_update
  on support_agents
  for update
  using (user_id = auth.uid());

create policy support_agents_self_insert
  on support_agents
  for insert
  with check (user_id = auth.uid());

create policy support_conversations_agent_select
  on support_conversations
  for select
  using (
    exists (
      select 1
      from support_handoffs h
      where h.conversation_id = support_conversations.id
        and (h.assigned_agent_user_id = auth.uid())
    )
    or exists (
      select 1
      from support_agents a
      where a.user_id = auth.uid()
        and a.role = 'admin'
    )
  );

create policy support_messages_agent_select
  on support_messages
  for select
  using (
    exists (
      select 1
      from support_handoffs h
      where h.conversation_id = support_messages.conversation_id
        and (h.assigned_agent_user_id = auth.uid())
    )
    or exists (
      select 1
      from support_agents a
      where a.user_id = auth.uid()
        and a.role = 'admin'
    )
  );

create policy support_messages_agent_insert
  on support_messages
  for insert
  with check (
    exists (
      select 1
      from support_handoffs h
      where h.conversation_id = support_messages.conversation_id
        and h.assigned_agent_user_id = auth.uid()
    )
    or exists (
      select 1
      from support_agents a
      where a.user_id = auth.uid()
        and a.role = 'admin'
    )
  );

create policy support_handoffs_agent_select
  on support_handoffs
  for select
  using (
    assigned_agent_user_id = auth.uid()
    or assigned_agent_user_id is null
    or exists (
      select 1
      from support_agents a
      where a.user_id = auth.uid()
        and a.role = 'admin'
    )
  );

create policy support_handoffs_agent_update
  on support_handoffs
  for update
  using (
    assigned_agent_user_id is null
    or assigned_agent_user_id = auth.uid()
    or exists (
      select 1
      from support_agents a
      where a.user_id = auth.uid()
        and a.role = 'admin'
    )
  );

create or replace function assign_support_handoff(
  p_conversation_id uuid
)
returns table (
  assigned_agent_user_id uuid,
  status text
)
language plpgsql
as $$
declare
  v_agent uuid;
  v_updated int;
begin
  select sa.user_id
  into v_agent
  from support_agents sa
  left join lateral (
    select count(*) as active_count
    from support_handoffs sh
    where sh.assigned_agent_user_id = sa.user_id
      and sh.status in ('open','claimed')
  ) counts on true
  where sa.active = true
    and sa.online = true
    and coalesce(counts.active_count, 0) < sa.max_concurrent
  order by counts.active_count asc, sa.last_assigned_at nulls first, sa.created_at asc
  limit 1;

  if v_agent is null then
    return;
  end if;

  update support_handoffs
  set assigned_agent_user_id = v_agent,
      status = 'claimed',
      claimed_at = now()
  where conversation_id = p_conversation_id
    and assigned_agent_user_id is null;

  get diagnostics v_updated = row_count;

  if v_updated = 0 then
    return;
  end if;

  update support_agents
  set last_assigned_at = now()
  where user_id = v_agent;

  return query select v_agent, 'claimed';
end;
$$;

-- Run this in your Supabase SQL editor

-- Calls table: stores every call attempt per user
create table if not exists public.calls (
  id          bigserial primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  call_id     text,
  to_number   text,
  agent_id    text,
  agent_name  text,
  status      text default 'initiated',
  direction   text default 'outbound',
  duration    integer,
  timestamp   timestamptz default now(),
  metadata    jsonb default '{}'
);

alter table public.calls enable row level security;

create policy "Users see own calls" on public.calls
  for all using (auth.uid() = user_id);

-- User agents table: tracks which ElevenLabs agents belong to which user
create table if not exists public.user_agents (
  id          bigserial primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  agent_id    text not null,
  agent_name  text,
  created_at  timestamptz default now(),
  unique(user_id, agent_id)
);

alter table public.user_agents enable row level security;

create policy "Users see own agents" on public.user_agents
  for all using (auth.uid() = user_id);

-- Indexes for performance
create index if not exists calls_user_id_idx on public.calls(user_id);
create index if not exists calls_timestamp_idx on public.calls(timestamp desc);
create index if not exists user_agents_user_id_idx on public.user_agents(user_id);

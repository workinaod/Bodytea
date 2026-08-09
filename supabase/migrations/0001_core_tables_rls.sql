-- Bodytea cloud schema: profiles (auth metadata), states (envelope backup),
-- board_stats (global leaderboard). All RLS-locked; profiles written only by
-- edge functions with the service role.

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  phone text not null unique,
  username text not null unique check (username ~ '^[a-z0-9_]{3,16}$'),
  recovery_hash text not null,
  reset_fails int not null default 0,
  reset_locked_until timestamptz,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "profiles read own" on public.profiles
  for select to authenticated using ((select auth.uid()) = user_id);
-- no insert/update/delete policies: service role only

create table public.states (
  user_id uuid primary key references auth.users(id) on delete cascade,
  envelope jsonb not null check (pg_column_size(envelope) <= 2097152),
  schema_version int not null,
  exported_at timestamptz not null,
  updated_at timestamptz not null default now()
);
alter table public.states enable row level security;
create policy "states own all" on public.states
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create table public.board_stats (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null check (char_length(username) <= 16),
  goal text not null default 'general' check (goal in ('vertical','speed','muscle','strength','lean','general')),
  goal_statement text not null default '' check (char_length(goal_statement) <= 80),
  streak int not null default 0 check (streak between 0 and 5000),
  consistency30 numeric not null default 0 check (consistency30 between 0 and 100),
  pr_gain90 numeric not null default 0 check (pr_gain90 between -100 and 500),
  protein30 numeric not null default 0 check (protein30 between 0 and 100),
  sessions_total int not null default 0 check (sessions_total between 0 and 100000),
  updated_at timestamptz not null default now()
);
alter table public.board_stats enable row level security;
create policy "board read all" on public.board_stats
  for select to authenticated using (true);
create policy "board insert own" on public.board_stats
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "board update own" on public.board_stats
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create index board_stats_streak_idx on public.board_stats (streak desc);
create index board_stats_consistency_idx on public.board_stats (consistency30 desc);
create index board_stats_pr_idx on public.board_stats (pr_gain90 desc);
create index board_stats_protein_idx on public.board_stats (protein30 desc);
create index board_stats_sessions_idx on public.board_stats (sessions_total desc);
create index board_stats_updated_idx on public.board_stats (updated_at desc);

-- Server-stamped updated_at (clients cannot backdate or forge freshness)
create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end $$;
create trigger states_touch before insert or update on public.states
  for each row execute function public.touch_updated_at();
create trigger board_touch before insert or update on public.board_stats
  for each row execute function public.touch_updated_at();

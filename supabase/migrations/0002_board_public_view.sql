-- Applied to bodytea-prod 2026-08-19, in three steps in this order, because
-- the order is the whole reason the live board never broke:
--
--   1. create the view (additive, nothing reads it yet)
--   2. deploy the client that reads it (bundle index-CPVT1o4w.js)
--   3. narrow the table, and only then
--
-- Doing 3 before 2 would have left the deployed client reading a table it
-- could no longer read, and the leaderboard empty for everybody in the gap.

-- ---------- 1. the read surface ----------
--
-- board_stats was readable by every signed-in user: `using (true)`, no
-- server-side row limit. For the username, goal and stats that is the
-- leaderboard working as intended. For updated_at it is not: stamped to
-- the second, displayed nowhere, and polled hourly by any authenticated
-- caller it reconstructs when each athlete trained.
--
-- The client used that column twice and both times as a filter rather
-- than a value, so rounding it to the week costs nothing. The
-- three-session floor and the 45-day cut moved in here too, which means
-- the database enforces them instead of whoever writes the next query.
create or replace view public.board_public
with (security_invoker = off) as
select
  user_id, username, goal, goal_statement,
  streak, consistency30, pr_gain90, protein30, sessions_total,
  date_trunc('week', updated_at) as active_week
from public.board_stats
where sessions_total >= 3
  and updated_at >= now() - interval '45 days';

-- ---------- 2. read privileges, and ONLY read ----------
--
-- A single-table view is AUTO-UPDATABLE, and this one has definer rights
-- so the board survives step 3. Together that means a write through the
-- view runs as the view owner and never sees the table's RLS. Supabase
-- grants authenticated the full set on public-schema objects by default,
-- so the view arrived with INSERT, UPDATE, DELETE and TRUNCATE on it:
-- any signed-in user could have rewritten or deleted every other
-- athlete's row through it. That is a bigger hole than the one this file
-- closes, and it existed for about twenty minutes on prod.
revoke insert, update, delete, truncate, references, trigger
  on public.board_public from authenticated;
revoke all on public.board_public from anon;
grant select on public.board_public to authenticated;

comment on view public.board_public is
  'Leaderboard read surface. SECURITY DEFINER on purpose: board_stats is own-row only, so an invoker-rights view would show every athlete a board containing just themselves. Exposes leaderboard columns with updated_at coarsened to the week, so the table cannot be polled for a per-user training timeline. authenticated only; anon revoked.';

-- ---------- 3. the table stops being public ----------
--
-- Insert and update are untouched: the client still upserts its own row,
-- and that upsert requests nothing back, so it never needs SELECT.
drop policy if exists "board read all" on public.board_stats;

create policy "board read own" on public.board_stats
  for select to authenticated
  using ((select auth.uid()) = user_id);

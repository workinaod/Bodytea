# Bodytea cloud backend

Dedicated Supabase project **`bodytea-prod`** (`elnvzitkfwzybkxcjytf`, us-west-1).
Created fresh for this app — it shares nothing with any other project.

Everything in this folder is a **reference copy** of what is deployed:

- `migrations/0001_core_tables_rls.sql` — `profiles`, `states`, `board_stats` with RLS
- `functions/auth-register` — phone + PIN registration (no SMS), returns a one-time recovery code
- `functions/auth-reset-pin` — recovery-code PIN reset with an hour lockout after 5 misses

## Design in one breath

Accounts are **optional**. The app is local-first: every write lands in
`localStorage` synchronously, and when signed in the whole versioned envelope is
echoed (debounced 10 s) into the user's own `states` row. Sign-in is a synthetic
email `p<digits>@pin.bodytea.app` + a password derived **on-device** as
`sha256("bodytea:v1:<digits>:<pin>")` — the raw PIN never leaves the phone, and
that formula is frozen forever (changing it locks every account out).

Honest trade-offs, on purpose: a short PIN is guessable in theory (GoTrue rate
limits are the brake), and lost PIN + lost recovery code = new account. Local
data is never at risk either way.

## Row security

- `profiles`: owner can read; only the service role (edge functions) writes.
- `states`: owner-only everything.
- `board_stats`: any signed-in user reads (global leaderboard), owner writes,
  CHECK-constrained ranges, `updated_at` server-stamped by trigger.

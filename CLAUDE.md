# BodyT / Bodytea

This is a working, deployed coaching PWA mid-upgrade toward an adaptive coaching system.
It is not a greenfield project. Sessions have burned real usage rediscovering state, so:

**Before doing ANY work in this repo, read `BODYT_STATE.md` at the repo root, fully.**
It holds the current snapshot, the roadmap status board, lane ownership, open decisions,
standing constraints, and the checkpoint log. Claim your job there before you start.

Non-negotiables (full list in BODYT_STATE.md section 6):

- One deploy branch, named in `.github/workflows/deploy.yml`. Edit that line, never add to it.
- Ship ritual before any "done": `npx tsc -b`, `npx vitest run`, `npm run build`,
  `PW_CHROMIUM_PATH=/opt/pw-browsers/chromium npx playwright test`, push, confirm live by
  bundle hash, screenshots at 390px.
- Suggest only, never auto. No em dashes in user-visible copy. Users never pick reps.
  No SMS. Sergeant quotes need owner approval. Never touch the "Forvm Data" Supabase
  project; ours is bodytea-prod.
- structure.test.ts allowances shrink only. Layering: plan -> engine/store ->
  cloud/logic/platform -> components/screens, never upward.

**Before you stop, whatever the reason: update `BODYT_STATE.md` (job status, snapshot,
checkpoint log), commit it with your work, and republish the dashboard artifact listed
in it if statuses changed.** A session that ends without updating the state file is the
failure mode this repo is designed against.

# BODYT_STATE.md

The project's memory. If you are a Claude session working on BodyT, this file is your
briefing and your handoff. It exists because four sessions once ran without one and the
owner had to commission a full forensic audit to find out where the project stood.
Do not let that happen again.

Last updated: 2026-08-18 (J1 done, reconciliation audit session)
Living dashboard (rendered copy of this plan):
https://claude.ai/code/artifact/9c3f6836-93c6-43a2-af69-04c9d31d952e

---

## 0. PROTOCOL: how this file stays alive

1. **Read this file completely before touching anything.** Then read only the code you need.
2. **One session, one job.** Claim a job from the roadmap board (section 3) by setting its
   status to `in-progress` with your session title and the date. Do not start a job whose
   dependencies are not `done`.
3. **Before you stop** (finished, blocked, or running out of room), you MUST:
   - update the job's status and the snapshot (section 2),
   - append a checkpoint entry (section 9): what shipped, what is half-done, exact resume
     instruction, tests run, anything you learned that changes the plan,
   - commit this file WITH your work (same branch, same push),
   - if statuses changed, republish the dashboard artifact from your session by publishing
     an updated copy with `url` = the dashboard address above.
4. **Append, never erase.** History in this file is evidence. Strike through, do not delete.
5. **Ship ritual before any "done":** `npx tsc -b` · `npx vitest run` · `npm run build` ·
   `PW_CHROMIUM_PATH=/opt/pw-browsers/chromium npx playwright test` · commit · push ·
   confirm live by bundle hash · screenshots at 390px.
6. **One deploy branch.** `.github/workflows/deploy.yml` lists exactly one working branch.
   Moving branches means editing that line, never adding to it. (Bought with a
   23-commit stale-live incident.)
7. Never assume a task on an old list is still necessary. Check it against this file and
   the code first. Several sessions' worth of work shipped between most lists and now.

---

## 1. WHERE THIS APP IS GOING (build in preparation for this)

**North star: the user speaks normally; BodyT does the sophisticated thinking.**
BodyT is an existing, working, deterministic coaching PWA being upgraded into a
comprehensive adaptive coaching system per the v12 playbook, right-sized to reality.
It is NOT a greenfield rebuild. Preserve working behavior unless a requirement or a
regression test says otherwise.

The destination, by capability:

- **UNDERSTAND.** You type a sentence or paste a routine; BodyT parses what it already
  knows, asks only questions whose answers would change the plan, never re-asks anything,
  and stops when the plan is decidable. Everything told or observed lands in ONE user
  model with source, confidence and freshness. No global beginner/intermediate/advanced
  label where a domain-specific state matters.
- **KNOW.** Typed, versioned, evidence-cited knowledge (movement graph, program
  structures, nutrition rules) that engines query. Scale comes from structure, not from
  dumping corpora into a context window. No vector DB; typed data modules with
  build-time validation are this repo's native form.
- **PLAN.** The plan is a hypothesis, not a verdict. Goals editable after onboarding;
  edits regenerate through the real generator and show a diff for approval. When more
  than one strategy is genuinely defensible, BodyT builds the alternatives, recommends
  one, and explains the tradeoff. Target program and currently-tolerable dose are
  separate things; each active domain ramps independently.
- **LEARN.** Execution feeds back: progression, calories, volume, schedule and exercise
  selection all adjust from what actually happened, for loaded AND bodyweight work.
  Every adaptation is a suggestion with evidence, one tap, reversible. Interventions
  carry follow-up: did it work, and if not, revert.
- **EXPLAIN.** Internally sophisticated, externally simple. Machine rationale stored
  separately from the user-facing sentence; the sentence preserves the true reason and
  uncertainty. Never fabricate certainty to simplify.
- **PROVE.** Personalization is a measurement: simulated populations (20x20 weeks and
  20x8 weeks harnesses), 89-mutation poison suite, golden 16-week lock, paired-profile
  and generic-convergence checks, all runnable via npm and eventually CI. Every real
  failure becomes a permanent regression.

**Architecture rules to build in preparation for the target:**

- **Extend, never duplicate, these canonical contracts:**
  - exercise knowledge: `ExerciseDef` + `MOVEMENT` (plan/movement.ts) + equip/muscle/demo tables
  - program: `PlanConfig` (types.ts), booklet-as-data
  - user facts: `Prefs` (prefsTypes.ts, algo branch) + `goalAnswers` + `FatigueNote`;
    grow these toward source/confidence/recency, do not add a parallel store
  - coaching memory: coach ring + `surfacedInsights` + calibration pattern
- **Deterministic local-first core** until decision Q1 says otherwise. Zero runtime LLM
  calls today; if that changes it starts at the explain layer only, behind Q1.
- **Suggest-only.** Nothing about today or the plan moves without a tap, and every
  suggestion states its evidence. `engine/calibration.ts` is the proven shape.
- **Load provenance.** A weight the plan chose (deload, cut, softening) is marked
  `light` and never becomes the next baseline. This killed the load-spiral bug family.
- **Layering is law** (enforced by structure tests): plan -> engine/store -> cloud/logic/
  platform -> components/screens. Never import upward. File-size allowances shrink only.
- **Owner rule (2026-08-17): knowledge that is collected but not consumed gets wired in
  or redone, never preserved for its own sake.** The current knowledge system works but
  is too small; the v12 knowledge expansion is the locked direction. Grow it aggressively
  through the R-jobs, with provenance fields and room for scale, and delete or rebuild
  anything that no engine reads.
- **Post-core fence** (do not build before J12 passes): visual overhaul, Sergeant/Trainee
  character art integration, My Room/game world, camera/form CV. The gamification that
  ALREADY exists (Board, trophies, streaks, Wrapped, Sergeant text coach) stays live and
  frozen: maintain, do not extend, do not remove.

Full reference: BodyT Engine Playbook v12 (owner holds the docx). The reconciliation of
v12 against this repo, and all evidence for this file, is in the dashboard artifact.

---

## 2. SNAPSHOT: where the app is right now (update after every job)

- Repo: workinaod/Bodytea (app name pending decision Q2: "BodyT" in-app, "Bodytea"/"NAOD V3"
  in repo docs). Live at https://workinaod.github.io/Bodytea/
- `main` is a 1-commit scaffold. All real history is on Claude branches.
- **REUNIFIED (J1, 2026-08-18): both working branches point at merge `eaf3519`.**
  Deploy branch remains `claude/app-audit-refinement-sjw2va` (deploy.yml unchanged, one
  working branch). Live at gh-pages `deploy: eaf3519`, bundle `index-Dzs5Zf7J.js`
  verified against the local build of the same commit. The merged tree carries BOTH
  lines: onboarding rebuild + voice work AND progression/phase/prefs/simulation work.
- Validation on the merged tree: golden lock unchanged; typecheck clean; **1,175/1,175
  unit tests**; build green; **e2e 38 passed / 0 failed** (3 voice specs skip headless);
  **sim 20x20: all 20 personas, zero invariant failures**; sim 20x8 clean; **poison
  81/81 mutations caught** (one anchor re-aimed after the merge orphaned it).
  `npm run sim` / `sim:sessions` / `poison` now exist.
- Superseded branches: `claude/fitness-tracking-app-ugo5xt` (content ported; glance at the
  two adapted commits 0374307/d5e71a4 before deleting), `claude/bodytea-link-display-r1sue6`
  (stale ancestor pointer). `claude/workout-form-feedback-pain-0xnonz` never existed.
- Cloud: Supabase project **bodytea-prod** (elnvzitkfwzybkxcjytf, us-west-1). Tables:
  profiles / states / board_stats. NEVER touch the "Forvm Data" project. Supabase use is
  APPROVED by the owner (2026-08-17); the cloud lane is scheduled work.
- Known data leaks in shipped onboarding (fix = J3): the universal injuries answer is
  collected and read by nothing; foodLimits (dairy-free, allergies) are assembled and
  dropped; `secondaryGoal` is a dead field.
- Measured explain ceiling: 1,742 coaching lines shown over a simulated 8 weeks, only 181
  distinct. Bodyweight-only athletes: 41 of 80 phase verdicts "untested" (fix = J2).

## STATUS BOARD (the roadmap; statuses: pending / in-progress / done / blocked)

| id | job | lane | status | depends on | owner session |
|----|-----|------|--------|-----------|---------------|
| J0 | Reconciliation audit + this file | - | done 2026-08-17 | - | BodyT project state reconciliation audit |
| J1 | Reunify branches, carry this file to canonical branch, wire sims into npm, settle deploy branch | gate | **done 2026-08-18** (executed by the audit session after the algorithm session wedged; merge eaf3519 live) | J0 | reconciliation audit session |
| J2 | Bodyweight progression (phase verdicts + in-session response for unloaded work, pct load floor) | engines | pending | J1 | Algorithm session |
| J3 | Onboarding closure: confirm review fixes, name decision, injuries->Prefs.limitations, foodLimits->meal plan, dead fields, first paired-profile eval | product | pending | J1 | App audit and refinement |
| J4 | Freeform-first entry (composer primary, chips demote to examples; reuse inferGoal/readStatement) | product | pending | J3 | App audit session |
| J5 | Booklet regenerates: goal edits -> generatePlan -> diff for approval; history preserved | product | pending | J3 | App audit session |
| J6 | Limitations lifecycle (short/long-term, what hurts, region routing, expiry+restore) + core coverage guarantee + advisory volume cap for user-authored routines | either | pending | J1 (J3 helps) | tbd |
| J7 | User model (userModel.ts: EWMA weight, lean mass, work capacity, per-muscle recovery, per-exercise progression rate, adherence shape; facts carry source/confidence/recency) + nutrition engine (Katch-McArdle when BF known, activity from logs, carb cycling, fibre floor, self-explaining numbers) + calorie-autoregulation seed | engines | pending | J1, J2 | Algorithm session |
| J8 | Learning loop completion: volume autoregulation, schedule fit, exercise fit, intervention follow-up; all suggest-only on the calibration.ts pattern | engines | pending | J7 | Algorithm session |
| J9 | Meal & chef engine: cost/minutes/effort/batchFriendly axes, fit-remaining-macros, batch chaining, no-repeat guards, sliders | product | pending | J1 (J7 feeds it) | product lane |
| J10 | Explain expansion + jargon-ban sweep; machine rationale split from user sentence | tbd by Q1 | blocked on Q1 | J1 | tbd |
| J11 | Candidate strategies lite: 2-3 genuinely different plans, scored, one recommended, compared in J5's diff UI; generic-convergence gate over 20 personas | planner | pending | J5, J7 | tbd |
| J12 | Core-complete gate: sims + poison + paired profiles + convergence in CI; run the engine-ready checklist; passing unlocks post-core | prove | pending | all above | tbd |
| C1 | Cloud foundation & security: RLS audit, server-side sign-in lockout, push backend (free push only), sync hardening, narrow username lookup (id/username/avatar ONLY), USDA food-proxy edge function; indexes + pagination day one | cloud | pending | J1 | new session or revived "Comback for native" |
| C2 | Profile & social surface: social = 4th Progress view; profile via header avatar; pinned badges; zero new tabs | cloud | pending | C1 | cloud session |
| C3 | Friends, groups & challenges: reviewed RLS per table; unlock the 12 pending achievements; anti-farming in the fact layer | cloud | pending | C2 | cloud session |
| T21 | Custom food lookup: Open Food Facts (keyless) first, USDA via C1's proxy; platform/foodLookup.ts + engine/nutrition.ts split; local cache; manual fallback never blocks logging | ride-along | pending | J9, C1 | tbd |
| RA | Small ride-alongs: max/avg ride speed; set-too-fast confirm; getExercise no-throw guard for live sessions; FocusView.tsx owes a split (allowance bumped to 670 in the reunification merge, must come back down) | ride-along | pending | touch-adjacent | any |
| R6 | Safety boundaries + functional constraints pack (red-flag table, GREEN/YELLOW/RED tiers, capability fields; tier-A sources; adversarial evals) | research | pending | J1 | product lane, with J3/J6 |
| R2 | Bodyweight progression standards (rep thresholds, chain-order check) | research | pending (inside J2) | J1 | engines lane |
| R1 | Nutrition evidence pack (BMR eqns, activity-from-logs, carb cycling, fibre floor; cited) | research | pending | J1 | engines lane, start of J7 |
| R3 | Autoregulation thresholds (weight-trend bands, volume windows, plateau evidence) | research | pending | J7 | engines lane, start of J8 |
| R4 | Meal + recipe corpus expansion (axes, goal x diet x cost coverage; guards-first) | research | pending | J1 | product lane, inside J9 |
| R5 | Program-family corpus: 4-6 typed archetype families + tradeoffs (the standalone research job) | research | pending | J7 schemas stable | planner owner, before J11 |
| B1 | Decision + intervention event log (append-only; declines, exposure, evidence, versions, outcome windows; schema v21) | infra | pending | J7 | engines lane, inside J7/J8 |
| B2 | Knowledge conventions: source_refs annotations, module registry, lift-to-data rule | infra | pending | starts with R1 | any lane, rolling |
| B3 | Knowledge store + retrieval layer: versioned knowledge packs outside the bundle (IndexedDB-loaded, indexed), provenance/confidence/contradiction fields, deterministic filter-rank-packet retrieval API, high-cardinality scale tests. THE scale path to millions of records; built during core on a small high-quality corpus, then fed by post-gate ingestion waves | infra | pending | J7 contracts stable | engines lane, alongside R5, before J11 |
| IW | Ingestion waves: mass corpus expansion (exercises, programs, evidence, food) through B3's pipeline toward millions of records | research | pending, post-gate | J12 + B3 | dedicated sessions per wave |

**Deferred (do not start):** mass research ingestion, population learning, trainer/CRM,
wearable integrations, new modality breadth, finder wiring + strict pass (re-queue at J12),
retrieval/vector infra, all post-core experience work.

---

## 4. LANES AND OWNERSHIP (parallel after J1)

- **Engines lane** (Algorithm session): src/engine, src/logic, plan/generator internals,
  scripts/, sims and poison. Hands off screens, copy, booklet UI.
- **Product lane** (App-audit session): src/screens, onboarding, booklet, copy,
  followups data. Hands off engine/prescription/progression logic.
- **Cloud lane** (new or revived session): supabase/ migrations + edge functions,
  src/cloud, new social screens, push backend. Coordination point: the Progress-screen
  social subtab (one-file handshake with product lane).
- Both lanes may ADD keys to types.ts / store/schema.ts (they auto-merge). Coordinate
  structure.test.ts budget bumps and any SCHEMA_VERSION change here, in section 9.
- Proven overlap surface between engines and product lanes across the entire August
  divergence: five files. The split is real.

---

## 5. DECISIONS

**THE PLAN IS LOCKED (owner, 2026-08-17): roadmap J1-J12 + cloud lane C1-C3 + research
program R1-R6 + infrastructure B1-B3 + redo-what-is-not-read rule + core-complete gate.
Begin-now approved. Sessions execute their lane jobs without re-asking.**

**Resolved:**
- Q1 brain type: **deterministic core** (owner, 2026-08-17), WITH a mandate: the
  knowledge base must scale to MILLIONS of data points to pull from. Engines stay local,
  offline, testable; Claude builds knowledge at authoring time; retrieval is
  deterministic (filters, indexes, ranked bounded packets), never giant-context dumping.
  This makes B3 (knowledge store and retrieval layer) a core build job, and makes
  post-gate ingestion waves the path to millions of records. Runtime LLM revisit: only
  ever at the talk layer, only by a future explicit owner decision.
- Q3 canonical branch: merge into algo branch, verify, fast-forward
  `claude/app-audit-refinement-sjw2va`, keep it as the single deploy branch (in J1).
- Q4 workout-form session: **archived** without salvage (owner, 2026-08-17).
- Q5 core-complete definition: approved as part of the plan lock.
- Q6 joint walkthrough: **skipped for now**; revisit after the merge and onboarding land.
- Q2 name: **BodyT** (owner, 2026-08-17). Use in all user-facing copy; do not rename the
  repo or the Supabase project now. Apply during J3's copy touches.
- Supabase approval: APPROVED (owner, 2026-08-17). Cloud lane scheduled; USDA proxy allowed
  (key server-side only). Still standing from the owner: 58 badge artworks (placeholders
  render meanwhile); Sergeant quotes ship only with owner approval.

---

## 6. STANDING CONSTRAINTS (permanent; from the owner)

- No em dashes in user-visible text. Casual, natural, SHORT.
- Users never pick reps. One number, at the load end.
- Suggest only, never auto. Nothing moves without a tap; every suggestion states evidence.
- No SMS, ever. Free push only.
- Supabase is bodytea-prod (elnvzitkfwzybkxcjytf). Never touch "Forvm Data".
- Sergeant quotes need owner approval before shipping.
- Model identifiers never appear in repo text, commits, PRs or code comments.
- structure.test.ts allowances are shrink-only; over the cap, extract a component.
- The golden lock (engine/golden.test.ts) is a tripwire, not a prohibition: deliberate
  plan changes update it and say why.
- Every Close button is an X and works on touch. Screenshots at 390px, and look at them.
- Prove every new guard bites: feed it a known-bad input, watch it fail, then trust it.

---

## 7. KNOWN GAPS AND FAILURES LEDGER (turn each into a regression when fixed)

- Bodyweight athletes cannot be promoted; in-session engine silent on bodyweight (J2).
- Injuries answer unread; foodLimits dropped; secondaryGoal dead (J3).
- Explain shelf: 181 distinct lines / 1,742 shown (J10).
- Load floor = one step (20% of a 25 lb dumbbell); failing-flag opens a band not a line (J2/J7).
- Live SessionLog is a frozen snapshot across deploys; getExercise throws on removed ids (RA).
- Onboarding is chip-first vs the freeform-first contract (J4).
- deploy.yml names the sibling branch; algo branch has NO CI today (J1).
- Two fitness-branch commits were ported with adaptations (0374307, d5e71a4): diff-glance
  before deleting that branch (J1).

---

## 8. SESSION DIRECTORY

- **Algorithm personalization and progression trust**: engines lane owner. Resume at J1
  (its old task list is REPLACED by J1; its own "still open" list is J2). Its artifacts:
  Twenty Athletes Twenty Weeks; Eight Weeks On The Floor.
- **App audit and refinement**: product lane owner. Resumes at J3 after J1 lands. Its
  Onboarding Rebuild Review calls 2-5 look shipped (confirm in-app); calls 1 (name = Q2)
  and 6 (walkthrough = Q6) open. Shares its branch history with "Comback for native".
- **Comback for native**: candidate owner for the cloud lane (or spawn fresh).
- **BodyT: three batches roadmap**: CLOSED. Its Build Ledger is recovered and reconciled
  into this file (its 7+8 pair = J7; its 16 = deferred finder; stage-3 = C-lane and J5/J6).
  Its branch is superseded. Do not resume, do not continue its checkpoint list.
- **Workout form feedback and pain tracking**: pending Q4. Pushed nothing, no branch.
  Pain scope now lives in the engines lane; camera form is post-core.
- **BodyT project state reconciliation audit** (this file's author): read-only audit
  session; produced the dashboard artifact and this file on branch
  claude/bodyt-reconciliation-audit-o9mqi8.

---

## 9. CHECKPOINT LOG (append-only; newest last)

- **2026-08-18 · J1 · Reconciliation audit session (stand-in executor).** The algorithm
  session wedged (two wake attempts died before any turn ran; archived). J1 executed
  here per owner approval: merged the sibling into the algo line (conflicts resolved
  exactly per the map; structure budgets re-derived by the test's own counter, types 705 /
  schema 649 / generator 941 / FocusView 670 with an owed-split debt note), state files
  carried over, harnesses wired as npm scripts, full ritual + both sims + poison green
  (81/81 after re-aiming the vert anchor to the four-tier TrainingAge table), both
  branches pushed to `eaf3519`, deploy confirmed live by bundle hash, 390px screenshots
  reviewed. Branch deletions still deferred (fitness branch wants its diff-glance).
  NEXT: J2 in a FRESH engines-lane session (bodyweight promotion via rep-max series,
  prescription-echo sweep, offer-ease for unloaded work, proportional load floor
  max(step, 0.6x), start-lighter hysteresis, debrief vs session.date, dead-export guard,
  goldenLife test; then the UI scan). J3 (product lane) and C1 (cloud lane) are unblocked.
- **2026-08-17 · J0 · Reconciliation audit session.** Reconstructed all four workstreams
  from git topology, session records, five published artifacts and two full code
  inventories; read v12 in full; produced the dashboard artifact and this file.
  No app code modified; no session resumed. Verified merge preview between the two live
  tips (2 mechanical conflicts). Supabase approved by owner; cloud lane added. NEXT:
  owner answers any of Q1-Q6, then Algorithm session resumes at J1 with the exact
  instructions in the dashboard (section 08/09) and section 2 above.

---

## 10. SOURCES

- Living dashboard (this plan, rendered, republishable via url):
  https://claude.ai/code/artifact/9c3f6836-93c6-43a2-af69-04c9d31d952e
- Bodytea Open Work: https://claude.ai/code/artifact/fc913f9c-ce3c-4ac8-91f2-51d35de8328e
- Bodytea Build Ledger: https://claude.ai/code/artifact/b4466656-ceb2-4d54-ae8e-5b8870e8d0b6
- Onboarding Rebuild Review: https://claude.ai/code/artifact/5210b444-304f-483b-9f1d-5e5d8070e843
- Twenty Athletes, Twenty Weeks: https://claude.ai/code/artifact/5ac65495-882b-4c52-ba13-386017f05b1e
- Eight Weeks On The Floor: https://claude.ai/code/artifact/d065c1e5-e6d0-4a54-84bb-e488015c0f80
- BodyT Engine Playbook v12: owner-held docx (Core Intelligence, Claude Handoff edition).

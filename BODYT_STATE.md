# BODYT_STATE.md

The project's memory. If you are a Claude session working on BodyT, this file is your
briefing and your handoff. It exists because four sessions once ran without one and the
owner had to commission a full forensic audit to find out where the project stood.
Do not let that happen again.

Last updated: 2026-08-19 (OP1 + OP2 + OP3 done and LIVE, off-plan training session)
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
- **J2 (2026-08-18) landed on the same line:** bodyweight athletes are first class.
  Phase verdicts judge unloaded lifts on the rep-max series (floor +2 reps), the
  prescription echo is swept out of repMaxSeries/detectPRs/achievementFacts, unloaded
  shortfalls get offer-ease in-session, the softening floor is proportional
  (max(step, round5(0.6 x baseline))), the failing flag has 2-clean-session hysteresis,
  and the debrief composes against session.date. Two new tripwires: a dead-export guard
  in structure.test.ts (48 orphans allowlisted, shrink-only) and goldenLife.test.ts
  (8 deterministic weeks of a minimal-equipment persona, snapshot-locked). Debrief
  eat/recovery pools are goal-aware (A6): distinct-line ratio recovery 0.120 -> 0.150,
  eat 0.221 -> 0.294 over the 20x8 harness. Validation after J2: **1,194/1,194 unit
  tests**, golden lock unchanged, goldenLife deterministic across runs, e2e 38 passed
  (31.5m, 3 voice skips), poison 81/81, sim 20x20 clean with **untested verdicts down
  from 41/80 to 2/80** and push-up athletes promoted to decline push-ups.
- **Fix waves 1-4 (2026-08-18) shipped on the deploy branch.** Each is a defect the
  research packs found in live code, fixed with a test that goes red without it and a
  poison mutation that proves the test bites:
  - **W1 (a395512, adf7344):** the pescatarian enum gap that wiped an athlete's whole
    account on next launch (schema enum missing one of four values, migrate throws, state
    parked, empty app returned), plus a recovery path that adopts a parked state once it
    validates again; and two phantom `goalAnswers` keys whose branches had never once run,
    one of them (`sprint-feel`) gating a tendon-safety ramp. Guarded by a type-derived
    enum test and a walker that validates every `goalAnswers[...]` key in src against
    what `buildFollowups` can actually ask.
  - **W2 (38f9f2e):** THE ALLERGY LEAK. Onboarding had collected `foodLimits` since the
    screen existed and nothing read it, so a declared dairy-free plus nut allergy could be
    shown a Greek yogurt bowl on the next screen. `plan/foodLimits.ts` is the reader:
    exclusion only (unknown terms exclude by raw substring, known ones expand to their
    family), applied AFTER mealAlternatives widens a thin slot pool, and an empty result
    stays empty. Threaded onto generated and BYOR plans, through every written meal
    example, through the grocery list, and into the swap sheet, which now names what it is
    skipping. 21 tests, 4 poison mutations including the ordering one.
  - **W3 (17e34f3):** 16 em dashes in shipped copy, rewritten per sentence rather than
    swapped for hyphens, plus `src/copy.test.ts` so a new one cannot land. Two exemptions,
    both files that handle the character rather than speak it.
  - **W4 (5782733):** the `loadStepLb` band defect. A 5 lb plate on a 20 lb lateral raise
    is a 25 percent jump, so the top of the range now spends one exposure on a rep and
    takes the plate the second time round. Scoped to small-muscle primaries: a novice on
    the 30 lb dumbbells still takes the 35s, because that is how a rack works.
  - **W5 (supplement safety, from R16):** the stack is where the app comes closest to
    prescribing, and it was the one food surface W2 did not reach. A fish allergy stored
    in onboarding kept somebody off salmon and then handed them fish oil on the same
    screen; the diet filter said `!== 'vegan'` and so served every vegetarian fish oil and
    collagen; magnesium asked for up to 400 mg against a 350 mg supplemental upper limit;
    vitamin D sat exactly ON its 4,000 IU limit with a multivitamin beside it, so the plan
    as written went over; fish oil's dose was oil rather than EPA + DHA; "pre-workout"
    named the most adulterated category on the shelf; and an empty dose rendered a bare
    separator. 12 tests. Owner calls left open in the ledger: whether zinc comes out of
    the catalog at all, and whether the stack should be opt-in rather than written into
    every plan, which is what "suggest only, never auto" would say.
  - **W6 (adapt context drift, from R12):** `planAdjustments` has two callers, the engine
    taking the automatic adjustments and `AdaptProposals.tsx` offering the rest, and both
    built the context by hand. The screen passed 2 of 5 fields. `alreadyCutForSleep` is a
    guard, so omitting it read as "nothing has been cut", and on a day the resolver had
    already taken a third off for two bad nights the screen offered a set off every lift
    on top. `blocked` and `limited` were missing too, so the offers ignored movements the
    athlete has blocked and joints they have declared (inert today: R12 also found
    `data.prefs` is read in 4 places and written in 0). One `adaptContext` builder now,
    plus a structural test that fails if any call site hand-rolls the object, because a
    behavioural test alone would pass the day a third caller repeated the mistake.
    `engine/adapt.ts` went over the 600 cap making room, so the reading half moved to
    `engine/signals.ts`, the split the file's own header has been describing: adapt.ts is
    453 lines now and needs no allowance.
  - **W7 (the injuries answer, from R12's prefs finding):** "Anything that hurts right
    now?" has been asked since the onboarding rebuild and read by nothing. Its own informs
    line says it "routes the plan around the joint from day one"; it routed nothing.
    `plan/limitations.ts` translates the chip or the free text into `prefs.limitations`,
    written at `commitPlan` so both the generated and BYOR paths get it, which makes
    `limitedJoints` live in the adapt engine. Free text we cannot map to a joint is still
    KEPT with an empty joint list: the plan cannot route around a word it does not know,
    but the coach can say it back. 10 tests including one that walks chip to engine
    context and one that fails if a chip is added to the question and not to the map, plus
    2 mutations. Does NOT close J6: limitations still have no lifecycle, no expiry and no
    edit, and R7's limit-range mode is still the highest-value thing left.
  - **W8 (minimum age, owner decision 2026-08-18):** there was no age field anywhere in
    the tree, so the app had no minimum rather than a generous one. It is 11 now, asked in
    MeStep between "you are" and "how tall", and stated ONLY to somebody who types a
    number below it. It never blocks Next. R15 recommended 18 with a gate; the owner chose
    11 with a notice, and the two structural tests exist because both failure directions
    still render a correct-looking sentence: one fails if `tooYoung` ever reaches `ready`
    (notice becomes a wall), one if the line's condition widens past the person it is
    about. 7 tests, 2 mutations. Age is stored and consumed by nothing yet: see the ledger.
  - Structure allowances came DOWN to pay for all of it, never up: types.ts 705 -> 696
    (FoodLimits moved to foodTypes.ts), store/schema.ts 649 -> 634 (meal-plan shapes moved
    to store/mealPlanSchema.ts), plan/generator.ts 941 -> 940.
  - Validation after W4: typecheck clean, **1,239/1,239 unit tests**, build green,
    **e2e 38 passed** (31.5m, same 3 voice skips), sim 20x20 identical session for
    session, poison **85/85** at W3 and 4 more mutations added at W4.
- **OP1 + OP2 are LIVE (2026-08-19, deploy `65ed650`).** Owner approved the merge; the
  feature branch fast-forwarded into `claude/app-audit-refinement-sjw2va` (no conflicts,
  it was a direct descendant). gh-pages at `deploy: 65ed650`, live bundle
  `index-D31AZv_E.js` confirmed byte-identical to the local build by sha256, not just by
  filename. deploy.yml also lost its `main` trigger in the same push: the file's own
  comment says only one working branch is ever listed, and the list named two, the second
  being the one-commit scaffold. One push to main would have published an empty app over
  the working site.
- **OP1 (2026-08-18):** off-plan training. The owner asked
  for three things that were impossible: doing specific exercises of your own choosing,
  logging small workouts done outside the app, and running previous plan days (missed
  ones especially). Now: sessions with templateId 'custom' + customTitle (schema
  addition, optional, no migration), built by logic/sessionStart.ts startCustomSession
  through the same setsFor/prefill/rep-collapse path as scheduled days; a general
  workouts shelf (plan/generalWorkouts.ts, 14 workouts, equipment-fitted through
  resolveForEquipment, duplicates deduped, sub-3-item results dropped); engine/
  reconcile.ts recentPlanDays (14-day shelf of session/mobility days with status)
  feeding a run-any-day sheet on Today, reusing the makeupFor machinery; ExercisePicker
  extracted from BookletEditor for reuse; rest days with ticked work now eat as
  training days (engine/dayType.ts, extracted whole from resolveDay.ts which was at
  its cap); debrief titles custom sessions by their own name and tells a rerun from a
  make-up; WeekScreen shows off-day sessions as trained instead of "rest". Entry
  points: rest-day card + one quiet line on scheduled days, both on Today only.
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
| J2 | Bodyweight progression (phase verdicts + in-session response for unloaded work, pct load floor) | engines | **done 2026-08-18** (engines lane session; A1-A6 all landed, deploy d23e6d1) | J1 | Algorithm session |
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
| OP1 | Off-plan training (owner request): own-workout builder from the exercise list, general workouts shelf, run-any-previous-day make-ups and reruns | product | **done + LIVE 2026-08-19** (deploy 65ed650, owner approved the merge) | J1 | off-plan training session |
| OP2 | Session and plan explainers (owner request): a "how this works" question mark on the day, the shelf and the week preview, plus a generated plan reader that replaces the owner-only NAOD prose | product | **done + LIVE 2026-08-19** (deploy 65ed650) | OP1 | off-plan training session |
| OP3 | Exercise-picking help (owner request): equipment filtering, muscle-group browsing, neglected-group suggestions, build coverage, and a UI pass on the off-plan surfaces | product | **done + LIVE 2026-08-19** | OP2 | off-plan training session |
| R6 | Safety boundaries + functional constraints pack | research | **synthesized 2026-08-18** (research/R6-safety.md; PAR-Q+ 2025 verbatim, ACSM algorithm, 28 adversarial cases, SafetyRule shape) | J1 | product lane, with J3/J6 |
| R2 | Bodyweight progression standards (rep thresholds, chain-order check) | research | **done 2026-08-18** (inside J2: rep-gain floor of +2 on the max set, GAIN_TO_PROMOTE percentage kept; chains already skill-gated in nextUp, unchanged) | J1 | engines lane |
| R1 | Nutrition evidence pack | research | **synthesized 2026-08-18** (research/R1-nutrition.md; 28 sources, model-selection rule, 14 eval cases, NutritionRule shape) | J1 | engines lane, start of J7 |
| R3 | Autoregulation thresholds | research | **synthesized 2026-08-18** (research/R3-autoregulation.md; 35 sources, per-engine constant audit, 7-rung plateau ladder, 31 eval cases) | J7 | engines lane, start of J8 |
| R4 | Meal + recipe corpus expansion | research | **synthesized 2026-08-18** (research/R4-meals.md; USDA CC0 vs OFF ODbL fence, 720-cell coverage predicate, 158-record gap, 20 fixtures) | J1 | product lane, inside J9 |
| R5 | Program-family corpus | research | **synthesized 2026-08-18** (research/R5-program-families.md; 10 families, 19 sources, ProgramFamily record, selection logic, 8-axis convergence metric, 18 fixtures of which 4 fail today) | J7 schemas stable | planner owner, before J11 |
| W1n-a | First slice of W1n, done inside B2: R1's protein bands, deficit ceiling and calorie floors carry provenance. The floors are tier D and say so | wiring | **done 2026-08-19** | B2 | the rest of W1n waits on J7 |
| W-ONT | Wire R-ONT: capability fields onto the exercise catalog, alias resolution, substitution at scale | wiring | **capability slice done 2026-08-19** (plan/capability.ts: CapabilityBlock, CapabilityDemands, demandsOf, blockedByCapability; SubstituteQuery gains `cannot`; one filter line in substitutesFor; 12 tests + 3 mutations). WHAT IT UNBLOCKS: seven joints were the entire vocabulary of limitation the planner had, so R6's cannot-kneel / cannot-get-to-floor / cannot-raise-arm-overhead mapped to nothing and R6 was unshippable. They map now. Demands are DERIVED from pattern with an override list for the 30 the defaults get wrong, and the test asserts overrides stay under a third of the catalog rather than trusting R-ONT's 70 percent estimate. STILL OPEN in W-ONT: alias resolution (R-ONT s5), the Demand-scale fields (standingBalance, dynamicBalance, gripDemand, coordination), the logistics fields (spotter, space, noise, setup), and CapabilityVariants as substitution edges | wiring | B2 done | next: W6s consumes this |
| W9 | Wire R9: ~185 calisthenics/mobility rungs + the ramp-set algorithm into the catalog and a warm-up engine | wiring | pending | W-ONT | |
| W18 | Wire R18: 72 mind-body records + the three-channel counting model (energy, regional volume, systemic fatigue) | wiring | pending | W-ONT | also fixes the yoga-satisfies-conditioning bug |
| W11 | Wire R11: SportProfile shape + 32 sport rows; the sport answer is currently collected and unread | wiring | pending | W-ONT | |
| W6s | Wire R6: SafetyRule shape, red-flag classifier, PAR-Q+ gate (48 rows) | wiring | pending | B2 | pairs with J3 |
| W7p | Wire R7: 11 functional dimensions + 10 population packs, and limit-range mode | wiring | pending | W6s | this IS most of J6 |
| W1n | Wire R1 + R3: NutritionRule and ProgressionRule tables, replacing invented constants | wiring | pending | J7 partial | J7 owns the shapes these hang off |
| W4m | Wire R4: meal corpus to the 720-cell coverage predicate, carbs and fat on every record | wiring | pending | B2 | unblocks J9 |
| W16 | Wire R16: SupplementRecord + v21 migration, 27 routing rules (the W5 fixes were the urgent subset only) | wiring | pending | B2 | |
| W5p | Wire R5: ProgramFamily records + selection logic (10 families) | wiring | pending | J7 partial | before J11 |
| W17 | Wire R17: 140-rule notation corpus + the import/repair model | wiring | pending | W-ONT | this IS most of J4/J5 |
| W12 | Wire R12: AuthorityRule, the override model, a decline control and its cooldown | wiring | pending | B1 | needs the event log to record a no |
| W13 | Wire R13: CohortPrior + the credibility blend; calibration.ts already has the shape | wiring | pending | J7, B1 | |
| W14 | Wire R14: PassiveReading + the conflict rule. Mostly post-Capacitor; the accepted list is short | wiring | pending | J7 | post-gate for the sensor half |
| W15 | Wire R15: age bands into loading ceilings, calorie baseline, plyometric gating. Age is collected (W8) and read by nothing | wiring | pending | J7 partial | |
| W10 | Wire R10: cue corpus coverage (65 of 194 movements carry no cue) + selection and outcome tracking | wiring | pending | W-ONT | feeds J10 |
| W8e | Wire R8: EndurancePlan shape, session-vs-30-day-max load rule (the 10 percent rule fails) | wiring | pending | J7 partial | future endurance planner |
| B1 | Decision + intervention event log (append-only; declines, exposure, evidence, versions, outcome windows; schema v21) | infra | pending | J7 | engines lane, inside J7/J8 |
| B2 | Knowledge conventions: source_refs annotations, module registry, lift-to-data rule | infra | **done 2026-08-19** (plan/knowledge.ts 136 lines: SourceRef, KnowledgeRecord, EvidenceTier A-D, confidenceOf; plan/knowledgeRegistry.ts as the list, separate file because a refs module needs confidenceOf and the registry needs the refs module; plan/nutrition.refs.ts as the first, annotating R1's constants IN PLACE by importing the live values so a number cannot drift from its citation; plan/knowledge.test.ts 14 checks + 3 poison mutations). Guards: a sourced tier without a source, a dangling source id, a tier better than its best source, a source nothing cites, hand-typed confidence, a duplicate or malformed id, and a refs module on disk that the registry does not name. Written down in the test: nothing here can catch a number we invented, cited to real papers that do not name it, and labelled A. That is a review problem and the record shape makes it legible, which a bare `= 1500` never did | starts with R1 | done in the audit session |
| R10 | Technique, cueing and motor learning (no camera) | research | **synthesized 2026-08-18** (research/R10-technique-cueing.md; 24 sources, cue corpus measured, selection and outcome-tracking design) | J1 | feeds J10 |
| R7 | Populations and adaptive training (function-first) | research | **synthesized 2026-08-18** (research/R7-populations.md; 24 tier-A sources, 11 functional dimensions, 10 population packs, 30 paired fixtures, ME/CFS pacing policy) | J1 | J6 |
| R8 | Endurance, conditioning and concurrent training | research | **synthesized 2026-08-18** (research/R8-endurance.md; 42 sources, EndurancePlan shape, 20 fixtures; the 10 percent rule fails, session-vs-30-day-max is the real signal) | J1 | future endurance planner |
| R9 | Calisthenics, skill progression, mobility and warm-up | research | **synthesized 2026-08-18** (research/R9-calisthenics-mobility.md; 27 sources, ~94 rungs specified, ramp-set algorithm) | J1 | J2 follow-up + warm-up engine |
| R11 | Athletic and sport-specific S&C | research | **synthesized 2026-08-18** (research/R11-athletic-sport.md; 23 sources, SportProfile shape, 20 fixtures) | J1 | engines lane, sport-wiring job |
| R-ONT | Exercise ontology expansion (capability fields, alias resolution, substitution at scale, corpus licensing) | research | **synthesized 2026-08-18** (research/RONT-exercise-ontology.md) | J1 | feeds J6 + B3 |
| B3 | Knowledge store + retrieval layer | infra | **designed 2026-08-18** (research/B3-knowledge-store.md; tiered storage, 32KB/24-record DecisionPacket cap, lexicographic ranking, derived confidence, pg_trgm over vector DB; stage plan 0-4) | J7 contracts stable | engines lane, alongside R5, before J11 |
| R12 | Trainer authority, coaching relationship, override model (v12 s51) | research | **synthesized 2026-08-18** (research/R12-trainer-authority.md; 1444 lines, 28 sources, authority ladder, override decay, 22-row forbidden-phrase table, 27 fixtures). FIVE SEV1 DEFECTS: phase.ts:172-178 silently swaps the anchor lift at week 17 with no proposal and no undo, and the only opt-out (prefs.pinned) is unwritable; prescription.ts:99-126 opens a flagged movement 12.5 percent lighter and says nothing, the sentence being built at fatigue.ts:246 and thrown away; types.ts:680 data.prefs is read in 4 places and written in 0, so four shipped engine branches are dead code; fatigueActions.ts:93-96 stores no decline and the card has no decline control, so the same proposal returns daily for 14 days; AdaptProposals.tsx:37-41 passes 2 of 5 AdaptContext fields, inverting the guard that stops a second volume cut stacking on the automatic one | J1 | feeds J10 + the whole suggest-only contract |
| R13 | Population learning, cohort inference, privacy-preserving aggregation (v12 s52) | research | **synthesized 2026-08-18** (research/R13-population-learning.md; 1588 lines, 42 sources, 20 fixtures, CohortPrior/Blended shapes, 11 named estimands). VERDICT: `engine/calibration.ts` already IS a Buhlmann credibility estimator (`w = n/(n+PRIOR_STRENGTH)` at :235, `MAX_DRIFT` at :66) applied to 1 of ~60 hidden population constants; k should be derived as EPV/VHM, not hand-typed. Blend clamps to the HOUSE constant, never to the prior, so priors cannot compound. Cohorts cut on 5 behavioural axes (age and geo REFUSED), MIN_CELL 200 athletes / 1000 obs / 5% per-athlete cap. REJECTED with citations: federated learning, bandits, learned clustering, per-cell models, DP in v1. LIVE DEFECTS: board_stats is world-readable per-user (0001:45-46); no adaptive TDEE though weight+meals are stored (bookletOps.ts:53); stride never learned though RunLog has GPS distance AND steps (intensity.ts:124) | B3 | engines lane, inside J8 |
| R14 | Wearables, passive signals, integration boundaries (v12 s32-33) | research | **synthesized 2026-08-18** (research/R14-wearables-signals.md; 1000 lines, 32 sources, 20 fixtures, PassiveReading/SignalConflict shapes, platform matrix). VERDICT: a PWA cannot read Apple Health at all and Safari has never shipped Web Bluetooth, so every wearable read needs Capacitor. REJECTED with citations: vendor readiness scores, daily HRV, sleep stages, SpO2, wearable active calories, wrist HR for zones, cycle-phase periodisation, absolute smart-scale body fat. ACCEPTED: daily steps into extra-load, workout duration/distance, body mass. The 4-flag readiness check STAYS (Saw 2016: self-report beats objective markers) | J7 | engines lane, post-gate |
| R15 | Lifespan programming, youth LTAD through masters (v12 s12) | research | **synthesized 2026-08-18** (research/R15-lifespan.md; 1718 lines, 45 sources, 20 audit findings, 25 fixtures incl. 15 paired divergence cases). RECOMMENDATION: **set the minimum age at 18, state it, gate it.** Not because youth lifting is dangerous (children have a LOWER rate of RT sprains than adults, Myer 2009) but because every position stand conditions safety on "properly designed and supervised" and BodyT is an unsupervised load-progressing engine with a deficit path, a body-fat estimator, progress photos and an escalating voice. s4.5 lists six conditions under which 16-17 could be served later as a separate supervised mode, never a config flag. DEFECTS: milestones.ts:119 LB_PER_WEEK_CEILING is keyed by TrainingAge not age, so a 64-year-old beginner is promised 208 lb a year; generator.ts:491 calorie baseline has no age term (~310 kcal, vs the height term's 250 clamp); generator.ts:232-247 box jumps and falling-start sprints auto-select with no gate on fall history; schema.ts:224-229 + MeStep.tsx:29-47 there is no age field, no gate and no minimum-age statement anywhere in the tree | J1 | J6, with R6/R7 |
| R16 | Supplements, evidence tiers, claims fence (v12 s27) | research | **synthesized 2026-08-18** (research/R16-supplements.md; 1207 lines, 43 sources, line-by-line audit of the shipped SUPPLEMENT_CATALOG, 22 forbidden phrasings with rewrites, 27 routing rules, SupplementRecord shape + v20 to v21 migration, 22 fixtures). SHIPPED DEFECTS: foods.ts:201 "Caffeine / pre-workout" endorses the most-adulterated category; :199 magnesium 400 mg tops the 350 mg supplemental UL; :203 zinc has no supportable claim; :197 vitD ceiling sits AT the UL and stacks with :200; :319 vegetarians are served fish oil; :318-322 supplements never run through blockedBy so a stored fish allergy is ignored; :321 slice(0,3) writes a stack unconditionally (violates suggest-only). **FIXED in W5 (see section 2): the allergy check, the vegetarian filter, both over-limit doses, the fish oil unit, the pre-workout endorsement and the empty-dose render.** STILL OPEN and owner calls: removing zinc, and making the stack opt-in rather than written into every plan | J1 | product lane |
| R17 | Routine-import intelligence + competitive landscape (v12 s39) | research | **synthesized 2026-08-18** (research/R17-routine-import.md; 1683 lines, 12 sections, 61-rule notation corpus with the regex and repo field per row, 26 fixtures of which 6 must fail and ask). VERDICT: the market solves import with an LLM (Repstack, Ellim, Hevy's "generate with ChatGPT"), so the zero-LLM rule is the differentiator, and nobody does what plan/analyze.ts already does: have an opinion about the routine. DEFECTS, all verified: there is no paste path at all, the only training free text in BYOR is whyWorks (RoutineSteps.tsx:92-98); BYOR skips FOLLOWUPS and GearStep entirely (Onboarding.tsx:379), so injuries are never asked and equipment is assumed to be everything; the same day cannot run twice a week (BookletEditor.tsx:40 keys templates day-${wd}), so a 6-day PPL is six hand-built days; supersets, rest, RPE, percentage, tempo and per-exercise notes have no field | R-ONT | J4/J5 |
| R18 | Pilates, yoga, barre, group-fitness modalities (v12 s19) | research | **synthesized 2026-08-18** (research/R18-mindbody-modalities.md; 1435 lines, 31 sources, 72 corpus records with R-ONT capability fields, 26 audit findings, 18 fixtures). VERDICT: the modalities do not exist in the code at all (zero matches for pilates/yoga/barre across src, e2e, scripts); the only logging route is cardio.ts:206 'custom' at MET 6.0, roughly double the measured value. LIVE BUG: 'custom' carries conditioning: true, so a yoga class (2.9-3.3 METs) satisfies the app's one mandatory cardiovascular rule at resolveDay.ts:104. Also: weekLoad is the only function counting unprogrammed work, is on the dead-export allowlist, charges restorative yoga what it charges competitive soccer, and its two halves are ~3x apart on scale. NO PULLING PATTERN exists in mat Pilates, barre, hatha or vinyasa, so a pure class week runs a pulling deficit inside one block. 14 popular claims tabulated as unsupported, including "long lean muscles", "yoga builds bone" and yoga-beats-stretching for back pain | R9, R-ONT | catalog expansion |
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

- **PHASES RUN IN ORDER (owner, 2026-08-18). Finish one before starting the next.** The
  only legitimate reason to move on is that finishing the current phase DEPENDS on the
  next one being done or partly done, and when that happens say which dependency it was.
  Fixing bugs found along the way is fine and does not count as jumping. Picking up
  whatever a research agent most recently reported IS jumping, and that is what this rule
  exists to stop: it produced eight unplanned fix waves in one session while every job on
  the board stayed pending. Claim a job here before starting it.
- **"Synthesized" is not "done".** A research pack is done when what it specifies exists
  in code and something consumes it, not when the markdown is written. The W rows below
  track that gap and are the only place it is visible. As of 2026-08-18 the packs propose
  roughly 141 typed shapes and 1,200 corpus rows, and ZERO of the shapes exist in src.
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
- **Technique content is opt-in only (R10):** 129 of 194 exercises carry a cue, 65 carry
  none, and no test guards it. Cues are spoken only when the athlete taps STEPS or asks,
  so somebody who never asks hears zero technique for a whole block. 50 of 129 cues stack
  two or three instructions; 31 use ALL-CAPS that speech synthesis silently discards.
- ~~**Em dashes are in shipped user-visible strings (R10).**~~ Fixed 2026-08-18 (17e34f3):
  16 in shipped copy rewritten per sentence; src/copy.test.ts guards it, exempting
  platform/speakable.ts and the label migration in store/schema.ts; 2 poison mutations.
- **Layoff levers are backwards (R3, strongest-evidence finding):** after 2+ weeks off the
  CSCCa/NSCA consensus cuts VOLUME 50 percent in week 1 and 30 percent in week 2, while
  strength is largely retained to ~4 weeks (Mujika/Padilla). BodyT resets reps at 21 days
  and gives load back at 28, and cuts no volume at all. Fix in J8.
- ~~**Declined proposals are discarded (R3 + B1).**~~ STILL OPEN and now sharper: R12
  found the proposal card has no decline control at all, so there is not even a decline to
  record (`logic/fatigueActions.ts:93-96`, `screens/today/AdaptProposals.tsx:25-27`). The
  same offer can return every day for the whole 14-day signal window. Needs a cooldown
  shaped like surfacedInsights AND a way to say no. Sits with J8.
- **Four SEV1s from R12 still open.** `phase.ts:172-178` silently swaps the anchor lift at
  week 17 with no proposal and no undo, and the only opt-out (`prefs.pinned`) is unwritable.
  `prescription.ts:99-126` opens a flagged movement 12.5 percent lighter and says nothing,
  the sentence being built at `fatigue.ts:246` and discarded. `types.ts:680` `data.prefs`
  was read in 4 places and written in 0, so four shipped engine branches were dead code,
  and that is the root of the other two. W7 gave `limitations` a writer; `blocked`,
  `pinned` and `sessionMinutes` still have none, so the block list, the anchor-swap
  opt-out and the time budget are still unreachable. The proposals-context defect was the
  fifth and is fixed in W6.
- ~~**loadStepLb defect (R3).**~~ Fixed 2026-08-18 (5782733): at the top of the range a
  small-muscle lift whose only plate exceeds 10 percent of the working load spends the
  exposure on a rep and converts the second time round. increment.test.ts + 4 mutations.
  The wider per-lift banding R3 sketches stays with J7.
- **Rest defaults short for heavy compounds (R3):** ACSM says 3 to 5 min for 1 to 6 RM;
  BodyT caps at 240 s and mostly prescribes 90 to 150 s. The moderator is training status,
  not exercise type.
- **Readiness 2-of-4 over-weights weak items (R3):** sleep and low energy are evidence
  backed, soreness is not; proposed weights 1.0/1.0/0.5/0.5 at threshold 1.5. Golden-lock
  visible, so it ships alone.
- ~~**ALLERGY SAFETY BUG (found by R4).**~~ Fixed 2026-08-18 (38f9f2e): plan/foodLimits.ts
  reads it, exclusion-only, applied after the pool widening, empty stays empty. Meals,
  written examples, grocery list and swap sheet all filtered; the sheet names what it is
  skipping. 21 tests, 4 mutations. The rest of J9 (cost/minutes/effort axes, batch
  chaining, fit-remaining-macros) is untouched and still blocked on carbs/fat below.
- ~~**LIVE PRIVACY DEFECT (found by R13).**~~ FIXED on prod 2026-08-19, owner approved.
  `public.board_public` serves the leaderboard with `updated_at` coarsened to the week,
  the three-session floor and the 45-day cut moved inside the view, and `board_stats`
  SELECT narrowed to own-row. Applied in three steps in this order and no other: create
  the view, deploy the client that reads it, then narrow the table. Repo carries it as
  `supabase/migrations/0002_board_public_view.sql`.
  **The trap, written down because it nearly shipped:** a single-table view is
  auto-updatable and this one is SECURITY DEFINER (it has to be, or an own-row table
  gives every athlete a leaderboard of one). Supabase's default public-schema grants gave
  `authenticated` INSERT, UPDATE, DELETE and TRUNCATE on it, and writes through a definer
  view run as the owner and never see RLS. Any signed-in user could have rewritten or
  deleted every other athlete's row. Revoked; the view has SELECT only, anon has nothing.
  **Any future view over a private table needs the same revoke.** The database linter
  flags the definer property and it is correct to flag it and wrong to "fix" it; the
  reason is a comment on the view itself.
- Also from the security advisor, unfixed and belonging to C1: leaked-password protection
  is disabled (Supabase Auth can check HaveIBeenPwned on sign-up).
- **SUPERSEDED, kept for the reasoning:**
  `supabase/migrations/0001_core_tables_rls.sql:45-46` reads
  `create policy "board read all" ... for select to authenticated using (true)`.
  The username, goal statement and stats being visible IS the leaderboard, so that part
  is the feature. `updated_at` is not: it is server-stamped, exposed to every signed-in
  user, and nothing in the app displays it. Polled hourly it reconstructs when each
  athlete trained, which nobody opted into. The policy also has no server-side row limit,
  so the client's `.limit(50)` is a convention any authenticated caller can ignore and
  page the whole table. The fix is a `board_public` view exposing the leaderboard columns
  with `updated_at` coarsened (the client uses it only as a 45-day staleness filter at
  `cloud/board.ts:75` and a tiebreaker at `:77`, both of which survive coarsening), the
  table policy narrowed to own-row, and the client pointed at the view. NOT APPLIED: this
  changes a production database and would break the board for everyone if wrong, so it
  waits for the owner. Prerequisite for C1, not a follow-up to it.
- **Supplement stack is written into every plan unconditionally**
  (`plan/foods.ts` `.slice(0, 3)`), which is the one place the app auto-applies rather
  than suggesting. R16 calls it a suggest-only violation. Owner call: opt-in instead.
  Related and also an owner call: R16 says zinc has no supportable claim for any user
  and should leave the catalog. Neither is in the default three, so neither is urgent.
- **Age is collected and read by no engine yet (W8).** The minimum is 11, stated only to
  somebody who types a number below it, and it never blocks Next: that is the owner's
  decision (2026-08-18), overriding R15's recommendation of 18 with a gate. The field is
  on `Profile` and in the envelope. Nothing consumes it, which is the same
  collected-and-dropped pattern W2 and W7 undid, so it is logged here rather than left to
  be rediscovered. R15 names four consumers: `milestones.ts:119` `LB_PER_WEEK_CEILING` is
  keyed by TrainingAge rather than age, so a 64-year-old beginner is promised 208 lb a
  year; `generator.ts:491` has no age term in the calorie baseline (worth ~310 kcal
  against the height term's 250 clamp); `generator.ts:232-247` auto-selects box jumps and
  falling-start sprints with no gate on age or fall history; and R15's own age-band table
  wants loading ceilings, session density and deload frequency to move with it.
- **A yoga class satisfies the mandatory conditioning rule (R18, verified):**
  `plan/cardio.ts:206` gives the `custom` activity `conditioning: true` and MET 6.0, and
  `engine/resolveDay.ts:104 cardioRequiredForWeek` treats any logged conditioning as
  covering the week. Yoga measures 2.9 to 3.3 METs and a typical hatha session does not
  meet ACSM intensity recommendations, so the one health rule the app makes mandatory can
  be ticked by something that does not meet it. NOT a one-line fix: `custom` is the
  catch-all for anything unlisted, and a spin class typed as custom IS conditioning. The
  honest shape is R18 section 3 (separate energy, regional volume and systemic fatigue
  channels) or, minimally, asking rather than assuming. Next fix wave.
- **W4's increment guard is scoped to small muscles, and R15 argues it should not be.**
  R15 calls a 10 lb step on a 60 lb leg press (17 percent, outside the band) a one-line
  fix: drop the `SMALL_MUSCLE` scoping at `engine/reps.ts:243`. It is not one line, and
  the disagreement is worth recording. The exemption exists because a dumbbell rack climbs
  in fives and stalling a novice pressing the 30s would be the opposite mistake, which
  `increment.test.ts` pins deliberately. But the arithmetic is the same in both cases: a
  30 lb dumbbell press is 60 lb of system load taking a 10 lb jump, exactly like the leg
  press. The real discriminator is whether a smaller increment is physically AVAILABLE
  (leg press and barbell yes, fixed dumbbell rack no), which needs equipment granularity
  the repo does not model yet. Do it with that model, not by deleting the scope.
- **Meal records carry protein and kcal only, no carbs or fat**, so every swap taken
  punches a hole in the macro ring by construction (engine/stats.ts macrosFor requires
  both). Blocks any fit-the-remaining-macros ranker until fixed.
- **Vegan cliff:** effective meal pool by diet is omnivore 42, pescatarian 29,
  vegetarian 26, vegan 11; vegan breakfast and late-night are 2 each, and
  mealAlternatives silently widens rather than saying why.

- ~~Bodyweight athletes cannot be promoted; in-session engine silent on bodyweight (J2).~~
  Fixed 2026-08-18: rep-max verdicts + offer-ease; regressions in block.test.ts,
  sessionFatigue.test.ts, goldenLife.test.ts. Untested verdicts 41/80 -> 2/80.
- **The bring-your-own-routine path asks almost nothing (found by R17, verified):** the
  goal step sends a BYOR athlete straight to the builder
  (`Onboarding.tsx:379 onNext={() => (mode === 'byor' ? enterBuilder() : next())}`), which
  skips FOLLOWUPS and GearStep entirely. Two consequences. (1) `goalAnswers` stays `{}`,
  so W7's limitations write is a no-op for them: **an athlete who brought their own
  routine is never asked what hurts.** (2) `makeEmptyByorPlan` sets `equipment: ALL_TAGS`
  and `owned = ['none', ...ALL_TAGS]` (`bookletOps.ts:93,108`), so they are assumed to own
  everything and substitution can offer a sled to somebody in a bedroom. Both are the same
  shape as every other defect this session: a question the engine needs and nobody asks.
- **There is no paste path for a routine at all (R17):** the only training free text in the
  BYOR flow is `whyWorks` (`RoutineSteps.tsx:92-98`); everything else is retyped through a
  picker over 194 catalog ids, one weekday at a time (`BookletEditor.tsx:368`), and the
  same day cannot run twice a week because templates are keyed `day-${wd}`
  (`BookletEditor.tsx:40`). Supersets, rest, RPE, percentage, tempo and per-exercise notes
  have no field. R17's 61-rule notation corpus is the input to fixing it. Feeds J4/J5.
- secondaryGoal dead (J3). ~~foodLimits dropped~~ fixed 2026-08-18 (W2). ~~Injuries answer unread~~ fixed 2026-08-18 (W7): it seeds prefs.limitations now, though the lifecycle (expiry, edit, limit-range instead of remove) is still J6.
- Explain shelf: 181 distinct lines / 1,742 shown (J10).
- ~~Load floor = one step (20% of a 25 lb dumbbell); failing-flag opens a band not a line (J2/J7).~~
  Fixed 2026-08-18: proportional floor + flag hysteresis; regressions in
  prescription.test.ts and progression.test.ts. Finer per-lift banding stays with J7.
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

- **2026-08-18 - FIX WAVE 1 - Reconciliation audit session.** Research found defects the
  code review never would, so they were fixed before more research ran. Shipped live at
  a395512: (1) THE WIPE - dietStyle 'pescatarian' was written by the generator and
  rejected by the plan schema, so hydrate threw, parked the state as corrupt and returned
  an empty app; every session and measurement vanished from view for that athlete. Fixed
  the enum, added store/dietStyle.test.ts which derives the list from the DietStyle union
  itself (a new style that is not added here stops the build), and taught hydrate to
  reclaim a parked copy when it validates and only over a state nobody has onboarded into.
  (2) TWO PHANTOM KEYS - the generator read 'speed-now' and the runs engine read
  'race-distance'; the real ids are 'sprint-feel' and 'race-what' and the compared option
  text had drifted too, so the gentler sprint ramp and the race picker were both dead.
  runs.test.ts had been seeding the phantom key. New plan/goalAnswerKeys.test.ts walks the
  source and checks every goalAnswers read against what buildFollowups actually produces.
  (3) scripts/poison.mjs no longer hardcodes its root. Validation: 1,207 unit, e2e 38,
  sim 20 personas, poison 81/81, deploy confirmed. NEXT FIXES: the allergy leak (foodLimits
  never reaches the meal plan), the em-dash sweep with a repo-wide guard, and J6's
  limit-range mode so a knee limitation stops emptying the squat pattern.

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
- **2026-08-18 · J2 · Engines lane session.** Round three Part A, all six items:
  (A1) prescription-echo sweep finished (repMaxSeries, detectPRs bodyweight branch,
  achievementFacts e1RM/rep-max/tonnage read achieved ?? reps); phase verdicts judge
  unloaded lifts on the rep-max series, same MIN_SESSIONS_TO_JUDGE, gain floor
  REP_GAIN_TO_PROMOTE = 2; respondToSet returns offer-ease for unloaded shortfalls.
  (A2) soften floor = max(loadStepLb, round5(0.6 x baseline)), floor never raises,
  guard proven to bite (failing + 90-day layoff on a 25 lb press: 10 lb, was 5).
  (A3) failing flag hysteresis: raise at 3 shorts in window, clear only on 2 clean
  sessions in a row, clearing forgives the ledger; flag/clean/short/clean stays
  flagged, pinned in progression.test.ts. (A4) debrief composes against session.date
  (streak + insights window; consumers audited, only coach-feed timestamps still use
  wall clock and nothing reads them for logic). (A5) dead-export guard live in
  structure.test.ts with a 48-entry shrink-only allowlist and a stale check, proven
  to bite on a planted export; goldenLife.test.ts pins 8 deterministic weeks (69-line
  snapshot, run twice to confirm). (A6) goal-aware debrief pools appended after
  existing variants so anti-repeat ids stay stable; distinct-ratio recovery
  0.120 -> 0.150, eat 0.221 -> 0.294. Full ritual green (1,194 tests, e2e 38 pass,
  build, sims, poison 81/81); commits d23e6d1 + dd4b0a5 pushed to the engines branch
  and fast-forwarded to claude/app-audit-refinement-sjw2va (owner-granted for this
  job); deploy confirmed live by bundle hash index-u6su8hMr.js; 390px screenshots
  reviewed (Today, Focus, Week, Meals, Progress, Coach all clean). Learned along the
  way, for other lanes: scripts/visual-check.mjs still walks the PRE-rebuild
  onboarding and cannot get past the landing (product lane should update it with J3),
  and the Progress screen ships an em dash in "Targets never move — the dates do"
  (J3 copy sweep). NEXT: engines lane is J7 (user model + nutrition engine, R1 first)
  in a fresh session; J3 (product) and C1 (cloud) remain unblocked and untouched.
- **2026-08-17 · J0 · Reconciliation audit session.** Reconstructed all four workstreams
  from git topology, session records, five published artifacts and two full code
  inventories; read v12 in full; produced the dashboard artifact and this file.
  No app code modified; no session resumed. Verified merge preview between the two live
  tips (2 mechanical conflicts). Supabase approved by owner; cloud lane added. NEXT:
  owner answers any of Q1-Q6, then Algorithm session resumes at J1 with the exact
  instructions in the dashboard (section 08/09) and section 2 above.

---

- **2026-08-18 · R6 + R1 · Reconciliation audit session.** Research packs synthesized and
  committed to research/ on the working line. R6: red-flag classifier, GYR rules,
  targeted questions, functional mappings, 28 adversarial cases, RED-unbypassable-by-type
  integration design (ACOG paywalled, compensated conservatively; disagreements preserved).
  R1: BMR model selection, activity-from-logs, weight bands + step rule, sourced macro and
  fibre rules, 14 table-tests. Both: RESEARCH SYNTHESIZED, not yet engine-integrated.
  NEXT: J3 consumes R6 (product lane); J7 consumes R1 (engines lane); C1 spawn pending
  session-tool availability.

- **2026-08-18 · fix waves 1-4 + research wave 3 · reconciliation audit session.** Four
  defect waves shipped to the deploy branch (see section 2 for the detail): the
  pescatarian account-wipe and two phantom goalAnswers keys, the allergy leak, the em-dash
  sweep and its guard, and the load-increment band. Every one came out of a research pack
  reading live code rather than out of a bug report, which is the argument for finishing
  the packs. Structure allowances went down three times to pay for the changes and never
  up. Research wave 3 launched 5 packs and wave 4 launched 2; all 7 agents hit a session
  limit, 3 got their source tables onto disk and 1 its outline, and 4 have been resumed
  from their own transcripts. R15, R17 and R18 need relaunching.
  NEXT, in order: finish R12/R13/R14/R16, relaunch R15/R17/R18, then J6 limit-range mode
  (a knee limitation currently empties the squat pattern instead of narrowing it, which
  R7 and B3 both call the highest-value single change available). J3 and C1 still want
  their own sessions.

- **2026-08-18 · OP1 · Off-plan training session (owner request).** The owner: "I
  currently cant do specific exercises or log small workouts i did myself. People should
  be able to scroll through various general workouts or do previous days from their plan
  especially if they missed a day and want to make it up." All three shipped on branch
  `claude/custom-exercises-missed-workouts-t3130o` (based on deploy-branch tip b7c0745;
  owner merges when ready, deploy.yml untouched per the one-deploy-branch rule):
  (1) OWN WORKOUTS: startCustomSession in logic/sessionStart.ts builds a real SessionLog
  (templateId 'custom', new optional customTitle field in sessionTypes + sessionSchema,
  no migration needed) from picked items, through a setsFor helper extracted from
  startSession so prefill, rep-range collapse via repLabel, and the light-flag rules
  cannot drift between the scheduled and off-plan paths; markDone logs it after the fact
  and finishSession debriefs it. ExercisePicker extracted from BookletEditor.tsx (479 ->
  312 lines) to screens/booklet/ExercisePicker.tsx and reused by the new
  OwnWorkoutSheet. (2) GENERAL WORKOUTS SHELF: plan/generalWorkouts.ts, 14 authored
  workouts fitted per athlete through resolveForEquipment (whole-workout drop when an
  item cannot resolve, dedupe when two items degrade to the same movement, minimum 3
  distinct items), browsed in WorkoutsSheet with focus filters. (3) PREVIOUS DAYS:
  engine/reconcile.ts recentPlanDays lists the last 14 scheduled days with what became
  of each; MakeupSheet runs any of them today via the existing makeupFor machinery
  (missed/skipped = make-up, done = rerun; the debrief now says which, and the one-day
  makeupCandidate card stays, with a "pick a different day" door added). All entries
  live in screens/today/ExtraTraining.tsx: a card on rest days, one quiet line on
  scheduled days, Today only, suggest-only throughout. Ride-alongs: rest days with
  ticked work now eat as training days (nutritionDayType), the nutrition/pool tail of
  resolveDay.ts moved whole to engine/dayType.ts (resolveDay was at 600 exactly; no
  allowance touched), WeekScreen shows off-day sessions as "trained anyway"/"made up",
  cutToEssentials returns null for custom sessions instead of cutting them against the
  underlying plan day. Tests: 1,258/1,258 unit (19 new: shelf validity + equipment
  fitting + dedupe-drop proof, custom-session build/prefill/markDone, recentPlanDays,
  rest-day nutrition flip, debrief title + rerun-vs-makeup), typecheck clean, build
  green, **e2e 75 passed / 0 failed** including 3 new offplan specs, sim 20x20 zero
  invariant failures, sim 20x8 clean, poison 91/91.
  LEARNED, IMPORTANT FOR EVERY LANE: the e2e suite on the deploy tip was silently
  unrunnable on a fresh checkout. 17 spec files still clicked "Start Week 1, let's
  work" but the generated-path button has said "Start Week 1" since the onboarding
  polish (f4105e7, Aug 13), and the goal step now blocks Next until a goal is picked,
  which stranded four more walks; the truth-test also asserted the pre-rebuild
  focus-area toggle ("Let's get specific") that no longer exists, and reset.spec
  asserted pre-rebuild rebuild copy. Past "passes" can only have come off a stale
  preview server: playwright.config.ts has reuseExistingServer true and `vite preview`
  serves whatever dist/ is lying around, so a server left over from before a copy
  change validates the old build. Kill the port or bust the server before trusting a
  run. Fixed all of it: 18 label call sites, goal picks in 4 walks, truth-test
  rewritten to the current flow, reset copy updated; suite green end to end for the
  first time since the polish landed. When the owner merges this, the deploy branch's
  e2e goes from silently-red to green. NEXT: nothing owed on OP1. J3 (product), J7
  (engines), C1 (cloud) remain the open lane heads; the research relaunches
  (R15/R17/R18) still want doing.

- **2026-08-18 · OP2 · Off-plan training session (owner request).** The owner, on seeing
  OP1: "You need to add the how the workout works question mark so people can see what
  workouts and plans they are doing." The app could explain a MOVEMENT (guide, demo,
  muscle map, reason, on every exercise row) and could not explain a SESSION or, honestly,
  a PLAN. Shipped on the same branch:
  (1) `engine/workoutBrief.ts` composes the brief from the day on screen, never from the
  template, so it cannot drift from what is actually being asked: size (sets, movements,
  estimated minutes), what it works (counted per muscle, 1.0 prime mover / 0.5 assisting,
  as a body map plus a bar per muscle), the order band by band WITH the sequencer's own
  reasoning attached, and where the day sits (week, block, deload, max-effort, tier,
  make-up, and the athlete's goal statement in their own words). `briefForItems` for
  off-plan work, `briefForDay` for scheduled days, `briefForSession` owning the
  custom-vs-scheduled fork so three screens do not each carry a copy.
  (2) The `?` is on the Today hero (beside the day title, the twin of the per-exercise
  one), on every shelf workout, and in the Week tab's day preview.
  (3) THE PLAN READER WAS THE OWNER'S BOOKLET, SHOWN TO EVERYONE. Coach > The Plan
  rendered plan/guide.ts GUIDE_SECTIONS ungated: dunking, DJ Fridays, the penultimate
  step, read by somebody who onboarded to lose thirty pounds. `planBrief` now describes
  the booklet the athlete actually trains on (name, their goal words, their real week
  day by day off tier1ByWeekday, and the four rules that genuinely govern it: four-week
  blocks, one rep number, tiers, suggest-only), and the NAOD prose is gated to
  `sportMode === 'ball'`, the plan it was written for.
  Guard payoff: `engine/volume.ts:regionLoad` and `:regionName` came OFF the dead-export
  allowlist. Counted per-muscle volume was being computed for the trim and never shown to
  the person doing the sets; the shrink-only list got shorter, which is the direction it
  is allowed to move. Validation: typecheck clean, **1,270/1,270 unit** (12 new), build
  green, **e2e 78 passed / 0 failed** (3 new specs, one of which pins that a generated-plan
  athlete never sees the owner's prose), 390px screenshots reviewed on all four surfaces.
  NEXT: unchanged. J3 (product), J7 (engines), C1 (cloud) are the open lane heads.

- **2026-08-19 · DEPLOY · Off-plan training session.** Owner asked "Is this deployed?",
  which it was not: the work sat on the feature branch and deploy.yml ships from
  `claude/app-audit-refinement-sjw2va` only. Confirmed the gap three ways before saying so
  (gh-pages tip still `deploy: b7c0745`, live bundle `index-D_pbSwcq.js` against a local
  `index-D31AZv_E.js`, deploy branch a direct ancestor missing all three commits), then
  shipped on the owner's approval: fast-forward, push, CI run 32209553488, gh-pages moved
  to `deploy: 65ed650`, and the live bundle verified byte-identical to the local build by
  **sha256 of the actual production asset** rather than by filename. Also removed `main`
  from the deploy triggers with the owner's approval, for the reason above.
  LEARNED, for the next session that tries to screenshot production: Chromium cannot reach
  the public internet from this sandbox (ERR_CONNECTION_RESET even with the proxy passed
  through `chromium.launch({ proxy })`), while curl goes through the agent proxy fine. The
  workable substitute is to curl the deployed assets and hash them against dist/, which is
  a stronger check than a screenshot anyway; take the 390px screenshots off a local
  preview server serving the same verified bytes.

- **2026-08-19 · OP3 · Off-plan training session (owner request).** "Can we refine the new
  UI and help ppl pick their exercises too." The picker was a catalog, not help, and the
  measurement is the argument: **138 of the 194 movements are impossible for an athlete
  training on a bare floor, and the picker offered every one of them.** `canDo` and
  `equipFor` have existed since the generator was written; the picker was the one place
  that never asked.
  (1) `engine/pickHelp.ts`: the seven coarse groups people actually think in over the fine
  body-map regions, grouped by PRIME MOVERS only (counting assisting muscles would put
  every press in "arms" and make the group meaningless); `groupCoverage` reads completed
  sets out of the last 30 days, `staleGroups` ranks never-trained above long-neglected and
  stays silent for an account too young or too new to have anything honest to say.
  (2) The picker now filters to what the athlete owns by default, says how many it is
  holding back, and on one tap shows the rest with what each would cost ("needs dumbbells
  + a bench"). Muscle-group chips lead; the athletic-quality filters moved behind a
  disclosure for the athletes who want them. Choosing a group reports where it stands
  ("Back: 6 sets in the last 7 days, last trained 2 days ago"). BookletEditor passes its
  DRAFT's equipment, not the live plan's, since during onboarding the booklet being built
  is not the one on disk.
  (3) The builder shows what the workout covers and names what it misses, and bodyweight
  movements label their load "added", which is what the session screen already calls it.
  (4) UI pass: the Today entry line was a two-line grey blob competing with Start; it is
  now one quiet row.
  (5) SHARED-COMPONENT FIX: `components/ui/Chip.tsx` rendered `<span onClick>`. That is
  the exact defect the onboarding chips were fixed for (tappable with a finger, invisible
  to a keyboard, silent to a screen reader), still live in a component used in 19 places.
  A chip with a handler is now a real button with `aria-pressed`; a chip without one stays
  a span, because it is text.
  Validation: typecheck clean, **1,280/1,280 unit** (10 new), build green, **e2e 81 passed
  / 0 failed** (3 new picker specs; four of my own earlier specs needed updating for the
  copy changes, which is the cost of changing copy and was paid). 390px screenshots
  reviewed on a bare-floor athlete, which is the persona the old picker served worst.
  NEXT: unchanged. J3 (product), J7 (engines), C1 (cloud) are the open lane heads.
- **2026-08-18, research wave 4 resume, R14 wearables (agent).** R14 finished:
  `research/R14-wearables-signals.md`, 1000 lines, 32 sources tiered A/B/C, 20 eval
  fixtures of which 7 expect "change nothing". Four findings the owner needs. (1) The
  platform wall is real and undiscussable: HealthKit has no web API of any kind and
  Safari has never shipped Web Bluetooth at any version, so the current PWA has already
  harvested everything it can (location, altitude, in-session steps) and every remaining
  signal is a Capacitor item. (2) Most consumer signals are rejected on the evidence,
  not on effort: vendor readiness scores, daily HRV, sleep stages, SpO2, wearable active
  calories, wrist HR for zones, cycle-phase periodisation and absolute smart-scale body
  fat, each with the number that decides it. (3) The audit of every question BodyT asks
  a human that a sensor could answer returns 2 replacements out of 18; the four-flag
  readiness check stays, because self-report tracks training load better than resting HR
  across 56 studies. ReadinessSheet.tsx:8 literally asks a human to guess their resting
  heart rate and the correct answer is still to keep asking, with the sub-label reworded.
  (4) The conflict rule: a reading never mutates a claim, and only athlete claims reach
  badSleepDates, so the one automatic volume cut in the app stays human-triggered even
  after sleep sync ships. Proposed shapes fit the existing split (signalTypes.ts +
  store/signalSchema.ts + platform/health.ts + engine/signals.ts) with a defaulted store
  key, so no SCHEMA_VERSION bump and no migration. No production code touched.

## 10. SOURCES

- Living dashboard (this plan, rendered, republishable via url):
  https://claude.ai/code/artifact/9c3f6836-93c6-43a2-af69-04c9d31d952e
- Bodytea Open Work: https://claude.ai/code/artifact/fc913f9c-ce3c-4ac8-91f2-51d35de8328e
- Bodytea Build Ledger: https://claude.ai/code/artifact/b4466656-ceb2-4d54-ae8e-5b8870e8d0b6
- Onboarding Rebuild Review: https://claude.ai/code/artifact/5210b444-304f-483b-9f1d-5e5d8070e843
- Twenty Athletes, Twenty Weeks: https://claude.ai/code/artifact/5ac65495-882b-4c52-ba13-386017f05b1e
- Eight Weeks On The Floor: https://claude.ai/code/artifact/d065c1e5-e6d0-4a54-84bb-e488015c0f80
- BodyT Engine Playbook v12: owner-held docx (Core Intelligence, Claude Handoff edition).

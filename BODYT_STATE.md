# BODYT_STATE.md

The project's memory. If you are a Claude session working on BodyT, this file is your
briefing and your handoff. It exists because four sessions once ran without one and the
owner had to commission a full forensic audit to find out where the project stood.
Do not let that happen again.

Last updated: 2026-08-20 (J7 nutrition slice 2a: the calorie target can change after signup; OP5/OP6/OP8 the one rule, three doors: work added to a day never ends it or spends the plan's session; OP7 period reviews for week, month, quarter and year)
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
8. **REVIEW PASS at the end of every chunk** (owner instruction, 2026-08-20). Not after every
   slice, and not never: when a JOB closes, or when three or four slices have stacked on one
   another, stop building and review what is now there as a whole.

   This exists because it works. The pass that followed J7 found three real defects in a day
   of work that had shipped green four times: a weight trend with no window at all (an athlete
   flat for a month read as still losing, so the plateau rule never fired), the same
   all-history mistake repeated in two more files, and two engines contradicting each other on
   one screen (add 150 kcal / take 250 away, both rendering at once). None of it was caught by
   the slices, because **each slice only ever tested itself.**

   What the pass actually does, in order:

   - **Re-read the whole surface, not the diff.** The window bug existed from the first line
     of `weightTrend` and survived four slices built on top of it. A diff cannot show you that.
   - **Look for contradictions between engines.** List everything that can fire on the same
     screen on the same day and ask whether any two can disagree. Build a probe and PROVE it
     rather than reasoning about it; the contradiction found on 2026-08-20 was confirmed by a
     throwaway fixture, not by reading.
   - **Check paired quantities share a scope.** Any subtraction between two measurements needs
     both sides over the same window. Two of the three defects were this.
   - **Probe every new constant.** Set it to an absurd value and run its spec. If nothing goes
     red, the constant guards nothing: either write the test that makes it bite or delete it.
     This found `REAL_BF_CHANGE_PCT` doing a job nobody had named.
   - **Look at the screen at 390px as a whole**, not card by card. Five stacked advice cards
     is what building one card per slice produces.
   - **Confirm every new export has a real caller**, and that the dead-export ledger shrank
     rather than grew.
   - **Re-run the full ritual** (rule 5) plus `npm run sim` and `node scripts/poison.mjs`, and
     add a mutation for every defect the pass found, so it cannot come back quietly.

   Then record it: a checkpoint entry naming each defect, how it was proved, and what now
   guards it. A review that finds nothing gets recorded too, in one line.

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
- **OP4 (2026-08-19): the muscle maps are anatomical now.** The MuscleMap silhouette
  (flat fills, panel outlines) is replaced by a shaded figure drawn muscle by muscle:
  `components/anatomy/front.ts` + `back.ts` hold ~60 named muscle paths (each bound to a
  MuscleRegion or to null for bone/head/hands), `components/anatomy/AnatomyFigure.tsx`
  renders them with per-belly gradients, one shared key light, and an accent glow for
  working muscles; `MuscleMap.tsx` keeps its exact old API so ExerciseGuideSheet,
  WorkoutBriefSheet, ExerciseBrief and BreakScreen changed zero lines. Region vocabulary
  unchanged; muscleMap.test.ts re-pinned (every region lights, primary vs assisting
  distinguishable, resting body carries no accent, anatomy pieces bind only known
  regions). LIVE at gh-pages `deploy: 2817eed` (the merge that also carried the wiring
  wave); bundle `index-D2IMvOlN.js` verified byte-identical to the local build by sha256.
- Cloud: Supabase project **bodytea-prod** (elnvzitkfwzybkxcjytf, us-west-1). Tables:
  profiles / states / board_stats. NEVER touch the "Forvm Data" project. Supabase use is
  APPROVED by the owner (2026-08-17); the cloud lane is scheduled work.
- Known data leaks in shipped onboarding (fix = J3): the universal injuries answer is
  collected and read by nothing; foodLimits (dairy-free, allergies) are assembled and
  dropped; `secondaryGoal` is a dead field.
- Measured explain ceiling: 1,742 coaching lines shown over a simulated 8 weeks, only 181
  distinct. Bodyweight-only athletes: 41 of 80 phase verdicts "untested" (fix = J2).
- The decision ledger is live and is the app's memory of what it tried (B1, J8). Append-only
  rows in `data.decisions`, no SCHEMA_VERSION bump. Four rules write to it: the calorie step,
  the nutrition recheck, the two training adaptations, and the deload. Three of those four are
  judged after a pre-registered window and say the answer out loud, including when it is no.
  THE `type` AND `metricId` STRINGS ARE A WIRE FORMAT: they are stored as free strings, so
  renaming one orphans every row a real athlete already has. engine/proposals.test.ts pins
  every one of them as a literal, and builds its fixtures from literals rather than from the
  constants it checks.

## STATUS BOARD (the roadmap; statuses: pending / in-progress / done / blocked)

| id | job | lane | status | depends on | owner session |
|----|-----|------|--------|-----------|---------------|
| J0 | Reconciliation audit + this file | - | done 2026-08-17 | - | BodyT project state reconciliation audit |
| J1 | Reunify branches, carry this file to canonical branch, wire sims into npm, settle deploy branch | gate | **done 2026-08-18** (executed by the audit session after the algorithm session wedged; merge eaf3519 live) | J0 | reconciliation audit session |
| J2 | Bodyweight progression (phase verdicts + in-session response for unloaded work, pct load floor) | engines | **done 2026-08-18** (engines lane session; A1-A6 all landed, deploy d23e6d1) | J1 | Algorithm session |
| J3 | Onboarding closure: confirm review fixes, name decision, injuries->Prefs.limitations, foodLimits->meal plan, dead fields, first paired-profile eval | product | pending | J1 | App audit and refinement |
| J4 | Freeform-first entry (composer primary, chips demote to examples; reuse inferGoal/readStatement) | product | pending | J3 | App audit session |
| J5 | Booklet regenerates: goal edits -> generatePlan -> diff for approval; history preserved | product | pending | J3 | App audit session |
| J6 | Limitations lifecycle (short/long-term, what hurts, region routing, expiry+restore) + core coverage guarantee + advisory volume cap for user-authored routines | either | **headline done 2026-08-19 via W7p** (limit-range: a declared joint narrows the plan instead of emptying a whole pattern). Remaining: the lifecycle itself (short vs long term, expiry and restore, editing), the core coverage guarantee, and the advisory volume cap for user-authored routines | J1 (J3 helps) | tbd |
| J7 | User model (userModel.ts: EWMA weight, lean mass, work capacity, per-muscle recovery, per-exercise progression rate, adherence shape; facts carry source/confidence/recency) + nutrition engine (Katch-McArdle when BF known, activity from logs, carb cycling, fibre floor, self-explaining numbers) + calorie-autoregulation seed | engines | **DONE 2026-08-20** (engine/userModel.ts: UserFact<T> carrying value, source, sample count, asOf and a DERIVED confidence; weightTrend as an EWMA that knows when creatine is confounding it, workCapacity, recoveryByRegion, adherenceShape, readUserModel; 12 tests, 5 guards proven to bite, 6 mutations). Every function returns null until it has something to say, which is the calibration.ts pattern and the right answer for a new account. FIRST CONSUMER WIRED THE SAME DAY: kcalBumpSuggestion rests entirely on "the scale is not moving" and read two raw weigh-ins to decide it; it now declines when the trend is confounded, because the dangerous direction is coming OFF creatine, where the water drop reads as under-eating and the app would tell somebody to add calories they do not need. NUTRITION SLICE 1 (2026-08-19): plan/bmr.ts, R1 section 2 and 3. The calorie baseline was bodyweight x 15 with no study behind it, no age term, and linear in total mass, so it put a 320 lb man at 4,875 kcal maintenance while two validated equations put him near 3,200. Three models now, best-first: Katch-McArdle (Cunningham 1991) when a fresh tape reading exists, Mifflin-St Jeor when height AND age exist, the old number last and unchanged so nobody moves without new information. Activity is R1 architecture (a): a non-training multiplier off the NASEM PAL bands plus each session's own net MET cost, never a blended multiplier, so a workout cannot be counted twice. Age was collected at signup and read by ONE screen; the tape estimator fed a chart and nothing else. Both reach the number now. engine/userModel.ts gained bodyComposition as a fifth fact (median of the last 3 readings, retired by 60 days OR 5 percent weight drift). plan/bmr.refs.ts carries the provenance and is the file that makes the tier column earn its keep: two A-tier equations and one tier-D house number that has no source, sitting side by side in code that made them look identical. 40 new tests, 9 mutations. NUTRITION SLICE 2a (2026-08-19): engine/nutritionRecheck.ts. Slice 1's model could never actually fire for a real athlete, because buildNutrition ran once at signup and nothing recomputed it, while the tape flow lives on a screen people reach days later. The plan now carries nutritionBasis (what the number was computed from, and what it was last CONFIRMED against), both nutrition paths write it, and the Meals screen offers the better number when a real input moves. Suggest-only: the engine never writes, applyRecheck is a separate act behind a tap. Sessions counted are COMPLETED ones, which is what J7's adherenceShape is for and the first place the facts layer pays for itself. Ownership rule: typing a target in the booklet editor clears the basis and mutes the recheck forever; declining keeps the number and stamps today's knowledge, so no once does not mean silence through the next forty pounds. Four files split to stay under caps (nutritionTypes, profileTypes, nutritionSchema, measurementSchema); types.ts 696 to 691, store/schema.ts 602 to 578; readUserModel and adherenceShape came OFF the dead-export ledger. NUTRITION SLICE 2b (2026-08-19): two flat constants that mis-scaled. (1) The rest-day drop was 300 kcal for everybody: about right for an 86 kg man lifting an hour, roughly double the session cost of a 54 kg woman lifting 45 minutes, which made her rest days punitive for no reason anyone could point at. It is now (MET - 1) x kg x hours, bounded 150 to 400, and 300 turns out to be exactly what that rule returns for an 86 kg hour. The rest-clamp test in kcalFloor.test.ts had predicted this in its own comment and now asserts the clamp BINDS rather than that it is redundant. (2) engine/energyAvailability.ts: EA = (intake - exercise) / FFM, warning under 30. This is the check no floor can make, because a floor does not know how much somebody trains; R1's eval case 10 (120 lb, 18 percent, six lifts and 30 km a week, eating 1,400) is reproduced to the decimal at EA 22.6. The 30 line is female-derived so a man below it gets a CAUTION not a finding, and a test asserts the rendered copy names no condition on either side. Needs a tape AND logged sessions or it returns nothing. NUTRITION SLICE 2c (2026-08-20): engine/calorieStep.ts (R1 s4.2) and the fibre floor (s5.5). R1 IS NOW FULLY WIRED. The step rule compares the smoothed trend against the goal's band and applies HALF the static 3,500-per-pound correction, clamped 100 to 250; the halving is the pack's own sourced limitation, not caution. It declines on a confounded trend, on under 14 days of history, and on goals with no rate band; floors and the 25 percent cap outrank it and it reports the step it will actually take rather than the one it wanted. weeklyLossRangeLb and weeklyGainRangeLb came OFF the dead-export ledger. Fibre is 14 g per 1000 kcal of prescribed calories, shown as a chip not a ring because nothing logs fibre. ALSO FIXED HERE, a defect in J7's own facts layer: weightTrend computed an EWMA, never read it, and returned an endpoint-to-endpoint slope; it is a least-squares regression now. AUTOREGULATION SEED (2026-08-20, engine/maintenanceLearned.ts) CLOSES J7. Every maintenance number was a prediction, and R1 s7.5 says the gap widens exactly where it matters: maintenance falls as a cut goes on by more than the lost mass explains, and stays down. measured = mean intake - (weekly change x 3500 / 7). Half that equation is a scale and half is somebody remembering to log, so the measurement never replaces the model: it gets a vote scaled by how much of the month was logged, capped at half for a perfect month. Errors fall the safe way (an under-reported log reads as LOW maintenance, which TIGHTENS the deficit cap); the rare dangerous direction is caught by a 40 percent sanity band. The step rule's cap now measures against the learned number. J7 IS COMPLETE. Carb cycling scaled to bodyweight is DONE (slice 2b, the rest-day swing IS that rule), and self-explaining copy exists for the two surfaces that have shipped (learnedCopy, energyCopy) rather than as a general template layer. Four of the five exports are on the dead-export ledger with J8 named as the consumer: volume autoregulation needs hardSetsPerWeek, schedule fit needs trainsOnWeekday, exercise fit needs daysSinceRegion | J1, J2 | Algorithm session |
| J8 | Learning loop completion: volume autoregulation, schedule fit, exercise fit, intervention follow-up; all suggest-only on the calibration.ts pattern | engines | pending | J7 | Algorithm session |
| J9 | Meal & chef engine: cost/minutes/effort/batchFriendly axes, fit-remaining-macros, batch chaining, no-repeat guards, sliders | product | pending | J1 (J7 feeds it) | product lane |
| J10 | Explain expansion + jargon-ban sweep; machine rationale split from user sentence | tbd by Q1 | blocked on Q1 | J1 | tbd |
| J11 | Candidate strategies lite: 2-3 genuinely different plans, scored, one recommended, compared in J5's diff UI; generic-convergence gate over 20 personas | planner | pending | J5, J7 | tbd |
| J12 | Core-complete gate: sims + poison + paired profiles + convergence in CI; run the engine-ready checklist; passing unlocks post-core | prove | pending | all above | tbd |
| C1 | Cloud foundation & security: RLS audit, server-side sign-in lockout, push backend (free push only), sync hardening, narrow username lookup (id/username/avatar ONLY), USDA food-proxy edge function; indexes + pagination day one | cloud | pending | J1 | new session or revived "Comback for native" |
| C2 | Profile & social surface: social = 4th Progress view; profile via header avatar; pinned badges; zero new tabs | cloud | pending  **COLLABORATE FIRST: a UI/UX redesign is in flight in another session; ask it for the surface before building this.** | C1 | cloud session |
| C3 | Friends, groups & challenges: reviewed RLS per table; unlock the 12 pending achievements; anti-farming in the fact layer | cloud | pending  **COLLABORATE FIRST: same redesign lane as C2.** | C2 | cloud session |
| T21 | Custom food lookup: Open Food Facts (keyless) first, USDA via C1's proxy; platform/foodLookup.ts + engine/nutrition.ts split; local cache; manual fallback never blocks logging | ride-along | pending | J9, C1 | tbd |
| RA | Small ride-alongs: max/avg ride speed; set-too-fast confirm; getExercise no-throw guard for live sessions; FocusView.tsx owes a split (allowance bumped to 670 in the reunification merge, must come back down) | ride-along | pending | touch-adjacent | any |
| OP1 | Off-plan training (owner request): own-workout builder from the exercise list, general workouts shelf, run-any-previous-day make-ups and reruns | product | **done + LIVE 2026-08-19** (deploy 65ed650, owner approved the merge) | J1 | off-plan training session |
| OP2 | Session and plan explainers (owner request): a "how this works" question mark on the day, the shelf and the week preview, plus a generated plan reader that replaces the owner-only NAOD prose | product | **done + LIVE 2026-08-19** (deploy 65ed650) | OP1 | off-plan training session |
| OP3 | Exercise-picking help (owner request): equipment filtering, muscle-group browsing, neglected-group suggestions, build coverage, and a UI pass on the off-plan surfaces | product | **done + LIVE 2026-08-19** | OP2 | off-plan training session |
| OP4 | Real-anatomy muscle maps (owner request): replace the stylized silhouette body maps with a shaded anatomical figure, every superficial muscle drawn and individually lit | product | **done + LIVE 2026-08-19** (owner said deploy; merge 2817eed carries OP4 plus the W10/W11/W16/W18/W4m wiring wave, deploy.yml untouched) | - | 3D body muscle models session |
| OP5 | Extra work adds to the day instead of replacing it (owner bug report): append not overwrite, day stays open to 3am, one day one debrief | product | **done + LIVE 2026-08-19** (deploy 1450838) | OP1 | off-plan training session |
| OP6 | Extra work never ends the day and never spends the plan's session (owner bug report, the same one twice): logExtraWork seeds the scheduled workout and adds inside it, the door stays open mid-session, a debrief only comes from a day that is over | product | **done + LIVE 2026-08-19** (deploy 316976c, live bundle verified byte-identical by sha256) | OP5 | off-plan training session |
| OP7 | Period reviews (owner request): a Wrapped-style review when a week, month, quarter or year closes, with progression, highlights, goals accomplished and a cohort comparison; the week always asks for front and side photos, the quarter and year show the first photo next to the latest | product | **done + LIVE 2026-08-20** (deploy 9a70b5d, live bundle verified byte-identical by sha256) | OP6 | off-plan training session |
| OP8 | A make-up never eats the day it runs on (owner bug report, the third door): startSession merges instead of overwriting, and Today offers the day's own session while the plan's work is still owed | product | **done + LIVE 2026-08-20** (deploy a24ef44, live bundle verified byte-identical by sha256) | OP6 | off-plan training session |
| OP9 | The day knows whether ITS OWN workout has been started (owner: "the day is still closed"): SessionLog.ownPlanStarted, because an A/B week repeats a template and the movements alone cannot tell a make-up from today's session; plus the hero naming today rather than the day that was made up | product | **done + LIVE 2026-08-20** (deploy 9b355c5, live bundle verified byte-identical by sha256) | OP8 | off-plan training session |
| OP10 | Nothing claims the day is done while today's workout is owed (owner: "bro why is it still closed"): the finished-day card stops grading the day and says "Today is not done", and the hero stops naming the made-up day once today's session is running | product | **done + LIVE 2026-08-20** (deploy de04e6a, live bundle verified byte-identical by sha256) | OP9 | off-plan training session |
| OP11 | The day's workout list comes back while its work is owed, and the coach's offer can be closed (owner requests) | product | **done + LIVE 2026-08-20** (deploy 5019cf1, live bundle verified byte-identical by sha256) | OP10 | off-plan training session |
| R6 | Safety boundaries + functional constraints pack | research | **synthesized 2026-08-18** (research/R6-safety.md; PAR-Q+ 2025 verbatim, ACSM algorithm, 28 adversarial cases, SafetyRule shape) | J1 | product lane, with J3/J6 |
| R2 | Bodyweight progression standards (rep thresholds, chain-order check) | research | **done 2026-08-18** (inside J2: rep-gain floor of +2 on the max set, GAIN_TO_PROMOTE percentage kept; chains already skill-gated in nextUp, unchanged) | J1 | engines lane |
| R1 | Nutrition evidence pack | research | **synthesized 2026-08-18** (research/R1-nutrition.md; 28 sources, model-selection rule, 14 eval cases, NutritionRule shape) | J1 | engines lane, start of J7 |
| R3 | Autoregulation thresholds | research | **synthesized 2026-08-18** (research/R3-autoregulation.md; 35 sources, per-engine constant audit, 7-rung plateau ladder, 31 eval cases) | J7 | engines lane, start of J8 |
| R4 | Meal + recipe corpus expansion | research | **synthesized 2026-08-18** (research/R4-meals.md; USDA CC0 vs OFF ODbL fence, 720-cell coverage predicate, 158-record gap, 20 fixtures) | J1 | product lane, inside J9 |
| R5 | Program-family corpus | research | **synthesized 2026-08-18** (research/R5-program-families.md; 10 families, 19 sources, ProgramFamily record, selection logic, 8-axis convergence metric, 18 fixtures of which 4 fail today) | J7 schemas stable | planner owner, before J11 |
| W1n-a | First slice of W1n, done inside B2: R1's protein bands, deficit ceiling and calorie floors carry provenance. The floors are tier D and say so | wiring | **done 2026-08-19** | B2 | the rest of W1n waits on J7 |
| W-ONT | Wire R-ONT: capability fields onto the exercise catalog, alias resolution, substitution at scale | wiring | **capability slice done 2026-08-19** (plan/capability.ts: CapabilityBlock, CapabilityDemands, demandsOf, blockedByCapability; SubstituteQuery gains `cannot`; one filter line in substitutesFor; 12 tests + 3 mutations). WHAT IT UNBLOCKS: seven joints were the entire vocabulary of limitation the planner had, so R6's cannot-kneel / cannot-get-to-floor / cannot-raise-arm-overhead mapped to nothing and R6 was unshippable. They map now. Demands are DERIVED from pattern with an override list for the 30 the defaults get wrong, and the test asserts overrides stay under a third of the catalog rather than trusting R-ONT's 70 percent estimate. STILL OPEN in W-ONT: alias resolution (R-ONT s5), the Demand-scale fields (standingBalance, dynamicBalance, gripDemand, coordination), the logistics fields (spotter, space, noise, setup), and CapabilityVariants as substitution edges | wiring | B2 done | next: W6s consumes this |
| W9 | Wire R9: calisthenics/mobility rungs + the ramp-set algorithm into the catalog and a warm-up engine | wiring | **first slice done 2026-08-19** (8 previously dead-end unloaded movements gained same-pattern progressions; unloaded dead ends 40 -> 32, counted by a test rather than claimed). R9's finding: J2 taught the engine to judge an unloaded lift and 40 of 47 had nowhere to promote to, so nextUp returned null and the verdict collapsed to topped-out. STILL OPEN and the honest reason: the remaining 32 need rungs nobody has authored. The pull-up chain is the one R9 calls most valuable and it CANNOT be closed from what exists, because scapular-pull, arch-hang and negative-pull-up are not in the catalog and a weighted pull-up needs `loadable` to become a function of movement AND equipment. A test asserts pull-up still has no progression so the day somebody authors those rungs it points them here. Also open: the ramp-set algorithm and the warm-up engine, which does not exist at all. Mutation coverage was missing at the time and was added afterwards (2 mutations: a chain cut, and a second chain cut so the dead-end count is proven measured rather than spot-checked on one row) | W-ONT | |
| W18 | Wire R18: 72 mind-body records + the three-channel counting model (energy, regional volume, systemic fatigue) | wiring | **live-bug half done 2026-08-19** (six studio/class activities at compendium METs, none of the mat ones flagged conditioning; sculpt-class at 5.5 is the one that earns it; `custom` loses `conditioning: true` and drops 6.0 -> 4.0 METs; mat classes get no steps and no distance. classes.test.ts, 12 tests, 4 mutations). MEASURED BEFORE: logging a yoga class through `custom` satisfied `cardioRequiredForWeek`, so the app's ONE mandatory health rule was switched off by an activity measuring 2.9-3.3 METs, which is light on the ACSM and AHA scale, while the calorie estimate ran roughly double on an assumed 6.0. MEASURED AFTER: an hour of yoga, and an hour of anything the app cannot name, both leave the week still owing a session; a sculpt class and a run both close it. The end-to-end assertion runs through `cardioRequiredForWeek`, not the catalog, because a flag nobody reads is a flag that can be quietly re-flipped. STILL OPEN in W18: the 72 records themselves and the three-channel counting model (energy, regional volume, systemic fatigue), which is the actual wiring job | W-ONT | the yoga-satisfies-conditioning bug is closed |
| W11 | Wire R11: SportProfile shape + 32 sport rows; the sport answer is currently collected and unread | wiring | **steps 1-3 of R11 s5.5 done 2026-08-19** (plan/sportProfiles.ts: SportProfile with WEIGHTS 0-3 rather than an ordered list, all 28 real sports, 15 position tables; plan/sportPlan.ts: the transfer join; followups.ts derives SPORT_QUALITIES and POSITIONS from the profiles so there is one table; generator reads sport + position, re-ranks slots, writes sportMode and a strategy line. 16 + 4 tests, 6 mutations). MEASURED BEFORE: `sportOf` was exported and called from NOWHERE, `SPORT_QUALITIES` was read only by a test of its own shape, and `MOVEMENT.transfer` was declared 52 times and read by one test. Four questions collected, none read. MEASURED AFTER: two sports give two different booklets; a basketball answer sets sportMode ball, which switches on practice machinery resolveDay has had all along. STILL OPEN in W11: R11 steps 4-6, which are quality-resolved DRILL slots out of the athletic library, season state and practice load. Two honest tripwires pin what this slice cannot do: keeper and striker still get the same booklet (nothing in the barbell pools transfers to reactive-agility or force-absorption), and 7 of the qualities sports LEAD on are unreachable through `transfer` at all, golf being the starkest since rotation is the entire sport. Both lists shrink when step 4 lands | W-ONT | |
| W6s | Wire R6: SafetyRule shape, red-flag classifier, PAR-Q+ gate | wiring | **constraint half done 2026-08-19** (plan/safetyRules.ts: ConstraintId, SafetyConstraint, CONSTRAINTS covering all 12 of R6 s5's non-pregnancy rows, constraintsFor, planningLimits; 13 tests + 3 mutations). R6's table has been synthesized and UNUSABLE since it was written because its rows are positions and the planner only spoke joints; W-ONT gave it the vocabulary. Joint rows now carry the deep-range block as well as the joint route, which is the gap that let a bad knee still be asked for a full-depth squat. Impact caps take the minimum across limitations, never an average. Per-row confidence is preserved and a test pins that only the two rows R6 marks sourced are marked sourced. STILL OPEN in W6s: the RED/YELLOW/GREEN classifier, the PAR-Q+ question gate, the pregnancy and postpartum rows (they need a trimester input that does not exist), and userCopy | B2 | pairs with J3 |
| W7p | Wire R7: 11 functional dimensions + 10 population packs, and limit-range mode | wiring | **limit-range done 2026-08-19, which closes J6's headline** (SubstituteQuery gains `limited`; planningLimits returns limited rather than avoid; the penalty dominates the closeness scoring rather than trading against it). MEASURED BEFORE: a declared bad knee returned NOTHING for all seven squat movements, because every squat in the catalog stresses the knee and `avoid` is a hard reject, so that athlete got no lower body work at all. MEASURED AFTER: every one returns leg-press and wall-sit, which is what R6's own knee row prescribes. `avoid` keeps its hard-reject meaning for the pain path, which is a different input. STILL OPEN in W7p: the 11 functional dimensions and the 10 population packs | W6s | J6 headline closed |
| W1n | Wire R1 + R3: NutritionRule and ProgressionRule tables, replacing invented constants | wiring | pending | J7 partial | J7 owns the shapes these hang off |
| W4m | Wire R4: meal corpus to the 720-cell coverage predicate, carbs and fat on every record | wiring | **macros + the predicate done 2026-08-19** (carbsG and fatG on all 42 records, reconciled 4P + 4C + 9F against the stated calories to within 0.9 percent on every one; plan/mealCoverage.test.ts states both of R4 s6.1 guarantees as MEASURED numbers; slotKindOf reads the two-meal split; 9 tests, 3 mutations). R4 says the guarantees must be written BEFORE any corpus authoring so they fail loudly against today's 42 and turn green as waves land, so they are written as exact shortfalls rather than a red suite: the pool count for all 20 diet-by-slot cells is pinned, the three cells that cannot offer three choices are named (all vegan: breakfast 2, snack 2, late 2), and the protein ceiling is pinned at 59 g against the 90 g a two-meal anchor slot needs. FIXED HERE: slotKindOf mapped the two-meal split's own slot names to null, which switches slot filtering off, so somebody eating twice a day was offered late-night snacks for slots carrying 45 and 55 percent of their protein. STILL OPEN in W4m: the corpus itself (42 to 200, R4 s6.2), the fit-the-remaining-macros ranker (s5), cost tier, effort, batch and leftovers chaining, and the widening that hands a vegan dinners for breakfast without saying so | B2 | unblocks J9 |
| W16 | Wire R16: SupplementRecord + v21 migration, 27 routing rules (the W5 fixes were the urgent subset only) | wiring | **shape + migration done 2026-08-19** (supplementTypes.ts: SupplementRecord with dose ranges, upper limits, evidence tier, AIS group, app class, suppression signals and source refs, plus StackItem which stores an ID; plan/supplements.ts: the catalog out of foods.ts, 8 offered rows and 4 named `never`; store v21 migration; three screens resolve at read time; 11 + 5 tests, 6 mutations). WHY IT MATTERED: the W5 corrections reached the catalog and reached NOBODY. A dose was a STRING copied into a booklet at signup and read forever, so the 400 mg magnesium line, the vitamin D range sitting on its own 4,000 IU ceiling and the withdrawn zinc were all still on the screen of every account that existed before the fix. Same failure the v19 calorie repair names, with a sharper edge. After this an app suggestion is an id and its dose comes from the catalog at render time, so the NEXT correction ships to everybody with no migration. zinc is withdrawn from stored plans, not just the catalog; anything the athlete typed themselves is kept word for word, because the app may retract its own advice and may not edit somebody's health record. STILL OPEN in W16: 22 of the 27 routing rules need signals that do not exist (medications, conditions, tested-athlete, bedtime), the demand-derived rules (SR-22 to SR-24) need reading the athlete's own training, and `appClass` and `requiresDemand` are carried as data that nothing reads, pinned by a test that says so | B2 | SR-2 became LIVE off W8's age field |
| W5p | Wire R5: ProgramFamily records + selection logic (10 families) | wiring | pending | J7 partial | before J11 |
| W17 | Wire R17: 140-rule notation corpus + the import/repair model | wiring | **the safety gap closed 2026-08-19** (the routine flow asks "Anything that hurts right now?" on its own screen, into the SAME goalAnswers object, so commitPlan's existing limitationsFrom call picks it up with no second code path; 1 e2e, 1 mutation). R17 lists this first and says explicitly it is independent of everything else in the pack and should not wait for an importer. MEASURED BEFORE: every bring-your-own-routine athlete committed with prefs.limitations = [], because the injuries question lives on a screen that path never reaches, under a comment in commitPlan promising a bad knee is a bad knee whichever way the plan arrived. Half the userbase was never asked. It also meant NONE of W6s or W7p reached them. MEASURED AFTER: an e2e declares a knee in the routine flow and the swap comes back without a split squat, which is W7p limit-range behaviour reaching an athlete it could not reach before; severing the wiring puts the split squat straight back. STILL OPEN in W17: everything else in the pack, and it is the biggest one left. plan/notation.ts and its 140 rules (R17 calls this the highest-value lowest-risk piece and it needs R-ONT wave 1 first: aliases.ts and the PrescriptionUnit model), importSegment and importResolve, the review screen, the two editor fixes, and s5's advisory changes | W-ONT | this IS most of J4/J5 |
| W12 | Wire R12: AuthorityRule, the override model, a decline control and its cooldown | wiring | pending | B1 | needs the event log to record a no |
| W13 | Wire R13: CohortPrior + the credibility blend; calibration.ts already has the shape | wiring | pending | J7, B1 | |
| W14 | Wire R14: PassiveReading + the conflict rule. Mostly post-Capacitor; the accepted list is short | wiring | pending | J7 | post-gate for the sensor half |
| W15 | Wire R15: age bands into loading ceilings, calorie baseline, plyometric gating. Age is collected (W8) and read by nothing | wiring | pending | J7 partial | |
| W10 | Wire R10: cue corpus coverage (65 of 194 movements carry no cue) + selection and outcome tracking | wiring | **coverage done 2026-08-19** (plan/cues.ts: all 65 written in the house style, merged at catalog assembly; 16 guards, 6 proven to bite, 4 mutations). R10 calls the corpus the long pole and a CONTENT job, and this is that job done: coverage 129/194 to 194/194. The reason it hid is in data.test.ts, which asserts steps, muscles, qualities, why, mistakes, a video query and a rest time and never once asked for a cue, so a silent field was not a crash. It asks now. The guards are the ones R10 s10.4 names: fits the box, fits a breath, survives speakable, makes no claim about a body the app cannot see, promises nobody an injury prevented, no em dashes. Also fixed: one shipped cue was over the voice budget at 13 words. STILL OPEN in W10: selection (engine/cueing.ts, the trigger ladder, one cue ever, silence as the common output), outcome tracking (the CueIssue ledger, which R10 says belongs inside B1 rather than a private array), the TECHNIQUE table proper, and familiarity | W-ONT | feeds J10 |
| W8e | Wire R8: EndurancePlan shape, session-vs-30-day-max load rule (the 10 percent rule fails) | wiring | pending | J7 partial | future endurance planner |
| B1 | Decision + intervention event log (append-only; declines, exposure, evidence, versions, outcome windows; schema v21) | infra | **ledger + declines done 2026-08-20** (src/decisionTypes.ts + store/decisionSchema.ts + engine/decisions.ts: append-only rows carrying type, target, ruleVersion, evidence AS VALUES, offeredAt, response, plus the outcome half of the shape ready for slice 2. Three rungs: one no buys 14 days, worsening evidence may return early and must say so, three noes stop it for 56 days and nothing gets past that. Declines feed the OFFERING POLICY only, never a load, volume, calorie target or safety rule. Wired into the calorie-step and nutrition-recheck cards; the step card finally has the second button it shipped without. No SCHEMA_VERSION bump: a defaulted array parses old envelopes clean, as `adapt` and `journey` did. OUTCOMES DONE 2026-08-20 (engine/outcomes.ts): pre-registered metric/window/baseline fixed at accept time, ISOLATE closes a row as unattributable when anything else touches the same target inside its window, verdicts worked/no-change/worse/unattributable/abandoned, said out loud including the bad ones, card self-expires after 7 days. TRAINING INTERVENTIONS DONE 2026-08-20 (engine/proposals.ts as the neutral vocabulary, engine/outcomes.ts judging hold-load and reduce-volume on whether sessions after the change actually got done, COUNTED not averaged). DELOAD DONE 2026-08-20 (engine/deloadOutcome.ts): the one intervention nobody agrees to, so its row is manufactured after the fact by the same block math that scheduled the week; judged on rebound in best e1RM over 21 days either side, 2.5 lb minimum so the same lift twice is not a win, athlete-authored plans skipped. LEDGER VOCABULARY IS PINNED AS A WIRE FORMAT (engine/proposals.test.ts) after three type and metric identifiers were found guarding nothing: renaming one orphans every row a real athlete already has. STILL OPEN: the two substitution kinds (equipment, joint pain), drop-load, and the failing-flag softening) | J7 | engines lane, inside J7/J8 |
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

### UI/UX REDESIGN LANE (owner, 2026-08-19): runs in parallel, and C2/C3 must wait for it

A UI/UX redesign is in flight in another session, alongside this work. The owner's
instruction: **collaborate before building the friends/profile surfaces.**

- **C2 (profile and social surface) and C3 (friends, groups, challenges) are the handshake
  point.** Do not design or build those screens solo. Whoever picks them up asks the
  redesign lane for the surface first, then wires behaviour into it.
- **C1 is not blocked.** It is the security audit, the lockout, the push backend, the sync
  hardening and the food proxy, all of which sit under the UI rather than in it. Build it.
- Anything else that lands a NEW screen (J4's composer, J5's diff view, J11's comparison)
  should check in before committing to a layout, for the same reason.
- Engine, wiring and plan-layer work is unaffected. None of it owns a screen.

Recorded here rather than in a checkpoint entry because it is a standing constraint on the
board, not an event: it stays true until the redesign lands.

## 5. DECISIONS
### 2026-08-20 · An equipment substitute becoming the slot default (NEEDS OWNER)
  R3 s9.2 asks: when the athlete has kept an equipment substitute for 4 exposures, offer to
  make it the slot's default. The detection is easy and the storage is the problem.
  The only mechanism that exists is `prefs.blocked`, which would mean blocking the ORIGINAL
  movement. Two things stop me shipping that on my own judgement:
  (1) NOTHING IN THE APP WRITES `prefs.blocked` TODAY. It is read by adapt.ts rule 0 and set
  by nothing but tests. Accepting this offer would be the app's FIRST write to that store.
  (2) There is no screen that lists or clears blocked movements, so accepting would be a
  one-way door: the athlete could never see the choice again or undo it. That is the exact
  shape of thing this repo's standing constraints exist to prevent.
  Options, with my recommendation first:
  (a) Build the offer AND a place to see and undo it, as part of the UI/UX redesign lane
      that already owns the profile surfaces. Correct, and it waits on that lane.
  (b) A new `Prefs.slotDefaults` field, so "this is my squat now" is its own statement
      rather than "I cannot do the barbell one". Truer semantics, costs a schema change.
  (c) Ship it onto `prefs.blocked` with reason 'cannot' now and add the undo later. Fastest,
      and it puts a door in front of users before the handle exists. I would not.
  Blocked on the owner. The rest of R3 s9.2's substitution work (joint pain) shipped.
- **A deload is dynamic, not a calendar law (owner, 2026-08-19).** R17 flagged that the app
  said two contradictory things: `analyze.ts` promised imported athletes an automatic
  fourth-week deload with sets halved, and R5's F9 said preserve an imported routine
  untouched. Asked to settle it, the owner said it "needs to be dynamic pending
  situations", so neither blanket is right and the engine decides from what it can see.
  The situation it can see today is WHOSE PLAN IT IS. A booklet BodyT wrote carries a
  block BodyT designed, so running the unload week is doing the job it was asked to do. A
  routine somebody brought from home is theirs, and the standing rule is suggest only,
  never auto: they get the offer and the reason on week 4 and their sets are left exactly
  where they put them. Measured: 16 sets against 25 on the same date, the only difference
  being who built the week.
  More situations can join that decision later (accumulated fatigue pulling a deload
  earlier, a block with too little work in it to unload from). Whose plan it is, is the
  one the engine can answer today without new signals, and it is the one that was making
  the app lie.
- **Under-18 supplement suppression stands (owner, 2026-08-19).** Confirmed as built:
  R16's SR-2 suppresses all supplement copy for an account that says it is under 18. Worth
  keeping visible that this is STRICTER than the age decision for app access, which is 11
  and lets them through. Being suggested a supplement and being allowed to train are
  different questions and the owner took the conservative side of the first.

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

### 2026-08-19 · Who owns a calorie target (needs owner confirmation)

Taken while building the recheck, recorded rather than buried. Three states:

- BodyT computed it and nothing has changed since. The app may offer a better number.
- A person typed it into the booklet editor. The app never mentions it again, ever. The
  editor clears `nutritionBasis` and an absent basis means no recheck, which is the same
  shape as the deload call: whose plan it is decides who decides.
- A person was offered a change and said no. The number stays theirs, but the app stamps
  today's knowledge onto the basis, so it goes quiet until something moves AGAIN. Saying no
  once should not mute the app through the next forty pounds.

**RESOLVED SAME DAY by the owner: re-offer it.** A target typed at 200 lb is a real decision
and is also not advice at 170, so the hand-typed case now behaves like the declined one. The
booklet editor no longer clears `nutritionBasis`; the basis keeps saying what BodyT last
computed, and the GAP between that and the stored number is how the app knows a person owns
it. That gap changes what the card says ("You set this one. Since then the scale has moved.")
and never whether it appears. Absence of a basis still means silence, but that is now only
the pre-existing plans that genuinely have no record of what built them.

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
- **Two of the four `Prefs` fields have no writer (found 2026-08-20, slice 5 review).**
  `prefs.blocked` and `prefs.pinned` are read (adapt.ts rule 0, phase.ts promotion) and set
  by nothing outside tests. So "a movement the athlete does not want, and does not want to
  keep saying so about" cannot be said even once, and somebody training for a competition
  lift has no way to stop the app rotating it at a block boundary. `limitations` IS written,
  at onboarding; `sessionMinutes` is read by resolveDay and written nowhere I can find.
  prefsTypes.ts says "every field here is read somewhere, deliberately" and that is true and
  beside the point: a preference nobody can SET is the same silence from the other end.
  Fix needs a screen, so it sits with the UI/UX redesign lane.
- ~~R3 s9.2's failing-flag escalation~~ **DONE 2026-08-20**, slice 6. Kept here because the
  finding underneath it is not closed: the failing flag was the ONLY automatic adjustment in
  this app that never said why, and `FatigueSuggestion.because` had carried the sentence
  since it was written with no reader at all. Worth asking of anything else that changes a
  number: who renders the reason.
- **One e2e flake, seen once, recorded rather than waved off (2026-08-19).**
  `settings.spec.ts:68` "the detour flag does not linger for the next visit" failed one
  full-suite run on the tree that merges W17 with OP4's anatomy figure, and passed in
  isolation and on an immediate full re-run (83/83 twice either side of it). It is timing
  sensitive by construction: it clicks Close and immediately asserts the Settings dialog
  underneath, and `Sheet` moves focus on a requestAnimationFrame. The suspect mechanism is
  that OP4 added roughly 740 lines of SVG anatomy paths, so first paint got heavier;
  this spec never opens a muscle map, so that is a hypothesis and not a finding.
  NOT treated as fixed. A re-run is only a legitimate answer when a job dies before any
  test body runs, and this one ran and failed an assertion. If it recurs, the fix is to
  wait on the dialog's own title rather than on the sheet closing, and it becomes a job.
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

- R1's own eval table (section 8, "Maint. est" column) is NOT internally consistent under
  the architecture the same pack tells J7 to build. Persona 1's range only fits if that
  column means a training day; persona 11's only fits if it means a rest day; personas 2
  and 7 sit in the same activity band while requiring multipliers on opposite sides of it
  (1.366 max vs 1.376 min). plan/bmr.test.ts therefore asserts the BMR column, which is
  the published equation applied to the persona's own numbers and reproduces all nine to
  the kcal, and asserts behaviour rather than fitting a tolerance until the contradiction
  goes green. Worth a pass over R1 to pin what that column means before slice 2 uses it.

- ~~NOTHING RECOMPUTES NUTRITION AFTER SIGNUP.~~ FIXED 2026-08-19 by engine/nutritionRecheck.ts
  (slice 2a). The plan now records what its calorie numbers were computed from
  (PlanConfig.nutritionBasis) and the Meals screen offers a better number when something
  real changes. Regression: src/engine/nutritionRecheck.test.ts, 17 tests, 7 mutations.

- Onboarding never writes a weigh-in. The bodyweight typed at signup builds the plan and is
  then not stored as a measurement, so latestBodyweightLb is null until the athlete uses the
  Progress screen. Harmless for the recheck (no weight, no recheck, which is correct) but it
  means the first weigh-in reads as a change from the plan-build weight rather than the
  first point in a series. Seeding one measurement at signup is a two-line fix and would
  also give weightTrend a head start.

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

- **2026-08-19 · W18 (live-bug half) · audit session.** R18 found the one that mattered
  most and it was not a missing record, it was a live defect: `custom` cardio shipped with
  `conditioning: true` at an assumed 6.0 METs, and `custom` is where a yoga class gets
  logged because there was nowhere else to put one. So the single health rule this app
  refuses to bend, at least one conditioning session a week, was being switched off by an
  activity that measures 2.9 to 3.3 METs. That is LIGHT on both the ACSM and the AHA
  scale, and a typical hatha session does not meet the intensity recommendation for
  cardiorespiratory fitness at all. The calorie estimate ran roughly double at the same
  time, on no evidence about the activity whatsoever.
  Fixed by giving the classes somewhere honest to go: yoga slower (2.5), yoga flowing
  (4.0), pilates (3.0), barre (3.5), tai chi (3.0), none carrying `conditioning`, plus
  sculpt/weights class at 5.5 which does carry it, because 5.5 is moderate and the flag
  is not a blanket no. `custom` loses the flag and drops to 4.0. Mat classes get
  `steps: false` and `distance: 'none'`, since step-counting a Pilates class credits
  somebody with crossing a room they never left.
  The test that matters runs through `cardioRequiredForWeek`, not the catalog: an hour
  of yoga, and an hour of anything the app cannot name, both leave the week still owing
  a session, and a sculpt class and a run both close it. Asserting the flag alone would
  have pinned data nobody reads, and the whole defect was that the flag WAS read.
  Written into the source, because the pressure will come: the day somebody with four
  classes a week sees the banner, the tempting fix is to flip these to true. That trades
  an awkward sentence for a broken health rule, and the sentence is the right thing to
  fix. A mutation now enforces it.
  Also paid off here: W9 shipped without mutation coverage. Two mutations added, cutting
  two different chains, so the dead-end count of 32 is proven measured rather than spot
  checked on one row.
  Validation: typecheck clean, **1,389/1,389 unit** (12 new), build green, **poison
  119/119** (6 new: 2 for W9, 4 for W18). The harness refused to start against a dirty
  tree, which is the guard added after an interrupted run left live poison in
  generator.ts, and it was right to: the run had to wait for the commit.
  NEXT: W11 (SportProfile; the sport answer is collected and never read), then W10, W4m,
  W16, W17, in that order.

- **2026-08-19 · W11 steps 1-3 · audit session.** R11 called the sport answer "the
  biggest single lever there is" and then measured what it actually moved: nothing.
  `sportOf` was exported and called from nowhere at all, not even from a test.
  `SPORT_QUALITIES` was read only by a test asserting the table was well formed.
  `sport-role`, `sport-level` and `in-season` were asked and read by nothing. Four
  questions deep into onboarding, and a keeper and a lineman got the same booklet.
  The two things needed to fix it were already in the repo and both were dead:
  SPORT_QUALITIES says which qualities a sport needs, `MOVEMENT.transfer` says which
  lifts feed which qualities. Two halves of one bridge, neither load bearing. Joining
  them makes two sports produce two different plans with NO new data.
  What landed: weights 0 to 3 instead of an ordered list, because a list cannot say
  "volleyball needs absorption as much as vertical power and needs max velocity not at
  all", and a 0 is an instruction. All 28 real sports, 12 of them from R11's own needs
  analysis and 16 read off the old list and marked house so a later session can tell
  which is which. 15 position tables including baseball, which R11 flagged as missing
  despite being the most position-divergent sport in the list. followups.ts DERIVES its
  old tables from the profiles, so the question bank cannot offer a position the plan
  does not know.
  THE GOLDEN LOCK EARNED ITS KEEP. First run turned a press slot over for an athlete
  who had never mentioned a sport: `profileForSport(null)` was returning the general
  athletic base, so an answer nobody gave was changing plans. No sport and an unknown
  sport are different cases and now have different profiles. That is a mutation now.
  Two tripwires say what this slice CANNOT do, rather than leaving it implied. A keeper
  and a striker still get the same booklet, because nothing in the barbell pools
  transfers to reactive-agility or force-absorption; that needs drill slots resolved
  out of the athletic library, R11 step 4. And 7 of the qualities sports lead on at
  weight 3 are unreachable through `transfer` at all, golf worst of all since rotation
  is the entire sport. Both are asserted as exact lists, so they shrink visibly.
  TWO GUARDS WIDENED, both of which found more than expected. The dead-export scan now
  covers plan/, which returned 34 exports nothing calls, allowlisted with the job that
  owns each and shrink-only. And the simulation harness's own persona seeds are now
  checked against the questions: R11 named one bad seed, the guard found 11 keys that
  are not questions and 13 values not on offer, spread across nearly every persona. No
  goal-answer branch in the generator had EVER been simulated. All corrected.
  generator.ts also shed the 180 lines of deep-goal copy to plan/strategy.ts, and its
  allowance came down 940 to 790 with it.
  Validation: typecheck clean, **1,409/1,409 unit** (20 new), build green, sim 20
  personas with zero invariant failures, **poison 125/125** (6 new).
  NEXT: W10 (65 of 194 movements carry no cue), then W4m, W16, W17.

- **2026-08-19 · W10 coverage · audit session.** R10 counted the cue corpus: 194
  movements, 129 cues, 65 movements with NOTHING to say in the one line an athlete
  reads with a bar in their hands. It calls this the long pole of the whole pack and,
  usefully, a content job rather than an engineering one. So it is done: all 65 written.
  The reason it went unnoticed for the life of the app is one line of missing test.
  data.test.ts asserts steps, at least one muscle, at least one quality, a why over 40
  characters, at least one mistake, a video query and a rest time. It never asked for a
  cue, and a missing optional field is not a crash. It asks now.
  House style out of R10 s3.7: verb, external referent, one target, under 80 characters
  and under 12 words, because the voice layer says these out loud and speech.ts costs a
  10-word cue at about 4.3 seconds. External focus by default and held loosely, since
  the meta-analytic support is contested and nothing here depends on the effect being
  real. The lateral raise is the documented exception and gets to talk about feeling
  the side delt work.
  Six guards, each fed a known-bad input and watched to fail first. FIVE bit on the
  first try. The sixth, the one checking cues survive the voice layer, did NOT: it
  tested for the symbols speakable() already expands, so a planted 3x8 at 70 percent
  sailed through. Rewritten to check what speakable actually leaves behind, which is a
  digit glued to letters, because the abbreviation table matches on word boundaries and
  RPE7 and 30s come out of the synthesizer as erpee seven and thirty ess. That version
  bites. Also fixed on the way past: one already-shipped cue ran 13 words, over budget.
  The cues live in plan/cues.ts rather than beside their defs because exercises.ts sits
  four lines under its allowance and the allowances are shrink-only. A def may carry its
  own cue OR appear in the table, never both, and a test enforces it, so there is still
  exactly one place any cue can come from.
  Validation: typecheck clean, **1,425/1,425 unit** (16 new), build green, poison
  129/129 (4 new).
  NEXT: W4m, then W16, then W17.

- **2026-08-19 · W4m macros and coverage · audit session.** R4 gives one instruction
  about order and it is unusual: write the coverage guarantees BEFORE authoring any
  corpus, so they fail loudly against today's 42 records and turn green as waves land.
  Done, and written as measured shortfalls rather than a red suite, which is the same
  shape as the dead-end count in W9 and the unreachable-qualities list in W11.
  Carbs and fat now sit on all 42 records, which the fit-the-remaining-macros ranker
  needs and could not work without: a plan that has already spent its fat for the day
  cannot tell peanut noodles from a chicken plate on protein and calories alone. They
  are standard-serving estimates rather than measurements, so what makes them
  trustworthy is that they have to agree with each other: a test reconciles
  4P + 4C + 9F against each record's own calorie number and the worst drift across all
  42 is 0.9 percent. Same rule the knowledge records live under.
  What the guarantees now say out loud. The pool for all 20 diet-by-slot cells is
  pinned. Three cells cannot offer three choices and all three are vegan: breakfast 2,
  snack 2, late 2. A test asserts the consequence rather than the count, which is that
  a vegan asking for a breakfast swap gets dinners back, because mealAlternatives
  widens a thin slot rather than returning nothing and nobody is told. And the protein
  ceiling is pinned at 59 g against the 90 g a two-meal anchor slot needs for a 200 lb
  athlete, so the day the corpus can serve that person the test says so.
  ONE LIVE BUG FIXED. slotKindOf mapped Meal 1 and Meal 2, the two-meals-a-day split's
  own slot names, to null. Null means no slot filtering at all, so the split where the
  slot matters MOST was the one where it was ignored, and somebody eating twice a day
  could be offered a late-night snack for a slot carrying 55 percent of their protein.
  Mapped to lunch and dinner, narrowly: Meal 3 and up are not names anything produces,
  so an unknown label still means unknown. An existing test pinned that and was right.
  R4 s1.5 lists the dropped-restriction bug as the thing that must be fixed first. It
  already was, in fix wave 2. R4 also lists burger and chili as missing CookingMeta;
  both have it now. Both notes are stale and the pack is otherwise accurate.
  Validation: typecheck clean, **1,434/1,434 unit** (9 new), build green, poison
  132/132 (3 new).
  NEXT: W16, then W17.

- **2026-08-19 · W16 shape and migration · audit session.** The uncomfortable finding
  first: the W5 supplement fixes fixed nobody. Magnesium came down under its 350 mg
  upper limit from a range asking for 400, vitamin D came off its own 4,000 IU ceiling,
  and zinc was withdrawn for having no supportable claim. All three landed in the
  catalog, and all three reached exactly zero existing accounts, because a dose was a
  STRING copied into a booklet at signup and read forever after. Their screen still
  said 400 mg. store/schema.ts already names this exact failure mode in the v19 comment
  about calorie targets, and it was true here with a sharper edge.
  So the shape changed. An app-suggested item now stores an ID and nothing else, and
  its name, dose and timing are read from the catalog at render time. The property
  that buys is the whole reason for the work: the NEXT correction ships to every user
  on the next deploy with no migration at all.
  The v20 to v21 migration makes three calls worth arguing about, all written into the
  code beside the reasoning. Zinc is withdrawn from stored plans rather than left on
  disk, because leaving it means the app keeps telling somebody to take it for years;
  anybody who wants it can add it back, and then it is theirs and not the app's.
  Anything the athlete typed themselves is kept word for word: the app may retract its
  own advice, it may not edit a person's record of what they take. And addedAt is left
  ABSENT on migrated rows rather than stamped with today, because inventing a date is a
  lie the rest of the app then reads as fact.
  The record can now carry what a four-string type could not: an AIS group, an evidence
  tier, an upper limit, suppression signals, source ids, and a hedge that has to be
  present whenever the app offers something. Fish oil is the case that proves the hedge
  field earns its place, since its best-established supplement-specific effect is a
  harm rather than a benefit, and that now sits in the same breath as the claim.
  Four rows are carried classed `never` with the reason attached: zinc, BCAAs,
  testosterone boosters, fat burners. That is stronger than deleting them, because the
  next session that thinks of adding one finds the argument rather than an empty space,
  and a test proves nothing classed never can reach a shelf.
  SR-2, suppress everything for an under-18 account, went LIVE off the age field W8
  shipped, which is a phase-order dependency landing exactly as the rule intends. Note
  for the owner: that is a stricter line than the app-access decision, which was 11 and
  let through. Suppressing supplement copy for a minor is a different question from
  letting somebody train, and this takes the conservative side of it.
  Two things fixed on the way past. schema.ts was AT its allowance, so the v19 calorie
  repair moved to plan/kcalFloor.ts beside the floors that decide what a repair means,
  and the allowance came down 610 to 602 with it. And the dead-export scan turned out
  to count a mention in a COMMENT as a caller, which this job tripped by naming an
  unrelated export in a doc block; the caveat is now recorded where the scan is defined,
  and tightening it is its own job because it will unmask more than it fixes.
  ONE MUTATION SURVIVED the first run and it was mine: removing the whole-person
  suppression from the shelf changed nothing any test could see, because nothing
  exercised the minor signal. The guard existed and the test did not. Three tests added
  and the mutation now bites. That is the harness doing the job it exists for, on the
  same day the code was written rather than five days later.
  Validation: typecheck clean, **1,451/1,451 unit** (19 new), build green, e2e 82
  passed, poison 138/138 (6 new, one of them only after the test that catches it).
  NEXT: W17, the routine import corpus.

- **2026-08-19 · OP4 · 3D body muscle models session (owner request).** "Can we use a
  real 3d human with muscles showing and actually highlight the actual muscles instead of
  what we have now." Shipped on `claude/3d-body-muscle-models-gvvms9` (based on the
  deploy tip; owner merges when ready, deploy.yml untouched per the one-deploy-branch
  rule). The judgement call, made explicit: a true WebGL model (three.js + a segmented
  anatomy mesh) would cost megabytes of assets, a WebGL context per card on a screen that
  renders up to three maps at once, and licence work, against an offline-first PWA with a
  3.5 MB precache. What shipped instead is a render-style SVG figure that reads as 3D:
  every superficial muscle drawn as its own path (three delt heads, both pec heads,
  serratus teeth, sartorius ribbon, the quad's three visible bellies, gastroc pair,
  erector columns, the trap kite) with per-belly gradient sculpt, one shared key light
  clipped to the body, hairline-seam shared boundaries, and a bloom on working muscles.
  Regions light the ACTUAL muscle shapes now: a squat lights VL/RF/VM plus the glute
  medius sliver visible from the front; a pull-up lights the lat wing into the teres/
  infraspinatus step. Structure: anatomy/front.ts (309 lines), anatomy/back.ts (232),
  AnatomyFigure.tsx (201), MuscleMap.tsx down to 76; all under the 600 cap, no allowance
  touched, public API unchanged so all four call sites needed zero edits. Tests: the map
  test re-pinned to the new markup markers (data-m p/s/w) plus two new guards, one
  walking every anatomy piece's region against ALL_REGIONS (a typo'd region would
  compile and never light), one pinning front/back def-namespace separation (shared SVG
  ids across two mounted figures silently resolve to whichever mounted first).
  Validation: typecheck clean, 1,379/1,379 unit, build green, **e2e 82 passed / 0
  failed** (3.0m, off a preview server started fresh after the build, per the
  stale-server trap in the OP1 checkpoint), 390px screenshots reviewed on all four
  surfaces (guide sheet, workout brief, focus view, break screen). Iterated via a scratchpad esbuild+playwright preview loop, six
  visual passes; the wash state (full-body) doubles as a coverage probe since any body
  gap shows as a black hole in it. NEXT: nothing owed on OP4. If the owner later wants
  the figure interactive (tap a muscle to filter exercises), the per-region paths are
  already the hit targets; that is post-core work under the visual-overhaul fence.
- **2026-08-19 · W17 safety gap · audit session.** R17 opens its ordered next-steps list
  with something that is not about importing anything: every athlete who brings their own
  routine is committed with prefs.limitations = [], and it calls this the
  highest-severity finding in the audit. The injuries question lives on a screen the
  routine path never reaches, so "Anything that hurts right now?" was asked of about half
  the userbase, under a comment in commitPlan promising the opposite. Two jobs of
  limitation work, W6s and W7p, reached none of those athletes.
  The routine flow asks it now, on the screen that was already asking one honest
  question, writing into the SAME goalAnswers object the generated path fills. One
  answer and one reader rather than two of each, because two ways to record a bad knee
  is how one of them goes stale. The chips come from buildFollowups rather than being
  retyped, so the two paths cannot drift into offering different answers.
  The test is end to end and it was proven to bite before it was trusted: declare a knee
  in the routine flow, ask for a swap, and a split squat must not come back. Sever the
  wiring and the split squat returns immediately, which is the W7p behaviour arriving
  for an athlete who could never reach it.
  TWO PROCESS FAILURES this session, both mine and both worth the space. A poison run was
  started in the foreground and its caller timed out at two minutes; the node process
  kept going detached, mutating source while commits happened around it, and one poisoned
  line reached a commit. The first attempt to clean it restored the line BACKWARDS, since
  a shortened list reads like the honest version and a padded one reads like tampering.
  equipCoverage.test.ts caught that; reading the diff did not. Then, later, checking the
  harness parsed by importing it RAN it, because it is a script and not a module. A
  warning now sits at the top of the file naming `node --check` as the way to do that.
  The rule that comes out of both: this harness is never run anywhere it can be
  interrupted, and never imported at all.
  Validation: typecheck clean, **1,451/1,451 unit**, build green, **e2e 83 passed**
  (1 new), poison 138/138 unit and 9/9 e2e (1 new, and it needed the e2e mode: a
  mutation filed in the wrong array is a mutation that never fires).
  NEXT: R-ONT wave 1 (aliases.ts + the PrescriptionUnit model), which R17 names as a
  prerequisite rather than parallel work, then plan/notation.ts.

- **2026-08-19 · OP4 DEPLOY · 3D body muscle models session.** Owner: "Deploy". The
  deploy branch had moved while OP4 was built (the W10/W11/W16/W18/W4m wiring wave,
  seven commits, none touching the map), so the deploy tip was merged into the OP4
  branch first; the only conflict was BODYT_STATE.md itself, resolved by keeping both
  sides whole (their checkpoints then OP4's, both facts on the last-updated line). Full
  ritual re-run on the MERGED tree before anything shipped: typecheck clean, **1,453/
  1,453 unit**, build green, **e2e 82 passed / 0 failed** (2.9m, fresh preview server),
  390px re-screenshot of the guide sheet off the merged build. Then the OP1-OP3 deploy
  pattern: fast-forward `claude/app-audit-refinement-sjw2va` to merge `2817eed`, CI run,
  gh-pages moved to `deploy: 2817eed`, and the live bundle `index-D2IMvOlN.js` confirmed
  **byte-identical by sha256** (`ec101bd9...c3c3f`) to the local build of the same
  commit, curl through the agent proxy per the DEPLOY checkpoint's note that sandbox
  Chromium cannot reach production. deploy.yml untouched: one deploy branch, moved by
  fast-forward, never added to. NEXT: nothing owed on OP4; J3 (product), J7 (engines),
  C1 (cloud) remain the open lane heads.

- **2026-08-19 · R-ONT wave 1, the alias resolver · audit session.** R17 will not start
  without this. Its build order says so in as many words: aliases and the prescription
  model are prerequisites, not parallel work, and the notation parser has nowhere to land
  until a string can become an exercise id.
  R-ONT sized the problem with real data and the number is the whole argument. With an
  aggressive normalizer, only 26 of BodyT's 194 names matched free-exercise-db exactly,
  and "bulgarian" returns ZERO hits in that corpus because the same movement is filed
  under another family name. So a name matcher is a candidate generator that a person
  confirms, never an authority, and everything past step three of the ladder SUGGESTS.
  An alias that silently maps a typed movement to the wrong exercise is the parsing
  version of the load spiral: quiet, confident and wrong.
  What landed: plan/aliases.ts with the six-step normalizer, an 18-row alias table, and
  the resolution ladder from R-ONT s5.3. The parenthetical is KEPT rather than stripped,
  because R-ONT found that stripping it creates four name collisions inside
  free-exercise-db alone and every time the parenthetical was the distinction. Turkish
  Get-Up (Lunge style) is not (Squat style).
  THREE THINGS THE TESTS CAUGHT IN MY OWN WORK, which is the point of writing them first.
  The singularizer was INVERTED: it turned "press" into "pres" and left "squats" alone,
  which is both failure modes at once. A test that a word ending in s survives caught it.
  Then the alias table turned out to be nearly half dead: 15 of 34 rows were exact
  catalog names, which step 2 answers before step 3 ever runs, so they could never fire.
  Fifteen rows that read as coverage and were not. A guard now refuses that class, and
  the table is 18 rows that genuinely earn their place. And one row pointed at db-rdl for
  "romanian deadlift" when the catalog has a literal Romanian Deadlift, so the alias was
  both dead AND aimed at the wrong exercise.
  LANDED AHEAD OF ITS CONSUMER, knowingly and on the ledger. All three exports are dead
  today and sit in the plan/ dead-export list with the reason and the next slice named:
  the picker's "I do not see my exercise" exit, which R17 s9 lists as worth shipping on
  its own. Three rows and a date rather than an open-ended IOU, and the list is
  shrink-only so it is a countdown.
  Validation: typecheck clean, **1,477/1,477 unit** (24 new, 6 guards each proven to bite
  against a known-bad input first), build green, poison 142/142 (4 new).
  NEXT: wire resolveExercise into the picker, which kills three ledger rows and delivers
  R17 s9 item 3, then plan/notation.ts.

- **2026-08-19 · R-ONT wave 1, the consumer · audit session.** The slice named in the
  previous entry, done the same day rather than left as an IOU: the picker calls
  resolveExercise when a literal search comes back empty, and `resolveExercise` left the
  dead-export ledger it had just joined.
  The defect it closes is small and exactly the one R-ONT predicted. The picker matched on
  substring, so "bulgarian split squats" did not contain "Bulgarian Split Squat" by a
  single letter, and somebody was told nothing matched while the movement sat in the
  catalog in front of them. The resolver normalizes, singularizes, token-sorts, and then
  falls back to near misses, so the plural finds it.
  It only ever SUGGESTS, and the group is labelled "Closest I can find" so the screen says
  what it is doing. The tap stays the athlete's: this narrows 194 movements to a handful
  and never picks one.
  And when it genuinely does not have the movement, it now says "I do not have X" in
  words, rather than a flat "nothing matches" that reads like the athlete typed it wrong.
  R17 is explicit that the fix is NOT to invent a custom-exercise record to absorb these,
  so the exit is honest copy and a nudge, not a new entity.
  Proven by severing it: with the fallback filtered to nothing the e2e goes red, and the
  first attempt at that proof silently did nothing because the mutation broke the build
  and `&&` short-circuited the test run. A proof that cannot fail is not a proof, so it
  was redone with one that compiles.
  Validation: typecheck clean, **1,477/1,477 unit**, build green, **e2e 84 passed**
  (1 new), poison 143/143 (1 new). Dead-export ledger: 36 rows to 35.
  NEXT: unchanged. J7 is the highest-leverage thing left and nothing blocks it; the owner
  was asked and has not answered yet.

- **2026-08-19 · The deload becomes a decision · audit session.** The owner settled R17's
  blocking question and the answer was neither of the two things the app was saying. It
  had been promising imported athletes an automatic fourth-week deload in `analyze.ts`
  while R5 said leave an imported routine alone, and `isDeload` was a pure calendar fact,
  `weekInBlock === 4`, applied to every plan alike.
  Whose plan it is turns out to be a situation the engine can already see, and no schema
  change was needed to see it: `achievementFacts.ts` has been asking exactly this question
  inline since custom routines shipped. That predicate is now `isAthleteAuthored` in
  bookletOps.ts with one definition instead of two that could drift, which is a duplicate
  retired rather than a field added.
  What changed: a booklet BodyT wrote still deloads on week 4, so the golden lock does not
  move and nothing about a generated athlete's week is different. A routine the athlete
  built gets a banner offering the deload and keeps every set. `day.isDeload` now means
  what actually happens rather than what the calendar said, because debrief.ts and
  workoutBrief.ts both read it to tell somebody what tomorrow is, and the old field would
  have promised an unload that never arrived.
  The `deload-auto` note is renamed and rewritten, because it was the specific sentence
  the owner's decision made false, and it was shown to exactly the athletes whose plan the
  app no longer touches.
  One thing caught in my own test before it shipped: the sets comparison sat behind an
  `if (exercises.length > 0)` guard, which would have let the whole assertion vanish the
  day the fixture changed. Turned into an assertion. Same trap as the picker proof an hour
  earlier, which is twice in one session and worth saying out loud.
  ONE THING THE SUITE CAUGHT THAT I HAD MISSED. booklet.spec.ts asserted the old copy
  verbatim, `/automatic deload/`, and went red. The sweep for stale references had grepped
  e2e/ for the note's ID and not for its visible TEXT, which is what an e2e actually
  asserts on. Renaming an id is not renaming a sentence, and only one of those two greps
  would have found it.
  Validation: typecheck clean, **1,483/1,483 unit** (6 new, both guards proven to bite),
  build green, **e2e 84 passed** after that fix, sim 20 personas zero invariant failures,
  poison 145/145 (3 new).
  NEXT: unchanged. J7 is the highest-leverage thing left and nothing blocks it.

- **2026-08-19 · J7 facts layer · audit session.** The owner picked J7 off the four
  options, and it is the right pick: nine jobs list it as their dependency and nothing
  lists anything as blocking it.
  What landed is the facts half. Every engine downstream wanted the same four numbers and
  each derived its own from raw logs at the point of use, which is how two screens end up
  disagreeing about how much somebody trains. They come from one place now, and the shape
  is the point: a fact is never a bare number. It carries where it came from, how many
  observations sit behind it, how old the newest one is, and a confidence DERIVED from
  those two, never typed. Same rule plan/knowledge.ts applies to research claims, for the
  same reason.
  And it returns null a lot. A new account gets silence on all four, which is the
  calibration.ts pattern: the alternative is an engine speaking confidently in week one on
  three data points.
  THE CONSUMER WAS WIRED THE SAME DAY rather than left as an IOU, and it found a real
  defect. kcalBumpSuggestion rests entirely on "the scale is not moving" and decided it
  from two raw weigh-ins with no smoothing. Creatine pulls 1 to 2 kg of water on and lets
  it go again, and neither is energy balance. The dangerous direction is coming OFF it:
  the drop reads as under-eating and the app would tell somebody to add calories they do
  not need. It declines now when the trend carries the caveat W16 made possible.
  FIVE GUARDS PROVEN TO BITE, and the fifth did not on the first attempt. The test named
  "counts only sets that were actually ticked" used a single session, so the two-session
  floor caught the mutation instead of the tick filter, and a test that passes because a
  DIFFERENT rule fired is not testing the rule it names. Rewritten with three sessions so
  only the filter can decide.
  TWO FIXTURE TRAPS, both from the same root. `emptyAppData` falls back to the owner's
  hand-built booklet, stack and all, so every test using it has an athlete on creatine.
  That bit twice in one job now that a supplement can change an engine answer. makeData
  clears it, in the one line of headroom engine.test.ts had left.
  Also renamed: the aggregate is `readUserModel`, not `userModel`, because the dead-export
  scan matches names anywhere in a file and every importer writes './userModel' in its
  import path. A function sharing its module's name can never be reported dead.
  Validation: typecheck clean, **1,495/1,495 unit** (12 new), build green, poison 151/151
  (6 new).
  NEXT: J8 is now unblocked and is the natural continuation, or the nutrition-engine half
  of J7. Both are the owner's call.

### 2026-08-19 · J7 nutrition slice 1 · the calorie baseline stops guessing
  WHAT WAS WRONG: every calorie target in the app came from bodyweight x 15 (x 14 for
  women). That number has no study behind it, no age term, and scales linearly with total
  mass, so it inflates at the top: a 320 lb man asking for help losing weight was told his
  maintenance was 4,875 kcal, about 1,700 above what two validated equations say. It also
  cannot tell a 22 year old from a 55 year old at the same weight.
  Meanwhile the app already knew better and never asked itself. Age is collected in
  onboarding and was read by exactly one screen (the W16 minor check). Body fat has a whole
  tape flow behind it, step-by-step instructions and a Navy-formula estimator, and the
  number went to the progress chart and nowhere near the calorie target. Two collected
  answers, both the exact input a validated equation wants, both ignored by the number they
  were collected for. Same pattern as W11, W17 and W18.
  WHAT SHIPPED: plan/bmr.ts, R1 sections 2 and 3. Katch-McArdle (Cunningham 1991, asserted
  not to be the 1980 variant) when a fresh tape reading exists; Mifflin-St Jeor when height
  AND age exist; the old bodyweight number last, unchanged, flagged, so nobody's target
  moves without new information about them. Activity is architecture (a) as the pack
  recommends: a non-training multiplier from the NASEM PAL bands plus each session's own
  net (MET - 1) x kg x hours, added only on the day it happens. Never a blended multiplier,
  because a multiplier that already contains training plus a session add is the classic
  double-count. plan/nutritionPlan.ts carries buildNutrition out of generator.ts, which was
  at its cap and about to take the rest of R1. engine/userModel.ts gained bodyComposition:
  median of the last three readings, retired outright by 60 days OR 5 percent weight drift
  rather than downgraded, because a stale fat-free mass is confidently wrong where the
  anthropometric model is only ever roughly right. plan/bmr.refs.ts carries provenance and
  is where the tier column earns its keep: two A-tier equations and a tier-D house number
  with an empty source list, in code that made all three look the same.
  A DEFECT I SHIPPED AND THE E2E CAUGHT: maintenanceKcal rounded the fallback number to 50
  on its way out. The fallback is already rounded to 50 and THEN nudged by height in steps
  of 25, so rounding again deleted the nudge and moved the target for somebody who had told
  us nothing new, which is the one thing this change promised not to do. My unit test could
  not see it because it used an athlete with no height. The end-to-end test that pins a
  real athlete's rest-day calories went red. Fixed, and the unit test now asserts a height
  case; the fallback reproduces 2925/2625 for that persona exactly as before.
  DECISIONS TAKEN, both R1's own open questions, both resolved its way and recorded:
  architecture (a) over (b) for activity, and a stale tape falls back to Mifflin rather
  than carrying an old fat-free mass forward.
  ALLOWANCES SHRANK: plan/generator.ts 790 to 747, and plan/generator.ts:proteinContextFor
  came off the dead-export list by moving to sportsNutrition.ts beside the bands it selects.
  The dead-export guard also did real work here: it flagged eight exports on the new module,
  which was correct twice over. Six were internals that did not need exporting and are now
  private, and two were the tape helpers with no caller at all, which is how I found that
  Katch-McArdle could never actually fire.
  TWO MUTATIONS SURVIVED THE FIRST RUN and only one of them was a weak test.
  byor-ignores-sex survived because bookletOps.ts still had its OWN copy of the fallback
  line: mutating the shared function could not reach it, so the one-definition claim this
  job makes was not actually true yet. The harness caught a false claim in my own commit
  message, not a missing assertion. Fixed in the code.
  bmr-double-counts-a-sitting-day survived because the assertion compared two different
  movement answers, which moves the activity multiplier as well as the flat 50, so an
  extra 50 hides inside the difference. It now holds movement fixed and changes only the
  goal, so the multiplier is identical on both sides and the flat 50 is the only thing
  that can move the gap. Third time this session that a guard passed for the wrong reason.
  Validation: tsc -b clean, **1,535/1,535 unit** (40 new), build green, sim 20 personas,
  **84/84 e2e**, **poison 160/160** (9 new, 3 anchors re-aimed).
  NEXT: J7 slice 2 is the rest of R1 (weight-trend calorie steps, bodyweight-scaled carb
  cycling in place of the flat 300, fibre floor, self-explaining numbers) and it needs a
  recompute path first, which does not exist. J8 remains unblocked.

### 2026-08-19 · J7 nutrition slice 2a · the calorie target can change after signup
  WHAT WAS WRONG: the gap I logged at the end of slice 1, fixed the same day. buildNutrition
  ran once inside generatePlan, the two numbers landed on the plan, and nothing recomputed
  them for the rest of the account's life. So the body-composition model that shipped four
  hours earlier could never actually fire for anybody: the tape flow lives on the Progress
  screen, which an athlete reaches days or weeks after their plan is built. They measure,
  they get a better chart, and the number that decides what they eat does not move. Thirty
  pounds down was the same silence, and so was a plan that assumed six days for somebody
  training one.
  WHAT SHIPPED: engine/nutritionRecheck.ts, plus PlanConfig.nutritionBasis written by both
  nutrition paths. Four rules keep the offer honest: it needs a record of what the old
  number came from (absent basis, no recheck, forever); it needs a genuinely new INPUT
  rather than a different arithmetic result; it counts COMPLETED sessions, never planned
  ones, which is the most common way a calculator lies and the first real payoff from J7's
  adherenceShape; and it never argues with a number a person typed. Nothing in the engine
  writes. applyRecheck reads the offer rather than re-deriving it, because two functions
  gathering the same inputs is exactly how the offer and the thing accepted drift apart.
  ONE DESIGN I GOT WRONG AND REDID: the first version treated any target that did not match
  its basis as hand-set and went silent forever. That is right for the booklet editor and
  wrong for a decline: saying no once would have muted the app through the next forty
  pounds. The basis is now what a target was last CONFIRMED against, not only what first
  built it, and the editor clears it explicitly instead of being inferred.
  A CONSTANT THAT GUARDED NOTHING, AND WHAT IT ACTUALLY GUARDS: a probe set
  REAL_BF_CHANGE_PCT to zero and nothing failed. It is not dead: it never changes the
  calorie number, because the meaningful-kcal gate fires first at any real bodyweight, but
  it stops the explanation crediting a tape reading for a change the scale made. Test and
  mutation added for that, and the constant's own comment now says which job it does.
  ALLOWANCES SHRANK AGAIN, by splitting rather than raising: nutritionTypes.ts and
  profileTypes.ts out of types.ts (696 to 691), nutritionSchema.ts and measurementSchema.ts
  out of store/schema.ts (602 to 578). readUserModel and adherenceShape came off the
  dead-export ledger, leaving two of J7's five exports still waiting on J8.
  Validation: tsc -b clean, **1,552/1,552 unit** (17 new), build green, sim 20 personas,
  **84/84 e2e**, **poison 167/167** (7 new).
  NEXT: the rest of R1 (weight-trend calorie steps, bodyweight-scaled carb cycling in place
  of the flat 300, fibre floor, EA guardrail). The recompute path they all needed exists now.
- **2026-08-19 · OP5 · Off-plan training session (owner bug report).** "If I choose an extra
  workout it closes my session for the day, it should never close out the session for the
  day until 3am the following day, people may have other stuff to log." Correct, and the
  half the report could not see was worse: **`startCustomSession` assigned straight over
  `d.sessions[date]`.** An athlete who trained their planned session and then logged
  anything extra lost the first session whole: every ticked set, the readiness answers,
  the make-up link, the fatigue notes. Silent data loss, shipped in OP1, live for a day.
  Three fixes:
  (1) The custom path now APPENDS. A repeated movement merges its sets into the entry
  already there, because two entries for one exercise render twice in the session view and
  once in dayRecap (which keys by exercise id), so the second would vanish from the record.
  A skipped day is still overwritten: the skip was the plan for that day, not the record
  of it. Adding to a finished day re-opens it and drops the stale debrief, the same way
  reopenSession always has.
  (2) `engine/rollover.ts stillOpenForLogging`: the live day always takes work, yesterday
  takes it until 03:00, older days are history. Same window the rest of the app already
  uses for late work. `ExtraTraining` now renders after a finished session ("Did something
  else too? add it") and hides only while a session is actively running, when the session
  view owns the screen.
  (3) `finishSession` prunes any prior debrief for the date. Finishing can legitimately
  happen twice now, and the Record was growing a second debrief describing a smaller day
  than the one that happened.
  Found on the way, from the e2e page snapshot rather than from a test: the Week day sheet
  read "**19 of 9 sets done**" once extra work landed. Now "19 sets done, 10 past the plan".
  PROOF THE GUARDS BITE (owner rule): restored the overwrite, watched 4 of the 5 new tests
  fail, restored the fix, watched them pass. Structure: `logic/actions.ts` went over its
  allowance, so the reconcile-gate answers moved to `logic/reconcileActions.ts` and the
  allowance came DOWN 663 -> 609. Validation: typecheck clean, **1,289/1,289 unit** (9
  new), build green, **e2e 82 passed / 0 failed** (1 new spec that drives the real report:
  log a shelf workout, add a second, check both survive in the Week sheet).
  Shipped at deploy `1450838`, live bundle verified byte-identical by sha256.
  NOTE FOR EVERY LANE: this branch is now genuinely concurrent. While this job ran, other
  sessions pushed ~40 commits to it (J7 slices, the W-waves, R-ONT, the anatomy maps).
  Rebased onto their tip twice rather than force-pushing over it, renumbered this job
  OP4 -> OP5 because the anatomy-map session had already taken OP4, and re-ran the full
  ritual against the merged tree both times: **1,561 unit, e2e 85 passed / 0 failed**.
  One of my new specs needed the age field another session added to onboarding.
  NEXT: unchanged. J3 (product), J7 (engines), C1 (cloud) are the open lane heads.
- **2026-08-19 · OP6 · Off-plan training session (owner bug report, the same one twice).**
  "Wtf, i did an extra workout and logged it and todays session is now closed off and logged
  as done." OP5 fixed the data loss and opened the 3am window but left the half the owner
  had actually reported, and the half underneath it was worse than a wrong label.
  Both "Already did it" doors ran `startCustomSession(..., markDone)` and then
  `finishSession(date)` unconditionally. finishSession stamps `endedAt` and a final grade on
  the WHOLE day, so a twenty minute add-on marked the plan's session complete. And on a day
  nobody had started, the add-on BECAME that day's session: Today offers Start only while
  `!session`, so the scheduled workout was not merely mislabelled, it was **unreachable**.
  Log a lunchtime ab circuit on a push day you had not started and the push day was gone,
  graded, and congratulated.
  Two rules now, in `logic/sessionStart.ts logExtraWork`, and the rest follows from them.
  (1) **Recording work that happened is not a statement about the rest of the day.** A
  running day stays running, a finished day stays finished.
  (2) **The plan's workout is never what gets spent.** On a day with scheduled work and
  nothing logged against it, that workout is seeded first (`startSession`) and the extra
  work is appended INSIDE it, already ticked: the session is live, the logged work is in
  it, and every scheduled movement is still sitting there waiting.
  The day ends here in exactly one case, when the work IS the day: an off day with nothing
  scheduled and nothing logged, or a day already written off as skipped. A debrief comes
  back only from a day that is over, because `composeDebrief` opens with "done/total sets,
  graded X" and grading a day mid-flight counts sets nobody has reached ("3/27, poor" is not
  what you show someone who just logged a workout).
  Two consequences had to be handled or the fix would have traded one trap for another:
  - `ExtraTraining` hid itself while a session was live, on the theory that more work
    belonged inside the session view. **Nothing inside that view can add an exercise.** So
    seeding would have left an athlete with nowhere to put the next thing. The door now
    shows for any day with something logged, running or finished.
  - The focus runner is the default view, and it is `fixed inset-0`. Seeding would have
    thrown someone who logged a bird-dog circuit straight into a full-screen set-by-set
    runner for a workout they never asked to start. `onLogged` now drops Today into list
    view, where the day, the logged work and the door are all on one screen.
  PROOF THE GUARD BITES (owner rule): disabled the seed branch, watched 2 tests fail on the
  exact reported symptom ("the day was closed out: expected '...' to be undefined"),
  restored it, watched 20 pass.
  Structure: TodayScreen.tsx went 3 lines over the 600 hard cap, so the quit-confirm modal
  moved out whole to `screens/today/QuitGate.tsx`. No allowance was added; the file came
  DOWN from 597 to 580.
  Shipped at deploy `316976c`, live bundle verified byte-identical by sha256.
  Validation: typecheck clean, **1,567/1,567 unit**, build green, **e2e 85 passed /
  0 failed** (addmore.spec.ts rewritten to drive the real report: log a shelf workout on a
  day never started, assert the day is NOT complete, add a second workout through the door
  that is still there, then check the Week sheet shows both plus the plan's own sets still
  outstanding), 390px screenshots reviewed.
  STILL TRUE, and the honest limit: a date holds ONE `SessionLog`. "The plan's session and a
  separate extra workout, side by side on the same day" is not representable, so the extra
  work lives inside the day's session rather than beside it. That is the right trade at this
  size; a second session per day is a data-model change and belongs to its own job.
  NEXT: unchanged. J3 (product), J7 (engines), C1 (cloud) are the open lane heads.

### 2026-08-19 · owner call · a target you set yourself is re-offered too
  The rule shipped an hour earlier muted the recheck permanently once somebody typed their
  own calorie number. Owner overruled it, correctly: a target set at 200 lb is a real
  decision and it is also not advice at 170.
  The booklet editor no longer clears nutritionBasis. The basis keeps recording what BodyT
  last computed, and the gap between that and the stored number is the ownership signal. It
  changes the sentence ("You set this one. Since then the scale has moved.") and never
  whether the card appears. Four tests, one mutation.
  Also published: BodyT Build Line, the whole 63-row board on a timeline with the marker at
  where the build actually stands. Its summary counts are derived from its own rows at render
  time rather than typed into the header, because the first draft had a hand-typed 23 against
  a real 21 and a status board that disagrees with its own summary is worse than no summary.
  Validation: tsc -b clean, **1,556/1,556 unit** (4 new), build green, **84/84 e2e**,
  **poison 168/168** (1 new).
- **2026-08-19 · OP7 · Off-plan training session (owner request).** "At the end of every week,
  month, quarter and year there should be a review showing progression, highlights, goals
  accomplished, how they compare in stats to other users just like Spotify wrapped. In the
  weeks it should always ask to take a pic of front and sides. And in the quarters and years
  it should show before and after from the first week they submitted a pic to the final."
  What already existed and was reused rather than rebuilt: progress photos end to end
  (front/side/back capture in the weekly check-in, blobs in IndexedDB, ids in the
  measurement), a Wrapped-style WeeklyRecap opened by hand from Progress, and milestone
  reviews at 3mo/6mo/1yr keyed off days-since-start. What did not exist: calendar periods
  of any kind, a month or quarter or year review, any offer when a period closed, the
  standing weekly photo ask, and any comparison at all.
  Built:
  - `engine/periods.ts`: the week (Monday start), month, quarter and year containing a date,
    and `lastClosed`. Boundaries are their own file because the review engine and the surface
    that offers reviews must agree on them exactly. `lastClosed` steps back ONE DAY from the
    current period's first day rather than doing month arithmetic, which is how February gets
    reviewed twice on March 31st. 12 tests; the mutation that swapped in the naive version
    failed 4 of them.
  - `engine/periodReview.ts`: one `PeriodReview` for all four scales. Sessions, sets,
    tonnage, PRs, adherence, protein, body deltas, tracked-lift e1RM deltas, highlights,
    goals accomplished, the cohort lines, and the photo arc. Rates are per WEEK so a month is
    not read as superhuman volume. `worthShowing` is false for a period with nothing in it:
    a story of zeros with a percentile attached is worse than silence.
  - **The photo arc reaches back to the first photo EVER TAKEN**, not the first one inside
    the window, because the owner asked for "the first week they submitted a pic to the
    final" and three months of near-identical September photos is not a before and after.
  - `engine/cohort.ts`: the comparison. **There is no server aggregating other Bodytea users
    yet**, so "you beat 84% of Bodytea users" would be a fabricated number wearing a real
    name. Every band is published population data (CDC NHIS activity guidelines, the
    decades-replicated ~50% six-month dropout finding, gym-operator visit rates, protein
    intake surveys), the bands are deliberately coarse, and every line carries an `against`
    field that is rendered on screen ("vs US adults, CDC survey data"). A test asserts no
    cohort line can ship without one. **Swap the tables for real aggregates the day C1 can
    serve them and nothing else changes.** OWNER DECISION OWED: whether that is the framing
    to keep, or whether this waits for real user data.
  - `engine/reviewStory.ts`: the review turned into story cards. Separate from the review
    because the review is facts and this is the telling. Every card declares its own
    precondition and is dropped rather than shown empty.
  - `screens/progress/PeriodReviewSheet.tsx`: one story frame for all four periods, so a year
    cannot drift into looking like a different product from a week. Photo arc with an
    angle switcher, cohort bars, list cards, and the week's photo ask.
  - `screens/today/ReviewOffer.tsx`: the offer. Suggest only: a closed period puts ONE card
    on Today and waits. Longest period first, so New Year's Day leads with the year and
    queues the rest one per open.
  - `screens/progress/ReviewShelf.tsx`: any period on demand, for the other 6 days a week.
  Structure paid for, never borrowed: `Measurement` and `PhotoMeta` moved to
  `measurementTypes.ts` beside the schema that already validates them (types.ts 690 -> 673,
  **allowance 691 -> 674**); `usePhotoUrl` had grown an identical copy in two screens and is
  now one file; `CheckinSheet` came out of ProgressScreen whole (506 -> 374) so the weekly
  photo ask could open the real camera rather than point at another tab.
  No schema change and no migration: `settings.reviewsSeen` already existed for the milestone
  marks and the id spaces cannot collide ('3mo' vs 'w-2026-08-10').
  PROOF THE GUARDS BITE (owner rule): the naive `lastClosed` failed 4 tests. The photo-arc
  mutation (start at the second-to-last photo instead of the first) **passed**, because the
  fixture had only two photos and the two are identical there; the fixture now has three and
  the mutation fails. The dead-export guard caught three exports written speculatively and
  they were deleted rather than allowlisted.
  Validation: typecheck clean, **1,597/1,597 unit** (27 new), build green, **e2e 88
  passed / 0 failed** (3 new: a week closes overnight and comes back as a review whose photo
  ask opens the real check-in; the offer is written down as seen and survives a reload; any
  period opens on demand from Progress), 390px screenshots reviewed on the offer, all four
  story cards and the shelf.
  KNOWN LIMITS, said plainly: the comparison is population data and not other users of this
  app, and the copy says so on every line. Month and year reviews have no photo arc by
  design (the owner asked for quarters and years). Nothing pushes a notification when a
  period closes; the offer waits on Today.
  Shipped at deploy `9a70b5d`, live bundle verified byte-identical by sha256.
  NEXT: unchanged. J3 (product), J7 (engines), C1 (cloud) are the open lane heads. C1 is now
  also what unblocks a real cohort.
- **2026-08-20 · OP8 · Off-plan training session (owner bug report, the third door on the same
  rule).** Screenshot: a day headed "Acceleration + Two-Foot Power + Lower" reading **"Full
  session on a downgraded day. Honestly logged. Make-up for Monday, Aug 17."** The owner:
  "why is my days session still closed like i did it. It shouldnt be, the extra workout i did
  should be added on top of it but it shouldnt close until ive done it."
  OP5 fixed the custom path and OP6 fixed the extra-work path. **`startSession` was left as a
  plain overwrite**, and that is the door a make-up comes through: `d.sessions[date] =
  skeleton` with the MISSED day's exercises. Run Monday's workout on a Thursday and Thursday's
  own session was replaced by Monday's, anything logged that morning was destroyed, and
  finishing it closed the day on a workout nobody had done. Same defect, third door.
  Two halves, because fixing the overwrite alone would not have been enough:
  (1) **One merge, shared.** `putOnDay` in `logic/sessionStart.ts` is now the only way a
  session reaches a date, used by both `startSession` and `startCustomSession`, so the two
  can never drift again. Its `reopen` flag is the whole difference between LOGGING work and
  STARTING it: recording something that already happened never changes whether the day is
  over (OP6's rule), while starting a workout does, because that is a deliberate tap.
  (2) **"Is there a session?" stopped being the same question as "has the plan's work been
  done?"** the moment a make-up or an off-plan workout could occupy the slot, and Today was
  still asking the first one: `{today && !session && ...}` gated the Start button, so the
  day's own workout was not merely mislabelled, it was **unreachable**.
  `engine/stats.ts planWorkOutstanding` answers the right question, derived and never stored:
  the plan's movements for the day against the ones on the log. Today offers the day's own
  session while anything is owed, whatever state the session is in, and the finished card
  stops claiming the day is over ("That was not today's workout though. X is still on the
  table").
  PROOF THE GUARDS BITE (owner rule): restoring the overwrite failed 3 tests; making
  `planWorkOutstanding` return [] whenever a session exists failed 1; putting the old
  `!session` gate back failed the new e2e, which drives the report end to end (skip
  Wednesday, run its workout on Thursday, finish it, and Thursday's own session must still
  be on the table). A test I wrote first was wrong rather than the code: it finished a
  make-up with nothing ticked, which `finalStatus` correctly records as **skipped**, and a
  skipped day owes nothing. The fixture now does the work the report described.
  Found on the way: `QuitGate` was a modal with no role, so nothing could address it. It is
  a labelled dialog now.
  Structure: TodayScreen went over the 600 cap again, so the finished-day card moved out
  whole to `screens/today/DayDoneCard.tsx`. No allowance added; the file came DOWN 585 -> 562.
  Validation: typecheck clean, **1,605/1,605 unit** (8 new), build green, **e2e 89 passed /
  0 failed** (1 new).
  Shipped at deploy `a24ef44`, live bundle verified byte-identical by sha256.
  NEXT: unchanged. J3 (product), J7 (engines), C1 (cloud) are the open lane heads.
  STILL TRUE: a date holds ONE SessionLog. Three doors have now been taught not to destroy
  what is on it, and the day's own work is reachable again, but "two separate sessions on one
  day, each with its own grade" is still not representable. That is a data-model job.

### 2026-08-19 · J7 nutrition slice 2b · the numbers scale to the body
  TWO FLAT CONSTANTS, same defect as bodyweight-times-fifteen: a number that was one
  person's arithmetic applied to everybody.
  THE REST-DAY DROP was 300 kcal for every athlete. The direction is sourced (less work
  needs less fuel); the size was not. It is about right for an 86 kg man lifting an hour and
  roughly double the session cost of a 54 kg woman lifting 45 minutes, which turned her rest
  days punitive. Now (MET - 1) x kg x hours, bounded 150 to 400. The old 300 is exactly what
  that rule returns for an 86 kg hour, which is the tell.
  A TEST THAT PREDICTED ITS OWN OBSOLESCENCE: kcalFloor.test.ts held an assertion that the
  rest clamp could never bind, with a comment saying it would go live the day the drop
  widened past 300. That day arrived: 1,500 floored minus the widest swing is 1,100. The
  test now asserts the clamp binds, and the comment in kcalFloor.ts was rewritten to match.
  ENERGY AVAILABILITY (engine/energyAvailability.ts) is the check no floor can make. A floor
  asks whether a target is low in absolute terms; it cannot see somebody eating 1,400, which
  clears 1,200 without complaint, while training six times a week and running 30 km. EA =
  (intake - exercise) / FFM, warning under 30. R1's eval case 10 reproduces to the decimal:
  FFM 44.6 kg, 392 kcal/day of training, EA 22.6, suggest 1,750.
  TWO LIMITS KEPT RATHER THAN SMOOTHED. The 30 line is female-derived, so a man below it
  gets a caution not a finding, and the copy says which. And it needs a tape AND logged
  sessions or it returns nothing, because a clinical-sounding sentence built on a guessed
  body composition is worse than silence. Nothing is diagnosed, no condition is named, and
  a test asserts that of the RENDERED COPY rather than trusting the author.
  Two counting traps handled: an unpriced cardio session falls back to its MET anchor rather
  than counting as zero (cheaper training reads as higher availability, which is the
  direction that HIDES the warning), and a GPS run counts once, by reusing the existing
  loggedSessions de-duplication rather than writing a second definition of it.
  A PROCESS MISS WORTH RECORDING: the four EA mutations were meant to land with the code and
  did not. A `grep -c` that found zero em dashes exited 1 and short-circuited the rest of
  the && chain, so the script that appends them never ran, and I read the "parses" printed
  by the next line as confirmation that it had. Second time this session an && chain has
  made a step that never happened look like a step that passed. The poison count is the
  thing that caught it: 171 when it should have been 175.
  Validation: tsc -b clean, **1,580/1,580 unit** (15 new), build green, **85/85 e2e**,
  **poison 175/175** (7 new).
  NEXT: what remains of R1 is the weight-trend calorie step rule (section 4.2) and the fibre
  floor. Then J8, which has been unblocked since the facts layer landed.

### 2026-08-20 · J7 nutrition slice 2c · the scale gets a say, and R1 is fully wired
  THE STEP RULE (engine/calorieStep.ts, R1 s4.2). Every calorie number this app produces is a
  model's opening bid. The measured weight trend is the only thing in the system that knows
  what actually happened, and it adjusted nothing: somebody could hold a target for two
  months, lose nothing, and the app would keep printing the same number with the same
  confidence. It now compares the smoothed trend against the band the goal asks for and
  applies HALF the static 3,500-per-pound correction, clamped 100 to 250. The halving is not
  timidity, it is the pack's own sourced limitation: the convention overestimates long-run
  loss by well over half at a year, so it is a step between measurements and never a
  forecast. Declines on a confounded trend (creatine water is not fat), on under 14 days of
  history, and on goals with no rate band. Floors and the quarter-off-maintenance cap outrank
  it, and when the cap binds it reports the step it WILL take rather than the one it wanted.
  A DEFECT IN MY OWN FACTS LAYER, found while building on it. weightTrend computed an
  exponentially weighted average, never read it, and returned the slope between the first and
  last weigh-in. The doc comment, my commit and this file all called it an EWMA. The mistake
  underneath is worth naming: an EWMA smooths a LEVEL and a coach needs a RATE, so the
  smoothed number had nowhere to go and the endpoints got used. It is a least-squares
  regression now. Swapping the algorithm broke NO test, which is the actual finding.
  AND THEN THE TEST I WROTE FOR IT WAS ALSO DECORATIVE. trend-is-two-points-again survived the
  harness: the new tests asserted that a regression swings less than endpoints, is steadier
  over a longer series, and reads a clean slope right. An endpoint slope satisfies all three,
  and the swing comparison came down to 0.007 after rounding. Pinned as a VALUE now: six
  weigh-ins with the last 4 lb high give -1.0 lb/wk by regression and -0.47 by endpoints,
  which is the difference between a slow cut and a stalled one. Third time this session a
  guard has passed for the wrong reason, and the second time the harness caught it rather
  than a test.
  THE FIBRE FLOOR: 14 g per 1000 kcal of what was actually prescribed. The reference intakes
  are 38 g and 25 g but both are stated at reference calorie intakes, so handing 38 to
  somebody eating 1,600 on a cut is a number built for a different amount of food; that day
  gets 22. Shown as a chip rather than a ring because nothing logs fibre, and a progress arc
  against an untracked number would be inventing one. The step card ships ONE button for the
  same reason: there is nowhere to record a decline, so a second button would have set the
  target to what it already was and the card would have come straight back.
  Shared input gathering extracted (nutritionInputsNow) so the recheck and the step rule
  cannot drift apart, which also made two mutation anchors cover both engines instead of one.
  Validation: tsc -b clean, **1,631/1,631 unit** (19 new), build green, **88/88 e2e**,
  **poison 181/181** (6 new).
  NEXT: R1 is done. J7's last piece is the calorie-autoregulation seed, then J8, which has
  been unblocked since the facts layer landed and is the natural head of the engines lane.
- **2026-08-20 · OP9 · Off-plan training session (owner, on OP8: "the day is still closed so
  yes fix it").** OP8 shipped and the day was still closed. Two reasons, both mine.
  (1) **The predicate was inferring what it could not infer.** `planWorkOutstanding` asked
  "are the plan's movements on the log?", and an A/B week repeats a template: a make-up of
  last Tuesday and this Tuesday's session hold the IDENTICAL exercise list, so the answer was
  yes for a session that was somebody else's day. `SessionLog.ownPlanStarted` now records it
  outright. **Stored rather than derived, which is unusual here and deliberate**: the two
  cases are genuinely indistinguishable from the movements, and guessing is what closed the
  day. Optional, so no migration; `startSession` sets it true for an own-plan start and false
  for a make-up, and `putOnDay` keeps it true once true.
  Sessions written before the flag existed fall back to the movements, with one rescue: a
  legacy make-up whose every movement came from the made-up day is entirely that day's work,
  so today's own is still owed however identical the lists look. That is the exact record the
  owner was staring at, fixed without a migration.
  (2) **The hero was naming the wrong day.** `viewDay` resolves the MADE-UP day so the
  session view can render it, and the header used it too, so a finished make-up put that
  workout's title in the hero: the screen read "this is your workout, and it is done" over a
  session nobody had started. The header now names what is RUNNING while a session runs, and
  what the day still owes once nothing is. The owed line named the wrong day too (`viewDay`
  where it meant `day`), which was a straight bug in what OP8 shipped.
  Two e2e specs caught the first attempt at (2) and were RIGHT: while a make-up is running,
  the hero must name the workout being performed, not today's.
  PROOF THE GUARDS BITE (owner rule): reverting to movement-inference failed the same-template
  test; making a make-up claim `ownPlanStarted: true` failed 2; dropping the legacy rescue
  failed the rescue test, which asserts BOTH halves (without the made-up day's movements the
  predicate cannot tell, with them it can).
  Validation: typecheck clean, **1,643/1,643 unit** (11 new since OP8), build green,
  **e2e 89 passed / 0 failed**, 390px screenshot of the post-make-up day reviewed: hero is
  today's workout, "Start today's session" is offered, and the finished card says "That was
  not today's workout though. X is still on the table."
  Shipped at deploy `9b355c5`, live bundle verified byte-identical by sha256.
  NEXT: unchanged. J3 (product), J7 (engines), C1 (cloud) are the open lane heads.
  STILL TRUE, and now the only piece left of this: a date holds ONE SessionLog. The day no
  longer closes on work that was not today's, and every door adds instead of replacing, but
  two sessions on one day each carrying their own grade is still not representable. Nothing
  reported so far needs it.
- **2026-08-20 · OP10 · Off-plan training session (owner, on OP9: "bro why is it still
  closed").** The screenshot with that message showed the fix WORKING: the hero read "Lower
  Strength + Hypertrophy" (today's, correct) and **"Start today's session" was right there**.
  What it also showed, in celebration lime at the bottom, was **"Full session on a downgraded
  day. Honestly logged."** The day was open and the card still stamped it closed, so the app
  was arguing with itself and the owner believed the card. That is the app's fault, not the
  reader's: a completion stamp outranks a button.
  `DayDoneCard` now has two modes. While today's own workout is owed it does not grade the
  day at all: first line **"Today is not done."** in accent, then what actually ran ("What is
  logged is Wednesday, Aug 12's make-up, not today's workout"), then the workout still owed
  by name, then the honest small print ("Banked so far: Full session."). Only a day that owes
  nothing gets the lime stamp.
  Also fixed, found by screenshotting the flow through instead of stopping at the card: once
  today's own session HAS been started, the hero went back to naming the made-up day, because
  `viewDay` keyed off `makeupFor` alone. It now stops overriding once `ownPlanStarted` is
  true, so a merged day is titled by today.
  The e2e now drives the whole loop rather than the first assertion: no "Session complete."
  anywhere, "Today is not done." present, today's workout named, the Start button TAPPED, and
  the day running again on today's own workout with the make-up's work still on the record.
  LESSON, worth keeping: three rounds of this bug were reported and two of my fixes were
  correct underneath and invisible on screen. **The tell the owner gave is the right one:
  screenshot the day and check it can be started.** Passing tests over a screen that says
  "logged" is not a fixed bug.
  Validation: typecheck clean, **1,643/1,643 unit**, build green, **e2e 89 passed / 0
  failed**, 390px screenshots of both the open day and the restarted session reviewed.
  Shipped at deploy `de04e6a`, live bundle verified byte-identical by sha256.
  NEXT: unchanged. J3 (product), J7 (engines), C1 (cloud) are the open lane heads.
- **2026-08-20 · OP11 · Off-plan training session (two owner requests on the fixed screen).**
  "Okay its solid but i dont want this screen i want the og screen where you can see all the
  workouts still showing. Also users should be able to X out of the same weight as last time
  brief."
  (1) **The workout list was gated on `!session`.** Any session at all took it away, so a day
  holding a finished make-up showed a Start button over an empty screen with no way to see
  what was being started. It is gated on the plan still OWING work now (`planOwed.length > 0
  && !inProgress`), which is the same question the Start button asks, so the two can no
  longer disagree. A fresh day is unchanged; a day mid-session still hands the screen to the
  session view.
  (2) **The coach's offer had no close.** The card's own comment said a declined proposal
  leaves no trace and ignoring one costs nothing, which was true and beside the point: free
  is not the same as gone, and a card that cannot be closed sits there all day arguing with a
  decision already made. `AdaptChoice` gains `'dismissed'`, which both existing consumers
  (`engine/adapt.ts`, `logic/prescription.ts`) ignore because they test for their own value,
  so the whole feature is one union member, one zod value and a corner button. No new state,
  no migration, and types.ts did not grow a line.
  Validation: typecheck clean, **1,643/1,643 unit**, build green, **e2e 90 passed / 0 failed**
  (1 new: the offer is dismissed, disappears, and the dismissal reaches the saved state; the
  make-up spec now also asserts the workout list is on screen). 390px screenshot reviewed:
  the day carries its hero, Start, the not-done card and the full movement list.
  Shipped at deploy `5019cf1`, live bundle verified byte-identical by sha256.
  A test wrinkle worth remembering: `adapt.spec.ts` boots through `addInitScript`, which
  re-seeds localStorage on every navigation, so persistence there is asserted by polling the
  saved state rather than by reloading.
  NEXT: unchanged. J3 (product), J7 (engines), C1 (cloud) are the open lane heads.

### 2026-08-20 · J7 complete · the calorie-autoregulation seed
  WHAT WAS WRONG: every maintenance number in the app was a prediction. Good predictions from
  validated equations, but they describe the average person with this fat-free mass, not this
  person. R1 s7.5 is explicit that the gap widens in the situation people care most about:
  maintenance falls as a cut goes on by more than the lost mass accounts for, and it stays
  down. A deficit that worked in week two underdelivers by week ten and the model never
  notices, because the model was never watching.
  The answer was already in the data: measured maintenance = mean intake - (weekly change x
  3500 / 7). Losing a pound a week on 2,000 means running on 2,500.
  WHAT MAKES IT CAREFUL: half that equation is trustworthy and half is not. The scale is a
  scale; the food log is a person remembering to write things down, and food logs under-report
  systematically. So the measurement never replaces the model. It gets a bounded vote scaled
  by how much of the month was actually logged, and a perfectly logged month earns at most
  half. The errors fall the safe way: an under-reported log makes measured maintenance look
  LOW, which TIGHTENS the deficit cap and makes the app refuse to cut further. The rare
  dangerous direction is caught by a sanity band, because bodies do not run 40 percent cheaper
  than two validated equations say, but logs do.
  A DESIGN FIX ON THE WAY: the first version had a ramp and a cap that could not both be live.
  The minimum logging threshold already put every valid case at the cap, so `logged /
  FULL_TRUST_DAYS` never did anything. It is one expression now and every term does work.
  KCAL_PER_LB_TISSUE moved to the plan layer beside the other sourced constants, which also
  broke the import cycle the two engines would otherwise have formed.
  Validation: tsc -b clean, **1,653/1,653 unit** (10 new), build green, **90/90 e2e**,
  **poison 185/185** (4 new).
  NEXT: J7 is closed. J8 is the engines lane head and has been unblocked since the facts layer
  landed: volume autoregulation reads hardSetsPerWeek, schedule fit reads trainsOnWeekday,
  exercise fit reads daysSinceRegion. Those three are the last J7 exports still on the
  dead-export ledger, and J8 is named on each of them as the consumer.

### 2026-08-20 · review pass over everything J7 shipped today
  Owner asked for a review before continuing, and it was the right call. Three defects, all
  mine, all from today, none of which any test noticed.
  THE WEIGHT TREND HAD NO WINDOW. weightTrend regressed over every weigh-in ever recorded. An
  athlete thirty pounds down over five months and perfectly FLAT for the last one read as
  losing 1.29 lb a week, so calorieStep saw "inside the band, on track" and offered the one
  person actually on a plateau nothing at all. Backwards, not merely imprecise. Windowed to 21
  days per R1, and the same athlete now gets a 250 kcal step. The SAME all-history mistake
  was in two more places I wrote today: learnedMaintenance averaged 28 days of food against
  an unbounded trend, so the two sides of "intake minus what the scale did" covered different
  stretches of somebody's life; and calorieStep read its 14-day span off all history, so a
  weigh-in from last spring could vouch for a fortnight holding three readings two days apart.
  THE CREATINE GUARD WAS READ OFF A TREND. `weightTrend(...)?.caveat` is undefined when the
  window is too thin to produce a trend, so windowing the trend would have made the guard
  evaporate exactly when there is least data. Extracted as trendIsConfounded and asked
  directly by all three engines: whether creatine is on board has nothing to do with how many
  times somebody weighed in this fortnight. This one was caught by an existing test going red
  during the fix, which is the guard from the J7 facts layer paying for itself.
  TWO RULES CONTRADICTED EACH OTHER ON ONE SCREEN, verified by probe rather than suspected:
  the same athlete got "add 150 to 200 kcal" from kcalBumpSuggestion and "take 250 away" from
  calorieStep, both rendering at once. Strength climbing on a flat scale is the cut WORKING,
  so the scale-only reading of "too slow" is the wrong one and stands down.
  AND THE SCREEN ITSELF: four engines can have an opinion about one number on the same day,
  which on a 390px phone is five stacked cards. I built them one slice at a time and never
  looked at the whole. Ranked now by how much each knows rather than the order I built them
  in: recheck (the inputs changed) beats step (the inputs stand but the scale disagrees) beats
  bump. The energy-availability card sits ABOVE the ladder rather than in it, because it is a
  safety reading and not an opinion about the target.
  Validation: tsc -b clean, **1,655/1,655 unit**, build green, **90/90 e2e**,
  **poison 188/188** (3 new, 3 anchors re-aimed).
  LESSON, for whoever ships the next engine: every one of these came from shipping slices
  without re-reading the whole. The window bug existed from the moment weightTrend was
  written and survived four slices built on top of it, because each slice only tested itself.
  NEXT: J8, unchanged.

### 2026-08-20 · J8 slice 1 · B1, the decision ledger, and a no that is actually heard
  R3 puts this first in J8's order and it is right to: nothing else in the learning loop can
  be evaluated until the offers are written down.
  TWO HOLES. Nothing anywhere asked whether a suggestion WORKED, so the app could not tell an
  intervention that helps from one that does nothing. And declines were discarded on purpose,
  defended as keeping a rejected suggestion from reshaping next week. Right about the PLAN,
  wrong about the CONVERSATION: with no record the same proposal returns tomorrow off the same
  evidence, and the app cannot tell somebody who disagreed from somebody who never saw the card.
  WHAT SHIPPED: an append-only ledger on AppData. A row is never edited; a correction is a new
  row. Evidence stored as VALUES not prose, because a sentence cannot be compared against next
  month's sentence. Three rungs, getting quieter: one no buys a fortnight, unless the evidence
  genuinely worsened, in which case it returns early and has to say so; three noes stop it for
  two months and nothing gets past that. Only the offering policy reads it. No SCHEMA_VERSION
  bump: a defaulted array parses old envelopes clean, exactly as adapt and journey did.
  THE STEP CARD HAS ITS SECOND BUTTON NOW. It shipped with one because there was nowhere to
  record a no, so a hold would have set the number to what it already was and the card would
  have come straight back.
  TWO THINGS THE TESTS FOUND WHILE BEING WRITTEN. A signed metric crossing zero is material and
  doubling cannot see it: an athlete on a cut losing 0.4 lb/wk who is now GAINING 0.6 is plainly
  in a different situation, but 0.6 is not twice 0.4, so the first rule stayed silent through
  the change most worth mentioning. And zero was deciding by accident, because every number
  clears zero times two; it is an explicit branch each way now, something starting counts and
  something stopping does not.
  REVIEW PASS (rule 8, first time under the new protocol) FOUND TWO MORE, both mine:
  (1) The constant probe set STEP_RULE_VERSION to 7 and nothing went red, because the SCREEN was
  composing ledger rows inline where no test could reach them. Row composition moved into the
  engine. (2) Then the test I wrote for it was ALSO decorative: it asserted row.ruleVersion
  against STEP_RULE_VERSION, comparing a value to itself, and passed at any value. It pins the
  literals now. Third decorative guard this session and the third time a probe rather than the
  suite is what caught it.
  (3) The ledger was only half populated: the step card wrote rows, the recheck card did not,
  so the learning loop in slice 2 could have evaluated one card out of two. It writes rows now,
  keeping its basis stamp for the different job that does.
  Probed and clean: all three cooldown constants bite; no two engines contradict on the Meals
  screen (the advice ladder from the J7 review holds); no paired quantity crosses windows.
  STEP_TARGET survived its probe and stays unpinned deliberately, being an identifier shared by
  writer and reader that cannot drift between them.
  ALLOWANCES SHRANK by splitting, not raising: mealTypes.ts out of types.ts (674 to 604),
  coachSchema.ts out of store/schema.ts (578 to 554).
  Validation: tsc -b clean, **1,676/1,676 unit** (21 new), build green, sim 20 personas,
  **90/90 e2e**, **poison 196/196** (8 new).
  NEXT: R3 ship-order step 3, outcome evaluation for the interventions that ALREADY exist, so
  the ledger is proven against shipped behaviour before anything new is built on it.

### 2026-08-20 · J8 slice 2 · outcome evaluation, and an app that stopped arguing with itself
  The ledger recorded what was offered and answered, which on its own is a diary. This is the
  half that makes it evidence.
  R3's five rules, and the fourth is the one that matters: if no observation could mark an
  intervention "did not work", it does not ship. So `worse` and `no-change` are ordinary
  answers here rather than edge cases, and most of the tests are about the ways a change fails.
  PRE-REGISTERED at accept time: metric, window and the number to beat. An outcome chosen
  afterwards is a story. ISOLATE: any later decision on the same target inside the window
  closes the first as unattributable, and a scale creatine is moving is not evidence either.
  Somebody who stopped weighing in is `abandoned` rather than failed and is told nothing.
  Verdicts are said out loud including the bad ones, and the card self-expires after a week
  rather than carrying a seen-flag.
  THE HARNESS FOUND THE FIRST GAP: a mutation set the pre-registered baseline to 0 and all
  sixteen outcome tests stayed green, because each built its accepted rows BY HAND and none
  went through stepDecision, the only place pre-registration happens. Tested at the offer site
  now, and the mutation re-aimed there.
  REVIEW PASS (rule 8) FOUND THREE MORE:
  (1) TWO CARDS CONTRADICTED EACH OTHER, proved by probe not reasoning. The screen rendered
  "that 150 kcal change did not help, back to where you were is a fair call" directly beside
  "about 250 kcal a day less would put you back in it". The stand-down rule lives in the
  ENGINE so it is testable: a target whose last judged change came back `worse` stops being
  proposed more of the same while that feedback is on screen, and resumes once it is old news.
  Worth noting WHY the J7 advice ladder did not catch this: the ladder ranks simultaneous
  SUGGESTIONS, and a verdict is not one. Feedback versus suggestion was a category it did not
  have.
  (2) VERDICT_VISIBLE_DAYS survived being set to 999, because the expiry test was written
  against the constant itself and passes at any value. FOURTH guard of that exact shape this
  session. Day counts are literals now.
  (3) STEP_METRIC survived being set to 'zzz'. A metric id that changes silently orphans every
  row written under the old one: judge() looks for its own metric, finds nothing, and the
  intervention is never graded and never says why. Pinned.
  Validation: tsc -b clean, **1,698/1,698 unit** (25 new), build green, sim 20 personas,
  **90/90 e2e**, **poison 203/203** (7 new).
  NEXT: R3 s9.2's table for the TRAINING interventions, which is this same machinery pointed
  at drop-load, hold-load, reduce-volume, the two substitution kinds and the deload.

### 2026-08-20 · J8 slice 3 · the same machinery, pointed at training
  R3 step 3 wants outcome evaluation on interventions that ALREADY ship, so the ledger is
  proven against real behaviour before anything new is built on it. hold-load and
  reduce-volume are exactly that: offers the coach already makes, which the athlete already
  accepts or waves away, and which NOTHING recorded either way.
  The comment on acceptAdaptation argued that a proposal leaving no trace is what stops a
  declined suggestion shaping next week. Right about the PLAN, wrong about the CONVERSATION,
  and the same defence already overturned for the calorie cards. The prescription still reads
  only `adapt`; the ledger is read by the offering policy and the outcome engine and by
  nothing that prescribes.
  Judged on whether sessions after the change got done, COUNTED not averaged, because one
  clean session out of three is not a fix. All done is worked, none is worse, some is
  no-change, nobody training at all is abandoned (a fact about attendance, not the
  intervention). Windows in DAYS standing in for R3 s4.2's comparable exposures, and the file
  says so: a fortnight covers one to two sessions for almost every week this app builds, and a
  calendar cannot be stretched by a skipped week the way an exposure count can.
  AN IMPORT CYCLE I INTRODUCED IN THE LAST REVIEW, found before it could bite. The outcome
  engine needs to know which rows belong to which rule, and each rule asks the outcome engine
  whether its last attempt backfired, so engine/outcomes.ts and engine/calorieStep.ts imported
  each other. It compiled only because both read the values inside functions; the first
  module-level use would have been a TDZ crash. engine/proposals.ts is the neutral vocabulary
  now, which is also where the new training identifiers went.
  A VERDICT ON THE WRONG SCREEN: freshVerdict was type-agnostic, so the food screen would have
  announced that trimming the sets did the job. Scoped by type; training answers appear where
  the offer was taken, and that card outlives the offers because it answers a question asked a
  fortnight ago.
  THE SAME TEST GAP, TWICE IN TWO SLICES. The harness deleted the ledger write from
  acceptAdaptation and every outcome test stayed green, because they all build rows by calling
  adaptDecision directly. Identical in shape to the pre-registration gap in slice 2: **a test
  that constructs the artefact it wants to check will never notice that nothing in the app
  constructs it.** Both are now tested at the write path, with the mutations re-aimed there.
  Validation: tsc -b clean, **1,709/1,709 unit** (17 new), build green, sim 20 personas,
  **90/90 e2e**, **poison 207/207** (4 new, 3 anchors re-aimed).
  NEXT: R3 s9.2 still has the deload, the two substitution kinds, drop-load and the
  failing-flag softening. Same machinery, more metrics.

### 2026-08-20 · J8 slice 4 · does the deload actually buy anything
  The most expensive thing this app does. A whole week of reduced training, every fourth
  week, taken entirely on faith, and nothing could say whether it helped. "Programs do this"
  is not an answer a coach should be satisfied with, and it is the last R3 s9.2 intervention
  that had no evaluation at all.
  R3's test is REBOUND: best estimated one-rep max in the three weeks after beats the best in
  the three weeks before, by more than 2.5 lb so the same lift twice does not count as a win.
  No rebound with attendance fine is a real and useful answer, not a null: it says scheduled
  deloads are not this athlete's bottleneck, which is what sends R3 to the volume rung
  instead of to another deload.
  NOBODY AGREES TO A DELOAD, so there is no accept event and no row to hang a verdict on. The
  row is manufactured afterwards by the same block math that scheduled the week, which is what
  keeps the trigger and the verdict pinnable by one test. Athlete-authored plans are skipped
  entirely, consistent with the deload-ownership decision: BodyT does not deload a routine
  somebody brought, so nothing there is its to grade.
  THE BOUNDARY IS WHERE THIS RULE IS HONEST OR NOT, and it has its own test with pinned
  numbers. A lift inside the deload week belongs to NEITHER window. Counted as "before" it
  drops the baseline and flatters every deload; counted as "after" it takes credit for a
  rebound it is. Both directions have a mutation.
  Validation: tsc -b clean, **1,720/1,720 unit** (11 new), build green, **90/90 e2e**,
  **poison 215/215** (8 new).

### 2026-08-20 · review pass over the whole J8 ledger surface (rule 8)
  Four slices deep, so the pass ran over the surface rather than the diff. THREE REAL
  DEFECTS, none of which any slice could have caught, each proved before it was fixed.
  (1) THE LEDGER VOCABULARY IS A WIRE FORMAT AND THREE WORDS OF IT GUARDED NOTHING. `type`
  and `metricId` are stored as free strings, so every row an athlete already has was written
  under whatever spelling shipped that day. Rename one and today's build stops recognising
  yesterday's rows: never graded, never shown, and for the deload the dedupe stops seeing the
  row that says a week was already judged, so it is judged again. ADAPT_TYPE, DELOAD_TYPE and
  ADAPT_METRIC all survived being set to 'zzz'. The header of proposals.ts had claimed since
  the day it landed that tests pinned these literals; it was untrue of three of them, which is
  the same shape as the weightTrend comment that said EWMA while the code did endpoints.
  engine/proposals.test.ts builds EVERY fixture from literal strings rather than from the
  constants it checks, because a test that writes its rows through the same constant it
  asserts passes at any value. FIFTH time that shape has been found this session.
  (2) THE ✕ SILENTLY DIED FOR A WEEK AFTER EVERY VERDICT. Slice 3 put the follow-up line
  inside the block the dismiss button owns, and the guard read "waved AND no verdict". So with
  a verdict on screen, tapping ✕ did nothing at all: the offers just waved away stayed exactly
  where they were, under a button that looked broken. The existing dismiss test passed because
  it had no verdict on screen. A verdict is FEEDBACK, not an offer, and now renders outside
  the block the ✕ owns. This is the slice-2 insight (feedback is not a suggestion) showing up
  again in the DOM rather than in the advice ladder.
  (3) THE APP PRESCRIBED A DELOAD AND REPORTED IT HAD FAILED, IN ONE VIEW. Proved by
  screenshot, not by reading. A verdict is visible 27 to 34 days after its deload starts and
  the next deload starts on day 28, so the card lands inside the FOLLOWING deload week almost
  every time. The screen showed "DELOAD WEEK: sets halved, keep the weights" in lime with
  "your lifts have not come back up since the deload week" directly beneath it, about a week a
  month earlier, and nothing said which week was meant. Every line now anchors itself three
  weeks after the week it judged, because nobody is three weeks after a week they are
  standing in.
  ALSO: recheck rows are recorded and never judged, and the comment claimed the opposite. That
  is the right design rather than a gap, so the comment now says why: a step is an experiment
  with a counterfactual, a recheck replaces a guessed body composition with a measured one,
  and "did using your real numbers help" is not a question with an answer. The row still earns
  its place by telling isolated() the target moved inside some step's window.
  HARNESS FIX: the anchor pre-flight only checked the list being run, so an AdaptProposals e2e
  anchor had been stale since OP11 and nothing said so. It checks both lists now, which is
  what the comment above it always argued for.
  Probed and clean: both deload windows are 21 days and symmetric about the week; every
  freshVerdict call site is type-scoped so no training answer can reach the food screen;
  dueForVerdict excludes already-judged rows; deload targets are ISO dates and cannot collide
  with 'kcalTraining'; allowances only shrank across all four slices (types.ts 674 to 604,
  store/schema.ts 578 to 554, blockMathFor off the dead-export ledger, nothing added).
  Validation: tsc -b clean, **1,729/1,729 unit** (9 new), build green, sim 20 personas,
  **91/91 e2e** (1 new), **poison 219/219 unit + 11/11 e2e** (5 new, 1 anchor re-aimed).
  NEXT: R3 s9.2 still has the two substitution kinds (equipment, joint pain), drop-load and
  the failing-flag softening. Same machinery, more metrics.

### 2026-08-20 · J8 slice 5 · two engines that disagreed, and a promise finally kept
  R3 s9.2's remaining rows, taken in the pack's own order. Two shipped, one is blocked on
  the owner, one is scoped as its own slice and named in the gaps ledger.
  DROP-LOAD (s9.2 row 1). R3 says this needs no outcome of its own and escalates to the
  failing flag "which already exists". It did not, for half the evidence, and a probe proved
  it before anything was changed: three empty-the-tank sessions returned NO suggestions,
  while three two-rep sessions returned start-lighter with a count of three. There were two
  definitions of "the weight was wrong today" and they disagreed. The in-session drop fires
  on a two-rep shortfall OR a set that emptied the tank and finished one down; the flag
  counted only the first. So an athlete grinding to failure and missing by one had the
  weight taken off the bar mid-session, every session, and was handed the same prescription
  the next time. The app acted on the evidence and then refused to learn from it.
  engine/shortfall.ts is the single definition now, a third module rather than one importing
  the other because sessionFatigue.ts already reads dropTo from fatigue.ts. Same fix as
  proposals.ts, same reason. The change broke NO existing test until the new ones were
  written, which is the weightTrend signal exactly.
  JOINT-PAIN SUBSTITUTION (s9.2 row 6). adapt.ts has told athletes since it was written that
  "if it is still there in two weeks, that is a question for a physio and not for an app",
  and nothing ever checked. The line repeated itself every session for as long as the joint
  hurt, which is the app naming a deadline out loud and then declining to notice it pass.
  Of everything in here that is the sentence a person would most reasonably expect it to
  keep. signals.ts gains persistentPainJoints, reading ALL history rather than the 14-day
  signal window, because the whole question is how long this has been going on and a
  fortnight-wide window can only ever answer "a fortnight at most". A quiet stretch of 14
  days ends a run, so a flare last winter and one this morning are two complaints rather
  than one ten-month injury. A stuck joint stops being swapped (every substitute was already
  chosen to spare it, so swapping again is an answer this app watched fail) and goes down
  the reduce-load path that already existed, with a sentence that has stopped promising a
  date that has gone by. Still an offer, never automatic.
  Validation: tsc -b clean, **1,749/1,749 unit** (23 new), build green, sim 20 personas,
  **91/91 e2e**, **poison 231/231** (12 new).

### 2026-08-20 · review pass over J8 slice 5 (rule 8)
  THREE MORE, all found by probe or screenshot rather than by reading.
  (1) CLEAN_SESSIONS_TO_UNFLAG SURVIVED BEING SET TO 99, and it is the only route off a
  softened prescription. At 99 a movement stays reduced forever however many clean sessions
  the athlete strings together, so work they have plainly earned is never given back, and
  nothing said so. Setting it to 1 also survived, which is the flicker the hysteresis was
  written to stop. Both pinned, both mutated.
  (2) RECENT_DAYS SURVIVED BEING SET TO 999. Three bad sessions spread across a year would
  read as a movement that is failing today. Same all-history mistake the weight trend was
  carrying before the J7 review, in a second file, and the third time this session that a
  window has turned out to be untested.
  (3) THE SAME PARAGRAPH TWICE, ONE WORD CHANGED, caught by screenshot. A pressing movement
  stresses the shoulder AND the elbow, and planAdjustments files each movement under the
  FIRST of its stressed joints. flat-db-press lists shoulder first, close-grip-press lists
  elbow first, so the athlete got two near-identical four-sentence cards stacked. How many
  cards you saw came down to the order of two strings in the catalog. Collapsed into one
  card naming every stuck joint, with the singular case tested too: "your shoulder have
  been complaining" is the sort of sentence that costs an app trust.
  ALSO RECORDED RATHER THAN BUILT: `prefs.blocked` and `prefs.pinned` have no writer
  anywhere in the app, which is why the equipment-substitute default is in section 5 waiting
  on the owner rather than shipped. Building it would have been the app's first write to a
  store with no screen to see or undo it.
  (4) AN ANCHOR THAT MATCHED TWICE, which is worse than one that matches never. Collapsing
  the pain cards put a second `automatic: false` above the one `pain-advice-claims-to-have-acted`
  was aimed at. The mutation still FIRED, so nothing looked broken, but it poisoned the new
  block instead of the one adapt.test.ts guards, and a mutation that had worked for months
  reported SURVIVED with nothing actually wrong. The pre-flight checked that anchors still
  match and never that they match ONCE. It refuses on ambiguity now, and that check
  immediately turned up a second one nobody had noticed: `w4m-vegan-cliff-goes-unmeasured`
  matched both vegan breakfasts and has been poisoning whichever came first. Both re-aimed.
  Third harness fix this session, all the same shape: a guard that could go quiet.
  Probed and clean: PAIN_PERSISTS_DAYS, COMPLAINT_GAP_DAYS both directions, PAIN_PATTERN_COUNT,
  SHORT_SESSIONS_TO_ACT, SHORTFALL_TO_ACT; no new file near its allowance; every new export
  has a non-test caller; the stated-limitation branch still outranks the escalation, so
  somebody who typed "knee replacement" is not told their knee has been complaining.
  Validation: tsc -b clean, **1,749/1,749 unit**, build green, sim 20 personas, **91/91 e2e**,
  **poison 231/231**.
  NEXT: the failing-flag 6-exposure escalation (gaps ledger), then the R3 s9.2 rows nothing
  has touched yet: volume ceiling, rest change, schedule change, exercise variation.

### 2026-08-20 · J8 slice 6 · the lift the lighter weight never rescued
  R3 s9.2's last row I could close: "if 2 clean sessions never arrive within 6 exposures,
  escalate to plateau ladder rung 3". Nothing noticed. A flagged movement was softened and
  left there, silently, for as long as it took, while the coach repeated "two clean sessions
  in a row puts it back to normal" every session having already watched six go by without
  it. Advice the app has seen fail is not advice.
  Rung 3 is back off AND re-climb. The load half already shipped (prescription.ts softens via
  dropTo with a proportional floor); the re-climb was missing entirely, so the reps never
  restarted at the bottom of the range and there was nothing to climb.
  The flag walk counts exposures since it went up, and the session that RAISED the flag is
  exposure ZERO rather than one: the six are the chances the softened prescription gets to
  work, and the day it was written is not one of them. Off by one there is a whole extra
  session of somebody grinding, so it has its own test and its own mutation. Two clean
  sessions still clear the flag at any point, and a cleared flag has no exposures to
  accumulate, so a movement that actually came back never stalls.
  THE REVIEW PASS FOUND THE THING THAT UNDERCUT THE WHOLE SLICE. The failing flag was the
  ONLY automatic adjustment in this app that never said why. It softens the load and now
  restarts the range, and the athlete watched a squat go from 10 at 100 to 8 at 90 with
  nothing on screen. `FatigueSuggestion.because` has carried the sentence since the day it
  was written, its own comment reads "the evidence, in a sentence: an unexplained change
  reads as a bug", and NOTHING has ever rendered it: prescription.ts is the only caller and
  it reads `kind` alone. So the escalation I had just built would have been invisible.
  engine/fatigue.ts owns the note now (flagNotes) and resolveDay puts it on the day through
  the banner path that already explains the volume trim. Stalled movements get a line each;
  the ordinary softening collapses into one, because one note per movement is how a bad
  month turns the top of the screen into a wall of apology. Tested at the E2E level as well
  as the unit level, deliberately: a unit test that calls the function is exactly the gap
  that let two earlier slices ship an engine nothing invoked.
  TWO MORE FROM THE SAME PASS. (1) The first version returned a fresh step for a stalled
  movement and threw backOff and staleSteps away with it, quietly taking a load reduction
  AWAY from the one lift going worst at the moment the app decided it was stuck. Only the
  reps are overridden now. Rung 3 adds a lever, it does not spend one. (2) I wrote the
  stalled sentence out twice, once on the suggestion and once on the note, which is the
  same two-definitions smell this session has now fixed four times. One STALLED_LINE.
  ALSO: resolveDay.ts hit 622 lines against the 600 cap, and the answer was to move the note
  to the file that owns the flag rather than to raise the cap. plan/words.ts is the shared
  list formatter, because adapt.ts and the new note had each grown their own join and
  "shoulder, elbow" and "shoulder and elbow" both shipped depending which file you read.
  Validation: tsc -b clean, **1,763/1,763 unit** (14 new), build green, sim 20 personas,
  **92/92 e2e** (1 new), **poison 240/240 unit + 12/12 e2e** (9 new).
  NEXT: the R3 s9.2 rows nothing has touched yet, in the pack's order: readiness downgrade,
  volume ceiling raise and lower, rest change, schedule change, exercise variation, phase
  promotion. The equipment-substitute default stays blocked on the owner (section 5).

## 10. SOURCES

- Living dashboard (this plan, rendered, republishable via url):
  https://claude.ai/code/artifact/9c3f6836-93c6-43a2-af69-04c9d31d952e
- BodyT Build Line (the whole board on a timeline, counts derived from this file's rows):
  https://claude.ai/code/artifact/c7d11318-1190-48c7-b8c9-114b1d96825d
- Bodytea Open Work: https://claude.ai/code/artifact/fc913f9c-ce3c-4ac8-91f2-51d35de8328e
- Bodytea Build Ledger: https://claude.ai/code/artifact/b4466656-ceb2-4d54-ae8e-5b8870e8d0b6
- Onboarding Rebuild Review: https://claude.ai/code/artifact/5210b444-304f-483b-9f1d-5e5d8070e843
- Twenty Athletes, Twenty Weeks: https://claude.ai/code/artifact/5ac65495-882b-4c52-ba13-386017f05b1e
- Eight Weeks On The Floor: https://claude.ai/code/artifact/d065c1e5-e6d0-4a54-84bb-e488015c0f80
- BodyT Engine Playbook v12: owner-held docx (Core Intelligence, Claude Handoff edition).

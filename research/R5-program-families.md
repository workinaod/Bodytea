# R5: Program Family / Archetype Corpus

Research job R5 for BodyT (v12 section 3, "Program/routine corpus & program archetypes"). Deterministic coaching PWA, no runtime LLM, local-first.
Consumers of this pack: **J11** (candidate strategies), **J5** (regenerate + diff), **J6** (limitations lifecycle), **B3** (knowledge store).
Depends on: **J7** user model (for `experience_band`, work capacity, per-domain state), **R6** safety pack (hard filters).
Access date for all external sources: 2026-08-18. Researcher: Claude (session d21c12d6). **No production code in this pack.**

Conventions:
- **`evidence_tier: A`** = guideline body, meta-analysis, or position stand. **`B`** = reputable published program corpus or coach-authored template with stated rationale. **`C`** = HOUSE HEURISTIC, evidence-informed, not directly sourced.
- Anything marked **HOUSE HEURISTIC** is our reasoning, not a cited claim. It is labelled everywhere it is used.
- **Licensing.** We extract *architecture* (frequency, split logic, volume model, intensity model, progression rule, deload shape, entry/exit criteria) and cite it. We reproduce **no** program verbatim, no exercise-by-exercise table from any source, and no source's branded program name as a BodyT family name. Named programs appear below only as evidence that an architecture exists in the wild.
- No em dashes anywhere in this document, because section 6 is user-visible copy and the rest gets quoted into the app.

---

## 0. SOURCES (provenance)

| ID | Source | Publisher | URL | Accessed | What was taken | Access quality |
|----|--------|-----------|-----|----------|----------------|----------------|
| ACSM-2026 | Resistance Training Prescription for Muscle Function, Hypertrophy, and Physical Performance in Healthy Adults: An Overview of Reviews (MSSE, Apr 2026; 137 systematic reviews, 30,000+ participants) | American College of Sports Medicine | https://acsm.org/resistance-training-guidelines-update-2026/ | 2026-08-18 | Strength: ~80% 1RM, 2-3 sets/exercise. Hypertrophy: ~10 sets/muscle/week. Power: 30-70% 1RM with maximal concentric intent. All major muscle groups at least 2x/week. Failure training, equipment type and complex periodization "not strictly necessary" for general health. Non-traditional (bands, bodyweight, home) "highly effective" | FULL (publisher summary page; MSSE paper itself paywalled) |
| ACSM-2009 | Position Stand: Progression Models in Resistance Training for Healthy Adults. MSSE 41(3):687-708 | ACSM | https://pubmed.ncbi.nlm.nih.gov/19204579/ | 2026-08-18 | The novice / intermediate / advanced progression framework; the variable list a program manipulates (muscle actions, intensity, volume, exercise selection, exercise order, rest, frequency); definition of progressive overload | ABSTRACT + secondary summaries (full PDF host returned a bot wall) |
| SCHOEN-FREQ-2019 | How many times per week should a muscle be trained to maximize muscle hypertrophy? Systematic review and meta-analysis (25 studies). Schoenfeld, Grgic, Krieger. J Sports Sci 37(11) | Journal of Sports Sciences | https://pubmed.ncbi.nlm.nih.gov/30558493/ | 2026-08-18 | **Volume-equated**, frequency does not meaningfully change hypertrophy. Non-volume-equated meta-regression favours higher frequency, modest magnitude. Practical read: frequency is a delivery vehicle for volume, choose by preference and schedule | ABSTRACT via search capture |
| SCHOEN-FREQ-2016 | Effects of Resistance Training Frequency on Measures of Muscle Hypertrophy (10 studies) | Sports Medicine | https://www.researchgate.net/publication/301578131_Effects_of_Resistance_Training_Frequency_on_Measures_of_Muscle_Hypertrophy_A_Systematic_Review_and_Meta-Analysis | 2026-08-18 | At matched weekly volume, 2x/week per muscle beat 1x/week. Superseded in magnitude by the 2019 update; kept because the "at least twice" floor survives in ACSM-2026 | ABSTRACT via search capture |
| STR-FREQ-2018 | Effect of Resistance Training Frequency on Gains in Muscular Strength: Systematic Review and Meta-Analysis. Grgic et al. Sports Medicine | https://pubmed.ncbi.nlm.nih.gov/29470825/ | 2026-08-18 | Frequency effect on strength largely disappears when volume is equated | ABSTRACT via search capture (PubMed HTML served a cookie wall) |
| CONCURRENT-2025 | The effects, mechanisms, and influencing factors of concurrent strength and endurance training with different sequences: a semi-systematic review | Frontiers in Sports and Active Living | https://www.frontiersin.org/journals/sports-and-active-living/articles/10.3389/fspor.2025.1692399/full | 2026-08-18 | Concurrent training generally does **not** blunt hypertrophy or max strength across sequence, frequency, training status or age. **Exception: concurrent training with running (not cycling) produced significant decrements in both hypertrophy and strength.** Resistance-before-endurance favoured for lower-body dynamic strength over blocks of 5+ weeks | FULL |
| CONCURRENT-SEQ | The Role of Intra-Session Exercise Sequence in the Interference Effect: Systematic Review with Meta-Analysis | PMC | https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5752732/ | 2026-08-18 | Supports resistance-then-endurance order for lower-body dynamic strength; no order effect for static strength or hypertrophy | FULL |
| BWF-RR | Reddit r/bodyweightfitness Recommended Routine (full text mirror) | r/bodyweightfitness community wiki, mirrored gist | https://gist.github.com/sgup/f10f1d57e54b7876495f4bafb6d697eb | 2026-08-18 | 3 d/wk, ~60 min. Warmup then strength then cooldown. **Three antagonist superset pairs plus a core triplet**: pull-vertical + squat, dip + hinge, pull-horizontal + push-horizontal, 90 s rest inside pairs, 60 s in the core triplet. All slots 3x5-8. **Progression rule: hit 3x8 with good form and move to the next harder variation, restart at 3x5; fail 3x5 and regress a step** | FULL |
| BWF-BOOST | Boostcamp catalogue entry for the same routine (third-party classification of it) | Boostcamp | https://www.boostcamp.app/coaches/r-bodyweightfitness/r-bodyweight-recommended-routine | 2026-08-18 | How a modern program library tags an archetype: goals, experience level (Beginner + Intermediate), 3 d/wk, 12 weeks, equipment "At Home", ~45 min/session. Library facet vocabulary: strength / hypertrophy / powerlifting, beginner / intermediate / advanced, full-body / PPL, home / gym | FULL |
| LIFTVAULT-TAX | Lift Vault program library taxonomy | Lift Vault | https://liftvault.com/programs/ | 2026-08-18 | Category axes actually used by a large program library: type (powerlifting, bodybuilding, strength, powerbuilding, hypertrophy, bodyweight, lift-specific, olympic, strongman, running), duration 3-16 weeks or indefinite, **split (full body, upper/lower, PPL 3-day and 6-day, bro split, 2-6 day)**, experience (beginner/intermediate/advanced). Archetype-to-parameter table: linear progression 3-4 d indefinite beginner; hypertrophy/mass 4-5 d 8-12 wk intermediate; peaking 4-5 d 4-6 wk advanced; hybrid lift+conditioning 5-6 d 12-16 wk | FULL |
| RFIT-WIKI | r/Fitness routine index (The Fitness Wiki) | r/Fitness community | https://thefitness.wiki/routines/ and https://thefitness.wiki/routines/strength-training-muscle-building/ | 2026-08-18 | Top-level category split used to route a beginner: **Strength Training / Muscle Building; Cardio and Conditioning; Military / LE / First Responder**, with a separate basic-beginner entry point and an explicit "how do I choose the right routine for my goals" FAQ. Named archetypes in the index include a 3-day full-body barbell beginner routine, a linear-progression PPL runnable at **6 days or folded to 3**, a 4-day athletic strength template, and a 5-day power-plus-hypertrophy template | SEARCH-LEVEL ONLY (site returned 403 to the session proxy on every direct fetch; content captured from search result snippets, so treated as tier B and never quoted) |
| BBM-BEGIN | The Beginner Prescription / Beginner Template | Barbell Medicine | https://www.barbellmedicine.com/blog/the-beginner-prescription-blog/ and https://www.barbellmedicine.com/shop/training-templates/strength/beginner-template/ | 2026-08-18 | 15 weeks, 3 progressive blocks with built-in deloads, choice of **2-day or 3-day** plus optional conditioning. **RPE-driven load selection so no 1RM test is needed on day one.** Rationale captured: RPE is a skill that needs practice at lower volume before volume rises in the next phase; beginners should rotate several exercises within squat / hinge / push / pull to reduce overuse and improve motor learning | SEARCH-LEVEL ONLY (site and its PDF both served a bot-verification wall) |
| SBS-VOL | Stronger by Science: The New Approach to Training Volume; template structure | Stronger by Science | https://www.strongerbyscience.com/the-new-approach-to-training-volume/ and https://www.strongerbyscience.com/program-bundle/ | 2026-08-18 | MRV framing, with the practical ceiling that most trainees' maximum recoverable volume does not exceed ~30 sets per muscle per week. Template architecture: 21 weeks as three 7-week blocks, intensity climbing and reps falling across blocks. Novice hypertrophy progression: **add sets and reps at a fixed load from 3x8 up to 5x12, then raise load** | SEARCH-LEVEL ONLY (strongerbyscience.com returned 403 to the session proxy) |
| STRENGTHLOG | StrengthLog program library | StrengthLog | https://www.strengthlog.com/training-programs/ | 2026-08-18 | Frequency-indexed archetype spread: 2 d/wk full-body hypertrophy; 3 d/wk full-body hypertrophy, beginner powerlifting, and DUP for intermediates; 4 d/wk upper/lower with two strength days and two hypertrophy days; 5 d/wk one-lift-per-short-session. Block program shape: 4 weeks preparatory, 4 specialization, 3 peaking | SEARCH-LEVEL ONLY (site returned 403 to the session proxy) |
| DAREBEE | DAREBEE programs library and get-started guide | DAREBEE | https://darebee.com/programs.html and https://darebee.com/get-started.html | 2026-08-18 | 95+ free programs, no equipment for most. **Every workout ships at three difficulty levels (Levels I / II / III) that scale set counts on the same card**, so one program serves a first-timer and a veteran. 30-day program length is the house unit. **No official rest days; light and heavy days are balanced into the schedule instead.** Named archetype spread includes express PPL, cut, soft cardio, HIIT, and 10-minute-a-day | PARTIAL (programs index FULL; individual program pages served a bot wall, so per-program detail came from search snippets) |
| HIGDON-N1 | Novice 1 Marathon Training Program | Hal Higdon | https://www.halhigdon.com/training-programs/marathon-training/novice-1-marathon/ | 2026-08-18 | **18 weeks, 4 running days plus cross-training and rest.** Long run builds 6 mi (wk 1) to 20 mi (wk 15). **Every third week is a stepback week** that reduces the long run while the block keeps building. **3-week taper after the peak** | SEARCH-LEVEL ONLY (page and its printable PDF both returned empty bodies through the proxy) |
| NHS-C25K | Couch to 5K | NHS (UK) | https://www.nhs.uk/live-well/exercise/get-running-with-couch-to-5k/ | 2026-08-18 | **9 weeks, 3 sessions/week with rest days between.** Week 1 is 1 min run / 90 s walk intervals at self-selected pace. Run share grows each week. Exit criterion is 30 minutes of continuous running / 5 km. Entry requirement: absolute beginner, any fitness level, GP conversation if health concerns | FULL |
| POSTNATAL-RTR | Returning to running postnatal: guidelines for medical, health and fitness professionals managing this population. Goom, Donnelly, Brockwell (2019), RCOG evidence grading | Absolute Physio (open PDF) | https://absolute.physio/wp-content/uploads/2019/09/returning-to-running-postnatal-guidelines.pdf | 2026-08-18 | Full 40-page text extracted locally. **Return to running not advisable before 3 months postnatal (Level 4), target window 3-6 months.** Staged 0-3 month on-ramp (wk 0-2 pelvic floor + basic core + walking; wk 2-4 add squat/lunge/bridge; wk 4-6 low impact cycling/cross-trainer; wk 6-8 scar work, power walking, deadlift technique from ~15 kg; wk 8-12 swimming, spinning). **Load-and-impact readiness battery, all symptom-free: 30 min walk, 10 s single-leg balance, 10 single-leg squats/side, 1 min jog in place, 10 forward bounds, 10 hops/leg, 10 single-leg "running man"/side.** Strength battery to fatigue, target 20 reps: single-leg calf raise, single-leg bridge, single-leg sit-to-stand, side-lying abduction, with the explicit note that **weakness is not a barrier to return, it is a direction for strength work.** Beyond 12 weeks: graded plan such as C25K, build volume before intensity, reduce to a 3 km target where injury risk factors exist | FULL (primary PDF, text extracted locally) |

**Blocked in this environment** (recorded so future sessions do not re-burn usage): `thefitness.wiki` (403 on every path), `strongerbyscience.com` (403), `barbellmedicine.com` (bot-verification wall on both site and PDF), `strengthlog.com` (403), `muscleandstrength.com` (403), `reddit.com` and `redditbwf.github.io/wiki/*` (403 / 404; the gist mirror worked), individual `darebee.com/program*/…` pages (bot wall; the index worked), `exrx.net` (403), `halhigdon.com` (empty bodies), PubMed article HTML (cookie wall; abstracts came through search).

---

## 1. WHAT BODYT ALREADY IS

Source of truth read for this section: `src/plan/generator.ts` (941 lines), `src/plan/blocks.ts`, `src/plan/equip.ts`, `src/types.ts` (`PlanConfig`), `src/prefsTypes.ts`, `src/engine/volume.ts`, `src/engine/focus.ts`, `src/plan/analyze.ts`, on `origin/claude/app-audit-refinement-sjw2va` at `67ceb91`.

### 1.1 The pipeline

```
OnboardingAnswers
  -> FAMILY[goal]                        7 Goals collapse to 4 GoalFamilies
  -> LAYOUTS[family][daysPerWeek]        16 tables, Weekday -> Role
  -> RECIPES[role]                       8 hand-authored day recipes
  -> buildTemplate(recipe, owned, exp)   fixed entries resolved by equipment; slot entries left symbolic
  -> pickSlots(goal, owned, seed)        10 POOLS -> exerciseId per slot per block 1|2|3
  -> REP_WAVES[goal]                     applied to ANCHOR_SLOTS only
  -> focusAreas, gentleExplosive, cardio, nutrition, rationale, mealPlan
  -> PlanConfig                          exactly one
```

**The four families and the seven goals.**

| GoalFamily | Goals mapped to it |
|---|---|
| `explosive` | `vertical`, `speed` |
| `muscle` | `muscle` |
| `strength` | `strength` |
| `general` | `lean`, `general`, `endurance` |

**The eight roles / recipes.** `power`, `speed`, `lowerStrength`, `push`, `pull`, `upperMix`, `fullBody`, `mobility`. Each is one fixed `Recipe` literal: title, tagline, `cns` flag, kind, `debriefKey`, an ordered entry list of 5 to 7 items, and an optional note. Entries are either `fx` (a specific exerciseId, equipment-resolved at build time, dropped entirely if nothing resolves) or `sl` (a slot name filled later).

**The ten pools.** `squatVariation`, `lowerAccessory`, `hamstring`, `press1`, `press2`, `rowVariation`, `curl`, `calf`, `coreA`, `coreB`. Each pool ends in a bodyweight-legal terminal entry so `legal.length >= 1` for any gear.

**The four anchor slots.** `squatVariation`, `press1`, `rowVariation`, `hamstring` hold the same movement in all three blocks, carry the rep waves, and feed `trackedLifts`.

### 1.2 What varies per person, precisely

| Input | What it actually changes |
|---|---|
| `goal` | `FAMILY` -> layout; `GOAL_FIRST` promotions (**only** `strength` and `muscle` have entries); `REP_WAVES` row; `copyFlavor`; rationale template pool; nutrition offset; strategy bullets; plan name |
| `daysPerWeek` (3\|4\|5\|6) | Which `LAYOUTS` row. This is the single biggest structural lever |
| `equipProfile` + `extraEquip` | `owned` tag set -> which pool entries are `legal`, which `fx` entries survive, which cardio options appear |
| `experience` | **`'new'` only.** Subtracts 1 set from any session entry with `sets > 2`. `'returning'`, `'casual'` and `'trained'` are byte-identical to each other |
| `focusAreas` | First **2** areas only (`.slice(0, 2)`, despite the doc comment saying "up to four"). Appends one 3 x 10-15 accessory to a non-CNS host day and renames that day |
| `goalStatement`, `bodyweightLb`, `focusAreas`, `daysPerWeek`, `experience` | Combine into the djb2 `seed`, which sets the **rotation order of blocks 2 and 3 for the six non-anchor slots** |
| `goalAnswers` | `gentleExplosive` (explosive family only: 1 fewer set on `jump` / `sprint` fixed entries); nutrition nudges; strategy bullets |
| `sex`, `heightIn`, `mealsPerDay`, `dietStyle`, `skipMeals`, `lifeSeeds`, `customTargets` | Nutrition, meals, copy, life events. **Zero effect on training structure** |

### 1.3 What does NOT vary, and the exact size of the problem

**Finding 1: the personalization seed has no effect on the first four weeks.**
In `pickSlots`, `varied = [legal[0], ...rest.slice(r), ...rest.slice(0, r)]` and `out[block][slot] = varied[(block - 1) % varied.length]`. Block 1 is always `varied[0]`, which is always `legal[0]`, which is a pure function of `(goal, owned)`. Anchor slots are `legal[0]` in all three blocks and never see the seed at all. So the seed touches **6 slots x 2 blocks = 12 of 30 slot cells**, all of them accessory slots (`lowerAccessory`, `press2`, `curl`, `calf`, `coreA`, `coreB`), and **none of them in weeks 1 to 4**. Two different people with the same goal, days, equipment and experience open the app to the identical first block.

**Finding 2: `muscle` and `strength` are the same weekly architecture.**
Their `LAYOUTS` rows contain identical role multisets at every day count; only the weekday assignment differs.

| days | `muscle` roles | `strength` roles | same set? |
|---|---|---|---|
| 3 | push, pull, lowerStrength | lowerStrength, push, pull | yes |
| 4 | push, lowerStrength, pull, fullBody | lowerStrength, push, pull, fullBody | yes |
| 5 | push, pull, lowerStrength, upperMix, fullBody | lowerStrength, push, pull, fullBody, upperMix | yes |
| 6 | + mobility | + mobility | yes |

They therefore share every recipe. The real differences are `REP_WAVES` (8-12/6-8/10-12 vs 6-8/4-6/3-5), three `GOAL_FIRST` promotions, and copy. There is no difference in exercise ordering priority, rest, set counts, or weekly movement distribution.

**Finding 3: `vertical` and `speed` produce byte-identical training.**
Both map to `explosive`. Neither has a `GOAL_FIRST` entry. Their `REP_WAVES` rows are literally the same values (`6-8`/7, `4-6`/5, `6-8`/7). `copyFlavor` is `explosive` for both. The only machine-readable difference in the whole `PlanConfig` is the nutrition offset (200 vs 150 kcal) and prose.

**Finding 4: `endurance` gets no endurance programming.**
`lean`, `general` and `endurance` share the `general` layouts and recipes. `general` and `endurance` even share rep waves in blocks 1 and 2 and differ only in block 3. `pickCardio(owned)` takes **only** the equipment set, so a marathoner and a powerlifter are handed the same ten-option cardio menu with the same rep texts, attached to one `conditioningWeekday`. Nothing in the generator emits a long run, a weekly mileage target, a stepback week or a taper. The strategy copy for `endurance` talks confidently about 80/20 and a long run building toward 20 miles; the plan does not contain one.

**Finding 5: `home-db` and `minimal` are the same profile.**
`PROFILE_TAGS['home-db']` and `PROFILE_TAGS['minimal']` are both exactly `['open-space']`. The distinction only exists through whatever the user checks in `extraEquip`.

**Finding 6: limitations never reach the generator.**
`OnboardingAnswers` has no `prefs` field. `Prefs.limitations`, `Prefs.blocked`, `Prefs.pinned` and `Prefs.sessionMinutes` are applied downstream at resolve time (`engine/resolveDay.ts`, `engine/volume.ts:trimToFit`). Consequence: the persona with a knee replacement and the persona with twenty years of back trouble, both `general` / 3 days / `home-db` / `new`, receive the **identical booklet**. The routing happens later, per day, invisibly to the plan the user is shown and asked to trust.

**Finding 7: only 3 to 6 days are expressible.** `daysPerWeek: 3 | 4 | 5 | 6`. There is no 2-day plan, which is the frequency floor that ACSM-2026, BBM-BEGIN and STRENGTHLOG all support and that most time-poor and returning users actually need.

**How much real diversity exists today.** Distinct weekly training architectures = 4 families x 4 day counts = **16**, reduced to roughly **12** once `muscle`/`strength` role-set duplication is collapsed. Within any one of those, exercise selection for the first block is a pure function of the equipment set. Everything else that varies is nutrition, copy, and the rotation order of six accessory slots in weeks 5 to 12.

**Concrete convergence failures already sitting in `scripts/simPersonas.mjs`:**

| pair | shared inputs | what differs in the plan |
|---|---|---|
| `night-shift-mum` / `postpartum` | general, 3 d, minimal, returning, no extras | week 1 identical. Blocks 2/3 accessory order, and nutrition |
| `bad-back` / `new-knee` | general, 3 d, home-db, new, no extras | **entire booklet identical.** Limitations differ but are invisible to the generator |
| `powerlifter` / `lineman` | strength, 5 d, gym | experience `trained` vs `returning` has no effect; 195 lb vs 285 lb only reseeds blocks 2/3 |
| `dunk-novice` (vertical) / a `speed` twin | explosive, same days, same gear | nothing structural. See Finding 3 |
| `marathon-first` / `nurse-lean` | general family, minimal | different day counts save this pair; at equal days they would share layout, recipes and block-1 slots |

That is the gap R5 exists to close, and the reason J11 cannot just re-run the same generator with a different seed.

---

## 2. ARCHETYPE SURVEY

Architecture only. Each row is a **structural pattern** observed across the corpus, with the sources that evidence it. No program is reproduced.

### 2.1 The axes a real program library actually indexes on

LIFTVAULT-TAX and BWF-BOOST converge on the same facet vocabulary, and it is close to what BodyT needs: **goal type**, **experience band**, **days per week**, **split**, **equipment/location**, **program length**. RFIT-WIKI adds a routing layer above that: the first branch is not a program, it is a **category** (strength/muscle vs cardio/conditioning vs occupational), with an explicit "how do I choose" step. DAREBEE adds a seventh axis the others lack and BodyT should steal: **difficulty tiers inside one program**, so the same card serves a first-timer and a veteran by scaling set counts rather than by switching program.

### 2.2 Structural patterns, extracted

**A. Full-body, low frequency (2-3 d/wk).**
Population: beginners, returners, time-constrained, anyone whose adherence is the binding constraint. Split logic: every session touches squat, hinge, push, pull, core; each pattern lands 2-3x/week from only 2-3 sessions. Volume: modest per session, satisfying the "every major muscle group at least twice weekly" floor (ACSM-2026, SCHOEN-FREQ-2016) with the fewest sessions possible. Intensity: RPE-selected rather than %1RM so no max test is needed on day one (BBM-BEGIN). Progression: linear load, or double progression at fixed load (SBS-VOL novice pattern: climb 3x8 to 5x12 at the same weight, then add load). Autoregulation: RPE, which BBM-BEGIN explicitly frames as a *skill* that needs low-volume practice before volume rises. Deload: built into block boundaries (BBM-BEGIN uses 3 blocks over 15 weeks with deloads in them). Entry: none. Exit: when session length or recovery, not stimulus, becomes the limiter. Evidence tier **A/B**.

**B. Upper/lower (4 d/wk).**
Population: intermediates with four reliable days. Split logic: two upper, two lower, alternating; every muscle group 2x/week by construction, which is exactly the frequency floor the meta-analyses support. Volume: higher per session than A, distributed over four exposures. Intensity: commonly a strength/hypertrophy split across the pairs, that is one heavy upper + one heavy lower and one higher-rep upper + one higher-rep lower (STRENGTHLOG's 4-day upper/lower is explicitly two strength days and two hypertrophy days). Progression: undulating within the week. Deload: block-scheduled. Entry: a stable 4-day schedule. Exit: when a lift needs more specific frequency than 2x/week. Evidence tier **B**.

**C. Push / pull / legs (3 or 6 d/wk).**
Population: intermediates and above who want volume per muscle group and enjoy training. Split logic: the same three sessions run once (3 d) or twice (6 d) per week; the 6-day version gives each pattern 2x/week frequency at high per-session volume. Progression: linear per lift in the beginner variants. Note that RFIT-WIKI's headline PPL is explicitly runnable at 6 days **or folded to 3**, which makes PPL a frequency-scalable family rather than a 6-day-only one. **This is the archetype the v12 brief specifically asks us to watch for generic convergence toward**, because it is the internet default answer regardless of question. Evidence tier **B**.

**D. Strength-priority, low rep.**
Population: people whose goal is a number on a lift. Split logic: the competition or anchor lift leads every session it appears in, on the freshest day; accessories serve it. Volume: lower total, concentrated on few movements. Intensity: high, around 80% 1RM for strength per ACSM-2026, with 2-3 sets per exercise. Progression: wave or block periodization. STRENGTHLOG's block shape is 4 weeks preparatory, 4 specialization, 3 peaking; SBS-VOL's template is three 7-week blocks with intensity climbing and reps falling. Autoregulation: RPE/RIR. Deload: scheduled at block boundaries, plus a taper before a test. Entry: knows the lifts, or is willing to spend two weeks finding working weights. Exit: competition or the target number. Evidence tier **A/B**.

**E. Hypertrophy-priority.**
Population: people whose goal is size or shape. Volume is the primary driver: ACSM-2026 puts the target at roughly **10 sets per muscle group per week**; SBS-VOL puts the practical recoverable ceiling near **30 sets per muscle per week** for most trainees and treats volume as something that should **ramp across a block** rather than start at the ceiling. Intensity: moderate, roughly 70-85% 1RM. Frequency: whatever delivers the volume, because volume-equated frequency is close to a wash (SCHOEN-FREQ-2019). Progression: double progression, or add sets/reps then load. Deload: when accumulated volume outruns recovery. Entry: capacity to do the volume. Exit: n/a, this is a steady state. Evidence tier **A**.

**F. Athletic / power-priority.**
Population: jumpers, sprinters, field-sport athletes. Split logic: the highest-CNS work goes first in the session and first in the week, on fully fresh legs; strength work follows; nothing high-intent is practised tired. Intensity: ACSM-2026 prescribes power work at **moderate loads, 30-70% 1RM, with maximal concentric intent**, which is a genuinely different intensity model from both D and E. Volume: low reps, high quality, stop-on-quality-drop rather than stop-on-count. Progression: quality and output first, load second. Entry: tissue tolerance for impact. Exit: season. Evidence tier **A/B**. BodyT's `power` and `speed` recipes already implement most of this correctly.

**G. Endurance-concurrent (lifting supports running).**
Population: runners and triathletes who lift as insurance, not as the main event. Architecture from HIGDON-N1: **18 weeks, 4 running days, cross-training and rest days, a single weekly long run that builds 6 to 20 miles, every third week a stepback, and a 3-week taper.** Entry ramp from NHS-C25K: **9 weeks, 3 sessions/week with rest between, walk/run intervals starting at 1 min run / 90 s walk, exit at 30 continuous minutes**. The critical interaction: CONCURRENT-2025 finds concurrent training generally does **not** blunt strength or hypertrophy, **except when the endurance mode is running**, where both were significantly reduced. CONCURRENT-SEQ supports resistance-before-endurance for lower-body dynamic strength. So this family must (i) keep lifting volume deliberately low, (ii) protect the long run and the hard run day from being preceded by heavy legs, and (iii) tell the user honestly that lifting progress will be slower. Evidence tier **A**.

**H. Home / minimal equipment.**
Population: no gym, hotel rooms, a garage with two dumbbells. Two distinct sub-architectures in the corpus:
- *Skill-progression bodyweight* (BWF-RR): 3 d/wk, ~45-60 min, warmup then strength then cooldown, **three antagonist superset pairs plus a core triplet**, everything at 3x5-8, 90 s rest inside pairs. **Progression is by movement difficulty, not load: reach 3x8 with good form and advance to the harder variation restarting at 3x5; fail 3x5 and regress.** This is the single most important structural import for BodyT, because it is a progression model the app currently does not have and it is the only honest one for unloaded work.
- *Volume-and-density bodyweight* (DAREBEE): 30-day blocks, no official rest days with light and heavy days balanced in instead, and **three difficulty levels on the same workout card** scaling set counts.
ACSM-2026 explicitly validates this family: bands, bodyweight and home-based routines are "highly effective". Evidence tier **A/B**.

**I. Preserve-and-repair (the user already has a routine).**
Not a program in the corpus, it is a *stance*. The corpus evidence for it is negative and strong: RFIT-WIKI's entire routing layer exists because the community's default failure is handing everyone the same routine; ACSM-2026's headline is that the best program is the one you will actually stick with, and that failure training, equipment type and complex periodization are not strictly necessary for general health. If someone is training consistently and progressing, the defensible intervention is the smallest one that fixes an actual hole. BodyT already has the machinery: `PlanConfig.routineGoals`, `PlanConfig.whyWorks`, and `plan/analyze.ts`, which already detects zero-pull, push-heavy above 1.6:1, missing hinge, quad-only, no core, no rest day, marathon days above 25 sets and snack days below 6. Evidence tier **A** for the principle, **C** for our specific repair thresholds.

**J. On-ramp / return-to-training.**
Population: postpartum, post-layoff, masters, post-clearance. POSTNATAL-RTR is the best-documented instance and generalises: a **time gate** (no running before 3 months postnatal, target window 3-6 months), a **staged low-impact progression** through the gate period, a **criterion-referenced readiness battery** that must be passed symptom-free before the next load tier unlocks (30 min walk, 10 s single-leg balance, 10 single-leg squats/side, 1 min jog in place, 10 forward bounds, 10 hops/leg, 10 single-leg running-man/side), a **strength battery** scored to fatigue against a 20-rep target, and the explicit rule that **weakness is a direction for work, not a barrier to return**. For masters, ACSM-2026's frequency floor plus the widely-summarised older-adult pattern of starting at 2 days and lower relative intensity before progressing. The generalisable shape is: **target program and currently-tolerable dose are separate objects, and the ramp between them is gated by criteria rather than by calendar alone.** That is already BodyT's stated v12 contract. Evidence tier **A** for postnatal, **B/C** elsewhere.

### 2.3 One-variable-at-a-time comparisons (the v12 brief's explicit ask)

| variable changed | what the corpus says actually changes |
|---|---|
| beginner -> intermediate | Progression rate per session drops, so the progression *model* must change from linear-per-session to weekly/block. Volume rises. Exercise variety within a pattern rises (BBM-BEGIN). Split can fragment |
| 2 -> 4 days | Split fragments from full-body to upper/lower; per-muscle frequency stays at 2x either way (SCHOEN-FREQ-2019); per-session volume falls, weekly volume rises |
| 4 -> 6 days | PPL becomes available; per-muscle frequency stays 2x; the gain is volume headroom, the cost is recovery margin and schedule fragility |
| home -> gym | Progression model changes from *difficulty-step* to *load-step*. This is a model change, not a substitution change, and BodyT currently only has the load-step half |
| strength -> hypertrophy | Intensity drops (80% -> 70-85%), volume rises (2-3 sets/exercise -> ~10 sets/muscle/week), exercise count rises, rest falls |
| strength -> power | Intensity drops much further (30-70% 1RM) but *intent* becomes maximal, and the stop rule changes from rep count to quality (ACSM-2026) |
| 30 -> 75 minutes | Accessory count and rest length are what flex; the anchor lifts do not |
| add running | The only interference case in CONCURRENT-2025. Lifting volume must fall, session order matters, and the honest tradeoff must be stated |

**Generic-convergence detection.** The corpus itself converges on PPL and on 4-day upper/lower as default answers regardless of the question asked. Any BodyT candidate set that offers PPL to a 3-day beginner with two dumbbells has reproduced the failure mode, not solved it.

---

## 3. CANONICAL PROGRAM FAMILY RECORD

Extends BodyT's existing contracts, does not duplicate them. It reuses `Goal`, `EquipTag`, `Weekday`, `FocusArea`, and it *produces* the inputs the existing generator already consumes (`GoalFamily`, a `LAYOUTS` row, `POOLS` ordering, a `REP_WAVES` row). `Role` and `GoalFamily` must be exported from `generator.ts`; they are currently private.

```ts
// src/plan/families.ts   (sketch, R5. No production code shipped in this pack.)
import type { EquipTag, Goal, Weekday } from '../types'
import type { FocusArea, Role, GoalFamily } from './generator'

export type FamilyId =
  | 'full-body-minimalist' | 'upper-lower' | 'push-pull-legs'
  | 'strength-priority'    | 'hypertrophy-priority' | 'athletic-power'
  | 'endurance-concurrent' | 'home-minimal' | 'preserve-and-repair'
  | 'on-ramp'

/** Coarser than plan/movement.ts joints; this is the weekly-distribution unit. */
export type MovementPattern =
  | 'squat' | 'hinge' | 'lunge'
  | 'push-horizontal' | 'push-vertical'
  | 'pull-horizontal' | 'pull-vertical'
  | 'carry' | 'core' | 'jump' | 'sprint' | 'run'

/** Deliberately NOT a global beginner/intermediate/advanced label (v12 forbids that).
 *  This is the band the FAMILY is written for; the user's per-domain state lives in J7. */
export type ExperienceBand = 'first-time' | 'returning' | 'consistent' | 'advanced'

export type EvidenceTier = 'A' | 'B' | 'C'   // C === HOUSE HEURISTIC

export interface ProgramFamily {
  family_id: FamilyId
  /** Shown to users. Casual, short, no jargon, no em dashes. */
  name_plain_language: string
  /** The Goals this family is a defensible answer to, best-fit first. */
  goal_fit: Goal[]
  secondary_goals: Goal[]
  population: string
  experience_band: ExperienceBand[]
  days_range: [min: number, max: number]
  session_minutes_range: [min: number, max: number]
  /** Tags that MUST be owned. Empty = bodyweight-legal everywhere. */
  equipment_floor: EquipTag[]

  split_logic: {
    kind: 'full-body' | 'upper-lower' | 'push-pull-legs' | 'anchor-led' | 'concurrent' | 'inherited'
    /** How this family fills LAYOUTS[.][days]. Returned, not stored, so day counts stay open. */
    rolesForDays: (days: number) => Partial<Record<Weekday, Role>>
    /** Which existing GoalFamily's recipes it borrows before its own overrides. */
    baseGoalFamily: GoalFamily
    /** Ordering rule inside a session, highest priority first. */
    sessionOrder: ('cns' | 'anchor' | 'compound' | 'accessory' | 'core' | 'conditioning')[]
  }

  /** Target weekly hard sets per pattern. The convergence metric reads this. */
  weekly_movement_distribution: Partial<Record<MovementPattern, [min: number, max: number]>>

  volume_model: {
    weekly_hard_sets: [min: number, max: number]
    per_muscle_sets_week: [min: number, max: number]
    per_session_set_cap: number
    /** Volume climbs across a block rather than starting at the ceiling (SBS-VOL). */
    ramp: 'flat' | 'ramp-within-block' | 'ramp-across-blocks'
  }

  intensity_model: {
    kind: 'rep-wave' | 'rpe' | 'percent-1rm' | 'intent' | 'pace-zone'
    /** Reuses PlanConfig.slotRepsByBlock shape when kind === 'rep-wave'. */
    anchorWave?: Record<1 | 2 | 3, { repText: string; repsNum: number }>
    rirTarget?: [min: number, max: number]
    pct1rm?: [min: number, max: number]
    /** For 'intent': stop the set when output drops, not when the count is hit. */
    stopRule?: 'count' | 'quality-drop'
  }

  frequency_model: {
    per_muscle_per_week: [min: number, max: number]
    anchorLiftFrequency: number
    /** Days that must not follow each other, e.g. heavy lower before a long run. */
    conflictPairs: [Role, Role][]
  }

  progression_model: {
    kind:
      | 'linear-load'        // add load every session while it holds
      | 'double-progression' // reps to the top of the range at fixed load, then load
      | 'wave-block'         // BodyT's current REP_WAVES behaviour
      | 'difficulty-step'    // BWF-RR: harder variation, not more weight
      | 'volume-ramp'        // add sets/reps at fixed load (SBS-VOL novice)
      | 'mileage-ramp'       // +~10%/wk, stepback every third week (HIGDON-N1)
      | 'preserve'           // do not change what is working
    /** For difficulty-step: the rep threshold that promotes, and the one that regresses. */
    promoteAt?: { sets: number; reps: number }
    regressAt?: { sets: number; reps: number }
    stepPct?: number
    reviewEveryWeeks: number
  }

  autoregulation: {
    /** Built on the proven engine/calibration.ts suggest-only shape. */
    signals: ('shortfall' | 'rir' | 'adherence' | 'soreness' | 'readiness' | 'pace-drift')[]
    responses: ('offer-ease' | 'soften-load' | 'drop-a-set' | 'drop-tier' | 'hold-progression' | 'extend-block')[]
    /** Nothing moves without a tap. Standing constraint, restated here so families cannot opt out. */
    suggestOnly: true
  }

  deload_model: {
    everyNWeeks: number | null
    style: 'halve-sets' | 'reduce-load' | 'stepback-volume' | 'taper' | 'none'
    taperWeeks?: number
  }

  /** How a user who is not yet ready gets to the target dose. Separate object by design. */
  on_ramp_notes: {
    required: boolean
    gate: { kind: 'time' | 'criterion' | 'both'; minWeeks?: number }
    /** Criterion-referenced, symptom-free. See POSTNATAL-RTR. */
    readinessTests?: { label: string; target: string }[]
    startingDosePct: number
    graduateAfterWeeks: number
  }

  tradeoffs: {
    what_progresses_faster: string
    what_progresses_slower: string
    what_it_costs: string
  }

  /** Machine-checkable exclusions. Joint ids match plan/movement.ts Joint. */
  contraindications: {
    joints: string[]
    r6Tiers: ('YELLOW' | 'RED')[]
    requiresClearance: boolean
    notes: string
  }

  source_refs: string[]        // ids from section 0
  evidence_tier: EvidenceTier
  confidence: 'high' | 'medium' | 'low'
}
```

**Reconciliation notes.** A `ProgramFamily` is not a `PlanConfig` and never becomes one directly. It is the *selector* that decides which layout, recipes, pool ordering and rep wave `generatePlan` uses. `PlanConfig` gains exactly one new optional field, `familyId?: FamilyId`, so a generated booklet can say which strategy produced it and J5's diff can show a family change as a first-class edit. `intensity_model.anchorWave` is deliberately the same shape as `PlanConfig.slotRepsByBlock` values so it drops straight in.

---

## 4. THE FAMILY SET

Ten families. Each is meaningfully different from the others on at least two of {split logic, weekly movement distribution, volume model, intensity model, progression model}. None is a renamed clone.

---

**F1 `full-body-minimalist` "Whole body, three short days"**
*Who:* first-timers, returners, anyone whose real constraint is showing up. 2-4 days, 30-45 min, no equipment floor.
*Defensible because:* it satisfies the every-muscle-twice-weekly floor with the fewest sessions (ACSM-2026, SCHOEN-FREQ-2016), and BBM-BEGIN ships a 2-day option for exactly this population. RPE-selected loads mean no max test on day one.
*Tradeoff vs the others:* the fastest habit and the fastest early strength, the slowest ceiling. Per-session volume per muscle is capped by session length, so it runs out of headroom before F5 does.
*Maps onto:* the existing `general` 3-day layout `{fullBody, lowerStrength, upperMix}`. **Extends** it by making all sessions `fullBody` at 2-3 days and by requiring `daysPerWeek` to accept 2. Progression model `volume-ramp` then `double-progression`.

---

**F2 `upper-lower` "Two upper days, two lower days"**
*Who:* consistent trainees with four reliable days, 45-60 min, needs at least dumbbells.
*Defensible because:* it is the corpus's most common 4-day answer (LIFTVAULT-TAX, STRENGTHLOG), it hits 2x/week per muscle by construction, and it lets one upper and one lower day run heavy while the other pair runs higher-rep.
*Tradeoff vs the others:* more volume per muscle than F1 with better recovery spacing than F3, but it needs four dependable days and it is worse than F4 at any single lift.
*Maps onto:* nearest existing is `strength`/`muscle` 4-day `{lowerStrength, push, pull, fullBody}`. **Extends** by adding `upperA`/`upperB` roles so the two upper days differ by intensity rather than by push/pull, and by making the second lower day a hypertrophy-flavoured `lowerStrength` variant.

---

**F3 `push-pull-legs` "Push day, pull day, leg day"**
*Who:* consistent-to-advanced, 3 or 6 days, 50-75 min, gym or a well-stocked garage.
*Defensible because:* it is frequency-scalable (RFIT-WIKI's headline PPL runs at 6 or folds to 3), it gives the most volume headroom per muscle group, and at 6 days it still holds 2x/week frequency.
*Tradeoff vs the others:* highest volume ceiling, highest schedule fragility. Miss two days in a six-day week and a whole pattern goes untrained. **This is the family the anti-cosmetic rule must guard hardest**, because it is the internet default answer.
*Maps onto:* `muscle` 5/6-day is closest. **Extends** by adding a true `legs` role distinct from `lowerStrength` and by allowing the same three roles to repeat twice in a week, which `LAYOUTS` already supports since `tier1ByWeekday` maps many weekdays to one template id.

---

**F4 `strength-priority` "Get strong at a few lifts"**
*Who:* people chasing a number. `consistent`/`advanced`, 3-5 days, 45-75 min, barbell or heavy dumbbells.
*Defensible because:* ACSM-2026 puts strength at ~80% 1RM and 2-3 sets per exercise, and the block shapes in STRENGTHLOG and SBS-VOL (prep / specialize / peak, intensity up and reps down) are the standard architecture.
*Tradeoff vs the others:* fastest movement of the tracked number, slowest visible size change, and the most demanding on joints and warmup time.
*Maps onto:* the existing `strength` family almost exactly. **Extends** by making the anchor lift lead every session it appears in, by respecting `Prefs.pinned` at plan time rather than only at rotation time, and by adding a taper before a stated `customTargets` test date.

---

**F5 `hypertrophy-priority` "Build size, more sets per muscle"**
*Who:* people chasing size or shape. `consistent`, 4-6 days, 50-75 min, dumbbells minimum.
*Defensible because:* volume is the driver, ~10 sets/muscle/week target (ACSM-2026) with the practical ceiling near 30 (SBS-VOL) and volume ramping across the block rather than starting at the ceiling.
*Tradeoff vs the others:* fastest visible change, slower absolute strength than F4, and it is the family most likely to outrun recovery if adherence is spiky.
*Maps onto:* the existing `muscle` family. **Extends** by making `volume_model.ramp` real (currently BodyT's set counts are constant across blocks) and by splitting it from F4 on distribution and rest, not just rep numbers. Today `muscle` and `strength` share their entire weekly architecture, which is Finding 2.

---

**F6 `athletic-power` "Jump higher, move faster"**
*Who:* jumpers, sprinters, field-sport athletes. Any band with tissue tolerance, 3-6 days, 45-75 min, open space minimum.
*Defensible because:* ACSM-2026 prescribes power at 30-70% 1RM with maximal concentric intent, which is a distinct intensity model, and the CNS-first ordering rule is universal in the corpus.
*Tradeoff vs the others:* fastest change in how you move, slowest change in how you look, and it is the least forgiving of turning up tired.
*Maps onto:* the existing `explosive` family, which already implements CNS-first ordering, `cnsWeekdays`, and the `gentleExplosive` on-ramp. **Extends** by giving `vertical` and `speed` genuinely different distributions (jump-dominant vs sprint-dominant), which today are identical (Finding 3), and by making `stopRule: 'quality-drop'` machine-readable instead of prose in a recipe note.

---

**F7 `endurance-concurrent` "Runs first, lifting keeps you in one piece"**
*Who:* runners and triathletes. Any band, 4-6 days, mixed session lengths, open space minimum.
*Defensible because:* HIGDON-N1 gives the weekly and block architecture (one long run, stepback every third week, 3-week taper) and NHS-C25K gives the on-ramp. CONCURRENT-2025 gives the constraint that makes this family mandatory rather than cosmetic: **running is the one endurance mode that measurably blunts strength and hypertrophy**, so lifting dose must be deliberately reduced and heavy legs must not sit in front of the long run.
*Tradeoff vs the others:* fastest aerobic progress and the best injury insurance for a race block, the slowest lifting progress of any family here, deliberately.
*Maps onto:* **nothing.** `endurance` currently borrows the `general` layout and receives zero programmed running (Finding 4). This is the largest genuine gap in the family set and the strongest argument that R5 must land before J11.

---

**F8 `home-minimal` "Whatever the room has"**
*Who:* travellers, garage lifters, hotel rooms. Any band, 3-5 days, 30-60 min, **no equipment floor**.
*Defensible because:* ACSM-2026 states plainly that bodyweight and home-based routines are highly effective. BWF-RR supplies the architecture BodyT is missing: antagonist supersets to compress session time, and **progression by movement difficulty rather than by load, with an explicit promote rule (3x8 clean, advance and restart at 3x5) and regress rule (fail 3x5, step back)**.
*Tradeoff vs the others:* trains anywhere and needs nothing, but the load ladder is coarse. Between two difficulty steps there is no half-step, so progress arrives in jumps rather than in a smooth line.
*Maps onto:* every existing family already resolves to bodyweight because each pool ends in a bodyweight-legal terminal entry. **Extends** by adding `progression_model.kind: 'difficulty-step'`, which BodyT does not have. J2 shipped the *measurement* half of this (rep-max series, `REP_GAIN_TO_PROMOTE = 2`); F8 is where the *program* half lives. Also folds `home-db` and `minimal` into one honest profile (Finding 5).

---

**F9 `preserve-and-repair` "Keep your routine, fix the two holes"**
*Who:* anyone who pastes a routine they are actually running. Any band, any days, any equipment.
*Defensible because:* ACSM-2026's own headline is that the best program is the one you will stick with and that complex periodization is not strictly necessary for general health. If someone is consistent and progressing, replacing their program is the intervention with the worst expected value. The v12 contract lists "maintain-and-repair current routine vs change structure" as a canonical tradeoff.
*Tradeoff vs the others:* keeps everything that is already working and asks for no new habit, but it inherits whatever ceiling the routine already has. If the routine's structure is the problem, this family will not fix it.
*Maps onto:* the existing BYOR path. `PlanConfig.routineGoals` and `whyWorks` already exist, `plan/analyze.ts` already emits the repair notes (zero-pull, push:pull above 1.6, missing hinge, quad-only, no core, no rest day, day above 25 sets, day below 6 sets). **Extends** by promoting analyze's warnings into *scored repairs* with a cap (**HOUSE HEURISTIC: at most 2 structural repairs on a first pass; more than that means the routine is not working and F9 should not be the recommendation**) and by setting `progression_model.kind: 'preserve'` so block rotation and phase promotion leave the user's own lifts alone.

---

**F10 `on-ramp` "Start under what you can do, earn the rest"**
*Who:* postpartum returners, post-layoff, masters, anyone just cleared after a R6 YELLOW. 2-4 days, 20-45 min, no equipment floor.
*Defensible because:* POSTNATAL-RTR is a fully specified instance of exactly this shape: a time gate, a staged low-impact progression, a criterion-referenced readiness battery that must pass symptom-free before load rises, a strength battery scored to fatigue, and the explicit rule that weakness directs work rather than blocking return. ACSM-2026's older-adult pattern is the same idea at lower intensity.
*Tradeoff vs the others:* the lowest chance of a setback and the slowest early numbers. It is the only family that will deliberately hold you back when you feel fine.
*Maps onto:* partially exists as `experience === 'new'` (one fewer set) and `gentleExplosive`. **Extends** into a real wrapper: F10 is a *modifier* over a target family, carrying `startingDosePct`, `graduateAfterWeeks` and `readinessTests`. This is the direct expression of v12's "target program and currently-tolerable dose are separate things".

### 4.1 Coverage check against BodyT's user space

| existing Goal | primary family | credible alternates |
|---|---|---|
| `vertical`, `speed` | F6 | F4 (strength is the limiter), F1 (low days) |
| `muscle` | F5 | F2, F3, F1 (low days), F8 (no gear) |
| `strength` | F4 | F2, F1 (low days) |
| `lean` | F5 or F1 | F2, F8 |
| `general` | F1 | F2, F8, F6 |
| `endurance` | F7 | F1 (lifting side only) |
| any, with a pasted routine | F9 | the structural family the routine most resembles |
| any, gated by R6 or a stated return | F10 wrapping the above | |

---

## 5. CANDIDATE SELECTION LOGIC

Deterministic. Same inputs, same candidate set, same recommendation. No randomness anywhere.

### 5.1 Stage 1: hard filters (a family that fails any of these is not eligible, ever)

| filter | rule | data source |
|---|---|---|
| **Safety, R6 RED** | Any RED flag: **no candidates at all.** No plan, no substitute workout, no alternatives screen. This gate is unbypassable by family. | R6 classifier |
| **Safety, R6 YELLOW** | Families whose `contraindications.r6Tiers` includes the active tier are excluded. Remaining families are wrapped in F10. | R6 classifier |
| **Limitation / joint** | Exclude a family if its `weekly_movement_distribution` requires a pattern that cannot be covered after `Prefs.limitations` routing. Note: **this requires passing `Prefs` into the generator, which today it never sees (Finding 6).** | `Prefs.limitations`, `plan/movement.ts` |
| **Equipment** | `equipment_floor ⊄ owned` excludes the family. | `ownedTags(a)` |
| **Days** | `daysPerWeek` outside `days_range` excludes the family. | `OnboardingAnswers.daysPerWeek` |
| **Time** | A family whose `session_minutes_range[0]` exceeds `Prefs.sessionMinutes` is excluded. Do not offer a plan that only survives by being trimmed every single day. | `Prefs.sessionMinutes`, `engine/focus.ts:estimateMinutes` |
| **Existing routine** | If a parsed routine exists and `analyzeRoutine` returns 2 or fewer `warn` notes, F9 is force-included and cannot be filtered out by anything except a RED flag. | `plan/analyze.ts` |

### 5.2 Stage 2: scoring (eligible families only)

`score(family, user) = Σ wᵢ · sᵢ`, each `sᵢ ∈ [0, 1]`. Weights sum to 1.0. **All weights are HOUSE HEURISTIC**, chosen to make goal fit dominant, adherence realism second, and everything else a tiebreak.

| dimension | w | `s` definition |
|---|---|---|
| `goalFit` | 0.30 | 1.0 if `goal ∈ goal_fit[0]`; 0.7 if elsewhere in `goal_fit`; 0.4 if in `secondary_goals`; 0 otherwise |
| `daysFit` | 0.15 | 1.0 if `daysPerWeek` is in the middle of `days_range`, falling linearly to 0.5 at the edges |
| `timeFit` | 0.12 | 1.0 if the family's median session estimate is at or under `sessionMinutes`; falls linearly to 0 at 1.5x over |
| `experienceFit` | 0.12 | 1.0 if the user's J7 band is in `experience_band`; 0.5 if adjacent; 0 if two bands away |
| `adherenceRealism` | 0.12 | From J7 adherence shape. Penalise `days_range` minima above the user's observed completed-session rate. A 6-day family for a 0.55-adherence user scores near 0 |
| `equipmentHeadroom` | 0.08 | 1.0 if `owned` comfortably covers the distribution; lower as more slots fall back to terminal bodyweight entries |
| `constraintFit` | 0.06 | 1.0 if no limitation forces a pattern substitution; falls per forced substitution |
| `continuity` | 0.05 | 1.0 if this is the family the user is already on, or (for F9) the structure their own routine already has. Prevents thrash across regenerations |

Ties break deterministically by `FamilyId` lexical order. Never by seed.

### 5.3 Stage 3: candidate assembly

1. `recommended` = highest score.
2. Walk the remaining eligible families in descending score. Admit one as `alternate` only if it passes the **anti-cosmetic rule** against every already-admitted candidate.
3. Stop at **3 total**. Two is the normal answer; three only when the third clears the rule against both others.
4. Order shown: recommended first, then alternates by descending score.

### 5.4 The anti-cosmetic rule

Two candidates may both be offered only if they differ on **at least one structural axis**, where "differ" is machine-checkable:

| axis | differs when |
|---|---|
| **Emphasis** | `weekly_movement_distribution` cosine distance ≥ **0.15**, or `goal_fit[0]` differs |
| **Weekly architecture** | `split_logic.kind` differs, or the role multiset produced for this user's day count differs by ≥ 2 entries, or `days_range` recommendations differ by ≥ 1 day |
| **Progression style** | `progression_model.kind` differs |
| **Preservation** | exactly one of the two is `preserve-and-repair` |

A pair that differs only in `intensity_model.anchorWave` values is **cosmetic and must be rejected.** This is the rule that would today reject `muscle` vs `strength` at equal day counts (Finding 2) and reject `vertical` vs `speed` outright (Finding 3), which is correct: those are not two strategies, they are one strategy with two rep tables.

### 5.5 When the honest answer is ONE option

Return a single candidate, with no alternatives screen, when any of these hold. **The UI must say why**, because an unexplained single option reads as the app not trying.

1. **A R6 YELLOW constraint leaves only one eligible family.** The honest sentence is that the safe options narrowed, not that we picked for you.
2. **`daysPerWeek` ≤ 2.** Only F1 and F10 survive the day filter, and F10 is a wrapper rather than a rival. There is one defensible full-body answer at two days.
3. **Equipment floor leaves one family.** Nothing owned, nothing rentable: F8, optionally wrapped in F10.
4. **F9 wins and the routine is healthy** (`analyzeRoutine` returns 0 `warn` notes and the user reports progress). Offering to replace a working routine is not a real alternative, it is a worse one. Show F9 alone and say so.
5. **The runner-up's score is more than 0.20 below the recommendation.** A second option that is clearly worse is not agency, it is a trap.
6. **No second family passes the anti-cosmetic rule.** Better one honest plan than two plans with the same skeleton and different rep numbers. This case is the whole reason the rule exists.
7. **F10 is active with an unmet readiness gate.** During an on-ramp there is one job. Alternatives return at graduation.

---

## 6. TRADEOFF EXPLANATION TEMPLATES

Two sentences per pairing: what this one gets you sooner, what it costs. Casual, short, no em dashes, no jargon, no numbers the user has to decode. `{A}` is the recommended one.

| pairing | recommended line | alternate line |
|---|---|---|
| F4 vs F5 | "This one moves your big lifts up fastest. It builds size slower, and the heavy days ask more of you." | "This one changes how you look sooner. Your top-end strength climbs slower." |
| F5 vs F4 | "This one adds size fastest because it gives every muscle more work each week. Your one-rep strength moves slower." | "This one gets you strong at a few lifts first. Size follows later." |
| F1 vs F2 | "Three days that hit everything. Easiest week to actually finish, and it stays useful for a long time." | "Four days, so each session is shorter and each muscle gets more total work. It needs four days you can count on." |
| F1 vs F3 | "Everything gets trained every session, so a missed day costs you less." | "More total work per muscle. Miss two days in a week though and a whole part of your body sits out." |
| F2 vs F3 | "Four days spaced so you recover between them. Plenty of room to grow and it survives a messy week." | "Six days and the most work per muscle group of anything here. It needs a schedule that does not move." |
| F6 vs F4 | "Jumping and sprinting get trained directly, so how you move changes first." | "This one builds raw strength first. Your bounce follows, just later." |
| F6 vs F5 | "This changes how you move. You will feel it before you see it." | "This changes how you look. It will not do much for your jump." |
| F7 vs F5 | "Your running comes first here, and the lifting is there to keep you healthy through the miles." | "This puts lifting first. Expect your runs to feel heavier while you build." |
| F7 vs F1 | "Built around your race. The long run is protected and the lifting stays light on purpose." | "Even lifting across the week, no race build. Simpler, but your race will sneak up on you." |
| F8 vs F2 | "Works in any room with nothing in it. You will never miss a session because of where you are." | "Needs weights, and gives you finer steps up. Progress arrives in smaller pieces." |
| F8 vs F5 | "No gear needed and the sessions are quick." | "Needs a gym. Adds size faster because you can load it properly." |
| F9 vs F5 | "Keep the routine you are already doing. We fix the couple of gaps and leave the rest alone." | "A rebuild around size. Bigger change, and you would be starting a new habit from scratch." |
| F9 vs F1 | "You are already showing up, so we are not touching that. Two small fixes and it is done." | "A fresh, simpler week. Cleaner on paper, but you would be giving up something that is working." |
| F10 vs F1 | "Starts lighter than you can handle on purpose, and opens up as you tick off the checks." | "Starts at full sessions right away. Faster, with more chance of a setback that costs you weeks." |
| F10 vs F7 | "Walking and easy work first, running once you have passed the checks." | "Starts running now. Quicker to the road, and the risk of pulling up sore is real." |
| F3 vs F5 | "Six days, each one short and focused on one thing." | "Four or five days that mix it up more. Less to schedule, nearly the same result." |
| F2 vs F4 | "Four days, half of them heavy and half of them for size. You get both." | "Everything points at a few big lifts. Best if there is a number you want." |

**Copy rules for whoever wires these.** Never say "optimal", "periodization", "hypertrophy", "volume", "MRV", "RPE", "concurrent", "interference". Never promise a timeline. Never imply the alternate is wrong; it is a different bet. Both lines get shown together, always, so the user sees the cost at the same moment as the benefit.

---

## 7. GENERIC-CONVERGENCE METRIC

The question this answers: **do materially different people get materially different plans?** Today the answer is often no (section 1.3), and nothing in the repo measures it.

### 7.1 Comparison axes

Computed from two `PlanConfig` values. All are already derivable from what `generatePlan` returns; nothing new needs to be stored.

| # | axis | extraction |
|---|---|---|
| 1 | family | `plan.familyId` (new field), else `FAMILY[plan.goal]` |
| 2 | split | multiset of template ids over `tier1ByWeekday`, plus the weekday vector |
| 3 | weekly movement distribution | sets per `MovementPattern` per week, resolving `slot` entries through `slots[1]` and mapping ids through `EXERCISE_MUSCLES` / `getExercise().kind`, the same way `plan/analyze.ts:tally` already does |
| 4 | volume | total weekly hard sets across tier-1 session days |
| 5 | intensity | mean `repsNum` across the four anchor slots in block 1, from `slotRepsByBlock` |
| 6 | progression | `progression_model.kind` (new), else the `slotRepsByBlock` wave signature |
| 7 | session length | median `estimateMinutes` over tier-1 session days, reusing `engine/focus.ts` |
| 8 | exercise overlap | Jaccard over the union of all fixed `exerciseId`s and all `slots[1]` values |

### 7.2 Distance function

```
d1 family        = 0 if same else 1
d2 split         = 1 - Jaccard(roleMultiset_a, roleMultiset_b)
                   + 0.25 * (weekdayMismatches / max(days_a, days_b)),   clamped to [0,1]
d3 distribution  = cosineDistance(patternVector_a, patternVector_b)       // L2-normalised first
d4 volume        = |v_a - v_b| / max(v_a, v_b)
d5 intensity     = |r_a - r_b| / max(r_a, r_b)
d6 progression   = 0 if same kind else 1
d7 minutes       = min(1, |m_a - m_b| / 30)
d8 exercises     = 1 - Jaccard(exerciseIds_a, exerciseIds_b)

D(a,b) = 0.20*d1 + 0.15*d2 + 0.20*d3 + 0.10*d4 + 0.10*d5 + 0.10*d6 + 0.05*d7 + 0.10*d8
```

`D ∈ [0, 1]`. Weights are **HOUSE HEURISTIC**, set so that distribution and family together carry 40 percent, because those are what actually determine whether two plans train the same things.

### 7.3 Thresholds

| check | rule | why |
|---|---|---|
| **Determinism** | same inputs -> `D = 0` exactly | already guaranteed; pin it as a regression |
| **Convergence floor** | two personas differing on goal family, equipment profile, or day count must score `D ≥ 0.35` | below this they are the same plan wearing different copy |
| **Paired-profile band** | two personas differing on exactly **one** input must score `0.10 ≤ D ≤ 0.60` | below 0.10 the input did nothing; above 0.60 one input rewrote the whole program, which is over-reaction |
| **Candidate separation** | two candidates offered to the same user must score `D ≥ 0.25` **and** pass the section 5.4 anti-cosmetic rule | `D` alone can be gamed by exercise churn, so both gates are required |
| **Population spread** | over all pairs of the 20 personas: `mean D ≥ 0.45`, `min D ≥ 0.30`, and **zero** pairs below the convergence floor | the headline number |

### 7.4 How to run it over the existing harnesses

Add `scripts/convergence.mjs`, wired as `npm run convergence`, sitting beside the existing `sim` / `sim:sessions` / `poison` scripts.

- **20 personas** (`scripts/simPersonas.mjs`): call `generatePlan(p.answers)` for each, compute all `C(20,2) = 190` pairwise distances. Report `mean`, `median`, `min`, the 10 closest pairs by name, and the count below floor. The 10-closest table is the actionable output; it is where `bad-back` / `new-knee` and `night-shift-mum` / `postpartum` will show up first.
- **12 fixtures** (`scripts/personas.mjs`): same over `C(12,2) = 66` pairs. This set is the plan-shape set rather than the behaviour set, so run it as the fast gate.
- **Paired profiles**: generate one-variable mutations of a base persona (goal, days 3/4/5/6, equipment gym/home/none, experience, focus areas, one limitation) and assert each lands in the paired-profile band. This is the test that catches an input silently doing nothing, which is how `experience: 'returning'` got to be a no-op.
- **Candidate separation**: for each of the 20 personas, run the section 5 selector, and assert every offered pair clears both gates. Personas where the honest answer is one option assert exactly that instead, and assert which of the seven reasons fired.

**Expected baseline before J11 lands** (prediction, worth recording so the improvement is measurable): `bad-back` / `new-knee` will score **D = 0**. `night-shift-mum` / `postpartum` will score near 0 on axes 1-7 and non-zero only on axis 8 through blocks 2-3, which block-1 extraction does not even see, so also **D = 0**. `powerlifter` / `lineman` will score **D = 0**. Any vertical/speed pair at equal days and gear will score **D = 0**. That is at least four zero-distance pairs among 190, and the floor requires zero.

**Prove the guard bites** (standing constraint): before trusting it, feed it two plans known to be identical and watch the assertion fail. Then feed it a full-body 3-day and a 6-day PPL and watch `D` clear 0.6.

---

## 8. EVAL FIXTURES

18 cases. `viable` = passes all hard filters and clears the anti-cosmetic rule against the recommendation. `excluded` = must never be offered, with the filter that fires. Cases marked **P** map to an existing persona in `scripts/simPersonas.mjs` or `scripts/personas.mjs`.

| # | user state | viable families | recommended | hard exclusions (and why) |
|---|---|---|---|---|
| 1 **P** `dunk-novice` | 19, never trained, dunk goal, 4 d, full gym, `jump-history: Never` | F6 (wrapped F10), F4, F1 | **F6 + F10 wrapper** | F7 (goal mismatch), F9 (no routine) |
| 2 **P** `fatloss-desk` | 38, 60 lb to lose, 3 d, home dumbbells, desk job, adherence 0.70 | F1, F5, F8 | **F1** | F3 (days 3 below its useful range at this adherence), F7 (no race), F4 (goal fit 0.4 and joint load at 250 lb) |
| 3 **P** `marathon-first` | 31, first marathon in 6 months, runs 12 mi/wk, 4 d, minimal kit | F7, F1 | **F7** | F3, F5 (running interference, CONCURRENT-2025), F4 |
| 4 **P** `powerlifter` | 27, wants 315 squat, 5 d, full gym, trained, adherence 0.96 | F4, F2, F5 | **F4** | F7, F8 (equipment headroom wasted), F10 (no gate) |
| 5 **P** `thirty-minutes` | 36, two kids, `sessionMinutes: 30`, 4 d, full gym, muscle goal | F1, F2, F8 | **F1** | F3 and F5 (**time filter**: min session estimate exceeds 30 min), F4 (warmup alone eats the budget) |
| 6 **P** `everydayer` | 29, 6 d, full gym, trained, "good at everything", adherence 0.90 | F3, F2, F6 | **F3** | F10 (no gate), F9 (no routine) |
| 7 **P** `road-warrior` | 33, travels 3 wk/month, hotel rooms, nothing owned, 4 d, adherence 0.52 | F8, F1 | **F8** | F2, F3, F4, F5 (**equipment floor**), F7 (no race) |
| 8 **P** `masters-pinned` | 48, masters lifter, front squat pinned, 4 d, full gym, trained | F4, F2 | **F4** | F3 (recovery at 48 plus 4-day cap), F8. **F4 must honour `Prefs.pinned` at plan time**, which today it does not |
| 9 **P** `postpartum` | 26, 8 months postpartum, broken sleep, 3 d, minimal, adherence 0.60 | F10 wrapping F1 | **F10 + F1, single option** | F3, F5, F6, F7 (**R6/on-ramp gate**, impact and load until the readiness battery passes). Reason 7 fires: one option during an active ramp |
| 10 | 34, pastes a working 4-day upper/lower, "been doing it 2 years, lifts still going up", no `warn` notes from `analyzeRoutine` | F9 only | **F9, single option** | everything else. Reason 4 fires: the routine is healthy, replacing it is the worse bet |
| 11 | 29, pastes a 5-day routine with **zero pulling**, wants muscle | F9 (2 repairs), F2, F5 | **F9** | F7, F6. F9 wins on `continuity` plus `goalFit`; the repair is add rowing volume, capped at 2 structural changes |
| 12 | 41, pastes a 6-day routine, 4 `warn` notes (no hinge, quad-only, no rest day, one 28-set day), adherence 0.55 | F2, F1, F5 | **F2** | **F9 excluded** by the HOUSE HEURISTIC 2-repair cap: four structural holes means the routine is not working |
| 13 | 24, "I want to get way stronger AND run a half marathon in 10 weeks", 5 d, full gym | F7, F4 | **F7**, with the contradictory-goal sentence shown | F5, F3. Contradiction is surfaced, not silently resolved. The tradeoff line is F7 vs F4 |
| 14 | 31, "lose 30 lb and gain 20 lb of muscle", 4 d, home dumbbells | F1, F5 | **F1**, with the recomp note `analyze.ts` already writes | F3, F7. Both goals kept; the plan states the win condition is strength holding while the scale drifts |
| 15 **P** `bad-back` | 52, twenty years of lower back trouble, 3 d, home dumbbells, new | F1, F8, F10 wrapping F1 | **F10 + F1** | F4 (**joint filter**: hinge-heavy at high load), F3, F6. **Must produce a different plan from case 16.** Today it does not |
| 16 **P** `new-knee` | 44, 18 months post knee replacement, cleared, 3 d, home dumbbells, new | F1, F8 | **F1** with knee-sparing distribution | F6 (**joint filter**: jump and sprint patterns), F7 (impact), F4. **Must produce a different plan from case 15** |
| 17 | 58, lifted for decades, "still be lifting at 70", 3 d, full gym | F4, F2, F1 | **F4** at 3 days with reduced density | F3 (recovery), F6. `experience_band: advanced` but `days_range` and `adherenceRealism` cap the frequency |
| 18 **P** `hates-squats` | 25, `blocked: ['goblet-squat']`, muscle goal, 4 d, full gym, trained | F5, F2, F3 | **F5** | F9 (no routine). Squat pattern must still be covered by a legal substitute; the family is not excluded, the exercise is |

**What these fixtures pin, beyond the mapping itself:** cases 15 and 16 are a paired-profile test that currently fails (identical plans, Finding 6). Cases 10, 11 and 12 pin the F9 boundary in both directions. Cases 13 and 14 pin that contradictory goals are surfaced rather than silently collapsed. Case 5 pins the time filter, which needs `Prefs.sessionMinutes` at plan time. Case 9 pins the single-option path.

---

## 9. INTEGRATION NOTES

### 9.1 Families become data, the generator does not get rewritten

New file `src/plan/families.ts`, in the `plan/` layer, importing only from `../types` and sibling `plan/` modules. Layering holds: `plan -> engine/store -> cloud/logic/platform -> components/screens`, and `families.ts` sits at the bottom with everything else in `plan/`.

The insertion is one function and one parameter:

```ts
// generator.ts today
const family = FAMILY[a.goal]
const layout = LAYOUTS[family][a.daysPerWeek]

// generator.ts after R5, minimal diff
const fam = FAMILIES[a.familyId ?? defaultFamilyFor(a.goal)]
const layout = fam.split_logic.rolesForDays(a.daysPerWeek) ?? LAYOUTS[fam.split_logic.baseGoalFamily][a.daysPerWeek]
```

`OnboardingAnswers` gains `familyId?: FamilyId`. `PlanConfig` gains `familyId?: FamilyId`. Both optional, so **every existing call site keeps working and the golden lock stays green** as long as `defaultFamilyFor` reproduces today's `FAMILY` mapping exactly. That is the first test to write: for all 7 goals x 4 day counts x 3 equipment profiles, `generatePlan` with no `familyId` returns a byte-identical `PlanConfig` to the pre-change generator. Only after that passes does anything get to change.

`RECIPES` and `POOLS` stay where they are. A family contributes overrides, not replacements: `rolesForDays`, an optional pool-ordering function replacing the `GOAL_FIRST` lookup, and an optional `anchorWave` replacing the `REP_WAVES` lookup. F7 and F8 are the two that need genuinely new machinery (`run` sessions, `difficulty-step` progression); the other eight are expressible as overrides today.

**Size discipline.** `generator.ts` is at its 941-line allowance and allowances are shrink-only. Families must land in `families.ts`, and moving `LAYOUTS` / `REP_WAVES` / `GOAL_FIRST` out of `generator.ts` into `families.ts` is the way to pay for the new code. That is a net reduction in `generator.ts`, which is the direction the constraint requires. Also export `Role` and `GoalFamily` from `generator.ts`, and note that `structure.test.ts` carries a dead-export allowlist, so new exports need to be consumed or listed.

### 9.2 What J11 builds on top

J11 needs, in order: (1) `families.ts` with the ten records; (2) `selectCandidates(user, prefs): Candidate[]` implementing section 5, pure and deterministic; (3) `generatePlan` accepting `familyId`, so each candidate is a **real, fully personalized plan**, not a preview; (4) the tradeoff sentence pairs from section 6, stored as data next to the families; (5) `scripts/convergence.mjs` as the gate. J11 renders into J5's existing diff UI, so the comparison surface is already built.

### 9.3 What must wait for J7

- `experienceFit` and `adherenceRealism` (0.24 of the score) need the user model's per-domain state and adherence shape. **Until J7 lands, both fall back to `OnboardingAnswers.experience`, which is a 4-value field with only one behavioural effect. That is a stub, and it should be labelled one in code so nobody mistakes it for the real thing.**
- `on_ramp_notes.readinessTests` need somewhere to record a criterion result over time. That is J7's fact store with source, confidence and recency.
- Per-lift progression rate, which is what should eventually drive `progression_model` selection rather than a static band.
- `B1`'s decision log is where a declined candidate and the reason belong. Without it, J11 cannot learn which alternates get chosen, which is most of the point of offering them.

**What does not wait:** the hard filters, the family records, the anti-cosmetic rule, the convergence metric and the eval fixtures are all expressible against today's inputs.

### 9.4 What breaks if this ships carelessly

1. **The golden lock and `goldenLife.test.ts`.** Any change to `defaultFamilyFor`, pool ordering or rep waves rewrites plans that are snapshot-pinned. The lock is a tripwire, not a prohibition, but it must be updated deliberately and with a stated reason, never silently.
2. **`trackedLifts` and the progress charts.** Chart continuity is guaranteed by the anchor-slot invariant that a lift is only chartable if it is in every block. A family that rotates anchors, or that switches a user between families mid-year, breaks exactly the bug J2's predecessor fixed: a strength line for a movement the app stopped programming. **Rule: a family switch resets the chart series with an explicit marker, it never continues the old line.**
3. **Load provenance.** F10's `startingDosePct` produces reduced weights. Those must be marked `light` so they never become the next baseline. This is the exact shape of the load-spiral bug family the repo already killed once.
4. **`Prefs` reaching the generator.** Sections 5.1 and 8 both require it, and it is a genuine layering change: `generatePlan` currently takes `OnboardingAnswers` only. Passing `Prefs` in is correct and is what fixes Finding 6, but it widens the generator's input surface and needs `analyze.ts`, `goldenLife.test.ts` and every call site updated together.
5. **Offering a plan the user cannot finish.** The time filter must run at plan time. If a family is only viable because `trimToFit` quietly cuts it every day, the booklet the user approved is not the workout they do, and that is the trust failure this whole roadmap is aimed at.
6. **Cosmetic candidates.** Shipping two options that differ only in rep numbers is worse than shipping one, because it teaches the user that the choice does not matter. The anti-cosmetic rule is the load-bearing part of section 5, not a nicety.
7. **The endurance promise.** F7's strategy copy already claims an 80/20 split and a long run building toward 20 miles. Shipping the family without the running structure would make BodyT say something false in the user's own booklet. Either F7 ships with real run programming, or the `endurance` strategy copy gets corrected first.

### 9.5 Open questions for the owner or a later job

- **Do we widen `daysPerWeek` to 2?** F1 and F10 both want it, ACSM-2026 and BBM-BEGIN both support it, and it is a `types.ts` union change plus four new `LAYOUTS` rows. Cheap, and it unblocks the most under-served population in the fixture set.
- **Does a family switch preserve history or start a new phase?** Affects charts, PRs, achievements and the phase engine. Recommend: new phase, history preserved, explicit marker.
- **Do F9's repairs count as a plan the user approves once, or a standing advisory?** J6 already owns an advisory volume cap for user-authored routines; F9 should reuse it rather than invent a second path.
- **Collapse `home-db` and `minimal`?** They are identical today (Finding 5). Either give `home-db` real default tags or drop the distinction from onboarding.

---

## 10. SUMMARY FOR THE NEXT SESSION

BodyT emits **16 weekly architectures**, roughly 12 once duplicates collapse, and its per-user seed **does not touch the first four weeks at all**. `muscle` and `strength` share every recipe; `vertical` and `speed` are byte-identical; `lean`, `general` and `endurance` share a layout and `endurance` receives no running; `home-db` and `minimal` are the same profile; limitations never reach the generator, so a knee replacement and a bad back get the same booklet.

This pack supplies: ten archetype families grounded in 19 cited sources, a typed `ProgramFamily` record that extends `PlanConfig` rather than duplicating it, deterministic selection logic with an anti-cosmetic rule and seven honest single-option cases, 17 user-facing tradeoff sentence pairs, an eight-axis distance function with thresholds and a concrete plan to run it over the existing 20 personas and 12 fixtures, and 18 eval fixtures including four that fail today.

**Status: RESEARCH SYNTHESIZED, not engine-integrated.** Next consumer is J11, which needs `families.ts` and `selectCandidates` first, and which should not start before J7 makes `experienceFit` and `adherenceRealism` real rather than stubbed.

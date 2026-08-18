# R-ONT: Exercise Ontology Expansion

Research pack for BodyT. v12 section 2 + 49.7. **No production code was written.**
All repo facts are line-level, read from `origin/claude/app-audit-refinement-sjw2va` at
commit `67ceb91` (the deploy branch; the repo root working tree carries only state docs).

Consumers of this pack: J6 (limitations lifecycle), B3 (knowledge store + retrieval),
IW (ingestion waves), and the R6 safety integration that J3 owns.

**Provenance note.** The v12 playbook is an owner-held docx and was not readable from this
session. Where this pack says "v12 field", it is working from the field list enumerated in
the R-ONT brief (`prescription_unit`, tempo options, stability/balance demand, space and
noise, spotter need, setup burden, unilateral handling, and the 49.7 capability set), not
from the document itself. Anything beyond that enumeration is marked HOUSE HEURISTIC.

---

## 0. THE ONE-PARAGRAPH ANSWER

BodyT's catalog cannot grow to thousands as it is currently shaped, and growing it would
not help the plan even if it could. Three hard blockers, all verified in code:

1. **The generator does not read the catalog.** `src/plan/generator.ts:153` `POOLS` is a
   hand-ordered whitelist of 4-6 exercise ids per slot, 10 slots, 51 ids total. Adding 800
   exercises changes nothing the generator picks. Only `substitutesFor` (adapt) and
   `swapCandidatesFor` (the swap button) range over the whole catalog.
2. **Every catalog entry owes a hand-authored animation.** `src/plan/visuals.test.ts:117`
   asserts `EXERCISE_DEMOS[id]` exists for every id, and `src/plan/demos.ts` is 194
   hand-tuned keyframe sequences (963 lines). That contract is O(n) human work.
3. **Six side tables must stay 1:1 by hand** (demos, muscles, equip, movement-or-athletic,
   plus optional videoMap/demoPhotos), enforced by `movement.test.ts:38-42` and
   `visuals.test.ts:117`.

So the ingestion plan is not "add rows". It is: make the pools derived rather than
authored, make the visual contract tiered rather than 1:1, add the capability fields the
engines actually need, and only then pour in a corpus. Wave 1 is entirely about the 194
that already exist.

---

## 1. WHAT EXISTS, PRECISELY

### 1.1 Counts (verified by parse, not by claim)

| thing | file | count |
|---|---|---|
| `ExerciseDef` entries, base catalog | `src/plan/exercises.ts` (1,836 lines, 93,201 bytes) | 77 |
| `ExerciseDef` entries, athletic library | `src/plan/athleticExercises.ts` (1,246 lines) | 71 |
| `ExerciseDef` entries, full-gym | `src/plan/gymExercises.ts` (432 lines) | 16 |
| `ExerciseDef` entries, home/bodyweight | `src/plan/homeExercises.ts` (547 lines) | 21 |
| `ExerciseDef` entries, coverage-gap drills | `src/plan/athleticCoverage.ts` (324 lines) | 9 |
| **`EXERCISES` total** | assembled at `exercises.ts:14` | **194** |
| `MOVEMENT` (strength graph) | `src/plan/movement.ts:164` (487 lines) | 111 |
| `ATHLETIC` (drill graph) | `src/plan/athletic.ts:104` + `athleticCoverage.ts` meta | 91 + 9 = 100 |
| in **both** graphs | - | 17 (`front-squat`, `romanian-deadlift`, `good-morning`, `single-leg-rdl`, `hip-thrust`, `slider-leg-curl`, `nordic-curl`, `reverse-lunge`, `split-squat`, `bulgarian-split-squat`, `step-up`, `lateral-lunge`, `single-leg-squat-box`, `single-leg-calf-raise`, `tibialis-raise`, `dynamic-warmup`, `hill-sprint`) |
| union of the two graphs | - | **194, exactly** (no orphans either way) |
| `EXERCISE_EQUIP` rows | `src/plan/equip.ts:10` | 194 (100% coverage; `equipFor` defaults to `['none']`) |
| `SUBSTITUTIONS` chains | `src/plan/equip.ts:242` | 65 sources |
| `EXERCISE_MUSCLES` rows | `src/plan/muscles.ts:14` | 194 (100%) |
| `EXERCISE_DEMOS` keyframe specs | `src/plan/demos.ts` | 194 (100%, **required**) |
| `VIDEO_MAP` | `src/plan/videoMap.ts` | 141 (73%) |
| `DEMO_PHOTOS` | `src/plan/demoPhotos.ts` | 55 (28%) |
| inline `videoId` | catalog files | 11 |
| `cue` strings | catalog files | 129 (66%) |
| `perSide: true` | catalog files | **13** |

### 1.2 The record shape, field by field

`ExerciseDef` - `src/types.ts:29-47`:

| field | type | required | who reads it for LOGIC |
|---|---|---|---|
| `id` | `string` | yes | everything; the join key for all six side tables |
| `name` | `string` | yes | display; `BookletEditor.tsx:373` substring search; `generator.ts:873` label |
| `kind` | `ExerciseKind` (8 values, `types.ts:14`) | yes | `sequence.ts:56` band ordering, `subs.ts:60,81` swap legality, `generator.ts:767,852` |
| `equipment` | `string` (display prose) | yes | **display only.** The logic vocabulary is `EquipTag` in `equip.ts` |
| `steps` | `string[]` | yes | display; `data.test.ts:14` requires >= 2 |
| `targets.muscles` | `string[]` (free text) | yes | **display only.** The logic muscle map is `EXERCISE_MUSCLES` |
| `targets.qualities` | `string[]` (free text, ~290 distinct strings per `movement.ts:9`) | yes | **display only**, plus `BookletEditor.tsx:374` search text |
| `why` | `string` | yes | display; `presets/naod.ts:39` builds a full-catalog rationale map |
| `mistakes` | `string[]` | yes | display |
| `cue` | `string?` | no | display; `visuals.test.ts:87` caps at 80 chars |
| `videoId` | `string?` | no | display, overridden by `VIDEO_MAP` |
| `videoQuery` | `string` | yes | display fallback; `data.test.ts:20` requires > 5 chars |
| `restSec` | `number` | yes | rest timer, `focus.ts:estimateMinutes` |
| `perSide` | `boolean?` | no | `transforms.ts:45` -> `ResolvedExercise.perSide`; golden snapshot `golden.test.ts:46` |

`MovementMeta` - `src/plan/movement.ts:116-147`:

| field | who reads it OUTSIDE movement.ts | verdict |
|---|---|---|
| `pattern` | nothing directly; only `substitutesFor`'s internal filter | **structurally live** (it is the substitution rule) |
| `role` | `sequence.ts:60` (`isAccessory`), `sequence.ts:95` (`roleRank`), `transforms.ts:148` (`ROLE_RAMP_RANK`) | **live, 3 call sites** |
| `laterality` | nothing; `substitutesFor` scoring only (+2 points) | weak |
| `skill` | `phase.ts:115-118` (`nextUp` blocks 2-level jumps); `substitutesFor` ceiling | **live** |
| `fatigue` | `sessionFatigue()` -> `adapt.ts:521`; `substitutesFor` cap | **live** |
| `level` | nothing; `substitutesFor` scoring only (distance penalty) | weak |
| `loadable` | **nothing at all.** Only `movement.test.ts:254` asserts on it | **DEAD WEIGHT** |
| `stretchLoaded` | **nothing at all** outside `substitutesFor`'s +1 tie-break | **near-dead** |
| `stress` | `adapt.ts:183` (pain -> joint), `adapt.ts:291-336` (routing) | **live, the highest-value field in the file** |
| `regressions` | nothing outside tests | **DEAD** for logic |
| `progressions` | `phase.ts:114` (`nextUp`) | **live** |
| `transfer` | nothing outside `transfersTo()`, which itself has zero consumers | **DEAD WEIGHT** |

### 1.3 Dead weight, named

Nine exported functions in `movement.ts` have **zero non-test consumers**, verified by
grep across `src/` and `scripts/`:

`movementFor`, `oppositePattern`, `movementChain`, `regressionFor`, `progressionFor`,
`patternLoad`, `patternImbalances`, `stressing`, `transfersTo`, plus the consts
`PATTERN_LABELS`, `IMBALANCE_RATIO`, `IMBALANCE_MIN_SETS`.

Only `MOVEMENT`, `substitutesFor` and `sessionFatigue` are actually called.

**Why nobody noticed:** the dead-export guard added in J2 (`structure.test.ts:322`) filters
`targets` to `f.path.startsWith('engine/') || f.path.startsWith('logic/')`. `plan/` is not
scanned. The 48-entry `DEAD_EXPORT_ALLOWED` set contains no `plan/` entry for that reason,
not because `plan/` is clean.

This is precisely the owner rule from BODYT_STATE.md §1: *knowledge that is collected but
not consumed gets wired in or redone*. `loadable` is the sharpest case - its own doc
comment (`movement.ts:132-137`) says it is "what tells the rep engine that reaching the top
of the range is the END of the ladder", but the rep engine never reads it. J2 instead
derives unloaded-ness from the **log**: `sessionFatigue.ts:83`
`const unloaded = log.sets.every((s) => s.weightLb === undefined || s.weightLb <= 0)`.
Two sources of truth for the same fact, and the catalog's is the one nobody consults.

### 1.4 What actually ranges over the whole catalog

Only five sites, and this is the single most important fact for scaling:

| site | scan | breaks at 1,000+? |
|---|---|---|
| `movement.ts:364` `substitutesFor` | full `MOVEMENT` scan, per exercise, per adjustment | O(n) per call; see §6 |
| `subs.ts:59` `swapCandidatesFor` | full `EXERCISES` scan filtered by kind + muscle overlap | yes, returns garbage tail; capped at `MAX_CANDIDATES = 6` |
| `presets/naod.ts:39` | builds `{id: why}` for every exercise at preset construction | memory + bundle |
| `CoachScreen.tsx:304` `GuideReader` | groups the entire catalog into 4 buckets for a browse list | unusable UI at 1,000 |
| `BookletEditor.tsx:368` | add-exercise picker, substring search over name+muscles+qualities | unusable UI at 1,000 |

Everything else is a hand-authored list: `POOLS` (generator.ts:153, 51 ids),
`SUBSTITUTIONS` (65 sources), `CARDIO_OPTIONS`, `FOCUS_ACCESSORIES`, `BLOCK_SLOTS`,
`CORE_MOVERS`, `TRACKED_LIFTS`, `TEMPLATES`.

**Consequence:** catalog growth with no other change delivers exactly two improvements -
better `substitutesFor` results and a longer swap list - and degrades two UIs. That
asymmetry is what the wave plan in §8 is built around.

---

## 2. OPEN CORPORA SURVEY

Licensing is stated as found, with the chain of provenance where it matters. **Nothing
here is legal advice; the flagged items need an owner decision, not an engineering one.**

### 2.1 yuhonas/free-exercise-db

| | |
|---|---|
| Records | **873** (parsed from `dist/exercises.json`, 1,001,472 bytes, fetched 2026-08-18). README says "800+" |
| License | **The Unlicense** (public domain dedication). `LICENSE.md` fetched verbatim: *"This is free and unencumbered software released into the public domain. Anyone is free to copy, modify, publish, use, compile, sell, or distribute this software... for any purpose, commercial or non-commercial."* |
| Commercial use | Permitted **on its face** |
| **License risk** | **FLAGGED - the chain is not clean.** The README credits `wrkout/exercises.json` as its source, which in turn traces to the everkinetic data dump. `github.com/everkinetic/data` has **no LICENSE file at either `main` or `master`** (both return 404). Secondary sources (including wger's own documentation lineage) describe everkinetic content as **CC BY-SA 3.0**, which carries attribution and share-alike obligations that a downstream Unlicense re-declaration cannot extinguish. |
| Practical split | The **prose** (`instructions`) and the **images** carry the risk. The **structured facts** (which muscle, which equipment, push/pull, compound/isolation) are facts, and facts are weakly protected. |
| Recommendation | Ingest the **structured fields only**; do not ship the `instructions` prose or the `images` without an owner decision. BodyT already writes its own `steps`/`why`/`mistakes` and its own figures, so this costs nothing it wants. |

Data model and field overlap:

| free-exercise-db | coverage | BodyT equivalent | normalization needed |
|---|---|---|---|
| `id` (`Alternate_Incline_Dumbbell_Curl`) | 873/873 | `ExerciseDef.id` | Title_Snake -> kebab-case; collision check |
| `name` | 873/873 | `ExerciseDef.name` | none |
| `force` (`pull`/`push`/`static`) | 873/873 | partial `MovementPattern` | 3 values vs BodyT's 15 patterns; **cannot derive pattern from force** |
| `level` (`beginner`/`intermediate`/`expert`) | 873/873 | `MovementMeta.level` | `expert` -> `advanced`; conflates skill with level, which `movement.ts:40-43` deliberately separates |
| `mechanic` (`compound`/`isolation`) | 873/873 | weak proxy for `ProgrammingRole` | 2 values vs 7 roles; **role must be authored** |
| `equipment` (12 values, single-valued) | 873/873 | `EquipTag[]` (28 values, multi) | single -> array; `body only`->`none`, `bands`->`band`, `e-z curl bar`->`barbell`, `exercise ball`/`foam roll`->no tag exists |
| `primaryMuscles` / `secondaryMuscles` (17 values) | 873/873 | `MuscleActivation` (`MuscleRegion`) | 17 -> BodyT's region set; `middle back`->`mid-back`, `shoulders` must split into `delts-front`/`side`/`rear` (**lossy, needs authoring**), `quadriceps`->`quads`, `abdominals`->`abs`, `neck`/`abductors`/`adductors` need decisions |
| `instructions` (string[]) | 873/873 | `ExerciseDef.steps` | **do not ingest** (license) |
| `category` (7 values) | 873/873 | `ExerciseKind` (8 values) | `strength`->`lift`, `plyometrics`->`jump`, `powerlifting`/`strongman`/`olympic weightlifting`->`lift`, `stretching`->`mobility` |
| `images` | 873/873 | `DEMO_PHOTOS` | **do not ingest** (license) |

**Missing entirely, must be authored:** `pattern`, `role`, `skill`, `fatigue`, `stress`,
`laterality`, `loadable`, `stretchLoaded`, `regressions`, `progressions`, `transfer`,
`restSec`, `perSide`, and every capability field in §4. That is 15+ fields per record.
free-exercise-db supplies roughly **35% of a BodyT record by field count and near 0% of
the fields the engines actually branch on**.

**Overlap with BodyT's 194, measured:** with aggressive normalization (lowercase, strip
parentheticals, expand `db`/`bb`/`kb`/`ohp`/`rdl`, token-sort), only **26 of 194** BodyT
names match a free-exercise-db name exactly. 846 of 873 free-exercise-db entries have no
BodyT counterpart under that matcher. Naive name matching is not a dedupe strategy - see §5.

### 2.2 wger

| | |
|---|---|
| Records | **869** (live `GET https://wger.de/api/v2/exerciseinfo/?limit=500` x2, fetched 2026-08-18, `count: 869`) |
| Access | Public REST API, no auth for reads, JSON, offset/limit paging. Works from this environment. |
| License, code | AGPL-3.0+ (the application) - **irrelevant to BodyT, which would ingest data, not code** |
| License, data | **Per-record**, carried in the payload. Measured distribution across all 869: **CC-BY-SA 4: 720 · CC-BY-SA 3: 128 · CC0: 21** |
| Commercial use | **Permitted, with obligations.** CC-BY-SA permits commercial use but requires (a) attribution to `license_author`, and (b) **ShareAlike on derivative datasets**. The 21 CC0 records are unconditionally free. |
| **License risk** | **Manageable but real.** ShareAlike is the sharp edge: if BodyT's catalog is deemed a derivative of CC-BY-SA content, that portion of the dataset must be released under the same terms. This is an owner decision, and the cheapest path is: **ingest only the CC0 subset (21), or ingest only structured facts and re-author all prose**, which keeps the derivative question about facts rather than expression. |
| Attribution machinery | The API already ships `license`, `license_author`, `license_author_url`, `license_object_url`, `license_derivative_source_url` per translation. Any ingestion must carry these into a `provenance` field (see §3). |

Data model highlights and what BodyT can actually use:

- `translations[]` with `language: 2` = English. **856/869** have one; **824** have an
  English description of real length. Descriptions are HTML.
- `aliases[]` per translation - **only 53 exercises carry any, 74 aliases total.** Thin.
  Examples: `Step Jack -> Side Step Jack | Low Impact Jumping Jack`,
  `Slow Squat -> Tempo Squat | 3-1-1 Squat`. Useful as seed, not as an alias table.
- `variation_group` - **222 exercises across 50 groups**, max group size 14. **The grouping
  is too coarse for BodyT.** The largest group literally contains
  `["Pistol squats right","Barbell Hack Squats","Braced Squat","Dumbbell Goblet Squat",
  "Hindu Squats","Front Squats","Low Box Squat - Wide Stance","Pistol Squat","Sumo Squats",
  "Squat Thrust","Squat Jumps","Squats","Wall Squat","Overhead Squat"]` - a bilateral
  barbell squat, a unilateral pistol, a plyometric squat jump, and a burpee-adjacent squat
  thrust in one bucket. Ingesting `variation_group` as a substitution edge would produce
  exactly the "confident nonsense swap" `movement.ts:31-34` was written to prevent.
- `equipment` (12 values) maps cleanly to `EquipTag` except `Gym mat` and `Swiss Ball`.
- `category` (8 values) is body-part, not `ExerciseKind`: Legs 206, Back 159, Arms 139,
  Abs 114, Shoulders 108, Chest 83, Cardio 48, Calves 12.
- **266/869 have any image.** Not a visual solution.
- **No `force`, no `mechanic`, no `level`.** wger is weaker than free-exercise-db on
  structured attributes and stronger on licensing hygiene and multilingual naming.

### 2.3 exercemus/exercises

Worth naming because it advertises exactly the three fields §3 and §5 want (`aliases`,
`tempo`, `variation_on`) and **does not actually have them**.

| | |
|---|---|
| Records | **872** (parsed from `minified-exercises.json`) |
| Code license | MIT |
| Data license | README: *"all exercises in this repository have a license associated with them that you must follow."* **Measured: 871 of 872 records have NO `license` field at all.** One record carries CC-BY-SA 3. |
| Declared-vs-actual field coverage | `aliases`: **4/872**. `tempo`: **1/872**. `variation_on`: **75/872**. `description`: 42/872. `video`: 24/872. `tips`: 3/872 |
| Verdict | **Do not ingest.** It is a re-merge of wger + wrkout with a schema that promises structure it does not carry, and its own licensing claim is contradicted by its data. Its **schema** is worth stealing (the `variation_on` idea in particular); its rows are not. |

### 2.4 OpenPowerlifting

| | |
|---|---|
| Records | **4,001,902 rows** in the complete bulk CSV (stated on `openpowerlifting.gitlab.io/opl-csv/bulk-csv.html`, updated 2026-08-14). IPF-affiliated subset: 1,498,630 |
| Code license | AGPL-3.0+ |
| **Data license** | **Public domain.** `LICENSE-DATA` verbatim: *"OpenPowerlifting is a public-benefit archive of historical sports data. OpenPowerlifting data is contributed to the public domain... To the extent possible under law, all CSV data is waived of all copyright and related or neighboring rights."* Attribution requested, **not required** |
| Commercial use | **Yes, unambiguously.** The cleanest license in this survey |
| **What it is NOT** | Not an exercise corpus. It is competition results: lifter, sex, age, bodyweight, equipment class, squat/bench/deadlift/total, wilks/dots. Three lifts only |
| **What it IS good for** | **Normative strength percentiles by sex, bodyweight and age for squat/bench/deadlift.** That is a genuine gap: `engine/startWeight.ts:21` currently seeds working weight from hand-set *"fraction of bodyweight... [new, returning, trained]"* pattern constants with no external anchor |
| Caveat, stated plainly | The population is **competitive powerlifters**, heavily selected. A raw percentile from this data is not a percentile of the general population, and presenting it as one would be dishonest. It is usable for **sanity ceilings** ("this entered 1RM is above the 99th percentile of every competition lift ever recorded at your bodyweight - is that right?") and for **relative-strength ratio checks** (bench:squat:deadlift), not for "you are stronger than 60% of people". |
| Fit to R-ONT | **Adjacent, not central.** Belongs to R3 (autoregulation) and J7 (user model) more than to the ontology. Recorded here because the brief asked and because the license is the one green light in the survey |

### 2.5 Reference-only sources (honest verdict: not ingestible)

| source | status |
|---|---|
| **ExRx.net** | **Not fetchable and not ingestible.** Both `exrx.net/Copyright` and `exrx.net/Testing/Disclaimer` returned a Cloudflare interstitial to WebFetch (403) and to a browser-UA curl (JS challenge). No open license exists for its exercise directory; it is a proprietary commercial reference with a paid membership tier. **Use as a human authoring reference for BodyT-authored records. Never scrape, never ingest, never cite as a data source in code.** |
| **ACE (American Council on Exercise)** | Exercise library is editorial content on acefitness.org, all rights reserved. Their *research* (e.g. EMG studies) is citable prose for the `why` field's evidence, under normal quotation practice. The library itself is reference-only. |
| **MuscleWiki** | Terms page returned 403 to WebFetch. Proprietary; its GIFs are its product. **Reference-only.** Third-party "MuscleWiki API" wrappers on GitHub are unauthorized scrapes and carry the site's risk, not their own. |
| **ExerciseDB (exercisedb.io)** | **Commercially licensable, not open.** 1,394 entries, each with a matching animated GIF. One-time purchase, perpetual license, commercial use and in-app display permitted; **redistribution of the raw dataset or GIFs prohibited**. This is the only surveyed source that solves BodyT's *visual* problem (see §8 wave 2 gate G2-c). It is a **procurement decision for the owner**, not an ingestion job. |

### 2.6 Survey verdict

| source | count | ingest structured facts? | ingest prose? | ingest images? |
|---|---|---|---|---|
| free-exercise-db | 873 | **yes**, with the everkinetic flag noted | **no** | **no** |
| wger | 869 (21 CC0) | **CC0 subset yes; CC-BY-SA subset only with owner sign-off on ShareAlike** | no (re-author) | no |
| exercemus | 872 | no (schema is aspirational, license is contradicted) | no | no |
| OpenPowerlifting | 4.0M rows | **yes** (public domain) but it is normative data, not exercises | n/a | n/a |
| ExRx / ACE / MuscleWiki | - | **no** | no | no |
| ExerciseDB | 1,394 | paid license only | paid | paid, in-app display only |

**Realistic ceiling from free open corpora: ~900 distinct movements** after dedupe against
BodyT's 194, and every one of them arrives missing all 15 engine-critical fields. "Toward
thousands" is achievable in *rows*; it is not achievable in *usable rows* without an
authoring pipeline. Say that to the owner plainly.

---

## 3. CANONICAL EXERCISE RECORD, EXTENDED

### 3.1 v12 field vs BodyT reality

| v12 field (per the R-ONT brief) | BodyT has it? | where | verdict |
|---|---|---|---|
| movement pattern | **yes** | `MovementMeta.pattern`, 15 values | keep as is |
| programming role | **yes** | `MovementMeta.role`, 7 values | keep |
| difficulty / level | **yes, split into two** | `skill` (0-3, execution) + `level` (foundation/intermediate/advanced, athlete readiness) | **BodyT's split is better than a single field. Keep it and do not let an ingest collapse it** |
| systemic cost | **yes** | `MovementMeta.fatigue` 0-3; `AthleticMeta.cns` 0-3 for drills | two scales for one concept; unify (see 3.3) |
| joint stress | **yes** | `MovementMeta.stress: Joint[]`, 7 joints | keep; it is the highest-value field in the graph |
| laterality / unilateral handling | **partly** | `MovementMeta.laterality` (3 values) and `ExerciseDef.perSide` (boolean) exist but **disagree** - see §7 | **must be reconciled, not added** |
| equipment | **yes** | `EquipTag[]` in `equip.ts`, 28 tags | keep; prose `ExerciseDef.equipment` is display-only |
| muscles | **yes** | `EXERCISE_MUSCLES` -> `MuscleRegion` | keep |
| progression graph | **yes** | `regressions`/`progressions` on both graphs | keep; only `progressions` is read (`phase.ts:114`) |
| `prescription_unit` | **NO** | inferred by regex from a display string: `focus.ts:98` `/(\d+)\s*(sec\|min)/.exec(e.repText)` | **ADD. Highest-priority missing field.** See §7 |
| tempo | **NO** | nothing. `blocks.ts` has no tempo, `PrescriptionBase` has no tempo | **ADD as optional**, prescription-side not catalog-side (see 3.4) |
| stability / balance demand | **NO** | nothing. `AthleticQuality` has `balance-stability` as a *transfer target*, not a *demand* | **ADD.** It is a capability field; see §4 |
| space requirement | **partly** | `EquipTag` has `open-space`, `court`, `track`, `trail` - these are places, not dimensions | **ADD** as a 3-value enum |
| noise | **NO** | nothing | **ADD** as a 3-value enum |
| spotter need | **partly** | `EquipTag` has `partner` (used by `nordic-curl`, `mirror-drill`) | **ADD** a distinct field; a partner for a mirror drill is not a spotter for a bench |
| setup burden | **NO** | nothing. `restSec` is the only time-shaped field | **ADD**, but as a coarse 0-2, not minutes |
| grip demand | **NO** | `equipCoverage.test.ts:122` already reasons about it in a comment (`NO_HONEST_BODYWEIGHT_VERSION` = the two grip movements) but no field carries it | **ADD**; §4 |
| ROM requirements | **NO** | nothing | **ADD**, three fields; §4 |
| impact | **partly** | `AthleticMeta.impact` 0-3 exists for the 100 drills; the 111 strength movements have none | **EXTEND** to the whole catalog |
| coordination demand | **partly** | `AthleticQuality` includes `coordination` as a transfer target | **ADD** as a demand; §4 |

### 3.2 v12 fields that are over-specified for this product

Say no to these, and say why:

- **Per-muscle activation percentages / EMG values.** BodyT's muscle model is
  `primary[]` / `secondary[]` regions. A percentage implies a precision the source data
  does not have, and no engine would branch on it. `volume.ts` counts sets per region.
- **Joint angles, ROM in degrees, force vectors.** Nothing measures these and nothing
  could act on them. The actionable version is the coarse ROM-gate enum in §4.
- **1RM percentage tables per exercise.** `engine/reps.ts` runs double progression on a
  rep range and `startWeight.ts` seeds from bodyweight fractions. A per-exercise %1RM table
  is a second progression model with no consumer.
- **Calorie burn per exercise.** `runs.ts:188 estKcalFromMet` already does MET-based math
  for cardio, and per-lift calorie numbers are noise dressed as data.
- **Free-text `qualities` expansion.** `movement.ts:9-12` already records that this drifted
  to ~290 distinct strings across 194 entries. Growing the catalog 5x grows that to ~1,400
  strings that nothing can reason over. **`targets.qualities` should be frozen at its
  current size and never populated by an ingest.**
- **Video/animation per new entry.** See §8 wave 1 gate G1-e; the 1:1 demo contract is the
  blocker and the answer is to tier it, not to author 800 more keyframe sequences.

### 3.3 Two scales for one concept

`MovementMeta.fatigue: 0|1|2|3` ("systemic cost of one hard set") and
`AthleticMeta.cns: 0|1|2|3` ("nervous-system cost") are the same axis under two names, and
17 exercises carry **both**. `sessionFatigue()` (`movement.ts:472`) reads only
`MOVEMENT[...].fatigue`, so a session of pure athletic drills scores **0 systemic fatigue**
today. At 194 that is a small bug. At 1,000 with an ingest that populates only one of them
it is a silent, systematic under-count in the one function `adapt.ts:521` uses to decide
whether a day is too much.

**Recommendation:** one field, `fatigue`, on the merged record. `AthleticMeta.cns` becomes
a deprecated alias that the merge resolves at build time, with a test that the 17
dual-listed ids agree.

### 3.4 Merged type sketch

Design constraints this respects: layering (`plan` -> `engine/store` -> …, never upward);
`ExerciseDef` and `MOVEMENT` are named canonical contracts in BODYT_STATE.md §1 and must be
**extended, never duplicated**; `structure.test.ts` allowances shrink only, so this lands in
new files rather than growing `movement.ts` (487) or `types.ts` (705/705, at its cap).

```ts
// src/plan/capability.ts  - NEW FILE, additive, no existing field changes.

/** How a set of this movement is counted and shown. Replaces regex-on-display-string. */
export type PrescriptionUnit =
  | 'reps'        // 8-12
  | 'time'        // planks, holds, carries by clock, isometrics
  | 'distance'    // carries by distance, sprints, sled
  | 'time-or-distance' // running, rowing, cycling: either is a valid prescription
  | 'rounds'      // circuits
  | 'amrap'       // 'max', 'max hold'
export type PerSideMode = 'none' | 'per-side' | 'alternating-total'

/** Coarse on purpose. Three buckets a user can self-assess without a tape measure. */
export type Demand = 0 | 1 | 2   // 0 = none/trivial, 1 = moderate, 2 = high
export type SpaceNeed = 'none' | 'mat' | 'room' | 'open'   // none = stand still; open = 10m+
export type NoiseLevel = 'silent' | 'quiet' | 'loud'       // loud = drops, jumps, plates
export type SpotterNeed = 'none' | 'helpful' | 'required'
export type SetupBurden = 0 | 1 | 2   // 0 = walk up and go, 2 = rack/load/adjust

/** v12 49.7 capability gates. Every one answers a question a real person asked. */
export interface CapabilityDemands {
  /** Must stand unsupported to perform it at all. */
  standingBalance: Demand
  /** Must control the body through a moving base (lunges, bounds, single-leg). */
  dynamicBalance: Demand
  /** Requires getting down to and up from the floor. */
  floorTransfer: boolean
  /** Requires bearing weight on the knees (quadruped, kneeling press). */
  kneeling: boolean
  /** Requires lying face-down. */
  prone: boolean
  /** Requires lying face-up. */
  supine: boolean
  /** Load is limited by what the hands can hold, not by the target muscle. */
  gripDemand: Demand
  /** Requires raising the arms above shoulder height under load or bodyweight. */
  overheadRom: boolean
  /** Deep-range gates. true = the movement REQUIRES that range, not merely touches it. */
  hipFlexionDeep: boolean
  kneeFlexionDeep: boolean
  ankleDorsiflexionDeep: boolean
  /** Ground reaction force class. Unifies AthleticMeta.impact across the whole catalog. */
  impact: 0 | 1 | 2 | 3
  /** How much sequencing the movement asks of a novice nervous system. */
  coordination: Demand
  spotter: SpotterNeed
  space: SpaceNeed
  noise: NoiseLevel
  setup: SetupBurden
}

/** The escape hatches. Every variant id must itself be a catalog id. */
export interface CapabilityVariants {
  seated?: string          // same pattern, seated
  supported?: string       // same pattern, one hand or the torso supported
  reducedRom?: string      // same pattern, shortened range (box squat for a squat)
  lowerImpact?: string     // same stimulus, less ground reaction force
}

export interface CapabilityMeta extends CapabilityDemands {
  variants?: CapabilityVariants
}

export const CAPABILITY: Record<string, CapabilityMeta> = { /* ... */ }
```

```ts
// src/plan/prescription.ts - NEW FILE. The unit model (see §7).
export interface PrescriptionShape {
  unit: PrescriptionUnit
  perSide: PerSideMode
  /** Tempo is a PRESCRIPTION property, not a catalog property: the same
   *  goblet squat is 3-0-1-0 in a hypertrophy block and explosive on a
   *  power day. It belongs on PrescriptionBase, optional, never required. */
}
export const PRESCRIPTION: Record<string, PrescriptionShape> = { /* ... */ }
```

```ts
// src/plan/provenance.ts - NEW FILE. B2's source_refs rule, made concrete.
export interface Provenance {
  /** 'bodyt' = authored here. Otherwise the corpus id. */
  source: 'bodyt' | 'free-exercise-db' | 'wger' | string
  sourceId?: string
  license?: string        // SPDX-ish short name, e.g. 'CC-BY-SA-4.0', 'Unlicense', 'CC0-1.0'
  licenseAuthor?: string  // required for CC-BY-SA attribution
  sourceUrl?: string
  /** 0-1. Authored-and-reviewed = 1. Ingested-and-unreviewed = 0.4 (HOUSE HEURISTIC). */
  confidence: number
  reviewedAt?: ISODate
}
export const PROVENANCE: Record<string, Provenance> = { /* ... */ }
```

**Why four sidecar tables and not one fat record.** It is the pattern the repo already
uses (`equip.ts`, `muscles.ts`, `demos.ts`, `videoMap.ts` are all `Record<string, X>`
keyed by exercise id), it keeps `structure.test.ts` file allowances satisfiable, it lets
B3 load capability data from IndexedDB later without touching `ExerciseDef`, and it means
an ingest can populate `CAPABILITY` for 800 rows without any of them being able to break
`golden.test.ts`, which only snapshots `resolveDay` output.

**Tempo, specifically.** Put it on `PrescriptionBase` (`types.ts:59`) as
`tempo?: string`, not on the catalog. Two reasons: the same movement takes different tempos
in different blocks, and the standing constraint *"users never pick reps"* extends by
analogy - a tempo shown as an option is a menu. If tempo ships, it ships as one prescribed
string in the session view, and `golden.test.ts:46` must be extended to snapshot it or the
lock goes blind to tempo changes.

---

## 4. CAPABILITY REQUIREMENTS (v12 49.7)

### 4.1 The gap this closes, stated precisely

`prefsTypes.ts:50-54`:

```ts
export interface Limitation {
  label: string      // the athlete's own words, display only
  joints: Joint[]    // THE ONLY CHANNEL INTO THE ENGINE
  since: ISODate
}
```

`limitedJoints()` (`prefsTypes.ts:79`) flattens that to a `Joint[]`, `adapt.ts:563` passes
it as `ctx.limited`, and `adapt.ts:286` unions it with pain joints into `avoid`, which
`substitutesFor` uses to reject any movement whose `stress` intersects it.

**Seven joints is the entire vocabulary of human limitation available to the planner.**

R6 (`research/R6-safety.md` §5) already defines these `Prefs.limitations` keys:
`cannot-kneel`, `cannot-get-to-floor`, `cannot-raise-arm-overhead`, `uses-cane-or-support`,
`dizziness-on-standing (FC-ORTHO)`, `pregnancy-T1/T2/T3`, `postpartum-early`.

**None of them map to a joint.** R6 states the constraint in prose - *"All kneeling and
quadruped positions"*, *"All floor-based supine/prone work"* - and there is no field in the
catalog that says which of the 194 exercises those are. R6 is synthesized and unconsumable
until §4's fields exist. That is the dependency: **`CAPABILITY` is what makes R6 shippable.**

### 4.2 How capability plugs in WITHOUT duplicating stress-joint machinery

The distinction is sharp and worth stating in the code comment:

> `stress` is about a joint that **hurts**. `CapabilityDemands` is about a function the
> body **does not have**. A knee that hurts wants less knee load. A person who cannot get
> to the floor has no pain at all and needs a different shape of movement entirely.

They are different predicates over different user state, so they must not share a field.
But they share the **same filter pipeline**, and that is the whole integration:

```
Prefs.limitations ──┬─> limitedJoints() ─────> Joint[]           ──┐
                    └─> limitedCapabilities() ─> CapabilityBlock[] ─┤
                                                                    ├─> AdaptContext
FatigueNote(pain) ────> painByJoint (adapt.ts:183) ──> Joint[]     ─┘
                                                                    │
                                                                    v
                                       SubstituteQuery { can, avoid, cannot, maxSkill, maxFatigue }
                                                                    │
                                                                    v
                                        substitutesFor  (movement.ts:358)
```

The change to `SubstituteQuery` (`movement.ts:323`) is **one optional field**:

```ts
export interface SubstituteQuery {
  can: (id: string) => boolean
  avoid?: Joint[]                 // unchanged: joints that hurt
  cannot?: CapabilityBlock[]      // NEW: functions the body does not have
  maxSkill?: 0 | 1 | 2 | 3
  maxFatigue?: 0 | 1 | 2 | 3
}
```

and **one added filter line** in the scoring loop, structurally identical to the existing
`if (m.stress.some((j) => avoid.has(j))) continue`:

```ts
if (blocksAny(CAPABILITY[otherId], cannot)) continue
```

Everything downstream is unchanged. `adapt.ts:298/314/332` keeps calling `substitutesFor`
exactly as it does; the `unroutable` map at `adapt.ts:341` and the "no substitute exists,
reduce load instead" branch documented at `adapt.ts:349-360` already handle the empty
result correctly, and that branch becomes *more* important, not less (see eval case 15).

### 4.3 The four variant fields, and why they are edges not filters

`CapabilityVariants` (`seated` / `supported` / `reducedRom` / `lowerImpact`) are **directed
edges to a specific alternative**, which is different from a filter. The filter answers
"is this legal for you"; the variant answers "and here is the one thing that is".

Resolution order when a capability blocks an exercise:

1. Try the **named variant** for the specific block
   (`floorTransfer` blocked -> `variants.seated` or `variants.supported`;
   `kneeFlexionDeep` blocked -> `variants.reducedRom`;
   `impact` too high -> `variants.lowerImpact`).
   A named variant is a human judgement and beats any search.
2. Fall through to `substitutesFor` with `cannot` populated.
3. Fall through to `adapt.ts`'s existing unroutable branch: keep the movement, cut load,
   name the reason, put a clock on it.

This mirrors the existing two-tier design exactly: `SUBSTITUTIONS` (curated, 65 chains) is
tried before the graph search in `subs.ts:53` and in `resolveForEquipment` (`equip.ts:314`).
Variants are `SUBSTITUTIONS` for the capability axis.

### 4.4 How R6's safety tiers consume this

R6's tiers act at three different points, and only one of them touches the catalog:

| R6 tier | What it does | Reads capability? |
|---|---|---|
| **RED** | Stops programming entirely. No plan, no substitute session (`R6 §2`: *"RED never generates a substitute workout"*) | **No.** RED is a gate above the catalog. If RED consulted capability data it could be talked out of stopping, which is the exact failure R6 is written against |
| **YELLOW** | Applies R6 §5 constraints + 1-2 targeted questions + a ramp cap | **Yes, this is the consumer.** Each R6 §5 row becomes a `CapabilityBlock[]` |
| **GREEN** | Normal adaptation | Only through ordinary `Prefs.limitations` a user stated for themselves |

The mapping table J3 would author (R6 §5 row -> capability block):

| R6 §5 limitation key | `CapabilityBlock` emitted | additional caps |
|---|---|---|
| `cannot-kneel` | `kneeling` | - |
| `cannot-get-to-floor` | `floorTransfer`, `prone`, `supine` | - |
| `cannot-raise-arm-overhead` | `overheadRom` | - |
| `uses-cane-or-support` | `standingBalance>=1`, `dynamicBalance>=1` | `impact = 0` |
| `dizziness-on-standing` | `floorTransfer` (fast transitions) | `impact <= 1` |
| `knee` (joint) | `kneeFlexionDeep` | `impact <= 1` - **plus** the existing `avoid: ['knee']` joint route |
| `hip` (joint) | `hipFlexionDeep` | `impact <= 1` + `avoid: ['hip']` |
| `ankle` (joint) | `ankleDorsiflexionDeep` | `impact = 0` + `avoid: ['ankle']` |
| `shoulder` (joint) | `overheadRom` | + `avoid: ['shoulder']` |
| `wrist` (joint) | - | R6 wrist row is about *implement*, not capability: prefer neutral-grip; this is an equipment-tag question |
| `pregnancy-T2` / `T3` | `supine` (long periods), `dynamicBalance>=2` | `impact <= 1` (T2), `impact = 0` (T3) |
| `postpartum-early` | - | `impact = 0` until cleared |

Two things this table makes visible that prose could not:

- **The joint rows now emit BOTH a joint avoid and a capability block.** A bad knee today
  only routes away from movements tagged `stress: ['knee']`. With `kneeFlexionDeep` it also
  routes away from a deep squat that happens to be untagged, and - more usefully - routes
  *toward* the box-squat `reducedRom` variant rather than away from squatting entirely.
- **A capability constraint can be `<=` rather than boolean.** `impact <= 1` is a cap, not
  a block, and belongs in the same family as the existing `maxFatigue` cap on
  `SubstituteQuery`. Reuse that shape rather than inventing a second one.

### 4.5 Authoring cost, honestly

17 boolean/small-enum fields x 194 exercises = 3,298 judgements for wave 1. Most are
mechanical (a barbell back squat: `floorTransfer: false, kneeling: false, prone: false,
supine: false, overheadRom: false, gripDemand: 0, spotter: 'helpful', space: 'room',
noise: 'quiet', setup: 2, impact: 0, standingBalance: 1, dynamicBalance: 0, coordination: 1,
kneeFlexionDeep: true, hipFlexionDeep: true, ankleDorsiflexionDeep: true`). Sensible
defaults derived from `pattern` + `EquipTag[]` + `kind` cover an estimated 70% and the
remainder is a review pass, not an authoring pass. HOUSE HEURISTIC on the 70%; measure it
on the first 30 before promising it for all 194.

---

## 5. ALIAS AND ENTITY RESOLUTION

### 5.1 The problem, sized with real data

BodyT ids are already terse and abbreviation-heavy: `flat-db-press`, `db-rdl`,
`standing-ohp`, `heels-elevated-goblet`. Free-exercise-db calls the same things
`Dumbbell Bench Press`, `Romanian Deadlift`, `Standing Military Press`,
`Heels Elevated Goblet Squat` (absent). With an aggressive normalizer (lowercase, strip
parentheticals, expand `db`/`bb`/`kb`/`ohp`/`rdl`, token-sort, collapse punctuation)
**only 26 of BodyT's 194 names matched free-exercise-db exactly**. `bulgarian` returns
**zero** hits in that corpus - the same movement is filed under a different family name.

So a name matcher must be treated as a **candidate generator that a human confirms**, never
as an authority.

### 5.2 Alias table shape

```ts
// src/plan/aliases.ts - NEW FILE
export interface AliasEntry {
  /** Normalized surface form, lowercased, punctuation collapsed, token-sorted. */
  key: string
  /** The catalog id it resolves to. Must exist in EXERCISES. */
  id: string
  /** Where the alias came from, so a bad one can be traced and removed. */
  source: 'bodyt' | 'wger' | 'user' | 'ingest'
  /** 1.0 = authored/confirmed. Below CONFIRM_THRESHOLD it is a SUGGESTION, never a match. */
  confidence: number
}
export const ALIASES: AliasEntry[] = [ /* ... */ ]
export const CONFIRM_THRESHOLD = 0.9  // HOUSE HEURISTIC
```

Flat array, not `Record<string, string>`, for one reason: **a surface form can legitimately
be ambiguous** ("press" -> bench? overhead? leg?), and a map forces a wrong winner. The
lookup returns `AliasEntry[]`; a single result above threshold resolves, multiple results
disambiguate, zero results fall through to fuzzy candidates.

Normalization pipeline (deterministic, order matters, testable at every stage):

1. Unicode NFKD, strip diacritics, lowercase.
2. Strip parentheticals **and keep them** as a `qualifier` string - do not discard.
   (See 5.4: the parenthetical is sometimes the whole distinction.)
3. Expand a fixed abbreviation table: `db`->dumbbell, `bb`->barbell, `kb`->kettlebell,
   `ohp`->overhead press, `rdl`->romanian deadlift, `sldl`->stiff leg deadlift,
   `bw`->bodyweight, `bss`->bulgarian split squat, `ghr`->glute ham raise,
   `cgbp`->close grip bench press.
4. Singularize (`pushups`/`push-ups`/`pushup` -> `push up`).
5. Collapse all non-alphanumerics to single spaces, trim.
6. Token-sort. `flat db press` and `db flat press` become the same key.

Step 6 is what makes "DB bench", "dumbbell bench press" and "flat db press" converge:
after expansion and sorting they are `bench dumbbell` / `bench dumbbell press` /
`dumbbell flat press`. Token-sort alone gets two of three; the third needs `flat` in a
**stopword-for-this-family** list, which is family-specific knowledge, not a general rule.
Which is exactly why the alias table exists: **the three surface forms get three explicit
rows pointing at `flat-db-press`**, authored once, and the normalizer only has to catch the
long tail.

### 5.3 Resolution order (deterministic, cheapest first)

```
1. exact id match                          -> resolve
2. exact normalized-name match             -> resolve
3. ALIASES lookup, confidence >= 0.9       -> resolve
4. ALIASES lookup, 1 hit below threshold   -> SUGGEST (one tap), never auto
5. token-set + trigram score over catalog  -> top 5 SUGGEST
6. nothing above floor                     -> "I don't know that one" + add-custom path
```

Steps 4-6 respect the standing constraint *"Suggest only, never auto."* An alias resolution
that silently maps a user's typed movement to the wrong exercise is the parsing equivalent
of the load-spiral bug: quiet, confident and wrong.

### 5.4 Keeping materially different variations distinct

**The rule:** two names merge only if every **discriminator dimension** agrees. A
discriminator is a dimension that changes what the movement *does*, and BodyT already has
all of them as fields:

| discriminator | field | example of a merge this blocks |
|---|---|---|
| pattern | `MovementMeta.pattern` | squat vs squat jump vs squat thrust (the wger group in §2.2) |
| primary muscle set | `EXERCISE_MUSCLES.primary` | incline (chest-upper) vs flat (chest) bench |
| equipment class | `EquipTag[]` | barbell vs dumbbell vs machine bench press |
| laterality | `MovementMeta.laterality` | one-arm DB bench vs DB bench |
| role | `MovementMeta.role` | close-grip press (secondary) vs bench (primary) |
| stance/grip qualifier | the parenthetical kept at step 2 | sumo vs conventional; Turkish Get-Up **(Lunge style)** vs **(Squat style)** |
| capability profile | `CapabilityDemands` | seated vs standing OHP differ on `standingBalance` |

Concrete proof that step 2's kept qualifier matters: stripping parentheticals introduces
**4 name collisions inside free-exercise-db itself**, and in every case the parenthetical
was the distinction:

- `Band Good Morning` vs `Band Good Morning (Pull Through)` - different pattern emphasis
- `Chest Push (multiple response)` vs `(single response)` - different `emphasis`/`impact`
- `Kettlebell Turkish Get-Up (Lunge style)` vs `(Squat style)` - different lower-body pattern
- `Pushups` vs `Pushups (Close and Wide Hand Positions)` - different `stress` (elbow/wrist)

**Merge = true synonym only.** "DB bench" / "dumbbell bench press" / "flat db press" agree
on all seven dimensions -> one id, three aliases. "Incline DB press" disagrees on primary
muscle -> separate id. "Sumo deadlift" disagrees on `hipFlexionDeep` and stance qualifier ->
separate id.

### 5.5 Dedupe strategy for a corpus of thousands

Blocking, then scoring, then a human gate. Never a single global similarity pass.

**Stage 1 - block.** Bucket every incoming record by `(patternGuess, primaryMuscleGuess,
equipClass)`. That is the only way this stays fast: 873 x 194 = 169k naive comparisons, but
blocking cuts it to hundreds. free-exercise-db's `category` + `primaryMuscles[0]` +
`equipment` gives a usable blocking key with **zero missing values** (all three are
873/873 populated).

**Stage 2 - score within block.** Weighted, deterministic, no ML:
`0.45 * trigramJaccard(normalizedName) + 0.25 * tokenSetOverlap + 0.15 * muscleSetJaccard
+ 0.15 * equipExactMatch`. Thresholds (HOUSE HEURISTIC, must be tuned on the 194 before
being trusted on 800): `>= 0.85` auto-merge candidate, `0.60-0.85` human review queue,
`< 0.60` treated as new.

**Stage 3 - the discriminator veto.** Any candidate pair that disagrees on **pattern,
laterality, or equipment class** is rejected regardless of score. This is the guard that
stops "Squat Jumps" merging into "Squats" at 0.9 name similarity.

**Stage 4 - human gate, mandatory.** No record enters `EXERCISES` without a person having
seen it. The gate is cheap if the queue is sorted by score and grouped by family; it is not
cheap if it is 800 unsorted rows. Budget it: at 20 seconds per confirmed record, 800 records
is roughly 4.5 hours of review. That is the honest number and it should be in the wave plan.

**Stage 5 - the losing record is not discarded.** Its name becomes an `AliasEntry`
(source `ingest`, confidence 0.8) and its provenance is recorded. That is how a 900-record
ingest becomes 400 new exercises **and 500 new aliases**, which is a better outcome than
900 exercises: the alias table makes freeform entry work, which is the J4 north star.

---

## 6. SUBSTITUTION GRAPH AT SCALE

### 6.1 What it does today

`substitutesFor` (`movement.ts:358-380`) is a full linear scan of `MOVEMENT` with four hard
filters and a four-term score:

```
filters:  same pattern · skill <= maxSkill · fatigue <= maxFatigue · no stressed joint · can()
score:    +4 same role · +2 same laterality · +1 same stretchLoaded
          − |levelRank(candidate) − levelRank(original)|
tiebreak: a.id.localeCompare(b.id)          <- deterministic, alphabetical
```

`maxSkill` defaults to `Math.max(meta.skill, 1)`, and the comment at `movement.ts:334-341`
records exactly why: a stricter rule left the leg-press-only athlete with no legal
substitute. That reasoning survives at scale and should not be re-litigated.

Callers: only `adapt.ts` (three sites, all taking `[0]`) and `zzprobe.test.ts`.

### 6.2 What breaks at 1,000+, and what does not

| concern | at 111 | at 1,000 | verdict |
|---|---|---|---|
| **speed** | 111 iterations x ~8 exercises/day x ~1 call each = under 1,000 comparisons per `planAdjustments` | ~9,000 comparisons | **not a problem.** This is microseconds. Do not build an index for it |
| **determinism** | `localeCompare` tiebreak makes it total-ordered | unchanged | **safe** |
| **score resolution** | score range is roughly -2..7, 111 candidates | same tiny range, 1,000 candidates | **THIS is the failure.** Dozens of candidates tie at the top and `localeCompare` picks the winner - the substitute becomes alphabetical |
| **`[0]` is all anyone reads** | fine when the pool is 5 | catastrophic when the pool is 80 and the score cannot separate them | **THIS is the failure** |
| **pattern is the only hard axis** | 15 patterns over 111 = ~7 per pattern | 15 patterns over 1,000 = ~67 per pattern | pattern stops being selective |

**So the bigger catalog produces worse swaps not because it is slow, but because the score
function has less resolution than the candidate set.** Say that clearly; it is the whole
section.

Live evidence at n=194 that the tail is already noise: `subs.ts:59-67` scores by muscle
overlap count (an integer, usually 1 or 2) over the whole catalog and then truncates at
`MAX_CANDIDATES = 6`. The truncation is doing the quality work, not the score.

### 6.3 Weighted edges with reasons

Replace the flat integer score with a named, weighted, **reason-carrying** score. The
reasons are not decoration - `adapt.ts` already composes a `because` sentence for every
substitute (`adapt.ts:303`, `:319`, `:337`), and today those sentences are hardcoded per
call site. A reason-carrying edge lets the sentence be true.

```ts
export type SubReason =
  | 'stimulus'    // same muscles at a similar length: does the same work
  | 'pattern'     // same movement job (already the hard filter; kept as a score term
                  //   for cross-pattern fallbacks when nothing in-pattern is legal)
  | 'equipment'   // reachable with what is in the room
  | 'skill'       // no harder to execute
  | 'joint'       // spares the flagged joint
  | 'capability'  // within the person's functional envelope (§4)
  | 'fatigue'     // fits what the day has left
  | 'goal'        // serves the plan's goal (hypertrophy wants stretchLoaded, etc.)

export interface ScoredSub {
  id: string
  score: number
  /** Every reason that contributed, strongest first. Drives the user-facing sentence. */
  reasons: { reason: SubReason; weight: number }[]
}
```

Proposed weights (**HOUSE HEURISTIC** - these are a starting point, and the tuning gate is
in §8 wave 2, G2-e):

| term | weight | rationale |
|---|---|---|
| same `role` | 4.0 | preserved from today; a primary must be replaced by something that can carry a session |
| primary-muscle Jaccard | 0-3.0 | **new, and the biggest resolution gain.** Continuous, so it breaks ties that integers cannot |
| same `laterality` | 2.0 | preserved |
| level distance | -1.0 each | preserved |
| same `stretchLoaded` | 1.0 | preserved |
| equipment-tag distance | -0.5 each extra tag needed | **new.** Prefers the movement that needs less setup |
| capability-profile distance | -0.5 per differing gate | **new.** A seated variant scores closer for someone who needs seated |
| goal alignment | 0-1.0 | **new, optional.** `stretchLoaded` bonus for `goal: 'muscle'`; low-skill bonus for `goal: 'general'` |
| `setup` burden delta | -0.25 each | **new.** The crowded-gym case (§9 case 1) |

Continuous terms are the point. Jaccard over primary muscles alone takes the effective
score alphabet from ~9 discrete values to a real interval, which is what a 67-candidate
pattern bucket needs.

### 6.4 Keeping it deterministic and fast

- **Determinism:** all terms are pure functions of catalog data plus the query. Round the
  final score to 4 decimals before sorting to kill float-ordering drift across platforms,
  then keep `a.id.localeCompare(b.id)` as the final tiebreak. A test should assert that
  `substitutesFor` returns an identical array on 100 consecutive calls and across a
  serialize/deserialize round trip.
- **Speed:** build one **pattern index** (`Map<MovementPattern, string[]>`) at module load,
  which turns the 1,000-item scan into a ~67-item scan. That is a 15x cut for four lines of
  code and no behavior change. Do not build anything more than that until a benchmark says
  to; `structure.test.ts`'s dead-export rule will delete an index nobody uses.
- **Bounded output:** return at most 12 scored candidates. `adapt.ts` reads `[0]`, `subs.ts`
  caps at 6. Nothing needs 1,000.

### 6.5 How to stop a bigger catalog producing worse swaps

Five guards, each of which should be a test:

1. **Score-separation guard.** For every exercise, assert the top candidate's score exceeds
   the second's by a minimum margin, OR that the tie group is under a cap (say 3). A tie
   group of 40 means the score function has failed for that pattern, and the test names it.
2. **Quality floor, not just legality.** Add a minimum absolute score. A candidate that
   passes every filter but scores 0.5 is a legal swap and a bad one; returning nothing and
   letting `adapt.ts`'s reduce-load branch fire is the better answer. **This is the single
   most important guard in the section** - the current function has no floor at all.
3. **Preserve the curated tier.** `SUBSTITUTIONS` (65 hand-authored chains) must keep being
   tried first, exactly as `resolveForEquipment` (`equip.ts:314`) and `subs.ts:53` do today.
   A graph search is the fallback for the cases nobody curated, not a replacement for the
   cases somebody did. **Ingested rows must never enter a curated chain automatically.**
4. **Provenance-weighted ranking.** An ingested-and-unreviewed record (`confidence: 0.4`)
   multiplies its score by its confidence, so it can only win when nothing authored fits.
   This is what stops 800 new rows from displacing 194 good ones on day one.
5. **Golden substitution fixtures.** A snapshot test over the §9 cases, so a catalog
   addition that changes an existing answer has to say why - the same tripwire posture as
   `golden.test.ts` and `goldenLife.test.ts`.

---

## 7. PRESCRIPTION UNITS AUDIT

### 7.1 What BodyT actually does today

**There is no unit model.** There is one string and one regex.

- `PrescriptionBase` (`types.ts:57-63`): `sets: number`, `repText: string`
  (*"Display form: `6-8`, `max`, `30 sec`, `15-20 / leg`"*), `repsNum?: number`.
- The **only** place a unit is derived: `focus.ts:98`
  `const timed = /(\d+)\s*(sec|min)/.exec(e.repText)` inside `estimateMinutes`.
  Everything else treats `repText` as opaque display prose.
- `reps.ts:44` `parseRepRange` matches `^(\d+)-(\d+)(.*)$` and **deliberately keeps the
  suffix verbatim** (`suffixOf`, `reps.ts:53`), so `40-60 sec` is progressed as a range
  with the unit carried along as an uninterpreted string. That is a clever local solution
  and it works; it also means the unit is never a first-class fact.
- `perSide?: boolean` on `ExerciseDef` (`types.ts:46`) -> copied to `ResolvedExercise`
  (`transforms.ts:45`) -> snapshotted in `golden.test.ts:46` as `|ps`.

Measured distribution of `repText` literals across the repo (57 distinct forms):

| shape | examples | count of literals |
|---|---|---|
| plain reps | `6-8` (15), `8` (10), `8-12` (8) | ~40 forms |
| **time** | `30 sec` (5), `25-30 min` (5), `40-60 sec`, `8-10 min`, `5 min`, `30-45 min`, `20-30 min`, `20-25 min`, `6-8 min` | ~10 forms |
| **per-side** | `10 / leg` (3), `8 / side` (2), `12 / leg` (2), `20 / leg`, `15-20 / leg`, `10 / side`, `10 / arm`, `3 / side`, `45 sec / side` (2), `30-45 sec each` | 11 forms, **four different separators** |
| **amrap** | `max` (6), `max hold` | 2 forms |
| **rounds** | `8-12 rounds`, `8-10 rounds`, `4-5 rounds` | 3 forms |
| **distance/count** | `6-10 sprints`, `6-10 reps` | 2 forms |

Time/hold/min mentions across the five catalog files: **278** total
(exercises 109, athleticExercises 82, homeExercises 40, gymExercises 24,
athleticCoverage 23) - mostly in prose (`steps`, `why`, `cue`), which is why the brief's
"~108" undercounts; the count that matters is the **10 time-shaped `repText` forms** above.

### 7.2 The live inconsistency, at n=194

Cross-checking `MovementMeta.laterality` against `ExerciseDef.perSide`:

- **13** catalog entries carry `perSide: true`. **15** MOVEMENT entries are
  `unilateral` or `alternating`.
- **7 unilateral/alternating movements have no `perSide`:**
  `single-leg-glute-bridge`, `shrimp-squat`, `cossack-squat`, `lateral-lunge`,
  `single-leg-squat-box`, `archer-push-up`, `bodyweight-calf-raise`.
- **5 `perSide: true` entries are not unilateral in MOVEMENT:** `seated-calf-raise`
  (a genuine contradiction - it is `laterality: 'bilateral'` at `movement.ts:262`), plus
  four mobility drills (`hip-9090-switch`, `ankle-wall-mobilization`, `couch-stretch`,
  `t-spine-opener`) that are per-side but sit in the `mobility` pattern with the default
  bilateral laterality.
- 4 of the 5 catalog files (`athleticExercises`, `gymExercises`, `homeExercises`,
  `athleticCoverage` - **117 of 194 entries**) contain **zero** `perSide` flags, including
  `single-leg-broad-jump`, `single-leg-bound`, `single-leg-pogo`, `single-leg-landing`.

Two fields describing one fact, disagreeing on 12 of 194 entries, with one of them absent
from 60% of the catalog. **Multiply by 5x and this becomes the dominant data-quality
problem in the ingest.**

### 7.3 The unit model to specify

```ts
// on PrescriptionBase (types.ts:57) - additive, all optional so nothing breaks
export interface PrescriptionBase {
  sets: number
  repText: string          // UNCHANGED. Stays the display string; golden lock depends on it
  repsNum?: number
  unit?: PrescriptionUnit  // NEW. Derived at build time for existing entries
  perSide?: PerSideMode    // NEW. Prescription-level override
  tempo?: string           // NEW, optional, prescription-level (see §3.4)
  seconds?: number         // NEW. Set duration when unit is 'time'
  meters?: number          // NEW. Set distance when unit is 'distance'
}
```

Rules, stated as invariants a test can check:

1. **`repText` remains the display truth.** It is snapshotted by `golden.test.ts:46` and
   `goldenLife.test.ts`. The unit fields are *derived from* and *must agree with* it. This
   keeps wave 1 golden-lock-neutral, which is non-negotiable.
2. **`unit` is a catalog default, overridable per prescription.** `PRESCRIPTION[id].unit`
   is the movement's natural unit; a template entry may override (a farmer carry is
   `time` on one day and `distance` on another).
3. **`brace` and `mobility` patterns default to `time`.** Planks, hollow holds, dead hangs,
   stretches. `movement.ts` already has `pattern: 'brace'` on `plank-side-plank`,
   `hollow-hold`, `superman-hold` and `pattern: 'mobility'` on six more - the derivation is
   free.
4. **`carry` pattern defaults to `time-or-distance`.** `farmer-carry`, `towel-hang`,
   `dead-hang` are all `pattern: 'carry'`.
5. **`conditioning` pattern and `kind: 'cardio'` default to `time-or-distance`** with pace
   as a derived third view (`runs.ts` already computes pace and MET calories).
6. **`perSide` derives from `laterality`, and `laterality` wins.**
   `unilateral` -> `'per-side'`; `alternating` -> `'alternating-total'`;
   `bilateral` -> `'none'`. The 5 mobility exceptions get an explicit override row so the
   exception is visible rather than implicit.
7. **`repsNum` is per-side when `perSide === 'per-side'`.** Today that is convention, not
   contract - `bookletOps.ts:186` and `generator.ts:372` both halve `sets` for a
   minimum-viable session and pass `repsNum` through untouched, which is correct only
   because nobody has written code that assumes otherwise yet.

### 7.4 The tests that catch a regression

| test | assertion | catches |
|---|---|---|
| `prescription.test.ts` - **unit agrees with text** | for every `PRESCRIPTION` row and every template `repText`: if the text contains `sec`/`min` then `unit === 'time'`; if it contains `/ leg`, `/ side`, `/ arm`, `each` then `perSide !== 'none'`; if it is `max`/`max hold` then `unit === 'amrap'` | the drift that already exists |
| - **laterality agrees with perSide** | for every id in both `MOVEMENT` and `PRESCRIPTION`: `laterality === 'unilateral'` iff `perSide === 'per-side'`, with a **shrink-only exception allowlist** seeded with the 5 known mobility rows and `seated-calf-raise` | the 12 live inconsistencies, and forbids new ones |
| - **no unit-less time prescription** | no `repText` anywhere in `templates.ts` / `blocks.ts` / `generator.ts` contains a time token without a matching `unit: 'time'` | an ingest adding `"45 sec"` with no unit |
| - **brace/carry/conditioning never prescribe bare reps** | every `pattern: 'brace' \| 'carry' \| 'conditioning'` movement resolves to `unit` in `{time, distance, time-or-distance, amrap}` | "3 x 12 plank" |
| - **separator vocabulary is closed** | every per-side `repText` uses exactly one of a fixed separator set; the current four (`/ leg`, `/ side`, `/ arm`, `each`) are the allowlist and it is shrink-only | a fifth separator arriving with an ingest |
| - **estimateMinutes agrees with unit** | `focus.ts:estimateMinutes` reads `seconds` when `unit === 'time'` and never falls back to the regex; assert the regex path is dead for every catalog entry | the regex silently mis-parsing `"8-12 rounds"` as untimed and defaulting to `repsNum ?? 10` x 4s |
| `golden.test.ts` / `goldenLife.test.ts` | **unchanged snapshots** after wave 1 | that adding the unit model changed no prescription |
| `structure.test.ts` dead-export guard | extend `targets` to include `plan/` | that `unit`/`perSide` do not become the next `loadable` |

Prove each bites before trusting it, per the standing constraint: plant `seated-calf-raise`
without its exception row and watch the laterality test fail; plant `"45 sec"` with
`unit: 'reps'` and watch the agreement test fail.

---

## 8. INGESTION PLAN

Three waves. Each has a source, an expected count, normalization steps, validation gates,
and a named list of existing tests that must not regress. **No wave starts before the
previous wave's gates are green.** IW is post-gate per BODYT_STATE.md §3 (depends on J12 +
B3), so waves 2 and 3 are scheduled work, not this-week work; **wave 1 is not** - it is
data hygiene on what already ships and can run alongside J6.

### Wave 1 - normalize what exists (194 -> 194)

**Source:** the repo. No external data. **Expected count: 194, unchanged.**

Steps:

1. **Reconcile laterality/perSide** across all five catalog files (§7.2): 7 additions,
   1 correction, 5 explicit exception rows, and `perSide` audited for the 117 entries in
   the four files that have none.
2. **Author `PRESCRIPTION`** (194 rows): `unit` + `perSide`, derived from `pattern` and
   `laterality` where possible, hand-set where not.
3. **Author `CAPABILITY`** (194 rows, 17 fields): defaults from `pattern` + `EquipTag[]` +
   `kind`, then a full review pass. Measure the default hit-rate on the first 30.
4. **Author `PROVENANCE`** (194 rows): all `source: 'bodyt'`, `confidence: 1.0`. Trivial
   now, and it is the schema that makes wave 2 auditable. This is B2's `source_refs` rule
   made concrete.
5. **Unify fatigue/CNS** (§3.3): one scale, `AthleticMeta.cns` deprecated to an alias, with
   a test that the 17 dual-listed ids agree.
6. **Resolve the nine dead exports** (§1.3): wire in or delete. `patternImbalances` and
   `patternLoad` have an obvious consumer (a push/pull balance line in the debrief, which
   J10 wants anyway); `transfersTo` and `loadable` should probably be deleted, and
   `loadable`'s job given to `PRESCRIPTION` where the rep engine will actually look.
   Extend `structure.test.ts`'s dead-export `targets` to include `plan/` in the same commit.
7. **Make `POOLS` derived, not authored.** This is the wave's real deliverable. Replace the
   51 hardcoded ids with a deterministic query over `MOVEMENT` + `CAPABILITY` + `EquipTag`
   (slot -> `{pattern, role, maxSkill}` filter, ranked, then the same `GOAL_FIRST` promotion
   and `hashStr` seeded rotation). **Until this lands, waves 2 and 3 cannot improve a single
   generated plan.** `golden.test.ts` is the acceptance test: the derived pools must
   reproduce the existing 51 exactly for the NAOD preset, or the diff must be explained.

Gates:

| gate | check |
|---|---|
| G1-a | `npx tsc -b` clean; `npx vitest run` 1,194+/1,194+ |
| G1-b | `golden.test.ts` snapshot **unchanged**; `goldenLife.test.ts` unchanged and deterministic across two runs |
| G1-c | new `prescription.test.ts` (§7.4) green, and each guard proven to bite on a planted bad input |
| G1-d | `equipCoverage.test.ts` unchanged: all 6 profiles still reach all 13 `MUST_TRAIN` regions; bodyweight still has >= 3 options per pattern; machine work still >= 20 |
| G1-e | **the demo contract decision is made and landed.** `visuals.test.ts:117` currently requires `EXERCISE_DEMOS[id]` for every id. Either (i) it stays 1:1 and waves 2-3 are capped at what can be hand-animated, or (ii) it becomes tiered: a **required** pattern-level fallback figure (15 patterns, not 1,000 exercises) plus an **optional** per-exercise override, with the test asserting "every exercise resolves to *some* figure" instead of "every exercise has its *own*". **This is the single decision that gates whether the catalog can grow at all.** |
| G1-f | `sim` 20x20 and `sim:sessions` 20x8 clean, zero invariant failures; `poison` 81/81 |
| G1-g | `structure.test.ts`: no new oversize allowance, no new dead-export allowlist entry, `plan/` now scanned |

### Wave 2 - a permissively licensed corpus (194 -> ~500-600)

**Source:** free-exercise-db **structured fields only** (873 records), plus the wger **CC0
subset** (21 records) if the owner wants the extra names. **Prose and images are not
ingested** (§2.1, §2.2). **Expected net new: 300-400** after dedupe and after dropping
records that cannot be given a `pattern`/`role`/`stress` by a human.

Do not promise 873. Of those, an estimated 250-350 are near-duplicates of each other or of
BodyT's 194 (21 bench presses, 8 lateral raises, 20 "front-" prefixed entries), and a
further chunk are machine-brand variants and stretches BodyT already covers.
**HOUSE HEURISTIC on the 300-400; the dedupe queue produces the real number and the wave
should report it rather than predict it.**

Normalization steps:

1. Fetch, pin the commit SHA, and **record it in `PROVENANCE`**. A moving corpus is not
   reproducible and this repo's whole posture is determinism.
2. Map the 5 structured fields per §2.1's table. `equipment` single -> `EquipTag[]`;
   `category` -> `ExerciseKind`; `primaryMuscles`/`secondaryMuscles` -> `MuscleRegion[]`,
   **flagging every `shoulders` for hand-splitting** into front/side/rear.
3. Block, score, veto, human-gate per §5.5. Losers become `AliasEntry` rows.
4. **Author the 15 missing engine fields per surviving record.** This is the cost. At an
   estimated 3-4 minutes per record for pattern/role/skill/fatigue/stress/laterality plus
   17 capability fields, 350 records is 20-25 hours of authoring. **Budget it honestly or
   cut the target.**
5. Author `steps`/`why`/`mistakes`/`cue` - or **change `data.test.ts:11-21`**, which
   currently requires `steps.length >= 2`, `why.length > 40`, `mistakes.length >= 1`,
   `videoQuery.length > 5` on **every** entry. 350 new entries x ~150 words of original
   prose is a content project, not an ingest. The honest options are (i) write it,
   (ii) tier the requirement by a `guideDepth` field so browse-only entries need less, or
   (iii) do not add them. Pick one before starting.
6. Set `confidence: 0.4` on every unreviewed ingested record; `1.0` only after review.

Gates:

| gate | check |
|---|---|
| G2-a | all wave-1 gates still green, `golden.test.ts` **unchanged** (adding catalog entries must not move an existing plan; if it does, `POOLS` ranking is unstable and that is a bug, not a plan change) |
| G2-b | `movement.test.ts` invariants hold at the new size: no orphans either direction, every regression/progression edge lands on a real movement, no regression raises skill or level, no chain loops, every regression stays in-pattern |
| G2-c | `visuals.test.ts` per the G1-e decision. If ExerciseDB was licensed, this is where its GIFs land and the uniqueness assertions apply to them |
| G2-d | `equipCoverage.test.ts` **strengthened**: the same 6 profiles, plus new profiles for the §9 capability cases (no-floor-transfer, seated-only, band-only), each still reaching all 13 `MUST_TRAIN` regions |
| G2-e | **substitution quality benchmark**: the §9 fixtures all pass, AND the score-separation guard (§6.5 #1) reports no tie group over 3 for any exercise, AND `substitutesFor` output for the original 194 is diffed against wave-1 output with every change explained |
| G2-f | `sim` 20x20 + 20x8 clean; `poison` 81/81; e2e 38 pass |
| G2-g | **bundle budget.** `src/plan/` is 944 KB of source today at 194 entries. A 3x catalog is ~2.8 MB of source before the guide prose. This is the point at which B3 (knowledge packs outside the bundle, IndexedDB-loaded) stops being optional. Measure the built bundle before and after; if it moves more than a stated budget, wave 2 blocks on B3 |

### Wave 3 - thousands (~600 -> 2,000+)

**Precondition, stated flatly: wave 3 requires B3.** Shipping 2,000 exercises inside the JS
bundle is not viable, and the browse UIs (`CoachScreen.tsx:304`, `BookletEditor.tsx:368`)
must be rebuilt against an indexed query API rather than an in-memory full scan. Both are
already on the roadmap; wave 3 is the job that makes them mandatory.

**Sources:** the wger CC-BY-SA subset **only if the owner accepts ShareAlike**; a licensed
commercial set (ExerciseDB, 1,394 entries, if procured); and - most realistically -
**BodyT-authored records generated systematically from the variation axes the catalog
already understands**: implement (barbell/dumbbell/kettlebell/cable/machine/band) x angle
(flat/incline/decline) x stance/grip x laterality x support (standing/seated/supported).
That last route is the one that scales without a licensing question, produces records with
every engine field populated by construction, and is exactly what the discriminator table
in §5.4 is for.

Gates: all of wave 2's, plus retrieval-latency budgets on B3's indexed API, plus a
high-cardinality scale test (BODYT_STATE.md B3 already names one), plus the
capability-coverage assertion that **every `CapabilityBlock` combination in §4.4 still has
a legal plan** - which is the real proof that a bigger catalog served the person rather
than the row count.

---

## 9. EVAL FIXTURES

Sixteen cases. Each names its input state, the required behavior, and the assertion. These
are written to run against `substitutesFor` / `swapCandidatesFor` / `planAdjustments`, and
they are the acceptance suite for §8's G2-e.

| # | scenario | input state | required behavior | assertion |
|---|---|---|---|---|
| 1 | **Crowded gym** | full-gym `EquipTag`s; a `crowded` session flag | prefer low-`setup`, non-rack, non-queued movements; a barbell back squat yields to a goblet/DB/machine option **of the same pattern and role** | top candidate has `setup <= 1`; pattern preserved; role preserved; result is deterministic across 100 calls |
| 2 | **Dumbbells only** | `owned = ['dumbbell','bench']` | every prescribed movement is DB-legal or bodyweight; no barbell, cable or machine anywhere in the resolved day | `canDo(id, owned)` true for all; `equipCoverage` reaches all 13 `MUST_TRAIN` regions for this profile |
| 3 | **Bad knee** | `Limitation{joints:['knee']}`; capability `kneeFlexionDeep` blocked | deep-knee-flexion squats and lunges route to `variants.reducedRom` (box squat) or a hinge-biased alternative; the athlete still trains quads | no returned id has `stress` containing `knee` **or** `kneeFlexionDeep: true`; `quads` still covered as a primary somewhere in the week |
| 4 | **Cannot kneel** | R6 `cannot-kneel` -> `CapabilityBlock: kneeling` | no quadruped or kneeling movement; bird-dog routes to a standing or wall variant | zero returned ids with `kneeling: true`; the `anti-rotation` pattern is still covered |
| 5 | **No floor transfer** | R6 `cannot-get-to-floor` -> blocks `floorTransfer`, `prone`, `supine` | all floor press / sit-up / prone-hold / burpee-class work replaced by bench-, wall- or chair-height versions | zero ids with any of the three true; `abs` and `chest` still covered as primaries; **`brace` pattern still has >= 1 legal option** (this is the one most likely to fail) |
| 6 | **Weak grip** | `CapabilityBlock: gripDemand >= 2` | pulls that are grip-limited (dead hang, towel hang, farmer carry, pull-up) route to machine or supported pulls; **the app does not invent a bodyweight grip substitute** | zero ids with `gripDemand: 2`; `lats` still covered; `farmer-carry`/`towel-hang` return **empty** and trigger the reduce-load path, matching the existing `NO_HONEST_BODYWEIGHT_VERSION` honesty rule at `equipCoverage.test.ts:122` |
| 7 | **Small apartment, quiet hours** | `space: 'none'\|'mat'`, `noise: 'silent'\|'quiet'` | no jumps, no bounds, no dropped loads, no sprints; the plan still trains legs and power intent through non-impact means | zero ids with `noise: 'loud'` or `space: 'open'`; `impact <= 1` on everything; `quads` and `glutes` still primary-covered; the day's `sessionFatigue` stays within its normal band |
| 8 | **Time-capped session** | `Prefs.sessionMinutes = 25` | `estimateMinutes` (`focus.ts:91`) respects the cap; the minimum-viable recipe path (`transforms.minimumViableFor`) fires; **primaries survive, accessories are cut first** | `estimateMinutes(result) <= 25`; every `role: 'primary'` entry from the full day is still present; ordering still passes `sequence.ts` band + `roleRank` checks |
| 9 | **Beginner skill ceiling** | `maxSkill: 1`; no coaching available | never returns a `skill >= 2` movement; a front squat request yields goblet, not "front squat but easier" | all returned `skill <= 1`; `movement.test.ts`'s regression-never-harder invariant holds; a `skill: 0` machine-only movement (leg press) still gets a substitute, per the `movement.ts:334-341` reasoning |
| 10 | **Bodyweight-only progression path** | `owned = []` | every pattern has a **ladder**, not a single option: at least 3 distinct difficulties reachable per major pattern, and `progressionFor` walks the chain | reproduces `equipCoverage.test.ts:80` at the new catalog size with the threshold raised from 3 to a stated number; `phase.ts:nextUp` finds a legal promotion for a push-up athlete |
| 11 | **Wheelchair user, upper-body day** | `CapabilityBlock`: `standingBalance >= 1`, `dynamicBalance >= 1`, `floorTransfer`, `kneeling`, plus lower-body patterns excluded | a complete, coherent upper-body session generates: horizontal push, vertical push, horizontal pull, vertical pull, core brace - all seated or supported | >= 1 legal option per upper-body pattern; zero ids requiring standing; **the day is generated, not refused** (this is the case where an under-populated capability table fails silently and produces an empty day, which is why the assertion is on generation, not on filtering) |
| 12 | **Machine-only commercial gym** | `owned = ['machine']` | the full-gym athlete is offered the machines rather than a garage workout - the exact failure `equipCoverage.test.ts:19-21` was written about | >= 20 machine-tagged options (existing assertion, `equipCoverage.test.ts:101`); all 13 `MUST_TRAIN` regions reachable machine-only; every `substitutesFor` result for a machine movement is non-empty |
| 13 | **Band-only travel** | `owned = ['band']` | the profile that historically "had one exercise behind it" (`equip.ts:188`) trains the whole body | all 13 `MUST_TRAIN` regions covered; every band movement has at least one same-pattern band alternative so a week is not one repeated session |
| 14 | **Single-arm limitation** | left arm unusable; `CapabilityBlock` on bilateral upper-body loading | bilateral pressing/pulling routes to `laterality: 'unilateral'` equivalents; `perSide` prescription is correct on every one | every returned upper-body id has `laterality: 'unilateral'`; `PRESCRIPTION[id].perSide === 'per-side'` for all of them; `repText` shows a per-side form; **no `alternating` movement is returned** (alternating still requires two working arms - this is the case that catches a lazy laterality mapping) |
| 15 | **No substitute exists: reduce load instead** | shoulder flagged 3x; the day contains `standing-ohp` | `substitutesFor` correctly returns **empty** (the pattern IS the stress, `adapt.ts:349-360`); the app **says so**: keep training it, drop the load, stop at the first sharp one, put a clock on it | `substitutesFor('standing-ohp', {avoid:['shoulder']})` is `[]`; `planAdjustments` emits the unroutable branch with a `because` sentence; **it does not go quiet**, and it does not invent a swap. Repeat for a knee-flagged bodyweight athlete, where `adapt.ts:357` notes there are six such movements |
| 16 | **Alias resolution end-to-end** | user types `"3x8 flat db press"`, `"DB bench"`, `"dumbbell bench press"` | all three resolve to `flat-db-press`; `"incline db press"` resolves to `incline-db-press` and **not** to `flat-db-press`; `"press"` alone returns a disambiguation suggestion, never an auto-match | exact id for the three synonyms; distinct id for incline; `>= 2` suggestions and zero auto-resolution for the ambiguous term; resolution is deterministic across runs |

Two cases deliberately assert on **refusal** (6 and 15) and one on **generation** (11).
Those three are the ones a bigger catalog is most likely to break, because more rows makes
it easier to find something that passes the filters and harder to notice that it should
not have.

---

## 10. WHAT TO DO NEXT, IN ORDER

1. **Owner decision, blocking everything:** the demo/visual contract (G1-e). 1:1
   hand-authored figures cap the catalog at what a human can animate. Nothing in waves 2-3
   is schedulable until this is answered.
2. **Owner decision, blocking wave 2:** (a) does BodyT accept the everkinetic provenance
   flag on free-exercise-db's structured facts? (b) does it accept CC-BY-SA ShareAlike on
   the wger majority, or restrict to the 21 CC0 rows? (c) is ExerciseDB's paid license
   worth procuring for the visual problem?
3. **Wave 1 is unblocked and should start regardless of 1 and 2.** It is data hygiene on
   the 194 that already ship, it closes the R6 consumption gap, it kills the
   laterality/perSide drift before an ingest multiplies it, and item 7 (derived `POOLS`) is
   the change without which a larger catalog improves nothing.
4. **B3 is on the critical path earlier than the board implies.** Wave 2's bundle gate
   (G2-g) and wave 3's precondition both land on it.

---

## 11. SOURCES

**Repo (commit `67ceb91`, branch `claude/app-audit-refinement-sjw2va`):**
`src/types.ts:29-47`, `src/plan/movement.ts` (487 ln), `src/plan/exercises.ts` (1,836 ln),
`src/plan/athleticExercises.ts`, `src/plan/gymExercises.ts`, `src/plan/homeExercises.ts`,
`src/plan/athleticCoverage.ts`, `src/plan/athletic.ts:104`, `src/plan/equip.ts`,
`src/plan/muscles.ts`, `src/plan/demos.ts`, `src/plan/videoMap.ts`, `src/plan/subs.ts`,
`src/plan/generator.ts:151-205`, `src/plan/blocks.ts`, `src/plan/templates.ts`,
`src/prefsTypes.ts:50-81`, `src/engine/adapt.ts:183,286,291-360,521,563`,
`src/engine/sequence.ts:56-100`, `src/engine/phase.ts:110-124`,
`src/engine/transforms.ts:45,148`, `src/engine/focus.ts:91-106`, `src/engine/reps.ts:31-56`,
`src/engine/sessionFatigue.ts:83`, `src/engine/startWeight.ts:21`,
`src/structure.test.ts:42,245-345`, `src/plan/movement.test.ts`,
`src/plan/equipCoverage.test.ts`, `src/plan/data.test.ts:11-21`,
`src/plan/visuals.test.ts:117`, `src/engine/golden.test.ts:46`,
`src/screens/coach/CoachScreen.tsx:304`, `src/screens/booklet/BookletEditor.tsx:368`,
`research/R6-safety.md` §2/§5, `BODYT_STATE.md` §1/§3/§6.

**External (all fetched 2026-08-18):**
- free-exercise-db: `raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json`
  (873 records parsed), `.../main/LICENSE.md` (Unlicense, quoted verbatim), `.../main/README.md`
- everkinetic: `github.com/everkinetic/data` README (no LICENSE file at `main` or `master`;
  both 404). CC BY-SA 3.0 attribution is from secondary sources, **not confirmed at source**
- wger: `GET https://wger.de/api/v2/exerciseinfo/?limit=500&offset={0,500}` (869 records,
  license distribution CC-BY-SA 4: 720 / CC-BY-SA 3: 128 / CC0: 21)
- exercemus: `raw.githubusercontent.com/exercemus/exercises/minified/minified-exercises.json`
  (872 records), `.../main/README.md`, `.../main/LICENSE` (MIT, code only)
- OpenPowerlifting: `gitlab.com/openpowerlifting/opl-data/-/raw/main/LICENSE-DATA`
  (public domain, quoted verbatim), `.../main/README.md`,
  `openpowerlifting.gitlab.io/opl-csv/bulk-csv.html` (4,001,902 rows, updated 2026-08-14)
- ExerciseDB: `exercisedb.io/faq` (1,394 entries, paid perpetual commercial license,
  redistribution prohibited)
- ExRx.net: `exrx.net/Copyright` and `/Testing/Disclaimer` - **Cloudflare-blocked, not
  read.** Classified reference-only on the basis of it being a proprietary commercial site
  with no open license, not on the basis of its terms text
- MuscleWiki: `musclewiki.com/legal/terms` - **403, not read.** Same classification basis

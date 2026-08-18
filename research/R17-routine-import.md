# R17: Routine-Import Intelligence and the Competitive Landscape

Research pack for BodyT. v12 sections 38, 38A and 39 (competitor intelligence, external
routine import). **No production code was written.** Repo facts are line-level, read from
the `wt-fix2` worktree at commit `c5723d9`.

Consumers of this pack: J4 (freeform-first onboarding), the BYOR path owner, R-ONT's alias
work (this pack extends it, it does not restate it), and R5's F9 `preserve-and-repair`
family, which is the family an imported routine lands in.

**Hard constraints this pack is written under, from the owner:**

1. **Zero runtime LLM calls.** Every stage below is lexical: tokenizers, alias tables,
   fixed regexes, edit distance, and rules. No model call at parse time, ever. Where a
   stage cannot decide, it asks the athlete rather than reaching for a model.
2. **Suggest only, never auto.** A resolution below the confirm threshold is a suggestion
   with a tap, not a silent write.
3. **Users never pick reps.** An imported `8-12` is stored as a range and shown as one
   number by `engine/reps.ts`, exactly as an authored range is.
4. **Licensing fence.** A person pasting their own routine is the whole product. Ingesting
   another app's program library is not, at any volume, under any framing. See section 1.7.

---

## CONTENTS

0. The one-paragraph answer
1. The landscape: what the players actually do about import
2. The import problem, decomposed into six stages
3. The notation corpus (the reusable artifact)
4. The confidence and repair model
5. The advisory pass: what the app may say about a routine it did not write
6. Audit of the live BYOR path
7. Typed schema proposal
8. Eval fixtures
9. What to do next, in order
10. Sources

---

## 0. THE ONE-PARAGRAPH ANSWER

Every app that lets a person bring a routine in solves one of two problems, and almost none
solve both. The trackers (Hevy, Strong, Alpha Progression, Boostcamp) solve **authoring**:
a good structured builder with supersets, RPE and rep ranges, and the athlete retypes the
routine by hand. The new paste-natives (Repstack, Ellim, and a cottage industry of n8n and
ChatGPT workflows) solve **ingestion** by handing the text to a language model, which is
fast, non-deterministic, and exactly what BodyT is forbidden to do. BodyT's opening is the
third thing neither group does: **read the routine well enough to have an opinion about
it**. Nobody in the landscape tells you that your routine has no lower-body pull. That
capability already half exists in this repo (`src/plan/analyze.ts`, 241 lines, nine note
families) and it is wired to a builder the athlete has to click through movement by
movement. The gap is not the opinion, it is the on-ramp: today an athlete with a routine on
their phone must re-enter it through a picker restricted to 194 catalog ids, and the picker
loses their rest times, their RPEs, their percentages, their supersets and their exercise
names on the way in (section 6). A deterministic parser closes that gap without a model,
because programming notation is a small, closed, highly regular language: 61 rules in
section 3 cover essentially everything a person actually writes, and the residue is not a
parsing failure, it is a question worth asking.

---

## 1. THE LANDSCAPE

Read this as product intelligence, not authority. v12 section 38's own framing applies:
"Competitor behavior is product evidence, not exercise-science authority"
(`playbook_v12.md:959`). Where a claim came from a vendor marketing page it is labelled as
such, because a marketing page is a claim about intent, not a test result.

**What "import" means, disambiguated.** Three different features get the same word, and
conflating them is how this section would go wrong:

| sense | what moves | who has it |
|---|---|---|
| **A. History import** | past logged sets, for continuity of charts and PRs | Hevy (Strong CSV), HeavySet, Taper, Strength Journeys |
| **B. Program import** | the future plan: days, exercises, sets, reps, progression | Repstack, Ellim (both by model), Boostcamp's library (pick, not import) |
| **C. Program authoring** | the athlete retypes it into a structured builder | Hevy, Strong, Alpha Progression, Boostcamp, TrainHeroic, RP |

BodyT's BYOR path is **C** today (section 6). R17 is about **B**. **A** is R14/section 32
territory and out of scope here except where the two share a resolver, which they do: both
need a movement name to become a catalog id.

### 1.1 Hevy

**Import story.** History import only, and narrowly: Hevy accepts a CSV exported from
Strong, via Profile > Settings > Export and Import Data > Import Data > Import Strong CSV.
Two documented constraints in Hevy's own help centre: the file must be in the Strong
format, and **the file must be in English to be accepted**. For anything not from Strong,
the documented path is to email support and be sent a sample CSV in the Strong shape,
meaning the real import contract is "one competitor's column layout". Routines themselves
are authored in-app or created from a completed workout (Profile > recent workout > three
dots > save as routine). Routine *sharing* exists through folders and share links, and the
marketing page names ChatGPT explicitly as the way to get a plan in: "generate workout
plans with ChatGPT and import them to your Hevy profile". That is an admission that the
paste problem is real and that Hevy has outsourced it.

**Data model implied.** A routine is a flat ordered list of exercises, each with typed sets
(warmup / normal / drop / failure), a load target, a rep or **rep-range** target, an RPE, a
per-exercise rest period, and a free-text note that may carry a link. Supersets are a
grouping over adjacent exercises ("pair two movements or add multiple for a circuit-type
session"). There is no week dimension inside a routine: a program is a *folder of
routines*, so week-over-week percentage progression cannot be expressed as data. That is
the single most consequential fact about Hevy's model, and it is why a 5/3/1 or a
Smolov-style percentage table cannot round-trip into Hevy without being flattened into N
separate routines.

**The one thing they do that BodyT does not.** Per-exercise **rest periods and free-text
notes carried on the prescription**. BodyT's rest is a catalog constant
(`ExerciseDef.restSec`, `src/types.ts:45`), not a prescription field, so an imported "rest
3 min" has nowhere to land. Hevy also has a genuinely large exercise library plus
user-created custom exercises, which means an unknown name is never a dead end for them.

### 1.2 Strong

**Import story.** There is none, and this is the clearest data point in the whole section.
Strong's own help centre documents export to CSV (Profile > settings gear > Export
Workouts, one file, complete history) and states that **exported files cannot be imported
back into Strong**. So the most-copied strength tracker in the category is import-hostile
in both directions: you cannot bring a program in, and you cannot bring your own history
back. Its CSV has nevertheless become the category's lingua franca, because everyone else
built an importer against it (Hevy, HeavySet, Taper, Strength Journeys).

**Data model implied.** Row-per-set, with columns for date, workout name, exercise name,
set order, weight, reps, distance, seconds, notes, workout notes, RPE. Flat, denormalized,
and keyed on the **exercise name as a display string**, not an id. That is why every
downstream importer has an alias problem: they receive `"Bench Press (Barbell)"` and must
map it to their own catalog. This is precisely the entity-resolution problem R-ONT section
5 solved for BodyT, arriving from a different direction.

**The one thing they do that BodyT does not.** Ship a stable, documented, one-file export
that third parties can build against. BodyT has no export of plan or history in any format
a spreadsheet reads. That is a portability gap, and it is also a trust gap: an athlete
deciding whether to type their routine into a new app asks whether they can get it out.

**Uncertain:** whether Strong has shipped any import path in a 2026 release. The help-centre
statement above is the most recent authoritative text found; treat "no import" as
current-as-of-search, not as permanent.

### 1.3 Boostcamp

**Import story.** No text or spreadsheet import. The pitch is the inverse: a library of
programs so large that importing is meant to be unnecessary. The marketing page claims
130+ expert programs and 10,000+ community programs, with a web-based custom program
creator whose stated features are "supersets, RPE, AMRAP, drop sets", "set exact reps,
sets, rest, and loading", and a searchable library of "500+ exercises". The creator is
explicitly positioned against spreadsheets ("ditch the spreadsheet"), not as a spreadsheet
importer.

**Data model implied.** This is the only mainstream consumer model in the survey that has a
**real week dimension**: "map all your weeks upfront, then refine as you go", with built-in
progressions, periodization and deload weeks, and auto-load-advance on a hit. So the shape
is program > week > day > exercise > set, with progression rules attached above the day.
That is the shape a 5/3/1 percentage table or a Sheiko block needs, and it is the shape
BodyT does not have: `PlanConfig.templates` is a flat map of day templates with no week
axis, and the week-over-week variation BodyT does express (blocks 1/2/3, deloads) is
generated by the engine rather than authored (`src/plan/bookletOps.ts:113` `slots`,
`src/engine/phase.ts`).

**The one thing they do that BodyT does not.** A **community program library with a
creator**, which turns import into a search problem for the most common routines. Note the
licensing fence in 1.7 before finding this attractive: their library is theirs.

### 1.4 Juggernaut AI

**Import story.** None found. JuggernautAI is a generator: you answer intake questions and
it writes and adapts a powerlifting or powerbuilding block. Reviews consistently report
that the program itself "does not offer much flexibility in modifying specific workouts",
while allowing exercise substitution within a block and custom exercise creation against a
library of roughly 250 movements.

**Data model implied.** Program is a computed artifact owned by the engine, with the
athlete's inputs (maxes, RPE feedback, exercise preferences) as parameters. There is no
representation for "a program the athlete brought", because the engine's authority is the
product.

**The one thing they do that BodyT does not.** Treat **RPE feedback on the top set as the
primary control loop** for a whole block's loading. BodyT reads RIR and per-exercise feel
(`src/engine/reps.ts:88` `feltHeavy`) but does not yet run a block's loading off it.

**Relevance to R17:** JuggernautAI is the anti-example. It is what BodyT would become if
BYOR were dropped: excellent for the athlete who wants to be told, useless for the athlete
who already has something that works. R5's F9 `preserve-and-repair` exists precisely to
avoid this failure mode (`research/R5-program-families.md:340`).

### 1.5 Fitbod

**Import story.** None for programs. Fitbod is a per-session generator, so the unit of
personalization is today's workout, not a plan. The interesting part is what happens to a
movement Fitbod does not know: custom exercises exist, and Fitbod's help centre states
plainly that **custom exercises will not appear in automatic workout recommendations**, the
algorithm does not adjust recommendations for them, they cannot be edited after creation
(delete and recreate), and they do not support distance-based tracking.

**Data model implied.** A hard split between the **first-class catalog** (which the engine
reasons over: recovery model, exercise selector, capability recommender) and a **second-class
user table** (which is inert storage). Everything the engine does keys off the first.

**The one thing they do that BodyT does not.** Explicit per-exercise preference controls
(more of this, less of this, never this) feeding the selector, plus population priors from
a very large logged corpus.

**The lesson R17 must absorb, stated as a rule.** Fitbod's custom-exercise behaviour is
the exact trap an import path walks into: an unresolved movement becomes a name-shaped
placeholder that the engine cannot see, so substitution, fatigue, muscle coverage and
volume accounting all silently skip it. BodyT must not ship an import that creates
engine-invisible entries. Section 4's tier T4 and section 7's `UnresolvedMovement` shape
are written to make that impossible: an unresolved line blocks the commit rather than
becoming a ghost.

### 1.6 Alpha Progression, TrainHeroic, RP Hypertrophy, and the paste-natives

**Alpha Progression.** No text import; a strong plan editor instead, which can "import
workouts and days from other plans" (that is, plan-to-plan copy inside the app), plus
drag-and-drop of exercises between days, plus a plan generator seeded by equipment, sex,
experience, frequency, duration and muscle preference. Their own documentation frames the
manual-entry case exactly as BodyT should read it: "if you find a workout you like online
and want to follow it, you can simply enter it into the app". That sentence is the whole
market: everyone's answer to a routine found online is *retype it*. **The one thing they do
that BodyT does not:** RIR and intensity techniques (drop sets, supersets) as first-class
plan-editor fields, plus plan sharing to friends or coaching clients.

**TrainHeroic.** Coach-facing, and notably import-hostile: community feature requests exist
for CSV/Excel exercise import and for program export, and support documentation states
there is no way to export a training plan or history because everything is delivered
in-app. A `Spreadsheets` tool exists but is for **testing data** (baseline working maxes,
benchmark retests), not for programming. **The one thing they do that BodyT does not:**
program-level authorship with an assignment model (a coach writes once, many athletes
receive it), which is v12 section 31 territory and adjacent to R12's authority work.

**RP Hypertrophy.** Explicitly a bring-your-own-program product: pick one of roughly 45
pre-built templates or build your own from scratch, and the app's value is the set-by-set
autoregulation (soreness, pump, performance feedback moving next week's sets) rather than
the program text. **The one thing they do that BodyT does not:** per-muscle weekly set
progression driven by three feedback questions. That is the closest competitor to BodyT's
intended coaching layer, and it still has no paste path. **Uncertain:** exact current
template count and whether any text import shipped in 2026.

**Repstack and Ellim (the paste-natives).** These are the products that actually solve
program import, and they solve it with a model. Repstack's App Store copy: paste a program
"from anywhere - Sheets, Notes, a PDF, a coach's email" and AI formats it, with explicit
support claimed for `3x5 @8`, `5/3/1`, AMRAP, top sets and backoffs. Ellim advertises "AI
routine import" that parses pasted text into a trackable plan. There is also a published
n8n workflow template whose whole job is converting workout-plan PDFs into Hevy routines
using Gemini, which tells you the demand exists and that the incumbents are not serving it.

**This is the most important competitive fact in the pack, and it cuts both ways.**
The market has concluded that program import requires an LLM. BodyT has ruled out runtime
LLM calls. That is a constraint, and it is also the differentiator, for three reasons that
should be said out loud rather than assumed:

1. **A parser that cannot hallucinate is worth more than one that is occasionally
   cleverer.** An LLM that maps "Pendlay row" to `barbell-row` is right; the same call that
   maps "GHR" to `glute-bridge` is confidently wrong and no user will catch it. Section 4
   makes the wrong answer structurally unavailable: below threshold, the app asks.
2. **It works offline and costs nothing per import.** BodyT is a PWA with a service worker
   (`src/sw.ts`). A regex table ships in the bundle. A model call does not work on a gym
   floor with no signal.
3. **It is auditable.** Every resolution in section 4 carries the rule that produced it, so
   a bad alias is a one-line fix in a table, not a prompt-tuning exercise.

The honest cost: a deterministic parser will resolve a lower fraction of genuinely weird
input on the first pass. Section 4's job is to make the unresolved fraction *cheap to fix*
and *impossible to get silently wrong*, and section 8's fixtures set the bar.

### 1.7 The licensing fence, stated plainly

**Permitted, and the entire point of this pack:** an athlete pastes, types, photographs or
uploads **their own routine**, whether they wrote it, bought it, or were given it by their
coach. Their copy, their device, their plan. BodyT parses it locally, stores it in that
athlete's own plan, and never transmits it as corpus.

**Not permitted, at any volume, under any framing:**

- Scraping or bulk-ingesting another app's program library (Boostcamp's 10,000 community
  programs, TrainHeroic's marketplace, RP's templates, Juggernaut's blocks). These are the
  products. Taking them is taking the product.
- Reproducing a named commercial program's actual prescription as BodyT content. BodyT may
  *recognize* the shape of a program a user pasted. It may not *ship* that program.
- Building an importer that authenticates into a competitor's account to pull data the
  athlete has not exported themselves. An athlete exporting their own CSV and handing it to
  BodyT is fine; BodyT logging in as them is not.
- Turning imported routines into a shared BodyT library without an explicit, separate,
  per-routine grant from the person who typed it.

**The line, in one sentence:** BodyT may read what a person hands it and may keep what it
learns about *notation and naming* (the alias table in section 4.5 is legitimately shared
learning, because a surface form is not creative expression), but the routine's content
stays with the person who brought it.

**One nuance worth flagging to the owner.** Program *structure* is generally not
copyrightable in the way prose is, and the family taxonomy in R5 (`5/3/1`-shaped,
`upper-lower`, `PPL`) is descriptive classification, not reproduction. But BodyT should
still not present "here is the Boostcamp version of this" or use a competitor's program
names as BodyT product surface. Classify into R5's family ids (`F3 push-pull-legs`), never
into a brand.

---

## 2. THE IMPORT PROBLEM, DECOMPOSED

Six stages. Each is a pure function, each is independently testable, each fails loudly
rather than guessing. The whole pipeline is synchronous, deterministic, and runs in the
`plan/` layer, which `src/structure.test.ts:157-168` ranks 0 and which therefore may import
nothing but `types.ts` and its own siblings. That is the correct home: the parser needs
`EXERCISES`, `MOVEMENT` and `EXERCISE_MUSCLES`, all of which live in `plan/`.

```
raw text
  |
  S0  normalize          -> RawLine[]        (never throws, never drops a line)
  |
  S1  segment            -> ImportBlock[]    (day headers, week headers, exercise lines, notes)
  |
  S2  resolve movement   -> Resolution       (R-ONT section 5 order, verbatim)
  |
  S3  read prescription  -> PrescriptionRead (section 3's 61 rules)
  |
  S4  infer structure    -> WeekShape        (split, frequency, R5 family guess)
  |
  S5  score and residue  -> ImportAttempt    (tiers, questions, nothing silent)
  |
  athlete confirms  ->  PlanConfig  ->  the existing normalizeBooklet / validateBooklet path
```

The last arrow matters: **the parser's output is a `PlanConfig` draft and nothing else.**
It does not get its own commit path, its own storage, or its own screen stack. It produces
the same draft `BookletEditor` already edits (`src/screens/booklet/BookletEditor.tsx:22`)
and hands it to the same `validateBooklet` gate (`src/plan/bookletOps.ts:157`) the manual
path uses. Everything downstream (tier fallbacks, anchors, tracked lifts, min-viable
recipes, rationale) is regenerated by `normalizeBooklet` (`src/plan/bookletOps.ts:202`)
exactly as it is for a hand-built week. An importer that needed a parallel commit path
would be the wrong design.

### 2.1 S0, normalize

Deterministic and lossless. The one rule that matters: **the original line is retained on
every downstream artifact**, because section 4's repair UI has to show the athlete their
own words, and section 5's advisory pass has to quote them.

| step | rule | why |
|---|---|---|
| decode | accept `\r\n`, `\r`, `\n`; NFKC normalize | pasted-from-Notes and pasted-from-Sheets differ |
| strip zero-width | remove U+200B..U+200D, U+FEFF | survives a copy out of a PDF |
| unify dashes | map U+2010..U+2015 and U+2212 to ASCII `-` **for matching only** | `8–12` must read as a range; `reps.ts:46` already accepts one of these |
| unify multiplication | map `×` and `X` (when between digits) to `x` | `3×8`, `3X8`, `3x8` are one form |
| collapse whitespace | runs of space and tab to one space, trim | tab-separated spreadsheet paste |
| keep indentation depth | record leading-whitespace count **before** collapsing | indentation is the only superset marker some people use |
| number the lines | `{ index, raw, normalized, indent }` | provenance, and the repair UI's anchor |

Nothing here decides anything. A line that is pure emoji survives to S1 and gets classified
as a note.

### 2.2 S1, segment

Classify each line into exactly one of seven kinds. Classification is by ordered rule, first
match wins, and every rule is a regex over the normalized line.

| kind | recogniser (sketch) | example |
|---|---|---|
| `week-header` | `^\s*(week\|wk\|w)\s*#?\s*(\d+)` or `^\s*(\d+)\s*(?:st\|nd\|rd\|th)\s+week` | `Week 3`, `WK2`, `4th week` |
| `day-header` | a weekday name or abbreviation; or `^\s*day\s*#?\s*\d+`; or `^\s*(push\|pull\|legs\|upper\|lower\|full body\|chest\|back\|arms\|shoulders\|a\|b\|c)\s*[:\-]?\s*$` | `Monday`, `Day 1`, `Push A:` |
| `exercise-line` | contains at least one prescription token (section 3) **and** at least one non-numeric word | `Bench press 3x8 @ 8` |
| `superset-marker` | `^\s*(?:s\d\|superset\|ss\|circuit\|giant set)\b` or a bare `A1)`/`B2.` prefix | `A1) Bench`, `Superset:` |
| `rest-line` | `^\s*rest\b` or a bare duration on its own line | `Rest 3 min` |
| `note` | anything else with letters | `keep the elbows tucked` |
| `blank` | empty after normalization | separator, and a weak day boundary |

**The hardest single decision in the whole pipeline is `day-header` versus `exercise-line`,**
because `Legs` is a day and `Leg press` is an exercise, and `Squat day` is a day while
`Squat 5x5` is an exercise. Three disambiguators, applied in order, all lexical:

1. If the line contains a prescription token, it is an exercise line. `Legs 4x10` is an
   exercise (a badly named one), and S2 will fail to resolve `Legs` and ask. That is the
   correct behaviour: it is better to ask about a weird exercise than to silently swallow a
   day's worth of work into a header.
2. If the line ends in `:` and has no prescription token, it is a header.
3. If the line is short (three words or fewer), has no prescription token, and matches the
   day-name vocabulary, it is a header. Otherwise it is a note.

**Day boundaries** come from `day-header` lines, and where a routine has none (a flat list),
from a blank-line run of two or more, and where there is neither, the whole paste is one
day and S4 says so out loud. Never infer a day boundary from exercise count.

**Week handling.** A `week-header` opens a week scope. All subsequent day blocks belong to
it until the next `week-header`. Multi-week input is the case where BodyT's data model
genuinely cannot hold what was pasted (section 6.6 and section 7.4): `PlanConfig` has no
week axis. The honest behaviour is to import week 1 as the routine, record every later week
verbatim as provenance, and tell the athlete exactly that. Not to average the weeks. Not to
silently drop them.

### 2.3 S2, resolve the movement name

**This stage is R-ONT section 5, reused, not reinvented.** The resolution order at
`research/RONT-exercise-ontology.md:667` is adopted verbatim:

```
1. exact id match                          -> resolve
2. exact normalized-name match             -> resolve
3. ALIASES lookup, confidence >= 0.9       -> resolve
4. ALIASES lookup, 1 hit below threshold   -> SUGGEST (one tap), never auto
5. token-set + trigram score over catalog  -> top 5 SUGGEST
6. nothing above floor                     -> "I don't know that one" + add-custom path
```

R17 adds exactly four things to it, and nothing else:

**(a) A name-extraction step in front of it.** R-ONT's resolver takes a name. An import line
is `"Barbell Bench Press - 4 x 6 @ 80% (2 min rest)"`. The extraction rule: **remove every
span that section 3 matched as a prescription token, remove any leading superset marker,
remove any trailing parenthetical that is entirely prescription tokens, and the longest
remaining contiguous run of word characters is the name candidate.** Parentheticals that
are *not* prescription tokens are kept as R-ONT's `qualifier`, per
`RONT-exercise-ontology.md:646`, because the parenthetical is sometimes the whole
distinction (`Turkish Get-Up (Squat style)`).

**(b) An import-specific abbreviation layer, on top of R-ONT's table.** R-ONT's step-3
abbreviation expansion (`db`, `bb`, `kb`, `ohp`, `rdl`, `sldl`, `bw`, `bss`, `ghr`, `cgbp`)
is authored for catalog reconciliation. Imports carry a wider, messier set that is worth
listing because it is the difference between resolving and asking:

| surface | expands to | note |
|---|---|---|
| `bp`, `bb bp` | bench press | `bp` is ambiguous with blood pressure; safe only when a prescription token is on the line |
| `ohp`, `mp`, `strict press` | overhead press | |
| `dl`, `cdl` | deadlift, conventional deadlift | |
| `sq`, `bs`, `back squat` | squat, back squat | `bs` is risky, keep it below threshold |
| `fs` | front squat | resolves to `front-squat` |
| `rdl`, `sldl`, `sldl` | romanian / stiff-leg deadlift | R-ONT already has these |
| `pu` | pull-up **or** push-up | **permanently ambiguous, must always ask** |
| `chins`, `chinups` | chin-up | |
| `bor`, `bb row`, `pendlay` | barbell row | Pendlay is a distinct variation; suggest, do not merge |
| `dbs`, `db's` | dumbbell (adjectival) | strip, do not treat as a movement |
| `lat pulls`, `pulldowns` | lat pulldown | |
| `hs press`, `machine press` | machine chest press | `hs` = Hammer Strength, a brand |
| `skullcrushers`, `skulls` | lying tricep extension | **no catalog id today**, see 6.5 |
| `ghr`, `nordics` | glute-ham raise, nordic curl | two distinct catalog ids, do not merge |
| `hip thrusts`, `ht` | hip thrust | |
| `calf raises` | calf raise | three catalog ids compete; must disambiguate on standing / seated / single-leg |
| `abs`, `core` | (not a movement) | classify as a note, never resolve |

**(c) A disambiguation gate on catalog collisions.** BodyT's catalog contains
`single-leg-calf-raise`, `seated-calf-raise`, `double-leg-calf-raise`,
`bodyweight-calf-raise` and `standing-calf-machine` (`src/plan/equip.ts:21`,
`src/plan/generator.ts:165` calf pool, `src/plan/equip.ts:292`). A bare `calf raise` is
five-way ambiguous and must produce five suggestions, never a winner. The same applies to
`row` (`barbell-row`, `one-arm-db-row`, `seated-cable-row`, `inverted-row`,
`chest-supported-row`, `band-row`), `press`, `curl` and `lunge`. R-ONT's flat-array alias
shape (`RONT-exercise-ontology.md:623`, chosen so "a surface form can legitimately be
ambiguous") is exactly what makes this expressible.

**(d) An equipment-token side channel.** Words the extractor strips as equipment
(`barbell`, `dumbbell`, `machine`, `cable`, `smith`, `band`, `kettlebell`) are not
discarded. They are handed to the scorer as a filter over `EXERCISE_EQUIP`
(`src/plan/equip.ts:10`, 194 rows, 100% coverage). `"cable row"` scores
`seated-cable-row` above `barbell-row` because the equipment token matches. This is cheap,
deterministic, and it is the single highest-yield disambiguator available.

### 2.4 S3, read the prescription

Section 3 is the whole of this stage. Two structural rules govern it:

**Rule 1: match longest-first, left-to-right, non-overlapping, and record the span.** Every
matched span is removed from the name-candidate string in S2(a). A token that matches two
rules goes to the longer match: `4x5 @ 80%` must match the percentage rule, not the sets
rule and then a stray `80`.

**Rule 2: an unmatched numeric span is a hard signal, not noise.** If a line has digits that
no rule claimed, the line drops to tier T3 (section 4) and the residue is shown. This is
what stops the parser reading `Bench 3x8, then 2x20 pushups` as one exercise and quietly
losing the pushups.

### 2.5 S4, infer the week

Three outputs, in increasing order of how wrong they can be.

**(i) Frequency.** Count of distinct day blocks. Trivially correct, and it is the number
that drives the "will this fit your week" advisory in section 5.

**(ii) Weekday mapping.** `PlanConfig.tier1ByWeekday` (`src/types.ts`, set at
`src/plan/bookletOps.ts:110`) needs a weekday per training day. Three cases:

- The routine names weekdays. Map directly. This is the only case with no guessing.
- The routine names `Day 1..N`. **Do not assign weekdays.** Present the N days and let the
  athlete drag them onto the week, which is what `BookletEditor`'s day list already does
  (`src/screens/booklet/BookletEditor.tsx:141-177`). Users never pick reps; users
  absolutely do pick which day they train.
- The routine names `A/B` or `Upper/Lower`. Same as `Day 1..N`, with the labels preserved as
  `DayTemplate.title`.

**(iii) Split and family classification.** Classify the parsed week into one of R5's ten
families (`research/R5-program-families.md:340`). This is **advisory metadata, not a
transform**: nothing about the athlete's routine changes because it got classified. The
classification exists so section 5's advisory pass can compare like with like, and so the
engine knows it is running F9 `preserve-and-repair` with
`progression_model.kind: 'preserve'` (`research/R5-program-families.md:434`).

The classifier is a small decision table over per-day muscle tallies, reusing the tally
`src/plan/analyze.ts:46` already computes:

| observed | family |
|---|---|
| every day trains push, pull and legs | `F1 full-body-minimalist` |
| days alternate {upper muscles} / {lower muscles}, 4 days | `F2 upper-lower` |
| a 3-cycle of {push muscles} / {pull muscles} / {lower muscles} | `F3 push-pull-legs` |
| 1-3 movements per day, low rep text, high day count on one lift | `F4 strength-priority` |
| more than 12 sets on a single muscle region in a week | `F5 hypertrophy-priority` |
| any `kind: 'jump'` or `kind: 'sprint'` present | `F6 athletic-power` |
| any `kind: 'cardio'` above 20 minutes, more than once | `F7 endurance-concurrent` |
| every resolved id is `equipFor(id) === ['none']` | `F8 home-minimal` |
| **always, for any imported routine** | `F9 preserve-and-repair` as the *mode* |

The last row is the important one: F9 is not one of the alternatives, it is the frame. The
structural family is a *description* of what the athlete brought.

### 2.6 S5, score and surface the residue

Nothing in stages S0..S4 is allowed to discard a line. S5 collects everything that did not
land and turns it into the confirmation set. Four residue classes, all of which have a
different question attached:

| residue | example | question asked |
|---|---|---|
| unresolved movement | `Skullcrushers 3x12` | "Which of these is it?" plus a search box |
| ambiguous movement | `Calf raises 4x15` | "Standing, seated, or one leg at a time?" |
| unread numeric span | `Bench 3x8 (last set +5)` | "What is the +5?" with the raw line shown |
| structure that will not fit | `Week 2: 3x3 @ 85%` | "Your plan runs weeks. BodyT runs one week that adapts. Keep week 1?" |

Counting these is the import's quality metric, and section 8's fixtures assert on it.

---

## 3. THE NOTATION CORPUS

The reusable artifact. 61 rules, grouped, each with the rule that reads it and the repo
shape it lands in. Conventions used in the table:

- All regexes assume S0 normalization has run: lowercase, ASCII dashes, `x` for the
  multiplication sign, single spaces. Dash classes are written with a `\u2013` escape so a
  rule can be pasted into TypeScript without a stray Unicode character surviving the copy.
- **Landing site** names a real field. Three markers appear:
  - `LIVE` means the field exists in the repo today and the value fits.
  - `R-ONT` means the field is one R-ONT section 7.3 already proposed
    (`research/RONT-exercise-ontology.md:922`) and R17 depends on it landing.
  - `NEW` means neither exists and section 7 proposes it.
- `SETS` = `PrescriptionBase.sets` (`src/types.ts:60`), `REPTEXT` =
  `PrescriptionBase.repText` (`src/types.ts:62`), `REPSNUM` = `PrescriptionBase.repsNum`
  (`src/types.ts:64`).

### 3.1 Sets by reps, the core forms

| # | notation | rule | lands in | notes |
|---|---|---|---|---|
| 1 | `3x8` | `/\b(\d{1,2})\s*x\s*(\d{1,3})\b/` | `SETS=3`, `REPTEXT="8"`, `REPSNUM=8` LIVE | the modal form; `repsNum` set because it is a plain count |
| 2 | `3 x 8` | same rule, whitespace already collapsed | as above | |
| 3 | `3X8`, `3×8` | S0 folds `X` and `×` to `x` | as above | the fold must be digit-adjacent only, or `x` in `x-band` breaks |
| 4 | `3*8` | `/\b(\d{1,2})\s*\*\s*(\d{1,3})\b/` | as above | spreadsheet paste |
| 5 | `8x3` where reps > sets is implausible | reps <= 30 and sets <= 12 heuristic; if both plausible, **do not swap** | as above, plus a T3 flag | `5x5` is symmetric and fine; `12x3` is genuinely ambiguous, ask |
| 6 | `3 sets of 8` | `/\b(\d{1,2})\s*sets?\s*(?:of\|x)\s*(\d{1,3})\b/` | as row 1 LIVE | |
| 7 | `3 sets, 8 reps` | `/\b(\d{1,2})\s*sets?\b[^\n]{0,12}?\b(\d{1,3})\s*reps?\b/` | as row 1 LIVE | bounded gap, or it swallows the next exercise |
| 8 | `8 reps x 3 sets` | `/\b(\d{1,3})\s*reps?\s*x\s*(\d{1,2})\s*sets?\b/` | `SETS` = second capture | order reversed, explicit words disambiguate |
| 9 | `3 x 8-12` | `/\b(\d{1,2})\s*x\s*(\d{1,3})\s*[-\u2013]\s*(\d{1,3})\b/` | `SETS=3`, `REPTEXT="8-12"`, `REPSNUM` **unset** LIVE | `engine/reps.ts:41` `parseRepRange` reads the range and shows ONE number by double progression. This is the rule that satisfies "users never pick reps" for imported input |
| 10 | `3 x 8/10/12` | `/\b(\d{1,2})\s*x\s*(\d{1,3})(?:\s*\/\s*(\d{1,3})){1,4}\b/` | `SETS`= count of slash values, `REPTEXT` = first, per-set list to `NEW setReps[]` | ramping reps per set; today BodyT has one prescription per exercise, so this is a **loss** unless section 7.3 lands |
| 11 | `5/3/1` (as a program name) | `/\b5\s*\/\s*3\s*\/\s*1\b/` on a **header or note** line | `NEW ImportAttempt.programHint` | must not be read as rule 10; the disambiguator is that 5/3/1 appears without an `x` and usually on a title line |
| 12 | `5,3,1` | `/\b(\d{1,3})(?:\s*,\s*(\d{1,3})){1,5}\b/` after an `x` or `sets` token | as row 10 | comma-separated per-set reps |
| 13 | `3x5+` | `/\b(\d{1,2})\s*x\s*(\d{1,3})\s*\+/` | `SETS=3`, `REPTEXT="5+"`, `NEW lastSetAmrap=true` | the 5/3/1 idiom: last set is a rep-out |
| 14 | `1x5, 1x3, 1x1` on one line | split on `,` then apply row 1 to each | three `TemplateEntry` rows for the same movement, or `NEW setGroups[]` | today this collapses to one entry: **loss** |
| 15 | `4 working sets` | `/\b(\d{1,2})\s*working\s*sets?\b/` | `SETS` LIVE, `REPTEXT` unresolved -> T3 | sets known, reps not; ask |
| 16 | `2 warmup + 3 working` | `/(\d{1,2})\s*warm-?ups?\s*\+\s*(\d{1,2})\s*working/` | `SETS` = working only; warmup count to `NEW warmupSets` | BodyT prescribes working sets; warmups are the engine's job |
| 17 | `3x` with no reps | `/\b(\d{1,2})\s*x\s*(?![\d])/` | `SETS` LIVE, `REPTEXT` -> T3 | very common in shorthand notes |
| 18 | `x8` with no sets | `/(?<!\d)\s*x\s*(\d{1,3})\b/` | `REPTEXT` LIVE, `SETS` defaults to **T3 question**, never to 3 | defaulting sets silently is a guess |

### 3.2 Rep qualifiers and non-numeric prescriptions

| # | notation | rule | lands in | notes |
|---|---|---|---|---|
| 19 | `AMRAP` | `/\bamrap\b/` | `REPTEXT="max"` LIVE, `R-ONT unit='amrap'` | `max` is already the repo's literal (`RONT:892`, 6 occurrences); reuse it rather than adding a synonym |
| 20 | `as many reps as possible` | `/\bas many reps as possible\b/` | as row 19 | |
| 21 | `3 sets to failure` | `/\bto\s*(?:muscular\s*)?failure\b/` | `SETS` from the line, `REPTEXT="max"` LIVE | |
| 22 | `AMRAP 12` (a 12-minute AMRAP) | `/\bamrap\s*(\d{1,2})\s*(?:min\|')/` or `/\b(\d{1,2})\s*min\s*amrap\b/` | `R-ONT unit='time'`, `seconds=n*60`, `NEW format='amrap-time'` | CrossFit sense, structurally different from row 19. The disambiguator is a following duration |
| 23 | `EMOM 10` | `/\bemom\s*(\d{1,2})\b/` | `NEW format='emom'`, `R-ONT unit='time'`, `seconds=n*60` | every minute on the minute; **no home in `PlanConfig` today** |
| 24 | `E2MOM 20` | `/\be(\d)mom\s*(\d{1,2})\b/` | as row 23 with `intervalSec` | |
| 25 | `21-15-9` | `/\b21\s*[-\u2013]\s*15\s*[-\u2013]\s*9\b/` | `NEW format='rounds-descending'` | CrossFit couplet; must NOT read as a rep range |
| 26 | `5 rounds` | `/\b(\d{1,2})\s*rounds?\b/` | `SETS` LIVE, `R-ONT unit='rounds'` | repo already ships `8-12 rounds` literals (`RONT:898`) |
| 27 | `max` / `max hold` | `/\bmax(\s*hold)?\b/` | `REPTEXT="max"` / `"max hold"` LIVE | both literals already exist in the catalog |
| 28 | `3x8 each side` | `/\beach\s*(?:side\|leg\|arm)\b/` | `REPTEXT="8 / side"` LIVE, `R-ONT perSide='per-side'` | the repo has four separators in use (`/ leg`, `/ side`, `/ arm`, `each`, `RONT:895`); pick one on import and let R-ONT's closed-separator test hold the line |
| 29 | `3x8/side`, `3x8 per side` | `/\b(?:per\s*\|\/\s*)(side\|leg\|arm)\b/` | as row 28 | |
| 30 | `3x8 e/s`, `3x8 ea` | `/\be(?:\/\|a\b)s?\b/` | as row 28 | |
| 31 | `3 x 20 total` | `/\btotal\b/` | `R-ONT perSide='alternating-total'` | the distinction row 28 must not lose: 20 total is 10 per side |
| 32 | `1 set of 20, alternating` | `/\balternating\b/` | as row 31 | |
| 33 | `3x8 (each way)` | as row 28 | as row 28 | rotational and lateral drills |
| 34 | `3 x max` | rows 1 and 27 composed | `SETS=3`, `REPTEXT="max"` LIVE | |

### 3.3 Intensity: RPE, RIR, percentages, absolute load

| # | notation | rule | lands in | notes |
|---|---|---|---|---|
| 35 | `@8`, `@ 8` | `/@\s*(\d{1,2}(?:\.\d)?)\b(?!\s*%)/` with value 5..10 | `NEW rpe: number` | the negative lookahead is what keeps `@ 80%` out |
| 36 | `RPE 8` | `/\brpe\s*(\d{1,2}(?:\.\d)?)\b/` | as row 35 | |
| 37 | `@8.5`, `RPE 7.5` | same rules, decimal captured | as row 35 | half-points are standard and must not be truncated |
| 38 | `RPE 7-8` | `/\brpe\s*(\d{1,2})\s*[-\u2013]\s*(\d{1,2})\b/` | `NEW rpeLow`, `rpeHigh` | a range of effort is not a range of reps; do not route it to `parseRepRange` |
| 39 | `2 RIR`, `RIR 2` | `/\b(?:rir\s*(\d)\|(\d)\s*rir)\b/` | `NEW rir: number` | BodyT already reads RIR at log time (`src/engine/reps.ts:89` `log.rir`), so this is the one intensity field with a live consumer |
| 40 | `leave 2 in the tank` | `/\bleave\s*(\d)\s*in the tank\b/` | as row 39 | |
| 41 | `@ 80%` | `/@?\s*(\d{2,3})\s*%/` with value 30..110 | `NEW pctOfMax: number` | needs a reference max to become a weight; see 3.7 |
| 42 | `80% 1RM` | `/\b(\d{2,3})\s*%\s*(?:of\s*)?1\s*rm\b/` | as row 41, `NEW pctRef='1rm'` | |
| 43 | `80% TM` | `/\b(\d{2,3})\s*%\s*(?:of\s*)?t\.?m\.?\b/` | as row 41, `NEW pctRef='training-max'` | 5/3/1's training max is 90% of 1RM; the reference matters |
| 44 | `@ bodyweight`, `@ BW` | `/@\s*(?:bw\|bodyweight)\b/` | `NEW loadRef='bodyweight'` | |
| 45 | `225 lb`, `100kg`, `60 kilos` | `/\b(\d{1,4}(?:\.\d)?)\s*(lbs?\|kgs?\|kilos?\|#)\b/` | `NEW loadLb: number` with kg converted | `#` is a real and common lb marker on forums |
| 46 | `+25`, `bw+25` | `/\bbw\s*\+\s*(\d{1,3})\b/` or leading `\+(\d{1,3})` | `NEW loadRef='bodyweight'`, `loadLb` | weighted pull-ups and dips |
| 47 | `2 plates`, `3 plates a side` | `/\b(\d)\s*plates?\b/` | `NEW loadLb` = `45*2*n + 45` (bar) **only as a suggestion** | plate math is regional (20kg vs 45lb bars); never auto-apply, always show the number for confirmation |
| 48 | `top set`, `back-off` | `/\b(top\s*set\|back-?off\|backdown)\b/` | `NEW setRole: 'top' \| 'backoff'` | pairs with row 14 |
| 49 | `heavy single`, `x1 heavy` | `/\bheavy\s*(single\|double\|triple)\b/` | `SETS=1`, `REPTEXT="1"`, `NEW rpe=9` **suggested, not applied** | a word is not a number; suggest and confirm |

### 3.4 Time, distance and pace

| # | notation | rule | lands in | notes |
|---|---|---|---|---|
| 50 | `30 sec`, `30s`, `30"` | `/\b(\d{1,3})\s*(?:s\b\|sec\b\|secs\b\|seconds\b\|")/` | `REPTEXT="30 sec"` LIVE, `R-ONT unit='time'`, `seconds=30` | repo literal already exists 5 times (`RONT:892`) |
| 51 | `2 min`, `2'`, `2:00` | `/\b(\d{1,3})\s*(?:m\b\|min\b\|mins\b\|minutes\b\|')/` and `/\b(\d{1,2}):(\d{2})\b/` | `R-ONT unit='time'`, `seconds` | `2:00` is ambiguous with a clock time; require a duration context word or a preceding `x` |
| 52 | `40-60 sec` | `/\b(\d{1,3})\s*[-\u2013]\s*(\d{1,3})\s*sec\b/` | `REPTEXT="40-60 sec"` LIVE | `parseRepRange` already handles this exact shape and keeps the suffix verbatim (`src/engine/reps.ts:53` `suffixOf`) |
| 53 | `3 x 20 m`, `20m sprint` | `/\b(\d{1,4})\s*(m\b\|meters?\b\|yds?\b\|yards?\b)/` | `R-ONT unit='distance'`, `meters` | yards converted, value preserved for display |
| 54 | `5k`, `3 miles` | `/\b(\d{1,2}(?:\.\d)?)\s*(k\|km\|mi\|miles?)\b/` | `R-ONT unit='distance'`, `meters` | endurance import; R8 territory |
| 55 | `8x100m @ 75%` | rows 1, 53, 41 composed | `SETS`, `meters`, `pctOfMax` | track work; the percentage here is of max **velocity**, not 1RM. Flag `pctRef='unknown'` and ask rather than assuming |
| 56 | `easy pace`, `Z2`, `zone 2` | `/\bz(?:one)?\s*([1-5])\b/` or a fixed pace vocabulary | `NEW intensityWord` | prose intensity, kept as `DayTemplate.note` (`src/types.ts:101`) |

### 3.5 Structure: supersets, circuits, rest

| # | notation | rule | lands in | notes |
|---|---|---|---|---|
| 57 | `A1) Bench  A2) Row` | `/^\s*([a-h])([1-9])\s*[\).\-:]/` | two lines sharing letter `A` become one `TemplateEntry` of `entry: 'ab'` (`src/types.ts:70`) | the repo shape exists and holds exactly two; a three-movement `A1/A2/A3` **overflows it**, see 6.5 |
| 58 | `Superset: Bench + Row` | `/^\s*(?:super\s*set\|ss)\s*:?/` then split on `+` or `/` | as row 57 | |
| 59 | indentation under a parent | S0's retained `indent` count, deeper than the previous exercise line | as row 57 | the only marker some people use |
| 60 | `Circuit x 3` / `Giant set` | `/\b(circuit\|giant\s*set\|tri-?set)\b/` | more than two movements: **no repo shape**, see 6.5 | must be flagged, never silently truncated to the first two |
| 61 | `rest 90s`, `rest 2-3 min`, `90s rest` | `/\brest\s*:?\s*(\d{1,3})\s*(s\|sec\|m\|min)/` and the mirrored order | `NEW restSec` on the prescription | **today rest is a catalog constant** (`ExerciseDef.restSec`, `src/types.ts:45`) and cannot vary per prescription. This is a real loss, see 6.5 |

### 3.6 Tempo, which is its own small language

| notation | rule | lands in | notes |
|---|---|---|---|
| `3-1-1-0`, `3010` | `/\b([0-9x])\s*[-\/]?\s*([0-9x])\s*[-\/]?\s*([0-9x])\s*[-\/]?\s*([0-9x])\b/` in a tempo context | `R-ONT tempo?: string` on `PrescriptionBase` (`RONT:930`) | four digits: eccentric, pause, concentric, pause. `x` means explosive. **The bare four-digit form `3010` is dangerous**: it collides with nothing in the corpus only because no rep count reaches four digits, so require either separators or the word `tempo` |
| `tempo 3-0-1-0` | `/\btempo\s*:?\s*/` prefix | as above | the safe form |
| `2 sec down`, `slow eccentric`, `pause reps` | fixed vocabulary | `DayTemplate.note` or `NEW cueNote` | prose tempo, not machine-readable, and should not pretend to be |
| `1 1/4 reps` | `/\b1\s*1\s*\/\s*4\s*reps?\b/` | `NEW variantNote` | must not parse as a fraction or a per-side marker |

R-ONT's ruling stands and R17 adopts it: **tempo is a prescription property, not a catalog
property** (`research/RONT-exercise-ontology.md:451`), and if it ships it ships as one
prescribed string, never as a menu.

### 3.7 Week-by-week percentage tables

The hardest input shape, and the one BodyT's data model is least able to hold. The canonical
form people paste:

```
        Week 1      Week 2      Week 3      Week 4
Squat   5x5 @70%    5x5 @75%    3x3 @85%    5x5 @70% (deload)
Bench   5x5 @70%    5x5 @75%    3x3 @85%    5x5 @70%
```

Recogniser: a line whose leading token resolves as a movement name and whose remaining
tokens split into 2 or more spans that each independently match section 3.1 plus 3.3.
Column headers are optional; the count of spans is the week count.

**What BodyT can honestly do with it:**

1. Parse every cell. All of them. Do not drop weeks at parse time.
2. Import **week 1** as the routine, because `PlanConfig.templates` has no week axis and
   `daysPerWeek` (`src/plan/bookletOps.ts:107`) is a single number.
3. Store the full grid verbatim as `NEW ImportAttempt.rawSource` plus a parsed
   `weekGrid[][]`, so nothing the athlete typed is lost.
4. **Say so, in one sentence, at confirmation time:** "Your plan runs four different weeks.
   BodyT runs one week that changes as you train. I have taken week 1 and kept the rest on
   file." Then let them pick a different week if they want.
5. Never average the weeks. Never take the heaviest. Never silently discard.

**And say what the tradeoff is.** BodyT's own block system (`slots` for blocks 1/2/3 at
`src/plan/bookletOps.ts:113`, deload every 4th week per `src/plan/analyze.ts:236`) is a
different answer to the same problem: the athlete's grid is authored variation, BodyT's is
derived variation. An athlete who pasted a four-week grid chose authored variation on
purpose, and F9 `preserve-and-repair` says do not overwrite that choice
(`research/R5-program-families.md:434`). The honest resolution is the sentence in step 4
plus an owner decision recorded in section 9.

### 3.8 Percentage-to-weight, and why it is a question not a calculation

Rules 41 to 43 produce a percentage. Turning it into a weight needs a reference max, and
BodyT has one: `src/engine/startWeight.ts` derives starting loads, and the tracked-lift
history carries real numbers. Three cases, all of which end in a suggestion:

| the athlete has | behaviour |
|---|---|
| logged history for the resolved lift | suggest `pct * estimated1RM`, show both numbers, let them overwrite |
| no history but stated a max in the paste (`squat 315`) | suggest from the stated number, labelled as theirs |
| neither | **do not invent a load.** Import the percentage as a note, prescribe the sets and reps, and let `startWeight` do its normal job on session one |

A percentage silently resolved to a weight is the load-spiral failure mode wearing a
different hat. Suggest only.

---

## 4. THE CONFIDENCE AND REPAIR MODEL

The governing sentence: **the app must never silently guess a movement wrong.** Everything
here follows from that, and from the two standing constraints it serves, "suggest only,
never auto" and the load-spiral lesson that a quiet confident wrong answer costs more than
a visible question.

### 4.1 Five tiers

Confidence is assigned per **line**, not per import, because an import is mostly right and
locally wrong, and treating it as one number would either block a good import on one bad
line or wave a bad line through with a good average.

| tier | condition | UI treatment | commits without a tap? |
|---|---|---|---|
| **T0 exact** | R-ONT step 1 or 2: the typed name is a catalog id or an exact normalized catalog name, and every numeric span on the line was claimed by a section 3 rule | shown in the review list, no badge | **yes** |
| **T1 confident** | R-ONT step 3: an `ALIASES` hit at confidence >= 0.9, all spans claimed | shown with the matched catalog name and a quiet "matched" affordance to change it | **yes** |
| **T2 suggested** | R-ONT step 4, or a fuzzy top candidate scoring above the accept floor with a clear gap to second place | shown as `your words -> our name`, with a tap target on the name | **no.** A single confirm-all is allowed for a batch of T2 lines, because tapping 14 correct suggestions individually is friction with no safety value |
| **T3 ambiguous** | R-ONT step 5 (multiple candidates, no clear winner), **or** any line with an unclaimed numeric span, **or** a catalog collision from 2.3(c) | shown as a question with up to 5 named options plus a search box; the raw line quoted verbatim above it | **no, never batched** |
| **T4 unresolved** | R-ONT step 6: nothing above the floor | shown as "I do not know this one", with three exits: search the catalog, drop the line, or keep it as a note on the day | **no** |

**The commit gate.** An import commits when **every T3 and T4 line has an answer**. T2 lines
may be confirmed in one action. T0 and T1 need nothing. This is deliberately stricter than
`validateBooklet` (`src/plan/bookletOps.ts:157`), which only rejects unknown ids, missing
titles and under-two-exercise days: the import gate runs first, and hands
`validateBooklet` a plan that already has no unknowns.

**Scoring, stated so it is reproducible.** R-ONT section 5.5 already fixed the scorer for
corpus dedupe (`RONT:712`): `0.45 * trigramJaccard(normalizedName) + 0.25 *
tokenSetOverlap + 0.15 * muscleSetJaccard + 0.15 * equipExactMatch`. For import, the muscle
term is unavailable (an unresolved string has no muscles), so R17 reweights to
`0.55 * trigramJaccard + 0.30 * tokenSetOverlap + 0.15 * equipTokenMatch`, where
`equipTokenMatch` uses the equipment words S2(d) stripped off the line against
`EXERCISE_EQUIP` (`src/plan/equip.ts:10`). Thresholds are **HOUSE HEURISTIC** and must be
tuned against section 8's fixtures before being trusted: `>= 0.82` and a gap of `>= 0.10`
to the runner-up is T2; `>= 0.55` is T3; below that is T4. Publish the numbers in code as
named constants next to R-ONT's `CONFIRM_THRESHOLD` so they are one grep away.

**Two hard vetoes, applied after scoring, borrowed from R-ONT 5.5 stage 3.** A candidate is
discarded regardless of score when it disagrees with an explicit token on the line about
**equipment class** or **laterality**. `"single arm db row"` must never resolve to
`barbell-row` no matter how the trigrams fall, because `single arm` is an explicit
laterality assertion and `db` is an explicit equipment assertion. This is the veto that
stops the most embarrassing class of wrong answer.

### 4.2 What the athlete actually sees

One screen, one list, ordered **questions first**. Not a wizard, not one modal per line.
The reason is measured elsewhere in this repo: the BYOR builder's per-day sheet is already
the slowest part of onboarding, and an import that replaces it with 30 modals is not an
improvement.

```
  Here's what I read.                        [ 24 lines, 3 questions ]

  ! Calf raises 4x15
    Standing, seated, or one leg at a time?
    [ Standing calf ] [ Seated calf ] [ Single-leg calf ] [ search... ]

  ! Skullcrushers 3x12
    I don't know that one.
    [ search the catalog ]  [ keep as a note ]  [ drop it ]

  ! Bench 3x8 (last set +5)
    I read 3 sets of 8. What is the "+5"?
    [ added weight ] [ extra reps ] [ just a note ]

  ---------------------------------------------------------------
  Monday                                     [ 6 exercises ]
    Bench press          3 x 8 @ RPE 8       (exact)
    Barbell row          3 x 8
    "DB shoulder press"  ->  Dumbbell Shoulder Press   [ change ]
    ...
                                       [ Looks right, all 11 ]
```

Four rules about this screen:

1. **The athlete's own words are always visible.** `your words -> our name` is the T2 row
   format, never just the catalog name. R-ONT's warning applies directly: a name matcher is
   "a candidate generator that a human confirms, never an authority"
   (`RONT-exercise-ontology.md:617`).
2. **Questions are questions, not warnings.** No red. A routine with three unresolved lines
   is a normal routine, not a broken one.
3. **The advisory pass (section 5) does not run here.** Resolution and opinion are separate
   screens, in that order. Mixing "which calf raise did you mean" with "you have no lower
   body pull" on one screen makes both harder to act on, and it makes the app look like it
   is arguing with a routine it has not finished reading.
4. **Dropping a line is a first-class option, and it is remembered as a drop**, not as a
   parse failure. Someone who pastes a routine with a yoga class in it should be able to say
   "not that" once.

### 4.3 How a confirmed repair is remembered

Three storage scopes, and getting the scope right is what makes the rule "never asks twice"
true rather than aspirational.

| scope | holds | lives in | lifetime |
|---|---|---|---|
| **within one import** | a confirmation applies to every remaining occurrence of the same normalized key in this paste | the in-memory `ImportAttempt` | the parse |
| **per athlete** | `normalizedKey -> exerciseId`, source `'user'`, confidence 1.0 | `Prefs` (`src/prefsTypes.ts:56`), persisted by `store/prefsSchema.ts` | forever, until the athlete changes it |
| **catalog** | promotions from the per-athlete table into `ALIASES` with source `'ingest'` | `src/plan/aliases.ts` (the file R-ONT section 5.2 already specifies) | ships in the bundle |

**Within one import** is the rule that does the visible work. A person pasting a six-day
program writes `"DB bench"` on three days. They answer once. The implementation is trivial
and it is the difference between an import that feels intelligent and one that feels like a
form: after every confirmation, re-run S2 for every remaining unresolved line and collapse
any that the new mapping now answers, then recount the questions on screen.

**Per athlete** is the rule that satisfies "the same import never asks twice". The key is
the R-ONT normalized form (`RONT-exercise-ontology.md:635`, six deterministic steps ending
in a token sort), not the raw string, so `"DB bench"`, `"db bench"` and `"bench, db"` all
hit the same row. Re-pasting the same routine next January resolves silently at T1.

**Catalog promotion is a batch process with a human gate, and it is not automatic.** R-ONT
section 5.5 stage 4 already established the principle for corpus ingest: "no record enters
`EXERCISES` without a person having seen it". The same holds one level down for aliases.
The promotion rule (**HOUSE HEURISTIC**, to be tuned): a normalized key confirmed to the
same id by **at least 20 distinct athletes with no conflicting confirmations** becomes a
candidate row in `src/plan/aliases.ts` at confidence 0.85, reviewed by a person before it
ships. Conflicting confirmations (the same key mapping to different ids for different
people) are **not** a bug and must not be resolved by majority: `"press"` genuinely means
different things to different people, and the right outcome is that it stays a T3 question
for everyone while each athlete's own answer is remembered.

**The privacy line.** What crosses the athlete boundary is a `(normalizedKey, exerciseId)`
pair and a count. Not the routine, not the day names, not the loads, not the free text. This
is the same distinction section 1.7 draws: notation and naming are shared learning, the
routine's content is not.

### 4.4 Repairs that are not name repairs

Three other confirmations exist and each has the same shape: quote the raw line, offer named
options, remember the answer at the per-athlete scope.

- **Unclaimed numeric span** (section 3 rule set, tier T3 trigger). Options are the small
  closed set from 4.2's example: added weight, extra reps, a note. Remembering this one is
  per-pattern, not per-line: an athlete who says `+5` means added weight once should not be
  asked about `+10`.
- **Sets known, reps unknown** (rules 15 and 17). Never default to 3. Ask, and show what the
  catalog's own templates use for that movement as the pre-filled suggestion.
- **Percentage with no reference max** (section 3.8). Ask for the max or take the sets and
  reps alone. Never compute a load from an assumed max.

### 4.5 The metric

An import path needs one honest number, and it is not "resolution rate". It is
**silent-wrong rate**, and by construction it should be zero: every T2 and above is either
exactly right or visibly confirmed. The numbers worth tracking:

| metric | what it means | target |
|---|---|---|
| silent-wrong rate | a T0 or T1 resolution the athlete later swaps away from within 2 weeks | **0**, and any non-zero value is a bug in the alias table, not a tuning problem |
| questions per import | count of T3 + T4 lines | falling over releases as the alias table grows |
| second-import questions | questions on a re-paste of the same routine | **0**, this is the 4.3 per-athlete rule working |
| abandon rate at the review screen | started an import, did not commit | the real product metric |
| lines lost | lines the athlete dropped | high values mean the segmenter is misreading, not that the athlete is picky |

---

## 5. THE ADVISORY PASS

### 5.1 The rule

An imported routine belongs to the athlete. R5 states the family contract exactly:
F9 `preserve-and-repair` sets `progression_model.kind: 'preserve'` so that block rotation
and phase promotion "leave the user's own lifts alone"
(`research/R5-program-families.md:434`). R17 restates it as three prohibitions and one
permission:

**The app may not:**
- change an exercise, a set count, a rep prescription or a day order that the athlete
  imported
- reorder the week
- add an exercise to a day
- quietly substitute a movement it thinks is better

**The app may:**
- say what it sees, once, in the athlete's presence, with the number that made it say so

This is a stricter rule than the app applies to a plan it generated, and that asymmetry is
the point. The generator owns what the generator wrote. The athlete owns what the athlete
brought.

**The existing behaviour is already correct and should not be loosened.** The BYOR screen
says it plainly: "Your routine, your call. The app tracks it exactly as you built it"
(`src/screens/onboarding/RoutineSteps.tsx:133-134`). `analyzeRoutine` returns notes and
nothing else, and `RoutineSteps` renders them with no accept or apply action anywhere on the
screen (`src/screens/onboarding/RoutineSteps.tsx:124-131`). That is the register R17 extends,
not replaces.

### 5.2 What it may observe: the closed list

Nine observations exist today in `src/plan/analyze.ts:85-241`. R17 proposes six more and
one deletion. All fifteen are **observations with a number attached**, never instructions.

**Live today, verified by reading the code:**

| id | trigger | `analyze.ts` line | tone |
|---|---|---|---|
| `no-explosive` | goal is athletic/vertical/speed and zero `kind: 'jump'` or `'sprint'` sets | 92-98 | warn |
| `no-lower-day` | goal includes muscle and no day has >= 6 lower-body sets | 99-105 | warn |
| `zero-pull` | push sets > 0 and pull sets == 0 | 159-164 | warn |
| `push-heavy` | push:pull ratio above 1.6 | 165-170 | warn |
| `no-hinge` | no id in a 6-member hinge set, but legs are trained | 179-184 | warn |
| `quad-only` | quad sets > 0 and posterior sets == 0 | 193-199 | warn |
| `no-core` | zero core sets across the week | 201-207 | info |
| `no-rest-day` | 7 training days scheduled | 210-216 | warn |
| `marathon-{day}` / `snack-{day}` | a day above 25 sets or below 6 | 217-231 | warn / info |

**Proposed additions, each with the evidence it rests on:**

| id | trigger | evidence | register |
|---|---|---|---|
| `no-lower-pull` | the week has a squat or lunge pattern but no `hinge` pattern **and** no `pull-horizontal` below the waist | `MovementPattern` (`src/plan/movement.ts:66`) already distinguishes these; today `no-hinge` only checks a hardcoded 6-id set (`analyze.ts:19-21`), which misses `cable-pull-through`, `band-good-morning`, `nordic-curl`, `slider-leg-curl` and `machine-leg-curl` | observation |
| `muscle-below-band` | a `MUST_TRAIN` region (`src/plan/equipCoverage.test.ts:43`, 13 regions) receives fewer than 4 primary sets in the week | ACSM-2026's floor is all major groups at least 2x weekly; Peterson's dose-response puts ~4 sets per muscle at the untrained end (R3 S22) | observation, once, naming the region |
| `muscle-above-band` | a region receives more than 20 primary sets in the week | Baz-Valle 12-20 weekly sets as the standard band for trained lifters, inverted-U past it (R3 S31); SBS-VOL's ~30 practical ceiling | observation with both numbers shown |
| `frequency-once` | a `MUST_TRAIN` region is trained on exactly one day | ACSM-2026: all major muscle groups at least 2x per week | observation |
| `week-will-not-fit` | imported training days exceed the athlete's stated available days | the athlete's own answer, from onboarding | question, not a warning |
| `imported-weeks-dropped` | section 3.7 fired: more than one week was parsed | the import itself | statement of fact, at the top |

**One deletion.** `deload-auto` (`analyze.ts:233-237`) tells the athlete that BodyT will
halve their sets every fourth week and alternate their accessories. For a **generated** plan
that is a helpful disclosure. For an **imported** plan it is the app announcing that it will
modify a routine it just promised to leave alone, which is either false or a violation of
5.1. This note must either be removed from the imported path or rewritten to describe what
actually happens under `progression_model.kind: 'preserve'`. **Owner decision required**
(section 9), because it turns on whether BodyT deloads an imported routine at all.

### 5.3 The register, stated as rules a reviewer can check

1. **Observation, not instruction.** "Pressing outweighs pulling 18 sets to 6" is an
   observation. "Add rowing volume" is an instruction. The live copy at `analyze.ts:169`
   does both in one note, and for the imported path the second sentence should become
   conditional prose ("shoulders stay healthy near 1:1") rather than an imperative.
2. **Every warn note carries the number that produced it.** Four of the nine live notes
   already do (`push-heavy`, `marathon`, `snack`, and `push-pull-balanced`). The other five
   assert a category. A note without a number cannot be argued with, and the athlete should
   be able to argue with it.
3. **Never more than two structural warnings on a first pass.** This is R5's F9 cap, quoted
   directly: "at most 2 structural repairs on a first pass; more than that means the routine
   is not working and F9 should not be the recommendation"
   (`research/R5-program-families.md:434`). Today `analyzeRoutine` can emit six warns at once
   for a bad routine, sorted warn-first (`analyze.ts:239`). Six warnings is not coaching, it
   is a code review of somebody's life. Rank by severity, show two, put the rest behind a
   "more notes" affordance.
4. **Say the good thing first when there is one.** The live sort puts `warn` before `good`
   before `info` (`analyze.ts:239-240`). For a routine somebody has been running for a year
   and just handed over, leading with a warning is the wrong first sentence. For the
   imported path, lead with one `good` note if any exists, then at most two warns.
5. **No hedging.** "You might want to consider possibly adding" is not honesty, it is
   liability language. The house voice at `analyze.ts:163` ("All press, zero pull. That
   imbalance is how shoulders start hurting") is correct and should be preserved.
6. **The athlete's own `whyWorks` answer outranks the tally.** This already works: the four
   `why-*` notes at `analyze.ts:128-156` read the athlete's stated reason and reflect it
   back. Where the tally and the stated reason conflict (they say the weight keeps going up,
   the structure looks thin), say both, and say which one you believe. Evidence from a
   person who has been running the routine beats a set count.
7. **Volume observations name the muscle, not the goal.** "Your chest gets 24 sets a week"
   is checkable. "Your volume is too high" is a verdict.

### 5.4 What the advisory pass may never do, restated because it will be tempting

- Run a substitution. `substitutesFor` and `swapCandidatesFor` exist and are good, and they
  must not fire on an imported routine without the athlete asking.
- Reorder for CNS-first sequencing. `src/engine/sequence.ts` orders a generated day by band
  and role rank. An imported day's order is the athlete's programming intent.
- Fill a gap. If the routine has no core work, `no-core` says so. It does not add a plank.
- Rewrite `repText`. An imported `3x8-12` stays `8-12` and the double-progression display
  in `src/engine/reps.ts` does the rest, exactly as it does for authored ranges.

---

## 6. AUDIT OF THE LIVE BYOR PATH

Every claim in this section was verified by reading the file at the cited line in the
`wt-fix2` worktree at commit `c5723d9`.

### 6.1 The flow, screen by screen

| step | screen | file:line | what happens |
|---|---|---|---|
| 0 | `Welcome` | `Onboarding.tsx:334-347` | "I have my own routine" sets `mode='byor'` then `next()` |
| 1 | `MeStep` | `Onboarding.tsx:349-360` | name, sex, height, weight |
| 2 | `GoalStep` (byor variant) | `Onboarding.tsx:363-380` | multi-select `RoutineGoal` chips plus a free-text `goalStatement`. `onNext` at `Onboarding.tsx:379` is `mode === 'byor' ? enterBuilder() : next()` |
| 8 | builder | `RoutineSteps.tsx:48-82` | `BookletEditor` with `showMeta={false}`, then `validateBooklet` |
| 9 | why it works | `RoutineSteps.tsx:84-112` | one textarea, written to `plan.whyWorks` |
| 11 | the notes | `RoutineSteps.tsx:114-146` | renders `analyzeRoutine` output, no action available |
| 14 | permissions | `Onboarding.tsx:520-534` | on done, commits: `commitPlan(normalizeBooklet(byorDraft), byorNutrition(...).proteinTargetG, byorNotes.filter(n => n.tone !== 'info'))` |

`enterBuilder` (`Onboarding.tsx:237-265`) calls `makeEmptyByorPlan` and jumps straight to
step 8. **The generated flow's screens 3, 4, 5, `FOLLOWUPS` (12) and `MEALS` (13) are
skipped entirely**, because `GEN_FLOW` (`Onboarding.tsx:279`) is only walked by `next()` and
BYOR never calls it after step 2.

### 6.2 What `makeEmptyByorPlan` actually produces

`src/plan/bookletOps.ts:79-132`. It is a blank booklet, not a parsed one. Field by field:

| field | value | line |
|---|---|---|
| `daysPerWeek` | `0` | 107 |
| `templates` | `{}` | 109 |
| `tier1ByWeekday` | all seven weekdays `null` | 110 |
| `slots` | `{1:{},2:{},3:{}}` | 113 |
| `trackedLifts`, `coreMovers` | `[]`, `[]` | 116-117 |
| `rationale` | `{}` | 121 |
| `anchors` | `conditioningWeekday: 4`, `cnsWeekdays: []` | 118 |
| `equipment` | **`ALL_TAGS`**, all 21 tags | 108 |
| `cardioOptions` | `pickCardio(owned)` where `owned = new Set(['none', ...ALL_TAGS])` | 93, 115 |
| `goal` | `primaryGoalOf(routineGoals)`, a 4-to-3 collapse | 94, 32-37 |
| `nutrition`, `mealPlan` | from `byorNutrition`, floored by `flooredTargets` | 122-126 |

`normalizeBooklet` (`bookletOps.ts:202`) then derives everything the engine needs from the
assembled week: tier fallbacks, anchors, tracked lifts, core movers, min-viable recipes and
rationale. That part is good design and R17 changes none of it.

### 6.3 What an athlete can get in today

Working from `src/screens/booklet/BookletEditor.tsx`:

- **A weekday grid.** Seven rows, each either empty or holding one day (`141-177`).
- **A day title.** Free text (`235-239`).
- **Exercises, one at a time, from a picker over the 194-id catalog** (`354-479`). The
  picker searches name, primary muscles, `targets.qualities` and athletic metadata
  (`370-376`) and groups by nine movement families plus nine athletic-quality filters
  (`318-341`).
- **A set count**, stepper, clamped to 1..10 (`272`).
- **A rep string**, free text (`273-278`), stored as `repText` with `repsNum` derived only
  when the whole string parses as a positive number (`226`).
- **Booklet name, goal statement, routine goals, why-it-works and training-day kcal**, but
  only when `showMeta` is true (`67-138`), and the BYOR builder passes `showMeta={false}`
  (`RoutineSteps.tsx:64`). So in onboarding, those fields are set elsewhere or not at all.

### 6.4 What an athlete cannot get in

Each of these is an absence verified by grep over `BookletEditor.tsx`, not an inference:

| cannot enter | why | consequence |
|---|---|---|
| a movement not in the 194-id catalog | `ExercisePicker` iterates `Object.keys(EXERCISES)` (`368`); there is no create-custom path anywhere in the file | the athlete's actual routine cannot be represented if it contains a skullcrusher, a Zercher squat, a JM press, a landmine anything, a sissy squat, a reverse hyper, or any machine BodyT has not catalogued |
| **the same day twice a week** | `addDay(wd)` derives the template id as `` `day-${wd}` `` (`40`) and writes `tier1ByWeekday[wd] = id` (`52`), so every weekday gets its own template | a 6-day PPL with 3 distinct days must be built as **6 separate days**, each assembled exercise by exercise. This is the single largest friction cost in the current path |
| a superset | the picker only ever emits `{ entry: 'fixed', ... }` (`304`); `entry: 'ab'` exists in the type (`src/types.ts:70`) and is rendered (`220`) but cannot be created, and `setEntry` explicitly refuses to edit it (`225`) | supersets are lost |
| a rest time | no field; `restSec` is a catalog constant on `ExerciseDef` (`src/types.ts:45`) | "rest 3 min between squat sets" cannot be expressed |
| an RPE or RIR target | no field in `PrescriptionBase` (`src/types.ts:59-65`) | the intensity half of the prescription is dropped |
| a percentage of 1RM | no field | same |
| a starting weight | no field | the athlete who knows they bench 185 has nowhere to say it; `startWeight.ts` re-derives a guess from bodyweight fractions (`src/engine/startWeight.ts:22-35`) |
| a tempo | no field | dropped |
| a per-exercise note | `DayTemplate.note` exists (`src/types.ts:101`) but is never written by the editor (grep: the string `note` appears in `BookletEditor.tsx` exactly zero times) | coaching cues that came with the routine are dropped |
| a day tagline | hardcoded `'Your day, your work.'` (`46`) | every imported day reads identically in the app |
| a debrief pool | hardcoded `'generic'` (`49`) | the post-session debrief never matches the day's character, for every BYOR athlete |
| a max-effort day flag | `t.cns` is read for display (`156`) but never set | `anchors.cnsWeekdays` stays `[]`, and readiness gating never fires |
| a week beyond the first | `PlanConfig` has no week axis | section 3.7 |

### 6.5 Every place the current path loses information the athlete typed

This is the list the pack was asked for, ranked by how much it costs.

**L1. There is no place to type the routine at all.** The BYOR path has exactly one
free-text field about training, and it is `whyWorks` at `RoutineSteps.tsx:92-98`, which asks
why the routine works, not what it is. Grep for `paste` or `clipboard` across `src/` returns
zero hits in any training surface. **Every athlete with a routine on their phone retypes it
through a picker, one movement at a time, one weekday at a time.** For a 6-day PPL that is
six day-sheets, roughly 30 picker searches and 30 stepper interactions. This is the finding
everything else in R17 exists to fix.

**L2. Equipment is assumed to be everything.** `makeEmptyByorPlan` sets
`equipment: ALL_TAGS` (`bookletOps.ts:108`) and builds cardio options from
`new Set(['none', ...ALL_TAGS])` (`bookletOps.ts:93`), and the BYOR flow skips `GearStep`
(`Onboarding.tsx:484-494`, step 4, reachable only through `GEN_FLOW`). So every athlete who
brings their own routine is recorded as owning a barbell, a rack, a trap bar, a sled,
hurdles, cones, a med ball, a court, a treadmill and a training partner. Every downstream
`canDo(id, owned)` check (`src/plan/equip.ts:235`) passes for everything. The consequence is
not cosmetic: `substitutesFor` and `swapCandidatesFor` will offer a sled push to somebody
training in a bedroom.

**L3. Injuries are never asked about, and the code says they are.** `commitPlan` writes
`d.prefs.limitations = limitationsFrom(answers.goalAnswers, start)` at
`Onboarding.tsx:189`, under a comment that reads "Both paths write it: a bad knee is a bad
knee whether the plan was generated or brought from home" (`Onboarding.tsx:187-188`). Both
paths do write it. But `limitationsFrom` (`src/plan/limitations.ts:71-89`) reads
`answers['injuries']`, that key is only ever set by `FollowupStep`
(`Onboarding.tsx:386-388`), `goalAnswers` is initialised to `{}` (`Onboarding.tsx:75`), and
the BYOR flow never reaches `FOLLOWUPS`. So for every BYOR athlete the call returns `[]` at
`limitations.ts:76`. The question "Anything that hurts right now?" (`src/plan/followups.ts:149`)
is asked of exactly half the userbase. **This is the highest-severity finding in the audit,
because it is a safety input, and because the comment asserts the opposite of what happens.**

**L4. A four-goal multi-select is collapsed to one engine goal.** `primaryGoalOf`
(`bookletOps.ts:32-37`) maps `athletic -> general`, `muscle -> muscle`,
`lose-weight -> lean`, else `general`, with a fixed precedence. An athlete who selects
`muscle` and `athletic` becomes `general`, and the muscle intent disappears from every
downstream decision that reads `plan.goal`. `routineGoals` survives on the plan and is read
by `analyzeRoutine` (`analyze.ts:89`) and by `byorNutrition` (`bookletOps.ts:43`), so the
nutrition and the notes see all four; the training engine sees one.

**L5. Rep-string semantics are inferred by one weak rule.** `BookletEditor.tsx:226`:
`Number(patch.repText) > 0 ? Number(patch.repText) : undefined`. So `"8"` yields
`repsNum: 8` and everything else yields `undefined`. That is correct for `"8-12"` (a range,
handled by `parseRepRange` at `src/engine/reps.ts:41`) and correct for `"max"`. It is
**wrong for `"8 / leg"`, `"30 sec"` and `"12 each"`**, which are fixed prescriptions with a
known count that the app now cannot halve for a min-viable day or a deload. R-ONT section 7
already diagnosed the general form of this (`RONT:868-921`): there is no unit model, only a
display string and one regex at `focus.ts:98`.

**L6. Set counts are clamped to 10.** `BookletEditor.tsx:272`,
`Math.max(1, Math.min(10, v))`. A German Volume Training athlete typing 10x10 is fine; a
Smolov base mesocycle asking for 13 sets is silently clamped, with no message.

**L7. A one-exercise day is rejected.** `validateBooklet` (`bookletOps.ts:167`) requires
`t.entries.length >= 2` for a `kind: 'session'` day. A legitimate strength routine whose
Wednesday is "Squat, 5x5, go home" cannot be entered. The error message names the day and
asks for a second exercise (`bookletOps.ts:168`).

**L8. The day loses its identity.** `tagline` (`BookletEditor.tsx:46`) and `debriefKey`
(`:49`) are hardcoded for every day the athlete creates, and `cns` is never set. The
generated path assigns real values per day template. So a BYOR athlete's Monday and their
Saturday get the same tagline and draw post-session debriefs from the same generic pool.

**L9. Only four notes reach the coach feed, and info notes are dropped.** `commitPlan`
takes `notes.slice(0, 4)` (`Onboarding.tsx:193`) and the BYOR call site pre-filters with
`byorNotes.filter((n) => n.tone !== 'info')` (`Onboarding.tsx:529`). `analyzeRoutine` sorts
warn, then good, then info (`analyze.ts:239-240`), so what lands is up to four warnings.
The `deload-auto` note (`analyze.ts:233`) is `info` and is therefore dropped from the feed
while still being shown on screen at step 11. Section 5.2 argues that note should not exist
for imported plans at all, so this is a bug that currently masks a design problem.

**L10. The notes screen labels a warning "Fix this".** `RoutineNotes.tsx:12`,
`NOTE_LABEL.warn = 'Fix this'`. On a routine the athlete brought and the app has just
promised to track "exactly as you built it" (`RoutineSteps.tsx:134`), an imperative label is
the wrong register. Section 5.3 rule 1.

**L11. Every unrecognised movement is a dead end, not a question.** There is no
"I do not see my exercise" affordance in the picker (`BookletEditor.tsx:405-477`). The
athlete's only options are to pick something else, which silently changes their routine, or
to leave it out, which silently shrinks it. Both are information loss that the app never
learns about. Section 4's T4 tier exists to convert this into a question.

### 6.6 What is already right, and should be built on rather than replaced

- `normalizeBooklet` (`bookletOps.ts:202-288`) derives every engine-facing field from the
  assembled week and **preserves existing rationale** while filling new entries. An importer
  should hand it a draft and let it do exactly this.
- `validateBooklet` (`bookletOps.ts:157-177`) is the right gate and already rejects unknown
  ids at `:173`, which is precisely the invariant section 4's commit gate must uphold.
- `analyzeRoutine` (`analyze.ts:85`) is a genuinely good advisory pass, pure over
  `PlanConfig`, and it is the thing no competitor in section 1 does at all.
- `parseRepRange` (`engine/reps.ts:41`) keeps the suffix verbatim (`:53`), which means an
  imported `"40-60 sec"` progresses correctly with no new code.
- `startWeight.ts:23-35` is already a lexical name matcher over `def.name.toLowerCase()`
  with nine pattern regexes. The repo has precedent for deterministic string matching in the
  plan layer; R17's parser is the same technique applied to input rather than to the catalog.

---

## 7. TYPED SCHEMA PROPOSAL

### 7.1 The constraints the shapes must satisfy

1. **`types.ts` is full.** It is 695 lines against a `structure.test.ts:70` allowance of
   **696**, and allowances shrink only. One line of headroom. Every new type in this section
   therefore goes in a **new file**, following the pattern the repo already uses:
   `sessionTypes.ts`, `foodTypes.ts`, `activityTypes.ts`, `resolvedTypes.ts`,
   `prefsTypes.ts`, `journeyTypes.ts`.
2. **Layering.** `plan/` is rank 0 (`structure.test.ts:157-168`) and may import nothing but
   `types.ts` and its siblings. The parser needs `EXERCISES`, `MOVEMENT`, `EXERCISE_MUSCLES`
   and `EXERCISE_EQUIP`, all in `plan/`. So the parser lives in `plan/`, and the review
   screen in `screens/` reaches down to it. Correct direction.
3. **`HARD_MAX = 600` lines** (`structure.test.ts:36`) and nothing new may join the oversize
   list (`structure.test.ts:41-42`). The parser splits across four files by stage.
4. **Golden lock.** `golden.test.ts` and `goldenLife.test.ts` snapshot `resolveDay` output.
   Nothing here touches `resolveDay`. An import produces a `PlanConfig`; the golden tests
   run over a fixed preset and are unaffected.

### 7.2 New files

| file | holds | approx |
|---|---|---|
| `src/importTypes.ts` | every shape in 7.3, re-exported from `types.ts` by one line (the one line of headroom) | 120 |
| `src/plan/notation.ts` | the section 3 rule table as data: `{ id, re, kind, apply }` | 300 |
| `src/plan/importSegment.ts` | S0 and S1 | 180 |
| `src/plan/importResolve.ts` | S2, on top of `src/plan/aliases.ts` | 200 |
| `src/plan/importBuild.ts` | S3, S4, S5, and the `PlanConfig` draft assembly | 250 |
| `src/plan/aliases.ts` | R-ONT section 5.2's file, unchanged in shape | R-ONT owns it |
| `src/plan/importParse.test.ts` | section 8's fixtures | 400 |

### 7.3 The shapes

```ts
// src/importTypes.ts - NEW FILE. Nothing here is persisted except LearnedAlias.

/** One line of the paste, after S0. Never discarded. */
export interface RawLine {
  index: number
  raw: string          // exactly what they typed, for the repair UI
  normalized: string   // S0 output, for matching
  indent: number       // leading whitespace before collapse (superset marker)
}

export type LineKind =
  | 'week-header' | 'day-header' | 'exercise-line'
  | 'superset-marker' | 'rest-line' | 'note' | 'blank'

/** S1 output. */
export interface SegmentedLine {
  line: RawLine
  kind: LineKind
  /** Day block this line belongs to, assigned by S1. */
  dayIndex: number
  /** Week scope, 0 when the paste has no week headers. */
  weekIndex: number
}

/** S3 output for one exercise line. Every field optional: absence is a fact. */
export interface PrescriptionRead {
  sets?: number
  repText?: string
  repsNum?: number
  repRange?: { low: number; high: number }
  perSet?: number[]          // rule 10 and 12
  lastSetAmrap?: boolean     // rule 13
  rpe?: number
  rpeHigh?: number
  rir?: number
  pctOfMax?: number
  pctRef?: '1rm' | 'training-max' | 'bodyweight' | 'unknown'
  loadLb?: number
  restSec?: number
  tempo?: string
  seconds?: number
  meters?: number
  format?: 'straight' | 'emom' | 'amrap-time' | 'rounds-descending' | 'circuit'
  setRole?: 'top' | 'backoff'
  /** Character spans every rule consumed, so S2 can subtract them. */
  claimedSpans: [number, number][]
  /** Digits nobody claimed. Non-empty forces tier T3. */
  unclaimed: string[]
  /** Rule ids that fired, in order. The audit trail. */
  firedRules: string[]
}

export type ResolutionTier = 'exact' | 'confident' | 'suggested' | 'ambiguous' | 'unresolved'

/** S2 output for one movement name. */
export interface Resolution {
  /** The name candidate S2(a) extracted, before normalization. */
  typed: string
  /** R-ONT's normalized key. The memory key in 4.3. */
  key: string
  /** Parenthetical kept per R-ONT 5.2 step 2. */
  qualifier?: string
  tier: ResolutionTier
  /** Set only at 'exact' or 'confident'. Never at 'suggested' or below. */
  exerciseId?: string
  /** Ordered best-first, at most 5. Empty only at 'unresolved'. */
  candidates: { exerciseId: string; score: number; why: string }[]
  /** Which of R-ONT 5.3's six steps produced this. Auditable. */
  via: 'id' | 'name' | 'alias' | 'alias-weak' | 'fuzzy' | 'none'
}

/** One parsed exercise line, before the athlete has answered anything. */
export interface ImportedEntry {
  lineIndex: number
  resolution: Resolution
  prescription: PrescriptionRead
  /** Superset group letter from rule 57 to 59, undefined when standalone. */
  supersetGroup?: string
}

export interface ImportedDay {
  /** From a day-header line, or "Day 1" when the paste had none. */
  title: string
  /** Only set when the paste named a weekday. Never guessed. */
  weekday?: Weekday
  entries: ImportedEntry[]
  /** Note lines that belonged to this day. Destined for DayTemplate.note. */
  notes: string[]
}

/** The whole attempt. One per paste. Not persisted. */
export interface ImportAttempt {
  /** Verbatim. The provenance v12 section 39 requires. */
  rawSource: string
  parsedAt: ISODate
  lines: SegmentedLine[]
  days: ImportedDay[]
  /** More than 1 means section 3.7 fired and weeks 2+ are on file only. */
  weekCount: number
  /** Set only when a program name matched (rule 11). Advisory. */
  programHint?: string
  /** R5 family id from S4(iii). Advisory metadata, never a transform. */
  familyGuess?: string
  /** Everything that needs an answer, ordered by line index. */
  questions: ImportQuestion[]
}

export type ImportQuestionKind =
  | 'which-movement'     // T3 or T4
  | 'unclaimed-number'   // rule set residue
  | 'missing-reps'       // rules 15, 17
  | 'missing-sets'       // rule 18
  | 'percent-no-max'     // section 3.8
  | 'weeks-dropped'      // section 3.7
  | 'superset-overflow'  // rule 60, more than 2 movements

export interface ImportQuestion {
  id: string
  kind: ImportQuestionKind
  lineIndex: number
  /** The raw line, quoted to the athlete. Never a paraphrase. */
  quoted: string
  prompt: string
  options: { id: string; label: string }[]
  /** True for T3 and T4: cannot be batch-confirmed. */
  blocking: boolean
}

/** The athlete's answer. Applied, then remembered per 4.3. */
export interface Repair {
  questionId: string
  /** For 'which-movement': the chosen catalog id, or null for drop. */
  exerciseId?: string | null
  /** For the numeric questions. */
  value?: number | string
  /** Whether to remember this beyond the current attempt. */
  remember: boolean
}

/** Persisted. Lives on Prefs, validated in store/prefsSchema.ts. */
export interface LearnedAlias {
  key: string            // R-ONT normalized form
  exerciseId: string
  learnedAt: ISODate
  /** 'import' when confirmed during a paste; 'swap' when learned from a swap. */
  source: 'import' | 'swap'
}
```

**One field added to an existing shape,** and it is the only edit to a persisted type:

```ts
// src/prefsTypes.ts:56, inside Prefs
  /** Names this athlete has confirmed a mapping for. Never asks twice. */
  learnedAliases?: LearnedAlias[]
```

Optional, so `store/schema.ts` needs no migration: an absent field reads as an empty list,
which is exactly the pre-import behaviour. `store/prefsSchema.ts` gains one `z.array(...)
.optional()`.

### 7.4 What is deliberately NOT proposed

- **No week axis on `PlanConfig`.** Adding one touches the generator, the phase engine, the
  golden snapshots and every screen that reads `templates`. Section 3.7's honest answer
  (import week 1, keep the grid on file, say so) needs no schema change beyond
  `ImportAttempt.rawSource`. Whether BodyT should ever hold authored week variation is an
  owner decision, recorded in section 9.
- **No new `PrescriptionBase` fields in this pack.** R-ONT section 7.3 already proposes
  `unit`, `perSide`, `tempo`, `seconds`, `meters` (`RONT:922-936`). R17 **depends on** that
  landing and does not duplicate it. The fields R17 would additionally want (`restSec`,
  `rpe`, `rir`, `pctOfMax`) are held in `PrescriptionRead` at import time and are **dropped
  at commit** until an owner decides they belong on the prescription. The import screen must
  say so: "I read RPE 8 but I do not track that on a prescription yet."
- **No custom exercise records.** Creating a `ghost` `ExerciseDef` for an unresolved
  movement is exactly the Fitbod trap in section 1.5: an entry the engine cannot see.
  Section 4's T4 exits (search, note, drop) are the alternative, and a real custom-exercise
  feature is a separate job with six side tables to satisfy (`RONT:1.1`).

### 7.5 Files that change, named

| file | change |
|---|---|
| `src/importTypes.ts` | NEW, 7.3 |
| `src/types.ts` | one line: `export * from './importTypes'`, using the single line of allowance headroom |
| `src/prefsTypes.ts` | one optional field, 7.3 |
| `src/store/prefsSchema.ts` | one optional zod array |
| `src/plan/aliases.ts` | NEW, R-ONT section 5.2 |
| `src/plan/notation.ts` | NEW, section 3 as data |
| `src/plan/importSegment.ts` | NEW, S0 and S1 |
| `src/plan/importResolve.ts` | NEW, S2 |
| `src/plan/importBuild.ts` | NEW, S3 to S5 plus draft assembly |
| `src/plan/analyze.ts` | 241 lines today; the six new observations in 5.2 and the two-warn cap push it past 300. Splitting the tally out to `src/plan/analyzeTally.ts` keeps both under `HARD_MAX` |
| `src/screens/onboarding/Welcome.tsx` | a third entry: paste a routine |
| `src/screens/onboarding/ImportReview.tsx` | NEW, section 4.2's screen |
| `src/screens/onboarding/Onboarding.tsx` | 571/600 lines. The import step must be added as **another separated screen module** the way `RoutineSteps.tsx` already is, not inline |
| `src/screens/booklet/BookletEditor.tsx` | 479/600. Two additions the audit makes unavoidable: an "I do not see my exercise" affordance in the picker, and assigning one template to more than one weekday (L4 in 6.4) |

---

## 8. EVAL FIXTURES

Twenty-four cases in the formats people actually paste. Six (F19 to F24) **must fail to
resolve and ask**. Catalog ids named below were verified present in `EXERCISES` by parsing
the five catalog files; ids named as absent were verified absent the same way.

Each fixture states the input verbatim, the required parse, and the assertion. They are the
acceptance suite for `src/plan/importParse.test.ts`.

**F1. The modal paste.**
`Bench press 3x8` -> one entry, `flat-db-press` **or** a T3 question. Assert: the bare word
`bench` alone does not resolve to a single id when both `flat-db-press` and
`incline-db-press` are in range; `3x8` yields `sets: 3`, `repText: "8"`, `repsNum: 8`.

**F2. Range with an equipment token.**
`Incline DB press 4 x 8-12` -> `incline-db-press`, `sets: 4`, `repText: "8-12"`,
`repsNum` **undefined**. Assert `parseRepRange("8-12")` returns `{low:8, high:12}`, so the
athlete is shown one number.

**F3. Abbreviation stack.**
```
Mon
BB row 4x8
DB OHP 3x10
```
-> day `Mon` maps to `tier1ByWeekday[1]`; `barbell-row` and `db-shoulder-press`. Assert the
day header did not consume the exercise lines, and `bb`/`db`/`ohp` expanded.

**F4. RPE.**
`Squat 5x3 @ 8` -> `sets: 5`, `repText: "3"`, `rpe: 8`. Assert `8` did not become a rep
count and did not become a percentage.

**F5. Percentage with a training max.**
`Deadlift 3x5 @ 85% TM` -> `sets: 3`, `repText: "5"`, `pctOfMax: 85`,
`pctRef: 'training-max'`. Assert no `loadLb` is produced (section 3.8, no reference max).

**F6. 5/3/1 week.**
```
Week 1 - Squat
65% x 5
75% x 5
85% x 5+
```
-> three set groups, the last with `lastSetAmrap: true`, `weekCount: 1`,
`programHint: undefined`. Assert `5+` did not parse as `5` and that the three lines were not
collapsed into `sets: 3`.

**F7. Per side.**
`Bulgarian split squat 3x10 each leg` -> `bulgarian-split-squat`,
`repText: "10 / leg"`, per-side true. Assert the separator normalized to the repo's existing
vocabulary rather than adding a fifth form (`RONT:895`).

**F8. Alternating total.**
`Walking lunge 3 x 20 total` -> `walking-lunge`, per-side mode `alternating-total`.
Assert it did **not** become `10 / leg`.

**F9. Timed hold.**
`Plank 3x45s` -> `plank-side-plank`, `repText: "45 sec"`, unit time, `seconds: 45`.

**F10. AMRAP, the set sense.**
`Pull ups 3 sets to failure` -> `pull-up`, `sets: 3`, `repText: "max"`.

**F11. AMRAP, the time sense.**
`AMRAP 12: 10 pushups, 15 air squats` -> `format: 'amrap-time'`, `seconds: 720`, two
movements inside. Assert it did **not** become `sets: 12`.

**F12. EMOM.**
`EMOM 10 - 5 burpees` -> `format: 'emom'`, `seconds: 600`. `burpees` is absent from the
catalog, so this also raises a T4 question. Assert both the format read and the question.

**F13. Superset by letter.**
```
A1) Bench press 3x10
A2) Barbell row 3x10
B1) Lateral raise 3x15
```
-> two `entry: 'ab'` entries. Assert the `A` pair grouped and the lone `B1` did not.

**F14. Superset by indentation.**
```
Squat 4x6
   Leg curl 4x12
```
-> one `ab` entry from the indent marker. Assert `machine-leg-curl` or `seated-leg-curl`
raises a T3 disambiguation rather than picking one.

**F15. Spreadsheet paste, tab separated.**
`Barbell Row\t4\t8-10\t90s` -> `barbell-row`, `sets: 4`, `repText: "8-10"`, `restSec: 90`.
Assert the tab collapsed and the bare `90s` was read as rest, not as a rep count.

**F16. Rest on its own line.**
```
Front squat 5x5
Rest 3 min
```
-> `front-squat`, `restSec: 180`, and the rest line is **not** a second exercise.

**F17. Weight in kilos.**
`Hip thrust 3x12 @ 100kg` -> `hip-thrust`, `loadLb: 220` (rounded), shown as a suggestion.
Assert the conversion is offered, never silently applied to the plan.

**F18. Four-week grid.**
```
        W1        W2        W3        W4
Squat   5x5 70%   5x5 75%   3x3 85%   5x5 70%
```
-> `weekCount: 4`, week 1 imported, weeks 2 to 4 retained in `rawSource`, one
`weeks-dropped` question. Assert nothing is averaged.

---

### Must fail to resolve and ask

**F19. A movement the catalog does not have.**
`Skullcrushers 3x12` -> tier `unresolved`, one `which-movement` question. Assert:
`exerciseId` is `undefined`; the question quotes the raw line; `overhead-tricep-extension`
may appear as a *candidate* but must **not** be auto-selected, because it is a different
movement (standing overhead versus lying), and the veto in 4.1 does not fire on it so only
the threshold protects the athlete. Assert score is below the T2 accept floor.

**F20. Genuinely ambiguous, five-way.**
`Calf raises 4x15` -> tier `ambiguous`. Assert exactly the five calf ids in the catalog
(`single-leg-calf-raise`, `seated-calf-raise`, `double-leg-calf-raise`,
`bodyweight-calf-raise`, `standing-calf-machine`) are offered and none is chosen.

**F21. The permanently ambiguous abbreviation.**
`PU 4x8` -> tier `ambiguous`. Assert both `pull-up` and `push-up` are offered and that this
line can never reach T0 or T1 no matter what the alias table learns, because the two
answers are both correct for different people (4.3, the conflicting-confirmation rule).

**F22. An unclaimed numeric span.**
`Bench 3x8 (last set +5)` -> the entry parses at T0 for the movement and the sets and reps,
**and** raises an `unclaimed-number` question for `+5`. Assert the entry does not commit
until answered, and that `+5` did not become a fourth set, a rep, or an RPE.

**F23. Sets with no reps.**
`Leg press 4x` -> `sets: 4`, `repText` absent, one `missing-reps` question. Assert no
default of `10` was applied anywhere (contrast `BookletEditor.tsx:304`, which hardcodes
`repText: '10'` on every picked exercise).

**F24. A brand name and a movement in one line.**
`Hammer Strength row 3x10` -> tier `ambiguous` at best. Assert `hs`/`Hammer Strength` was
treated as an equipment brand token, that the candidates are the machine-ish rows
(`chest-supported-row`, `seated-cable-row`), and that the laterality and equipment vetoes
kept `one-arm-db-row` out of the top slot.

---

### Fixtures that assert on memory

**F25 (regression, not a parse case).** Paste F19's routine, answer the skullcrusher
question with `overhead-tricep-extension`, commit. Re-paste the identical text. Assert
**zero questions**: the `LearnedAlias` row on `Prefs` resolved it at tier `confident`
(4.3, per-athlete scope).

**F26.** A single paste containing `DB bench` on three different days. Assert the athlete is
asked **once** and the other two lines resolve without a second question (4.3, within-import
scope), and that the on-screen question count decremented from 3 to 0 in one action.

### Coverage the fixture set must reach

| dimension | covered by |
|---|---|
| every section 3 group | 3.1 (F1-F3, F23), 3.2 (F7, F8, F10, F11), 3.3 (F4, F5, F17), 3.4 (F9), 3.5 (F13-F16), 3.7 (F18) |
| every resolution tier | T0 (F2), T1 (F3), T2 (F24), T3 (F20, F21), T4 (F19, F12) |
| every question kind | which-movement (F19), unclaimed-number (F22), missing-reps (F23), weeks-dropped (F18), percent-no-max (F5), superset-overflow (needs a 3-movement circuit case, add as F27) |
| memory scopes | within-import (F26), per-athlete (F25) |

---

## 9. WHAT TO DO NEXT, IN ORDER

**Blocking owner decisions, in priority order:**

1. **L3 in section 6.5 is a live safety gap and is independent of everything else in this
   pack.** Every athlete who brings their own routine is committed with
   `prefs.limitations = []`, because the injuries question lives on a screen the BYOR flow
   never reaches (`Onboarding.tsx:189`, `limitations.ts:76`, `followups.ts:149`). Fixing it
   is one screen in the BYOR flow, or one question on the existing goal step. It should not
   wait for an importer.
2. **Does BodyT deload an imported routine?** Section 5.2's `deload-auto` deletion turns on
   this. R5's F9 says `progression_model.kind: 'preserve'`. The live copy at
   `analyze.ts:236` promises to halve their sets every fourth week. Both cannot be true.
3. **Does `PlanConfig` ever hold authored week variation?** Section 3.7. Answering "no" is a
   defensible product position and makes the importer simpler; it just has to be said out
   loud to the athlete rather than discovered.
4. **Do `restSec`, `rpe`, `rir` and `pctOfMax` belong on `PrescriptionBase`?** Section 7.4
   drops them at commit today. Every competitor in section 1 carries at least rest and RPE.

**Build order, assuming the decisions land:**

1. **R-ONT wave 1 first.** `src/plan/aliases.ts` and the `PrescriptionUnit`/`PerSideMode`
   model (`RONT:922`) are prerequisites, not parallel work. Section 3 rows marked `R-ONT`
   have nowhere to land without them.
2. **`src/plan/notation.ts` plus its test, with no UI.** Section 3 as data, section 8's
   fixtures as the suite. This is the highest-value, lowest-risk piece and it is testable in
   isolation.
3. **The two editor fixes the audit makes unavoidable**, because they are worth shipping
   even if the parser never does: one template assignable to more than one weekday
   (`BookletEditor.tsx:40`), and an "I do not see my exercise" exit in the picker
   (`BookletEditor.tsx:405`).
4. **`importSegment` and `importResolve`**, then the review screen.
5. **Section 5's advisory changes**, which are independent of the parser and improve the
   existing BYOR path on their own: the two-warn cap, the `no-lower-pull` and volume-band
   observations, the register fixes, and `NOTE_LABEL.warn` (`RoutineNotes.tsx:12`).

**What not to do:** do not build a custom-exercise record to absorb T4 lines. Section 1.5
documents where that ends, and `RONT:1.1` documents the six side tables a real catalog entry
owes.

---

## 10. SOURCES

**Repo (worktree `wt-fix2`, commit `c5723d9`):**
`src/types.ts:14-24,29-47,59-65,67-74,90-107,111-115,141-149,550-590`;
`src/prefsTypes.ts:56-76`;
`src/plan/bookletOps.ts:17-21,32-37,43-76,79-132,135-154,157-177,179-190,202-230`;
`src/plan/analyze.ts:11-15,17-21,37-44,46-82,85-241`;
`src/plan/equip.ts:10-30,235-300`;
`src/plan/exercises.ts:13-15`; `src/plan/athleticExercises.ts`; `src/plan/gymExercises.ts`;
`src/plan/homeExercises.ts`; `src/plan/athleticCoverage.ts` (194 ids parsed: 77 + 71 + 16 +
21 + 9);
`src/plan/generator.ts:156-166`;
`src/plan/movement.ts:66-82,101-147`;
`src/plan/muscleRegions.ts:8-32`;
`src/plan/limitations.ts:71-89`;
`src/plan/followups.ts:147-158`;
`src/plan/equipCoverage.test.ts:43-57`;
`src/engine/reps.ts:31-57,88-92`;
`src/engine/startWeight.ts:10-35`;
`src/screens/booklet/BookletEditor.tsx:22-190,194-314,318-341,354-479`;
`src/screens/onboarding/RoutineSteps.tsx:21-185`;
`src/screens/onboarding/RoutineNotes.tsx:7-12`;
`src/screens/onboarding/Onboarding.tsx:61-63,75,87,174-214,237-265,267-300,334-347,363-380,
484-494,520-535,565`;
`src/store/schema.ts:1-40`;
`src/structure.test.ts:36,41-42,70,131-148,155-193`.

**Sibling research packs:**
`research/RONT-exercise-ontology.md` sections 1.1, 3.4, 5.1-5.5 (`:608-743`), 7.1-7.4
(`:866-981`), 9 (`:1101-1132`);
`research/R5-program-families.md` section 0 (`:20,32`), 4 (`:340-437`), 5.

**Playbook:** `playbook_v12.md:41,51-53,160,278,286,844-969` (sections 38, 38A, 39),
`:1500,1514` (imported-program authority cases), `:2057-2060` (phase 9 gate).

**External, searched 2026-08-18. Vendor pages are claims of intent, not verified behaviour:**

- Hevy: `hevyapp.com/features/gym-routines/` (fetched; routine builder capabilities, sharing,
  the ChatGPT-import line); `hevyapp.com/features/share-folders-routines/`;
  `help.hevyapp.com/hc/en-us/articles/38001424401943-...` (**HTTP 403 to this session's
  proxy, not read directly**; the Strong-CSV-only and English-only constraints and the
  settings path are from search-result snippets of that page, and are marked accordingly)
- Strong: `help.strongapp.io/article/235-export-workout-data` (search-level only; the
  "exported files cannot be imported back into Strong" statement is quoted from search
  snippets of that page, **not read at source**)
- Boostcamp: `boostcamp.app/custom-program` (fetched; "supersets, RPE, AMRAP, drop sets",
  "500+ exercises, searchable", web-based, "ditch the spreadsheet");
  `boostcamp.app/free-workout-app` and `barbend.com/boostcamp-review/` (search-level; the
  130+ expert / 10,000+ community counts are **vendor and reviewer claims, unverified**)
- JuggernautAI: `juggernautai.app`, App Store listing, `garagegymexperiment.com/juggernaut-ai/`
  (search-level; the ~250-exercise library and the low per-workout flexibility are reviewer
  claims). **No import path found; absence of evidence, marked uncertain**
- Fitbod: `help.fitbod.me/hc/en-us/articles/28062570249623-Custom-Exercises` (search-level;
  custom exercises excluded from recommendations, not editable after creation, no
  distance tracking)
- Alpha Progression: `alphaprogression.com/en`, `hotelgyms.com/blog/how-to-use-alpha-progression`
  (search-level; plan-to-plan import, drag between days, plan generator, plan sharing, and
  the "simply enter it into the app" framing)
- TrainHeroic: `support.trainheroic.com/hc/en-us/articles/18156474632717-...` (no plan or
  history export), `support.trainheroic.com/hc/en-us/articles/18156803630477-...`
  (Spreadsheets is a testing tool), `peaksware.uservoice.com` feature requests for CSV
  exercise import and program export (search-level)
- RP Hypertrophy: `rpstrength.com/pages/hypertrophy-app`, `dr-muscle.com/rp-hypertrophy-app-review/`
  (search-level; ~45 pre-built programs or build your own. **Template count and any 2026
  import feature are uncertain**)
- Paste-natives: Repstack App Store listing `apps.apple.com/us/app/repstack-workout-planner/id6757782341`
  (paste from Sheets, Notes, PDF, a coach's email; claims `3x5 @8`, `5/3/1`, AMRAP, top sets,
  backoffs); `ellim.app/blog/fitness/best-strong-app-alternatives` (AI routine import);
  `n8n.io/workflows/6527-convert-workout-plan-pdfs-to-hevy-app-routines-with-gemini-ai/`
  (all search-level or listing-level; **none tested, all marked as vendor claims**)

**Evidence used for the volume bands in section 5.2**, both carried forward from sibling
packs rather than re-sourced here: ACSM-2026 (`R5:20`, ~10 sets/muscle/week, all major
groups at least 2x weekly), Baz-Valle 2022 (`R3:67`, 12 to 20 weekly sets for trained young
men, explicit inverted-U), SBS-VOL (`R5:32`, ~30 sets/muscle/week practical ceiling,
**search-level only, strongerbyscience.com returned 403**), Peterson dose-response
(`R3:58`, ~4 sets per muscle at the untrained end).

**Confidence note.** Section 1's per-app claims are as strong as a vendor help page or a
review, which is tier D under the playbook's own hierarchy (`playbook_v12.md:162`). They are
good enough to shape a product decision and not good enough to be quoted as fact about a
competitor's internals. Sections 2 through 8 rest on the repo, which was read directly, and
on R-ONT and R5, which were read directly.

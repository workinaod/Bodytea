# OP12 SCREEN LAW — every approved screen, contents in order

**Companion to `research/OP12-visual-law.md`.** That file says how things LOOK. This one says
what each screen CONTAINS and in what order, transcribed from the approved preview frame by
frame. `src/screenLaw.test.ts` asserts the landmarks named here still exist in `src/`.

## THE LIST IS THE SCREEN. NOT A LIST OF ADDITIONS.

Read this before the screens below, because the first version of this file did not say it and
the app paid for it.

Each screen's contents are **exhaustive and ordered**. That list is not "things that should be
present". It is the screen. Anything not on it either gets absorbed into something that is, or
moves to where it belongs, or goes.

The failure this prevents, in the owner's words: *"You are just copying the same app ux and not
changing shit like how the previews did."* They were right, and it was measurable. The concept
draws Progress in 7 blocks; the build shipped **24**, because every approved element got added
on top of the old screen instead of replacing it. Today: 9 in the concept, 12 shipped. Train and
Profile were built from nothing and came out at 7 and 6, which is the whole tell.

`e2e/density.spec.ts` counts the top-level blocks each screen actually renders and fails when a
screen grows past its number. A redesign is an EDIT. If a screen is getting longer, it is not
being redesigned, it is being decorated.

| Screen | Blocks |
|---|---|
| Today, fresh | 9 |
| Today, complete | 8 |
| Train | 9 |
| My Plan · Training | 8 |
| My Plan · Nutrition | 8 |
| Progress | 12 |
| Profile | 8 |

Progress is 12 rather than the concept's 7 because the concept frame stops at the fold, and the
charts genuinely continue below it. Twelve is the honest number for the whole screen: the four
the concept shows, plus grouped trends, photos and reviews. It is not twenty-four.

## Why this file exists

The visual law was written after a session rebuilt the palette from memory and got it
backwards. The same failure then happened one layer up: the palette was right, and the SCREENS
were still the old screens wearing new colours. The owner's question was the tell: "The preview
showed a whole different plan for this page, is that later in the roadmap and we are just
adjusting colors rn?"

No. The preview is the plan. A screen that has the approved palette but not the approved
contents is not done, it is painted. This file is the contents, so no future session has to
guess and no owner has to notice.

Read it with the visual law open: every `tile`, `chip`, `coin`, `setcoin`, `qbar`, `wnode`,
`stitle`, `b3d` and `quietlink` below is the geometry defined there.

---

## Shared vocabulary the screens are built from

| Name | What it is | Lives in |
|---|---|---|
| `Tile` | the panel + 2px line + r16 + lip surface, with tone variants heat/volt/ice/gold | `components/ui/Surface.tsx` |
| `Coin` | 44-52px icon disc, heat-filled or panel2 with a line | `components/ui/Surface.tsx` |
| `SetCoin` | 40px r12 panel2 square holding `4×6`, `MON`, `52P` | `components/ui/Surface.tsx` |
| `SectionTitle` | eyebrow + a 2px `line2` rule filling the rest of the width | `components/ui/Surface.tsx` |
| `QBar` | 12px r99 panel2 track, 2px line, fill in heat/volt/gold | `components/ui/Data.tsx` |
| `WeekNode` | 17px path node; done volt+tick, today 21px heat + white border, rest 13px @.6 | `components/ui/Data.tsx` |
| `ScreenName` | centred 11px/900/0.22em uppercase faint screen label | `components/ui/ScreenHeader.tsx` |
| sticker icons | 2-tone flat SVG symbols, never line icons, never emoji | `components/stickers.tsx` |

The sticker set the preview uses: `bolt` (Today), `dumbbell` (Train, light and white variants),
`calendar` (Plan), `bars` (Progress), `person` (Profile), `trophy`, `medal`, `runner`, `book`,
`redo`, `wrench`, `check`, `gear`.

---

## 1. Today, fresh

In order, top to bottom. **There is no header row.** The week path is the day picker: every
node is a button, and a header whose only job was a pair of date arrows is a block spent on
navigation the screen already has. Browsing another day with those nodes brings the header
back, because there the date IS the subject.

1. **HUD row.** flame + streak count in `heat-soft` (tap goes to Progress) · medal sticker +
   earned-badge count in `gold` · avatar 34px r12 `panel2` 2px `line` (tap goes to Profile).
2. **Week path.** seven `WeekNode`s joined by 3px connectors, lit `volt-edge` behind days that
   are done; weekday initials M T W T F S S underneath at 8.5px/800/faint.
3. **The mission, as ONE `tile heat`.** Inside it, in this order: 52px heat `Coin` holding the
   white dumbbell sticker · eyebrow in `heat-soft` (`{kind} day · Week {n}`) · 27px/900 title ·
   the tagline · the why line · chip row (`~{min} min`, `{n} sets`, `{muscles}`) · the
   `b3d heat` **Start session** button INSIDE the tile.
4. `quietlink` **Can't train today** directly under the tile, centred, underlined, sentence case.
5. Everything the engine already says, in ONE container that collapses when it is empty:
   banners, adapt proposals, the after-midnight tile, restore pill, reminders, cardio,
   rest-day card, review offer, make-up card, add-more-work. Suggestions are a `tile gold`
   with a `Suggestion` eyebrow. This is one block, not nine: it was nine siblings, and that
   alone put Today three over its number.
6. **Next up** `tile`: eyebrow + `All badges ›` in `ice`; two rows, each a 22px sticker + name +
   `{progress}/{target}` + a `QBar`.
7. **The Sergeant line** `tile`: the daily quote in italic + `The Sergeant · daily` eyebrow +
   a `chip heat` **Push me** on the right.
8. `SectionTitle` **The work**.
9. Exercise rows: `SetCoin` showing `4×6` + name 14px/800 + sub `{equipment} · {last} lb last`,
   separated by 2px `line2` rules.

## 2. Today, complete (beat 4, the exit state)

1. HUD + week path, today's node now done at 21px.
2. **`tile volt`** (the flood): dark check `Coin` + `Mission complete` eyebrow in `volt-ink` +
   the title + chips on a dark wash: `{done}/{total} sets`, `{tonnage} lb`, `{n} PR`.
3. **`tile heat`**: the flame + `Day {n} banked · {tier}` + `{k} more days to {next tier}`.
4. **`tile ice`**: `Tomorrow` eyebrow + tomorrow's title + its line + `Preview tomorrow ›`.
5. Chip row: `Cardio logged` (volt) · `Re-open the debrief`.
6. Next up tile.

The honest grade line still prints, word for word, inside the volt tile: a half session says
half. The flood is for the day being BANKED, not for it being good.

## 3. The finish chain (beat 3)

`BEAT_MS = { dip: 120, work: 1500, pr: 1400, streak: 1800, badge: 1200 }`, tomorrow waits for
the tap. Beats: dip → work banked (count-up + bar) → PR (drop + confetti) → streak (charge,
flicker, shockwave, odometer roll, pull line; tier-up adds flood + confetti) → badge (bar
advance; unlock adds flip + confetti) → tomorrow (+ Continue). Every beat skips itself when it
has nothing true to say. Grade-scaled: a bare-minimum day is beats 1 and 5, quiet.

Beat frames: `Work banked` / `{n} sets` at 56px / `{tonnage} lb moved` / QBar / grade line.
Streak beat: 74px flame, `Day {n}` with the odometer, `chip heat` tier name, the pull line.

## 4. Train

1. `ScreenName` **Train**.
2. `tile heat`: `Today's mission` eyebrow + title 20px + `{n} sets · ~{min} min` +
   `b3d heat` **Go to Today ›**.
3. `SectionTitle` **Off the plan**.
4. Four launcher `tile`s, each a 44px panel `Coin` + title 14px/900 + sub 11.5px/faint:
   - **Run a previous day** — Make up a missed day, or rerun one you liked. (redo sticker)
   - **Browse workouts** — 14 ready-made sessions, fitted to your gear. (book sticker)
   - **Your own workout** — Pick exercises, run it now or log it after. (wrench sticker)
   - **Exercise library** — 194 movements, guides and muscle maps. (dumbbell sticker)
5. `SectionTitle` **Conditioning**.
6. `tile ice` launcher: **Log cardio** — Runs, rides, sport, classes. (runner sticker)

**Exercise library, decided:** the preview names a launcher the app has no screen for. It is
not a new engine: `ExercisePicker` already browses all 194 movements with search and filters,
and `ExerciseGuideSheet` already renders a movement's guide and muscle map. The launcher opens
the picker in a browse mode whose row tap opens the guide instead of adding to a workout. No
new data, no new engine, and the count in the copy comes from the real exercise table rather
than from the preview's placeholder.

## 5. My Plan · Training

1. `ScreenName` **My Plan**.
2. Segmented `[Training | Nutrition]` in the approved geometry: 2px line, r14, panel, 3px pad,
   lip; the active half is a heat fill at r10 with its own lip.
3. Centred `‹ Week of {date} ›` 12.5px/900/dim + eyebrow `Week {n} · Block {n} · {AB}`.
4. `SectionTitle` **This week's tier**.
5. Three tier tiles, each a `WeekNode` + `Tier {n} · {name}` + the sub line. The chosen tier's
   tile is `tile heat` with a heat node, and on tier 2 or 3 it carries the **day placement**
   rows under a `line2` rule inside itself. The pick-now nudge sits above the three, in the
   same container.
6. `tile` rows, the doors out of the week: **The Plan** (rules, exercise guides) ·
   **My Booklet · {plan}** · **Life this week** (gigs, shifts, bad nights), each with a `›`.
7. `SectionTitle` **The days**.
8. Day rows: weekday `SetCoin` (volt for done, heat for today, plain otherwise) + the day title
   + its sub + a status `chip` (`done` volt / `today` heat / `rest` / `up next`).

**Day placement and Life this week, decided.** Both used to be sections of their own further
down, which is how this screen reached eleven blocks. Placement belongs to the tier that
created it, so it lives on that tier's tile. Life events are a form, and a form does not belong
inside a calendar that already draws what it produces: the day rows keep the markers
(`🌙 late night`, `🦵 on feet`) and the editor moved into `LifeEventsSheet`, one tap behind a
door. Nothing was removed.

## 6. My Plan · Nutrition

1. `ScreenName` **My Plan** + the segment, Nutrition active.
2. Centred `‹ Fuel · {day} ›` with the `Log · My plan · Grocery` chips under it, in the same
   block. Two segmented switches stacked makes neither read as the primary choice, so the
   view picker is header furniture rather than a second control.
3. **The fuel tile**: two flat rings side by side, protein 132px and calories 104px, 12px
   stroke, heat and ice, centre `{eaten}` over `/ {target}`, `panel2` track, no gradients,
   round caps; then carbs and fat at 96px under a `line2` rule when the day has macro data;
   then the target chips under a second rule: `Training day · {kcal}` · `protein never drops:
   {n} g` · `fibre floor: {n} g` · `{n}-day protein streak` (gold). Rings and the numbers they
   are measured against are one object.
4. The coach column: whichever of the verdict, energy, learned-maintenance and calorie-target
   cards have something true to say today, in one container that collapses when they do not.
5. `b3d heat` **+ Log food**, full width and loud.
6. `SectionTitle` **Eaten ({n})**.
7. Food rows: protein `SetCoin` (`52P`) + name + `{kcal} kcal` + the quantity controls, closed
   by the **Supplements** grid under a `line2` rule. What you took today is part of what you
   ate today.

## 7. Progress

1. `ScreenName` **Progress**.
2. Segmented **[Progress | Record | The Board]**.
3. The offers column, collapsing when empty: the weekly check-in prompt (`tile heat`) and an
   unlocked milestone review (`tile gold`). Two cards saying "this is waiting for you" were
   two blocks on two rows.
4. `tile` **Your body this week**: the anatomy figure front and back, trained groups lit,
   recent ones dimmer; `{n} of 7 muscle groups trained this week`; the stalest-group line.
   Under two sessions it says `Assessing. A few sessions and this fills in.`
5. Three stat tiles in a row: flame + streak in `heat-soft` · sessions in `volt` ·
   check-ins in `ice`, each with a 9px eyebrow underneath.
6. `SectionTitle` **The climb** + `{n} of {m}` on the right.
7. ONE `tile` holding the whole route: `Next up {stage} · ~{n} weeks at your rate`, the strand
   chips, the node path whose current node is a 54px heat `HERE` and whose goal node holds a
   trophy sticker, and the estimates footnote.
8. `tile` **Last 12 weeks** + `▶ replay my week`, holding the adherence heatmap. The heading is
   on the tile: it was a `SectionTitle`, and it never headed a section, because the trends
   below run 30 days or all time and the reviews are rolling.
9. `tile` **Trends**: `+ log measurements` on the right, a `Body / Lifts / Fuel` lens row, the
   series chips for that lens, ONE chart and ONE empty state. Body metrics, strength and
   protein used to be three sections with three chip rows, three charts and three copies of
   `Log at least two entries to draw the trend.`
10. `tile` **Conditioning · last 30 days**: the hours and calories, the per-sport rows with
    their intensity mix, the honest trend line, then **Runs & rides** under a `line2` rule with
    the weekly-miles chart and the tappable run list. Five blocks became one; every one of them
    was answering "what conditioning did the month hold".
11. `tile` **Progress photos**: the angle chips and the two-up compare, or the honest empty
    line. The heading is on the tile.
12. `tile` **Reviews**: the four rolling periods as a 2×2, then the three fixed milestone marks
    under a `line2` rule, each `open ›` or `unlocks in {n} days`. Same question, same engine;
    they were two sections because that is how the data model is shaped, not how the screen
    reads.

**Conditioning stays on Progress, not Record.** Moving it to Record put two run lists on one
screen: `RecordView`'s timeline already carries a run row per GPS session. The timeline is the
narrative; this tile is the total. They are different questions about the same runs.

## 8. Profile

1. `ScreenName` **Profile** + a 30px r10 gear button on the right (panel, 2px line, lip).
2. **`tile heat` stats header**: 58px r18 **dashed** `heat-edge` avatar slot holding the
   initial + `Trainee soon` at 6.5px · name 21px/900 · flame + `×{streak}` + `chip heat` tier ·
   `{k} more days to {next tier}` · chip row `{n} sessions` / `{n} badges` /
   `Board · {standing}` (gold, honest when unranked).
3. `tile` **Training path**: eyebrow + the goal statement in italic `heat-soft` + the climb node
   path + `Stage {n} of {m} · next: {stage}`.
4. A pair of tiles side by side: **Your body** (mini anatomy + `{n}/7 this week`) and
   **Training pact** (`soon` badge, flame + `You + a friend` + the explanation).
5. `tile` **My Room** with a `Phase 5 socket` badge: a panel2 shelf, 2px `line2`, r12, holding
   the earned items with their names underneath, then `Every item is earned, never bought. Tap
   one to see what earned it and when.`
6. `tile` **Badges** + `All badges ›`: four tiles, earned ones outlined in `gold-edge`, locked
   ones greyed at 0.75 with a 6px mini QBar.

## 9. Profile · Badges (full view)

1. `‹ Profile · Badges` screen name.
2. Filter chip row: All (heat) · Streak · Workouts · Consistency · PRs · Recovery · Plans ·
   Social, from the real category set.
3. One tile per badge:
   - **Earned**: `tile gold`, 38px sticker, name 14.5px/900, `EARNED {date}` in gold,
     what earns it, and its My Room connection line.
   - **Locked**: plain `tile`, sticker at `grayscale(1) opacity(.55)`, `LOCKED` in faint,
     what earns it, a `QBar`, and `Progress: {n} / {target} {unit}`.

Earned dates come from the new defaulted `achievementEarnedAt` store key. Badges already earned
before the key existed are stamped `earned before tracking`, never given an invented date.

---

## What the preview does NOT ask for

The onboarding lane (sections 06 in the preview, `paper` and `darkroom` classes) is a separate
world and a lane this session does not own. Nothing under `src/screens/onboarding/` is touched.

## Enforcement

`src/screenLaw.test.ts` reads the screen sources and asserts the landmarks above are present:
the section titles, the launcher set including the exercise library, the segment labels, the
tile tones on the surfaces that are supposed to carry them. It fails by naming this file. A
landmark that genuinely has to go, goes here first.

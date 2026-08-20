# OP12 SCREEN LAW — every approved screen, contents in order

**Companion to `research/OP12-visual-law.md`.** That file says how things LOOK. This one says
what each screen CONTAINS and in what order, transcribed from the approved preview frame by
frame. `src/screenLaw.test.ts` asserts the landmarks named here still exist in `src/`.

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

In order, top to bottom:

1. **HUD row.** flame + streak count in `heat-soft` (tap goes to Progress) · medal sticker +
   earned-badge count in `gold` · avatar 34px r12 `panel2` 2px `line` (tap goes to Profile).
2. **Week path.** seven `WeekNode`s joined by 3px connectors, lit `volt-edge` behind days that
   are done; weekday initials M T W T F S S underneath at 8.5px/800/faint.
3. **The mission, as ONE `tile heat`.** Inside it, in this order: 52px heat `Coin` holding the
   white dumbbell sticker · eyebrow in `heat-soft` (`{kind} day · Week {n}`) · 27px/900 title ·
   the tagline · the why line · chip row (`~{min} min`, `{n} sets`, `{muscles}`) · the
   `b3d heat` **Start session** button INSIDE the tile.
4. `quietlink` **Can't train today** directly under the tile, centred, underlined, sentence case.
5. Everything the engine already says: banners, adapt proposals, restore pill, reminders,
   cardio, rest-day card, make-up card. Suggestions are a `tile gold` with a `Suggestion`
   eyebrow.
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
   tile is `tile heat` with a heat node.
6. `tile` row **The Plan** — Rules, why your week looks like this, exercise guides — with a `›`.
7. `SectionTitle` **The days**.
8. Day rows: weekday `SetCoin` (volt for done, heat for today, plain otherwise) + the day title
   + its sub + a status `chip` (`done` volt / `today` heat / `rest` / `up next`).

## 6. My Plan · Nutrition

1. `ScreenName` **My Plan** + the segment, Nutrition active.
2. Centred `‹ Fuel · {day} ›`.
3. `tile` with two flat rings side by side: protein 126px, 12px stroke, heat, centre
   `{eaten}` over `/ {target} g`; calories 98px, 12px stroke, ice, centre `{kcal}` over
   `/ {target}`. Track is `panel2`, no gradients, round caps.
4. Chip row: `Training day · {kcal}` (ice) · `floor {n} g` · `{n}-day streak` (gold).
5. `b3d heat` **+ Log food**, full width and loud.
6. `SectionTitle` **Eaten ({n})**.
7. Food rows: protein `SetCoin` (`52P`) + name + `{kcal} kcal` + the quantity controls.

## 7. Progress

1. `ScreenName` **Progress**.
2. Segmented **[Progress | Record | The Board]**.
3. `tile` **Your body this week**: the anatomy figure front and back, trained groups lit,
   recent ones dimmer; `{n} of 7 muscle groups trained this week`; the stalest-group line.
   Under two sessions it says `Assessing. A few sessions and this fills in.`
4. Three stat tiles in a row: flame + streak in `heat-soft` · sessions in `volt` ·
   check-ins in `ice`, each with a 9px eyebrow underneath.
5. `SectionTitle` **The climb** + `Next up {stage} · ~{n} weeks at your rate` + a node path
   whose current node is a 30px heat `HERE` and whose last node holds a trophy sticker.
6. `SectionTitle` **Last 12 weeks** + the existing charts, heatmap, photos.

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

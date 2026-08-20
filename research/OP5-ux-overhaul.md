# OP5 — the UI/UX overhaul, phase 1

What was wrong, what shipped, and what is deliberately still a socket.

This is the record. The two files that GOVERN are `OP5-visual-law.md` (how it looks) and
`OP5-screen-law.md` (what is on each screen), and each has a test that fails when `src/`
drifts from it.

## The diagnosis

BodyT was a smart coach with a quiet face. The engines were real and had been for months:
adaptive plans, honest progression, readiness gates, make-ups, anatomy maps, 58 achievements,
a global Board, a streak engine. The daily experience hid all of it.

- The streak flame rendered in exactly ONE place, a sub-tab of a sub-tab, and only from day 7.
- Finishing a workout ended in a plain text sheet. No beat, no reward, no tomorrow.
- The Start button shared its row with "Can't train", at half width, so the screen asked a
  question where it should have given an instruction.
- The whole off-plan arsenal (14 fitted workouts, a build-your-own picker, run-any-previous-day,
  194 movement guides) hung off one grey line reading "Training something else today? browse ›".
- Identity was a settings page called Coach, which shouted quotes at you and hid the record.

Nothing here was missing. It was unreachable.

## The loop this rebuilds

Open → see today's mission → train → get rewarded → see progress → know tomorrow → come back.

Five questions, answered on sight:

1. **What do I do today?** One heat tile with the day on it and one button inside it.
2. **Why does it matter?** A why line under the title, and the cost in chips: minutes, sets,
   muscles. Every number is the one the engine already computed for the brief sheet.
3. **What happens when I finish?** The finish chain: work counts up, a real PR slams in, the
   flame ignites a new day, your closest badge bar moves, tomorrow lands. Beats with nothing
   true to say skip themselves.
4. **What changed because I showed up?** The mission tile floods volt with the real haul, the
   week path fills a node, Progress Body lights the muscles you trained.
5. **What am I building?** The flame ladder from day one, the badges with live bars, the climb,
   the body, the Board.

## What shipped

**The look.** Flat sticker surfaces on slate, 2px borders on everything, every button a flat
fill with a hard bottom edge it depresses onto, Nunito bundled locally, colour as fills with
dark text. Zero gradients, zero glass, zero glow. The palette and geometry are in
`OP5-visual-law.md`; `src/visualLaw.test.ts` fails if `src/index.css` drifts.

**The vocabulary.** `Tile` (with heat/volt/ice/gold tones), `Coin`, `SetCoin`, `SectionTitle`,
`QBar`, `WeekNode`, `PathLink`, `Segmented`, and `components/stickers.tsx` — the flat two-tone
icon set, because the app's line glyphs are right for a tab bar and wrong inside a coin.

**Today.** HUD (flame + badges earned + you), the week as a node path with weekday labels, the
mission as ONE tile with its button inside, "Can't train" demoted to a quiet link, real
suggestions as gold tiles, Next up with the two badges you are closest to, the Sergeant's daily
line with Push me, and the work as coin-led rows showing the load each set will actually open
with. After you finish: a volt flood with sets, tonnage and PRs, the streak tier and what it is
close to, and tomorrow.

**Train.** The gym door. Today's mission up top pointing back at the plan, then Off the plan
(run a previous day, browse workouts, your own workout, the exercise library) and Conditioning
(log cardio) as icon-coin launchers. The library is `ExercisePicker` in a new `browse` mode:
the same 194 movements and the same filters, where a tap opens the guide instead of adding the
movement to something, and the gear filter starts off because somebody browsing what exists
wants what exists.

**My Plan.** Training and Nutrition behind the approved segmented switch. Training: tier tiles
with path nodes, both plan doors (The Plan, My Booklet), and the days as weekday-coin rows with
status chips. Nutrition: 12px flat rings, protein coins on food rows, one loud log action.

**Progress.** Your body this week leads, then the stats, then the climb. Segments became
Progress | Record | The Board: the trophy case moved to Profile and the coach timeline moved
here as `RecordView`, next to the charts it belongs with.

**Profile.** The Coach tab is gone. Its residents went where decisions are: the quote and the
push to Today, the plan reader to My Plan, the record to Progress, settings behind a gear. What
replaced it is identity: the stats header with the dashed Trainee slot, the training path, a
body glance, the Training Pact socket, My Room, and the BadgeGrid with what earns each badge,
live progress, and the date it was earned.

## The one honesty problem this created, and how it was answered

Badges are derived. All 58 re-evaluate from raw history on every render, which is what keeps
them honest. The DATE cannot be derived: a badge cleared on a 30 day streak stays earned after
the streak breaks, and by then nothing in the data says when.

So `data.achievements.earnedAt` writes it down once and never rewrites it. And the accounts
that already had badges on the day this shipped get `before-tracking` printed on the badge,
not a date the app never recorded. Same class of rule as the journey stamp, same reason.

## Sockets left open, and labelled as such

- **My Room** says `Phase 5 socket` on its face and shows real earned badges as objects.
- **Training Pact** says `soon` and explains what it will do.
- **Connected apps** lists Apple Health, Google Health, Garmin, Strava and Oura with what each
  is waiting on, because a web app cannot read Apple Health at any version. The toggle captures
  intent on this phone and sends nothing anywhere. The one real data feature, export and import,
  sits underneath it.
- **XP, coins and quests** are not built. Next up is the quest engine's socket and it is filled
  with real achievements rather than invented busywork.

## Not this session

Onboarding. The owner is building it elsewhere, and nothing under `src/screens/onboarding/`
was touched. The design record and the multi-goal defect they caught are in the plan document.

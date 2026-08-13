import { useState } from 'react'
import { DEFAULT_HEIGHT_IN } from '../../plan/reach'
import { Btn, ChoiceChip, Reveal, Stepper } from '../../components/ui'

// ============================================================
// Who is training. Four answers, one at a time.
//
// These used to sit on a "Baseline numbers" screen near the END
// of the wizard, which meant every plan was built and every
// question was asked before the app knew whether it was talking
// to a 5'2" woman or a 6'5" man. Two things depend on it from
// the very first session:
//
//   Calories — bodyweight alone cannot tell 5'2" from 6'5" at
//   the same weight, and the gap between them is real food.
//   Distance — a walk is counted in steps, and a step is a
//   fraction of your height. Guessing 5'9" for everybody put
//   short people over and tall people under on every walk.
//
// Height also pre-fills the body-fat estimator, which used to
// ask for it again later.
//
// Nothing here explains itself. "Sex" with a note underneath
// about tape formulas is the app talking about its own
// internals; the question is the question.
// ============================================================

const label = 'text-[13px] font-black uppercase tracking-wider text-ink-faint'

export function MeStep({
  displayName,
  setDisplayName,
  sex,
  setSex,
  heightIn,
  setHeightIn,
  weight,
  setWeight,
  onNext,
}: {
  displayName: string
  setDisplayName: (s: string) => void
  sex: 'male' | 'female' | null
  setSex: (s: 'male' | 'female') => void
  heightIn: number
  setHeightIn: (n: number) => void
  weight: number
  setWeight: (n: number) => void
  onNext: () => void
}) {
  // Height has a default, so "they have seen it" is what opens the
  // weight row — either by moving it or by tapping on past it. Somebody
  // who is exactly 5'8" must not get stuck behind a stepper they had no
  // reason to touch.
  const [pastHeight, setPastHeight] = useState(false)

  // Choosing a sex moves the untouched stepper to that sex's average, so
  // leaving it alone means "no information" rather than a number the app
  // picked and then acted on.
  const pickSex = (s: 'male' | 'female') => {
    setSex(s)
    if (!pastHeight) setHeightIn(DEFAULT_HEIGHT_IN[s])
  }

  const named = displayName.trim().length > 0
  const showHeight = named && sex !== null
  const showWeight = showHeight && pastHeight

  const ft = Math.floor(heightIn / 12)
  const inch = heightIn % 12

  return (
    <div
      className="flex flex-1 flex-col"
      onClick={() => {
        if (showHeight) setPastHeight(true)
      }}
    >
      <h2 className="headline text-center text-[26px]">What should we call you?</h2>
      <input
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        placeholder="Display name"
        className="mt-5 w-full rounded-xl bg-white/[0.05] px-4 py-3.5 text-[15px] font-semibold text-ink outline-none ring-1 ring-white/[0.05] focus:ring-accent/45"
      />

      <Reveal when={named} className="mt-7">
        <p className={label}>Sex</p>
        <div className="mt-2 flex gap-2">
          <ChoiceChip selected={sex === 'male'} onClick={() => pickSex('male')}>
            Male
          </ChoiceChip>
          <ChoiceChip selected={sex === 'female'} onClick={() => pickSex('female')}>
            Female
          </ChoiceChip>
        </div>
      </Reveal>

      <Reveal when={showHeight} className="mt-7">
        <p className={label}>Height</p>
        <div className="mt-2 flex items-center gap-4">
          <Stepper
            value={ft}
            onChange={(v) => {
              setPastHeight(true)
              setHeightIn(Math.min(7, Math.max(4, v)) * 12 + inch)
            }}
            step={1}
            min={4}
            suffix="ft"
            width="w-12"
          />
          <Stepper
            value={inch}
            onChange={(v) => {
              setPastHeight(true)
              // Rolling past either end moves the feet, so 5'11" + 1 is
              // 6'0" rather than a stepper that refuses to go further.
              setHeightIn(Math.min(95, Math.max(48, ft * 12 + v)))
            }}
            step={1}
            min={-1}
            suffix="in"
            width="w-12"
          />
        </div>
      </Reveal>

      <Reveal when={showWeight} className="mt-7">
        <p className={label}>Weight</p>
        <div className="mt-2">
          <Stepper value={weight} onChange={setWeight} step={1} min={70} suffix="lb" width="w-20" />
        </div>
      </Reveal>

      <Btn className="mt-8 w-full py-4" onClick={onNext} disabled={!named || sex === null}>
        Next: the goal
      </Btn>
    </div>
  )
}

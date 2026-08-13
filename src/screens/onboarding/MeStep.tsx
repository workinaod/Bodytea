import { Reveal } from '../../components/ui'
import { DEFAULT_HEIGHT_IN } from '../../plan/reach'
import { HeightField, WeightField } from '../../components/ui'
import { Bar, Kicker, Label, Quiet, Tag, Title, fieldCls, fieldStyle } from './kit'

// ============================================================
// Who is training. Four answers, one at a time.
//
// These used to sit on a "Baseline numbers" screen near the END
// of the wizard, which meant every plan was built and every
// question asked before the app knew whether it was talking to
// a 5'2" woman or a 6'5" man. Two things depend on it from the
// very first session:
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
  heightIn: number | null
  setHeightIn: (n: number | null) => void
  weight: number | null
  setWeight: (n: number | null) => void
  onNext: () => void
}) {
  const named = displayName.trim().length > 0
  const showHeight = named && sex !== null
  const showWeight = showHeight && heightIn !== null
  const ready = named && sex !== null && heightIn !== null && weight !== null

  return (
    <div className="flex flex-1 flex-col">
      <Kicker>Entry 01</Kicker>
      <Title>Who is training?</Title>

      <input
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        placeholder="Display name"
        className={`mt-6 ${fieldCls}`} style={fieldStyle}
      />

      <Reveal when={named} className="mt-8">
        <Label>Sex</Label>
        <div className="flex gap-2">
          <Tag selected={sex === 'male'} onClick={() => setSex('male')} className="flex-1">
            Male
          </Tag>
          <Tag selected={sex === 'female'} onClick={() => setSex('female')} className="flex-1">
            Female
          </Tag>
        </div>
      </Reveal>

      <Reveal when={showHeight} className="mt-8">
        <Label note="tap 5 1 0">Height</Label>
        <HeightField value={heightIn} onChange={setHeightIn} />
        {heightIn === null && sex && (
          <div className="mt-1">
            <Quiet onClick={() => setHeightIn(DEFAULT_HEIGHT_IN[sex])}>I would rather not say</Quiet>
          </div>
        )}
      </Reveal>

      <Reveal when={showWeight} className="mt-8">
        <Label>Weight</Label>
        <WeightField value={weight} onChange={setWeight} />
      </Reveal>

      <div className="mt-auto pt-10">
        <Bar onClick={onNext} disabled={!ready}>
          Next: the goal
        </Bar>
      </div>
    </div>
  )
}

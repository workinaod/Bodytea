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
//
// Age is asked here and stated nowhere else. There is no terms
// screen, no age wall, and no "you must be 11 to continue"
// sitting in front of somebody who is thirty. The minimum is
// mentioned only to the person it is about, once, at the moment
// they type a number below it, and then they carry on. A rule
// that announces itself to everybody is a rule that treats
// everybody as a suspect.
// ============================================================

/** Under this, the app says so once. It does not stop anybody. */
export const MIN_AGE = 11

export function MeStep({
  displayName,
  setDisplayName,
  sex,
  setSex,
  age,
  setAge,
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
  age: number | null
  setAge: (n: number | null) => void
  heightIn: number | null
  setHeightIn: (n: number | null) => void
  weight: number | null
  setWeight: (n: number | null) => void
  onNext: () => void
}) {
  const named = displayName.trim().length > 0
  const showAge = named && sex !== null
  const showHeight = showAge && age !== null
  const showWeight = showHeight && heightIn !== null
  const ready = named && sex !== null && age !== null && heightIn !== null && weight !== null
  // Said to the one person it is about, and never in the way of Next.
  const tooYoung = age !== null && age < MIN_AGE

  return (
    <div className="flex flex-1 flex-col">
      <Kicker>First up</Kicker>
      <Title>What should we call you?</Title>

      <input
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        placeholder="Display name"
        className={`mt-6 ${fieldCls}`} style={fieldStyle}
      />

      <Reveal when={named} className="mt-8">
        <Label>You are</Label>
        <div className="flex gap-2">
          <Tag selected={sex === 'male'} onClick={() => setSex('male')} className="flex-1">
            Male
          </Tag>
          <Tag selected={sex === 'female'} onClick={() => setSex('female')} className="flex-1">
            Female
          </Tag>
        </div>
      </Reveal>

      <Reveal when={showAge} className="mt-8">
        <Label>How old are you?</Label>
        <input
          inputMode="numeric"
          value={age ?? ''}
          onChange={(e) => {
            const n = Number(e.target.value.replace(/\D/g, '').slice(0, 3))
            setAge(e.target.value.trim() === '' || n === 0 ? null : n)
          }}
          placeholder="Age"
          className={fieldCls}
          style={fieldStyle}
        />
        {tooYoung && (
          <p className="mt-2 text-[12px] font-semibold leading-snug text-gold">
            BodyT is built for {MIN_AGE} and up. Some of what it asks for will not fit you yet.
          </p>
        )}
      </Reveal>

      <Reveal when={showHeight} className="mt-8">
        <Label>How tall are you?</Label>
        <HeightField value={heightIn} onChange={setHeightIn} />
        {heightIn === null && sex && (
          <div className="mt-1">
            <Quiet onClick={() => setHeightIn(DEFAULT_HEIGHT_IN[sex])}>Skip this</Quiet>
          </div>
        )}
      </Reveal>

      <Reveal when={showWeight} className="mt-8">
        <Label>And roughly how heavy?</Label>
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

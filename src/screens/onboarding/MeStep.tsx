import { Btn, ChoiceChip, HeightField, Reveal, WeightField } from '../../components/ui'
import { DEFAULT_HEIGHT_IN } from '../../plan/reach'

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

const label = 'text-center text-[12px] font-black uppercase tracking-[0.16em] text-ink-faint'

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
    <div className="flex flex-1 flex-col items-center text-center">
      <h2 className="headline text-[30px]">What should we call you?</h2>
      <input
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        placeholder="Display name"
        className="mt-6 w-full max-w-[19rem] rounded-2xl bg-white/[0.05] px-4 py-3.5 text-center text-[16px] font-semibold text-ink outline-none ring-1 ring-white/[0.07] transition-[background,box-shadow] placeholder:text-ink-faint/60 focus:bg-white/[0.08] focus:ring-accent/55"
      />

      <Reveal when={named} className="mt-8 w-full">
        <p className={label}>Sex</p>
        <div className="mt-2.5 flex justify-center gap-2">
          <ChoiceChip
            selected={sex === 'male'}
            onClick={() => setSex('male')}
            className="min-w-[6.5rem]"
          >
            Male
          </ChoiceChip>
          <ChoiceChip selected={sex === 'female'} onClick={() => setSex('female')} className="min-w-[6.5rem]">
            Female
          </ChoiceChip>
        </div>
      </Reveal>

      <Reveal when={showHeight} className="mt-8 w-full">
        <p className={label}>Height</p>
        <div className="mt-2.5">
          <HeightField value={heightIn} onChange={setHeightIn} />
        </div>
      </Reveal>

      <Reveal when={showWeight} className="mt-8 w-full">
        <p className={label}>Weight</p>
        <div className="mt-2.5">
          <WeightField value={weight} onChange={setWeight} />
        </div>
      </Reveal>

      <Btn className="mt-10 w-full max-w-[21rem] py-4" onClick={onNext} disabled={!ready}>
        Next: the goal
      </Btn>
      {named && !ready && (
        <p className="mt-2.5 text-[11.5px] text-ink-faint">
          {sex === null
            ? ' '
            : heightIn === null
              ? `Type it like 5 1 0 for 5' 10"`
              : 'And your weight.'}
        </p>
      )}
      {/* The reference height for their sex, one tap, for anybody who
          would rather not say. Skipping is a real answer: it lands on
          the average, which is exactly the plan they got before height
          was ever asked for. */}
      {showHeight && heightIn === null && sex && (
        <button
          onClick={() => setHeightIn(DEFAULT_HEIGHT_IN[sex])}
          className="press mt-3 py-1 text-[12px] font-semibold text-ink-faint underline decoration-white/20 underline-offset-4"
        >
          I would rather not say
        </button>
      )}
    </div>
  )
}

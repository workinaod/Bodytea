import type { Goal } from '../../types'
import { Btn } from '../../components/ui'

// ============================================================
// The first screen anyone sees.
//
// Version one was ninety words claiming the app handled any
// goal. Version two replaced the words with five goal buttons —
// better, except the five were one person's life. Version three
// fixed the goals and still looked like a component-library
// demo: a 10px brand mark, a headline, five grey rows, two
// buttons, sitting on flat black.
//
// This one is built around the name. BodyT arrives at the size
// a name should be, the goals rise under it in sequence, and
// the whole thing sits on moving light rather than on a void.
// The goals are still the interface — full-width, thumb-sized,
// and tapping one IS starting.
// ============================================================

export interface QuickGoal {
  label: string
  /** Pre-fills the goal, editable at the next step. */
  statement: string
  /** The goal itself, not a position in a list that can be reordered. */
  goal: Goal
}

/** A glyph per goal, so the rows are scannable before they are read. */
const MARK: Record<Goal, string> = {
  lean: '🔥',
  general: '🫀',
  muscle: '💪',
  endurance: '🏃',
  strength: '🏋️',
  vertical: '⬆️',
  speed: '⚡',
}

export function Welcome({
  rebuilding,
  quickGoals,
  onPickGoal,
  onBuild,
  onOwnRoutine,
}: {
  rebuilding: boolean
  quickGoals: QuickGoal[]
  onPickGoal: (g: QuickGoal) => void
  onBuild: () => void
  onOwnRoutine: () => void
}) {
  return (
    <div className="flex flex-1 flex-col justify-center py-6 text-center">
      {/* The name, at the size a name should be. The T is the mark: the
          only capital in the word and the one letter that is not
          "body". The glow behind it is the same heat as the field. */}
      <div className="breathe-in relative">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 h-40 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-70 blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(255,79,48,0.35), transparent 68%)' }}
        />
        <h1 className="headline relative text-[56px] leading-none tracking-[-0.04em]">
          Body<span className="text-accent">T</span>
        </h1>
      </div>

      <p className="mt-4 text-[15px] font-semibold text-ink-dim">What are your goals?</p>

      {/* The goals ARE the screen. Full-width rows, biggest thing here,
          each one a real starting point rather than an example of one. */}
      <div className="enter-stagger mt-7 space-y-2.5">
        {quickGoals.map((g) => (
          <button
            key={g.label}
            type="button"
            onClick={() => onPickGoal(g)}
            className="press group flex w-full items-center gap-3.5 rounded-2xl bg-gradient-to-b from-white/[0.10] to-white/[0.035] px-4 py-4 text-left shadow-[0_1px_0_rgba(255,255,255,0.10)_inset,0_16px_32px_-24px_rgba(0,0,0,1)] ring-1 ring-white/[0.09] backdrop-blur-sm transition-[background,box-shadow,transform] active:from-accent/25 active:to-accent/10 active:ring-accent/45"
          >
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/[0.07] text-[20px] shadow-[0_1px_0_rgba(255,255,255,0.08)_inset] ring-1 ring-white/[0.07]">
              {MARK[g.goal]}
            </span>
            <span className="min-w-0 flex-1 text-[15.5px] font-bold tracking-tight text-ink">
              {g.label.replace(/^\S+\s/, '')}
            </span>
            <span className="shrink-0 text-[17px] font-black text-ink-faint transition-colors group-active:text-accent">
              ›
            </span>
          </button>
        ))}
      </div>

      {rebuilding && (
        <p className="enter mx-auto mt-6 max-w-[21rem] rounded-xl bg-accent/10 px-3.5 py-2.5 text-label leading-snug text-ink-dim ring-1 ring-accent/25">
          <span className="font-bold text-accent-soft">Your plan is being rebuilt.</span> Everything you logged
          is safe. Answer again and you get the better version.
        </p>
      )}

      {/* Anything not on the list, and the door for people who already
          train. Quiet, because the five above are the main road. */}
      <button
        onClick={onBuild}
        className="press mx-auto mt-6 py-2 text-[13px] font-bold text-ink-dim underline decoration-white/25 underline-offset-4"
      >
        {rebuilding ? 'Rebuild my plan' : 'Something else'}
      </button>
      <Btn kind="subtle" size="lg" className="mt-2 w-full" onClick={onOwnRoutine}>
        I already have a routine
      </Btn>
    </div>
  )
}

import type { Goal } from '../../types'
import { Btn } from '../../components/ui'

// ============================================================
// The first screen anyone sees.
//
// It has been through three versions and the first two both had
// the same problem in different clothes. Version one was ninety
// words claiming the app handled any goal. Version two replaced
// the words with five goal buttons — better, except the five
// were one person's life (dunk a basketball, bench 225, first
// marathon), so a 45-year-old who wants to stop being out of
// breath opened the app and saw nothing for her. It also read as
// a component library demo: a headline, a row of pills, four
// grey icons, two buttons, all left-aligned, no weight anywhere.
//
// This version does one thing: it makes the choice the screen.
// The goals are the interface, they are the goals people
// actually arrive with, and each is a full-width row you can hit
// with a thumb rather than a pill in a wrapped heap. Tapping one
// IS starting — no "next" to find.
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
    <div className="flex flex-1 flex-col justify-center py-6">
      {/* The name, at the size a name should be. It was a 10px eyebrow —
          the app introduced itself in the smallest type on its own front
          door. The T is the mark: it is the only capital in the word and
          the one letter that is not "body". */}
      <div className="text-center">
        <div className="headline text-[46px] leading-none tracking-[-0.035em]">
          Body<span className="text-accent">T</span>
        </div>
        <h1 className="mt-3 text-[19px] font-bold tracking-tight text-ink-dim">What are your goals?</h1>
      </div>

      {/* The goals ARE the screen. Full-width rows, biggest thing here,
          each one a real starting point rather than an example of one. */}
      <div className="enter-stagger mt-7 space-y-2">
        {quickGoals.map((g) => (
          <button
            key={g.label}
            type="button"
            onClick={() => onPickGoal(g)}
            className="press flex w-full items-center gap-3.5 rounded-2xl bg-gradient-to-b from-white/[0.09] to-white/[0.04] px-4 py-4 text-left shadow-[0_1px_0_rgba(255,255,255,0.1)_inset,0_10px_24px_-16px_rgba(0,0,0,0.9)] ring-1 ring-white/[0.08] active:from-accent/20 active:to-accent/10 active:ring-accent/40"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/[0.06] text-[19px] ring-1 ring-white/[0.06]">
              {MARK[g.goal]}
            </span>
            <span className="min-w-0 flex-1 text-[15px] font-bold tracking-tight text-ink">
              {g.label.replace(/^\S+\s/, '')}
            </span>
            <span className="shrink-0 text-[17px] font-black text-ink-faint">›</span>
          </button>
        ))}
      </div>

      {rebuilding && (
        <p className="mt-6 border-l-2 border-accent/60 py-1 pl-3 text-label leading-snug text-ink-dim">
          <span className="font-bold text-accent-soft">Your plan is being rebuilt.</span> Everything you logged
          is safe. Answer again and you get the better version.
        </p>
      )}

      {/* Anything not on the list, and the door for people who already
          train. Quiet, because the five above are the main road. */}
      <button
        onClick={onBuild}
        className="press mt-5 w-full py-2 text-center text-[13px] font-bold text-ink-dim underline decoration-white/25 underline-offset-4"
      >
        {rebuilding ? 'Rebuild my plan' : 'Something else'}
      </button>
      <Btn kind="subtle" size="lg" className="mt-2 w-full" onClick={onOwnRoutine}>
        I already have a routine
      </Btn>
    </div>
  )
}

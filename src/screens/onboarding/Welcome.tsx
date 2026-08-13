import { useState } from 'react'
import type { Goal } from '../../types'

// ============================================================
// The first screen anyone sees, and the only one that is the
// room itself rather than paper pinned over it.
//
// Four versions before this. Ninety words of claims; then five
// goal buttons that were one person's life; then the same five
// rounded and glowing on a dark gradient, which is what every
// generated app looks like.
//
// This is a tunnel with the name built into the architecture.
// The question is the biggest thing on screen, the goals are
// hard-edged tags under it, and the way in is one block of
// light.
// ============================================================

export interface QuickGoal {
  label: string
  /** Pre-fills the goal, editable at the next step. */
  statement: string
  /** The goal itself, not a position in a list that can be reordered. */
  goal: Goal
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
  // Selecting and starting are two taps here, not one. On a screen this
  // sparse a single tap that both chooses and navigates gives you no
  // moment to change your mind.
  const [picked, setPicked] = useState<QuickGoal | null>(null)

  return (
    <div className="flex flex-1 flex-col">
      <div className="headline text-[24px] leading-none tracking-[-0.04em]">
        Body<span className="text-accent">T</span>
      </div>

      <div className="mt-auto pt-16">
        <h1 className="headline text-[52px] uppercase leading-[0.86] tracking-[-0.045em]">
          What are
          <br />
          <span className="text-accent">your goals?</span>
        </h1>
        <p className="mt-4 max-w-[17rem] text-[14px] leading-relaxed text-ink-dim">
          Pick one. You get a plan built round your week, not somebody else's.
        </p>

        {/* Hard-edged tags, not pills. Selected is a solid block of
            accent — no tint, no ring, no middle state. */}
        <div className="enter-stagger mt-8 flex flex-wrap gap-2">
          {quickGoals.map((g) => {
            const on = picked?.goal === g.goal
            return (
              <button
                key={g.label}
                type="button"
                aria-pressed={on}
                onClick={() => setPicked(g)}
                className={`press px-4 py-3 text-[12.5px] font-black uppercase leading-none tracking-[0.06em] transition-colors ${
                  on
                    ? 'bg-accent text-black'
                    : 'text-ink shadow-[inset_0_0_0_1px_rgba(255,255,255,0.22)]'
                }`}
              >
                {g.label.replace(/^\S+\s/, '')}
              </button>
            )
          })}
          <button
            type="button"
            onClick={onBuild}
            className="press px-4 py-3 text-[12.5px] font-black uppercase leading-none tracking-[0.06em] text-ink-faint shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]"
          >
            {rebuilding ? 'Rebuild' : 'Something else'}
          </button>
        </div>
      </div>

      {rebuilding && (
        <p className="enter mt-6 border-l-2 border-accent py-1 pl-3 text-[12px] leading-snug text-ink-dim">
          <span className="font-black uppercase tracking-[0.08em] text-accent">Rebuilding.</span> Everything you
          logged is safe. Answer again and you get the better version.
        </p>
      )}

      <div className="mt-9">
        <button
          type="button"
          disabled={!picked}
          onClick={() => picked && onPickGoal(picked)}
          className="press w-full bg-[#EFEFEE] py-[18px] text-[14px] font-black uppercase tracking-[0.14em] text-[#0B0B0C] transition-opacity disabled:opacity-25"
        >
          Let's go
        </button>
        <button
          type="button"
          onClick={onOwnRoutine}
          className="press mt-1 w-full py-3 text-[11px] font-black uppercase tracking-[0.18em] text-ink-faint"
        >
          I already have a routine
        </button>
      </div>
    </div>
  )
}

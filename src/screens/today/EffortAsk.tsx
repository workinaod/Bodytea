import { useState } from 'react'

// ============================================================
// The two questions the load engine actually needs, asked in the
// only place they cost nothing: the rest screen, after the work
// is already done.
//
// Its own file because FocusView.tsx is at its line allowance and
// because these are one job: telling the plan what the last set
// really was, as opposed to what it asked for.
//
// Both are skippable and neither blocks the timer. That is the
// point. The app used to have no way at all to say "I got eight
// of the ten", so progression compared the rep target against a
// copy of itself, decided every set had been cleared, and kept
// climbing regardless. The opposite failure, demanding a number
// after every set, is what makes people stop logging. So: silence
// means you hit it, and one tap says you did not.
// ============================================================

/** Reps below the ask that are worth offering as one tap. */
function shortfallChoices(target: number): number[] {
  return Array.from({ length: Math.min(4, target) }, (_, i) => target - 1 - i).filter((n) => n >= 0)
}

const CHIP = 'rounded-full bg-white/[0.07] px-4 py-2 text-[12px] font-bold text-ink-dim active:bg-white/[0.14]'

export function EffortAsk({
  target,
  onShort,
  askRir,
  onRir,
}: {
  /** What the set just finished asked for. Absent when it was not a countable set. */
  target?: number
  /** Record the shortfall. Returns what the plan did about it, if anything. */
  onShort?: (achieved: number) => string | null
  /** Roughly the midpoint of this movement: a good moment to ask what is left. */
  askRir?: boolean
  onRir?: (rir: number) => string | null
}) {
  const [open, setOpen] = useState(false)
  const [said, setSaid] = useState<string | null>(null)
  const [rirDone, setRirDone] = useState<string | null>(null)

  const canAskShort = target !== undefined && target > 1 && !!onShort

  return (
    <>
      {canAskShort && !said && !open && (
        <button
          onClick={() => setOpen(true)}
          className="mt-6 text-[11.5px] font-bold text-ink-faint underline underline-offset-4 active:text-ink-dim"
        >
          came up short?
        </button>
      )}

      {canAskShort && !said && open && (
        <div className="mt-6 text-center">
          <div className="text-[11.5px] font-bold text-ink-dim">How many did you get?</div>
          <div className="mt-2 flex flex-wrap justify-center gap-1.5">
            {shortfallChoices(target).map((n) => (
              <button
                key={n}
                onClick={() =>
                  setSaid(onShort?.(n) ?? `Logged ${n}. The plan holds this weight instead of adding to it.`)
                }
                className={CHIP}
              >
                {n}
              </button>
            ))}
            <button onClick={() => setOpen(false)} className={CHIP}>
              got them all
            </button>
          </div>
        </div>
      )}

      {said && <div className="mt-6 max-w-[280px] text-center text-[11.5px] font-bold text-lime">{said}</div>}

      {askRir && !rirDone && onRir && (
        <div className="mt-7 text-center">
          <div className="text-[11.5px] font-bold text-ink-dim">How many reps were left in the tank?</div>
          <div className="mt-2 flex gap-1.5">
            {(
              [
                [0, 'None'],
                [1, '1'],
                [2, '2'],
                [3, '3 or more'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                onClick={() => setRirDone(onRir(value) ?? 'Noted, for this lift only.')}
                className={CHIP}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="mt-2 text-[11px] text-ink-faint">Optional. Skip it and nothing changes.</div>
        </div>
      )}

      {rirDone && <div className="mt-7 max-w-[280px] text-center text-[11.5px] font-bold text-lime">{rirDone}</div>}
    </>
  )
}

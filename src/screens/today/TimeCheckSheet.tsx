import { useState } from 'react'
import type { SessionLog } from '../../types'
import { Sheet } from '../../components/Sheet'
import { Btn } from '../../components/ui'
import { focusProgress } from '../../engine/focus'
import { cutToEssentials } from '../../logic/timeActions'

// ============================================================
// "Short on time?"
//
// The quiet twin of "Can't finish", and a separate control on
// purpose: "the cant finish button is for when a workout is too
// hard but if theres a scheduling or time issue just have a
// check for time."
//
// Nothing here is logged as fatigue. The gym closing at nine is
// not evidence about how strong anyone is, and letting it into
// the notes the next session learns from would teach the engine
// the wrong lesson entirely.
//
// Two ways out, because there are only two: do less, or stop.
// ============================================================

const GLASS =
  'bg-surface border-2 border-edge shadow-[0_1px_0_rgba(255,255,255,0.06)_inset] active:bg-surface-2'

export function TimeCheckSheet({
  open,
  onClose,
  session,
  onFinishSession,
}: {
  open: boolean
  onClose: () => void
  session: SessionLog
  /** Ends the session through the existing quit gate. */
  onFinishSession: () => void
}) {
  const [done, setDone] = useState<string | null>(null)

  function close() {
    setDone(null)
    onClose()
  }

  const progress = focusProgress(session)
  const left = Math.max(0, progress.total - progress.done)

  return (
    <Sheet open={open} onClose={close} title={done ? 'Sorted' : 'Short on time?'}>
      {done ? (
        <div className="pb-7 pt-1">
          <div className="rounded-2xl bg-surface px-4 py-4 border-2 border-[var(--lip-lime)] shadow-[0_3px_0_var(--lip-lime)]">
            <p className="text-[15px] font-extrabold leading-snug text-lime">{done}</p>
          </div>
          <Btn kind="subtle" size="lg" className="mt-3 w-full" onClick={close}>
            Back to the set
          </Btn>
        </div>
      ) : (
        <div className="pb-7">
          <p className="px-0.5 pb-3 text-[11px] font-black uppercase tracking-[0.14em] text-ink-faint">
            {left} {left === 1 ? 'set' : 'sets'} left
          </p>
          <div className="space-y-2">
            <button
              onClick={() => {
                const cut = cutToEssentials(session.date)
                setDone(
                  !cut || cut.dropped === 0
                    ? 'Already down to the essentials. Nothing else to cut.'
                    : `${cut.dropped} ${cut.dropped === 1 ? 'movement' : 'movements'} out, ${cut.setsSaved} fewer sets. The ones that matter stay.`,
                )
              }}
              className="press block w-full rounded-2xl bg-surface px-4 py-3.5 text-left border-2 border-accent-deep shadow-[0_1px_0_rgba(255,255,255,0.12)_inset]"
            >
              <span className="block text-[14.5px] font-extrabold leading-tight text-accent-soft">
                Cut to the essentials
              </span>
              <span className="mt-1 block text-[11.5px] leading-snug text-ink-faint">
                Keep what the day cannot do without. Drop the rest.
              </span>
            </button>
            <button
              onClick={() => {
                close()
                onFinishSession()
              }}
              className={`press block w-full rounded-2xl px-4 py-3.5 text-left ${GLASS}`}
            >
              <span className="block text-[14.5px] font-extrabold leading-tight text-ink">
                Finish here, log what I did
              </span>
              <span className="mt-1 block text-[11.5px] leading-snug text-ink-faint">
                Everything already done still counts.
              </span>
            </button>
          </div>
          <Btn kind="ghost" size="md" className="mt-3 w-full" onClick={close}>
            Never mind, keep going
          </Btn>
        </div>
      )}
    </Sheet>
  )
}

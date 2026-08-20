import { useState } from 'react'
import type { DayKind, ISODate } from '../../types'
import { useAppStore } from '../../store/appStore'
import { makeupCandidate } from '../../engine/reconcile'
import { Btn, Card } from '../../components/ui'
import { MakeupSheet } from './MakeupSheet'

// ============================================================
// The one piece of off-plan training that stays on Today.
//
// Everything else you might do with a barbell moved to the
// Train tab, and should have: it is a shelf, and a shelf is a
// destination. A make-up is not a shelf. It is time-sensitive
// coaching about THIS week, and it expires: an off day with a
// miss behind it is the window, and by next Monday the week is
// already whole or already not.
//
// So it keeps the card, on the screen that answers what to do
// today, and Train keeps the door for everything else.
// ============================================================

export function MakeupCard({
  date,
  active,
  hasSession,
  dayKind,
  onRunDay,
  onOpenTrain,
}: {
  date: ISODate
  /** True on the live day only; sessions start on their day. */
  active: boolean
  hasSession: boolean
  dayKind: DayKind
  /** Run that day's workout today. Today owns the readiness and intensity gates. */
  onRunDay: (date: ISODate, cns: boolean) => void
  onOpenTrain?: () => void
}) {
  const data = useAppStore((s) => s.data)
  const [pickOpen, setPickOpen] = useState(false)

  if (!active || hasSession) return null
  const offDay = dayKind === 'rest'
  const makeup = offDay ? makeupCandidate(data, date) : null

  const run = (d: ISODate, cns: boolean) => {
    setPickOpen(false)
    onRunDay(d, cns)
  }

  return (
    <>
      {makeup && (
        <Card className="border-accent/40">
          <div className="text-[11px] font-black uppercase tracking-wider text-accent">Make-up day</div>
          <p className="mt-1 text-[13px] leading-snug text-ink-dim">
            You missed <span className="font-bold text-ink">{makeup.title}</span> this week. Off day, open
            window. Run it now and the week stays whole.
          </p>
          <Btn className="mt-2.5 w-full" onClick={() => run(makeup.date, makeup.cns)}>
            Make it up today
          </Btn>
          <button
            onClick={() => setPickOpen(true)}
            className="mt-2 w-full text-center text-[12px] font-semibold text-cyan underline"
          >
            or pick a different day
          </button>
        </Card>
      )}

      {/* One quiet door, pointing at the room that holds the rest. */}
      {onOpenTrain && (
        <button
          onClick={onOpenTrain}
          className="flex w-full items-center justify-between gap-2 px-1 py-1.5 text-left"
        >
          <span className="text-[12.5px] font-semibold text-ink-faint">
            {offDay ? 'Off day. Want to move anyway?' : 'Training something else today?'}
          </span>
          <span className="text-[12px] font-bold text-cyan">Train ›</span>
        </button>
      )}

      <MakeupSheet open={pickOpen} today={date} onClose={() => setPickOpen(false)} onRun={run} />
    </>
  )
}

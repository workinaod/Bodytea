import { useState } from 'react'
import type { DayKind, DebriefData, ISODate } from '../../types'
import { useAppStore } from '../../store/appStore'
import { makeupCandidate } from '../../engine/reconcile'
import { Btn, Card } from '../../components/ui'
import { Sheet } from '../../components/Sheet'
import { MakeupSheet } from './MakeupSheet'
import { WorkoutsSheet } from './WorkoutsSheet'
import { OwnWorkoutSheet } from './OwnWorkoutSheet'

// ============================================================
// Training the plan didn't schedule, in one place: make up a
// missed day (or rerun any recent one), scroll the general
// workouts shelf, or build a workout from the exercise list.
//
// On an off day it earns a card: an open window is the honest
// moment to offer more work. On a scheduled day it stays one
// quiet line, because the plan's session comes first and this
// must never compete with the Start button above it.
//
// It also stays available AFTER the day's session is done. It
// used to vanish the moment any session existed, which closed
// the day out: finish the plan's work, then play ball or
// remember the abs, and there was nowhere to put it. A day
// takes more until 3am, and adding to it re-opens it rather
// than replacing what is already logged.
// ============================================================

const GLASS =
  'bg-white/[0.055] ring-1 ring-white/[0.06] shadow-[0_1px_0_rgba(255,255,255,0.06)_inset] active:bg-white/[0.11]'

export function ExtraTraining({
  date,
  open: dayOpen,
  sessionState,
  dayKind,
  onRunDay,
  onLogged,
}: {
  date: ISODate
  /** The day still takes work: today, or last night before 3am. */
  open: boolean
  /** none = nothing logged yet, live = a session is running, done = finished. */
  sessionState: 'none' | 'live' | 'done'
  dayKind: DayKind
  /** Start a previous plan day's workout today (readiness gate on CNS days). */
  onRunDay: (date: ISODate, cns: boolean) => void
  /** An after-the-fact log just finished; show its debrief. */
  onLogged: (d: DebriefData) => void
}) {
  const data = useAppStore((s) => s.data)
  const [hubOpen, setHubOpen] = useState(false)
  const [makeupOpen, setMakeupOpen] = useState(false)
  const [workoutsOpen, setWorkoutsOpen] = useState(false)
  const [ownOpen, setOwnOpen] = useState(false)

  // While a session is actually running, the session view owns the
  // screen and more work belongs inside it, not beside it.
  if (!dayOpen || sessionState === 'live') return null

  const done = sessionState === 'done'
  const offDay = dayKind === 'rest'
  // A make-up is an offer for a day with nothing on it yet. Once the
  // athlete has trained, the day is not missing its work any more.
  const makeup = offDay && !done ? makeupCandidate(data, date) : null

  const closeAll = () => {
    setHubOpen(false)
    setMakeupOpen(false)
    setWorkoutsOpen(false)
    setOwnOpen(false)
  }

  const runDay = (d: ISODate, cns: boolean) => {
    closeAll()
    onRunDay(d, cns)
  }

  const logged = (d: DebriefData) => {
    closeAll()
    onLogged(d)
  }

  const options = (
    <div className="space-y-2">
      <button onClick={() => setMakeupOpen(true)} className={`press block w-full rounded-2xl px-4 py-3.5 text-left ${GLASS}`}>
        <span className="block text-[14px] font-extrabold leading-tight">Run a previous day</span>
        <span className="mt-0.5 block text-[11.5px] leading-snug text-ink-faint">
          Make up a missed day, or rerun one you liked.
        </span>
      </button>
      <button onClick={() => setWorkoutsOpen(true)} className={`press block w-full rounded-2xl px-4 py-3.5 text-left ${GLASS}`}>
        <span className="block text-[14px] font-extrabold leading-tight">Browse workouts</span>
        <span className="mt-0.5 block text-[11.5px] leading-snug text-ink-faint">
          Ready-made sessions, fitted to your gear.
        </span>
      </button>
      <button onClick={() => setOwnOpen(true)} className={`press block w-full rounded-2xl px-4 py-3.5 text-left ${GLASS}`}>
        <span className="block text-[14px] font-extrabold leading-tight">Your own workout</span>
        <span className="mt-0.5 block text-[11.5px] leading-snug text-ink-faint">
          Pick exercises, run it now or log it after.
        </span>
      </button>
    </div>
  )

  return (
    <>
      {/* The week's first miss keeps its front-and-center card */}
      {makeup && (
        <Card className="border-accent/40">
          <div className="text-[11px] font-black uppercase tracking-wider text-accent">Make-up day</div>
          <p className="mt-1 text-[13px] leading-snug text-ink-dim">
            You missed <span className="font-bold text-ink">{makeup.title}</span> this week. Off day, open
            window. Run it now and the week stays whole.
          </p>
          <Btn className="mt-2.5 w-full" onClick={() => runDay(makeup.date, makeup.cns)}>
            Make it up today
          </Btn>
          <button
            onClick={() => setMakeupOpen(true)}
            className="mt-2 w-full text-center text-[12px] font-semibold text-cyan underline"
          >
            or pick a different day
          </button>
        </Card>
      )}

      {done ? (
        <button
          onClick={() => setHubOpen(true)}
          className="flex w-full items-center justify-between gap-2 px-1 py-1.5 text-left"
        >
          <span className="text-[12.5px] font-semibold text-ink-faint">
            Did something else too?
          </span>
          <span className="text-[12px] font-bold text-cyan">add it ›</span>
        </button>
      ) : offDay ? (
        <Card>
          <div className="text-[13.5px] font-extrabold">Off day, but want to move?</div>
          <p className="mb-2.5 mt-0.5 text-[11.5px] leading-snug text-ink-faint">
            Recovery is part of the program. If you train anyway, train something real:
          </p>
          {options}
        </Card>
      ) : (
        /* On a day the plan already has an answer for, this is a door and
           not an offer: one quiet line that never competes with Start. */
        <button
          onClick={() => setHubOpen(true)}
          className="flex w-full items-center justify-between gap-2 px-1 py-1.5 text-left"
        >
          <span className="text-[12.5px] font-semibold text-ink-faint">
            Training something else today?
          </span>
          <span className="text-[12px] font-bold text-cyan">browse ›</span>
        </button>
      )}

      <Sheet
        open={hubOpen}
        onClose={() => setHubOpen(false)}
        title={done ? 'Add more work' : 'Train off the plan'}
      >
        <div className="pb-8">
          <p className="mb-3 px-0.5 text-[12px] leading-snug text-ink-dim">
            {done
              ? 'This gets added to today, it does not replace what you already logged. The day stays open until 3am.'
              : "Today's scheduled session is still the best call. But done beats perfect, and any of these logs as a real session."}
          </p>
          {options}
        </div>
      </Sheet>

      <MakeupSheet open={makeupOpen} today={date} onClose={() => setMakeupOpen(false)} onRun={runDay} />
      <WorkoutsSheet
        open={workoutsOpen}
        date={date}
        onClose={() => setWorkoutsOpen(false)}
        onLive={closeAll}
        onLogged={logged}
      />
      <OwnWorkoutSheet
        open={ownOpen}
        date={date}
        onClose={() => setOwnOpen(false)}
        onLive={closeAll}
        onLogged={logged}
      />
    </>
  )
}

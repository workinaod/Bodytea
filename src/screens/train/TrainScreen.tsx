import { useMemo, useState } from 'react'
import type { DebriefData, ISODate } from '../../types'
import { useAppStore } from '../../store/appStore'
import { useToday } from '../../logic/clock'
import { lateNightGraceDate } from '../../engine/rollover'
import { resolveDay } from '../../engine/resolveDay'
import { briefForDay } from '../../engine/workoutBrief'
import { Btn, Card, ScreenHeader } from '../../components/ui'
import { MakeupSheet } from '../today/MakeupSheet'
import { WorkoutsSheet } from '../today/WorkoutsSheet'
import { OwnWorkoutSheet } from '../today/OwnWorkoutSheet'
import { CardioSheet } from '../today/CardioSheet'
import { DebriefSheet } from '../today/DebriefSheet'

// ============================================================
// The gym door.
//
// All of this already existed: the fitted workouts shelf, the
// build-your-own picker, rerunning any previous day, cardio.
// It was reachable through one grey line at the bottom of
// Today that read "Training something else today? browse ›",
// which is where features go to be undiscovered.
//
// Today answers ONE question, and its answer is the plan's.
// This tab is everything else you might do with a barbell, and
// it opens by pointing back at the plan, because on most days
// the plan's session is still the right call.
// ============================================================

// A tile, per research/OP5-visual-law.md: flat panel, 2px outline, and
// a lip. The translucent glass this used to be is the one thing the
// approved concept has no room for anywhere.
const TILE = 'border-2 border-edge bg-surface shadow-[0_3px_0_var(--color-edge)]'

function Launcher({ title, sub, onClick }: { title: string; sub: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`press-down block w-full rounded-2xl px-4 py-3.5 text-left [--lip:var(--lip-quiet)] ${TILE}`}>
      <span className="block text-[14px] font-extrabold leading-tight">{title}</span>
      <span className="mt-0.5 block text-[11.5px] leading-snug text-ink-faint">{sub}</span>
    </button>
  )
}

export function TrainScreen({
  onOpenToday,
  requestRun,
}: {
  /** Jump back to Today, where every live session actually runs. */
  onOpenToday?: () => void
  /** Run a previous plan day today. Today owns the readiness and intensity gates. */
  requestRun?: (date: ISODate, cns: boolean) => void
} = {}) {
  const data = useAppStore((s) => s.data)
  const realToday = useToday()
  const date = lateNightGraceDate(data, realToday, new Date()) ?? realToday

  const [makeupOpen, setMakeupOpen] = useState(false)
  const [workoutsOpen, setWorkoutsOpen] = useState(false)
  const [ownOpen, setOwnOpen] = useState(false)
  const [cardioOpen, setCardioOpen] = useState(false)
  const [debrief, setDebrief] = useState<DebriefData | null>(null)

  const day = useMemo(() => resolveDay(date, data), [date, data])
  const brief = useMemo(
    () => (day.kind === 'rest' ? null : briefForDay(day, data)),
    [day, data],
  )
  const session = data.sessions[date]
  const banked = session && (session.endedAt || session.status === 'completed' || session.status === 'downgraded-completed')

  const closeAll = () => {
    setMakeupOpen(false)
    setWorkoutsOpen(false)
    setOwnOpen(false)
  }

  return (
    <div className="space-y-3 pb-6">
      <ScreenHeader title="Train" />

      {/* The plan first, always. This tab is the alternative, not the default. */}
      <Card className={banked ? '' : 'border-accent/35'}>
        <div className="eyebrow text-ink-faint">{banked ? 'Today is banked' : "Today's session"}</div>
        {banked ? (
          <p className="mt-1 text-[13px] leading-snug text-ink-dim">
            The work is in. Anything below is extra, and extra is optional.
          </p>
        ) : day.kind === 'rest' ? (
          <p className="mt-1 text-[13px] leading-snug text-ink-dim">
            Rest day. Recovery is part of the program, so nothing here is owed. If you train anyway,
            train something real.
          </p>
        ) : (
          <>
            <div className="mt-1 text-[19px] font-black leading-tight">{day.title}</div>
            <div className="mt-1 text-[12px] font-semibold text-ink-faint">
              {day.exercises.length} moves · ~{brief?.minutes ?? 0} min · {brief?.totalSets ?? 0} sets
            </div>
            {onOpenToday && (
              <Btn className="mt-2.5 w-full" onClick={onOpenToday}>
                Go to Today ›
              </Btn>
            )}
          </>
        )}
      </Card>

      <div className="space-y-2">
        <Launcher
          title="Run a previous day"
          sub="Make up a missed day, or rerun one you liked."
          onClick={() => setMakeupOpen(true)}
        />
        <Launcher
          title="Browse workouts"
          sub="Ready-made sessions, fitted to your gear."
          onClick={() => setWorkoutsOpen(true)}
        />
        <Launcher
          title="Your own workout"
          sub="Pick exercises, run it now or log it after."
          onClick={() => setOwnOpen(true)}
        />
        <Launcher
          title="Log cardio"
          sub="A run, a ride, a walk, a class. Anything with a clock."
          onClick={() => setCardioOpen(true)}
        />
      </div>

      <p className="px-1 pt-1 text-[11.5px] leading-snug text-ink-faint">
        Everything here logs as a real session and counts toward the record. Off the plan is still on
        the record.
      </p>

      <MakeupSheet
        open={makeupOpen}
        today={date}
        onClose={() => setMakeupOpen(false)}
        onRun={(d, cns) => {
          closeAll()
          requestRun?.(d, cns)
        }}
      />
      <WorkoutsSheet
        open={workoutsOpen}
        date={date}
        onClose={() => setWorkoutsOpen(false)}
        onLive={() => {
          closeAll()
          onOpenToday?.()
        }}
        onLogged={(d) => {
          closeAll()
          setDebrief(d)
        }}
      />
      <OwnWorkoutSheet
        open={ownOpen}
        date={date}
        onClose={() => setOwnOpen(false)}
        onLive={() => {
          closeAll()
          onOpenToday?.()
        }}
        onLogged={(d) => {
          closeAll()
          setDebrief(d)
        }}
      />
      <CardioSheet
        date={date}
        hasSession={day.kind === 'session'}
        open={cardioOpen}
        onClose={() => setCardioOpen(false)}
      />
      {/* A logged session belongs to a day, and the day lives on Today.
          Closing the debrief lands there rather than back on the shelf. */}
      <DebriefSheet
        debrief={debrief}
        onClose={() => {
          setDebrief(null)
          onOpenToday?.()
        }}
      />
    </div>
  )
}

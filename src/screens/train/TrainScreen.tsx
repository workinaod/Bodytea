import { useMemo, useState } from 'react'
import type { DebriefData, ISODate } from '../../types'
import { useAppStore } from '../../store/appStore'
import { useToday } from '../../logic/clock'
import { lateNightGraceDate } from '../../engine/rollover'
import { resolveDay } from '../../engine/resolveDay'
import { briefForDay } from '../../engine/workoutBrief'
import { EXERCISES } from '../../plan/exercises'
import { GENERAL_WORKOUTS } from '../../plan/generalWorkouts'
import { Btn, Coin, ScreenHeader, SectionTitle, Tile, type TileTone } from '../../components/ui'
import { Sticker, type StickerName } from '../../components/stickers'
import { ExercisePicker } from '../booklet/ExercisePicker'
import { ExerciseGuideSheet } from '../today/ExerciseGuideSheet'
import { MakeupSheet } from '../today/MakeupSheet'
import { WorkoutsSheet } from '../today/WorkoutsSheet'
import { OwnWorkoutSheet } from '../today/OwnWorkoutSheet'
import { CardioSheet } from '../today/CardioSheet'
import { DebriefSheet } from '../today/DebriefSheet'

// ============================================================
// The gym door.
//
// All of this already existed: the fitted workouts shelf, the
// build-your-own picker, rerunning any previous day, cardio,
// the 194-movement library. It was reachable through one grey
// line at the bottom of Today that read "Training something
// else today? browse ›", which is where features go to be
// undiscovered.
//
// Today answers ONE question, and its answer is the plan's.
// This tab is everything else you might do with a barbell, and
// it opens by pointing back at the plan, because on most days
// the plan's session is still the right call.
//
// Contents per research/OP5-screen-law.md §4.
// ============================================================

// Nothing here hardcodes a catalog size. The preview said 194 and 14 and
// both happen to be right today, but a number typed into a sentence is a
// number that goes stale the first time somebody adds a movement.
const MOVEMENTS = Object.keys(EXERCISES).length
const SHELF = GENERAL_WORKOUTS.length

// One frozen empty set rather than a new one every render: the picker
// memoizes its list on it, and a fresh Set each time would rebuild all
// 194 rows on every keystroke.
const EMPTY: Set<string> = new Set()

function Launcher({
  icon,
  title,
  sub,
  tone = 'plain',
  onClick,
}: {
  icon: StickerName
  title: string
  sub: string
  tone?: TileTone
  onClick: () => void
}) {
  return (
    <Tile tone={tone} onClick={onClick} ariaLabel={title} className="!py-3">
      <div className="flex items-center gap-3">
        <Coin size={44}>
          <Sticker name={icon} size={24} />
        </Coin>
        <div className="min-w-0">
          <div className="text-[14px] font-black leading-tight">{title}</div>
          <div className="mt-0.5 text-[11.5px] font-bold leading-snug text-ink-faint">{sub}</div>
        </div>
      </div>
    </Tile>
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
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [guideId, setGuideId] = useState<string | null>(null)
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
      <Tile tone={banked || day.kind === 'rest' ? 'plain' : 'heat'}>
        <div className={`eyebrow ${banked || day.kind === 'rest' ? 'text-ink-faint' : 'text-accent-soft'}`}>
          {banked ? 'Today is banked' : "Today's mission"}
        </div>
        {banked ? (
          <p className="mt-1 text-[12.5px] leading-snug text-ink-dim">
            The work is in. Anything below is extra, and extra is optional.
          </p>
        ) : day.kind === 'rest' ? (
          <p className="mt-1 text-[12.5px] leading-snug text-ink-dim">
            Rest day. Recovery is part of the program, so nothing here is owed. If you train anyway,
            train something real.
          </p>
        ) : (
          <>
            <div className="mt-0.5 text-[20px] font-black leading-tight">{day.title}</div>
            <div className="mt-0.5 text-[11.5px] font-bold text-ink-faint">
              {brief?.totalSets ?? 0} sets · ~{brief?.minutes ?? 0} min
            </div>
            {onOpenToday && (
              <Btn className="mt-2.5 w-full" onClick={onOpenToday}>
                Go to Today ›
              </Btn>
            )}
          </>
        )}
      </Tile>

      <SectionTitle>Off the plan</SectionTitle>
      <div className="space-y-2">
        <Launcher
          icon="redo"
          title="Run a previous day"
          sub="Make up a missed day, or rerun one you liked."
          onClick={() => setMakeupOpen(true)}
        />
        <Launcher
          icon="book"
          title="Browse workouts"
          sub={`${SHELF} ready-made sessions, fitted to your gear.`}
          onClick={() => setWorkoutsOpen(true)}
        />
        <Launcher
          icon="wrench"
          title="Your own workout"
          sub="Pick exercises, run it now or log it after."
          onClick={() => setOwnOpen(true)}
        />
        <Launcher
          icon="dumbbell"
          title="Exercise library"
          sub={`${MOVEMENTS} movements, guides and muscle maps.`}
          onClick={() => setLibraryOpen(true)}
        />
      </div>

      <SectionTitle>Conditioning</SectionTitle>
      <Launcher
        icon="runner"
        title="Log cardio"
        sub="Runs, rides, sport, classes."
        tone="ice"
        onClick={() => setCardioOpen(true)}
      />

      <p className="px-1 pt-1 text-[11.5px] font-bold leading-snug text-ink-faint">
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
      {/* The library is the picker in reading mode: the same 194 movements
          with the same filters, where a tap opens the guide rather than
          adding the movement to something. */}
      {libraryOpen && (
        <ExercisePicker
          browse
          exclude={EMPTY}
          onPick={setGuideId}
          onClose={() => setLibraryOpen(false)}
        />
      )}
      <ExerciseGuideSheet exerciseId={guideId} onClose={() => setGuideId(null)} />
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

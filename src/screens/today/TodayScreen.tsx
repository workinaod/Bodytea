import { useEffect, useMemo, useState } from 'react'
import type { DebriefData, ISODate } from '../../types'
import { useAppStore } from '../../store/appStore'
import { resolveDay } from '../../engine/resolveDay'
import { addDaysISO, formatDayLabel, todayISO } from '../../engine/calendar'
import { lateNightGraceDate, stillOpenForLogging } from '../../engine/rollover'
import { useToday } from '../../logic/clock'
import { enableReminders, notificationSupport } from '../../logic/reminders'
import { BannerRow, Btn, DayArrow, ScreenHeader, Tile } from '../../components/ui'
import { REST_DAY_CARDS } from '../../plan/debrief'
import { pickVariant } from '../../engine/coach'
import { finishSession, restoreToday } from '../../logic/actions'
import { startSession } from '../../logic/sessionStart'
import { planWorkOutstanding } from '../../engine/stats'
import { briefForDay, briefForSession } from '../../engine/workoutBrief'
import { streakDays } from '../../engine/streak'
import { quitCopy } from '../../engine/quit'
import { AdaptProposals } from './AdaptProposals'
import { TodayHero } from './TodayHero'
import { TodayIdentityRow } from './TodayIdentityRow'
import { TodayNextUp } from './TodayNextUp'
import { TodayCardio, CardioBackupChooser } from './TodayCardio'
import { TodayCoachLine } from './TodayCoachLine'
import { TodayCompletion } from './TodayCompletion'
import { TodayPreviewList } from './TodayPreviewList'
import { MakeupCard } from './MakeupCard'
import { AddMoreWork } from './AddMoreWork'
import { ReviewOffer } from './ReviewOffer'
import { QuitGate } from './QuitGate'
import { WorkoutBriefSheet } from './WorkoutBriefSheet'
import { SessionView } from './SessionView'
import { FocusView } from './FocusView'
import { ReadinessSheet } from './ReadinessSheet'
import { IntensitySheet } from './IntensitySheet'
import { SkipFlow } from './SkipFlow'
import { DebriefSheet } from './DebriefSheet'
import { FinishChain, buildFinishChain, type ChainData } from './FinishChain'
import { ExerciseGuideSheet } from './ExerciseGuideSheet'
import { CardioSheet } from './CardioSheet'

export function TodayScreen({
  onOpenProgress,
  onOpenProfile,
  onOpenTrain,
  pendingRun,
  onPendingRunTaken,
  pendingList,
  onPendingListTaken,
}: {
  /** Jumps out of Today. Optional so the screen still stands alone. */
  onOpenProgress?: () => void
  onOpenProfile?: () => void
  onOpenTrain?: () => void
  /** Train picked a day to run; Today owns the gates that actually start it. */
  pendingRun?: { date: ISODate; cns: boolean } | null
  onPendingRunTaken?: () => void
  /** Train logged work into today's session; open the list, not the runner. */
  pendingList?: boolean
  onPendingListTaken?: () => void
} = {}) {
  const data = useAppStore((s) => s.data)
  const realToday = useToday()
  // null = follow the live day; set only by explicit ‹ › navigation
  const [selected, setSelected] = useState<string | null>(null)
  const [readinessOpen, setReadinessOpen] = useState(false)
  const [intensityOpen, setIntensityOpen] = useState(false)
  const [skipOpen, setSkipOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'focus' | 'list'>('focus')
  const [guideId, setGuideId] = useState<string | null>(null)
  const [debrief, setDebrief] = useState<{ data: DebriefData; coachLine?: string } | null>(null)
  // The ceremony holds the debrief it is on its way to, so the sheet
  // opens the moment the chain ends and never before.
  const [chain, setChain] = useState<{
    beats: ChainData
    then: { data: DebriefData; coachLine?: string }
  } | null>(null)
  const [cardioOpen, setCardioOpen] = useState(false)
  const [briefOpen, setBriefOpen] = useState(false)
  const [remindNudgeGone, setRemindNudgeGone] = useState(() => {
    try {
      return localStorage.getItem('bodytea.remnudge') === '1'
    } catch {
      return true
    }
  })
  const [remindBusy, setRemindBusy] = useState(false)

  // Just after midnight, an unfinished session keeps the live view on
  // yesterday so it logs under the day actually trained.
  const graceDate = lateNightGraceDate(data, realToday, new Date())
  const homeDate = graceDate ?? realToday
  const date = selected ?? homeDate

  const day = useMemo(() => resolveDay(date, data), [date, data])
  const session = data.sessions[date]
  // A make-up session runs a MISSED day's workout on a rest day, the
  // views need that day's resolution, not the rest day's empty one. Only
  // until today's own session is started, though: after that the log holds
  // both workouts and the day is the athlete's own again.
  const viewDay = useMemo(
    () =>
      session?.makeupFor && session.ownPlanStarted !== true
        ? resolveDay(session.makeupFor, data)
        : day,
    [session, day, data],
  )
  // What today IS, explained: the session if one is running (custom work
  // included), otherwise the day the plan resolved.
  const brief = useMemo(
    () => (briefOpen ? (session ? briefForSession(session, data) : briefForDay(viewDay, data)) : null),
    [briefOpen, session, viewDay, data],
  )
  const [makeupTarget, setMakeupTarget] = useState<string | null>(null)
  const makeupResolved = useMemo(
    () => (makeupTarget ? resolveDay(makeupTarget, data) : null),
    [makeupTarget, data],
  )
  const inProgress = session && session.status === 'partial' && !session.endedAt
  const finished = session && (session.endedAt || session.status === 'completed' || session.status === 'downgraded-completed')
  const skipped = session?.status === 'skipped'
  const today = date === homeDate
  // What the plan asked for today that is not on the day's log yet. Empty
  // means today's own workout is on the record; anything in it means the
  // day still owes work however finished the session looks.
  const planOwed = planWorkOutstanding(
    day.exercises,
    session,
    session?.makeupFor ? viewDay.exercises : undefined,
  )
  // The mission names what is RUNNING while a session is running, and what
  // the day still owes once nothing is. A finished make-up used to leave
  // the made-up day's title on the tile, so the screen read "this is your
  // workout, and it is done" over a session nobody had started.
  const heroDay = planOwed.length > 0 && !inProgress ? day : viewDay
  // The one day that can be started: the live one, still owing the plan's
  // work. Gated on what is OWED rather than on whether a session exists,
  // because a make-up or an off-plan workout takes the day's session slot
  // and used to be read as "today's workout is done". A required-cardio
  // day with nothing picked yet is not a session, it is a question, and
  // the chooser below is the answer.
  const canStart =
    today &&
    !inProgress &&
    !skipped &&
    planOwed.length > 0 &&
    day.kind !== 'rest' &&
    !(day.kind === 'cardio-backup' && day.exercises.length === 0)

  const restCard = useMemo(() => {
    if (day.kind !== 'rest') return null
    return pickVariant(`rest-card-${date}`, REST_DAY_CARDS, []).text
  }, [day.kind, date])

  const pastDebrief = useMemo(() => {
    if (!finished) return null
    return data.coach.feed.find((f) => f.kind === 'debrief' && f.debrief?.date === date)?.debrief ?? null
  }, [finished, data.coach.feed, date])


  // Train hands a day over and steps out of the way: the readiness and
  // intensity gates live here, next to the session they start.
  function runDay(d: ISODate, cns: boolean) {
    setMakeupTarget(d)
    if (cns) setReadinessOpen(true)
    else setIntensityOpen(true)
  }

  useEffect(() => {
    if (!pendingList) return
    setViewMode('list')
    onPendingListTaken?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingList])

  useEffect(() => {
    if (!pendingRun) return
    runDay(pendingRun.date, pendingRun.cns)
    onPendingRunTaken?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingRun])

  function handleStart() {
    if (day.cns) setReadinessOpen(true)
    else setIntensityOpen(true)
  }

  function handleFinish() {
    setConfirmEnd(false)
    // Held across the write so the ceremony can say what CHANGED rather
    // than what is true. The store clones on update, so this stays put.
    const before = useAppStore.getState().data
    const d = finishSession(date)
    const after = useAppStore.getState().data
    const line = after.coach.feed.find((f) => f.kind === 'coach' && f.situation === 'pr')
    const then = { data: d, coachLine: line && line.at.slice(0, 10) === todayISO() ? line.text : undefined }
    const beats = buildFinishChain(before, after, date)
    if (beats) setChain({ beats, then })
    else setDebrief(then)
  }

  // A finish tap with work still on the table needs a real yes, one
  // mis-tap must never end the day (learned the hard way).
  const [confirmEnd, setConfirmEnd] = useState(false)
  // What quitting costs depends on what is already in, so the dialog
  // says a different thing at zero sets than it does at nine. The streak
  // is measured to YESTERDAY: that is the run actually banked and about
  // to be lost. Counting today would inflate it by a day nobody trained.
  const quit = useMemo(
    () => (session ? quitCopy(session, streakDays(data, addDaysISO(date, -1))) : null),
    [session, data, date],
  )
  function requestFinish() {
    const s = session
    if (!s) return
    const considered = s.exercises.filter(
      (e, i) => !e.skipped && (s.trimmedFromIndex === undefined || i < s.trimmedFromIndex),
    )
    const allDone = considered.length > 0 && considered.every((e) => e.sets.every((x) => x.done))
    if (allDone) handleFinish()
    else setConfirmEnd(true)
  }

  return (
    <div className="space-y-3">
      <ScreenHeader
        title={today ? 'Today' : formatDayLabel(date)}
        onTitleTap={() => setSelected(null)}
        left={<DayArrow dir="prev" onClick={() => setSelected(addDaysISO(date, -1))} />}
        right={<DayArrow dir="next" onClick={() => setSelected(addDaysISO(date, 1))} />}
        sub={
          !today && <div className="text-[10px] font-bold text-accent">tap to jump to today</div>
        }
      />

      {today && (
        <TodayIdentityRow
          data={data}
          today={homeDate}
          onOpenProgress={onOpenProgress}
          onOpenProfile={onOpenProfile}
        />
      )}

      {graceDate && date === graceDate && (
        <Tile tone="ice" className="!py-3">
          <div className="eyebrow text-cyan">After midnight</div>
          <p className="mt-1 text-[12px] font-bold leading-snug text-ink-dim">
            {session
              ? `Still finishing yesterday's session, it logs under ${formatDayLabel(graceDate)}.`
              : `${formatDayLabel(graceDate)}'s session is still open until 3 AM. Start now and it logs under ${formatDayLabel(graceDate)}.`}
          </p>
        </Tile>
      )}

      {/* The mission carries its own button now. A CTA that lives outside
          the tile it belongs to is a second object, and the concept's whole
          move here is that there is one object and it has a handle. */}
      <TodayHero
        data={data}
        day={heroDay}
        session={session}
        onOpenBrief={() => setBriefOpen(true)}
        cta={
          canStart
            ? {
                label: day.cns
                  ? 'Readiness check → start'
                  : session
                    ? "Start today's session"
                    : 'Start session',
                onStart: handleStart,
              }
            : undefined
        }
        onCantTrain={canStart ? () => setSkipOpen(true) : undefined}
      />

      {day.banners.map((b) => (
        <BannerRow key={b.id} banner={b} />
      ))}

      <AdaptProposals date={date} />

      {/* Trimmed-day escape hatch: the meeting got cancelled after all */}
      {!session && data.dayLoad[date] === 'trimmed' && (
        <button
          onClick={() => restoreToday(date)}
          className="press-down w-full rounded-[14px] border-2 border-edge bg-surface px-3.5 py-2.5 text-[12.5px] font-black text-ink-dim [--lip:var(--lip-quiet)]"
        >
          Day freed up? Restore the full session
        </button>
      )}

      {/* One-time reminder opt-in, free push, hard-capped at two a day */}
      {today &&
        !data.settings.remindersEnabled &&
        !remindNudgeGone &&
        !['unsupported', 'denied'].includes(notificationSupport()) && (
          <Tile tone="ice" className="!py-3">
            <div className="eyebrow text-cyan">Reminders</div>
            <div className="mt-0.5 text-[13.5px] font-black">Want workout reminders?</div>
            <p className="mt-0.5 text-[12px] leading-snug text-ink-dim">
              Two a day max, only while a session is unfinished. Free, on this phone.
            </p>
            <div className="mt-2.5 flex gap-2">
              <Btn
                className="flex-1 py-2.5"
                disabled={remindBusy}
                onClick={() => {
                  setRemindBusy(true)
                  void enableReminders().then((ok) => {
                    setRemindBusy(false)
                    if (!ok) {
                      try {
                        localStorage.setItem('bodytea.remnudge', '1')
                      } catch {
                        /* ignore */
                      }
                      setRemindNudgeGone(true)
                    }
                  })
                }}
              >
                Turn them on
              </Btn>
              <Btn
                kind="ghost"
                className="flex-1 py-2.5"
                onClick={() => {
                  try {
                    localStorage.setItem('bodytea.remnudge', '1')
                  } catch {
                    /* ignore */
                  }
                  setRemindNudgeGone(true)
                }}
              >
                No thanks
              </Btn>
            </div>
          </Tile>
        )}

      <TodayCardio
        data={data}
        date={date}
        day={day}
        today={today}
        realToday={realToday}
        finished={!!finished}
        hasSession={!!session}
        onOpenCardio={() => setCardioOpen(true)}
      />

      {/* Body states */}
      {day.kind === 'rest' && !session && (
        <Tile>
          <p className="text-[13px] leading-relaxed text-ink-dim">{restCard}</p>
        </Tile>
      )}

      {/* A week, month, quarter or year just closed and has not been
          looked at yet. Offered, never forced. */}
      <ReviewOffer today={date} />

      {/* A miss with an open window is coaching about THIS week, so it
          stays here. The rest of the off-plan arsenal lives in Train. */}
      <MakeupCard
        date={date}
        active={stillOpenForLogging(date, homeDate, new Date())}
        hasSession={!!session}
        dayKind={day.kind}
        onRunDay={runDay}
        onOpenTrain={onOpenTrain}
      />

      {/* Already training today and did something else as well. Nothing
          inside the session view can add an exercise, which is how an
          athlete ended up with nowhere to put the next thing. */}
      {!!session && stillOpenForLogging(date, homeDate, new Date()) && (
        <AddMoreWork
          date={date}
          onLive={() => setViewMode('list')}
          onLogged={(d) => {
            setViewMode('list')
            if (d) setDebrief({ data: d })
          }}
        />
      )}

      {today && <TodayNextUp data={data} today={homeDate} onOpenBadges={onOpenProfile} />}

      {/* Coaching goes where the decision is. This used to be a whole tab. */}
      {today && !session && <TodayCoachLine />}

      <TodayCompletion
        data={data}
        session={session}
        title={viewDay.title}
        date={date}
        today={today}
        skipped={skipped}
        finished={!!finished}
        owedTitle={planOwed.length > 0 ? day.title : null}
        pastDebrief={pastDebrief}
        onOpenDebrief={(d) => setDebrief({ data: d })}
        onPreviewTomorrow={setSelected}
      />

      {inProgress && viewMode === 'focus' && (
        <FocusView
          day={viewDay}
          session={session}
          onFinish={requestFinish}
          onListView={() => setViewMode('list')}
        />
      )}
      {inProgress && viewMode === 'list' && (
        <>
          <button
            onClick={() => setViewMode('focus')}
            className="press-down w-full rounded-[14px] border-2 border-accent-deep bg-surface px-4 py-3 text-[13px] font-black text-accent-soft [--lip:var(--lip-accent)]"
          >
            Back to focus mode
          </button>
          <SessionView
            day={viewDay}
            session={session}
            onOpenGuide={setGuideId}
            onFinish={requestFinish}
          />
        </>
      )}

      {/* Quit gate: ending with sets still open takes a deliberate yes */}
      {confirmEnd && session && quit && (
        <QuitGate quit={quit} onStay={() => setConfirmEnd(false)} onGo={handleFinish} />
      )}

      {!session && day.kind === 'cardio-backup' && day.exercises.length === 0 && (
        <CardioBackupChooser data={data} date={date} />
      )}

      <TodayPreviewList
        data={data}
        date={date}
        day={day}
        today={today}
        owed={planOwed.length > 0 && !inProgress}
        onOpenGuide={setGuideId}
      />

      {/* Sheets */}
      <ReadinessSheet
        open={readinessOpen}
        onClose={() => {
          setReadinessOpen(false)
          setMakeupTarget(null)
        }}
        onStart={(flags, intensity) => {
          setReadinessOpen(false)
          startSession(date, flags, intensity, makeupTarget ?? undefined)
          setMakeupTarget(null)
        }}
      />
      <IntensitySheet
        open={intensityOpen}
        day={makeupResolved ?? day}
        onClose={() => {
          setIntensityOpen(false)
          setMakeupTarget(null)
        }}
        onStart={(intensity) => {
          setIntensityOpen(false)
          startSession(date, undefined, intensity, makeupTarget ?? undefined)
          setMakeupTarget(null)
        }}
      />
      {skipOpen && (
        <SkipFlow
          day={day}
          onCancel={() => setSkipOpen(false)}
          onDone={() => setSkipOpen(false)}
        />
      )}
      {chain && (
        <FinishChain
          chain={chain.beats}
          onDone={() => {
            setDebrief(chain.then)
            setChain(null)
          }}
        />
      )}
      <DebriefSheet debrief={debrief?.data ?? null} coachLine={debrief?.coachLine} onClose={() => setDebrief(null)} />
      <CardioSheet date={date} hasSession={day.kind === 'session'} open={cardioOpen} onClose={() => setCardioOpen(false)} />
      <ExerciseGuideSheet exerciseId={guideId} onClose={() => setGuideId(null)} />
      <WorkoutBriefSheet
        brief={brief}
        title={session?.customTitle ?? viewDay.title}
        onClose={() => setBriefOpen(false)}
      />
    </div>
  )
}



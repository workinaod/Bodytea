import { useMemo, useState } from 'react'
import type { DebriefData } from '../../types'
import { useAppStore } from '../../store/appStore'
import { lifeEventsOn, resolveDay } from '../../engine/resolveDay'
import { addDaysISO, formatDayLabel, mondayOf, todayISO } from '../../engine/calendar'
import { lateNightGraceDate, stillOpenForLogging } from '../../engine/rollover'
import { useToday } from '../../logic/clock'
import { enableReminders, notificationSupport } from '../../logic/reminders'
import { BannerRow, Btn, Card, Chip, DayArrow, EmptyNote, ScreenHeader } from '../../components/ui'
import { getExercise } from '../../plan/exercises'
import { CARDIO_GROUP_INFO } from '../../plan/templates'
import { REST_DAY_CARDS } from '../../plan/debrief'
import { pickVariant } from '../../engine/coach'
import { chooseCardio, finishSession, reopenSession, restoreToday, swapExercise, toggleCnsSwap } from '../../logic/actions'
import { startSession } from '../../logic/sessionStart'
import { planWorkOutstanding } from '../../engine/stats'
import { briefForDay, briefForSession } from '../../engine/workoutBrief'
import { streakDays } from '../../engine/streak'
import { quitCopy } from '../../engine/quit'
import { AdaptProposals } from './AdaptProposals'
import { ExtraTraining } from './ExtraTraining'
import { DayDoneCard } from './DayDoneCard'
import { ReviewOffer } from './ReviewOffer'
import { QuitGate } from './QuitGate'
import { WorkoutBriefSheet } from './WorkoutBriefSheet'
import { swapCandidatesFor } from '../../plan/subs'
import { SessionView } from './SessionView'
import { FocusView } from './FocusView'
import { ReadinessSheet } from './ReadinessSheet'
import { IntensitySheet } from './IntensitySheet'
import { SkipFlow } from './SkipFlow'
import { DebriefSheet } from './DebriefSheet'
import { ExerciseGuideSheet } from './ExerciseGuideSheet'
import { CardioSheet } from './CardioSheet'
import { dayActivities, shortDuration } from '../../engine/activityStats'
import { intensityLabel } from '../../engine/intensity'
import { cardioActivity } from '../../plan/cardio'

export function TodayScreen() {
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
  // views need that day's resolution, not the rest day's empty one.
  const viewDay = useMemo(
    () => (session?.makeupFor ? resolveDay(session.makeupFor, data) : day),
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
  const week = data.weeks[mondayOf(date)]
  const yesterday = addDaysISO(date, -1)
  const ballYesterday = data.weeks[mondayOf(yesterday)]?.ballDates.includes(yesterday) ?? false
  const cnsSwapped = week?.cnsSwapDates.includes(date) ?? false
  const cardioEntries = data.cardio[date] ?? []
  const canSwapCns =
    day.cns && (ballYesterday || lifeEventsOn(data, date, 'late-night').length > 0)
  const inProgress = session && session.status === 'partial' && !session.endedAt
  const finished = session && (session.endedAt || session.status === 'completed' || session.status === 'downgraded-completed')
  const skipped = session?.status === 'skipped'
  const today = date === homeDate
  // What the plan asked for today that is not on the day's log yet. Empty
  // means today's own workout is on the record; anything in it means the
  // day still owes work however finished the session looks.
  const planOwed = planWorkOutstanding(day.exercises, session)

  const restCard = useMemo(() => {
    if (day.kind !== 'rest') return null
    return pickVariant(`rest-card-${date}`, REST_DAY_CARDS, []).text
  }, [day.kind, date])

  const pastDebrief = useMemo(() => {
    if (!finished) return null
    return data.coach.feed.find((f) => f.kind === 'debrief' && f.debrief?.date === date)?.debrief ?? null
  }, [finished, data.coach.feed, date])

  // Day-aware cardio coaching: the chip stays every day, the line under
  // it says whether cardio is smart today and WHEN to put it.
  const cardioTip = useMemo(() => {
    if (day.kind === 'cardio-backup') return null // the day IS the cardio
    const tomorrowCns = resolveDay(addDaysISO(date, 1), data).cns
    if (day.cns) return "Cardio only AFTER today's session. Speed work needs fresh legs."
    if (tomorrowCns) return 'Keep cardio easy (zone 2). Tomorrow is a max-effort day.'
    if (day.kind === 'rest') return 'Rest from lifting. Easy cardio still counts.'
    if (day.kind === 'mobility') return 'Good day for conditioning. Pair it with the mobility work.'
    return 'Cardio welcome. After the lifts beats before.'
  }, [day, date, data])

  function handleStart() {
    if (day.cns) setReadinessOpen(true)
    else setIntensityOpen(true)
  }

  function handleFinish() {
    setConfirmEnd(false)
    const d = finishSession(date)
    const line = useAppStore.getState().data.coach.feed.find((f) => f.kind === 'coach' && f.situation === 'pr')
    setDebrief({ data: d, coachLine: line && line.at.slice(0, 10) === todayISO() ? line.text : undefined })
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

      {graceDate && date === graceDate && (
        <div className="border-l-2 border-cyan/60 py-1 pl-3 text-[12.5px] leading-snug text-cyan/90">
          {session
            ? `After midnight. Still finishing yesterday's session, it logs under ${formatDayLabel(graceDate)}.`
            : `After midnight. ${formatDayLabel(graceDate)}'s session is still open until 3 AM. Start now and it logs under ${formatDayLabel(graceDate)}.`}
        </div>
      )}

      {/* The hero: what today IS, with its context whispered above it */}
      <div className="pt-1">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
            Week {day.weekIndex} · Block {day.blockIndex} · {day.abWeek}
            {day.tier !== 1 && ` · Tier ${day.tier}`}
          </span>
          {day.isDeload && <Chip tone="lime">deload</Chip>}
          {day.cns && <Chip tone="accent">CNS day</Chip>}
        </div>
        {/* A make-up or an off-plan workout IS the day once it exists;
            the hero says what is actually being done, not the schedule */}
        <div className="mt-1.5 flex items-start justify-between gap-3">
          <h1 className="headline min-w-0 text-[31px]">{session?.customTitle ?? viewDay.title}</h1>
          {/* The session-level "?", the twin of the one on every exercise row:
              what this workout does, why it runs in this order, and where it
              sits in the plan. */}
          <button
            aria-label="How this workout works"
            onClick={() => setBriefOpen(true)}
            className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/[0.07] text-[15px] font-black text-cyan active:bg-white/[0.11]"
          >
            ?
          </button>
        </div>
        <p className="mt-1.5 text-[13px] leading-snug text-ink-dim">
          {session?.customTitle ? 'Off the plan, on the record.' : viewDay.tagline}
        </p>
      </div>

      {/* Actions live at the top, no reaching past the list to start.
          The gate is whether the PLAN's work is still owed, not whether the
          day happens to hold a session: a make-up or an off-plan workout
          takes the day's one session slot, and "there is a session" used to
          be read as "today's workout is done", which closed the day on a
          workout nobody had done. */}
      {today && !inProgress && !skipped && planOwed.length > 0 && day.kind !== 'rest' && !(day.kind === 'cardio-backup' && day.exercises.length === 0) && (
        <div className="flex gap-2 pt-0.5">
          <Btn className="flex-[2]" onClick={handleStart}>
            {day.cns ? 'Readiness check → start' : session ? "Start today's session" : 'Start session'}
          </Btn>
          <Btn kind="ghost" className="flex-1" onClick={() => setSkipOpen(true)}>
            Can't train
          </Btn>
        </div>
      )}

      {day.banners.map((b) => (
        <BannerRow key={b.id} banner={b} />
      ))}

      <AdaptProposals date={date} />

      {/* Trimmed-day escape hatch: the meeting got cancelled after all */}
      {!session && data.dayLoad[date] === 'trimmed' && (
        <button
          onClick={() => restoreToday(date)}
          className="w-full rounded-full bg-white/[0.07] px-3.5 py-2.5 text-[12.5px] font-bold text-ink-dim"
        >
          Day freed up? Restore the full session
        </button>
      )}

      {/* One-time reminder opt-in, free push, hard-capped at two a day */}
      {today &&
        !data.settings.remindersEnabled &&
        !remindNudgeGone &&
        !['unsupported', 'denied'].includes(notificationSupport()) && (
          <Card className="border-cyan/25 !py-3.5">
            <div className="text-[13.5px] font-extrabold">Want workout reminders?</div>
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
          </Card>
        )}

      {/* Same-day reality: ball is a day-of decision, not a weekly plan */}
      {date <= realToday && !finished && (
        <>
          <div className="flex flex-wrap gap-1.5">
            <Chip tone={cardioEntries.length > 0 ? 'lime' : 'default'} onClick={() => setCardioOpen(true)}>
              {cardioEntries.length > 0
                ? `${cardioActivity(cardioEntries[0].activityId).emoji} Cardio logged ✓ (${cardioEntries.length})`
                : 'Cardio today?'}
            </Chip>
            {canSwapCns && !session && (
              <Chip tone={cnsSwapped ? 'gold' : 'cyan'} onClick={() => toggleCnsSwap(date)}>
                {cnsSwapped ? '↩ undo speed-work swap' : '⇄ swap speed work out (sanctioned)'}
              </Chip>
            )}
          </div>
          {today && cardioEntries.length === 0 && cardioTip && (
            <p className="px-1 text-[11px] leading-snug text-ink-faint">{cardioTip}</p>
          )}
          {/* Once something is logged the tip is gone and this took its
              place. The chip counts entries; it never said what they
              were, so an hour of tracked ball read the same as a walk. */}
          {dayActivities(data, date).map((a, i) => (
            <p key={i} className="px-1 text-[11px] leading-snug text-ink-faint">
              <span className="font-bold text-ink-dim">
                {a.emoji} {a.label}
              </span>
              {[
                shortDuration(a.minutes),
                a.steps ? `${a.steps.toLocaleString()} steps` : null,
                a.miles ? `${a.miles} mi` : null,
                a.kcal ? `~${a.kcal} cal` : null,
                a.tier ? intensityLabel(a.tier).toLowerCase() : null,
              ]
                .filter(Boolean)
                .map((bit) => ` · ${bit}`)}
            </p>
          ))}
        </>
      )}

      {/* Body states */}
      {day.kind === 'rest' && !session && (
        <Card>
          <p className="text-[13.5px] leading-relaxed text-ink-dim">{restCard}</p>
        </Card>
      )}

      {/* A week, month, quarter or year just closed and has not been
          looked at yet. Offered, never forced. */}
      <ReviewOffer today={date} />

      {/* Training the plan didn't schedule: make-ups, reruns, the
          workouts shelf, and the build-your-own path all live here */}
      <ExtraTraining
        date={date}
        open={stillOpenForLogging(date, homeDate, new Date())}
        sessionState={!session ? 'none' : inProgress ? 'live' : 'done'}
        dayKind={day.kind}
        onRunDay={(d, cns) => {
          setMakeupTarget(d)
          if (cns) setReadinessOpen(true)
          else setIntensityOpen(true)
        }}
        onLogged={(d) => {
          // Extra work logged on a day nobody had started seeds the plan's
          // session, and the focus runner would take the whole screen for
          // a workout the athlete never asked to start. The list keeps the
          // day, the logged work and the door to more all on one screen.
          setViewMode('list')
          if (d) setDebrief({ data: d })
        }}
      />

      {skipped && (
        <Card className="border-danger/30">
          <p className="text-[13.5px] font-bold text-danger">Day skipped.</p>
          <p className="mt-1 text-[12.5px] text-ink-dim">
            It's on the record. The comeback is tomorrow's job. Protein is still today's.
          </p>
        </Card>
      )}

      {finished && !skipped && (
        <DayDoneCard
          session={session!}
          date={date}
          today={today}
          owedTitle={planOwed.length > 0 ? viewDay.title : null}
          pastDebrief={pastDebrief}
          onReopenSession={reopenSession}
          onOpenDebrief={(d) => setDebrief({ data: d })}
        />
      )}

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
            className="w-full rounded-full bg-accent/12 px-4 py-3 text-[13px] font-bold text-accent-soft"
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

      {confirmEnd && session && quit && (
        <QuitGate quit={quit} onStay={() => setConfirmEnd(false)} onGo={handleFinish} />
      )}

      {/* Required cardio: the chooser IS the day until an option is picked */}
      {!session && day.kind === 'cardio-backup' && day.exercises.length === 0 && (
        <div className="space-y-3">
          {(['A', 'B', 'circuit'] as const).map((g) => (
            <Card key={g} className="space-y-2">
              <div>
                <div className="text-[12px] font-black uppercase tracking-wider text-accent">
                  {CARDIO_GROUP_INFO[g].title}
                </div>
                <div className="mt-0.5 text-[11px] leading-snug text-ink-faint">{CARDIO_GROUP_INFO[g].when}</div>
              </div>
              {data.plan.cardioOptions.filter((c) => c.group === g).map((c) => {
                const def = getExercise(c.exerciseId)
                return (
                  <button
                    key={c.exerciseId}
                    onClick={() => chooseCardio(date, c.exerciseId)}
                    className="flex w-full items-center justify-between rounded-xl bg-white/[0.07] px-3.5 py-3 text-left active:bg-white/[0.09]"
                  >
                    <span className="text-[13.5px] font-bold">{def.name}</span>
                    <span className="font-mono text-[11.5px] text-ink-dim">{c.repText}</span>
                  </button>
                )
              })}
            </Card>
          ))}
          <p className="px-1 text-[11.5px] leading-snug text-ink-faint">
            Pick one and it becomes today's session. Already logged a run? Tap the cardio chip above and
            this clears itself.
          </p>
        </div>
      )}

      {/* Preview (not started yet) */}
      {!session && day.kind !== 'rest' && !(day.kind === 'cardio-backup' && day.exercises.length === 0) && (
        <>
          <div className="mt-1">
            {day.exercises.map((r, i) => {
              const def = getExercise(r.exerciseId)
              const swapBase = r.swappedFrom ?? r.exerciseId
              const canSwap = swapCandidatesFor(swapBase, data.plan).length > 0
              return (
                <div
                  key={swapBase}
                  className={`flex items-center justify-between gap-3 px-1 py-3.5 ${i > 0 ? 'border-t border-edge/40' : ''}`}
                >
                  <div className="min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="truncate text-[14.5px] font-bold">{def.name}</span>
                      {r.swappedFrom && (
                        <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-gold">swapped</span>
                      )}
                      {r.fromSlot && !r.swappedFrom && (
                        <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-cyan">rotates</span>
                      )}
                      {r.lightMode && (
                        <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-gold">light</span>
                      )}
                    </div>
                    <div className="mt-0.5 text-[12px] font-semibold text-ink-dim">
                      {r.sets > 1 ? `${r.sets} × ${r.repText}` : `${r.repText}${r.repsNum ? ' reps' : ''}`}
                      <span className="font-normal text-ink-faint"> · {def.equipment}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center">
                    {canSwap && (
                      <button
                        aria-label={`Swap ${def.name}`}
                        onClick={() => swapExercise(date, swapBase)}
                        className="p-2 text-ink-faint active:text-accent"
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 2v6h-6" />
                          <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
                          <path d="M3 22v-6h6" />
                          <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
                        </svg>
                      </button>
                    )}
                    <button
                      onClick={() => setGuideId(r.exerciseId)}
                      className="p-2 text-[14px] font-black text-ink-faint active:text-cyan"
                    >
                      ?
                    </button>
                  </div>
                </div>
              )
            })}
            {day.exercises.length === 0 && <EmptyNote>Nothing scheduled.</EmptyNote>}
          </div>

          {day.note && (
            <p className="px-2 text-center text-[12px] leading-relaxed text-ink-faint">{day.note}</p>
          )}

          {!today && (
            <p className="px-1 text-center text-[11.5px] text-ink-faint">
              Preview only. Sessions start on their day.
            </p>
          )}
        </>
      )}

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



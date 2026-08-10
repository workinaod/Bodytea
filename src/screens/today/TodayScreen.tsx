import { useMemo, useState } from 'react'
import type { DebriefData } from '../../types'
import { useAppStore } from '../../store/appStore'
import { lifeEventsOn, resolveDay } from '../../engine/resolveDay'
import { addDaysISO, formatDayLabel, mondayOf, todayISO } from '../../engine/calendar'
import { lateNightGraceDate } from '../../engine/rollover'
import { useToday } from '../../logic/clock'
import { enableReminders, notificationSupport } from '../../logic/reminders'
import { BannerRow, Btn, Card, Chip, EmptyNote } from '../../components/ui'
import { getExercise } from '../../plan/exercises'
import { CARDIO_GROUP_INFO } from '../../plan/templates'
import { REST_DAY_CARDS } from '../../plan/debrief'
import { pickVariant } from '../../engine/coach'
import { chooseCardio, finishSession, restoreToday, startSession, swapExercise, toggleCnsSwap } from '../../logic/actions'
import { swapCandidatesFor } from '../../plan/subs'
import { SessionView } from './SessionView'
import { FocusView } from './FocusView'
import { ReadinessSheet } from './ReadinessSheet'
import { SkipFlow } from './SkipFlow'
import { DebriefSheet } from './DebriefSheet'
import { ExerciseGuideSheet } from './ExerciseGuideSheet'
import { CardioSheet } from './CardioSheet'
import { cardioActivity } from '../../plan/cardio'

export function TodayScreen() {
  const data = useAppStore((s) => s.data)
  const realToday = useToday()
  // null = follow the live day; set only by explicit ‹ › navigation
  const [selected, setSelected] = useState<string | null>(null)
  const [readinessOpen, setReadinessOpen] = useState(false)
  const [skipOpen, setSkipOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'focus' | 'list'>('focus')
  const [guideId, setGuideId] = useState<string | null>(null)
  const [debrief, setDebrief] = useState<{ data: DebriefData; coachLine?: string } | null>(null)
  const [cardioOpen, setCardioOpen] = useState(false)
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
  const graceDate = lateNightGraceDate(data.sessions, realToday, new Date())
  const homeDate = graceDate ?? realToday
  const date = selected ?? homeDate

  const day = useMemo(() => resolveDay(date, data), [date, data])
  const session = data.sessions[date]
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

  const restCard = useMemo(() => {
    if (day.kind !== 'rest') return null
    return pickVariant(`rest-card-${date}`, REST_DAY_CARDS, []).text
  }, [day.kind, date])

  const pastDebrief = useMemo(() => {
    if (!finished) return null
    return data.coach.feed.find((f) => f.kind === 'debrief' && f.debrief?.date === date)?.debrief ?? null
  }, [finished, data.coach.feed, date])

  function handleStart() {
    if (day.cns) setReadinessOpen(true)
    else {
      startSession(date)
    }
  }

  function handleFinish() {
    const d = finishSession(date)
    const line = useAppStore.getState().data.coach.feed.find((f) => f.kind === 'coach' && f.situation === 'pr')
    setDebrief({ data: d, coachLine: line && line.at.slice(0, 10) === todayISO() ? line.text : undefined })
  }

  return (
    <div className="space-y-3">
      {/* Date header */}
      <div className="flex items-center justify-between">
        <button className="px-3 py-2 text-[17px] font-bold text-ink-faint" onClick={() => setSelected(addDaysISO(date, -1))}>
          ‹
        </button>
        <button className="text-center" onClick={() => setSelected(null)}>
          <div className="text-[13px] font-bold uppercase tracking-[0.18em] text-ink-dim">
            {today ? 'Today' : formatDayLabel(date)}
          </div>
          {!today && <div className="text-[10px] font-bold text-accent">tap to jump to today</div>}
        </button>
        <button className="px-3 py-2 text-[17px] font-bold text-ink-faint" onClick={() => setSelected(addDaysISO(date, 1))}>
          ›
        </button>
      </div>

      {graceDate && date === graceDate && (
        <div className="border-l-2 border-cyan/60 py-1 pl-3 text-[12.5px] leading-snug text-cyan/90">
          After midnight — still finishing yesterday's session. It logs under {formatDayLabel(graceDate)}.
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
        <h1 className="mt-1.5 text-[30px] font-bold leading-[1.06] tracking-tight">{day.title}</h1>
        <p className="mt-1.5 text-[13px] leading-snug text-ink-dim">{day.tagline}</p>
      </div>

      {day.banners.map((b) => (
        <BannerRow key={b.id} banner={b} />
      ))}

      {/* Trimmed-day escape hatch: the meeting got cancelled after all */}
      {!session && data.dayLoad[date] === 'trimmed' && (
        <button
          onClick={() => restoreToday(date)}
          className="w-full rounded-xl border border-edge bg-surface-2 px-3.5 py-2.5 text-[12.5px] font-bold text-ink-dim"
        >
          ↩ Day freed up? Restore the full session
        </button>
      )}

      {/* One-time reminder opt-in — free push, hard-capped at two a day */}
      {today &&
        !data.settings.remindersEnabled &&
        !remindNudgeGone &&
        !['unsupported', 'denied'].includes(notificationSupport()) && (
          <Card className="border-cyan/25 !py-3.5">
            <div className="text-[13.5px] font-extrabold">Want workout reminders?</div>
            <p className="mt-0.5 text-[12px] leading-snug text-ink-dim">
              Max two a day, and only on training days with an unfinished session. Free, on this phone — no texts, no
              spam.
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
        <div className="flex flex-wrap gap-1.5">
          <Chip tone={cardioEntries.length > 0 ? 'lime' : 'default'} onClick={() => setCardioOpen(true)}>
            {cardioEntries.length > 0
              ? `${cardioActivity(cardioEntries[0].activityId).emoji} Cardio logged ✓ (${cardioEntries.length})`
              : 'Cardio / sport today?'}
          </Chip>
          {canSwapCns && !session && (
            <Chip tone={cnsSwapped ? 'gold' : 'cyan'} onClick={() => toggleCnsSwap(date)}>
              {cnsSwapped ? '↩ undo speed-work swap' : '⇄ swap speed work out (sanctioned)'}
            </Chip>
          )}
        </div>
      )}

      {/* Body states */}
      {day.kind === 'rest' && (
        <Card>
          <p className="text-[13.5px] leading-relaxed text-ink-dim">{restCard}</p>
        </Card>
      )}

      {skipped && (
        <Card className="border-danger/30">
          <p className="text-[13.5px] font-bold text-danger">Day skipped.</p>
          <p className="mt-1 text-[12.5px] text-ink-dim">
            It's on the record. The comeback session is tomorrow's job — protein is still today's.
          </p>
        </Card>
      )}

      {finished && !skipped && (
        <Card className="border-lime/30">
          <p className="text-[14px] font-bold text-lime">
            {session!.status === 'downgraded-completed' ? 'Downgraded session completed.' : 'Session complete.'}
          </p>
          {pastDebrief && (
            <button
              className="mt-2 text-[12.5px] font-semibold text-cyan underline"
              onClick={() => setDebrief({ data: pastDebrief })}
            >
              Re-open the debrief
            </button>
          )}
        </Card>
      )}

      {inProgress && viewMode === 'focus' && (
        <FocusView
          day={day}
          session={session}
          onOpenGuide={setGuideId}
          onFinish={handleFinish}
          onSkip={() => setSkipOpen(true)}
          onListView={() => setViewMode('list')}
        />
      )}
      {inProgress && viewMode === 'list' && (
        <>
          <button
            onClick={() => setViewMode('focus')}
            className="w-full rounded-xl border border-accent/40 bg-accent/10 px-4 py-3 text-[13px] font-black text-accent-soft"
          >
            ⛶ Back to focus mode
          </button>
          <SessionView
            day={day}
            session={session}
            onOpenGuide={setGuideId}
            onFinish={handleFinish}
            onSkip={() => setSkipOpen(true)}
          />
        </>
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
                    className="flex w-full items-center justify-between rounded-xl border border-edge bg-surface-2 px-3.5 py-3 text-left active:border-accent/40"
                  >
                    <span className="text-[13.5px] font-bold">{def.name}</span>
                    <span className="font-mono text-[11.5px] text-ink-dim">{c.repText}</span>
                  </button>
                )
              })}
            </Card>
          ))}
          <p className="px-1 text-[11.5px] leading-snug text-ink-faint">
            Pick one — it becomes today's session. Logged a run instead? Tap the cardio chip above and
            this requirement clears itself.
          </p>
        </div>
      )}

      {/* Preview (not started yet) */}
      {!session && day.kind !== 'rest' && !(day.kind === 'cardio-backup' && day.exercises.length === 0) && (
        <>
          <div className="overflow-hidden rounded-2xl border border-edge/80 bg-surface">
            {day.exercises.map((r, i) => {
              const def = getExercise(r.exerciseId)
              const swapBase = r.swappedFrom ?? r.exerciseId
              const canSwap = swapCandidatesFor(swapBase, data.plan).length > 0
              return (
                <div
                  key={swapBase}
                  className={`flex items-center justify-between gap-3 px-4 py-3 ${i > 0 ? 'border-t border-edge/50' : ''}`}
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
            <p className="px-1 text-[12px] leading-relaxed text-ink-faint">{day.note}</p>
          )}

          {today && (
            <div className="sticky bottom-[64px] z-30 -mx-4 bg-gradient-to-t from-bg via-bg/95 to-transparent px-4 pb-2 pt-6">
              <div className="flex gap-2">
                <Btn kind="ghost" className="flex-1 bg-bg" onClick={() => setSkipOpen(true)}>
                  Can't train
                </Btn>
                <Btn className="flex-[2]" onClick={handleStart}>
                  {day.cns ? 'Readiness check → start' : 'Start session'}
                </Btn>
              </div>
            </div>
          )}
          {!today && (
            <p className="px-1 text-center text-[11.5px] text-ink-faint">
              Preview only — sessions start on their day.
            </p>
          )}
        </>
      )}

      {/* Sheets */}
      <ReadinessSheet
        open={readinessOpen}
        onClose={() => setReadinessOpen(false)}
        onStart={(flags) => {
          setReadinessOpen(false)
          startSession(date, flags)
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
    </div>
  )
}

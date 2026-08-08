import { useMemo, useState } from 'react'
import type { DebriefData } from '../../types'
import { useAppStore } from '../../store/appStore'
import { resolveDay } from '../../engine/resolveDay'
import { addDaysISO, formatDayLabel, isToday, todayISO } from '../../engine/calendar'
import { BannerRow, Btn, Card, Chip, EmptyNote } from '../../components/ui'
import { getExercise } from '../../plan/exercises'
import { REST_DAY_CARDS } from '../../plan/debrief'
import { pickVariant } from '../../engine/coach'
import { finishSession, startSession } from '../../logic/actions'
import { SessionView } from './SessionView'
import { FocusView } from './FocusView'
import { ReadinessSheet } from './ReadinessSheet'
import { SkipFlow } from './SkipFlow'
import { DebriefSheet } from './DebriefSheet'
import { ExerciseGuideSheet } from './ExerciseGuideSheet'

export function TodayScreen() {
  const data = useAppStore((s) => s.data)
  const [date, setDate] = useState(todayISO())
  const [readinessOpen, setReadinessOpen] = useState(false)
  const [skipOpen, setSkipOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'focus' | 'list'>('focus')
  const [guideId, setGuideId] = useState<string | null>(null)
  const [debrief, setDebrief] = useState<{ data: DebriefData; coachLine?: string } | null>(null)

  const day = useMemo(() => resolveDay(date, data), [date, data])
  const session = data.sessions[date]
  const inProgress = session && session.status === 'partial' && !session.endedAt
  const finished = session && (session.endedAt || session.status === 'completed' || session.status === 'downgraded-completed')
  const skipped = session?.status === 'skipped'
  const today = isToday(date)

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
        <button className="rounded-xl bg-surface-2 px-3 py-2 text-sm font-bold text-ink-dim" onClick={() => setDate(addDaysISO(date, -1))}>
          ‹
        </button>
        <button className="text-center" onClick={() => setDate(todayISO())}>
          <div className="text-[17px] font-black tracking-tight">
            {today ? 'Today' : formatDayLabel(date)}
          </div>
          {!today && <div className="text-[10px] font-bold text-accent">tap to jump to today</div>}
        </button>
        <button className="rounded-xl bg-surface-2 px-3 py-2 text-sm font-bold text-ink-dim" onClick={() => setDate(addDaysISO(date, 1))}>
          ›
        </button>
      </div>

      {/* Context chips */}
      <div className="flex flex-wrap items-center gap-1.5">
        <Chip tone="accent">Week {day.weekIndex}</Chip>
        <Chip>Block {day.blockIndex}</Chip>
        <Chip>Week {day.abWeek}</Chip>
        <Chip tone={day.tier === 1 ? 'default' : 'gold'}>Tier {day.tier}</Chip>
        {day.isDeload && <Chip tone="lime">DELOAD</Chip>}
        {day.cns && <Chip tone="cyan">CNS day</Chip>}
      </div>

      {day.banners.map((b) => (
        <BannerRow key={b.id} banner={b} />
      ))}

      {/* Title */}
      <div>
        <h1 className="text-[24px] font-black leading-tight tracking-tight">{day.title}</h1>
        <p className="mt-1 text-[13px] leading-snug text-ink-dim">{day.tagline}</p>
      </div>

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

      {/* Preview (not started yet) */}
      {!session && day.kind !== 'rest' && (
        <>
          <div className="space-y-2">
            {day.exercises.map((r) => {
              const def = getExercise(r.exerciseId)
              return (
                <Card key={r.exerciseId} className="flex items-center justify-between !py-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-[14.5px] font-bold">{def.name}</span>
                      {r.fromSlot && <Chip tone="cyan">rotates</Chip>}
                      {r.lightMode && <Chip tone="gold">light</Chip>}
                    </div>
                    <div className="text-[12px] font-semibold text-ink-dim">
                      {r.sets > 1 ? `${r.sets} × ${r.repText}` : `${r.repText}${r.repsNum ? ' reps' : ''}`}
                      <span className="text-ink-faint"> · {def.equipment}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setGuideId(r.exerciseId)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-2 text-[13px] font-black text-cyan"
                  >
                    ?
                  </button>
                </Card>
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
      <ExerciseGuideSheet exerciseId={guideId} onClose={() => setGuideId(null)} />
    </div>
  )
}

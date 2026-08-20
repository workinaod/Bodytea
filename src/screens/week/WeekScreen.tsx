import { useMemo, useState } from 'react'
import type { ResolvedDay, Tier, TierDayRole, Weekday } from '../../types'
import { useAppStore } from '../../store/appStore'
import { resolveDay } from '../../engine/resolveDay'
import { addDaysISO, formatShort, mondayOf, weekdayOf } from '../../engine/calendar'
import { useToday } from '../../logic/clock'
import { Chip, DayArrow, ScreenHeader, SectionTitle, SetCoin, Tile, WeekNode } from '../../components/ui'
import { dayActivities, shortDuration } from '../../engine/activityStats'
import { intensityLabel } from '../../engine/intensity'
import { Sheet } from '../../components/Sheet'
import { changeTier } from '../../logic/actions'
import { TierDropSheet } from './TierDropSheet'
import { PlanDoors } from '../plan/PlanDoors'
import { actualLine, dayRecap } from '../../engine/sessionRecap'
import { briefForDay } from '../../engine/workoutBrief'
import { WorkoutBriefSheet } from '../today/WorkoutBriefSheet'

const WD_LABEL = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const TIER_INFO: Record<Tier, { name: string; blurb: string }> = {
  1: { name: 'Tier 1 · Full week', blurb: '5 days, the plan as written. Run this whenever life allows.' },
  2: { name: 'Tier 2 · Fallback', blurb: '3 days: explosive + lower + upper. When work eats the week.' },
  3: { name: 'Tier 3 · Bare minimum', blurb: '2 days: one explosive, one full-body. Holding ground.' },
}

export function WeekScreen({ embedded = false }: { embedded?: boolean } = {}) {
  const data = useAppStore((s) => s.data)
  const updateWeek = useAppStore((s) => s.updateWeek)
  const today = useToday()
  const [selected, setSelected] = useState<string | null>(null)
  const weekStart = selected ?? mondayOf(today)
  const [preview, setPreview] = useState<ResolvedDay | null>(null)
  const [tierDropTo, setTierDropTo] = useState<Tier | null>(null)
  const [briefOpen, setBriefOpen] = useState(false)
  const brief = useMemo(
    () => (preview && briefOpen ? briefForDay(preview, data) : null),
    [preview, briefOpen, data],
  )
  // Recomputed from `data`, so finishing a session or logging cardio
  // updates the sheet without it needing to know either happened.
  const recap = useMemo(() => (preview ? dayRecap(data, preview.date) : null), [data, preview])

  const week = data.weeks[weekStart]
  const tier = week?.tier ?? 1
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => resolveDay(addDaysISO(weekStart, i), data)),
    [weekStart, data],
  )
  const thisWeek = weekStart === mondayOf(today)
  const needsPick = thisWeek && !week?.tierPickedAt
  const ball = data.plan.sportMode === 'ball'

  function statusFor(d: ResolvedDay): { dot: string; label: string; tone?: 'lime' | 'accent' | 'gold' | 'danger' } {
    const s = data.sessions[d.date]
    const scheduled = d.kind !== 'rest'
    if (!scheduled) {
      // An off day somebody trained anyway (a make-up, an off-plan
      // workout) is work on the record, not "rest".
      if (s && s.status !== 'skipped') {
        if (!s.endedAt && s.status === 'partial') return { dot: 'bg-gold', label: 'in progress', tone: 'gold' }
        return { dot: 'bg-lime', label: s.makeupFor ? `made up ${formatShort(s.makeupFor)}` : 'trained anyway', tone: 'lime' }
      }
      return { dot: 'bg-edge', label: 'rest' }
    }
    if (s) {
      if (s.status === 'skipped') return { dot: 'bg-danger', label: 'skipped', tone: 'danger' }
      if (s.status === 'completed') return { dot: 'bg-lime', label: 'done', tone: 'lime' }
      if (s.status === 'downgraded-completed') return { dot: 'bg-lime', label: 'done (light)', tone: 'lime' }
      return { dot: 'bg-gold', label: s.endedAt ? 'partial' : 'in progress', tone: 'gold' }
    }
    if (d.date < data.settings.installedAt) return { dot: 'bg-edge', label: 'before the app' }
    if (d.date < today) return { dot: 'bg-danger/50', label: 'unaccounted', tone: 'danger' }
    if (d.date === today) return { dot: 'bg-accent', label: 'today', tone: 'accent' }
    return { dot: 'bg-surface-2 border border-edge', label: 'up next' }
  }

  function markersFor(d: ResolvedDay): string[] {
    const out: string[] = []
    const wd = weekdayOf(d.date)
    if (week?.ballDates.includes(d.date)) out.push(ball ? '🏀 played' : '🏃 conditioned')
    // What was actually done, not just that something was. The row used
    // to read the same for a fifteen-minute walk and two hours of ball.
    for (const a of dayActivities(data, d.date)) {
      const tier = a.tier ? `, ${intensityLabel(a.tier).toLowerCase()}` : ''
      out.push(`${a.emoji} ${shortDuration(a.minutes)}${tier}`)
    }
    for (const ev of data.plan.lifeEvents) {
      if ((week?.events[ev.id] ?? []).includes(wd)) out.push(ev.kind === 'late-night' ? '🌙 late night' : '🦵 on feet')
    }
    if (d.banners.some((b) => b.id === 'pre-fatigued')) out.push('⚡ −1 jump set')
    if (week?.cnsSwapDates.includes(d.date)) out.push('⇄ lifts only')
    if (d.banners.some((b) => b.id === 'bad-sleep')) out.push('😴 −⅓ vol')
    if (d.isDeload && d.kind === 'session') out.push('deload ½')
    return out
  }

  function handleTierTap(to: Tier) {
    if (to === tier) return
    if (to > tier) {
      // EVERY drop goes through the sheet, the written reason is mandatory
      setTierDropTo(to)
    } else {
      changeTier(weekStart, to)
    }
  }

  const dropIsPlanned = (() => {
    const anySession = Object.values(data.sessions).some(
      (s) => mondayOf(s.date) === weekStart && s.status !== 'skipped',
    )
    return !week?.tierPickedAt && !anySession
  })()

  return (
    <div className="space-y-3">
      <ScreenHeader
        slim={embedded}
        title={`Week of ${formatShort(weekStart)}`}
        onTitleTap={() => setSelected(null)}
        left={<DayArrow dir="prev" unit="week" onClick={() => setSelected(addDaysISO(weekStart, -7))} />}
        right={<DayArrow dir="next" unit="week" onClick={() => setSelected(addDaysISO(weekStart, 7))} />}
        sub={
          <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
            Week {days[0].weekIndex} · Block {days[0].blockIndex} · {days[0].isDeload ? 'Deload' : days[0].abWeek}
          </div>
        }
      />

      {/* Tier picker */}
      <SectionTitle>This week's tier {needsPick && <span className="text-danger">· pick it now</span>}</SectionTitle>

      {/* Three tiles, not three rows in a box. The tier IS the week's
          contract, and the one you signed should look chosen rather than
          ticked, so the tier you are on carries its own day placement
          instead of it living in a separate section further down. */}
      <div className="space-y-2">
        {needsPick && (
          <p className="px-1 pb-0.5 text-[12.5px] font-bold leading-snug text-gold">
            Pick once, at the start of the week. Go with what you honestly have.
          </p>
        )}
        {([1, 2, 3] as Tier[]).map((t) => {
          const on = tier === t
          return (
            <Tile key={t} tone={on ? 'heat' : 'plain'} className="!py-3">
              <button
                type="button"
                onClick={() => handleTierTap(t)}
                aria-label={TIER_INFO[t].name}
                aria-pressed={on}
                className="press flex w-full items-center gap-3 text-left"
              >
                {on ? (
                  <span className="h-[17px] w-[17px] shrink-0 rounded-full border-2 border-accent-deep bg-accent shadow-[0_2px_0_var(--lip-accent)]" />
                ) : (
                  <WeekNode state="future" />
                )}
                <span className="min-w-0 flex-1">
                  <span className={`block text-[13.5px] font-black ${on ? 'text-accent-soft' : ''}`}>
                    {TIER_INFO[t].name}
                  </span>
                  <span className="mt-px block text-[11px] font-bold leading-snug text-ink-faint">
                    {TIER_INFO[t].blurb}
                  </span>
                </span>
              </button>

              {/* Where the shortened week's days land. It belongs to the
                  tier that created them, not to a section of its own. */}
              {on && t > 1 && (
                <div className="mt-3 space-y-2.5 border-t-2 border-edge-soft pt-3">
                  {(Object.entries({ ...data.plan.tierDefaultPlacement[t as 2 | 3], ...(week?.tierPlacement ?? {}) }) as [TierDayRole, Weekday][]).map(
                    ([role, wd]) => (
                      <div key={role} className="flex items-center justify-between gap-2">
                        <span className="text-[12px] font-black capitalize">
                          {role}
                          {role === 'explosive' && (
                            <span className="ml-1 text-[10px] font-bold text-accent-soft">never dropped</span>
                          )}
                        </span>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5, 6].map((d) => (
                            <button
                              key={d}
                              onClick={() =>
                                updateWeek(weekStart, (w) => {
                                  w.tierPlacement = { ...data.plan.tierDefaultPlacement[t as 2 | 3], ...(w.tierPlacement ?? {}), [role]: d as Weekday }
                                })
                              }
                              className={`press-down h-8 w-9 rounded-lg border-2 text-[11px] font-black ${
                                wd === d
                                  ? 'border-accent-deep bg-accent text-black [--lip:var(--lip-accent)]'
                                  : 'border-edge bg-surface-2 text-ink-faint [--lip:var(--lip-quiet)]'
                              }`}
                            >
                              {WD_LABEL[d]}
                            </button>
                          ))}
                        </div>
                      </div>
                    ),
                  )}
                  <p className="text-[11px] leading-snug text-ink-faint">
                    Space them however the week allows. Steps still count; protein never drops.
                  </p>
                </div>
              )}
            </Tile>
          )
        })}
      </div>

      {/* Every door out of the week: the rules, the booklet, and what your
          life is doing to it. They used to live on a Coach tab and in an
          inline form halfway down this screen. */}
      <PlanDoors weekStart={weekStart} />

      {/* 7-day strip */}
      <SectionTitle>The days</SectionTitle>
      <div>
        {days.map((d, i) => {
          const st = statusFor(d)
          const isNow = d.date === today
          const done = st.tone === 'lime'
          return (
            <div
              key={d.date}
              onClick={() => setPreview(d)}
              className={`flex cursor-pointer items-center gap-3 px-0.5 py-2.5 ${
                i > 0 ? 'border-t-2 border-edge-soft' : ''
              }`}
            >
              <SetCoin
                className={
                  done
                    ? '!border-[var(--lip-lime)] !text-lime'
                    : isNow
                      ? '!border-accent-deep !text-accent-soft'
                      : ''
                }
              >
                {WD_LABEL[weekdayOf(d.date)].toUpperCase()}
              </SetCoin>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[14px] font-extrabold">
                  {data.sessions[d.date]?.customTitle ?? d.title}
                </div>
                <div className="text-[11px] font-bold text-ink-faint">
                  {formatShort(d.date)}
                  {markersFor(d).map((m) => (
                    <span key={m} className="text-gold"> · {m}</span>
                  ))}
                </div>
              </div>
              <Chip tone={st.tone ?? 'default'} className="shrink-0">
                {st.label}
              </Chip>
            </div>
          )
        })}
      </div>

      {/* Day preview sheet */}
      <Sheet
        open={!!preview}
        onClose={() => setPreview(null)}
        title={preview ? `${formatShort(preview.date)} · ${data.sessions[preview.date]?.customTitle ?? preview.title}` : ''}
      >
        {preview && (
          <div className="space-y-3 pb-6">
            <div className="flex items-start justify-between gap-3">
              <p className="min-w-0 text-[12.5px] leading-snug text-ink-dim">{preview.tagline}</p>
              {preview.kind !== 'rest' && preview.exercises.length > 0 && (
                <button
                  aria-label="How this workout works"
                  onClick={() => setBriefOpen(true)}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-2 text-[13px] font-black text-cyan active:bg-surface-2"
                >
                  ?
                </button>
              )}
            </div>

            {recap && recap.exercises.length > 0 && (
              <>
                <div className="overflow-hidden rounded-2xl bg-surface-2 border-2 border-edge">
                  {recap.exercises.map((r, i) => (
                    <div
                      key={`${r.exerciseId}-${i}`}
                      className={`px-4 py-3 ${i > 0 ? 'border-t border-white/[0.05]' : ''}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="num w-4 shrink-0 text-[11px] font-bold text-ink-faint">{i + 1}</span>
                        <span className="min-w-0 flex-1 text-[13.5px] font-extrabold leading-snug">
                          {r.name}
                          {/* Work the plan never asked for is the part of the
                              record the plan cannot account for, so it says so
                              rather than sitting in the list pretending. */}
                          {!r.planned && <span className="ml-1.5 text-[10.5px] font-bold text-lime">added</span>}
                        </span>
                        <span className="flex shrink-0 items-baseline gap-1.5">
                          {r.planned ? (
                            <>
                              {r.planned.sets > 1 && (
                                <span className="num text-[13px] font-extrabold text-accent-soft">{r.planned.sets}</span>
                              )}
                              {r.planned.sets > 1 && <span className="text-[11px] text-ink-faint">×</span>}
                              <span className="num text-[13px] font-bold text-ink-dim">{r.planned.repText}</span>
                            </>
                          ) : (
                            <span className="text-[11px] text-ink-faint">—</span>
                          )}
                        </span>
                      </div>
                      {/* What actually happened, under what was asked for.
                          Only once the day has something to report: on a
                          future day this row would be noise on every line. */}
                      {recap.trained && (
                        <div className="mt-1 flex items-center gap-3 pl-7">
                          {r.actual ? (
                            <span className="text-[11.5px] font-bold text-lime">✓ {actualLine(r.actual)}</span>
                          ) : (
                            <span className="text-[11.5px] font-semibold text-ink-faint">not done</span>
                          )}
                          {r.swappedFrom && (
                            <span className="text-[10.5px] text-ink-faint">swapped in</span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div className="eyebrow text-ink-faint">
                  {!recap.trained
                    ? `${recap.exercises.length} exercises · ${recap.plannedSets} sets`
                    : recap.actualSets > recap.plannedSets
                      ? // Extra work can now be added to a day, so the total
                        // legitimately passes what was asked for. "19 of 9
                        // sets done" reads like a bug; this reads like a day.
                        `${recap.actualSets} sets done, ${recap.actualSets - recap.plannedSets} past the plan`
                      : `${recap.actualSets} of ${recap.plannedSets} sets done`}
                </div>
              </>
            )}

            {recap && recap.exercises.length === 0 && (
              <p className="py-6 text-center text-[13px] font-semibold text-ink-faint">
                Rest day. Protein is still today's job.
              </p>
            )}

            {/* The day's cardio. An hour of basketball is what the day
                actually contained, and a lifting record read without it
                describes a different afternoon. */}
            {recap && recap.cardio.length > 0 && (
              <div className="overflow-hidden rounded-2xl bg-surface-2 border-2 border-edge">
                {recap.cardio.map((c, i) => (
                  <div
                    key={`${c.label}-${i}`}
                    className={`flex items-center gap-3 px-4 py-2.5 ${i > 0 ? 'border-t border-white/[0.05]' : ''}`}
                  >
                    <span className="shrink-0 text-[14px]">{c.emoji}</span>
                    <span className="min-w-0 flex-1 text-[13px] font-bold leading-snug">{c.label}</span>
                    <span className="num shrink-0 text-[12px] font-semibold text-ink-dim">
                      {[
                        shortDuration(c.minutes),
                        c.miles ? `${c.miles.toFixed(2)} mi` : null,
                        c.steps ? `${c.steps.toLocaleString()} steps` : null,
                        c.kcal ? `${c.kcal} cal` : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Sheet>

      <WorkoutBriefSheet
        brief={brief}
        title={preview ? preview.title : ''}
        onClose={() => setBriefOpen(false)}
      />

      {tierDropTo !== null && (
        <TierDropSheet
          to={tierDropTo}
          weekStart={weekStart}
          planned={dropIsPlanned}
          onClose={() => setTierDropTo(null)}
        />
      )}
    </div>
  )
}

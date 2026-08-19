import { useMemo, useState } from 'react'
import type { LifeEventKind, ResolvedDay, Tier, TierDayRole, Weekday } from '../../types'
import { uid, useAppStore } from '../../store/appStore'
import { resolveDay } from '../../engine/resolveDay'
import { addDaysISO, formatShort, mondayOf, weekdayOf } from '../../engine/calendar'
import { useToday } from '../../logic/clock'
import { Card, Chip, DayArrow, ScreenHeader, SectionTitle, Toggle } from '../../components/ui'
import { dayActivities, shortDuration } from '../../engine/activityStats'
import { intensityLabel } from '../../engine/intensity'
import { Sheet } from '../../components/Sheet'
import { changeTier } from '../../logic/actions'
import { TierDropSheet } from './TierDropSheet'
import { actualLine, dayRecap } from '../../engine/sessionRecap'
import { briefForDay } from '../../engine/workoutBrief'
import { WorkoutBriefSheet } from '../today/WorkoutBriefSheet'

const WD_LABEL = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const TIER_INFO: Record<Tier, { name: string; blurb: string }> = {
  1: { name: 'Tier 1 · Full week', blurb: '5 days, the plan as written. Run this whenever life allows.' },
  2: { name: 'Tier 2 · Fallback', blurb: '3 days: explosive + lower + upper. When work eats the week.' },
  3: { name: 'Tier 3 · Bare minimum', blurb: '2 days: one explosive, one full-body. Holding ground.' },
}

export function WeekScreen() {
  const data = useAppStore((s) => s.data)
  const update = useAppStore((s) => s.update)
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

  function statusFor(d: ResolvedDay): { dot: string; label: string } {
    const s = data.sessions[d.date]
    const scheduled = d.kind !== 'rest'
    if (!scheduled) {
      // An off day somebody trained anyway (a make-up, an off-plan
      // workout) is work on the record, not "rest".
      if (s && s.status !== 'skipped') {
        if (!s.endedAt && s.status === 'partial') return { dot: 'bg-gold', label: 'in progress' }
        return { dot: 'bg-lime', label: s.makeupFor ? `made up ${formatShort(s.makeupFor)}` : 'trained anyway' }
      }
      return { dot: 'bg-edge', label: 'rest' }
    }
    if (s) {
      if (s.status === 'skipped') return { dot: 'bg-danger', label: 'skipped' }
      if (s.status === 'completed') return { dot: 'bg-lime', label: 'done' }
      if (s.status === 'downgraded-completed') return { dot: 'bg-lime', label: 'done (light)' }
      return { dot: 'bg-gold', label: s.endedAt ? 'partial' : 'in progress' }
    }
    if (d.date < data.settings.installedAt) return { dot: 'bg-edge', label: 'before the app' }
    if (d.date < today) return { dot: 'bg-danger/50', label: 'unaccounted' }
    return { dot: 'bg-white/[0.07] border border-edge', label: 'upcoming' }
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
      {needsPick && (
        <p className="py-1 text-center text-[12.5px] font-semibold leading-snug text-gold/95">
          Pick once, at the start of the week. Go with what you honestly have.
        </p>
      )}
      <div className="overflow-hidden rounded-2xl bg-white/[0.045] ring-1 ring-white/[0.05]">
        {( [1, 2, 3] as Tier[]).map((t, i) => (
          <button
            key={t}
            onClick={() => handleTierTap(t)}
            className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors ${
              i > 0 ? 'border-t border-white/[0.05]' : ''
            } ${tier === t ? 'bg-accent/8' : ''}`}
          >
            <span
              className={`h-4 w-4 shrink-0 rounded-full border-2 ${
                tier === t ? 'border-accent bg-accent' : 'border-edge'
              }`}
            />
            <span className="min-w-0 flex-1">
              <span className={`block text-[14px] font-extrabold ${tier === t ? 'text-accent-soft' : 'text-ink'}`}>
                {TIER_INFO[t].name}
              </span>
              <span className="mt-0.5 block text-[11.5px] leading-snug text-ink-faint">{TIER_INFO[t].blurb}</span>
            </span>
          </button>
        ))}
      </div>

      {/* Tier 2/3 day placement */}
      {tier > 1 && (
        <>
          <SectionTitle>Day placement</SectionTitle>
          <Card className="space-y-3">
            {(Object.entries({ ...data.plan.tierDefaultPlacement[tier as 2 | 3], ...(week?.tierPlacement ?? {}) }) as [TierDayRole, Weekday][]).map(
              ([role, wd]) => (
                <div key={role} className="flex items-center justify-between">
                  <span className="text-[13px] font-bold capitalize">
                    {role} {role === 'explosive' && <span className="text-[10px] text-accent">(never dropped)</span>}
                  </span>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5, 6].map((d) => (
                      <button
                        key={d}
                        onClick={() =>
                          updateWeek(weekStart, (w) => {
                            w.tierPlacement = { ...data.plan.tierDefaultPlacement[tier as 2 | 3], ...(w.tierPlacement ?? {}), [role]: d as Weekday }
                          })
                        }
                        className={`h-8 w-9 rounded-lg text-[11px] font-bold ${
                          wd === d ? 'bg-accent text-black' : 'bg-white/[0.07] text-ink-faint'
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
          </Card>
        </>
      )}

      {/* 7-day strip */}
      <SectionTitle>The days</SectionTitle>
      <div className="overflow-hidden rounded-2xl bg-white/[0.045] ring-1 ring-white/[0.05]">
        {days.map((d, i) => {
          const st = statusFor(d)
          return (
            <div
              key={d.date}
              onClick={() => setPreview(d)}
              className={`flex cursor-pointer items-center gap-3 px-4 py-3 active:bg-white/[0.07] ${
                i > 0 ? 'border-t border-white/[0.05]' : ''
              }`}
            >
              <div className="w-9 text-center">
                <div className={`text-[11px] font-black ${d.date === today ? 'text-accent' : 'text-ink-faint'}`}>
                  {WD_LABEL[weekdayOf(d.date)]}
                </div>
                <div className="text-[10px] text-ink-faint">{formatShort(d.date).split(' ')[1]}</div>
              </div>
              <span className={`h-2 w-2 shrink-0 rounded-full ${st.dot}`} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13.5px] font-bold">
                  {data.sessions[d.date]?.customTitle ?? d.title}
                </div>
                <div className="text-[11px] font-medium text-ink-faint">
                  {st.label}
                  {markersFor(d).map((m) => (
                    <span key={m} className="text-gold"> · {m}</span>
                  ))}
                </div>
              </div>
              <span className="text-[13px] text-ink-faint">›</span>
            </div>
          )
        })}
      </div>

      {/* Life this week: custom events, day-pickable */}
      <SectionTitle>Life this week</SectionTitle>
      <div className="space-y-2">
        {data.plan.lifeEvents.length === 0 && (
          <Card className="!py-3.5">
            <p className="text-center text-[12.5px] leading-relaxed text-ink-dim">
              {ball
                ? 'A gig, a night shift, a long day on your feet. Tap the days and the plan bends around it.'
                : 'Late nights, long shifts, whatever drains you. Tap the days and the plan bends around it.'}
            </p>
          </Card>
        )}
        {data.plan.lifeEvents.map((ev) => {
          const days = week?.events[ev.id] ?? []
          return (
            <Card key={ev.id} className="!py-3.5">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-[14px] font-bold">
                    {ev.kind === 'late-night' ? '🌙' : '🦵'} {ev.label}
                  </div>
                  <div className="text-[10.5px] text-ink-faint">
                    {ev.kind === 'late-night'
                      ? 'Train that morning · next day starts short on sleep'
                      : 'Next day drops a jump set, legs arrive pre-fatigued'}
                  </div>
                </div>
                <button
                  onClick={() =>
                    update((d) => {
                      d.plan.lifeEvents = d.plan.lifeEvents.filter((x) => x.id !== ev.id)
                    })
                  }
                  className="shrink-0 rounded-full bg-white/[0.07] px-2.5 py-1 text-[11px] font-bold text-ink-faint"
                >
                  ✕
                </button>
              </div>
              <div className="mt-2.5 flex items-center justify-between gap-1">
                <span className="text-[11px] font-black uppercase tracking-wider text-ink-faint">Which days?</span>
                <div className="flex gap-1">
                  {([1, 2, 3, 4, 5, 6, 0] as Weekday[]).map((d) => (
                    <button
                      key={d}
                      onClick={() =>
                        updateWeek(weekStart, (w) => {
                          const cur = w.events[ev.id] ?? []
                          w.events[ev.id] = cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]
                        })
                      }
                      className={`h-8 w-9 rounded-lg text-[11px] font-bold ${
                        days.includes(d) ? 'bg-accent text-black' : 'bg-white/[0.07] text-ink-faint'
                      }`}
                    >
                      {WD_LABEL[d]}
                    </button>
                  ))}
                </div>
              </div>
              {data.plan.lifeRules.djWeekend && ev.id === 'dj' && days.includes(5) && (
                <div className="mt-2">
                  <Toggle
                    on={!!week?.friPushedToSat}
                    onChange={(v) => updateWeek(weekStart, (w) => { w.friPushedToSat = v })}
                    label="→ Push Friday's pull to Saturday"
                    sub="Saturday becomes speed + lighter combined pull."
                  />
                </div>
              )}
            </Card>
          )
        })}
        <AddLifeEvent onAdd={(label, kind) => update((d) => { d.plan.lifeEvents.push({ id: uid(), label, kind }) })} />
        <Toggle
          on={(week?.badSleepDates ?? []).includes(addDaysISO(today, -1))}
          onChange={(v) =>
            updateWeek(mondayOf(addDaysISO(today, -1)), (w) => {
              const y = addDaysISO(today, -1)
              w.badSleepDates = v ? [...new Set([...w.badSleepDates, y])] : w.badSleepDates.filter((d) => d !== y)
            })
          }
          label="Bad sleep last night (under 6 h)"
          sub="Two in a row cuts the next day's volume by a third automatically."
        />
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
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/[0.07] text-[13px] font-black text-cyan active:bg-white/[0.11]"
                >
                  ?
                </button>
              )}
            </div>

            {recap && recap.exercises.length > 0 && (
              <>
                <div className="overflow-hidden rounded-2xl bg-white/[0.04] ring-1 ring-white/[0.06]">
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
                  {recap.trained
                    ? `${recap.actualSets} of ${recap.plannedSets} sets done`
                    : `${recap.exercises.length} exercises · ${recap.plannedSets} sets`}
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
              <div className="overflow-hidden rounded-2xl bg-white/[0.04] ring-1 ring-white/[0.06]">
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

/** Inline creator for a custom life event (label + effect kind). */
function AddLifeEvent({ onAdd }: { onAdd: (label: string, kind: LifeEventKind) => void }) {
  const [open, setOpen] = useState(false)
  const [label, setLabel] = useState('')
  const [kind, setKind] = useState<LifeEventKind>('late-night')

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-xl bg-white/[0.04] ring-1 ring-white/[0.06] py-3 text-[12.5px] font-bold text-ink-faint"
      >
        + Add a life event (gig, shift, whatever's real)
      </button>
    )
  }
  return (
    <Card className="space-y-3 !py-3.5">
      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder='Name it: "DJ set", "night shift", "closing shift"'
        className="w-full rounded-xl bg-white/[0.07] px-3.5 py-2.5 text-[14px] font-semibold outline-none focus:ring-accent/45"
      />
      <div className="flex gap-1.5">
        {(
          [
            ['late-night', '🌙 Late night'],
            ['on-feet', '🦵 On my feet all day'],
          ] as const
        ).map(([id, l]) => (
          <Chip key={id} tone={kind === id ? 'accent' : 'default'} onClick={() => setKind(id)}>
            {l}
          </Chip>
        ))}
      </div>
      <p className="text-[10.5px] leading-snug text-ink-faint">
        {kind === 'late-night'
          ? 'Late night → train that morning; the next day gets a short-sleep heads-up.'
          : 'All day standing → the NEXT day drops a jump set (legs arrive pre-fatigued).'}
      </p>
      <div className="flex gap-2">
        <button onClick={() => setOpen(false)} className="flex-1 rounded-xl bg-white/[0.07] py-2.5 text-[12.5px] font-bold text-ink-dim">
          Cancel
        </button>
        <button
          onClick={() => {
            if (!label.trim()) return
            onAdd(label.trim(), kind)
            setLabel('')
            setOpen(false)
          }}
          className="flex-1 rounded-xl bg-accent py-2.5 text-[12.5px] font-black text-black disabled:opacity-40"
          disabled={!label.trim()}
        >
          Add it
        </button>
      </div>
    </Card>
  )
}

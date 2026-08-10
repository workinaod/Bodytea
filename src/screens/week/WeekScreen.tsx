import { useMemo, useState } from 'react'
import type { LifeEventKind, ResolvedDay, Tier, TierDayRole, Weekday } from '../../types'
import { uid, useAppStore } from '../../store/appStore'
import { cardioRequiredForWeek, resolveDay } from '../../engine/resolveDay'
import { addDaysISO, formatShort, mondayOf, weekdayOf } from '../../engine/calendar'
import { useToday } from '../../logic/clock'
import { Card, Chip, SectionTitle, Toggle } from '../../components/ui'
import { Sheet } from '../../components/Sheet'
import { CARDIO_GROUP_INFO } from '../../plan/templates'
import { getExercise } from '../../plan/exercises'
import { changeTier } from '../../logic/actions'
import { TierDropSheet } from './TierDropSheet'

const WD_LABEL = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const TIER_INFO: Record<Tier, { name: string; blurb: string }> = {
  1: { name: 'Tier 1 — Full week', blurb: '5 days, the plan as written. Run this whenever life allows.' },
  2: { name: 'Tier 2 — Fallback', blurb: '3 days: explosive + lower + upper. When work eats the week.' },
  3: { name: 'Tier 3 — Bare minimum', blurb: '2 days: one explosive, one full-body. Holding ground.' },
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

  const week = data.weeks[weekStart]
  const tier = week?.tier ?? 1
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => resolveDay(addDaysISO(weekStart, i), data)),
    [weekStart, data],
  )
  const thisWeek = weekStart === mondayOf(today)
  const needsPick = thisWeek && !week?.tierPickedAt

  function statusFor(d: ResolvedDay): { dot: string; label: string } {
    const s = data.sessions[d.date]
    const scheduled = d.kind !== 'rest'
    if (!scheduled) return { dot: 'bg-edge', label: 'rest' }
    if (s) {
      if (s.status === 'skipped') return { dot: 'bg-danger', label: 'skipped' }
      if (s.status === 'completed') return { dot: 'bg-lime', label: 'done' }
      if (s.status === 'downgraded-completed') return { dot: 'bg-lime', label: 'done (light)' }
      return { dot: 'bg-gold', label: s.endedAt ? 'partial' : 'in progress' }
    }
    if (d.date < data.settings.installedAt) return { dot: 'bg-edge', label: 'before the app' }
    if (d.date < today) return { dot: 'bg-danger/50', label: 'unaccounted' }
    return { dot: 'bg-surface-2 border border-edge', label: 'upcoming' }
  }

  function markersFor(d: ResolvedDay): string[] {
    const out: string[] = []
    const wd = weekdayOf(d.date)
    if (week?.ballDates.includes(d.date)) out.push('🏀 played')
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
      // EVERY drop goes through the sheet — the written reason is mandatory
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
      <div className="flex items-center justify-between">
        <button className="px-3 py-2 text-[17px] font-bold text-ink-faint" onClick={() => setSelected(addDaysISO(weekStart, -7))}>
          ‹
        </button>
        <button onClick={() => setSelected(null)} className="text-center">
          <div className="text-[20px] font-bold tracking-tight">
            Week of {formatShort(weekStart)}
          </div>
          <div className="mt-0.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
            Week {days[0].weekIndex} · Block {days[0].blockIndex} · {days[0].isDeload ? 'Deload' : days[0].abWeek}
          </div>
        </button>
        <button className="px-3 py-2 text-[17px] font-bold text-ink-faint" onClick={() => setSelected(addDaysISO(weekStart, 7))}>
          ›
        </button>
      </div>

      {/* Tier picker */}
      <SectionTitle>This week's tier {needsPick && <span className="text-danger">— pick it now</span>}</SectionTitle>
      {needsPick && (
        <div className="border-l-2 border-gold/70 py-1 pl-3 text-[12.5px] font-semibold leading-snug text-gold/95">
          Pick the tier at the START of the week based on what you honestly have. Don't decide day by day.
        </div>
      )}
      <div className="overflow-hidden rounded-2xl border border-edge/80 bg-surface">
        {( [1, 2, 3] as Tier[]).map((t, i) => (
          <button
            key={t}
            onClick={() => handleTierTap(t)}
            className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors ${
              i > 0 ? 'border-t border-edge/50' : ''
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
                          wd === d ? 'bg-accent text-black' : 'bg-surface-2 text-ink-faint'
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
      <div className="overflow-hidden rounded-2xl border border-edge/80 bg-surface">
        {days.map((d, i) => {
          const st = statusFor(d)
          return (
            <div
              key={d.date}
              onClick={() => setPreview(d)}
              className={`flex cursor-pointer items-center gap-3 px-4 py-3 active:bg-surface-2 ${
                i > 0 ? 'border-t border-edge/50' : ''
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
                <div className="truncate text-[13.5px] font-bold">{d.title}</div>
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
            <p className="text-[12.5px] leading-relaxed text-ink-dim">
              Add the real-life stuff that hits your training — a DJ set, a night shift, a closing shift on your feet.
              Then each week just tap the days it happens and the plan bends around it.
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
                      : 'Next day drops a jump set — legs arrive pre-fatigued'}
                  </div>
                </div>
                <button
                  onClick={() =>
                    update((d) => {
                      d.plan.lifeEvents = d.plan.lifeEvents.filter((x) => x.id !== ev.id)
                    })
                  }
                  className="shrink-0 rounded-full bg-surface-2 px-2.5 py-1 text-[11px] font-bold text-ink-faint"
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
                        days.includes(d) ? 'bg-accent text-black' : 'bg-surface-2 text-ink-faint'
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

      {/* Cardio planner */}
      <SectionTitle>Sport / cardio backup</SectionTitle>
      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[13.5px] font-bold">Expecting ball this week?</div>
            <div className="text-[10.5px] text-ink-faint">Log what actually happens day-of — Today tab, 🏃 cardio button.</div>
          </div>
          <div className="flex gap-1.5">
            {[true, false].map((v) => (
              <button
                key={String(v)}
                onClick={() => updateWeek(weekStart, (w) => { w.ballThisWeek = v })}
                className={`rounded-lg px-4 py-2 text-[12px] font-bold ${
                  week?.ballThisWeek === v ? 'bg-accent text-black' : 'bg-surface-2 text-ink-faint'
                }`}
              >
                {v ? 'Yes' : 'No'}
              </button>
            ))}
          </div>
        </div>

        {(week?.ballDates.length ?? 0) > 0 ? (
          <p className="rounded-xl border border-lime/30 bg-lime/8 px-3 py-2 text-[12px] font-bold text-lime">
            🏀 Covered — ball logged {week!.ballDates.map((d) => WD_LABEL[weekdayOf(d)]).join(', ')}. No
            backup owed.
          </p>
        ) : (
          <>
            <p className={`rounded-xl border px-3 py-2 text-[12px] font-bold ${
              cardioRequiredForWeek(data, addDaysISO(weekStart, 3))
                ? 'border-gold/30 bg-gold/8 text-gold'
                : 'border-edge bg-surface-2 text-ink-dim'
            }`}>
              {cardioRequiredForWeek(data, addDaysISO(weekStart, 3))
                ? week?.cardio
                  ? 'Backup scheduled ✓ — it replaces ball, never stacks on top.'
                  : 'REQUIRED: no ball logged → one backup session this week. Thursday holds the slot until you pick.'
                : 'If the ball doesn\'t happen, one backup session is the rule. It replaces ball, never stacks on top.'}
            </p>
            {(['A', 'B', 'circuit'] as const).map((g) => (
              <div key={g}>
                <div className="mb-1 text-[11px] font-black uppercase tracking-wider text-ink-faint">
                  {CARDIO_GROUP_INFO[g].title}
                </div>
                <div className="mb-0.5 text-[10.5px] text-ink-faint">{CARDIO_GROUP_INFO[g].when}</div>
                <div className="flex flex-wrap gap-1.5">
                  {data.plan.cardioOptions.filter((c) => c.group === g).map((c) => (
                    <Chip
                      key={c.exerciseId}
                      tone={week?.cardio?.exerciseId === c.exerciseId ? 'accent' : 'default'}
                      onClick={() =>
                        updateWeek(weekStart, (w) => {
                          w.cardio = w.cardio?.exerciseId === c.exerciseId ? null : { exerciseId: c.exerciseId, weekdays: [4] }
                        })
                      }
                    >
                      {getExercise(c.exerciseId).name}
                    </Chip>
                  ))}
                </div>
              </div>
            ))}
            {week?.cardio && (() => {
              // Hard cardio never lands on a max-effort day or the day
              // before one — the schedule blocks those out itself.
              const group = data.plan.cardioOptions.find((c) => c.exerciseId === week.cardio!.exerciseId)?.group
              const intense = group !== 'A'
              const blocked = new Set<number>()
              if (intense) {
                for (const cns of data.plan.anchors.cnsWeekdays) {
                  blocked.add(cns)
                  blocked.add((cns + 6) % 7) // the eve of a CNS day
                }
              }
              const picked = week.cardio.weekdays
              return (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[12.5px] font-bold">On which days?</span>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5, 6, 0].map((d) => {
                        const isBlocked = blocked.has(d)
                        const on = picked.includes(d as Weekday)
                        return (
                          <button
                            key={d}
                            disabled={isBlocked}
                            onClick={() =>
                              updateWeek(weekStart, (w) => {
                                if (!w.cardio) return
                                const has = w.cardio.weekdays.includes(d as Weekday)
                                const next = has
                                  ? w.cardio.weekdays.filter((x) => x !== d)
                                  : [...w.cardio.weekdays, d as Weekday]
                                w.cardio.weekdays = next.length ? next : w.cardio.weekdays
                              })
                            }
                            className={`h-8 w-9 rounded-lg text-[11px] font-bold ${
                              isBlocked
                                ? 'bg-surface text-ink-faint/40 line-through'
                                : on
                                  ? 'bg-accent text-black'
                                  : 'bg-surface-2 text-ink-faint'
                            }`}
                          >
                            {WD_LABEL[d]}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                  {intense && blocked.size > 0 && (
                    <p className="text-[10.5px] leading-snug text-ink-faint">
                      Struck-out days are blocked for hard cardio: they're your max-effort days (
                      {data.plan.anchors.cnsWeekdays.map((d) => WD_LABEL[d]).join(', ')}) or the evening
                      before one — tired legs can't produce speed. Easy Zone-2 options ignore this rule.
                    </p>
                  )}
                </div>
              )
            })()}
          </>
        )}
      </Card>

      {/* Day preview sheet */}
      <Sheet open={!!preview} onClose={() => setPreview(null)} title={preview ? `${formatShort(preview.date)} — ${preview.title}` : ''}>
        {preview && (
          <div className="space-y-2 pb-6">
            <p className="text-[12.5px] text-ink-dim">{preview.tagline}</p>
            {preview.exercises.map((r) => (
              <div key={r.exerciseId} className="flex items-center justify-between rounded-xl bg-surface-2 px-3.5 py-2.5">
                <span className="text-[13px] font-bold">{r.name}</span>
                <span className="font-mono text-[12px] text-ink-dim">
                  {r.sets > 1 ? `${r.sets} × ${r.repText}` : r.repText}
                </span>
              </div>
            ))}
            {preview.exercises.length === 0 && <p className="py-4 text-center text-[12.5px] text-ink-faint">Rest day.</p>}
            {preview.note && <p className="pt-1 text-[11.5px] leading-relaxed text-ink-faint">{preview.note}</p>}
          </div>
        )}
      </Sheet>

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
        className="w-full rounded-xl border border-dashed border-edge py-3 text-[12.5px] font-bold text-ink-faint"
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
        placeholder='Name it — "DJ set", "night shift", "closing shift"'
        className="w-full rounded-xl border border-edge bg-surface-2 px-3.5 py-2.5 text-[14px] font-semibold outline-none focus:border-accent/60"
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
        <button onClick={() => setOpen(false)} className="flex-1 rounded-xl bg-surface-2 py-2.5 text-[12.5px] font-bold text-ink-dim">
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

import { useMemo, useState } from 'react'
import type { ResolvedDay, Tier, TierDayRole, Weekday } from '../../types'
import { useAppStore } from '../../store/appStore'
import { cardioRequiredForWeek, resolveDay } from '../../engine/resolveDay'
import { addDaysISO, formatShort, mondayOf, weekdayOf } from '../../engine/calendar'
import { useToday } from '../../logic/clock'
import { Card, Chip, SectionTitle, Toggle } from '../../components/ui'
import { Sheet } from '../../components/Sheet'
import { CARDIO_GROUP_INFO, CARDIO_OPTIONS, TIER_DEFAULT_PLACEMENT } from '../../plan/templates'
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
    if (week?.ballDates.includes(d.date)) out.push('🏀 ball')
    if ((wd === 5 && week?.gigFlags.djFriNight) || (wd === 6 && week?.gigFlags.djSatNight)) out.push('🎧 gig')
    if (wd === 1 && week?.gigFlags.longShiftBeforeMon) out.push('⚡ −1 jump set')
    if (week?.cnsSwapDates.includes(d.date)) out.push('⇄ lifts only')
    if (d.banners.some((b) => b.id === 'bad-sleep')) out.push('😴 −⅓ vol')
    if (d.isDeload && d.kind === 'session') out.push('deload ½')
    return out
  }

  function handleTierTap(to: Tier) {
    if (to === tier) return
    const anySession = Object.values(data.sessions).some(
      (s) => mondayOf(s.date) === weekStart && s.status !== 'skipped',
    )
    const isPlannedPick = !week?.tierPickedAt && !anySession
    if (to > tier && !isPlannedPick) {
      // mid-week drop → proof flow
      setTierDropTo(to)
    } else {
      changeTier(weekStart, to)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <button className="rounded-xl bg-surface-2 px-3 py-2 text-sm font-bold text-ink-dim" onClick={() => setSelected(addDaysISO(weekStart, -7))}>
          ‹
        </button>
        <button onClick={() => setSelected(null)} className="text-center">
          <div className="text-[17px] font-black tracking-tight">
            Week of {formatShort(weekStart)}
          </div>
          <div className="text-[11px] font-semibold text-ink-faint">
            Week {days[0].weekIndex} · Block {days[0].blockIndex} · {days[0].isDeload ? 'DELOAD' : `Week ${days[0].abWeek}`}
          </div>
        </button>
        <button className="rounded-xl bg-surface-2 px-3 py-2 text-sm font-bold text-ink-dim" onClick={() => setSelected(addDaysISO(weekStart, 7))}>
          ›
        </button>
      </div>

      {/* Tier picker */}
      <SectionTitle>This week's tier {needsPick && <span className="text-danger">— pick it now</span>}</SectionTitle>
      {needsPick && (
        <div className="rounded-xl border border-gold/30 bg-gold/8 px-3.5 py-2.5 text-[12.5px] font-semibold text-gold">
          Pick the tier at the START of the week based on what you honestly have. Don't decide day by day.
        </div>
      )}
      <div className="space-y-2">
        {( [1, 2, 3] as Tier[]).map((t) => (
          <button
            key={t}
            onClick={() => handleTierTap(t)}
            className={`w-full rounded-2xl border p-4 text-left transition-colors ${
              tier === t ? 'border-accent/50 bg-accent/10' : 'border-edge bg-surface'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-[14.5px] font-extrabold ${tier === t ? 'text-accent-soft' : 'text-ink'}`}>
                {TIER_INFO[t].name}
              </span>
              {tier === t && <Chip tone="accent">active</Chip>}
            </div>
            <p className="mt-1 text-[12px] leading-snug text-ink-faint">{TIER_INFO[t].blurb}</p>
          </button>
        ))}
      </div>

      {/* Tier 2/3 day placement */}
      {tier > 1 && (
        <>
          <SectionTitle>Day placement</SectionTitle>
          <Card className="space-y-3">
            {(Object.entries({ ...TIER_DEFAULT_PLACEMENT[tier as 2 | 3], ...(week?.tierPlacement ?? {}) }) as [TierDayRole, Weekday][]).map(
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
                            w.tierPlacement = { ...TIER_DEFAULT_PLACEMENT[tier as 2 | 3], ...(w.tierPlacement ?? {}), [role]: d as Weekday }
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
      <div className="space-y-2">
        {days.map((d) => {
          const st = statusFor(d)
          return (
            <Card key={d.date} onClick={() => setPreview(d)} className="!py-3">
              <div className="flex items-center gap-3">
                <div className="w-10 text-center">
                  <div className={`text-[11px] font-black ${d.date === today ? 'text-accent' : 'text-ink-faint'}`}>
                    {WD_LABEL[weekdayOf(d.date)]}
                  </div>
                  <div className="text-[10px] text-ink-faint">{formatShort(d.date).split(' ')[1]}</div>
                </div>
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${st.dot}`} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13.5px] font-bold">{d.title}</div>
                  <div className="text-[11px] font-semibold text-ink-faint">{st.label}</div>
                  {markersFor(d).length > 0 && (
                    <div className="mt-0.5 flex flex-wrap gap-1">
                      {markersFor(d).map((m) => (
                        <span key={m} className="rounded-full border border-gold/30 bg-gold/8 px-1.5 py-px text-[9.5px] font-bold text-gold">
                          {m}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <span className="text-ink-faint">▸</span>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Gig flags */}
      <SectionTitle>Gigs & real life</SectionTitle>
      <div className="space-y-2">
        <Toggle
          on={!!week?.gigFlags.djFriNight}
          onChange={(v) => updateWeek(weekStart, (w) => { w.gigFlags.djFriNight = v; if (!v) w.gigFlags.friPushedToSat = false })}
          label="DJ gig / late shift Friday night"
          sub="Train Friday morning, or push pull day to Saturday."
        />
        {week?.gigFlags.djFriNight && (
          <Toggle
            on={!!week?.gigFlags.friPushedToSat}
            onChange={(v) => updateWeek(weekStart, (w) => { w.gigFlags.friPushedToSat = v })}
            label="→ Push Friday's pull to Saturday"
            sub="Saturday becomes speed + lighter combined pull."
          />
        )}
        <Toggle
          on={!!week?.gigFlags.djSatNight}
          onChange={(v) => updateWeek(weekStart, (w) => { w.gigFlags.djSatNight = v })}
          label="DJ gig / late shift Saturday night"
          sub="Sprints early; skipping jumps on dead legs is plan-sanctioned."
        />
        <Toggle
          on={!!week?.gigFlags.longShiftBeforeMon}
          onChange={(v) => updateWeek(weekStart, (w) => { w.gigFlags.longShiftBeforeMon = v })}
          label="Long shift on your feet Sunday"
          sub="Monday drops a jump set — legs arrive pre-fatigued."
        />
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
      <SectionTitle>Basketball / cardio</SectionTitle>
      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[13.5px] font-bold">Expecting ball this week?</div>
            <div className="text-[10.5px] text-ink-faint">Log actual runs on the day — Today tab, 🏀 chip.</div>
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
                  {CARDIO_OPTIONS.filter((c) => c.group === g).map((c) => (
                    <Chip
                      key={c.exerciseId}
                      tone={week?.cardio?.exerciseId === c.exerciseId ? 'accent' : 'default'}
                      onClick={() =>
                        updateWeek(weekStart, (w) => {
                          w.cardio = w.cardio?.exerciseId === c.exerciseId ? null : { exerciseId: c.exerciseId, weekday: 4 }
                        })
                      }
                    >
                      {getExercise(c.exerciseId).name}
                    </Chip>
                  ))}
                </div>
              </div>
            ))}
            {week?.cardio && (
              <div className="flex items-center justify-between">
                <span className="text-[12.5px] font-bold">On which day?</span>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                    <button
                      key={d}
                      onClick={() => updateWeek(weekStart, (w) => { if (w.cardio) w.cardio.weekday = d as Weekday })}
                      className={`h-8 w-9 rounded-lg text-[11px] font-bold ${
                        week?.cardio?.weekday === d ? 'bg-accent text-black' : 'bg-surface-2 text-ink-faint'
                      }`}
                    >
                      {WD_LABEL[d]}
                    </button>
                  ))}
                </div>
              </div>
            )}
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
          onClose={() => setTierDropTo(null)}
        />
      )}
    </div>
  )
}

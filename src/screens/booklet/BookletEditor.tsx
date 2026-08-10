import { useMemo, useState } from 'react'
import type { DayTemplate, PlanConfig, RoutineGoal, TemplateEntry, Weekday } from '../../types'
import { EXERCISES, getExercise } from '../../plan/exercises'
import { EXERCISE_MUSCLES } from '../../plan/muscles'
import { athleticFor, QUALITY_LABELS, type AthleticQuality } from '../../plan/athletic'
import { ROUTINE_GOAL_LABELS } from '../../plan/bookletOps'
import { photosFor } from '../../plan/demoPhotos'
import { Btn, Card, Chip, Stepper } from '../../components/ui'
import { Sheet } from '../../components/Sheet'

// ============================================================
// The booklet editor: assemble or fine-tune a week as detailed
// as the owner's. Shared by the bring-your-own-routine flow,
// the post-generation "fine-tune" step, and My Booklet editing.
// Operates on a draft PlanConfig; commit/normalize lives in
// plan/bookletOps.ts.
// ============================================================

const WD_ORDER: Weekday[] = [1, 2, 3, 4, 5, 6, 0]
const WD_LABEL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export function BookletEditor({
  draft,
  onDraft,
  showMeta = true,
}: {
  draft: PlanConfig
  onDraft: (next: PlanConfig) => void
  showMeta?: boolean
}) {
  const [openDay, setOpenDay] = useState<string | null>(null)

  const mutate = (fn: (p: PlanConfig) => void) => {
    const next = structuredClone(draft)
    fn(next)
    onDraft(next)
  }

  const addDay = (wd: Weekday) => {
    const id = `day-${wd}`
    mutate((p) => {
      if (!p.templates[id]) {
        p.templates[id] = {
          id,
          title: 'Training Day',
          tagline: 'Your day — your work.',
          kind: 'session',
          entries: [],
          debriefKey: 'generic',
        }
      }
      p.tier1ByWeekday[wd] = id
    })
    setOpenDay(id)
  }

  const removeDay = (wd: Weekday) => {
    mutate((p) => {
      p.tier1ByWeekday[wd] = null
    })
  }

  const template = openDay ? draft.templates[openDay] : null

  return (
    <div className="space-y-4">
      {showMeta && (
        <Card className="space-y-3">
          <div>
            <label className="text-[11px] font-black uppercase tracking-wider text-ink-faint">Booklet name</label>
            <input
              value={draft.name}
              onChange={(e) => mutate((p) => { p.name = e.target.value })}
              className="mt-1 w-full rounded-xl border border-edge bg-surface-2 px-3 py-2.5 text-[14px] font-bold outline-none focus:border-accent/60"
            />
          </div>
          <div>
            <label className="text-[11px] font-black uppercase tracking-wider text-ink-faint">Your goal, your words</label>
            <textarea
              value={draft.goalStatement}
              onChange={(e) => mutate((p) => { p.goalStatement = e.target.value })}
              rows={2}
              className="mt-1 w-full resize-none rounded-xl border border-edge bg-surface-2 px-3 py-2.5 text-[13px] font-semibold outline-none focus:border-accent/60"
            />
          </div>
          {draft.routineGoals !== undefined && (
            <>
              <div>
                <label className="text-[11px] font-black uppercase tracking-wider text-ink-faint">This routine is chasing</label>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {(Object.keys(ROUTINE_GOAL_LABELS) as RoutineGoal[]).map((g) => (
                    <Chip
                      key={g}
                      tone={draft.routineGoals?.includes(g) ? 'accent' : 'default'}
                      onClick={() =>
                        mutate((p) => {
                          const cur = new Set(p.routineGoals ?? [])
                          if (cur.has(g)) cur.delete(g)
                          else cur.add(g)
                          p.routineGoals = [...cur]
                        })
                      }
                    >
                      {ROUTINE_GOAL_LABELS[g]}
                    </Chip>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[11px] font-black uppercase tracking-wider text-ink-faint">
                  Why it's been working — your read
                </label>
                <textarea
                  value={draft.whyWorks ?? ''}
                  onChange={(e) => mutate((p) => { p.whyWorks = e.target.value || undefined })}
                  rows={2}
                  className="mt-1 w-full resize-none rounded-xl border border-edge bg-surface-2 px-3 py-2.5 text-[13px] font-semibold outline-none focus:border-accent/60"
                />
              </div>
            </>
          )}
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-bold">Training-day kcal</span>
            <Stepper
              value={draft.nutrition.kcalTraining}
              onChange={(v) =>
                mutate((p) => {
                  p.nutrition.kcalTraining = Math.max(1500, Math.min(5000, v))
                  p.nutrition.kcalRest = p.nutrition.kcalTraining - 300
                })
              }
              step={50}
              suffix=""
              width="w-20"
            />
          </div>
        </Card>
      )}

      <div className="space-y-2">
        {WD_ORDER.map((wd) => {
          const tid = draft.tier1ByWeekday[wd]
          const t = tid ? draft.templates[tid] : null
          return (
            <Card key={wd} className="!py-3">
              <div className="flex items-center justify-between gap-2">
                <span className="w-16 shrink-0 text-[11px] font-black uppercase tracking-wider text-ink-faint">
                  {WD_LABEL[wd].slice(0, 3)}
                </span>
                {t ? (
                  <>
                    <button onClick={() => setOpenDay(tid)} className="min-w-0 flex-1 text-left">
                      <div className="truncate text-[14px] font-bold text-ink">{t.title}</div>
                      <div className="text-[11px] text-ink-dim">
                        {t.entries.length} exercise{t.entries.length === 1 ? '' : 's'}
                        {t.cns ? ' · max-effort day' : ''}
                      </div>
                    </button>
                    <button
                      onClick={() => removeDay(wd)}
                      className="shrink-0 rounded-full bg-surface-2 px-2.5 py-1 text-[11px] font-bold text-danger"
                    >
                      ✕
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => addDay(wd)}
                    className="flex-1 rounded-xl border border-dashed border-edge py-2 text-[12.5px] font-bold text-ink-faint"
                  >
                    + add a training day
                  </button>
                )}
              </div>
            </Card>
          )
        })}
      </div>

      {template && openDay && (
        <DayEditorSheet
          template={template}
          plan={draft}
          onClose={() => setOpenDay(null)}
          onChange={(nextT) => mutate((p) => { p.templates[openDay] = nextT })}
        />
      )}
    </div>
  )
}

// ---------- Day editor ----------

function DayEditorSheet({
  template,
  plan,
  onClose,
  onChange,
}: {
  template: DayTemplate
  plan: PlanConfig
  onClose: () => void
  onChange: (t: DayTemplate) => void
}) {
  const [pickerOpen, setPickerOpen] = useState(false)

  const entryName = (e: TemplateEntry): { name: string; rotates: boolean } => {
    if (e.entry === 'fixed') return { name: getExercise(e.exerciseId).name, rotates: false }
    if (e.entry === 'slot') {
      const id = plan.slots[1]?.[e.slot]
      return { name: id ? getExercise(id).name : e.slot, rotates: true }
    }
    return { name: `${getExercise(e.a.exerciseId).name} / ${getExercise(e.b.exerciseId).name}`, rotates: false }
  }

  const setEntry = (i: number, patch: Partial<{ sets: number; repText: string }>) => {
    const entries = template.entries.map((e, idx) => {
      if (idx !== i || e.entry === 'ab') return e
      const repsNum = patch.repText !== undefined ? (Number(patch.repText) > 0 ? Number(patch.repText) : undefined) : e.repsNum
      return { ...e, ...patch, ...(patch.repText !== undefined ? { repsNum } : {}) }
    })
    onChange({ ...template, entries })
  }

  return (
    <Sheet open onClose={onClose} title="Edit day">
      <div className="space-y-4 pb-8">
        <input
          value={template.title}
          onChange={(e) => onChange({ ...template, title: e.target.value })}
          className="w-full rounded-xl border border-edge bg-surface px-3 py-2.5 text-[15px] font-black outline-none focus:border-accent/60"
        />

        <div className="space-y-2">
          {template.entries.map((e, i) => {
            const info = entryName(e)
            return (
              <div key={i} className="rounded-xl border border-edge bg-surface p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-[13.5px] font-bold">{info.name}</div>
                    {info.rotates && <Chip tone="cyan">rotates each block</Chip>}
                  </div>
                  <button
                    onClick={() => onChange({ ...template, entries: template.entries.filter((_, idx) => idx !== i) })}
                    className="shrink-0 rounded-full bg-surface-2 px-2.5 py-1 text-[11px] font-bold text-danger"
                  >
                    ✕
                  </button>
                </div>
                {e.entry !== 'ab' && (
                  <div className="mt-2 flex items-center gap-4">
                    <Stepper value={e.sets} onChange={(v) => setEntry(i, { sets: Math.max(1, Math.min(10, v)) })} step={1} suffix="sets" width="w-12" />
                    <input
                      value={e.repText}
                      onChange={(ev) => setEntry(i, { repText: ev.target.value })}
                      className="w-24 rounded-lg border border-edge bg-surface-2 px-2.5 py-1.5 text-[12.5px] font-semibold outline-none focus:border-accent/60"
                      placeholder="reps"
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <Btn kind="subtle" className="w-full py-3" onClick={() => setPickerOpen(true)}>
          + Add exercise
        </Btn>
        <Btn className="w-full py-3.5" onClick={onClose}>
          Done with this day
        </Btn>
      </div>

      {pickerOpen && (
        <ExercisePicker
          exclude={new Set(template.entries.flatMap((e) => (e.entry === 'fixed' ? [e.exerciseId] : [])))}
          onPick={(id) => {
            const def = getExercise(id)
            const timed = def.kind === 'mobility' || def.kind === 'carry' || def.kind === 'cardio'
            onChange({
              ...template,
              entries: [
                ...template.entries,
                { entry: 'fixed', exerciseId: id, sets: 3, repText: timed ? '30 sec' : '10', repsNum: timed ? undefined : 10 },
              ],
            })
            setPickerOpen(false)
          }}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </Sheet>
  )
}

// ---------- Exercise picker ----------

const FAMILY_ORDER: [string, (id: string) => boolean][] = [
  ['Squat & legs', (id) => (EXERCISE_MUSCLES[id]?.primary ?? []).some((m) => m === 'quads' || m === 'adductors')],
  ['Hinge & posterior', (id) => (EXERCISE_MUSCLES[id]?.primary ?? []).some((m) => m === 'glutes' || m === 'hamstrings')],
  ['Push', (id) => (EXERCISE_MUSCLES[id]?.primary ?? []).some((m) => ['chest', 'chest-upper', 'delts-front', 'delts-side', 'triceps'].includes(m))],
  ['Pull & arms', (id) => (EXERCISE_MUSCLES[id]?.primary ?? []).some((m) => ['lats', 'mid-back', 'delts-rear', 'biceps', 'traps', 'forearms'].includes(m))],
  ['Jumps & sprints', (id) => ['jump', 'sprint'].includes(EXERCISES[id].kind)],
  ['Core', (id) => EXERCISES[id].kind === 'core' || (EXERCISE_MUSCLES[id]?.primary ?? []).some((m) => m === 'abs' || m === 'obliques')],
  ['Calves & carries', (id) => (EXERCISE_MUSCLES[id]?.primary ?? []).some((m) => m === 'calves') || EXERCISES[id].kind === 'carry'],
  ['Cardio & conditioning', (id) => EXERCISES[id].kind === 'cardio'],
  ['Mobility', (id) => EXERCISES[id].kind === 'mobility'],
]

/** Athletic-quality browse groups (curated order: control → force → elastic → complexity). */
const QUALITY_FILTERS: { label: string; qualities: AthleticQuality[] }[] = [
  { label: '⚡ Acceleration', qualities: ['acceleration', 'sprint-mechanics'] },
  { label: '💨 Max speed', qualities: ['max-velocity'] },
  { label: '🦘 Vertical', qualities: ['vertical-power'] },
  { label: '➡️ Horizontal', qualities: ['horizontal-power'] },
  { label: '🔄 Lateral & COD', qualities: ['lateral-power', 'cod', 'reactive-agility'] },
  { label: '🪀 Elastic', qualities: ['elastic-reactive', 'ankle-stiffness'] },
  { label: '🛬 Landing', qualities: ['force-absorption', 'deceleration'] },
  { label: '🧘 Balance', qualities: ['balance-stability', 'coordination'] },
  { label: '🏋️ Power', qualities: ['explosive-strength', 'rotational-power', 'athletic-strength'] },
]

const LEVEL_BADGE: Record<string, string> = {
  foundation: 'F',
  intermediate: 'I',
  advanced: 'A',
}
const LEVEL_TONE: Record<string, string> = {
  foundation: 'bg-lime/15 text-lime',
  intermediate: 'bg-cyan/15 text-cyan',
  advanced: 'bg-accent/15 text-accent',
}

function ExercisePicker({
  onPick,
  onClose,
  exclude,
}: {
  onPick: (id: string) => void
  onClose: () => void
  exclude: Set<string>
}) {
  const [q, setQ] = useState('')
  const [qualityFilter, setQualityFilter] = useState<number | null>(null)

  const groups = useMemo(() => {
    const query = q.trim().toLowerCase()
    const all = Object.keys(EXERCISES).filter((id) => !exclude.has(id))
    let matches = query
      ? all.filter((id) => {
          const def = EXERCISES[id]
          const muscles = (EXERCISE_MUSCLES[id]?.primary ?? []).join(' ')
          const meta = athleticFor(id)
          const athletic = meta ? `${meta.qualities.join(' ')} ${meta.level} ${meta.direction} ${meta.laterality}` : ''
          return `${def.name} ${muscles} ${def.targets.qualities.join(' ')} ${athletic}`.toLowerCase().includes(query)
        })
      : all

    // Athletic-quality browsing: group by quality, ordered foundation → advanced
    if (qualityFilter !== null) {
      const filter = QUALITY_FILTERS[qualityFilter]
      const rank = { foundation: 0, intermediate: 1, advanced: 2 }
      matches = matches.filter((id) => {
        const meta = athleticFor(id)
        return meta && meta.qualities.some((qq) => filter.qualities.includes(qq))
      })
      return filter.qualities
        .map((qq) => ({
          label: QUALITY_LABELS[qq],
          ids: matches
            .filter((id) => athleticFor(id)!.qualities[0] === qq || (athleticFor(id)!.qualities.includes(qq) && !filter.qualities.includes(athleticFor(id)!.qualities[0])))
            .sort((a, b) => rank[athleticFor(a)!.level] - rank[athleticFor(b)!.level]),
        }))
        .filter((g) => g.ids.length > 0)
    }

    const used = new Set<string>()
    return FAMILY_ORDER.map(([label, test]) => {
      const ids = matches.filter((id) => !used.has(id) && test(id))
      ids.forEach((id) => used.add(id))
      return { label, ids }
    }).filter((g) => g.ids.length > 0)
  }, [q, exclude, qualityFilter])

  return (
    <Sheet open onClose={onClose} title="Pick an exercise">
      <div className="pb-8">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, muscle, or quality (e.g. acceleration)…"
          className="mb-2.5 w-full rounded-xl border border-edge bg-surface px-3.5 py-3 text-[14px] font-semibold outline-none focus:border-accent/60"
        />
        <div className="no-scrollbar -mx-1 mb-2.5 overflow-x-auto px-1">
          <div className="flex w-max gap-1.5">
            {QUALITY_FILTERS.map((f, i) => (
              <Chip
                key={f.label}
                tone={qualityFilter === i ? 'accent' : 'default'}
                onClick={() => setQualityFilter(qualityFilter === i ? null : i)}
              >
                {f.label}
              </Chip>
            ))}
          </div>
        </div>
        <p className="mb-3 text-[11px] leading-snug text-ink-faint">
          Every exercise ships with a full guide, demo, and muscle map. Athletic drills carry a level —{' '}
          <b className="text-lime">F</b>oundation · <b className="text-cyan">I</b>ntermediate ·{' '}
          <b className="text-accent">A</b>dvanced. Progress control → force → elasticity → complexity.
        </p>
        {groups.map((g) => (
          <div key={g.label} className="mb-4">
            <div className="mb-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-ink-faint">{g.label}</div>
            <div className="space-y-1.5">
              {g.ids.map((id) => {
                const def = EXERCISES[id]
                const photo = photosFor(id)
                return (
                  <button
                    key={id}
                    onClick={() => onPick(id)}
                    className="flex w-full items-center gap-3 rounded-xl border border-edge bg-surface px-3 py-2 text-left active:border-accent/50"
                  >
                    {photo ? (
                      <img
                        src={`${import.meta.env.BASE_URL}demo/${photo.frames[0].file}`}
                        alt=""
                        loading="lazy"
                        className="h-10 w-14 shrink-0 rounded-lg object-cover"
                      />
                    ) : (
                      <span className="flex h-10 w-14 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-[16px]">🏃</span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-bold">{def.name}</span>
                      <span className="block truncate text-[11px] text-ink-dim">
                        {athleticFor(id)
                          ? athleticFor(id)!.qualities.map((qq) => QUALITY_LABELS[qq]).join(' · ')
                          : (EXERCISE_MUSCLES[id]?.primary ?? []).join(' · ') || def.kind}
                      </span>
                    </span>
                    {athleticFor(id) && (
                      <span
                        className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-black ${LEVEL_TONE[athleticFor(id)!.level]}`}
                      >
                        {LEVEL_BADGE[athleticFor(id)!.level]}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </Sheet>
  )
}

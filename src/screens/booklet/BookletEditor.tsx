import { useState } from 'react'
import type { DayTemplate, PlanConfig, RoutineGoal, TemplateEntry, Weekday } from '../../types'
import { getExercise } from '../../plan/exercises'
import { ROUTINE_GOAL_LABELS } from '../../plan/bookletOps'
import { Btn, Card, Chip, Stepper } from '../../components/ui'
import { Sheet } from '../../components/Sheet'
import { ExercisePicker } from './ExercisePicker'

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
          tagline: 'Your day, your work.',
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
              className="mt-1 w-full rounded-xl bg-white/[0.07] px-3 py-2.5 text-[14px] font-bold outline-none focus:ring-accent/45"
            />
          </div>
          <div>
            <label className="text-[11px] font-black uppercase tracking-wider text-ink-faint">Your goal, your words</label>
            <textarea
              value={draft.goalStatement}
              onChange={(e) => mutate((p) => { p.goalStatement = e.target.value })}
              rows={2}
              className="mt-1 w-full resize-none rounded-xl bg-white/[0.07] px-3 py-2.5 text-[13px] font-semibold outline-none focus:ring-accent/45"
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
                  Why it's been working, your read
                </label>
                <textarea
                  value={draft.whyWorks ?? ''}
                  onChange={(e) => mutate((p) => { p.whyWorks = e.target.value || undefined })}
                  rows={2}
                  className="mt-1 w-full resize-none rounded-xl bg-white/[0.07] px-3 py-2.5 text-[13px] font-semibold outline-none focus:ring-accent/45"
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
                  // Typed by a person, so it is theirs. Clearing the basis
                  // is how engine/nutritionRecheck.ts knows never to offer
                  // to change it back.
                  delete p.nutritionBasis
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
                      className="shrink-0 rounded-full bg-white/[0.07] px-2.5 py-1 text-[11px] font-bold text-danger"
                    >
                      ✕
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => addDay(wd)}
                    className="flex-1 rounded-xl bg-white/[0.04] ring-1 ring-white/[0.06] py-2 text-[12.5px] font-bold text-ink-faint"
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

  const entryName = (e: TemplateEntry): { name: string; blockNames?: string[] } => {
    if (e.entry === 'fixed') return { name: getExercise(e.exerciseId).name }
    if (e.entry === 'slot') {
      // Rotating slot: show what every block runs, not just the current one
      const names = ([1, 2, 3] as const).map((b) => {
        const id = plan.slots[b]?.[e.slot]
        return id ? getExercise(id).name : e.slot
      })
      const distinct = new Set(names)
      return distinct.size > 1
        ? { name: names[0], blockNames: names }
        : { name: names[0] }
    }
    return { name: `${getExercise(e.a.exerciseId).name} / ${getExercise(e.b.exerciseId).name}` }
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
          className="w-full rounded-xl bg-white/[0.05] ring-1 ring-white/[0.05] px-3 py-2.5 text-[15px] font-black outline-none focus:ring-accent/45"
        />

        <div className="space-y-2">
          {template.entries.map((e, i) => {
            const info = entryName(e)
            return (
              <div key={i} className="rounded-xl bg-white/[0.05] ring-1 ring-white/[0.05] p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    {info.blockNames ? (
                      <div className="space-y-0.5">
                        {info.blockNames.map((n, b) => (
                          <div key={b} className="flex items-baseline gap-1.5 text-[12.5px]">
                            <span className="shrink-0 text-[9.5px] font-black uppercase tracking-wide text-cyan">
                              B{b + 1}
                            </span>
                            <span className={`truncate ${b === 0 ? 'font-bold' : 'text-ink-dim'}`}>{n}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="truncate text-[13.5px] font-bold">{info.name}</div>
                    )}
                  </div>
                  <button
                    onClick={() => onChange({ ...template, entries: template.entries.filter((_, idx) => idx !== i) })}
                    className="shrink-0 rounded-full bg-white/[0.07] px-2.5 py-1 text-[11px] font-bold text-danger"
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
                      className="w-24 rounded-lg bg-white/[0.07] px-2.5 py-1.5 text-[12.5px] font-semibold outline-none focus:ring-accent/45"
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
          // The DRAFT's gear, not the live plan's: during onboarding the
          // booklet being built is not the one on disk yet.
          equipment={plan.equipment}
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

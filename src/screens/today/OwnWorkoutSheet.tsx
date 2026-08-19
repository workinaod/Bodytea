import { useState } from 'react'
import type { DebriefData, ISODate } from '../../types'
import { getExercise } from '../../plan/exercises'
import { Btn, Stepper } from '../../components/ui'
import { Sheet } from '../../components/Sheet'
import { ExercisePicker } from '../booklet/ExercisePicker'
import { coverageOf, GROUP_LABEL, GROUP_ORDER } from '../../engine/pickHelp'
import { logExtraWork, startCustomSession, type CustomWorkoutItem } from '../../logic/sessionStart'
import { prefillFor } from '../../logic/prescription'
import { equipFor } from '../../plan/equip'

// ============================================================
// Build your own workout, right now: pick movements off the full
// catalog, set the dose, run it or log it after the fact. The
// answer to "I benched with a friend today" and to "off day but
// I want to move".
//
// Two ways out on purpose. Start it and it is a live session
// like any other (gates, rest timer, debrief). Already did it
// and the whole thing lands ticked, then goes straight through
// the normal finish so the record and the debrief are the same
// ones a planned day gets.
// ============================================================

interface DraftItem extends CustomWorkoutItem {
  name: string
  loaded: boolean
  /** Bodyweight movement: any load is weight ADDED, which is what the session screen calls it. */
  added: boolean
}

export function OwnWorkoutSheet({
  open,
  date,
  onClose,
  onLive,
  onLogged,
}: {
  open: boolean
  date: ISODate
  onClose: () => void
  /** A live session now exists for `date`; close everything above. */
  onLive: () => void
  /** Logged after the fact; the debrief when there is one to show. */
  onLogged: (d: DebriefData | null) => void
}) {
  const [title, setTitle] = useState('')
  const [items, setItems] = useState<DraftItem[]>([])
  const [pickerOpen, setPickerOpen] = useState(false)

  const addExercise = (id: string) => {
    const def = getExercise(id)
    const timed = def.kind === 'mobility' || def.kind === 'carry' || def.kind === 'cardio'
    const loaded = def.kind === 'lift' || def.kind === 'carry'
    // A push-up with a 0 lb stepper beside it reads as an unanswered
    // question. The session screen already calls this "added weight".
    const added = loaded && equipFor(id).every((t) => t === 'none')
    setItems((cur) => [
      ...cur,
      {
        exerciseId: id,
        name: def.name,
        loaded,
        added,
        sets: 3,
        repText: timed ? '30 sec' : '10',
        repsNum: timed ? undefined : 10,
        // Seeded from history so the number on screen is the athlete's
        // real working weight, theirs to change before it ever logs.
        weightLb: loaded ? prefillFor(date, id).weightLb : undefined,
      },
    ])
    setPickerOpen(false)
  }

  const patch = (i: number, p: Partial<DraftItem>) =>
    setItems((cur) => cur.map((it, idx) => (idx === i ? { ...it, ...p } : it)))

  const reset = () => {
    setTitle('')
    setItems([])
  }

  const toCustomItems = (): CustomWorkoutItem[] =>
    items.map(({ exerciseId, sets, repText, repsNum, weightLb }) => ({
      exerciseId,
      sets,
      repText,
      repsNum,
      weightLb,
    }))

  const workoutTitle = title.trim() || 'Your own workout'
  const covered = coverageOf(items)
  const missing = GROUP_ORDER.filter((g) => !covered.has(g))

  return (
    <Sheet open={open} onClose={onClose} title="Your own workout">
      <div className="space-y-3 pb-8">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder='Name it (optional): "Bench with Dre"'
          className="w-full rounded-xl bg-white/[0.05] ring-1 ring-white/[0.05] px-3.5 py-3 text-[14px] font-semibold outline-none focus:ring-accent/45"
        />

        {items.length === 0 && (
          <p className="px-1 py-2 text-center text-[12.5px] leading-snug text-ink-faint">
            Pick any movements from the full catalog. Every one keeps its guide, demo and rest
            timer, and the weights remember where you left them.
          </p>
        )}

        <div className="space-y-2">
          {items.map((it, i) => (
            <div key={`${it.exerciseId}-${i}`} className="rounded-xl bg-white/[0.05] ring-1 ring-white/[0.05] p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 truncate text-[13.5px] font-bold">{it.name}</div>
                <button
                  aria-label={`Remove ${it.name}`}
                  onClick={() => setItems((cur) => cur.filter((_, idx) => idx !== i))}
                  className="shrink-0 rounded-full bg-white/[0.07] px-2.5 py-1 text-[11px] font-bold text-danger"
                >
                  ✕
                </button>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
                <Stepper
                  value={it.sets}
                  onChange={(v) => patch(i, { sets: Math.max(1, Math.min(10, v)) })}
                  step={1}
                  suffix="sets"
                  width="w-12"
                />
                <input
                  value={it.repText}
                  onChange={(ev) => {
                    const repText = ev.target.value
                    const n = Number(repText)
                    patch(i, { repText, repsNum: n > 0 ? n : undefined })
                  }}
                  className="w-24 rounded-lg bg-white/[0.07] px-2.5 py-1.5 text-[12.5px] font-semibold outline-none focus:ring-accent/45"
                  placeholder="reps"
                />
                {it.loaded && (
                  <span className="flex items-center gap-1.5">
                    {it.added && (
                      <span className="text-[10.5px] font-bold uppercase tracking-wide text-ink-faint">
                        added
                      </span>
                    )}
                    <Stepper
                      value={it.weightLb}
                      onChange={(v) => patch(i, { weightLb: Math.max(0, v) })}
                      step={5}
                      suffix="lb"
                    />
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {items.length > 0 && (
          <div className="rounded-xl bg-white/[0.04] ring-1 ring-white/[0.06] px-3.5 py-3">
            <div className="text-[11px] font-black uppercase tracking-wider text-ink-faint">
              What this covers
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {GROUP_ORDER.map((g) => (
                <span
                  key={g}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                    covered.has(g)
                      ? 'bg-lime/15 text-lime'
                      : 'bg-white/[0.05] text-ink-faint'
                  }`}
                >
                  {GROUP_LABEL[g]}
                </span>
              ))}
            </div>
            <p className="mt-2 text-[11px] leading-snug text-ink-faint">
              {missing.length === 0
                ? 'Every group, in one workout.'
                : `Not in this one: ${missing.map((g) => GROUP_LABEL[g].toLowerCase()).join(', ')}. Fine for a session with a job, worth a look if this was meant to be everything.`}
            </p>
          </div>
        )}

        <Btn kind="subtle" className="w-full py-3" onClick={() => setPickerOpen(true)}>
          + Add exercise
        </Btn>

        {items.length > 0 && (
          <div className="flex gap-2 pt-1">
            <Btn
              className="flex-[3]"
              onClick={() => {
                startCustomSession(date, workoutTitle, toCustomItems())
                reset()
                onLive()
              }}
            >
              Start it now
            </Btn>
            <Btn
              kind="ghost"
              className="flex-[2]"
              onClick={() => {
                const d = logExtraWork(date, workoutTitle, toCustomItems())
                reset()
                onLogged(d)
              }}
            >
              Already did it
            </Btn>
          </div>
        )}
        {items.length > 0 && (
          <p className="px-1 text-[11px] leading-snug text-ink-faint">
            Already did it logs every set as done, at the weights shown, and debriefs it. Start it
            now runs it like any session.
          </p>
        )}
      </div>

      {pickerOpen && (
        <ExercisePicker
          exclude={new Set(items.map((it) => it.exerciseId))}
          onPick={addExercise}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </Sheet>
  )
}

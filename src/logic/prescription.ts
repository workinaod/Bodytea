import type { ISODate } from '../types'
import { getExercise } from '../plan/exercises'
import { suggestedStartWeight } from '../engine/startWeight'
import { useAppStore } from '../store/appStore'

// ============================================================
// What load and how many reps go in front of you.
//
// Its own file rather than more weight on logic/actions.ts,
// which had reached its allowance. It is also one job: every
// decision about what a set should ASK of you lands here, so
// the rep target and the load cannot drift apart in two files.
//
// The rep number itself is resolved in engine/reps.ts and
// arrives already collapsed to a single value. This side owns
// the weight.
// ============================================================

const store = () => useAppStore.getState()

/**
 * The weight (and last rep count) to open a set with, read back
 * out of history rather than stored, so there is one source of
 * truth and no offset map to keep in sync.
 */
export function prefillFor(date: ISODate, exerciseId: string): { weightLb?: number; reps?: number } {
  const sessions = Object.values(store().data.sessions)
    .filter((s) => s.date < date && s.status !== 'skipped')
    .sort((a, b) => (a.date > b.date ? -1 : 1))
  for (const s of sessions) {
    const log = s.exercises.find((e) => e.exerciseId === exerciseId)
    if (!log) continue
    const done = log.sets.filter((x) => x.done && x.weightLb !== undefined)
    if (done.length) {
      const best = done.reduce((a, b) => ((a.weightLb ?? 0) >= (b.weightLb ?? 0) ? a : b))
      // The feel check-in steers the next prescription: easy climbs, hard backs off
      const bump = log.feel === 'easy' ? 5 : log.feel === 'hard' ? -5 : 0
      return {
        weightLb: best.weightLb !== undefined ? Math.max(0, best.weightLb + bump) : undefined,
        reps: best.reps,
      }
    }
  }
  // No history yet: seed from bodyweight + training background so day one
  // never opens on an empty stepper. From here the feel check-in takes over.
  const data = store().data
  let bw: number | undefined
  for (let i = data.measurements.length - 1; i >= 0; i--) {
    if (data.measurements[i].weightLb !== undefined) {
      bw = data.measurements[i].weightLb
      break
    }
  }
  const seeded = suggestedStartWeight(getExercise(exerciseId), bw ?? 175, data.plan.experience ?? 'returning')
  return seeded !== null ? { weightLb: seeded } : {}
}

/** Mid-rest weight check-in, asked at most once per exercise every 2 weeks. */
export function setExerciseFeel(date: ISODate, exIdx: number, feel: 'easy' | 'right' | 'hard'): void {
  store().update((d) => {
    const ex = d.sessions[date]?.exercises[exIdx]
    if (ex) ex.feel = feel
  })
}

import type { ISODate, SessionFeel } from '../types'
import { getExercise } from '../plan/exercises'
import { suggestedStartWeight } from '../engine/startWeight'
import { useAppStore } from '../store/appStore'
import { loadStepLb, repStepFor, type RepRange } from '../engine/reps'
import { lightLoad } from '../engine/fatigue'

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
 *
 * `repRange` is what closes double progression. engine/reps.ts
 * climbs the reps and wraps back to the bottom of the range when
 * the top is cleared, on the stated understanding that the load
 * goes up instead. Nothing was raising the load, so the
 * prescription cycled 8 to 12 and back to 8 at the same weight,
 * forever. The wrap is the signal, and this is where it is paid.
 */
export function prefillFor(
  date: ISODate,
  exerciseId: string,
  opts: { repRange?: RepRange; lightMode?: boolean } = {},
): { weightLb?: number; reps?: number } {
  const data = store().data
  // The rep engine owns both load signals, because both are decided by
  // the same walk through history: the wrap that earns more weight, and
  // the fell-short-and-felt-heavy that gives some back.
  const step = opts.repRange ? repStepFor(data, exerciseId, opts.repRange, date) : null
  const wrapStep = step?.wrapped ? loadStepLb(exerciseId) : 0
  const backOff = step?.backOff ? -loadStepLb(exerciseId) : 0

  const sessions = Object.values(data.sessions)
    .filter((s) => s.date < date && s.status !== 'skipped')
    .sort((a, b) => (a.date > b.date ? -1 : 1))
  for (const s of sessions) {
    const log = s.exercises.find((e) => e.exerciseId === exerciseId)
    if (!log) continue
    const done = log.sets.filter((x) => x.done && x.weightLb !== undefined)
    if (done.length) {
      const best = done.reduce((a, b) => ((a.weightLb ?? 0) >= (b.weightLb ?? 0) ? a : b))
      // The weight moves on two signals only, both from the rep engine:
      // the wrap earns it, falling short on a heavy day gives it back.
      // A "heavy" answer on its own is NOT one of them. Treating it as
      // one meant an honest run of hard weeks stripped the load to zero
      // while the rep target kept climbing.
      const bump =
        wrapStep > 0 || backOff < 0 || s.feel !== undefined
          ? 0
          : // Legacy per-exercise feel, for sessions logged before the
            // session-level question existed. Never for newer ones.
            log.feel === 'easy'
            ? 5
            : log.feel === 'hard'
              ? -5
              : 0
      // A back-off must never walk the load down to nothing. Repeated
      // misses take it down a step at a time, and without a floor an
      // honest run of bad weeks ends at 0 lb, which is not a
      // prescription, it is the absence of one. Below a single step
      // there is no lift left to make lighter.
      const floor = backOff < 0 ? loadStepLb(exerciseId) : 0
      const w =
        best.weightLb !== undefined
          ? Math.max(floor, best.weightLb + bump + wrapStep + backOff)
          : undefined
      return {
        weightLb: w !== undefined && opts.lightMode ? lightLoad(w) : w,
        reps: best.reps,
      }
    }
  }
  // No history yet: seed from bodyweight + training background so day one
  // never opens on an empty stepper. From here the feel check-in takes over.
  let bw: number | undefined
  for (let i = data.measurements.length - 1; i >= 0; i--) {
    if (data.measurements[i].weightLb !== undefined) {
      bw = data.measurements[i].weightLb
      break
    }
  }
  const seeded = suggestedStartWeight(getExercise(exerciseId), bw ?? 175, data.plan.experience ?? 'returning')
  if (seeded === null) return {}
  return { weightLb: opts.lightMode ? lightLoad(seeded) : seeded }
}

/**
 * The one check-in, answered at the halfway point of the session.
 *
 * It replaced a per-exercise question asked on the middle set of a
 * movement, which was the wrong moment and the wrong scope: "early on
 * you can feel good but by the third workout your dead". One honest
 * answer about the day beats several guesses about single lifts.
 */
export function setSessionFeel(date: ISODate, feel: SessionFeel): void {
  store().update((d) => {
    const s = d.sessions[date]
    if (s) s.feel = feel
  })
}

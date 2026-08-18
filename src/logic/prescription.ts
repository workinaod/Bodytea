import type { ISODate, SessionFeel } from '../types'
import type { ExerciseLog, SessionLog, SetLog } from '../sessionTypes'
import { getExercise } from '../plan/exercises'
import { suggestedStartWeight } from '../engine/startWeight'
import { useAppStore } from '../store/appStore'
import { loadStepLb, repStepFor, type RepRange } from '../engine/reps'
import { dropTo, lightLoad, nextSessionSuggestions } from '../engine/fatigue'
import { e1RM } from '../engine/stats'

interface Baseline {
  best: SetLog
  log: ExerciseLog
  session: SessionLog
}

/**
 * How informative a set is about what the movement is being worked at.
 *
 * Estimated 1RM rather than raw weight, because the heaviest set is not
 * always the most telling one. Picking by weight alone meant a single
 * heavy rep logged among sets of ten became every set's opening weight
 * the following week.
 */
const worthOf = (s: SetLog) => e1RM(s.weightLb ?? 0, s.achieved ?? s.reps ?? 1)

/** The most recent set that establishes a working weight for this movement. */
function lastWorkingSet(
  sessions: SessionLog[],
  exerciseId: string,
  allowLight: boolean,
): Baseline | null {
  for (const session of sessions) {
    const log = session.exercises.find((e) => e.exerciseId === exerciseId)
    if (!log) continue
    const done = log.sets.filter(
      (x) => x.done && x.weightLb !== undefined && (allowLight || !x.light),
    )
    if (!done.length) continue
    return { best: done.reduce((a, b) => (worthOf(a) >= worthOf(b) ? a : b)), log, session }
  }
  return null
}

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
): { weightLb?: number; reps?: number; softened?: boolean } {
  const data = store().data
  // The rep engine owns both load signals, because both are decided by
  // the same walk through history: the wrap that earns more weight, and
  // the fell-short-and-felt-heavy that gives some back.
  const step = opts.repRange ? repStepFor(data, exerciseId, opts.repRange, date) : null
  // An accepted "hold the load" cancels the climb and nothing else.
  //
  // The back-off is deliberately still paid: that one fires on a session
  // that fell short AND felt heavy, which is evidence the weight is
  // already too much, and holding a weight somebody could not lift is
  // not what anybody agreed to.
  const holding = (data.adapt[date] ?? []).includes('hold-load')
  const wrapStep = step?.wrapped && !holding ? loadStepLb(exerciseId) : 0
  const backOff = step?.backOff ? -loadStepLb(exerciseId) : 0
  // Time away is paid on the load as well as on the reps. Coming back to
  // the last weight ever lifted, months later, is how a plan loses an
  // athlete in its first week back.
  const staleGiveBack = step?.staleSteps ? -step.staleSteps * loadStepLb(exerciseId) : 0

  // "This movement has died on you twice in three weeks" is a fact the app
  // already worked out and then did nothing with: nextSessionSuggestions
  // was computed by nothing except its own test. A lift that keeps failing
  // does not want the same opening weight handed back to it.
  const failing = nextSessionSuggestions(data, date).some(
    (s) => s.kind === 'start-lighter' && s.exerciseId === exerciseId,
  )
  /**
   * Light day first, then a movement with a pattern of dying. Never both,
   * and never below the floor.
   *
   * The floor is not decoration. Softening reads a baseline and returns a
   * smaller number, so without one it composes with itself every time the
   * pattern persists, and a movement somebody keeps failing walks to zero
   * while still being prescribed. A weight of nothing is not a lighter
   * prescription, it is the absence of one.
   *
   * The floor is proportional, not one step. One step was 20% of a
   * 25 lb dumbbell but 3% of a 180 lb squat, so a light lift that was
   * failing AND stale could be handed back at a fifth of its working
   * weight while technically floored. Sixty percent of the baseline the
   * reductions were computed FROM is below any working weight worth the
   * name, and above the point where the prescription stops being one.
   * The floor never raises the number above what the arithmetic chose,
   * it only refuses to soften past it.
   */
  const softened = opts.lightMode === true || failing
  const soften = (w: number, baseline = w) => {
    const out = opts.lightMode ? lightLoad(w) : failing ? dropTo(w) : w
    const floor = Math.max(loadStepLb(exerciseId), Math.round((baseline * 0.6) / 5) * 5)
    return Math.max(out, Math.min(w, floor))
  }

  const sessions = Object.values(data.sessions)
    .filter((s) => s.date < date && s.status !== 'skipped')
    .sort((a, b) => (a.date > b.date ? -1 : 1))

  // A day the plan deliberately made lighter does not establish a working
  // weight. Those numbers came from a deload or a bad-sleep rule, not from
  // what the athlete can do, and letting one set the baseline walked the
  // load down 15% at a time: two such weeks running landed at roughly 72%
  // of where they actually were, with nothing on screen to say so. Still
  // better than an empty stepper, so they remain the fallback.
  const found =
    lastWorkingSet(sessions, exerciseId, false) ?? lastWorkingSet(sessions, exerciseId, true)
  if (found) {
    const { best, log, session } = found
    // The weight moves on two signals only, both from the rep engine:
    // the wrap earns it, falling short on a heavy day gives it back.
    // A "heavy" answer on its own is NOT one of them. Treating it as
    // one meant an honest run of hard weeks stripped the load to zero
    // while the rep target kept climbing.
    const bump =
      wrapStep > 0 || backOff < 0 || staleGiveBack < 0 || session.feel !== undefined
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
    const floor = backOff < 0 || staleGiveBack < 0 ? loadStepLb(exerciseId) : 0
    const w =
      best.weightLb !== undefined
        ? Math.max(floor, best.weightLb + bump + wrapStep + backOff + staleGiveBack)
        : undefined
    return {
      weightLb: w !== undefined ? soften(w, best.weightLb) : undefined,
      reps: best.achieved ?? best.reps,
      softened,
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
  return { weightLb: soften(seeded), softened }
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

/**
 * What the athlete actually got, recorded only when it was not what was
 * asked for.
 *
 * Written nowhere else and asked for nowhere else. A set that is simply
 * ticked off stays unmarked, which is the whole point: the common case
 * costs no taps, and silence means the ask was met. Progression reads
 * this and nothing else, because the field beside it is a copy of the
 * prescription that never changes.
 */
export function setAchievedReps(
  date: ISODate,
  exIdx: number,
  setIdx: number,
  achieved: number,
): void {
  store().update((d) => {
    const set = d.sessions[date]?.exercises[exIdx]?.sets[setIdx]
    if (!set) return
    const asked = Number((set.targetReps.match(/^\d+/) ?? [])[0])
    // Matching the ask is the default, so it is stored as nothing at all.
    if (Number.isFinite(asked) && achieved >= asked) delete set.achieved
    else set.achieved = Math.max(0, Math.round(achieved))
  })
}

/**
 * Reps left in the tank on one movement, asked once and always
 * skippable.
 *
 * Per exercise rather than per day because the day-wide question was
 * deciding progression for every lift in it: one "heavy" after a brutal
 * squat also held the curls that flew.
 */
export function setExerciseRir(date: ISODate, exIdx: number, rir: number): void {
  store().update((d) => {
    const log = d.sessions[date]?.exercises[exIdx]
    if (log) log.rir = Math.max(0, Math.round(rir))
  })
}

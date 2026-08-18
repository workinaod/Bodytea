import type { AppData, ISODate } from '../types'
import type { ExerciseLog, SessionLog } from '../sessionTypes'
import { musclesFor } from '../plan/muscles'
import { daysBetween } from './calendar'

// ============================================================
// One rep number, never a range.
//
// The standing rule, said more than once and ignored more than
// once: users never pick reps. A prescription of "8-12" is not
// coaching, it is a menu handed to someone mid-set who is in no
// state to choose, and whatever they pick is the number they
// will beat themselves up about later.
//
// So the plan holds the RANGE, which is programming data, and
// the athlete is shown a single number, which is an instruction.
//
// The number moves by double progression, which is the standard
// way to run a range and the only honest reason to have one:
// start at the bottom, add a rep each time you complete every
// set at the target, and when you reach the top the LOAD goes up
// and the reps reset to the bottom. Weight and reps never climb
// in the same week.
//
// Reading history rather than storing an offset keeps this in
// one place and keeps the plan golden-locked: SetLog.targetReps
// already records what was prescribed, so last week's number is
// on disk and the next one is derived from it.
// ============================================================

export interface RepRange {
  low: number
  high: number
}

/**
 * Ranges only. Anything that is not two numbers is a fixed
 * prescription ("12", "30 sec", "AMRAP", "8 / side") and gets
 * shown exactly as written, because there is nothing to choose.
 */
export function parseRepRange(text: string | undefined): RepRange | null {
  if (!text) return null
  // A trailing unit is allowed and kept: "40-60 sec" is as much a range
  // as "8-12" is, and a carry should not ask you to pick a duration
  // either. "10 / leg" is a fixed prescription and correctly misses.
  const m = /^\s*(\d+)\s*[-–]\s*(\d+)\s*(.*)$/.exec(text)
  if (!m) return null
  const low = Number(m[1])
  const high = Number(m[2])
  return high > low ? { low, high } : null
}

/** Everything after the numbers ("/ side", "sec"), preserved verbatim. */
function suffixOf(text: string): string {
  const m = /^\s*\d+\s*[-–]\s*\d+\s*(.*)$/.exec(text)
  return m ? m[1] : ''
}

/**
 * Did the athlete hit every set at or above `target` last time?
 * Only completed sets count, and an exercise nobody finished is
 * not evidence of anything.
 */
function clearedTarget(sets: { done: boolean; achieved?: number }[], target: number): boolean {
  const done = sets.filter((s) => s.done)
  if (done.length === 0 || done.length < sets.length) return false
  // `achieved` is written only when the athlete came up short, so its
  // absence is a completed set at the number that was asked for.
  //
  // This deliberately does NOT read `reps`. That field is a copy of the
  // prescription taken when the session was built and never updated, so
  // comparing it against a target that climbs every week meant the
  // comparison failed forever the moment the target passed it. The lift
  // then never cleared, never wrapped, and never earned more weight.
  return done.every((s) => s.achieved === undefined || s.achieved >= target)
}

/**
 * Did THIS movement take everything the athlete had?
 *
 * Asked of the exercise first and the day second. The day-wide answer is
 * one tap at the halfway point, and using it alone meant a session that
 * was honestly hard held the reps on every lift in it, including the
 * ones that flew. Reps in reserve is the most direct answer, the
 * per-exercise chip is the next best, and the whole-day feel is the
 * fallback for sessions logged before either existed.
 */
function feltHeavy(log: ExerciseLog, session: SessionLog): boolean {
  if (log.rir !== undefined) return log.rir <= 0
  if (log.feel !== undefined) return log.feel === 'hard'
  return session.feel === 'heavy'
}

export interface RepStep {
  /** The single number to show today. */
  reps: number
  /**
   * True when the reps just wrapped from the top of the range back
   * to the bottom. Double progression only means something if the
   * LOAD goes up at that moment: without it the prescription cycles
   * 8 to 12 and back to 8 at the same weight forever, which is a
   * treadmill wearing the costume of a progression.
   */
  wrapped: boolean
  /**
   * The last session felt heavy AND fell short of its target. That
   * combination, and only that combination, means the load is too
   * much and should come down.
   *
   * Tying the retreat to FAILING rather than to the feel alone is
   * what stops a spiral. Backing off every week someone answers
   * "heavy" took a working weight from 25 lb to 0 in five weeks
   * while the rep target climbed the whole way, which is the exact
   * opposite of coaching.
   */
  backOff: boolean
  /**
   * Load steps to give back because the lift has not been trained in a
   * long time, 0 when it is current.
   *
   * Both sides of the prescription used to walk history all the way to
   * the beginning and take the first match, with no sense of when it
   * happened. Someone returning after six months was handed the last
   * weight they ever lifted, on the reps they were on the day they
   * stopped. That is not a plan, it is a stale receipt.
   */
  staleSteps: number
}

/**
 * Long enough away that the rep target should start over at the bottom
 * of the range. Three weeks is roughly where a missed block stops being
 * a gap in the log and starts being detraining.
 */
export const STALE_DAYS = 21

/** Beyond this, the load gives a step back for every further four weeks. */
export const LAYOFF_STEP_DAYS = 28

/** Never hand back more than this, however long the layoff. */
export const MAX_STALE_STEPS = 3

/**
 * One step of double progression, and what it says about the load.
 *
 * Walks back to the last session that trained it, reads what was
 * prescribed then, and moves once:
 *
 *   fell short          hold the reps, and back off only if it also
 *                       felt heavy
 *   cleared, felt heavy hold everything. The work was earned, but a
 *                       day that took everything you had is not the
 *                       day to ask for more
 *   cleared             add a rep, or at the top of the range wrap
 *                       to the bottom and hand the step to the load
 */
export function repStepFor(
  data: AppData,
  exerciseId: string,
  range: RepRange,
  before: ISODate,
): RepStep {
  const history = Object.values(data.sessions)
    .filter((s) => s.date < before && s.status !== 'skipped')
    .sort((a, b) => (a.date > b.date ? -1 : 1))

  for (const session of history) {
    const log = session.exercises.find((e) => e.exerciseId === exerciseId)
    if (!log || log.sets.length === 0) continue
    const prescribed = Number((log.sets[0]?.targetReps ?? '').match(/^\d+/)?.[0])
    if (!Number.isFinite(prescribed)) continue
    const last = Math.min(Math.max(prescribed, range.low), range.high)

    // Away long enough that the last number stopped being true. Start the
    // range again from the bottom, and past a month hand some load back
    // too, one step per further four weeks.
    const away = daysBetween(session.date, before)
    if (away > STALE_DAYS) {
      return {
        reps: range.low,
        wrapped: false,
        backOff: false,
        staleSteps: Math.min(MAX_STALE_STEPS, Math.floor(away / LAYOFF_STEP_DAYS)),
      }
    }

    const heavy = feltHeavy(log, session)
    if (!clearedTarget(log.sets, last)) return { reps: last, wrapped: false, backOff: heavy, staleSteps: 0 }
    // Cleared it, but it took everything. Hold, do not ask for more.
    if (heavy) return { reps: last, wrapped: false, backOff: false, staleSteps: 0 }
    if (last < range.high) return { reps: last + 1, wrapped: false, backOff: false, staleSteps: 0 }
    // Top of the range means the next step is load, not reps, unless the
    // smallest plate we own is too big to be a step at all.
    return plateIsTooBig(log, exerciseId) && !toppedOutBefore(history, session, exerciseId, range)
      ? { reps: range.high, wrapped: false, backOff: false, staleSteps: 0 }
      : { reps: range.low, wrapped: true, backOff: false, staleSteps: 0 }
  }
  // Never trained it: start at the load end.
  return { reps: range.low, wrapped: false, backOff: false, staleSteps: 0 }
}

/**
 * The small muscles, where the same plate is a much bigger fraction of
 * the work. R3 names the class this rule is for: curl, lateral raise,
 * triceps, calf, rear delt.
 *
 * A press is deliberately NOT here even at a light weight. Somebody
 * pressing the 30s takes the 35s next, that is a 17 percent jump, and it
 * is also just how everybody has ever moved up a dumbbell rack. The band
 * is a guide for a lift with room to be precise, not an argument that
 * beginners on compounds should stall.
 */
const SMALL_MUSCLE: ReadonlySet<string> = new Set([
  'biceps',
  'triceps',
  'forearms',
  'delts-side',
  'delts-rear',
  'traps',
  'calves',
  'achilles-feet',
  'tibialis',
])

/**
 * Whether the only plate available is more than a tenth of the working
 * load, on a movement small enough for that to matter.
 *
 * Five pounds on a 20 lb lateral raise is a 25 percent jump, well past
 * the 2 to 10 percent band ACSM gives for an increment. Handing it over
 * because the range topped out is not progression, it is a set the
 * athlete is now going to miss, and a missed set reads to the rest of
 * the engine as a lift that is failing. The load steps are what they
 * are: gyms stock 5 lb plates and 5 lb dumbbell jumps, so the fix cannot
 * be a smaller plate. It has to be a rep.
 */
function plateIsTooBig(log: ExerciseLog, exerciseId: string): boolean {
  const working = log.sets.find((s) => (s.weightLb ?? 0) > 0)?.weightLb
  // Unloaded work has no plate to be too big. Bodyweight progression is
  // reps and harder variations, and the promotion rule owns it.
  if (working === undefined) return false
  const primary = musclesFor(exerciseId).primary
  if (primary.length === 0 || !primary.every((r) => SMALL_MUSCLE.has(r))) return false
  return loadStepLb(exerciseId) > working * 0.1
}

/**
 * Did the exposure before this one also sit at the top of the range?
 *
 * The hold above is one repeat, not a stall. Somebody who tops out a
 * light lift twice running has earned the jump even though it is a big
 * one, and taking it is better than a rep target that never moves again.
 * Without this the movement would sit at the top of its range forever,
 * which is the same "cycled 8 to 12 and back to 8 at the same weight"
 * failure this file was written to end, wearing a different hat.
 */
function toppedOutBefore(
  history: SessionLog[],
  current: SessionLog,
  exerciseId: string,
  range: RepRange,
): boolean {
  for (const session of history) {
    if (session.date >= current.date) continue
    const log = session.exercises.find((e) => e.exerciseId === exerciseId)
    if (!log || log.sets.length === 0) continue
    const prescribed = Number((log.sets[0]?.targetReps ?? '').match(/^\d+/)?.[0])
    if (!Number.isFinite(prescribed)) continue
    return prescribed >= range.high && clearedTarget(log.sets, Math.min(prescribed, range.high))
  }
  return false
}

/** The rep number alone, for the places that only print it. */
export function repTargetFor(
  data: AppData,
  exerciseId: string,
  range: RepRange,
  before: ISODate,
): number {
  return repStepFor(data, exerciseId, range, before).reps
}

/**
 * How much load one step is worth, which is not one number.
 *
 * 5 lb on a lateral raise is a different demand from 5 lb on a
 * squat, and on the big lower-body lifts 5 lb is inside the noise
 * of how well you slept. The legs get 10.
 */
const LOWER_BODY: ReadonlySet<string> = new Set([
  'quads',
  'hamstrings',
  'glutes',
  'calves',
  'adductors',
])

export function loadStepLb(exerciseId: string): number {
  const primary = musclesFor(exerciseId).primary
  return primary.some((r) => LOWER_BODY.has(r)) ? 10 : 5
}

/**
 * What to print. Ranges collapse to one number; anything else is
 * passed through untouched.
 */
export function repLabel(
  repText: string | undefined,
  data: AppData,
  exerciseId: string,
  before: ISODate,
): string {
  if (!repText) return ''
  const range = parseRepRange(repText)
  if (!range) return repText
  const n = repTargetFor(data, exerciseId, range, before)
  const suffix = suffixOf(repText)
  return suffix ? `${n} ${suffix}`.trim() : String(n)
}

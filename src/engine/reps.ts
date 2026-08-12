import type { AppData, ISODate } from '../types'

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
function clearedTarget(sets: { done: boolean; reps?: number }[], target: number): boolean {
  const done = sets.filter((s) => s.done)
  if (done.length === 0 || done.length < sets.length) return false
  // Reps are not always logged. When they are not, finishing every
  // prescribed set is the best evidence available and counts as a clear.
  return done.every((s) => s.reps === undefined || s.reps >= target)
}

/**
 * The single number to show for this exercise today.
 *
 * Walks back to the last session that trained it, reads what was
 * prescribed then, and moves one step: cleared it, add a rep;
 * already at the top, reset to the bottom because the weight is
 * going up instead; did not clear it, hold.
 */
export function repTargetFor(
  data: AppData,
  exerciseId: string,
  range: RepRange,
  before: ISODate,
): number {
  const history = Object.values(data.sessions)
    .filter((s) => s.date < before && s.status !== 'skipped')
    .sort((a, b) => (a.date > b.date ? -1 : 1))

  for (const session of history) {
    const log = session.exercises.find((e) => e.exerciseId === exerciseId)
    if (!log || log.sets.length === 0) continue
    const prescribed = Number((log.sets[0]?.targetReps ?? '').match(/^\d+/)?.[0])
    if (!Number.isFinite(prescribed)) continue
    const last = Math.min(Math.max(prescribed, range.low), range.high)
    if (!clearedTarget(log.sets, last)) return last
    // Top of the range means the next step is load, not reps.
    return last >= range.high ? range.low : last + 1
  }
  return range.low // never trained it: start at the load end
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

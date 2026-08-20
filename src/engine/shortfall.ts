import type { ExerciseLog, SetLog } from '../sessionTypes'

// ============================================================
// One definition of "the weight on this movement was wrong today".
//
// There were two, and they disagreed, which is how R3 s9.2's drop-load
// escalation silently did nothing. The in-session drop acts on either of
// two things: a set that came up SHORTFALL_TO_ACT reps short, or a set
// that emptied the tank and still missed the number. The next-session
// failing flag counted only the first. So an athlete grinding to failure
// and finishing one rep down, session after session, had the weight taken
// off the bar every time and was handed the same too-heavy prescription
// the next time, forever. The app acted on the evidence and then refused
// to learn from it.
//
// This module is the shared home rather than one importing the other,
// because engine/sessionFatigue.ts already reads dropTo from
// engine/fatigue.ts and pointing fatigue.ts back at it would close a
// cycle. Same fix as engine/proposals.ts, same reason.
// ============================================================

/** Reps below the ask before the weight, rather than the athlete, is the problem. */
export const SHORTFALL_TO_ACT = 2

/** The rep number a set was asked for, when it was asked for a number at all. */
export function askedFor(set: SetLog): number | null {
  const n = Number((set.targetReps.match(/^\d+/) ?? [])[0])
  return Number.isFinite(n) ? n : null
}

/** Missed the ask by enough that the number on the bar is the explanation. */
export function cameUpShort(set: SetLog): boolean {
  const asked = askedFor(set)
  return asked !== null && set.achieved !== undefined && asked - set.achieved >= SHORTFALL_TO_ACT
}

/**
 * Emptied the tank and still missed the number.
 *
 * One rep down is nothing on its own. One rep down with nothing left in
 * reserve is the same fact as a bigger shortfall with reps to spare: the
 * weight is what ran out. `rir` is recorded per movement, not per set,
 * so this reads the movement's answer against the set in question.
 */
export function emptiedTheTank(log: ExerciseLog, set: SetLog): boolean {
  const asked = askedFor(set)
  return (
    log.rir !== undefined &&
    log.rir <= 0 &&
    set.achieved !== undefined &&
    asked !== null &&
    set.achieved < asked
  )
}

/**
 * Did this movement's load prove wrong on this day.
 *
 * The session-level question, asked with exactly the evidence the
 * in-session drop acts on. Anything the app was willing to take weight
 * off the bar for is something the next prescription has to know about.
 */
export function loadProvedWrong(log: ExerciseLog): boolean {
  return log.sets.some((set) => cameUpShort(set) || emptiedTheTank(log, set))
}

import type { ISODate } from './types'
import type { Joint } from './plan/movement'

// ============================================================
// What the athlete has told the app about themselves, and it is
// expected to still know next week.
//
// Its own file for the same reason as sessionTypes.ts and the
// three beside it: types.ts is at its line allowance, and these
// shapes are one subject.
//
// There was no preference memory at all before this. Everything
// an athlete could say about their own training was scoped to a
// single date. data.swaps is keyed by ISO date, so swapping out a
// movement you hate got you one day of relief and it was back
// tomorrow. An injury was inferred from a rolling 14-day window
// of "I can't finish this" answers, which means the way to keep
// the app off a bad shoulder was to keep hurting it at least once
// a fortnight: fifteen quiet days and the movement came straight
// back. The only durable route was hand-editing the booklet.
//
// That is the shape of an app that does not know you. Every field
// here is read somewhere, deliberately: a preference nobody
// consults is worse than no preference, because the athlete
// believes they have been heard.
// ============================================================

/**
 * A movement the athlete does not want, and does not want to keep
 * saying so about.
 *
 * The reason is kept because the two are answered differently: a
 * movement that hurts should never come back, and one that is merely
 * disliked can be offered again if it is the only thing left that
 * covers a pattern.
 */
export interface BlockedExercise {
  exerciseId: string
  reason: 'dislike' | 'hurts' | 'cannot'
  since: ISODate
}

/**
 * Something the plan has to route around until told otherwise.
 *
 * Not inferred, and with no expiry. The joints are what the movement
 * graph reasons over; the label is the athlete's own words and is only
 * ever shown back to them.
 */
export interface Limitation {
  label: string
  joints: Joint[]
  since: ISODate
}

export interface Prefs {
  /** Movements to keep out of the plan. */
  blocked: BlockedExercise[]
  /**
   * Lifts to leave exactly where they are.
   *
   * A pinned lift is not rotated at a block boundary and is not promoted
   * at the end of a phase, however well it has been going. Somebody
   * training for a competition lift does not want the app deciding they
   * have earned a different one.
   */
  pinned: string[]
  /** Injuries and restrictions, which do not quietly expire. */
  limitations: Limitation[]
  /** How long they actually have, in minutes. Absent means no limit. */
  sessionMinutes?: number
}

export function emptyPrefs(): Prefs {
  return { blocked: [], pinned: [], limitations: [] }
}

/** Every joint the plan must currently avoid, from stated limitations. */
export function limitedJoints(prefs: Prefs): Joint[] {
  return [...new Set(prefs.limitations.flatMap((l) => l.joints))]
}

/** Movement ids the plan should not program, hard cases first. */
export function blockedIds(prefs: Prefs): Set<string> {
  return new Set(prefs.blocked.map((b) => b.exerciseId))
}

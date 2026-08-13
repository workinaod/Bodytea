import type { ISODate } from './types'

// ============================================================
// The journey: a long goal broken into rungs you can reach.
//
// Lives in its own module rather than types.ts for the same
// reason sessionTypes.ts and activityTypes.ts do — the shapes
// of one feature, kept beside each other.
//
// The whole design turns on one split:
//
//   the LADDER (what) is fixed
//   the PROJECTION (when) moves
//
// Once a rung is on the ladder it never moves, and once it is
// reached it never un-reaches. The estimate of WHEN is
// recomputed from what the athlete has actually logged, and is
// refused outright when the data cannot carry one. A target
// that drifts under somebody while they climb toward it is the
// thing that makes an app feel like a treadmill, which is the
// exact complaint this feature exists to answer.
// ============================================================

/** Which strand of the climb a rung belongs to. */
export type TrackId = 'body' | 'strength' | 'engine' | 'explosive' | 'consistency'

/**
 * What a rung is measured on.
 *
 * A typed key, never a substring match on a user-typed label. The
 * existing `hitTargetWeight` badge matches `customTargets[0].label`
 * against the word "weight" and is wrong for anybody who typed
 * "bodyweight goal" or "waist". Every variant here has a reader in
 * engine/journey.ts, enforced by an exhaustive switch that fails to
 * compile when a variant is added without one.
 */
export type RungMetric =
  // measurements: slow, noisy, need a trailing mean to score
  | 'weightLb'
  | 'waistIn'
  | 'bodyFatPct'
  | 'vertIn'
  // performances: a single verified effort counts
  | 'topSetLb'
  | 'repMax'
  | 'longRunMi'
  | 'weeklyMi'
  // behaviour: counted straight off the log
  | 'sessions'
  | 'streakDays'

/**
 * The one thing that is written down.
 *
 * rungId → the day it was first reached. Append-only: never
 * rewritten, never deleted. A stale key from a ladder the athlete
 * has since edited costs nothing and is exactly what lets an edited
 * goal re-adopt a rung they already earned.
 *
 * This is persisted and the rest is derived, because a reached rung
 * is a historical fact and re-deriving it would let a deload week,
 * a bad scale day, or a corrected measurement take it away again.
 */
export interface JourneyState {
  hits: Record<string, ISODate>
}

export const emptyJourney = (): JourneyState => ({ hits: {} })

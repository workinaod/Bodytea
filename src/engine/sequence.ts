import type { ResolvedExercise } from '../types'
import { EXERCISE_MUSCLES } from '../plan/muscles'
import { MOVEMENT, type ProgrammingRole } from '../plan/movement'

// ============================================================
// Exercise ORDER, which is programming, not presentation.
//
// The complaint that produced this file: four sets of fifteen to
// twenty lateral raises sitting at position four of seven, with a
// loaded close-grip press still to come. Side delts assist every
// press, so eighty reps of raises immediately before a barbell
// press degrades the press and buys nothing. The plan listed the
// movements in a sensible-looking order and never asked what
// order the BODY needed.
//
// The rule is the standard resistance-training sequence and it is
// not controversial:
//
//   1. Power and explosive work, on a fresh nervous system. Speed
//      and rate of force development collapse under fatigue, so a
//      tired jump set is not a jump set, it is just tiring.
//   2. Multi-joint lifts, heaviest demand first. These are what
//      the day is for and they need the most from you.
//   3. Single-joint and high-rep accessory work. This is where
//      local fatigue is free, because nothing after it needs the
//      muscle to be fresh.
//   4. Loaded carries, then core, then mobility. Trunk and grip
//      fatigue degrade everything above them, so they go last.
//
// Sorting is STABLE inside each band, so the plan author's
// intent survives wherever the body does not object. This moves
// what is placed wrong and nothing else.
// ============================================================

/** The leading number of a rep prescription: "15-20" → 15, "12" → 12. */
export function lowRep(repText: string | undefined): number | null {
  if (!repText) return null
  const m = /(\d+)/.exec(repText)
  return m ? Number(m[1]) : null
}

/**
 * Accessory work: either genuinely single-joint, or a small
 * movement prescribed in the pump range. Both belong after the
 * compounds for the same reason, so both answer to one predicate.
 *
 * Rep range earns a vote because muscle mapping alone cannot tell
 * a close-grip press (one primary, three regions, a real compound)
 * from a prone Y raise (two primaries, but twelve reps of light
 * rear-delt work). The prescription knows what the mapping does not.
 */
export function isAccessory(e: ResolvedExercise): boolean {
  if (e.kind !== 'lift') return false
  // The catalog already says what each movement is FOR. plan/movement.ts
  // carries a programming role on every entry and a test proves there are
  // no orphans, so guessing from region counts was always second best:
  // it cannot tell a close-grip press from a prone Y raise without the
  // rep range casting a vote, and the rep range is not what makes a
  // movement accessory work.
  const role = MOVEMENT[e.exerciseId]?.role
  if (role) return role === 'accessory' || role === 'isolation' || role === 'prehab'
  // Movements outside the graph (athletic drills) keep the old reading.
  const m = EXERCISE_MUSCLES[e.exerciseId]
  if (!m) return false
  const regions = m.primary.length + m.secondary.length
  if (m.primary.length === 1 && regions <= 2) return true // single-joint
  const low = lowRep(e.repText)
  return regions <= 3 && low !== null && low >= 12 // small and high-rep
}

/**
 * Lower sorts earlier WITHIN a band.
 *
 * The bands got the day roughly right and then stopped, because the only
 * tiebreak left was the order the recipe author happened to type. That
 * is how a secondary press could sit ahead of the primary one it is
 * meant to follow: nothing in the sort had an opinion, so the array
 * index won by default.
 *
 * A movement the graph does not know sorts as secondary, which keeps it
 * behind the day's main work and ahead of the accessories, and is the
 * least surprising place to put something we cannot classify.
 */
const ROLE_RANK: Record<ProgrammingRole, number> = {
  primary: 0,
  secondary: 1,
  accessory: 2,
  isolation: 3,
  prehab: 4,
  conditioning: 5,
  mobility: 6,
}

export function roleRank(e: ResolvedExercise): number {
  const role = MOVEMENT[e.exerciseId]?.role
  return role ? ROLE_RANK[role] : ROLE_RANK.secondary
}

/** Lower sorts earlier. The bands are the sequence, in order. */
export function band(e: ResolvedExercise): number {
  switch (e.kind) {
    case 'warmup':
      return 0
    case 'sprint':
    case 'jump':
      return 1
    case 'lift':
      return isAccessory(e) ? 3 : 2
    case 'carry':
      return 4
    case 'core':
      return 5
    case 'mobility':
      return 6
    case 'cardio':
      return 7
    default:
      return 2
  }
}

/**
 * Put the day in an order a body can actually train in. Stable
 * within each band, so this only ever moves something that was in
 * the wrong band to begin with.
 */
export function orderSession(exercises: ResolvedExercise[]): ResolvedExercise[] {
  return exercises
    .map((ex, i) => ({ ex, i }))
    .sort((a, b) => band(a.ex) - band(b.ex) || roleRank(a.ex) - roleRank(b.ex) || a.i - b.i)
    .map((x) => x.ex)
}

/** True when the order the plan asked for is not the order it should run in. */
export function isMisordered(exercises: ResolvedExercise[]): boolean {
  const ordered = orderSession(exercises)
  return ordered.some((e, i) => e !== exercises[i])
}

/**
 * Three hard sets is where single-joint work stops paying, and
 * that is before accounting for the compounds that already taxed
 * the same muscle. Four sets of lateral raises after four sets of
 * overhead press is not more stimulus, it is more fatigue.
 */
export const MAX_ACCESSORY_SETS = 3

export function capAccessorySets(exercises: ResolvedExercise[]): ResolvedExercise[] {
  return exercises.map((e) =>
    isAccessory(e) && e.sets > MAX_ACCESSORY_SETS ? { ...e, sets: MAX_ACCESSORY_SETS } : e,
  )
}

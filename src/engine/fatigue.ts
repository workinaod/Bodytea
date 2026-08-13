import type { AppData, FatigueNote, FatigueReason, ISODate, SessionLog } from '../types'
import type { MuscleRegion } from '../plan/muscleRegions'
import { musclesFor } from '../plan/muscles'
import { addDaysISO, daysBetween } from './calendar'

// ============================================================
// What "I can't finish this" means, and what to do about it.
//
// The failure this exists to catch: the button said "Can't
// finish", asked nothing, and did nothing. Every reason a set
// dies got the same response, which is the same as having no
// response. But the four reasons are not variations on one
// problem, they are four different problems:
//
//   fried  the muscle is done, the body is not. Less load, same
//          movement, finish the set.
//   form   the reps are still there but they are ugly. The
//          exercise is over; grinding out bad reps is how people
//          get hurt for no stimulus.
//   pain   sharp or wrong, not the burn. Out of the movement
//          entirely, and never a "push through" option.
//   empty  the whole system, not one muscle. This is about the
//          rest of the session, not this exercise.
//
// REGIONS. A note carries the movement's PRIMARY regions, copied
// in rather than looked up later, so a note written today still
// means what it meant if the catalog is edited tomorrow. Primary
// only: an assisting muscle giving out is a different event from
// the target muscle giving out, and treating them the same is
// how "your triceps are cooked" ends up cancelling a leg day.
//
// This never runs inside resolveDay. The plan is golden-locked;
// this reads what happened and suggests, and every suggestion
// reaches the athlete as something to tap, never as something
// already done to them.
// ============================================================

/** The middle of the 10-15% band coaches use for a back-off set. */
const DROP_FRACTION = 0.875

/** How far back a note still counts toward a suggestion. */
export const RECENT_DAYS = 21

/** Two of the same complaint is a pattern; one is a bad day. */
export const PATTERN_COUNT = 2

/** A region complained about this many times is a volume problem, not an exercise problem. */
export const REGION_WATCH_COUNT = 3

/** The primary regions of a movement, which is what a fatigue note records. */
export function regionsFor(exerciseId: string): MuscleRegion[] {
  return musclesFor(exerciseId).primary
}

/**
 * The load to offer after a set dies: 10-15% off, on the 5 lb
 * granularity the steppers actually use.
 *
 * The clamp matters more than the fraction. Rounding alone can
 * land back on the weight you started from (17.5 rounds to 20),
 * and an "ease off" button that changes nothing is worse than no
 * button. So the result is always at least one 5 lb step lower,
 * which on light dumbbells is a bigger percentage than the band
 * asks for. That is the cost of 5 lb plates, not a bug.
 */
export function dropTo(weightLb: number, fraction = DROP_FRACTION): number {
  if (!Number.isFinite(weightLb) || weightLb <= 0) return 0
  const rounded = Math.round((weightLb * fraction) / 5) * 5
  return Math.max(0, Math.min(rounded, weightLb - 5))
}

/**
 * The load for a day flagged light. Same mechanic as the back-off
 * above, and deliberately the same function: two ways to say "take
 * it down a notch" would drift apart, and both have to guarantee
 * the number on screen actually moved.
 */
export const LIGHT_DAY_FRACTION = 0.85
export const lightLoad = (weightLb: number) => dropTo(weightLb, LIGHT_DAY_FRACTION)

export interface AheadHit {
  exIdx: number
  exerciseId: string
  /** Which primary regions it shares with the movement that just died. */
  shared: MuscleRegion[]
}

/**
 * What is still ahead today that leans on the same muscle.
 *
 * This is what makes "the rest of this session" a concrete list
 * instead of a feeling. If the quads just gave out and three of
 * the four remaining movements are quad-primary, the honest
 * thing to say is that the day is over, not "have a rest".
 */
export function sameGroupAhead(session: SessionLog, exIdx: number): AheadHit[] {
  const here = session.exercises[exIdx]
  if (!here) return []
  const mine = new Set(regionsFor(here.exerciseId))
  if (mine.size === 0) return []

  const out: AheadHit[] = []
  for (let i = exIdx + 1; i < session.exercises.length; i++) {
    const ex = session.exercises[i]
    if (ex.skipped) continue
    const shared = regionsFor(ex.exerciseId).filter((r) => mine.has(r))
    if (shared.length) out.push({ exIdx: i, exerciseId: ex.exerciseId, shared })
  }
  return out
}

export type SuggestionKind = 'swap' | 'start-lighter' | 'watch-region'

export interface FatigueSuggestion {
  kind: SuggestionKind
  /** Present for exercise-level suggestions. */
  exerciseId?: string
  regions: MuscleRegion[]
  /** How many notes back this up. */
  count: number
  /** The evidence, in a sentence. An unexplained change reads as a bug. */
  because: string
}

function notesInWindow(data: AppData, today: ISODate): FatigueNote[] {
  const out: FatigueNote[] = []
  for (const s of Object.values(data.sessions)) {
    const age = daysBetween(s.date, today)
    if (age < 0 || age > RECENT_DAYS) continue
    for (const n of s.fatigue ?? []) out.push(n)
  }
  return out
}

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many)

/**
 * What to offer at the START of the next session, from what the
 * last few weeks actually said. Ordered most serious first:
 * pain outranks fatigue, and an exercise problem outranks a
 * whole-region volume problem, because it is the cheaper fix.
 */
/** Sessions inside the window where a movement finished under its ask. */
function shortfallsInWindow(data: AppData, today: ISODate): Map<string, number> {
  const from = addDaysISO(today, -RECENT_DAYS)
  const out = new Map<string, number>()
  for (const s of Object.values(data.sessions)) {
    if (s.date < from || s.date >= today || s.status === 'skipped') continue
    for (const log of s.exercises) {
      const short = log.sets.some((set) => {
        if (set.achieved === undefined) return false
        const asked = Number((set.targetReps.match(/^\d+/) ?? [])[0])
        return Number.isFinite(asked) && asked - set.achieved >= 2
      })
      if (short) out.set(log.exerciseId, (out.get(log.exerciseId) ?? 0) + 1)
    }
  }
  return out
}

/** Sessions a movement must come up short in before the load is questioned. */
export const SHORT_SESSIONS_TO_ACT = 3

export function nextSessionSuggestions(data: AppData, today: ISODate): FatigueSuggestion[] {
  const notes = notesInWindow(data, today)
  const shortfalls = shortfallsInWindow(data, today)
  if (notes.length === 0 && shortfalls.size === 0) return []

  const byExercise = new Map<string, FatigueNote[]>()
  for (const n of notes) {
    const list = byExercise.get(n.exerciseId)
    if (list) list.push(n)
    else byExercise.set(n.exerciseId, [n])
  }

  const out: FatigueSuggestion[] = []
  const spokenFor = new Set<string>()

  // 1. Pain, repeated. Stop offering the movement.
  for (const [exerciseId, list] of byExercise) {
    const hurt = list.filter((n) => n.reason === 'pain')
    if (hurt.length >= PATTERN_COUNT) {
      spokenFor.add(exerciseId)
      out.push({
        kind: 'swap',
        exerciseId,
        regions: regionsFor(exerciseId),
        count: hurt.length,
        because: `This hurt ${hurt.length} times in the last ${RECENT_DAYS} days.`,
      })
    }
  }

  // 2. The muscle keeps dying on the same movement. Start lower.
  for (const [exerciseId, list] of byExercise) {
    if (spokenFor.has(exerciseId)) continue
    const gaveOut = list.filter((n) => n.reason === 'fried' || n.reason === 'form')
    if (gaveOut.length >= PATTERN_COUNT) {
      spokenFor.add(exerciseId)
      out.push({
        kind: 'start-lighter',
        exerciseId,
        regions: regionsFor(exerciseId),
        count: gaveOut.length,
        because: `You ran out on this ${gaveOut.length} times in the last ${RECENT_DAYS} days.`,
      })
    }
  }

  // 2b. The same story told by the log rather than by a tap.
  //
  //     Sections 1 and 2 only ever hear from the can't-finish sheet, so
  //     the only athlete this engine learned from was one who stopped
  //     mid-set and answered a question. Somebody who quietly grinds out
  //     five of the eight, week after week, was invisible to it: the
  //     shortfall reached the load engine inside the session and then
  //     went nowhere.
  //
  //     Sets that came up short are the same evidence, already on disk.
  for (const [exerciseId, count] of shortfallsInWindow(data, today)) {
    if (spokenFor.has(exerciseId)) continue
    if (count < SHORT_SESSIONS_TO_ACT) continue
    spokenFor.add(exerciseId)
    out.push({
      kind: 'start-lighter',
      exerciseId,
      regions: regionsFor(exerciseId),
      count,
      because: `You came up short on this in ${count} of the last ${RECENT_DAYS} days.`,
    })
  }

  // 3. A whole region keeps showing up across DIFFERENT movements.
  // One exercise failing is an exercise problem; the same muscle
  // failing on three of them is too much work on that muscle.
  const regionCount = new Map<MuscleRegion, Set<string>>()
  for (const n of notes) {
    if (n.reason === 'empty') continue // whole-body, names no muscle
    for (const r of n.regions as MuscleRegion[]) {
      const seen = regionCount.get(r)
      if (seen) seen.add(n.exerciseId)
      else regionCount.set(r, new Set([n.exerciseId]))
    }
  }
  for (const [region, exercises] of regionCount) {
    if (exercises.size < REGION_WATCH_COUNT) continue
    out.push({
      kind: 'watch-region',
      regions: [region],
      count: exercises.size,
      because: `${exercises.size} different ${plural(exercises.size, 'movement', 'movements')} on this muscle ran out recently.`,
    })
  }

  return out
}

/** Reasons that mean "this exercise is over", as opposed to "less weight". */
export function endsTheExercise(reason: FatigueReason): boolean {
  return reason === 'form' || reason === 'pain'
}

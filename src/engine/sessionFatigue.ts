import type { ExerciseLog } from '../sessionTypes'
import { dropTo } from './fatigue'
import { askedFor, cameUpShort, emptiedTheTank } from './shortfall'

// ============================================================
// Fatigue that arrives while you are still in the session.
//
// Everything the app knew about a set going badly reached the
// athlete as a button. weightDropped could see the load coming
// down inside an exercise and rendered an "ease off" offer;
// sameGroupAhead could see what else trains the same muscle and
// only spoke inside the can't-finish sheet; preFatigued and
// nextSessionSuggestions were computed and called by nothing at
// all. Miss the button and the session carried on asking for a
// weight that had already been shown to be too much, set after
// set, and then wrote that failure into the log as the athlete's.
//
// The house rule this bends is real and worth stating: "every
// suggestion reaches the athlete as something to tap, never as
// something already done to them". It is a good rule about
// REMOVING work. Nobody should come back from a rest to find
// their session quietly shortened.
//
// It is the wrong rule about the number on the bar. When the
// third set of eight came out at five, the weight is wrong NOW,
// and asking somebody mid-session to do the arithmetic and press
// a button about it is asking them to coach themselves. So: the
// load moves on its own, it always says why, and it is one tap to
// put back. Cutting sets or dropping movements stays a choice.
//
// That boundary lives in exactly one function, `isAutomatic`, so
// it can be moved without touching a call site.
// ============================================================

export type FatigueResponseKind = 'drop-load' | 'offer-ease'

export interface FatigueResponse {
  kind: FatigueResponseKind
  /** The weight the not-yet-done sets of this movement should use. */
  weightLb?: number
  /** Always said out loud. An adjustment nobody can see is a bug report. */
  because: string
}

/**
 * The one place the automatic/offered line is drawn.
 *
 * Load comes down by itself. Work only ever comes out by consent.
 */
export function isAutomatic(kind: FatigueResponseKind): boolean {
  return kind === 'drop-load'
}

/**
 * How the set that just finished went, and what the rest of this
 * movement should do about it.
 *
 * Reads only the sets of the movement in front of the athlete. Anything
 * about the session as a whole is a volume question, and volume answers
 * are offered rather than taken.
 */
export function respondToSet(log: ExerciseLog, setIdx: number): FatigueResponse | null {
  const set = log.sets[setIdx]
  if (!set?.done) return null

  const remaining = log.sets.slice(setIdx + 1).filter((s) => !s.done)
  if (remaining.length === 0) return null

  const weight = set.weightLb
  if (weight === undefined || weight <= 0) {
    // Bodyweight work. There is no bar to lower, so the only honest
    // lever is volume, and volume is always offered, never taken. The
    // old behavior was silence, which told a bodyweight athlete their
    // failing set was fine while a loaded one got coached.
    const unloaded = log.sets.every((s) => s.weightLb === undefined || s.weightLb <= 0)
    if (!unloaded) return null
    const asked = askedFor(set)
    if (!cameUpShort(set)) return null
    return {
      kind: 'offer-ease',
      because: `That set came up ${asked! - set.achieved!} short and there is no weight to take off. Want the rest of the day shortened?`,
    }
  }

  // Only when the sets ahead are still expecting the weight that just
  // failed. If the athlete has already taken it down themselves, they
  // have made the call and this has nothing to add.
  if (!remaining.some((s) => (s.weightLb ?? weight) >= weight)) return null

  const asked = askedFor(set)
  const short = cameUpShort(set)

  if (short || emptiedTheTank(log, set)) {
    const to = dropTo(weight)
    if (to <= 0 || to >= weight) return null
    return {
      kind: 'drop-load',
      weightLb: to,
      because: short
        ? `That set came up ${asked! - set.achieved!} short, so the rest go at ${to}.`
        : `Nothing left in the tank and the reps went with it, so the rest go at ${to}.`,
    }
  }

  // The athlete has already dropped the weight once inside this movement.
  // Not a load problem any more: they solved that. It is a sign the day
  // is running out, which is a volume question, and volume is offered.
  const loaded = log.sets.slice(0, setIdx + 1).filter((s) => s.done && s.weightLb !== undefined)
  if (loaded.length >= 2 && loaded[loaded.length - 1].weightLb! < loaded[0].weightLb!) {
    return {
      kind: 'offer-ease',
      because: 'The weight has already come down once here. Want the rest of the day shortened?',
    }
  }

  return null
}

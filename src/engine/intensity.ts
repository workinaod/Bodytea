import { cardioActivity, metFor, trackingFor } from '../plan/cardio'

// ============================================================
// How hard was that, actually.
//
// Every timed activity in the app used to cost exactly what the
// user said it cost. Basketball asked "running games or shooting
// around?" and billed 8.0 METs or 4.5 on the answer. That is a
// guess, made after the fact, by someone who just played for an
// hour and is in no position to grade themselves. Two people who
// answer the same way get the same calories for wildly different
// hours.
//
// Meanwhile the phone was in their pocket the whole time,
// counting footfalls. This turns that count into three things:
//
//   an INTENSITY   low, standard or high, from steps per hour
//                  against that sport's own band
//   a DISTANCE     for sports where ground actually gets covered,
//                  at that sport's own stride
//   a CALORIE      from the MET the measured tier earns, rather
//     NUMBER       than the MET the user claimed
//
// The bands and strides live in plan/cardio.ts beside the
// activities, with the research they came from. This file is the
// arithmetic and the judgement calls.
//
// TWO RULES KEEP IT HONEST.
//
// A pedometer can MISS work but it cannot INVENT it. Phones sit
// on benches, ride in bags, and see nothing at all of a grappling
// round spent on the mat. So when the user also chose a mode, the
// higher of the two wins: the measured tier can raise a claim it
// disagrees with, never lower it. Sand, hills and body armour are
// real costs that no step counter will ever see.
//
// Not enough evidence means NO answer, never a default one. A
// session too short to read, or one where the pedometer plainly
// was not on the person, returns null and the app falls back to
// what it did before. Silence beats a confident wrong number.
// ============================================================

export type Intensity = 'low' | 'standard' | 'high'

/** Under this there is not enough session to read a rate from. */
export const MIN_MINUTES_TO_JUDGE = 5

/**
 * Under this the pedometer was not on the person. Two hundred
 * steps is about two minutes of walking, so anything below it
 * across a whole session is a phone in a bag, not a quiet game.
 */
export const MIN_STEPS_TO_JUDGE = 200

/** Feet per mile, so the stride math reads in one line. */
const INCHES_PER_MILE = 63360

/** Height in inches, clamped to something a person could be. */
export function usableHeightIn(heightIn: number | undefined): number {
  return heightIn && heightIn > 40 && heightIn < 90 ? heightIn : 69
}

/** The rate everything else is judged on. */
export function stepsPerHour(steps: number, minutes: number): number {
  if (minutes <= 0) return 0
  return Math.round(steps / (minutes / 60))
}

/**
 * Which version of this sport was that.
 *
 * Null means the question cannot be answered from what was
 * recorded: the activity has no step signal worth reading, the
 * session was too short, or the phone was not on the athlete.
 */
export function classifyIntensity(
  activityId: string,
  steps: number | undefined,
  minutes: number,
): Intensity | null {
  const track = trackingFor(activityId)
  if (!track.steps || !track.band) return null
  if (steps === undefined || steps < MIN_STEPS_TO_JUDGE) return null
  if (minutes < MIN_MINUTES_TO_JUDGE) return null
  const rate = stepsPerHour(steps, minutes)
  if (rate <= track.band.low) return 'low'
  if (rate >= track.band.high) return 'high'
  return 'standard'
}

/**
 * Ground covered, from steps, at this sport's own stride.
 *
 * Null wherever a distance would be theatre. A boxer covers no
 * ground, a swimmer takes no steps, and a rower does not move.
 * Reporting 1.4 miles for a bag session would be a number the app
 * made up, which is worse than a blank.
 */
export function stepDistanceMi(
  activityId: string,
  steps: number | undefined,
  heightIn?: number,
): number | null {
  const track = trackingFor(activityId)
  if (!track.steps || track.distance === 'none' || track.stride === undefined) return null
  if (steps === undefined || steps < MIN_STEPS_TO_JUDGE) return null
  const inches = steps * usableHeightIn(heightIn) * track.stride
  return Math.round((inches / INCHES_PER_MILE) * 100) / 100
}

/** Does the pedometer say anything real during this activity? */
export function tracksSteps(activityId: string): boolean {
  return trackingFor(activityId).steps
}

/** Where this activity's distance should come from, if anywhere. */
export function distanceSourceFor(activityId: string): 'gps' | 'steps' | 'none' {
  return trackingFor(activityId).distance
}

export interface CardioMeasure {
  activityId: string
  minutes: number
  bodyweightLb: number
  /** The mode chip, when the user picked one. */
  mode?: string | null
  /** Footfalls counted across the session. */
  steps?: number
}

export interface KcalEstimate {
  kcal: number
  met: number
  /** What the number was built on, so the app can say so out loud. */
  basis: 'steps' | 'mode'
  intensity: Intensity | null
}

const toKg = (lb: number) => Math.min(150, Math.max(40, (lb || 175) * 0.4536))

/**
 * Calories for a timed activity, best evidence first.
 *
 * Steps beat the mode chip, because one was measured and the
 * other was remembered. But a mode the user actually chose sets a
 * floor the measurement cannot pull down, for the reason in the
 * header: a pedometer misses work, it does not invent it.
 *
 * With no steps at all this lands exactly where it landed before
 * any of this existed, on the mode's Compendium MET, so nothing
 * that was already logged changes value.
 */
export function cardioKcal(m: CardioMeasure): KcalEstimate {
  const track = trackingFor(m.activityId)
  const intensity = classifyIntensity(m.activityId, m.steps, m.minutes)
  const measured = intensity && track.met ? track.met[intensity] : null
  // No mode chosen means no claim to respect. The timer never asks
  // for one, so a tracked session is measurement or nothing.
  const claimed = m.mode ? metFor(m.activityId, m.mode) : null

  const met =
    measured !== null
      ? claimed !== null
        ? Math.max(measured, claimed)
        : measured
      : (claimed ?? cardioActivity(m.activityId).met)

  const basis = measured !== null && (claimed === null || measured >= claimed) ? 'steps' : 'mode'
  const kcal = m.minutes <= 0 ? 0 : Math.round(met * toKg(m.bodyweightLb) * (m.minutes / 60))
  return { kcal, met, basis, intensity }
}

/** What the tier is called on screen. */
export function intensityLabel(tier: Intensity): string {
  return tier === 'low' ? 'Low' : tier === 'high' ? 'High' : 'Standard'
}

/**
 * The one line that explains the number, because a calorie count
 * nobody can check is indistinguishable from a made-up one.
 */
export function intensityNote(activityId: string, steps: number, minutes: number): string | null {
  const tier = classifyIntensity(activityId, steps, minutes)
  if (tier === null) return null
  const rate = stepsPerHour(steps, minutes).toLocaleString()
  const how =
    tier === 'high'
      ? 'well above'
      : tier === 'low'
        ? 'below'
        : 'right around'
  return `${rate} steps an hour, ${how} normal for ${cardioActivity(activityId).label.toLowerCase()}.`
}

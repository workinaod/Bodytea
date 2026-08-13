import type { Goal } from '../types'
import type { MealsPerDay } from './foods'

// ============================================================
// What the app can work out about somebody before it asks them
// anything else.
//
// The onboarding knows sex, height and weight by the second
// screen. Every screen after that used to ignore all three and
// show the same options to everybody, which is the difference
// between a form and a conversation: a form does not change
// when you answer it.
//
// Everything here is a pure function of what is already known,
// so the rules are testable and there is exactly one place to
// argue with them.
// ============================================================

// ---------------- Reach, and what is actually dunkable ----------------

/**
 * Standing reach runs about 1.33× height across adults — the ratio is
 * remarkably stable, which is why combine tables can predict it before
 * anyone measures it.
 */
export const STANDING_REACH_RATIO = 1.33

/** A regulation rim, in inches. */
export const RIM_IN = 120

/**
 * You do not dunk by touching the rim. The ball has to clear it, which
 * takes the hand a couple of inches above — less for a one-hand throw
 * down, more for anything worth filming.
 */
export const DUNK_CLEARANCE_IN = 2

export const standingReachIn = (heightIn: number): number => heightIn * STANDING_REACH_RATIO

/** The vertical this person needs, at this height, to get a ball over a rim. */
export function dunkVertNeededIn(heightIn: number): number {
  return RIM_IN + DUNK_CLEARANCE_IN - standingReachIn(heightIn)
}

/**
 * The vertical a committed athlete can add and hold with good training.
 *
 * Published jump-training meta-analyses put realistic gains from a
 * dedicated plyometric block at roughly 3-8 cm, on top of whatever
 * somebody already has. A 30" running vertical is the outer edge of what
 * a non-elite adult reaches at all — the NBA combine average sits in the
 * mid-30s and those are selected athletes.
 *
 * This is the threshold for OFFERING the goal, not for allowing it.
 * Anyone can type "I want to dunk" and get the same vertical plan; what
 * this stops is the app putting a goal on a 5'2" person's first screen
 * that would need a 36" vertical, which is a promise it cannot keep.
 */
export const MAX_TRAINABLE_VERT_IN = 30

export function canRealisticallyDunk(heightIn: number | undefined): boolean {
  if (!heightIn) return false
  return dunkVertNeededIn(heightIn) <= MAX_TRAINABLE_VERT_IN
}

/** The shortest person the dunk goal is offered to, in inches. */
export const DUNK_MIN_HEIGHT_IN =
  (RIM_IN + DUNK_CLEARANCE_IN - MAX_TRAINABLE_VERT_IN) / STANDING_REACH_RATIO

/**
 * Heights on a basketball court, in inches, for the things people say
 * they can reach. The backboard's bottom edge is 9'6" and a net hangs
 * about 16" below the rim, so "I can touch the net" is a real number
 * once you know how long somebody's arms are.
 */
const RIM_LANDMARK_IN: Record<string, number> = {
  'Can grab it': RIM_IN + 2,
  'Touch it': RIM_IN,
  Backboard: 114,
  Net: 110,
}

/**
 * A standing vertical, in inches, from "how close to the rim are you?"
 * plus a height.
 *
 * This is the whole argument for asking height at signup, in one
 * function. The old screen asked for a "standing reach / vert touch"
 * in a stepper that defaulted to zero, and almost nobody knew the
 * number or moved it — so the climb's explosive track opened on "log a
 * vertical to start this one" for everybody. A person who cannot tell
 * you their vertical can always tell you whether they touch the rim,
 * and with their height that IS their vertical.
 *
 * Null when they said they are nowhere near, because a floor of "less
 * than the net" is not a measurement.
 */
export function vertFromRimAnswer(answer: string | undefined, heightIn: number | undefined): number | null {
  if (!answer || !heightIn) return null
  const landmark = RIM_LANDMARK_IN[answer]
  if (landmark === undefined) return null
  return Math.max(0, Math.round(landmark - standingReachIn(heightIn)))
}

/**
 * Where the height stepper starts, once they have said which they are.
 *
 * It must land on the reference height, not near it: somebody who never
 * touches the stepper has told the app nothing about their height, and
 * the plan they get has to be identical to the one they got before
 * height was ever asked for. A default of 5'8" would have quietly taken
 * 25 kcal off every man who skipped it.
 */
export const DEFAULT_HEIGHT_IN: Record<'male' | 'female', number> = { male: 69, female: 64 }

// ---------------- Body mass ----------------

export function bmiOf(weightLb: number | undefined, heightIn: number | undefined): number | null {
  if (!weightLb || !heightIn || heightIn < 48 || heightIn > 90) return null
  return (703 * weightLb) / (heightIn * heightIn)
}

/**
 * The two thresholds worth acting on, and only these two.
 *
 * BMI is a poor measure of an individual and a fine one for deciding
 * WHICH GOAL TO LIST FIRST. Nothing is ever hidden on this basis and
 * nothing is ever said about it — a heavier person sees "lose weight"
 * at the top of a list they can ignore, not a verdict.
 *
 * 30 is the clinical obesity line; 18.5 is the underweight line, taken
 * a notch under at 19 so a lean athlete is not told to bulk.
 */
export const BMI_LEAN_FIRST = 30
export const BMI_BUILD_FIRST = 19

export function leadingGoal(weightLb?: number, heightIn?: number): Goal | null {
  const bmi = bmiOf(weightLb, heightIn)
  if (bmi === null) return null
  if (bmi >= BMI_LEAN_FIRST) return 'lean'
  if (bmi <= BMI_BUILD_FIRST) return 'muscle'
  return null
}

// ---------------- What the later screens should default to ----------------

/**
 * The day count that already fits the goal, pre-selected — so the common
 * answer is one tap and the number is not a guess the app made silently.
 *
 * Endurance is the outlier: a running plan lives or dies on frequency,
 * and three days a week is not a running plan. Strength is the other
 * way: the sessions are long and the recovery is the training.
 */
export function suggestedDays(goal: Goal, answers: Record<string, string> = {}): 3 | 4 | 5 | 6 {
  const base: Record<Goal, 3 | 4 | 5 | 6> = {
    endurance: 5,
    lean: 4,
    muscle: 4,
    strength: 4,
    general: 3,
    vertical: 4,
    speed: 4,
  }
  const d = base[goal]
  // A date a few weeks out is not a reason to train more; it is a reason
  // to train what matters. The one exception is the person who says they
  // have no date at all and is building a habit — keep it low.
  if (answers['deadline'] === 'No date' && (goal === 'general' || goal === 'lean')) return 3
  return d
}

/**
 * How many times a day the food plan is built around.
 *
 * Somebody trying to eat above maintenance loses on appetite, not on
 * willpower, and splitting the same calories over more sittings is the
 * whole trick. Somebody in a deficit has the opposite problem and does
 * better with fewer, bigger meals that actually read as meals.
 */
export function suggestedMeals(goal: Goal): MealsPerDay {
  if (goal === 'muscle' || goal === 'strength') return 5
  if (goal === 'lean') return 3
  return 4
}

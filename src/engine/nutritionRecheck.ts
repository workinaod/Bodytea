import type { AppData, ISODate } from '../types'
import type { CalorieTargets, NutritionBasis } from '../nutritionTypes'
import { buildNutrition } from '../plan/nutritionPlan'
import { latestBodyweightLb } from './stats'
import { adherenceShape, readUserModel } from './userModel'

// ============================================================
// The calorie target was computed once, at signup, and never again.
//
// buildNutrition runs inside generatePlan, the two numbers land on the
// plan, and nothing recomputes them for the rest of the account's life.
// So the body-composition model shipped in plan/bmr.ts could never
// actually fire for anybody: the tape flow lives on the Progress screen,
// which an athlete reaches days or weeks after their plan was built. They
// measure, they get a better chart, and the number that decides what they
// eat does not move.
//
// The same silence covers everything else that changes. Thirty pounds
// down and the target is still sized for the body that walked in. Training
// four days when the plan assumed six, or six when it assumed three.
//
// So: recompute against what is true today, and OFFER it. Three rules
// keep the offer honest.
//
//   It needs a record of what the old number came from. Plans built before
//   nutritionBasis existed do not have one, and rather than guess what
//   they used to know, this stays quiet for them forever.
//
//   It needs something genuinely new. Not a different arithmetic result, a
//   different INPUT: a tape reading, a real weight change, a training week
//   that is not the one the plan assumed. Otherwise it is noise with a
//   number attached.
//
//   It knows whose number it is. If the stored target is not what the
//   basis produces, a person typed it or declined an offer, and the card
//   says so instead of pretending BodyT owns it. It still offers, because
//   a target set at 200 lb is not advice at 170, but it offers the way
//   you would to somebody who has already made a decision.
//
// The basis is what the target was last CONFIRMED against, not only what
// first built it. Declining keeps the number and stamps today's knowledge
// onto it, so the card goes quiet and comes back only if something moves
// again. Saying no once should not mute the app through the next forty
// pounds, and neither should typing your own number.
//
// And it returns a suggestion, never a mutation. Nothing in here writes.
// ============================================================

/** Below this the two numbers are the same answer with different rounding. */
export const MEANINGFUL_KCAL = 100

/** Scale noise, water, one big meal. Not a new bodyweight. */
const REAL_WEIGHT_CHANGE_LB = 3

/**
 * Inside the tape's own measurement error, so not a new reading.
 *
 * This one never changes the calorie number: at any real bodyweight the
 * meaningful-kcal gate below fires long before a sub-1.5-point tape
 * change could matter. What it protects is the EXPLANATION. Without it,
 * an athlete thirty pounds down who happened to re-measure gets told
 * "you measured" for a change the scale made, and a coach who credits
 * the wrong thing is a coach who is visibly guessing.
 *
 * Proven by mutation rather than assumed: the first version of this file
 * had nothing that could tell the difference.
 */
const REAL_BF_CHANGE_PCT = 1.5

const ADHERENCE_WINDOW_DAYS = 28

/** What the app knows now that the stored number was not built with. */
export type LearnedSince = 'tape' | 'weight' | 'week'

export interface NutritionRecheck {
  current: CalorieTargets
  suggested: CalorieTargets
  /** Signed, training day. Negative means the plan has been overfeeding. */
  deltaTraining: number
  /** Never empty: no new input, no suggestion. */
  learned: LearnedSince[]
  /**
   * The stored target is not what its basis produces, so a person put it
   * there: typed in the booklet editor, or kept after declining an offer.
   * Changes what the card SAYS, never whether it appears.
   */
  athleteSet: boolean
  /** What the suggested number is computed from, ready to store with it. */
  basis: NutritionBasis
}

/**
 * Everything the calorie model wants to know about this athlete today.
 *
 * Exported because two engines need it and two gatherings of the same
 * inputs is how they drift apart. `bodyweightLb` is null rather than
 * guessed when nobody has weighed in.
 */
export function nutritionInputsNow(data: AppData, today: ISODate) {
  const profile = data.profile ?? {}
  const shape = adherenceShape(data, today, ADHERENCE_WINDOW_DAYS)
  return {
    // bfFormula, not a sex field, because there is no sex field:
    // onboarding writes the same male/female answer here and the tape
    // estimator reads it. One question, one place.
    sex: profile.bfFormula,
    heightIn: profile.heightIn,
    ageYears: profile.age,
    bodyweightLb: latestBodyweightLb(data),
    bodyFatPct: readUserModel(data, today).bodyFatPct?.value,
    // Completed sessions only. A plan that assumes six and gets three is
    // the main way a calculator lies, and the plan's own daysPerWeek is a
    // statement of intent, not a record of what happened.
    sessionsPerWeek: shape ? Math.round(shape.samples / (ADHERENCE_WINDOW_DAYS / 7)) : undefined,
  }
}

/**
 * What the app would say about this athlete's calories today.
 *
 * Null means no suggestion, which is most of the time and by design.
 */
export function nutritionRecheck(data: AppData, today: ISODate): NutritionRecheck | null {
  const plan = data.plan
  const basis = plan?.nutritionBasis
  const current = plan?.nutrition
  if (!basis || !current) return null

  const { sex, heightIn, ageYears, bodyweightLb: measured, bodyFatPct, sessionsPerWeek } =
    nutritionInputsNow(data, today)
  const bodyweightLb = measured ?? basis.bodyweightLb

  const learned: LearnedSince[] = []
  if (Math.abs(bodyweightLb - basis.bodyweightLb) >= REAL_WEIGHT_CHANGE_LB) learned.push('weight')
  if (
    bodyFatPct !== undefined &&
    (basis.bodyFatPct === undefined || Math.abs(bodyFatPct - basis.bodyFatPct) >= REAL_BF_CHANGE_PCT)
  ) {
    learned.push('tape')
  }
  if (
    sessionsPerWeek !== undefined &&
    (basis.sessionsPerWeek === undefined || sessionsPerWeek !== basis.sessionsPerWeek)
  ) {
    learned.push('week')
  }
  if (learned.length === 0) return null

  const ans = plan.goalAnswers ?? {}
  // Recomputed from the basis and compared to what is actually stored. A
  // gap means a human intervened, which is worth saying out loud and is
  // not worth going silent over.
  const asBuilt = buildNutrition(plan.goal, basis.bodyweightLb, sex, ans, heightIn, {
    ageYears: basis.ageYears,
    bodyFatPct: basis.bodyFatPct,
    sessionsPerWeek: basis.sessionsPerWeek,
  })
  const now = buildNutrition(plan.goal, bodyweightLb, sex, ans, heightIn, {
    ageYears,
    bodyFatPct,
    sessionsPerWeek,
  })
  const deltaTraining = now.kcalTraining - current.kcalTraining
  if (Math.abs(deltaTraining) < MEANINGFUL_KCAL) return null

  return {
    current: { kcalTraining: current.kcalTraining, kcalRest: current.kcalRest },
    suggested: { kcalTraining: now.kcalTraining, kcalRest: now.kcalRest },
    deltaTraining,
    learned,
    athleteSet: asBuilt.kcalTraining !== current.kcalTraining,
    basis: now.basis,
  }
}

/**
 * The plan with the suggestion taken, ready to store.
 *
 * Separate from nutritionRecheck so the offer and the acceptance are two
 * different acts: the engine never writes, and a screen calls this only
 * when somebody taps yes. It re-reads rather than re-deriving, because
 * two functions gathering the same inputs from the same data is how the
 * offer and the thing accepted drift apart.
 */
export function applyRecheck(
  data: AppData,
  today: ISODate,
): { nutrition: CalorieTargets; nutritionBasis: NutritionBasis } | null {
  const r = nutritionRecheck(data, today)
  return r ? { nutrition: r.suggested, nutritionBasis: r.basis } : null
}

/**
 * One short sentence saying what changed, in the athlete's terms.
 *
 * R1 asks that no number renders without an explanation, and "we
 * recalculated" is not one. This names the thing that actually moved, so
 * the offer reads as a consequence rather than an algorithm twitching.
 */
export function learnedCopy(learned: LearnedSince[], athleteSet = false): string {
  const parts: string[] = []
  if (learned.includes('weight')) parts.push('the scale has moved')
  if (learned.includes('tape')) parts.push('you measured')
  if (learned.includes('week')) parts.push('your week changed')
  if (parts.length === 0) return ''
  const list =
    parts.length === 1
      ? parts[0]
      : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`
  // Whose number it is changes the sentence, not whether there is one.
  // Telling somebody their own deliberate target is out of date reads
  // very differently from telling them mine is.
  return athleteSet ? `You set this one. Since then ${list}.` : `Since then ${list}.`
}

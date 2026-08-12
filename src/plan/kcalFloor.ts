// ============================================================
// The floor under every calorie target the app will ever print.
//
// Two code paths build nutrition numbers — buildNutrition for the
// guided onboarding, byorNutrition for bring-your-own-routine —
// and they disagreed. The guided path clamped a cut at 1700 kcal.
// The BYOR path clamped nothing at all, so the same arithmetic
// that gives a 180 lb user a sensible 2,300 handed a 120 lb user
// 1,400 training / 1,100 rest, and a 90 lb user 950 / 650.
//
// A 650 kcal daily target is not an aggressive cut, it is a
// medical event, and it arrived with a 120 g protein target
// attached — 480 of those 650 calories — which is not a diet
// anybody can eat. Nothing in the app re-checked the number
// before printing it on the meals ring.
//
// So the floor lives in one file that both paths call, and it
// floors on TWO rules, because either one alone has a hole:
//
//   AN ABSOLUTE MINIMUM, below which no adult should be eating
//   daily without supervision, full stop.
//
//   A SHARE OF THEIR OWN MAINTENANCE, because "safe" is relative
//   to the body doing the eating. A deficit past roughly a
//   quarter of maintenance is where the research stops showing
//   faster fat loss and starts showing lost lean mass, and a
//   small person hits that long before they hit any fixed number.
//
// Raising a target is the only direction this moves. A surplus,
// or any deficit inside both rules, passes through untouched.
// ============================================================

/** No daily training-day target below this, whatever the arithmetic said. */
export const MIN_KCAL_TRAINING = 1500

/** Rest days sit lower, but not below the number a clinician would blink at. */
export const MIN_KCAL_REST = 1200

/**
 * The deepest cut off maintenance the app will build a plan around.
 * Past this, weight comes off faster for a few weeks and comes back
 * with less muscle underneath it than it left with.
 */
export const MAX_DEFICIT = 0.25

/** How far a rest day sits under a training day. */
export const REST_DAY_DROP = 300

/**
 * Both daily targets, floored.
 *
 * `maintenance` is this athlete's own estimated maintenance (the
 * bodyweight baseline before any goal adjustment), which is what makes
 * the proportional rule personal rather than one more fixed number.
 */
export function flooredTargets(
  kcalTraining: number,
  maintenance: number,
): { kcalTraining: number; kcalRest: number } {
  const floor = Math.max(MIN_KCAL_TRAINING, Math.round(maintenance * (1 - MAX_DEFICIT)))
  const training = Math.max(kcalTraining, floor)
  return {
    kcalTraining: training,
    kcalRest: Math.max(training - REST_DAY_DROP, MIN_KCAL_REST),
  }
}

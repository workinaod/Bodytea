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

/**
 * How far a rest day sits under a training day, when nobody says.
 *
 * Kept as the fallback only. The real swing is this athlete's own session
 * cost, computed by restDaySwing in plan/bmr.ts, and 300 happens to be
 * what that rule returns for an 86 kg body lifting for an hour. Callers
 * that know the body pass their own number.
 */
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
  restDrop: number = REST_DAY_DROP,
): { kcalTraining: number; kcalRest: number } {
  const floor = Math.max(MIN_KCAL_TRAINING, Math.round(maintenance * (1 - MAX_DEFICIT)))
  const training = Math.max(kcalTraining, floor)
  return {
    kcalTraining: training,
    // This clamp used to be unreachable, and the comment here said it
    // would go live the moment the drop widened past 300. That is exactly
    // what happened: the drop is now the athlete's own session cost and
    // tops out at 400, so a floored 1,500 training day minus 400 is 1,100
    // and this line is the only thing standing between a small athlete
    // and a rest target no clinician would sign off on.
    //
    // It is load-bearing now. The test that pinned it as redundant has
    // been rewritten to assert it binds.
    kcalRest: Math.max(training - restDrop, MIN_KCAL_REST),
  }
}

/**
 * v19 to v20: repair calorie targets generated before there was a floor.
 *
 * Lives here rather than in schema.ts because it is the floors that
 * decide what a repair means, and schema.ts should read as a list of
 * what an app data file holds. It is delegated to from the migrations
 * record, the same way the supplement stack repair is.
 *
 * Maintenance is not recoverable from a stored plan, so this applies the
 * absolute minimums only. That is the part that matters: a plan built by
 * the unfloored bring-your-own-routine path still carries what it was
 * given, 1,400/1,100 for a 120 lb athlete on a cut and 950/650 at 90 lb,
 * because a target is written into a booklet ONCE at onboarding and read
 * forever after. Fixing a generator does nothing for a plan on disk.
 */
export function migrateCalorieFloor(env: Record<string, unknown>): Record<string, unknown> {
  const e = env as unknown as {
    data?: { plan?: { nutrition?: { kcalTraining?: number; kcalRest?: number } } }
  }
  const n = e.data?.plan?.nutrition
  if (n) {
    if (typeof n.kcalTraining === 'number') n.kcalTraining = Math.max(MIN_KCAL_TRAINING, n.kcalTraining)
    if (typeof n.kcalRest === 'number') n.kcalRest = Math.max(MIN_KCAL_REST, n.kcalRest)
  }
  return env
}

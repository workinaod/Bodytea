// ============================================================
// The two calorie numbers, and where they came from.
//
// Split out of types.ts the way resolvedTypes, sessionTypes and
// activityTypes were, so the shared type module does not grow every time
// the nutrition engine learns something new. types.ts re-exports both.
// ============================================================

/** What an athlete is asked to eat, per day, on each kind of day. */
export interface CalorieTargets {
  kcalTraining: number
  kcalRest: number
}

/**
 * The knowledge a stored CalorieTargets was last confirmed against.
 *
 * Kept beside the number because the app spent its whole life computing
 * calories once, at signup, and throwing the inputs away. That made two
 * different situations look identical: a target that is still right, and
 * a target sized for a body thirty pounds ago. With the inputs recorded,
 * engine/nutritionRecheck.ts can tell them apart and offer the better
 * number; without them it stays quiet rather than guessing.
 *
 * Not only what first built the number: declining a suggested change
 * keeps the number and stamps today's inputs here, so the app goes quiet
 * until something moves again rather than through the next forty pounds.
 *
 * Optional on the plan, and absence is load-bearing. Plans built before
 * this existed do not carry one, and typing a target into the booklet
 * editor CLEARS it. Either way the meaning is the same: a human owns this
 * number, do not recheck it.
 */
export interface NutritionBasis extends Partial<KnownBody> {
  bodyweightLb: number
  /** Which of the three models answered: see plan/bmr.ts. */
  model: 'katch-mcardle' | 'mifflin-st-jeor' | 'bodyweight'
}

/** The optional half: what the app may or may not know about a body. */
interface KnownBody {
  ageYears: number
  bodyFatPct: number
  /** Completed sessions per week, not planned ones. */
  sessionsPerWeek: number
}

// ============================================================
// The person, as opposed to the plan.
//
// Split out of types.ts because this shape keeps growing: height, then
// the tape formula, then age, each added by a different job, and every
// one of them pushed the shared type module closer to its cap. Its zod
// twin already lives apart too, in store/settingsSchema.ts.
// ============================================================

export interface Profile {
  displayName?: string
  /** Cached leaderboard username (set when an account exists). */
  username?: string
  /** For the tape-measure body-fat estimate (US Navy method). */
  heightIn?: number
  /** Which Navy formula fits their body, asked once in the estimator. */
  bfFormula?: 'male' | 'female'
  age?: number // Years. The one number this app states a minimum of: onboarding/MeStep.tsx
}

import { z } from 'zod'

// ============================================================
// The stored shape of a calorie target and its provenance.
//
// Beside mealPlanSchema and settingsSchema rather than inside schema.ts,
// which is at its cap and is the file every other shape also wants to
// grow into. The types these mirror live in src/nutritionTypes.ts.
// ============================================================

export const calorieTargetsSchema = z.object({
  kcalTraining: z.number().positive(),
  kcalRest: z.number().positive(),
})

/**
 * Optional on the plan, and no migration for the same reason: an
 * envelope written before this existed still parses, and a plan without
 * a basis simply never gets a calorie recheck. Silence is the safe
 * default when the app cannot say what a number was built from.
 */
export const nutritionBasisSchema = z.object({
  bodyweightLb: z.number().positive(),
  model: z.enum(['katch-mcardle', 'mifflin-st-jeor', 'bodyweight']),
  ageYears: z.number().positive().optional(),
  bodyFatPct: z.number().positive().optional(),
  sessionsPerWeek: z.number().nonnegative().optional(),
})

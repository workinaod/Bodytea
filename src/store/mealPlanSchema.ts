import { z } from 'zod'

// ============================================================
// The eating half of the booklet, on disk. Split out of schema.ts
// beside sessionSchema and prefsSchema, for the same reason: the
// envelope file should read as a list of what an app data file holds,
// not as the field-by-field definition of each part.
// ============================================================

export const mealPlanSchema = z.object({
  templates: z.array(
    z.object({
      id: z.string(),
      dayType: z.enum(['training', 'rest']),
      slot: z.string(),
      name: z.string().min(1),
      detail: z.string(),
      proteinG: z.number().min(0),
      kcal: z.number().min(0),
    }),
  ),
  grocery: z.array(z.object({ category: z.string(), items: z.array(z.string()) })),
  supplements: z.array(
    z.object({ id: z.string(), name: z.string().min(1), dose: z.string(), when: z.string() }),
  ),
  lateNight: z.object({ yes: z.array(z.string()), no: z.array(z.string()) }),
})

/**
 * What the athlete cannot eat. Both fields optional and the whole object
 * optional, so a plan written before this shipped still parses: somebody
 * who has never been asked has no limits, which is different from having
 * declared none, but they eat the same meals either way.
 *
 * The allergy string is stored raw. Normalising it here would mean
 * deciding at write time what a word means, and the whole point of
 * plan/foodLimits.ts is that the decision is an exclusion made fresh
 * every time we offer food.
 */
export const foodLimitsSchema = z.object({
  dairyFree: z.boolean().optional(),
  allergies: z.string().optional(),
})

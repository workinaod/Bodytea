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
    z.object({
      id: z.string(),
      source: z.enum(['app', 'user']),
      name: z.string().optional(),
      dose: z.string().optional(),
      when: z.string().optional(),
      addedAt: z.string().optional(),
    }),
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

// ============================================================
// v20 to v21: a stack stops storing doses and starts storing ids.
//
// This is the same failure the v19 to v20 calorie repair fixed, in a
// place with a sharper edge. A dose was written into somebody's booklet
// ONCE, at onboarding, and read forever after. So the corrections made
// in W5, magnesium's range brought under its 350 mg upper limit, vitamin
// D taken off its own ceiling, zinc withdrawn for having no supportable
// claim, reached the catalog and reached NOBODY who had already signed
// up. Their screen still says 400 mg. Fixing a generator does nothing
// for a plan already on disk.
//
// After this, an app-suggested item is an id and nothing else. Its dose
// and timing are read from the catalog at render time, so the next
// correction ships to everybody on the next deploy with no migration at
// all. That property is the whole reason for the shape.
// ============================================================

/** Advice the app no longer stands behind. R16 section 3.9. */
const RETRACTED = new Set(['zinc'])

/** Ids owned by plan/supplements.ts. Kept here, deliberately, as a
 *  literal: a migration must read the same on the day it is written and
 *  five years later, and importing a live table would let a future
 *  catalog edit silently change what an old envelope becomes. */
const CATALOG_IDS = new Set([
  'creatine', 'caffeine', 'electrolytes', 'vitD3',
  'fishOil', 'multivitamin', 'magnesium', 'collagen',
])

export function migrateSupplementStack(env: Record<string, unknown>): Record<string, unknown> {
  const e = env as unknown as { data?: { plan?: { mealPlan?: { supplements?: unknown[] } } } }
  const list = e.data?.plan?.mealPlan?.supplements
  if (!Array.isArray(list)) return env
  e.data!.plan!.mealPlan!.supplements = list.flatMap((raw) => {
    const s = raw as { id?: string; source?: string; name?: string; dose?: string; when?: string }
    if (typeof s?.id !== 'string') return []
    // Already migrated. Re-running must not turn somebody's own entry
    // into an app suggestion, or the reverse.
    if (s.source === 'app' || s.source === 'user') return [s]
    // Withdrawn rather than left on disk, exactly as the v19 calorie
    // floor was repaired instead of grandfathered. Anybody who genuinely
    // wants it can add it back, at which point it becomes theirs.
    if (RETRACTED.has(s.id)) return []
    // An app suggestion becomes an id. Dose and timing now come from the
    // catalog, so future corrections reach this user for free.
    if (CATALOG_IDS.has(s.id)) return [{ id: s.id, source: 'app' }]
    // Anything they typed themselves is kept verbatim. The app does not
    // edit a person's own record of what they take. The ', ' repair is
    // for a bug in the old sheet that joined two empty fields.
    return [{
      id: s.id,
      source: 'user',
      name: s.name ?? s.id,
      dose: s.dose === ', ' ? '' : s.dose,
      when: s.when,
    }]
    // addedAt is deliberately absent: there is no true value for a row
    // that predates the field, and inventing "today" would be a lie the
    // rest of the app would then read as fact.
  })
  return env
}

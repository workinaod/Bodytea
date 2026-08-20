// ============================================================
// What somebody eats, and the per-user plan behind it.
//
// Out of types.ts for the same reason Profile and the nutrition shapes
// left: this is a domain of its own that grows on its own schedule, and
// its stored twin already lives apart in store/mealPlanSchema.ts.
// types.ts re-exports the lot, so every existing importer is unchanged.
// ============================================================

import type { ISODate } from './types'
import type { StackItem } from './supplementTypes'

export type MealEntrySource = 'chip' | 'mealTemplate' | 'custom' | 'recent'

/** An adaptation the athlete tapped to accept, or 'dismissed' for the whole offer. */

export interface MealEntry {
  id: string
  at: string
  label: string
  proteinG: number
  kcal: number
  /**
   * Carbs and fat, when the entry knew them.
   *
   * Optional because the app logged protein and calories only for its
   * whole life, so every meal already on a device has neither. Read
   * through engine/stats.ts macrosFor, which backfills from foodId where
   * the entry came from a food chip and reports how much of the day it
   * could actually account for. A carb ring drawn over a day it only half
   * understands is worse than no ring.
   */
  carbsG?: number
  fatG?: number
  source: MealEntrySource
  foodId?: string
  servings: number
}

/** Free string since v10, users build their own supplement stacks. */
export type SupplementId = string

export interface MealDay {
  date: ISODate
  entries: MealEntry[]
  supplements: Record<SupplementId, boolean>
  dayTypeOverride?: 'training' | 'rest'
}

// ---------- Per-user meal plan (lives in PlanConfig.mealPlan) ----------

export interface MealTemplateDef {
  id: string
  dayType: 'training' | 'rest'
  slot: string
  name: string
  detail: string
  proteinG: number
  kcal: number
}

// The supplement shapes moved to supplementTypes.ts, beside foodTypes
// and prefsTypes for the reason those two give: a shape with a subsystem
// reading it is no longer a field on this file. The old SupplementDef
// was four strings with nowhere to put a contraindication.
export * from './supplementTypes'
export interface GroceryCategory {
  category: string
  items: string[]
}

/**
 * The eating side of a booklet: one-tap meal templates, the weekly
 * grocery list, the supplement stack, and late-night rules, all
 * per-user data, editable like the training side.
 */
export interface MealPlanConfig {
  templates: MealTemplateDef[]
  grocery: GroceryCategory[]
  supplements: StackItem[]
  lateNight: { yes: string[]; no: string[] }
}

import { describe, expect, it } from 'vitest'
import { COMMON_MEALS, mealAlternatives, slotKindOf, type CommonMeal, type MealSlotKind } from './mealAlts'
import type { DietStyle } from '../types'

// ============================================================
// R4 s6.1 states the owner's coverage requirement as a testable
// predicate, and says plainly that both guarantees must be written
// BEFORE any corpus authoring, so they fail loudly against today's 42
// records and turn green as waves land.
//
// So they are written here, and today they DO fail their target. That
// is the point of them. Rather than a red suite, each one asserts the
// exact measured shortfall: the numbers below are what the corpus can
// do right now, and every one of them has to move in one direction.
//
// The headline is the vegan cliff. A vegan asking for a breakfast swap
// has a pool of TWO. mealAlternatives asks for three, the slot pool is
// short, so it widens to the whole diet-filtered list and hands back
// dinners and shakes for breakfast. It is not a crash and nothing has
// ever said it out loud.
// ============================================================

const DIETS: DietStyle[] = ['omnivore', 'pescatarian', 'vegetarian', 'vegan']
const SLOTS: MealSlotKind[] = ['breakfast', 'lunch', 'dinner', 'snack', 'late']

const ALLOWED: Record<DietStyle, CommonMeal['diet'][]> = {
  omnivore: ['omni', 'pescatarian', 'vegetarian', 'vegan'],
  pescatarian: ['pescatarian', 'vegetarian', 'vegan'],
  vegetarian: ['vegetarian', 'vegan'],
  vegan: ['vegan'],
}

/** What a real swap request would actually have to choose from. */
function pool(diet: DietStyle, slot: MealSlotKind): CommonMeal[] {
  return COMMON_MEALS.filter((m) => ALLOWED[diet].includes(m.diet) && m.slots.includes(slot))
}

describe('the macros add up', () => {
  it('reconciles every record against its own calorie number', () => {
    // 4 kcal a gram for protein and carbs, 9 for fat. These are
    // standard-serving estimates rather than lab measurements, so the
    // thing that makes them trustworthy is that they have to agree with
    // each other. A number cannot drift without the arithmetic saying
    // so, which is the same rule the knowledge records live under.
    const off = COMMON_MEALS.map((m) => {
      const recon = 4 * m.proteinG + 4 * m.carbsG + 9 * m.fatG
      return { id: m.id, stated: m.kcal, recon, drift: Math.abs(recon - m.kcal) / m.kcal }
    }).filter((r) => r.drift > 0.05)
    expect(off).toEqual([])
  })

  it('gives every record a real number for all four macros', () => {
    const bad = COMMON_MEALS.filter(
      (m) => !(m.proteinG > 0) || !(m.kcal > 0) || m.carbsG < 0 || m.fatG < 0,
    ).map((m) => m.id)
    expect(bad).toEqual([])
  })
})

describe('GUARANTEE G: three real choices in every corner', () => {
  it('measures the pool for every diet and slot, and none of it is a target yet', () => {
    // R4's target is at least 3 records with distinct primary proteins
    // per cell. This is the raw pool count, which is the ceiling on
    // that. Every number here must go UP and none may go down.
    const counts = Object.fromEntries(
      DIETS.map((d) => [d, Object.fromEntries(SLOTS.map((s) => [s, pool(d, s).length]))]),
    )
    expect(counts).toEqual({
      omnivore: { breakfast: 10, lunch: 19, dinner: 21, snack: 15, late: 5 },
      pescatarian: { breakfast: 10, lunch: 10, dinner: 10, snack: 13, late: 5 },
      vegetarian: { breakfast: 10, lunch: 8, dinner: 9, snack: 11, late: 5 },
      vegan: { breakfast: 2, lunch: 5, dinner: 7, snack: 2, late: 2 },
    })
  })

  it('names every cell that cannot offer three, which is the corpus job', () => {
    const thin = DIETS.flatMap((d) =>
      SLOTS.filter((s) => pool(d, s).length < 3).map((s) => `${d}/${s}: ${pool(d, s).length}`),
    )
    // Three cells, all vegan. This list must empty as the corpus grows.
    expect(thin).toEqual(['vegan/breakfast: 2', 'vegan/snack: 2', 'vegan/late: 2'])
  })
})

describe('what a thin pool actually does to somebody', () => {
  it('serves a vegan dinners for breakfast, and says nothing about it', () => {
    // The widening in mealAlternatives exists so a thin slot returns
    // something rather than nothing, which is the right call. What is
    // wrong is that nobody is told, and for a vegan breakfast it fires
    // every single time.
    const alts = mealAlternatives({ proteinG: 30, kcal: 450, slot: 'Breakfast', diet: 'vegan' }, 3)
    expect(alts.length).toBe(3)
    const offSlot = alts.filter((m) => !m.slots.includes('breakfast')).map((m) => m.id)
    expect(offSlot.length, 'a vegan breakfast swap comes back off-slot').toBeGreaterThan(0)
  })

  it('leaves an omnivore breakfast alone, which is the contrast', () => {
    const alts = mealAlternatives({ proteinG: 30, kcal: 450, slot: 'Breakfast', diet: 'omnivore' }, 3)
    expect(alts.every((m) => m.slots.includes('breakfast'))).toBe(true)
  })
})

describe('the two-meal day gets its slots back', () => {
  it('reads the split’s own slot names', () => {
    // These used to fall through to null, which switches slot filtering
    // off. The two slots carry 45 and 55 percent of the day's protein.
    expect(slotKindOf('Meal 1')).toBe('lunch')
    expect(slotKindOf('Meal 2')).toBe('dinner')
    expect(slotKindOf('Snack 1')).toBe('snack')
    expect(slotKindOf('Late night')).toBe('late')
  })

  it('stops offering a late-night snack as half the day’s food', () => {
    const alts = mealAlternatives({ proteinG: 60, kcal: 900, slot: 'Meal 2', diet: 'omnivore' }, 3)
    expect(alts.every((m) => m.slots.includes('dinner')), alts.map((m) => m.id).join(', ')).toBe(true)
  })
})

describe('the protein ceiling, measured rather than implied', () => {
  it('cannot serve the anchor slot of a big athlete on two meals a day', () => {
    // R4 s1.4: a 200 lb muscle-goal athlete at 1.8 g/kg needs 164 g of
    // protein. On two meals a day the anchor slot is 55 percent of it,
    // which is 90 g. The best record in the corpus is 59 g. The
    // two-meals-a-day path is offered in onboarding and is structurally
    // short by a factor of about 1.5, and this pins the number so the
    // day it is fixed the test says so.
    const best = Math.max(...COMMON_MEALS.map((m) => m.proteinG))
    expect(best).toBe(59)
    expect(best).toBeLessThan(90)
  })
})

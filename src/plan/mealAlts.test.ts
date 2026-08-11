import { describe, expect, it } from 'vitest'
import { COMMON_MEALS, mealAlternatives, slotKindOf } from './mealAlts'

describe('common-meals library', () => {
  it('every meal is complete: unique id, ≥2 household ingredients, real macros, ≥1 slot', () => {
    const ids = new Set<string>()
    for (const m of COMMON_MEALS) {
      expect(ids.has(m.id), `dup id ${m.id}`).toBe(false)
      ids.add(m.id)
      expect(m.ingredients.length, m.id).toBeGreaterThanOrEqual(2)
      expect(m.proteinG, m.id).toBeGreaterThan(0)
      expect(m.kcal, m.id).toBeGreaterThan(100)
      expect(m.slots.length, m.id).toBeGreaterThanOrEqual(1)
    }
  })

  it('covers every slot kind with at least 3 options (so pickers never run dry)', () => {
    for (const kind of ['breakfast', 'lunch', 'dinner', 'snack'] as const) {
      expect(COMMON_MEALS.filter((m) => m.slots.includes(kind)).length).toBeGreaterThanOrEqual(3)
    }
  })
})

describe('slotKindOf', () => {
  it('maps the app’s slot labels onto kinds', () => {
    expect(slotKindOf('Breakfast')).toBe('breakfast')
    expect(slotKindOf('Lunch')).toBe('lunch')
    expect(slotKindOf('Dinner')).toBe('dinner')
    expect(slotKindOf('Late night')).toBe('late')
    expect(slotKindOf('Pre / Post')).toBe('snack')
    expect(slotKindOf('Snack')).toBe('snack')
    expect(slotKindOf('Meal 3')).toBeNull()
  })
})

describe('mealAlternatives', () => {
  it('returns slot-appropriate meals sorted by macro closeness', () => {
    const alts = mealAlternatives({ proteinG: 45, kcal: 550, slot: 'Dinner' })
    expect(alts).toHaveLength(3)
    for (const a of alts) expect(a.slots).toContain('dinner')
    // The closest dinner to 45P/550 should be genuinely close on protein
    expect(Math.abs(alts[0].proteinG - 45)).toBeLessThanOrEqual(5)
    expect(Math.abs(alts[0].kcal - 550)).toBeLessThanOrEqual(80)
  })

  it('breakfast targets get breakfasts', () => {
    const alts = mealAlternatives({ proteinG: 30, kcal: 450, slot: 'Breakfast' })
    for (const a of alts) expect(a.slots).toContain('breakfast')
  })

  it('excludes the meal it is replacing', () => {
    const alts = mealAlternatives({ proteinG: 47, kcal: 590, slot: 'Dinner', excludeName: 'Chicken & rice' })
    expect(alts.some((a) => a.name === 'Chicken & rice')).toBe(false)
  })

  it('widens past a thin slot pool instead of returning short', () => {
    const alts = mealAlternatives({ proteinG: 30, kcal: 300, slot: 'Late night' })
    expect(alts).toHaveLength(3)
  })

  it('unmapped slots search the whole library', () => {
    const alts = mealAlternatives({ proteinG: 40, kcal: 500, slot: 'Meal 2' })
    expect(alts).toHaveLength(3)
  })

  it('is deterministic', () => {
    const a = mealAlternatives({ proteinG: 40, kcal: 500 })
    const b = mealAlternatives({ proteinG: 40, kcal: 500 })
    expect(a.map((x) => x.id)).toEqual(b.map((x) => x.id))
  })
})

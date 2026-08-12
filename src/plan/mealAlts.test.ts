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

describe('diet-aware alternatives', () => {
  it('vegan targets get only vegan meals, even after slot-pool widening', () => {
    for (const slot of ['Breakfast', 'Dinner', 'Late night', 'Snack']) {
      const alts = mealAlternatives({ proteinG: 35, kcal: 550, slot, diet: 'vegan' })
      expect(alts.length).toBeGreaterThan(0)
      for (const a of alts) expect(a.diet, `${slot}: ${a.name}`).toBe('vegan')
    }
  })

  it('vegetarian excludes meat/fish but keeps eggs and dairy', () => {
    const alts = mealAlternatives({ proteinG: 40, kcal: 550, slot: 'Dinner', diet: 'vegetarian' })
    expect(alts.length).toBeGreaterThan(0)
    for (const a of alts) expect(a.diet).not.toBe('omni')
  })

  it('omnivore (and no diet) searches everything', () => {
    const a = mealAlternatives({ proteinG: 45, kcal: 550, slot: 'Dinner', diet: 'omnivore' })
    const b = mealAlternatives({ proteinG: 45, kcal: 550, slot: 'Dinner' })
    expect(a.map((x) => x.id)).toEqual(b.map((x) => x.id))
  })

  it('the library carries real vegan coverage for mains', () => {
    expect(COMMON_MEALS.filter((m) => m.diet === 'vegan' && (m.slots.includes('dinner') || m.slots.includes('lunch'))).length).toBeGreaterThanOrEqual(5)
  })
})

// ============================================================
// COMMON_MEALS is a hand-written table, and its header promises
// it stays "consistent with plan/foods.ts". Nothing enforced
// that, and the drift ran the same direction as the bug in
// foods.ts itself: 6 oz of chicken breast is ~52 g of protein,
// and three of these meals were built as if it were ~36.
//
// These are invariants rather than spot values, so adding a meal
// is still one line and a wrong line still fails.
// ============================================================

const MEAT = /\b(chicken|beef|pork|turkey|tuna|salmon|steak|bacon|ham|shrimp|fish|jerky)\b/i
const ANIMAL = /\b(egg|eggs|cheese|yogurt|milk|butter|whey|casein|mayo)\b/i
/** Plant versions borrow the dairy word, so they come out before the check. */
const PLANT_DAIRY = /\b(soy|almond|oat|coconut|rice|cashew)\s+(milk|yogurt|butter)\b|\bpeanut butter\b|\bnut butter\b|\bnutritional yeast\b/gi

describe('the meal table stays physically possible', () => {
  it('never claims more protein than the meal has calories to carry', () => {
    for (const m of COMMON_MEALS) {
      // 4 kcal/g of protein, and protein cannot be the whole plate: past
      // ~62% something has been double-counted or a serving misread.
      const share = (m.proteinG * 4) / m.kcal
      expect(share, `${m.id} is ${Math.round(share * 100)}% protein by calories`).toBeLessThan(0.62)
      expect(share, `${m.id}`).toBeGreaterThan(0.05)
    }
  })

  it('has unique ids, real ingredients and at least one slot', () => {
    const ids = COMMON_MEALS.map((m) => m.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const m of COMMON_MEALS) {
      expect(m.ingredients.length, m.id).toBeGreaterThan(0)
      expect(m.slots.length, m.id).toBeGreaterThan(0)
      expect(m.kcal, m.id).toBeGreaterThan(0)
      expect(m.proteinG, m.id).toBeGreaterThan(0)
    }
  })

  /**
   * The one that actually reaches a user as a broken promise: a vegan
   * asking for a swap and being handed chicken. The diet tag is what the
   * filter trusts, so the tag has to match the ingredient list.
   */
  it('no vegan or vegetarian meal lists something it excludes', () => {
    for (const m of COMMON_MEALS) {
      const text = `${m.name} ${m.ingredients.join(' ')}`
      const plantSafe = text.replace(PLANT_DAIRY, ' ')
      if (m.diet === 'vegan' || m.diet === 'vegetarian') {
        expect(MEAT.test(text), `${m.id} is tagged ${m.diet} but lists meat: ${text}`).toBe(false)
      }
      if (m.diet === 'vegan') {
        expect(ANIMAL.test(plantSafe), `${m.id} is tagged vegan but lists animal product: ${text}`).toBe(false)
      }
    }
  })
})

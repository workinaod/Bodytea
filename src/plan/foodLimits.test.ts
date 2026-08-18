import { describe, expect, it } from 'vitest'
import { allergyTerms, allowedByLimits, blockedBy, forbiddenTerms } from './foodLimits'
import { COMMON_MEALS, mealAlternatives } from './mealAlts'
import { buildMealPlan } from './foods'
import { generatePlan } from './generator'
import type { OnboardingAnswers } from './generator'

const meal = (id: string) => COMMON_MEALS.find((m) => m.id === id)!

describe('allergyTerms', () => {
  it('splits the ways people actually type a list', () => {
    expect(allergyTerms('peanuts, shellfish and soy')).toEqual(['peanuts', 'shellfish', 'soy'])
    expect(allergyTerms('Tree nuts / sesame')).toEqual(['tree nuts', 'sesame'])
  })

  it('drops fragments too short to mean anything', () => {
    // A two-letter token matches half the dictionary, so "x" or a stray
    // "a" would empty the whole meal list on a typo.
    expect(allergyTerms('a, no, eggs')).toEqual(['eggs'])
  })

  it('is empty for somebody who never answered', () => {
    expect(allergyTerms(undefined)).toEqual([])
    expect(allergyTerms('   ')).toEqual([])
  })
})

describe('forbiddenTerms', () => {
  it('expands a family, and keeps the typed word too', () => {
    const terms = forbiddenTerms({ allergies: 'nuts' })
    expect(terms).toContain('nuts')
    expect(terms).toContain('almond')
    expect(terms).toContain('cashew')
  })

  it('turns the dairy-free tap into every word dairy is written as', () => {
    const terms = forbiddenTerms({ dairyFree: true })
    for (const w of ['milk', 'cheese', 'yogurt', 'butter', 'cream', 'whey']) {
      expect(terms).toContain(w)
    }
  })

  it('keeps a word it does not recognise, rather than dropping it', () => {
    // This is the whole safety posture: an unknown term must still
    // exclude by raw substring. Dropping it is what silently poisons.
    expect(forbiddenTerms({ allergies: 'mango' })).toContain('mango')
  })

  it('is empty when nothing was declared', () => {
    expect(forbiddenTerms(undefined)).toEqual([])
    expect(forbiddenTerms({ dairyFree: false })).toEqual([])
  })
})

describe('blockedBy', () => {
  it('names the term that ruled the meal out', () => {
    expect(blockedBy(meal('yogurt-bowl'), { dairyFree: true })).toBe('yogurt')
    expect(blockedBy(meal('pb-banana-toast'), { allergies: 'peanuts' })).toBe('peanut')
  })

  it('reads the ingredients, not just the name', () => {
    // "Breakfast burrito" says nothing about cheese. The shredded cheese
    // inside it is the whole reason a name-only check would poison people.
    expect(blockedBy(meal('breakfast-burrito'), { dairyFree: true })).toBe('cheese')
  })

  it("reports the athlete's own word ahead of the family we expanded it to", () => {
    // They typed "eggs"; telling them "egg" would read as a correction.
    expect(blockedBy(meal('egg-fried-rice'), { allergies: 'eggs' })).toBe('eggs')
  })

  it('returns null when nothing applies', () => {
    expect(blockedBy(meal('chicken-rice'), { allergies: 'shellfish' })).toBeNull()
    expect(blockedBy(meal('chicken-rice'), undefined)).toBeNull()
  })
})

describe('the two cases this module was written for', () => {
  it('never offers a Greek yogurt bowl to somebody who tapped dairy-free', () => {
    const limits = { dairyFree: true, allergies: 'peanuts' }
    for (const slot of ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Late night', 'Meal 2']) {
      const alts = mealAlternatives({ proteinG: 28, kcal: 460, slot, limits })
      expect(alts.map((a) => a.id)).not.toContain('yogurt-bowl')
      for (const a of alts) expect(blockedBy(a, limits)).toBeNull()
    }
  })

  it('never offers peanut butter to somebody who typed a nut allergy', () => {
    const limits = { allergies: 'nuts' }
    const alts = mealAlternatives({ proteinG: 25, kcal: 630, slot: 'Breakfast', limits })
    for (const a of alts) expect(a.ingredients.join(' ')).not.toMatch(/peanut|almond|cashew/i)
  })
})

describe('the widening cannot reintroduce an allergen', () => {
  it('holds even on a slot so thin the pool relaxes to the whole list', () => {
    // 'Late night' has few meals, which is exactly when mealAlternatives
    // drops the slot filter. That relaxation must not outrank the limit.
    const limits = { dairyFree: true }
    const alts = mealAlternatives({ proteinG: 30, kcal: 300, slot: 'Late night', limits }, 5)
    expect(alts.length).toBeGreaterThan(0)
    for (const a of alts) expect(blockedBy(a, limits)).toBeNull()
  })

  it('returns nothing rather than something wrong', () => {
    // Somebody allergic to everything we stock gets an empty list. No
    // meal is better than the wrong meal, and the number still stands.
    const limits = { allergies: 'rice, bread, egg, chicken, beef, tofu, beans, oats, tuna, salmon, pork, turkey, cheese, milk, yogurt, protein, peanut, lentil, chickpea, noodle, pasta, tempeh, edamame, potato, crackers, cereal, tortilla, jerky, mac' }
    expect(mealAlternatives({ proteinG: 40, kcal: 500, slot: 'Dinner', limits }, 3)).toEqual([])
  })
})

describe('allowedByLimits', () => {
  it('returns the same array identity when there is nothing to filter', () => {
    const all = [...COMMON_MEALS]
    expect(allowedByLimits(all, undefined)).toBe(all)
  })

  it('filters and keeps the rest', () => {
    const kept = allowedByLimits(COMMON_MEALS, { dairyFree: true })
    expect(kept.length).toBeGreaterThan(0)
    expect(kept.length).toBeLessThan(COMMON_MEALS.length)
    for (const m of kept) expect(blockedBy(m, { dairyFree: true })).toBeNull()
  })
})

describe('the generated plan itself', () => {
  const answers = (foodLimits: OnboardingAnswers['foodLimits']): OnboardingAnswers => ({
    goal: 'muscle',
    goalStatement: 'Put on size',
    customTargets: [],
    daysPerWeek: 4,
    equipProfile: 'gym',
    extraEquip: [],
    experience: 'returning',
    bodyweightLb: 180,
    mealsPerDay: 4,
    foodLimits,
  })

  it('carries the limits onto the plan, where every later screen reads them', () => {
    const { plan } = generatePlan(answers({ dairyFree: true, allergies: 'peanuts' }))
    expect(plan.foodLimits).toEqual({ dairyFree: true, allergies: 'peanuts' })
  })

  it('writes no meal example containing a declared allergen', () => {
    const limits = { dairyFree: true, allergies: 'peanuts' }
    const { plan } = generatePlan(answers(limits))
    const details = plan.mealPlan.templates.map((t) => t.detail).join(' | ')
    expect(details).not.toMatch(/yogurt|cheese|milk|butter|cream|peanut/i)
    // And it still said something useful for every meal.
    for (const t of plan.mealPlan.templates) expect(t.detail.length).toBeGreaterThan(10)
  })

  it('does not put a forbidden food on the shopping list either', () => {
    const mp = buildMealPlan('muscle', 170, { kcalTraining: 2800, kcalRest: 2600 }, 4, 'omnivore', {
      allergies: 'nuts',
    })
    const items = mp.grocery.flatMap((g) => g.items).join(' | ')
    expect(items).not.toMatch(/nut/i)
    expect(mp.grocery.every((g) => g.items.length > 0)).toBe(true)
  })

  it('leaves an athlete with no limits exactly where they were', () => {
    const withNone = generatePlan(answers(undefined)).plan
    const withEmpty = generatePlan(answers({ dairyFree: false })).plan
    expect(withEmpty.mealPlan).toEqual(withNone.mealPlan)
  })
})

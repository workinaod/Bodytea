import { describe, expect, it } from 'vitest'
import { buildMealPlan, FOODS, MEAL_TEMPLATES, type MealsPerDay } from './foods'

const NUTRITION = { kcalTraining: 3000, kcalRest: 2600 }

describe('buildMealPlan, coach-led eating styles', () => {
  it.each([[2], [3], [4], [5]] as [MealsPerDay][])(
    '%i meals/day: right count and the day still adds up to the targets',
    (n) => {
      const plan = buildMealPlan('muscle', 180, NUTRITION, n)
      for (const dt of ['training', 'rest'] as const) {
        const meals = plan.templates.filter((t) => t.dayType === dt)
        expect(meals).toHaveLength(n)
        const p = meals.reduce((a, t) => a + t.proteinG, 0)
        const k = meals.reduce((a, t) => a + t.kcal, 0)
        expect(Math.abs(p - 180), `${n}-meal ${dt} protein`).toBeLessThanOrEqual(5 * n)
        const budget = dt === 'training' ? NUTRITION.kcalTraining : NUTRITION.kcalRest
        expect(Math.abs(k - budget), `${n}-meal ${dt} kcal`).toBeLessThanOrEqual(25 * n)
      }
    },
  )

  it('fewer meals = bigger meals (a 2-meal day carries a ~100g-protein anchor)', () => {
    const two = buildMealPlan('muscle', 180, NUTRITION, 2)
    const five = buildMealPlan('muscle', 180, NUTRITION, 5)
    const maxTwo = Math.max(...two.templates.map((t) => t.proteinG))
    const maxFive = Math.max(...five.templates.map((t) => t.proteinG))
    expect(maxTwo).toBeGreaterThan(maxFive)
    expect(maxTwo).toBeGreaterThanOrEqual(95)
  })

  it('every generated meal carries a concrete common-grocery example', () => {
    for (const n of [2, 3, 4, 5] as const) {
      const plan = buildMealPlan('general', 160, NUTRITION, n)
      for (const t of plan.templates) {
        expect(t.detail, `${n}-meal ${t.slot}`).toMatch(/E\.g\. /)
        expect(t.detail.length, `${n}-meal ${t.slot}`).toBeGreaterThan(30)
      }
    }
  })

  it('default stays the 4-meal structure with a Breakfast slot', () => {
    const plan = buildMealPlan('vertical', 180, NUTRITION)
    expect(plan.templates.filter((t) => t.dayType === 'training')).toHaveLength(4)
    expect(plan.templates.some((t) => t.slot === 'Breakfast')).toBe(true)
  })

  it('lean goal appends the ceiling reminder', () => {
    const plan = buildMealPlan('lean', 160, { kcalTraining: 2400, kcalRest: 2100 }, 3)
    expect(plan.templates.every((t) => t.detail.includes('ceiling'))).toBe(true)
  })
})

describe('diet styles in generated meal plans', () => {
  const MEAT = /chicken|beef|steak|tuna|salmon|turkey|pork|jerky|rotisserie/i
  const ANIMAL = /egg|yogurt|cheese|milk(?!k)|whey|cottage/i

  it('vegan plans never suggest meat, fish, eggs, or dairy', () => {
    for (const n of [2, 3, 4, 5] as const) {
      const plan = buildMealPlan('muscle', 170, NUTRITION, n, 'vegan')
      for (const t of plan.templates) {
        expect(t.detail, `${n}-meal ${t.slot}: ${t.detail}`).not.toMatch(MEAT)
        // soy milk is fine, strip it before the dairy check
        expect(t.detail.replace(/soy milk/gi, ''), `${n}-meal ${t.slot}: ${t.detail}`).not.toMatch(ANIMAL)
      }
      expect(plan.grocery.find((g) => g.category === 'Protein')!.items.join(' ')).toMatch(/tofu/i)
      expect(plan.supplements.some((s) => /fish|collagen/i.test(s.name))).toBe(false)
    }
  })

  it('vegetarian plans never suggest meat or fish', () => {
    const plan = buildMealPlan('general', 160, NUTRITION, 4, 'vegetarian')
    for (const t of plan.templates) expect(t.detail, `${t.slot}: ${t.detail}`).not.toMatch(MEAT)
  })
})

// ============================================================
// The food library is DATA, and data rots quietly. Nothing here
// tests a function; these lock the numbers themselves, because a
// mistyped macro shows up as a wrong protein ring rather than as
// a crash, and nobody notices a ring that is 20% off.
// ============================================================

describe('food library data integrity', () => {
  /**
   * Every food carries protein/carb/fat AND a calorie count, and the two
   * are independent fields that have to agree. Atwater says 4/4/9, so the
   * macros reconstruct the calories — and where they do not, one of the
   * numbers is wrong. Chicken breast was the tell: 375 kcal with 8 g fat
   * is USDA's 8 oz cooked breast exactly, and USDA's protein for it is
   * 70 g, not the 55 the table claimed.
   *
   * The allowance is 15%. Fiber is the reason it is not tighter: it is
   * counted as a carb at 4 kcal/g and metabolizes closer to 2, so beans,
   * lentils and legume pasta legitimately read a little high.
   */
  it('macros reconstruct the stated calories, within a fiber allowance', () => {
    const off = FOODS.map((f) => {
      const fromMacros = 4 * f.proteinG + 4 * f.carbsG + 9 * f.fatG
      return { id: f.id, kcal: f.kcal, fromMacros, pct: Math.abs(f.kcal - fromMacros) / f.kcal }
    }).filter((x) => x.pct > 0.15)
    expect(off, off.map((x) => `${x.id}: ${x.kcal} kcal vs ${x.fromMacros} from macros`).join('; ')).toEqual([])
  })

  it('no food is missing a macro or priced at zero calories', () => {
    for (const f of FOODS) {
      expect(f.kcal, f.id).toBeGreaterThan(0)
      expect(f.proteinG, f.id).toBeGreaterThanOrEqual(0)
      expect(f.carbsG, f.id).toBeGreaterThanOrEqual(0)
      expect(f.fatG, f.id).toBeGreaterThanOrEqual(0)
      expect(f.serving.trim().length, f.id).toBeGreaterThan(0)
    }
  })

  it('food ids are unique, so a chip cannot log the wrong row', () => {
    const ids = FOODS.map((f) => f.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('the PDF meal templates add up to the day they advertise', () => {
    for (const [dayType, kcal, protein] of [
      ['training', 2800, 225],
      ['rest', 2300, 215],
    ] as const) {
      const day = MEAL_TEMPLATES.filter((t) => t.dayType === dayType)
      expect(day.reduce((a, t) => a + t.kcal, 0), `${dayType} kcal`).toBe(kcal)
      expect(day.reduce((a, t) => a + t.proteinG, 0), `${dayType} protein`).toBe(protein)
    }
  })
})

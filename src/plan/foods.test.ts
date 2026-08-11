import { describe, expect, it } from 'vitest'
import { buildMealPlan, type MealsPerDay } from './foods'

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

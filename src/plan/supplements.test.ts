import { describe, expect, it } from 'vitest'
import { SUPPLEMENT_CATALOG, buildMealPlan } from './foods'
import type { DietStyle } from '../types'

// ============================================================
// The stack is the one place the app comes closest to prescribing,
// so it is the one place a wrong line costs the most.
//
// R16 found nine defects in what ships today. These pin the ones with a
// single correct answer: an allergy the meal plan already honours and the
// stack ignored, a diet filter that named vegans and meant every
// vegetarian too, and two doses that asked for more than a published
// upper limit allows.
// ============================================================

const NUTRITION = { kcalTraining: 2800, kcalRest: 2600 }
const plan = (diet: DietStyle, limits?: { dairyFree?: boolean; allergies?: string }) =>
  buildMealPlan('muscle', 170, NUTRITION, 4, diet, limits)

describe('what the stack is made of', () => {
  it('never hands fish oil to somebody who declared a fish allergy', () => {
    // The same allergy kept them away from salmon on the screen above.
    const s = plan('omnivore', { allergies: 'fish' }).supplements
    expect(s.some((x) => /fish/i.test(x.name))).toBe(false)
    expect(s.length).toBeGreaterThan(0)
  })

  it('treats a shellfish allergy as reaching fish oil too', () => {
    // "shellfish" expands to the family, and fish oil is the one thing in
    // the stack that could carry it. Over-excluding costs a capsule.
    expect(plan('omnivore', { allergies: 'shellfish, seafood' }).supplements.some((x) => /fish/i.test(x.name))).toBe(
      false,
    )
  })

  it('keeps the stack for somebody whose allergy touches none of it', () => {
    const s = plan('omnivore', { allergies: 'peanuts' }).supplements
    expect(s.length).toBe(3)
  })

  it('still fills a stack when the first choices are ruled out', () => {
    // Ruling one out has to promote the next, not leave a short list.
    expect(plan('omnivore', { allergies: 'fish, beef' }).supplements.length).toBe(3)
  })
})

describe('who it is not for', () => {
  it('stops handing vegetarians fish oil and collagen', () => {
    // The check said `!== vegan`, so every vegetarian in the app got both.
    const s = plan('vegetarian').supplements
    expect(s.some((x) => /fish|collagen/i.test(x.name))).toBe(false)
  })

  it('still stops handing them to vegans', () => {
    expect(plan('vegan').supplements.some((x) => /fish|collagen/i.test(x.name))).toBe(false)
  })

  it('leaves fish oil available to a pescatarian, who eats fish', () => {
    // Excluding it here would be the opposite mistake: a worse stack for
    // no reason, which is how a plan stops feeling like it is for you.
    expect(SUPPLEMENT_CATALOG.some((x) => x.id === 'fishOil')).toBe(true)
    expect(plan('pescatarian').supplements.every((x) => x.name.length > 0)).toBe(true)
  })
})

describe('doses inside their published limits', () => {
  const find = (id: string) => SUPPLEMENT_CATALOG.find((s) => s.id === id)!

  it('keeps supplemental magnesium at or under the 350 mg upper limit', () => {
    // IOM 1997. The shipped line asked for up to 400.
    const top = Number(find('magnesium').dose.match(/(\d+)\s*mg/g)!.pop()!.replace(/\D/g, ''))
    expect(top).toBeLessThanOrEqual(350)
  })

  it('leaves headroom under the vitamin D limit rather than sitting on it', () => {
    // The adult UL is 4,000 IU. The shipped line asked for exactly that,
    // then put a multivitamin beside it, so the plan as written went over.
    const top = Number(find('vitD3').dose.match(/(\d+)\s*IU/)![1])
    expect(top).toBeLessThan(4000)
  })

  it('states the fish oil dose as the part that does the work', () => {
    // "1-2 g" of oil is not a dose. EPA and DHA are what was studied.
    expect(find('fishOil').dose).toMatch(/EPA/)
  })

  it('does not name the pre-workout category', () => {
    // Caffeine is well evidenced. The shelf it is sold on is the most
    // adulterated one in the shop, and naming it endorses it.
    expect(find('caffeine').name).not.toMatch(/pre-?workout/i)
  })

  it('gives every entry a dose and a time', () => {
    for (const s of SUPPLEMENT_CATALOG) {
      expect(s.dose.trim().length, s.id).toBeGreaterThan(0)
      expect(s.when.trim().length, s.id).toBeGreaterThan(0)
    }
  })
})

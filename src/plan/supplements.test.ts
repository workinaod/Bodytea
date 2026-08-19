import { describe, expect, it } from 'vitest'
import { buildMealPlan, offeredSupplements } from './foods'
import { SUPPLEMENT_CATALOG } from './supplements'
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
/**
 * The catalog now names things it will NEVER offer, with the reason,
 * so a count of the catalog is no longer a count of the shelf. These
 * tests count the shelf, which is what the athlete sees.
 */
const SHELF = SUPPLEMENT_CATALOG.filter((s) => s.appClass !== 'never').length
/** What this athlete would be OFFERED. The plan itself ships no stack. */
const plan = (diet: DietStyle, limits?: { dairyFree?: boolean; allergies?: string }) => ({
  supplements: offeredSupplements(diet, limits),
})

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

  it('keeps the offer for somebody whose allergy touches none of it', () => {
    expect(plan('omnivore', { allergies: 'peanuts' }).supplements.length).toBe(SHELF)
  })

  it('rules out only what the allergy actually reaches', () => {
    const s = plan('omnivore', { allergies: 'fish, beef' }).supplements
    expect(s.length).toBe(SHELF - 2)
    expect(s.some((x) => /fish|collagen/i.test(x.name))).toBe(false)
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
    expect(find('magnesium').dose.high).toBeLessThanOrEqual(350)
    // And the record now carries the limit it has to stay under.
    expect(find('magnesium').dose.upperLimit).toBe(350)
  })

  it('leaves headroom under the vitamin D limit rather than sitting on it', () => {
    // The adult UL is 4,000 IU. The shipped line asked for exactly that,
    // then put a multivitamin beside it, so the plan as written went over.
    expect(find('vitD3').dose.high).toBeLessThan(find('vitD3').dose.upperLimit!)
    expect(find('vitD3').dose.upperLimit).toBe(4000)
  })

  it('states the fish oil dose as the part that does the work', () => {
    // "1-2 g" of oil is not a dose. EPA and DHA are what was studied.
    expect(find('fishOil').dose.display).toMatch(/EPA/)
  })

  it('never offers zinc, to anybody, under any diet', () => {
    // It used to be deleted from the catalog. It is now IN the catalog
    // classed 'never', with the reason attached, which is a stronger
    // position than forgetting it existed: the next session that thinks
    // of adding it finds the argument rather than an empty space.
    const zinc = SUPPLEMENT_CATALOG.find((s) => s.id === 'zinc')
    expect(zinc?.appClass).toBe('never')
    expect(zinc?.hedge, 'a never row has to say why').toBeTruthy()
    for (const diet of ['omnivore', 'pescatarian', 'vegetarian', 'vegan'] as DietStyle[]) {
      expect(offeredSupplements(diet).some((s) => s.id === 'zinc'), diet).toBe(false)
    }
  })

  it('offers nothing else it has classed never either', () => {
    // The whole point of naming them: BCAAs, testosterone boosters and
    // fat burners are the three a future session is most likely to add.
    const never = SUPPLEMENT_CATALOG.filter((s) => s.appClass === 'never').map((s) => s.id)
    expect(never.length).toBeGreaterThan(2)
    const offered = offeredSupplements('omnivore').map((s) => s.id)
    expect(never.filter((id) => offered.includes(id))).toEqual([])
  })

  it('does not name the pre-workout category', () => {
    // Caffeine is well evidenced. The shelf it is sold on is the most
    // adulterated one in the shop, and naming it endorses it.
    expect(find('caffeine').name).not.toMatch(/pre-?workout/i)
  })

  it('gives every offered entry a dose, a time and a source', () => {
    for (const s of SUPPLEMENT_CATALOG) {
      expect(s.dose.display.trim().length, s.id).toBeGreaterThan(0)
      expect(s.sourceRefs.length, `${s.id} cites nothing`).toBeGreaterThan(0)
      if (s.appClass === 'never') continue
      expect(s.when?.trim().length, s.id).toBeGreaterThan(0)
    }
  })

  it('makes every offer say what it is hedging', () => {
    // R16's rule: an 'offer' is something whose claim needs a caveat in
    // the same breath, not in a footnote. Fish oil is the case that
    // proves it, since its best-established effect is a harm.
    for (const s of SUPPLEMENT_CATALOG.filter((x) => x.appClass === 'offer')) {
      expect(s.hedge, `${s.id} is offered with no hedge`).toBeTruthy()
    }
  })

  it('never lets a displayed range top out at the published limit', () => {
    // A ceiling is not a target. The old vitamin D line asked for exactly
    // the upper limit and then put a multivitamin next to it.
    for (const s of SUPPLEMENT_CATALOG.filter((x) => x.appClass !== 'never')) {
      if (s.dose.upperLimit === undefined) continue
      expect(s.dose.high, `${s.id} sits on its own upper limit`).toBeLessThanOrEqual(s.dose.upperLimit)
    }
  })
})

describe('the stack is opt-in', () => {
  it('ships no supplements in a generated plan', () => {
    // The one place the app used to decide instead of suggest. A plan
    // arrived with three things in somebody's stack that they had never
    // agreed to take.
    const mp = buildMealPlan('muscle', 170, NUTRITION, 4, 'omnivore')
    expect(mp.supplements).toEqual([])
  })

  it('ships none even when there is nothing to filter out', () => {
    expect(buildMealPlan('lean', 150, NUTRITION, 3, 'vegan', { allergies: 'soy' }).supplements).toEqual([])
  })

  it('still has something to offer once they go looking', () => {
    // Opt-in is only honest if the offer is there when they want it.
    expect(offeredSupplements('omnivore').length).toBeGreaterThan(3)
  })
})

import { describe, expect, it } from 'vitest'
import { COMMON_MEALS } from './mealAlts'
import {
  COOKING,
  batchableIds,
  cookingFor,
  cookingLine,
  noCookIds,
  withinActiveMinutes,
} from './cooking'

// ============================================================
// The reason people miss a protein target is almost never that
// they did not know chicken has protein in it. It is 7pm, they
// are tired, and the gap between "eat 50 g" and "here is the
// thing you can have in fifteen minutes with one pan" is the
// whole problem. These check the data that closes that gap.
// ============================================================

describe('every meal knows how to be made', () => {
  it('has cooking data, and there is no cooking data for a meal that does not exist', () => {
    const missing = COMMON_MEALS.filter((m) => !COOKING[m.id]).map((m) => m.id)
    expect(missing, `no method for: ${missing.join(', ')}`).toEqual([])
    const orphan = Object.keys(COOKING).filter((id) => !COMMON_MEALS.some((m) => m.id === id))
    expect(orphan, `method for meals that do not exist: ${orphan.join(', ')}`).toEqual([])
  })

  it('carries steps somebody could actually follow', () => {
    for (const [id, c] of Object.entries(COOKING)) {
      expect(c.steps.length, `${id} steps`).toBeGreaterThanOrEqual(1)
      // Ten, not fifteen. A no-cook meal's second step is allowed to be
      // "Milk on. Eat before it goes soft." — the bar is that a step says
      // something, not that it fills a line.
      for (const s of c.steps) expect(s.length, `${id} step too short: "${s}"`).toBeGreaterThan(10)
    }
  })
})

describe('the timings are coherent', () => {
  it('never claims more hands-on time than total time', () => {
    // The one that would be nonsense on its face and is easy to typo.
    for (const [id, c] of Object.entries(COOKING)) {
      expect(c.activeMin, `${id}: ${c.activeMin} active of ${c.totalMin} total`).toBeLessThanOrEqual(c.totalMin)
      expect(c.activeMin, id).toBeGreaterThan(0)
    }
  })

  it('anything with unattended time is a method that HAS unattended time', () => {
    // A no-cook meal with a 40-minute total means somebody mistyped, since
    // there is nothing for the extra half hour to be doing.
    for (const [id, c] of Object.entries(COOKING)) {
      if (c.method === 'no-cook' || c.method === 'assembly' || c.method === 'blender') {
        expect(c.totalMin - c.activeMin, `${id} has idle time with nothing cooking`).toBeLessThanOrEqual(2)
      }
    }
  })

  it('keeps every snack genuinely fast', () => {
    // A snack that takes twenty minutes is a meal, and mis-slotting it is
    // how somebody ends up not eating at all.
    for (const m of COMMON_MEALS.filter((x) => x.slots.includes('snack'))) {
      expect(COOKING[m.id].activeMin, `${m.id} is slotted as a snack`).toBeLessThanOrEqual(8)
    }
  })
})

describe('the gear list matches the method', () => {
  it('does not claim a pan for something nothing is cooked in', () => {
    for (const [id, c] of Object.entries(COOKING)) {
      if (c.method !== 'no-cook') continue
      expect(c.gear.filter((g) => g === 'pan' || g === 'pot' || g === 'tray'), id).toEqual([])
    }
  })

  it('gives every cooked meal something to cook in', () => {
    for (const [id, c] of Object.entries(COOKING)) {
      if (c.method === 'no-cook' || c.method === 'assembly') continue
      expect(c.gear.some((g) => g !== 'none'), `${id} cooks on ${c.method} with no gear listed`).toBe(true)
    }
  })
})

describe('the practical filters', () => {
  const ids = COMMON_MEALS.map((m) => m.id)

  it('finds something for somebody with ten minutes', () => {
    const quick = withinActiveMinutes(ids, 10)
    expect(quick.length).toBeGreaterThan(10)
    for (const id of quick) expect(COOKING[id].activeMin).toBeLessThanOrEqual(10)
  })

  it('filters on HANDS-ON time, not wall clock', () => {
    // Chilli is 40 minutes total and 15 hands-on. Somebody with a spare
    // fifteen minutes and an evening at home can absolutely make it, and
    // filtering on total time would hide it from them.
    expect(withinActiveMinutes(['chili'], 15)).toEqual(['chili'])
    expect(withinActiveMinutes(['chili'], 10)).toEqual([])
  })

  it('finds real meals for a hotel room with no hob', () => {
    const nothing = noCookIds(ids)
    expect(nothing.length).toBeGreaterThan(5)
    for (const id of nothing) {
      expect(['no-cook', 'assembly'], id).toContain(COOKING[id].method)
    }
    // And not only snacks: somebody with no kitchen still has to eat dinner.
    const realMeals = nothing.filter((id) =>
      COMMON_MEALS.find((m) => m.id === id)!.slots.some((s) => s === 'lunch' || s === 'dinner'),
    )
    expect(realMeals.length).toBeGreaterThan(0)
  })

  it('knows what is worth making four of', () => {
    const batch = batchableIds(ids)
    expect(batch.length).toBeGreaterThan(5)
    for (const id of batch) expect(COOKING[id].batch).toBeTruthy()
  })

  it('only claims fridge life for things that survive a fridge', () => {
    for (const [id, c] of Object.entries(COOKING)) {
      if (c.keepsDays === undefined) continue
      expect(c.keepsDays, id).toBeGreaterThan(0)
      expect(c.keepsDays, `${id} claims ${c.keepsDays} days`).toBeLessThanOrEqual(7)
    }
  })
})

describe('the one-line summary', () => {
  it('collapses to a single number when nothing is unattended', () => {
    expect(cookingLine(COOKING['yogurt-bowl'])).toBe('3 min · no cooking')
  })

  it('splits total from hands-on when the oven is doing the waiting', () => {
    expect(cookingLine(COOKING['chili'])).toContain('hands-on')
  })

  it('names the kit', () => {
    expect(cookingLine(COOKING['chicken-rice'])).toContain('pans')
    expect(cookingLine(COOKING['chili'])).toContain('one pot')
  })
})

describe('seasoning is treated as adherence, not garnish', () => {
  it('is present on the meals that would otherwise taste of nothing', () => {
    // Unseasoned chicken and rice is why people quit eating for their
    // goals. These are the plain-protein-and-starch meals specifically.
    for (const id of ['chicken-rice', 'tofu-stirfry', 'lentil-soup', 'salmon-rice', 'tempeh-rice']) {
      expect(cookingFor(id)?.seasoning, `${id} has no seasoning note`).toBeTruthy()
    }
  })

  it('returns null for an unknown meal rather than throwing', () => {
    expect(cookingFor('not-a-meal')).toBeNull()
  })
})

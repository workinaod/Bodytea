import { describe, expect, it } from 'vitest'
import { emptyAppData, type AppData } from '../types'
import { addDaysISO } from './calendar'
import {
  BACKOFF_DAYS,
  DECLINE_COOLDOWN_DAYS,
  appendDecision,
  decisionRow,
  offerPolicy,
  returningCopy,
} from './decisions'

const TODAY = '2026-08-31'
const TYPE = 'calorie-step'
const TARGET = 'kcalTraining'

function said(no: AppData, daysAgo: number, evidence: Record<string, number | string>, seq = 0): AppData {
  appendDecision(
    no,
    decisionRow({
      type: TYPE,
      target: TARGET,
      ruleVersion: 1,
      evidence,
      response: 'declined',
      at: addDaysISO(TODAY, -daysAgo),
      seq,
    }),
  )
  return no
}

const fresh = () => {
  const d = emptyAppData('2026-06-01')
  d.settings.onboarded = true
  return d
}

describe('a proposal nobody has answered', () => {
  it('is offered', () => {
    expect(offerPolicy(fresh(), TYPE, TARGET, TODAY).allowed).toBe(true)
  })

  it('does not confuse one proposal with another', () => {
    const d = said(fresh(), 1, { missLbPerWeek: 0.5 })
    expect(offerPolicy(d, TYPE, TARGET, TODAY).allowed).toBe(false)
    expect(offerPolicy(d, TYPE, 'kcalRest', TODAY).allowed).toBe(true)
    expect(offerPolicy(d, 'nutrition-recheck', TARGET, TODAY).allowed).toBe(true)
  })
})

describe('one no buys a fortnight', () => {
  it('goes quiet the day after, and comes back on the fourteenth', () => {
    const e = { missLbPerWeek: 0.5 }
    expect(offerPolicy(said(fresh(), 1, e), TYPE, TARGET, TODAY).allowed).toBe(false)
    expect(offerPolicy(said(fresh(), DECLINE_COOLDOWN_DAYS - 1, e), TYPE, TARGET, TODAY).allowed).toBe(false)
    expect(offerPolicy(said(fresh(), DECLINE_COOLDOWN_DAYS, e), TYPE, TARGET, TODAY).allowed).toBe(true)
  })

  it('comes back early when the evidence actually got worse, and says so', () => {
    const d = said(fresh(), 2, { painCount: 2 })
    const p = offerPolicy(d, TYPE, TARGET, TODAY, { painCount: 4 })
    expect(p.allowed).toBe(true)
    expect(p.returningBecauseWorse).toBe(true)
    expect(returningCopy(p)).toContain('got stronger')
  })

  it('does not come back early for evidence that merely moved', () => {
    const d = said(fresh(), 2, { painCount: 2 })
    for (const now of [{ painCount: 2 }, { painCount: 3 }, { painCount: 1 }]) {
      expect(offerPolicy(d, TYPE, TARGET, TODAY, now).allowed, JSON.stringify(now)).toBe(false)
    }
  })
})

describe('three noes is an answer', () => {
  it('stops for two months', () => {
    let d = fresh()
    d = said(d, 40, { painCount: 2 }, 1)
    d = said(d, 25, { painCount: 2 }, 2)
    d = said(d, 10, { painCount: 2 }, 3)
    expect(offerPolicy(d, TYPE, TARGET, TODAY).declines).toBe(3)
    expect(offerPolicy(d, TYPE, TARGET, TODAY).allowed).toBe(false)
    // still quiet well past the ordinary fortnight
    expect(offerPolicy(d, TYPE, TARGET, addDaysISO(TODAY, 20)).allowed).toBe(false)
    expect(offerPolicy(d, TYPE, TARGET, addDaysISO(TODAY, BACKOFF_DAYS - 10)).allowed).toBe(true)
  })

  it('and worsening evidence does not get past it', () => {
    // Somebody who has said no three times is not waiting to be persuaded.
    let d = fresh()
    for (let i = 1; i <= 3; i++) d = said(d, 30 - i * 5, { painCount: 2 }, i)
    expect(offerPolicy(d, TYPE, TARGET, TODAY, { painCount: 99 }).allowed).toBe(false)
  })
})

describe('what counts as worse', () => {
  // Asserted through offerPolicy, which is what ships. The materiality
  // test itself is internal: an export nothing outside calls is the thing
  // the structural guard exists to catch.
  const worseEnough = (then: Record<string, number | string>, now: Record<string, number | string>) =>
    offerPolicy(said(fresh(), 2, then), TYPE, TARGET, TODAY, now).allowed

  it('is a doubling, or a signal that was not there before', () => {
    expect(worseEnough({ n: 2 }, { n: 4 })).toBe(true)
    expect(worseEnough({ n: 2 }, { n: 3 })).toBe(false)
    expect(worseEnough({ n: 2 }, { n: 2, newKind: 'knee' })).toBe(true)
    expect(worseEnough({ n: 2 }, { n: 2 })).toBe(false)
  })

  it('reads magnitude, so a deepening negative counts', () => {
    expect(worseEnough({ deltaKcal: -100 }, { deltaKcal: -250 })).toBe(true)
  })
})

describe('the ledger itself', () => {
  it('is append-only, and a row carries its evidence as values', () => {
    const d = said(said(fresh(), 5, { a: 1 }, 1), 1, { a: 2 }, 2)
    expect(d.decisions).toHaveLength(2)
    expect(d.decisions[0].evidence).toEqual({ a: 1 })
    expect(d.decisions[0].response).toBe('declined')
    expect(d.decisions[0].id).not.toBe(d.decisions[1].id)
  })

  it('records an acceptance too, because a ledger that only holds noes teaches nothing', () => {
    const d = fresh()
    appendDecision(d, decisionRow({
      type: TYPE, target: TARGET, ruleVersion: 1,
      evidence: { deltaKcal: -150 }, response: 'accepted', at: TODAY, seq: 1,
    }))
    expect(d.decisions[0].response).toBe('accepted')
    // and an acceptance is not a decline, so it does not mute anything
    expect(offerPolicy(d, TYPE, TARGET, TODAY).allowed).toBe(true)
  })
})

describe('a signed number crossing zero', () => {
  const worseEnough = (then: Record<string, number | string>, now: Record<string, number | string>) =>
    offerPolicy(said(fresh(), 2, then), TYPE, TARGET, TODAY, now).allowed

  it('counts, because doubling cannot see it', () => {
    // An athlete on a cut who was losing 0.4 lb a week and is now gaining
    // 0.6 is in a different situation. 0.6 is not twice 0.4, so the first
    // version of this rule stayed quiet through the change most worth
    // mentioning.
    expect(worseEnough({ trendLbPerWeek: -0.4 }, { trendLbPerWeek: 0.6 })).toBe(true)
    expect(worseEnough({ trendLbPerWeek: -1.4 }, { trendLbPerWeek: -1.2 })).toBe(false)
  })

  it('reads something starting as material and something stopping as not', () => {
    // Zero is decided explicitly rather than by the doubling formula,
    // which would have said yes to both of these for the same reason:
    // every number clears zero times two.
    expect(worseEnough({ n: 0 }, { n: 1 })).toBe(true) // a signal appeared
    expect(worseEnough({ n: -1 }, { n: 0 })).toBe(false) // it went away
    expect(worseEnough({ n: 3 }, { n: 0 })).toBe(false)
  })
})

import { beforeEach, describe, expect, it } from 'vitest'
import { BEFORE_TRACKING, emptyAppData, type AppData, type ISODate } from '../types'
import { useAppStore } from '../store/appStore'
import { stampProgress } from './achievementActions'

// ============================================================
// When a badge was earned, and the one lie the app must not
// tell.
//
// The date cannot be derived: a badge cleared on a 30 day
// streak stays earned after the streak breaks, and by then
// nothing in the history says when it happened. So it gets
// written down once and never rewritten.
//
// The awkward case is the accounts that already have badges on
// the day this shipped. The app does not know when those were
// cleared. It marks them `before-tracking` and says so on the
// badge, because inventing a date is the same class of mistake
// as inventing a number.
// ============================================================

const START: ISODate = '2026-01-05' // a Monday

function seed(mutate: (d: AppData) => void = () => {}) {
  const d = emptyAppData(START, START)
  d.settings.onboarded = true
  mutate(d)
  useAppStore.setState({ data: d })
  return d
}

/**
 * Five pounds off a lean goal, which is the cheapest honest badge in the
 * table: two weigh-ins and no dependence on how the plan resolves.
 */
function loseFive(d: AppData) {
  d.plan.goal = 'lean'
  d.measurements = [
    { date: START, weightLb: 200, photoIds: {} },
    { date: '2026-01-10', weightLb: 194, photoIds: {} },
  ]
}

const log = () => useAppStore.getState().data.achievements

describe('stamping when a badge was earned', () => {
  beforeEach(() => {
    seed()
  })

  it('starts watching on the first stamp, even with nothing earned', () => {
    stampProgress(START)
    expect(log().trackingFrom).toBe(START)
    expect(log().earnedAt).toEqual({})
  })

  it('marks anything already standing as earned before tracking', () => {
    // An account with real history that predates this feature entirely.
    seed(loseFive)
    const today = '2026-01-10'
    stampProgress(today)
    const stamped = Object.values(log().earnedAt)
    expect(stamped.length).toBeGreaterThan(0)
    // Not one of them gets a date the app cannot actually know.
    expect(stamped.every((v) => v === BEFORE_TRACKING)).toBe(true)
    expect(stamped).not.toContain(today)
  })

  it('dates a badge earned after watching started', () => {
    stampProgress(START)
    const before = Object.keys(log().earnedAt)

    const next = structuredClone(useAppStore.getState().data)
    loseFive(next)
    useAppStore.setState({ data: next })

    const earnedOn = '2026-01-10'
    stampProgress(earnedOn)
    const fresh = Object.entries(log().earnedAt).filter(([id]) => !before.includes(id))
    expect(fresh.length).toBeGreaterThan(0)
    expect(fresh.every(([, at]) => at === earnedOn)).toBe(true)
  })

  it('never rewrites a date it already has', () => {
    seed(loseFive)
    stampProgress('2026-01-10')
    const first = { ...log().earnedAt }
    expect(Object.keys(first).length).toBeGreaterThan(0)
    // A week later, same badges, and the history behind them has moved on.
    stampProgress('2026-01-17')
    expect(log().earnedAt).toEqual(first)
  })
})

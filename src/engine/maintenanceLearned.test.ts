import { describe, expect, it } from 'vitest'
import { emptyAppData, type AppData } from '../types'
import { addDaysISO } from './calendar'
import { MAX_MEASUREMENT_TRUST, learnedCopyFor, learnedMaintenance } from './maintenanceLearned'

// ============================================================
// Half of this equation is a scale and half of it is somebody
// remembering to write down what they ate. The tests are mostly about
// the second half.
// ============================================================

const TODAY = '2026-08-31'

function athlete(): AppData {
  const d = emptyAppData('2026-06-01')
  d.settings.onboarded = true
  d.profile = { bfFormula: 'male', heightIn: 70, age: 30 }
  d.plan.goal = 'lean'
  d.plan.nutrition = { kcalTraining: 2400, kcalRest: 2100 }
  d.plan.mealPlan.supplements = []
  return d
}

/** Weigh-ins every 3 days across the window at a steady rate. */
function scale(d: AppData, startLb: number, lbPerWeek: number, count = 10): AppData {
  for (let i = 0; i < count; i++) {
    const daysAgo = (count - 1 - i) * 3
    d.measurements.push({
      date: addDaysISO(TODAY, -daysAgo),
      weightLb: Math.round((startLb + (lbPerWeek * (i * 3)) / 7) * 10) / 10,
      photoIds: {},
    })
  }
  return d
}

/** `days` of the last 28 logged, each at `kcal`. */
function ate(d: AppData, kcal: number, days: number): AppData {
  for (let i = 0; i < days; i++) {
    const date = addDaysISO(TODAY, -i)
    d.meals[date] = {
      entries: [{ label: 'day', proteinG: 0, kcal, source: 'custom', servings: 1 }],
      supplements: {},
    } as AppData['meals'][string]
  }
  return d
}

describe('the arithmetic the data was already holding', () => {
  it('reads maintenance off intake and the scale', () => {
    // Eating 2,000, losing a pound a week, so running on about 2,500.
    const m = learnedMaintenance(ate(scale(athlete(), 190, -1), 2000, 24), TODAY)!
    expect(m).not.toBeNull()
    expect(m.meanIntakeKcal).toBe(2000)
    expect(m.measuredKcal).toBe(2500)
  })

  it('lands the working number between the model and the measurement', () => {
    const m = learnedMaintenance(ate(scale(athlete(), 190, -1), 2000, 24), TODAY)!
    const lo = Math.min(m.modeledKcal, m.measuredKcal)
    const hi = Math.max(m.modeledKcal, m.measuredKcal)
    expect(m.kcal).toBeGreaterThanOrEqual(lo)
    expect(m.kcal).toBeLessThanOrEqual(hi)
  })

  it('never hands the food log more than half the vote, however diligent', () => {
    const m = learnedMaintenance(ate(scale(athlete(), 190, -1), 2000, 28), TODAY)!
    expect(m.trust).toBeLessThanOrEqual(MAX_MEASUREMENT_TRUST)
    // and the working number stays nearer the model than the measurement
    expect(Math.abs(m.kcal - m.modeledKcal)).toBeLessThanOrEqual(Math.abs(m.kcal - m.measuredKcal))
  })

  it('trusts a fuller log more than a sparse one', () => {
    const sparse = learnedMaintenance(ate(scale(athlete(), 190, -1), 2000, 18), TODAY)!
    const full = learnedMaintenance(ate(scale(athlete(), 190, -1), 2000, 28), TODAY)!
    expect(full.trust).toBeGreaterThan(sparse.trust)
  })
})

describe('it declines rather than guess', () => {
  it('when most of the month was never logged', () => {
    expect(learnedMaintenance(ate(scale(athlete(), 190, -1), 2000, 12), TODAY)).toBeNull()
  })

  it('when there is not three weeks of scale behind it', () => {
    const d = ate(athlete(), 2000, 24)
    scale(d, 190, -1, 3) // three weigh-ins, nine days apart end to end
    expect(learnedMaintenance(d, TODAY)).toBeNull()
  })

  it('when creatine is moving the scale, because that is not energy balance', () => {
    const d = ate(scale(athlete(), 190, -1), 2000, 24)
    d.plan.mealPlan.supplements = [{ id: 'creatine', source: 'app' }]
    expect(learnedMaintenance(d, TODAY)).toBeNull()
  })

  it('when the log disagrees with two validated equations by more than a body can', () => {
    // 900 kcal a day while holding weight would put maintenance near 900.
    // Bodies do not do that; logs do.
    const d = ate(scale(athlete(), 190, 0), 900, 24)
    expect(learnedMaintenance(d, TODAY)).toBeNull()
  })
})

describe('saying it', () => {
  it('says nothing when the two methods agree', () => {
    const m = learnedMaintenance(ate(scale(athlete(), 190, -1), 2000, 24), TODAY)!
    const tuned = { ...m, measuredKcal: m.modeledKcal + 10 }
    expect(learnedCopyFor(tuned)).toBeNull()
  })

  it('names both numbers and admits which one it leans on', () => {
    const m = learnedMaintenance(ate(scale(athlete(), 190, -1), 2000, 24), TODAY)!
    const copy = learnedCopyFor({ ...m, measuredKcal: m.modeledKcal - 300 })!
    expect(copy).toContain(String(m.modeledKcal))
    expect(copy).toContain('food logs run light')
    expect(copy).toContain('less')
  })
})

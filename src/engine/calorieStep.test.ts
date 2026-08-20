import { describe, expect, it } from 'vitest'
import { emptyAppData, type AppData, type SessionLog } from '../types'
import { addDaysISO } from './calendar'
import { STEP_MAX, STEP_MIN, calorieStep, stepCopy } from './calorieStep'
import { kcalBumpSuggestion } from './stats'

// ============================================================
// R1 asserts this case directly: persona 1 on a cut, trending -0.2 %/wk
// against a target of -0.75 %/wk, should be suggested a step of 100 to
// 250 kcal. NOT the 500 the static convention would hand you, because the
// convention is a short-horizon step size and not a forecast.
// ============================================================

const TODAY = '2026-08-31'

function cutting(over: { kcal?: number; lb?: number; goal?: 'lean' | 'muscle' } = {}): AppData {
  const d = emptyAppData('2026-06-01')
  d.settings.onboarded = true
  d.profile = { bfFormula: 'male', heightIn: 70, age: 30 }
  d.plan.goal = over.goal ?? 'lean'
  d.plan.nutrition = { kcalTraining: over.kcal ?? 2600, kcalRest: (over.kcal ?? 2600) - 300 }
  d.plan.mealPlan.supplements = [] // no creatine: see the confounded test below
  return d
}

/** Weigh-ins every 3 days, oldest first, at a steady lb-per-week rate. */
function trending(d: AppData, startLb: number, lbPerWeek: number, count = 8): AppData {
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

describe('the scale gets a say', () => {
  it('suggests a step, not the 500 the static rule would hand you', () => {
    // 190 lb wanting 0.95 to 1.9 lb a week off, losing 0.4. The miss is
    // 0.55 lb/wk, which the 3,500 convention prices at about 275 kcal a
    // day. Half of that is where the suggestion lands.
    const s = calorieStep(trending(cutting(), 190, -0.4), TODAY)!
    expect(s).not.toBeNull()
    expect(s.miss).toBe('slow')
    expect(s.stepKcal).toBe(-150)
    expect(Math.abs(s.stepKcal)).toBeGreaterThanOrEqual(STEP_MIN)
    expect(Math.abs(s.stepKcal)).toBeLessThanOrEqual(STEP_MAX)
  })

  it('feeds a cut that is running too fast, not just one that stalls', () => {
    const s = calorieStep(trending(cutting(), 190, -3.5), TODAY)!
    expect(s.miss).toBe('fast')
    expect(s.stepKcal).toBeGreaterThan(0)
  })

  it('adds food to a gain that is not happening', () => {
    const s = calorieStep(trending(cutting({ goal: 'muscle', kcal: 3000 }), 190, 0), TODAY)!
    expect(s.miss).toBe('slow')
    expect(s.stepKcal).toBeGreaterThan(0)
  })

  it('never proposes more than the clamp, however badly the goal is missed', () => {
    for (const rate of [-0.05, 0, 0.5, -6, -9]) {
      const s = calorieStep(trending(cutting(), 190, rate), TODAY)
      if (s) expect(Math.abs(s.stepKcal), `rate ${rate}`).toBeLessThanOrEqual(STEP_MAX)
    }
  })
})

describe('it stays quiet, which is most of the time', () => {
  it('when the scale is doing what the goal asked', () => {
    expect(calorieStep(trending(cutting(), 190, -1.4), TODAY)).toBeNull()
  })

  it('on a fortnight of nothing, because that is noise', () => {
    const d = cutting()
    d.measurements.push({ date: addDaysISO(TODAY, -4), weightLb: 190, photoIds: {} })
    d.measurements.push({ date: addDaysISO(TODAY, -2), weightLb: 190, photoIds: {} })
    d.measurements.push({ date: TODAY, weightLb: 190, photoIds: {} })
    expect(calorieStep(d, TODAY)).toBeNull()
  })

  it('when the trend is confounded, because creatine water is not fat', () => {
    const d = trending(cutting(), 190, -0.4)
    d.plan.mealPlan.supplements = [{ id: 'creatine', source: 'app' }]
    expect(calorieStep(d, TODAY)).toBeNull()
  })

  it('for a goal that has no rate band to miss', () => {
    for (const goal of ['general', 'strength', 'endurance', 'speed', 'vertical'] as const) {
      const d = trending(cutting(), 190, -0.4)
      d.plan.goal = goal
      expect(calorieStep(d, TODAY), goal).toBeNull()
    }
  })
})

describe('the floors outrank the scale', () => {
  it('truncates a step that would breach the quarter-off-maintenance cap', () => {
    // Already eating 2,200 against a modeled 2,850, which is a 23 percent
    // deficit. The scale wants another 150 off; the cap allows 62. It
    // reports what it will actually do, not what it wanted to do.
    const s = calorieStep(trending(cutting({ kcal: 2200 }), 190, -0.4), TODAY)!
    expect(s.stepKcal).toBeGreaterThan(-150)
    expect(s.stepKcal).toBeLessThan(0)
    expect(s.toKcal).toBe(s.fromKcal + s.stepKcal)
  })


  it('will not step a target down through the floor', () => {
    // Already eating at the bottom and still not losing: the pace has to
    // move, not the food. R1 is explicit that the floor wins.
    const s = calorieStep(trending(cutting({ kcal: 1500 }), 120, -0.1), TODAY)
    if (s) expect(s.toKcal).toBeGreaterThanOrEqual(1500)
  })

  it('never lands below the absolute training-day minimum, at any weight', () => {
    for (let lb = 90; lb <= 330; lb += 20) {
      const s = calorieStep(trending(cutting({ kcal: 1600 }), lb, -0.05), TODAY)
      if (s) expect(s.toKcal, `lb ${lb}`).toBeGreaterThanOrEqual(1500)
    }
  })
})

describe('saying why', () => {
  it('cites the athlete s own scale, and says the step is deliberately small', () => {
    const s = calorieStep(trending(cutting(), 190, -0.4), TODAY)!
    const copy = stepCopy(s)
    expect(copy).toContain('lb a week')
    expect(copy).toContain('not a prediction')
    expect(copy).toContain(String(Math.abs(s.stepKcal)))
  })
})

describe('it does not argue with the recomp signal', () => {
  it('stays silent when strength is climbing on a flat scale', () => {
    // Both rules used to fire on this athlete at once. One card said add
    // 150 to 200 kcal, the other said take 250 away, on the same screen.
    // Strength up while weight holds is the cut WORKING, so the
    // scale-only reading of "too slow" is the wrong one and stands down.
    const d = cutting()
    for (const [ago, lb] of [[24, 197], [18, 197.4], [12, 197.2], [6, 197.3], [0, 197.1]] as const) {
      d.measurements.push({ date: addDaysISO(TODAY, -ago), weightLb: lb, photoIds: {} })
    }
    d.plan.trackedLifts = [{ exerciseId: 'goblet-squat', label: 'Goblet Squat' }]
    for (const [ago, lb] of [[40, 100], [3, 115]] as const) {
      const date = addDaysISO(TODAY, -ago)
      d.sessions[date] = {
        date,
        templateId: 't',
        status: 'done',
        exercises: [{ exerciseId: 'goblet-squat', sets: [{ targetReps: '8', weightLb: lb, reps: 8, done: true }] }],
      } as unknown as SessionLog
    }
    expect(kcalBumpSuggestion(d), 'the fixture has to actually trigger the recomp rule').not.toBeNull()
    expect(calorieStep(d, TODAY)).toBeNull()
  })
})

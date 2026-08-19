import { describe, expect, it } from 'vitest'
import { emptyAppData, type AppData, type SessionLog } from '../types'
import { addDaysISO } from './calendar'
import { adherenceShape, readUserModel, recoveryByRegion, weightTrend, workCapacity } from './userModel'
import { kcalBumpSuggestion } from './stats'

// ============================================================
// The thing this file has to get right is not the arithmetic. It is
// knowing when it does not know.
//
// Nine jobs read these numbers, so a fact that sounds certain on three
// data points propagates into calorie targets, volume decisions and
// coaching copy all at once. Every function here returns null until it
// has something to say, and every fact it does return carries a
// confidence derived from how much evidence there is and how old it
// has gone, never a number somebody typed.
// ============================================================

const TODAY = '2026-08-31'

function blank(): AppData {
  const d = emptyAppData('2026-08-03')
  d.settings.onboarded = true
  return d
}

function weighIn(d: AppData, daysAgo: number, lb: number): AppData {
  d.measurements.push({ date: addDaysISO(TODAY, -daysAgo), weightLb: lb, photoIds: {} })
  return d
}

function trained(d: AppData, daysAgo: number, exerciseId: string, sets = 3): AppData {
  const date = addDaysISO(TODAY, -daysAgo)
  d.sessions[date] = {
    date,
    templateId: 't',
    status: 'done',
    exercises: [
      { exerciseId, sets: Array.from({ length: sets }, () => ({ targetReps: '8', done: true, reps: 8 })) },
    ],
  } as unknown as SessionLog
  return d
}

describe('a new account gets silence, not guesses', () => {
  it('says nothing about any of it', () => {
    const m = readUserModel(blank(), TODAY)
    expect(m.weightTrendLbPerWeek).toBeNull()
    expect(m.hardSetsPerWeek).toBeNull()
    expect(m.daysSinceRegion).toBeNull()
    expect(m.trainsOnWeekday).toBeNull()
  })

  it('still says nothing on one or two data points', () => {
    // The number of samples where a naive implementation starts talking.
    expect(weightTrend(weighIn(weighIn(blank(), 10, 180), 3, 178), TODAY)).toBeNull()
    expect(workCapacity(trained(blank(), 2, 'goblet-squat'), TODAY)).toBeNull()
  })
})

describe('the weight trend', () => {
  const losing = (stack: 'none' | 'creatine' = 'none') => {
    let d = blank()
    // emptyAppData falls back to the owner's hand-built booklet, which
    // carries his own stack. A real account replaces the plan at commit
    // and a generated one ships no supplements at all, so the fixture
    // has to be explicit about which case it is testing.
    d.plan.mealPlan.supplements = stack === 'creatine' ? [{ id: 'creatine', source: 'app' }] : []
    for (let i = 28; i >= 0; i -= 4) d = weighIn(d, i, 200 - (28 - i) * 0.15)
    return d
  }

  it('reads a real direction once there is enough of it', () => {
    const f = weightTrend(losing(), TODAY)!
    expect(f).not.toBeNull()
    // Losing weight is a NEGATIVE lb per week. The sign is the direction,
    // and getting it backwards would tell a cutting athlete they are
    // gaining, which is the one reading that reverses a calorie decision.
    expect(f.value).toBeLessThan(0)
    expect(f.from).toBe('measurements')
    expect(f.samples).toBeGreaterThanOrEqual(8)
  })

  it('says out loud when creatine is making the number lie', () => {
    // W16 put confoundsWeightTrend on the record for exactly this. A
    // trend read through the first weeks of creatine is water, and an
    // engine that autoregulates calories off it would cut them for a
    // gain that never happened.
    expect(weightTrend(losing('creatine'), TODAY)!.caveat).toMatch(/water/i)
    expect(weightTrend(losing(), TODAY)!.caveat).toBeUndefined()
  })

  it('still returns the number rather than hiding it', () => {
    // Withholding it would be the worse failure: the athlete can see
    // their own scale. The caveat is what makes it honest.
    expect(typeof weightTrend(losing('creatine'), TODAY)!.value).toBe('number')
  })
})

describe('confidence is earned, not declared', () => {
  const withSessions = (n: number) => {
    let d = blank()
    for (let i = 0; i < n; i++) d = trained(d, i * 2 + 1, 'goblet-squat')
    return d
  }

  it('rises with evidence', () => {
    const few = workCapacity(withSessions(3), TODAY)!
    const many = workCapacity(withSessions(10), TODAY)!
    expect(many.confidence).toBeGreaterThan(few.confidence)
  })

  it('never exceeds 1, and never claims certainty on thin evidence', () => {
    const few = workCapacity(withSessions(3), TODAY)!
    expect(few.confidence).toBeLessThan(1)
    expect(workCapacity(withSessions(12), TODAY)!.confidence).toBeLessThanOrEqual(1)
  })

  it('falls as the newest observation goes stale, with evidence held equal', () => {
    // Three sessions either way, both inside the 28-day window, so the
    // only thing that differs is how long ago the newest one was. Vary
    // the sample count too and this measures evidence, not age.
    const at = (days: number[]) => {
      let d = blank()
      for (const ago of days) d = trained(d, ago, 'goblet-squat')
      return workCapacity(d, TODAY)!
    }
    const fresh = at([1, 3, 5])
    const stale = at([22, 24, 26])
    expect(fresh.samples).toBe(stale.samples)
    expect(stale.confidence).toBeLessThan(fresh.confidence)
  })
})

describe('what it measures is the log, not the plan', () => {
  it('counts only sets that were actually ticked', () => {
    // THREE sessions, so the two-session floor is cleared and the only
    // thing that can return null is the tick filter itself. The first
    // version of this used one session and passed for the wrong reason:
    // the sample gate caught it, so a mutation that counted unticked
    // sets survived. A test that passes because a different rule fired
    // is not testing the rule it names.
    const d = blank()
    for (const ago of [1, 3, 5]) {
      const date = addDaysISO(TODAY, -ago)
      d.sessions[date] = {
        date,
        templateId: 't',
        status: 'done',
        exercises: [{ exerciseId: 'goblet-squat', sets: [{ targetReps: '8', done: false }] }],
      } as unknown as SessionLog
    }
    // Opened, never ticked. That is not evidence anybody trained.
    expect(workCapacity(d, TODAY)).toBeNull()
    expect(adherenceShape(d, TODAY)).toBeNull()
    expect(recoveryByRegion(d, TODAY)).toBeNull()
  })

  it('reads which weekdays they turn up on', () => {
    let d = blank()
    for (const ago of [1, 8, 15, 22]) d = trained(d, ago, 'goblet-squat')
    const f = adherenceShape(d, TODAY)!
    expect(f.value.reduce((a, b) => a + b, 0)).toBe(4)
    // All four land on the same weekday, so exactly one bucket is full.
    expect(f.value.filter((n) => n > 0).length).toBe(1)
  })

  it('knows how long ago each region worked', () => {
    let d = blank()
    d = trained(d, 2, 'goblet-squat')
    d = trained(d, 9, 'barbell-row')
    const f = recoveryByRegion(d, TODAY)!
    expect(f.value.legs).toBe(2)
    expect(f.value.back).toBe(9)
    expect(f.value.chest).toBeUndefined()
  })
})

describe('the fact reaches the decision it exists for', () => {
  it('stops the calorie rule reading a scale that creatine is moving', () => {
    // The only consumer weightTrend has today, and the reason it has a
    // caveat field at all. kcalBumpSuggestion rests entirely on "the
    // scale is not moving", so it is only as good as the scale.
    const d = blank()
    d.plan.mealPlan.supplements = []
    d.measurements = [
      { date: '2026-08-01', weightLb: 197, photoIds: {} },
      { date: '2026-08-15', weightLb: 197.4, photoIds: {} },
      { date: '2026-08-29', weightLb: 197.2, photoIds: {} },
    ]
    d.plan.trackedLifts = [{ exerciseId: 'goblet-squat', label: 'Goblet Squat' }]
    for (const [ago, lb] of [[40, 100], [3, 115]] as const) {
      const date = addDaysISO(TODAY, -ago)
      d.sessions[date] = {
        date,
        templateId: 't',
        status: 'done',
        exercises: [
          { exerciseId: 'goblet-squat', sets: [{ targetReps: '8', weightLb: lb, reps: 8, done: true }] },
        ],
      } as unknown as SessionLog
    }
    expect(kcalBumpSuggestion(d), 'the rule should fire with no confounder').not.toBeNull()

    d.plan.mealPlan.supplements = [{ id: 'creatine', source: 'app' }]
    expect(kcalBumpSuggestion(d), 'and go quiet once the scale is unreliable').toBeNull()
  })
})

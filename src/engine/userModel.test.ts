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

function taped(d: AppData, daysAgo: number, pct: number, lb?: number): AppData {
  d.measurements.push({ date: addDaysISO(TODAY, -daysAgo), bodyFatPct: pct, weightLb: lb, photoIds: {} })
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
    // The fixture weighs in every 4 days across 29 days. Only the ones
    // inside the trend window count, which is the point: samples is
    // evidence for THIS trend, not a tally of everything ever recorded.
    expect(f.samples).toBe(6)
  })

  it('looks at recent weeks, not at everything ever recorded', () => {
    // The defect this pins: the window was unbounded, so an athlete
    // thirty pounds down over five months and perfectly FLAT for the last
    // one regressed to 1.29 lb a week of loss. The step rule read "on
    // track" and offered the one person actually on a plateau nothing.
    let d = blank()
    d.plan.mealPlan.supplements = []
    for (let i = 0; i < 40; i++) d = weighIn(d, 180 - i * 4, 220 - i * 0.6)
    for (const daysAgo of [18, 12, 6, 0]) d = weighIn(d, daysAgo, 190)
    const f = weightTrend(d, TODAY)!
    expect(f.value).toBe(0)
    expect(f.samples).toBe(4)
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

describe('the tape reading, which the calorie model has never seen', () => {
  it('says nothing when nobody has picked up a tape', () => {
    expect(readUserModel(blank(), TODAY).bodyFatPct).toBeNull()
  })

  it('smooths a sloppy reading instead of following it', () => {
    // Two careful 20s and one bad 28 is a 20, not a 22.7. Three body-fat
    // points is roughly 3 kg of fat-free mass, which is a meal a day.
    const d = blank()
    taped(d, 40, 20)
    taped(d, 20, 20)
    taped(d, 2, 28)
    expect(readUserModel(d, TODAY).bodyFatPct?.value).toBe(20)
  })

  it('retires a reading the calendar has outrun', () => {
    const d = blank()
    taped(d, 90, 18)
    expect(readUserModel(d, TODAY).bodyFatPct).toBeNull()
    // and a fresh one brings it straight back
    taped(d, 5, 18)
    expect(readUserModel(d, TODAY).bodyFatPct?.value).toBe(18)
  })

  it('retires a reading the body has outrun, even when the date is fine', () => {
    // Three weeks old is well inside the calendar window. Fifteen pounds
    // is not: whatever composition that tape described, it is not this
    // body, and a stale fat-free mass is confidently wrong.
    const d = blank()
    taped(d, 21, 18, 175)
    weighIn(d, 1, 190)
    expect(readUserModel(d, TODAY).bodyFatPct).toBeNull()
  })

  it('does not retire a good reading just because nobody has weighed in', () => {
    const d = blank()
    taped(d, 21, 18, 175)
    expect(readUserModel(d, TODAY).bodyFatPct?.value).toBe(18)
  })

  it('carries confidence that rides on how many readings there are', () => {
    const one = blank()
    taped(one, 3, 18)
    const three = blank()
    taped(three, 30, 18)
    taped(three, 16, 18)
    taped(three, 3, 18)
    expect(readUserModel(three, TODAY).bodyFatPct!.confidence).toBeGreaterThan(
      readUserModel(one, TODAY).bodyFatPct!.confidence,
    )
    expect(readUserModel(three, TODAY).bodyFatPct!.samples).toBe(3)
  })
})

describe('the weight trend is a trend, not a pair of endpoints', () => {
  // This block exists because it did not. weightTrend computed an
  // exponentially weighted average, never read it, and returned the slope
  // between the first and last weigh-in. Swapping that for a real
  // regression broke NO test, which is the proof that nothing was
  // watching the number a calorie suggestion now rides on.
  const series = (lbs: number[]): AppData => {
    const d = blank()
    lbs.forEach((lb, i) => weighIn(d, (lbs.length - 1 - i) * 3, lb))
    return d
  }

  it('reads a steady loss at the rate it is actually happening', () => {
    // 1 lb every 3 days is 2.33 lb/wk.
    const f = weightTrend(series([200, 199, 198, 197, 196, 195]), TODAY)!
    expect(f.value).toBeCloseTo(-2.33, 1)
  })

  it('is swayed less by one heavy morning than the endpoints were', () => {
    // Same six weigh-ins, last one 4 lb high.
    //
    // Pinned as a VALUE, not as a relationship. The first version of this
    // test asserted only that the regression swung less than the
    // endpoints would have, and a mutation that put the endpoint slope
    // back survived it: the two differed by 0.007 after rounding, which
    // is inside "less than". Both algorithms satisfy almost every
    // relationship you can write about them. Only the number separates.
    const clean = weightTrend(series([200, 199, 198, 197, 196, 195]), TODAY)!.value
    const spiked = weightTrend(series([200, 199, 198, 197, 196, 199]), TODAY)!.value
    expect(clean).toBe(-2.33)
    expect(spiked).toBe(-1) // an endpoint slope would say -0.47, a near stall
    expect(Math.abs(spiked - clean)).toBeLessThan(Math.abs(-0.47 - clean))
  })

  it('gets steadier the more weigh-ins there are, which endpoints never do', () => {
    // The same 4 lb bad reading at the end of a longer series barely
    // registers. An endpoint slope is exactly as wrong either way.
    const short = series([200, 199, 198, 197, 196, 199])
    const long = series([204, 203, 202, 201, 200, 199, 198, 197, 196, 199])
    const trueRate = -2.33
    const shortErr = Math.abs(weightTrend(short, TODAY)!.value - trueRate)
    const longErr = Math.abs(weightTrend(long, TODAY)!.value - trueRate)
    expect(longErr).toBeLessThan(shortErr)
  })

  it('has nothing to say when every reading is the same day', () => {
    const d = blank()
    weighIn(d, 2, 200)
    weighIn(d, 2, 201)
    weighIn(d, 2, 199)
    expect(weightTrend(d, TODAY)).toBeNull()
  })
})

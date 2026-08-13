import { describe, expect, it } from 'vitest'
import { emptyAppData, type AppData, type Measurement, type SessionLog } from '../types'
import { buildJourney, newlyReached, orderRail } from './journey'
import { estimateWeeks, observedRatePerWeek, readMetric } from './journeyMetrics'

// ============================================================
// The climb, against real AppData.
//
// The rate tables are tested next door; this file is about the
// three ways the feature could lie with correct arithmetic:
// promising a date it cannot support, letting a reached rung
// un-reach, and pretending to know something on day one.
// ============================================================

const TODAY = '2026-08-14'
const START = '2026-01-05'

function base(): AppData {
  const d = emptyAppData(START, TODAY)
  d.settings.onboarded = true
  return d
}

function weighIn(date: string, weightLb: number, extra: Partial<Measurement> = {}): Measurement {
  return { date, weightLb, photoIds: {}, ...extra }
}

function session(date: string, exerciseId: string, weightLb: number, reps = 5): SessionLog {
  return {
    date,
    templateId: 'monday',
    status: 'completed',
    exercises: [{ exerciseId, sets: [{ targetReps: String(reps), weightLb, reps, done: true }] }],
  }
}

describe('a brand-new account, which is where most people meet this', () => {
  it('still shows a real ladder with nothing logged at all', () => {
    // The failure mode to avoid is a screen of grey rows telling
    // somebody to come back in a month. Consistency needs no anchor.
    const j = buildJourney(base(), TODAY)
    expect(j.totalCount).toBeGreaterThan(0)
    expect(j.rail.some((r) => r.state === 'next')) .toBe(true)
  })

  it('claims nothing it cannot measure', () => {
    const j = buildJourney(base(), TODAY)
    for (const r of j.rail) {
      if (r.blocker) continue
      // Every rung with an estimate must have a number behind it.
      if (r.etaWeeks !== undefined) expect(r.basis).not.toBe('none')
    }
  })

  it('says exactly what would unlock a track instead of hiding it', () => {
    // A grey row that explains nothing is worse than no row. The
    // blocker names the one action, and the UI makes it the tap target.
    const d = base()
    d.plan.goal = 'lean'
    const j = buildJourney(d, TODAY)
    const locked = j.rail.filter((r) => r.state === 'locked')
    for (const r of locked) expect(r.blocker && r.blocker.length > 8).toBe(true)
  })

  it('never estimates off a single data point', () => {
    const d = base()
    d.measurements = [weighIn('2026-08-01', 200)]
    const j = buildJourney(d, TODAY)
    const body = j.rail.filter((r) => r.track === 'body' && r.etaWeeks !== undefined)
    for (const r of body) expect(r.basis).toBe('modelled')
  })
})

describe('the estimate, and every reason to refuse one', () => {
  const ok = { gap: 10, modelledPerWeek: 1, observedPerWeek: null, metric: 'topSetLb' as const, index: 0 }

  it('gives a date when it has one', () => {
    const e = estimateWeeks(ok)
    expect(e.weeks).toBe(10)
    expect(e.basis).toBe('modelled')
  })

  it('says which kind of estimate it is, in a word the athlete can read', () => {
    expect(estimateWeeks({ ...ok, observedPerWeek: 2 }).basis).toBe('observed')
    expect(estimateWeeks(ok).basis).toBe('modelled')
  })

  it('lets their own rate win, but not run away with it', () => {
    // A hot month does not get to promise a hot year: the first weeks
    // of any deficit or any return to the bar regress.
    const hot = estimateWeeks({ ...ok, observedPerWeek: 100 })
    expect(hot.weeks).toBeGreaterThanOrEqual(6)
  })

  it('refuses outright when the thing has stopped moving', () => {
    // "Your squat is going up 0.3 lb a week, see you in 2029" is
    // arithmetic pretending to be coaching. A stall should say so.
    const stalled = estimateWeeks({ ...ok, observedPerWeek: 0 })
    expect(stalled.weeks).toBeUndefined()
    expect(stalled.note).toMatch(/not moved/i)
  })

  it('refuses when the answer is further out than two years', () => {
    const far = estimateWeeks({ ...ok, gap: 500, modelledPerWeek: 0.1 })
    expect(far.weeks).toBeUndefined()
    expect(far.note).toMatch(/two years/i)
  })

  it('refuses when the metric moves slower than it can be measured', () => {
    // A trained jumper gaining 0.05 in a week against a chalk mark good
    // to half an inch: the number is real and the measurement is not.
    const noisy = estimateWeeks({ ...ok, metric: 'vertIn', modelledPerWeek: 0.05, gap: 6 })
    expect(noisy.weeks).toBeUndefined()
    expect(noisy.note).toMatch(/measured/i)
  })

  it('pushes later rungs further out than a straight line would', () => {
    const first = estimateWeeks({ ...ok, index: 0 }).weeks!
    const fourth = estimateWeeks({ ...ok, index: 3 }).weeks!
    expect(fourth).toBeGreaterThan(first)
  })
})

describe('the observed rate', () => {
  it('needs enough points over enough time before it beats the model', () => {
    const two = [
      { date: '2026-08-01', value: 200 },
      { date: '2026-08-08', value: 198 },
    ]
    expect(observedRatePerWeek(two, TODAY)).toBeNull()
  })

  it('needs a real span, not three weigh-ins in one week', () => {
    const crammed = [
      { date: '2026-08-10', value: 200 },
      { date: '2026-08-11', value: 199 },
      { date: '2026-08-12', value: 198 },
    ]
    expect(observedRatePerWeek(crammed, TODAY)).toBeNull()
  })

  it('reads a steady cut as a steady cut', () => {
    const pts = [
      { date: '2026-07-01', value: 210 },
      { date: '2026-07-15', value: 207 },
      { date: '2026-08-01', value: 204 },
      { date: '2026-08-14', value: 201 },
    ]
    const r = observedRatePerWeek(pts, TODAY)!
    expect(r).toBeLessThan(0)
    expect(Math.abs(r)).toBeGreaterThan(0.8)
    expect(Math.abs(r)).toBeLessThan(2.5)
  })

  it('drops the water week off the front of a new deficit', () => {
    // Glycogen binds ~3 g of water per gram, so the first days of a cut
    // drop several pounds that were never fat and never come back as
    // fat. Regressing through them projects a rate nobody can hold.
    const pts = [
      { date: '2026-07-01', value: 212 },
      { date: '2026-07-05', value: 206 }, // the water
      { date: '2026-07-19', value: 204 },
      { date: '2026-08-02', value: 202 },
      { date: '2026-08-14', value: 200 },
    ]
    const raw = Math.abs(observedRatePerWeek(pts, TODAY)!)
    const trimmed = Math.abs(observedRatePerWeek(pts, TODAY, { skipFirstDays: 10 })!)
    expect(trimmed).toBeLessThan(raw)
  })
})

describe('a rung that has been reached', () => {
  it('scores a lift on the weight actually lifted, not an estimated max', () => {
    // Epley capped at 12 reps carries error wider than the 5 lb
    // increment being scored, so an e1RM-scored "bench 185" would light
    // up on a lucky set of twelve at 135.
    const d = base()
    d.sessions['2026-08-01'] = session('2026-08-01', 'bench-press', 135, 12)
    expect(readMetric(d, 'topSetLb', 'bench-press')).toBe(135)
  })

  it('does not un-reach when the next block deloads', () => {
    // THE property. A rung earned at 225 must survive the week that
    // follows logging 185, or the rail walks backwards.
    const d = base()
    d.plan.goal = 'strength'
    const lift = d.plan.trackedLifts[0].exerciseId
    // A real climb: walked in at 185, worked up past two plates.
    d.sessions['2026-03-02'] = session('2026-03-02', lift, 185)
    d.sessions['2026-07-01'] = session('2026-07-01', lift, 235)
    const hit = newlyReached(d, TODAY)
    expect(hit.length).toBeGreaterThan(0)

    // Stamp it, then log a deload week well below the target.
    d.journey = { hits: Object.fromEntries(hit.map((id) => [id, '2026-07-01'])) }
    d.sessions['2026-08-10'] = session('2026-08-10', lift, 165)
    const after = buildJourney(d, TODAY)
    for (const id of hit) {
      expect(after.rail.find((r) => r.id === id)?.state).toBe('done')
    }
  })

  it('will not let a scale rung light up on one dry morning', () => {
    // A scale swings two pounds on salt and sleep. One reading past a
    // rung is not a rung reached; it is a Tuesday.
    const d = base()
    d.plan.goal = 'lean'
    d.measurements = [weighIn('2026-06-01', 205), weighIn('2026-07-01', 202), weighIn('2026-08-14', 199.5)]
    const j = buildJourney(d, TODAY)
    const twoHundred = j.rail.find((r) => r.track === 'body' && r.target === 200)
    // 199.5 once, against a trailing mean still above 200.
    expect(twoHundred?.state).not.toBe('done')
  })

  it('counts a scale rung once it is genuinely held', () => {
    const d = base()
    d.plan.goal = 'lean'
    d.measurements = [
      weighIn('2026-06-01', 210),
      weighIn('2026-07-20', 201),
      weighIn('2026-08-08', 198.5),
      weighIn('2026-08-14', 198),
    ]
    const j = buildJourney(d, TODAY)
    const twoHundred = j.rail.find((r) => r.track === 'body' && r.target === 200)
    expect(twoHundred?.state).toBe('done')
  })

  it('counts a performance on one honest effort, because that is what a PR is', () => {
    // Making somebody dunk twice before the app admits they dunked
    // would be absurd. Performances and measurements are scored
    // differently on purpose.
    const d = base()
    d.plan.goal = 'vertical'
    // Baseline 8 inches over reach in March, 13 in August: the rim
    // landmark at 12 was cleared here, in the app, on one honest jump.
    d.measurements = [
      { date: '2026-03-01', vertIn: 8, photoIds: {} },
      { date: '2026-08-14', vertIn: 13, photoIds: {} },
    ]
    const j = buildJourney(d, TODAY)
    const rim = j.rail.find((r) => r.label === 'Touch the rim')
    expect(rim?.state).toBe('done')
  })

  it('stamps only what is new, and never restamps', () => {
    const d = base()
    d.plan.goal = 'strength'
    const lift = d.plan.trackedLifts[0].exerciseId
    d.sessions['2026-03-02'] = session('2026-03-02', lift, 185)
    d.sessions['2026-07-01'] = session('2026-07-01', lift, 235)
    const first = newlyReached(d, TODAY)
    expect(first.length).toBeGreaterThan(0)
    d.journey = { hits: Object.fromEntries(first.map((id) => [id, '2026-07-01'])) }
    expect(newlyReached(d, TODAY)).toEqual([])
  })
})

describe('the rail as a thing on a screen', () => {
  it('puts what is done above what is next, oldest first', () => {
    // The stack of ticks is the emotional payload of the whole screen,
    // and it only reads as a climb if it is in the order it happened.
    const d = base()
    d.plan.goal = 'general'
    d.journey = { hits: {} }
    const j = buildJourney(d, TODAY)
    const states = j.rail.map((r) => r.state)
    const lastDone = states.lastIndexOf('done')
    const firstAhead = states.findIndex((s) => s === 'next' || s === 'ahead')
    if (lastDone >= 0 && firstAhead >= 0) expect(lastDone).toBeLessThan(firstAhead)
  })

  it('orders deterministically, so rows do not swap between renders', () => {
    // ETAs recompute on every store write. Sorting the rail by ETA
    // would let rows trade places mid-animation.
    const d = base()
    const a = buildJourney(d, TODAY).rail.map((r) => r.id)
    const b = buildJourney(d, TODAY).rail.map((r) => r.id)
    expect(a).toEqual(b)
    expect(orderRail(buildJourney(d, TODAY).rail).map((r) => r.id)).toEqual(a)
  })

  it('marks exactly one rung per track as the one being climbed', () => {
    const d = base()
    const j = buildJourney(d, TODAY)
    for (const t of j.tracks) {
      expect(t.rungs.filter((r) => r.state === 'next').length).toBeLessThanOrEqual(1)
    }
  })

  it('gives every rung a sentence, because a bare number is not a goal', () => {
    const j = buildJourney(base(), TODAY)
    for (const r of j.rail) {
      expect(r.label.length).toBeGreaterThan(2)
      expect(r.detail.length).toBeGreaterThan(10)
    }
  })
})

describe('it updates when the athlete does something', () => {
  it('moves the ladder the moment a heavier set is logged', () => {
    const d = base()
    d.plan.goal = 'strength'
    const lift = d.plan.trackedLifts[0].exerciseId
    d.sessions['2026-08-01'] = session('2026-08-01', lift, 140)
    const before = buildJourney(d, TODAY)
    const beforeNext = before.rail.find((r) => r.exerciseId === lift && r.state === 'next')

    d.sessions['2026-08-12'] = session('2026-08-12', lift, 190)
    const after = buildJourney(d, TODAY)
    const afterNext = after.rail.find((r) => r.exerciseId === lift && r.state === 'next')
    expect(afterNext!.target).toBeGreaterThan(beforeNext!.target)
  })

  it('advances the consistency track off sessions alone', () => {
    const d = base()
    for (let i = 0; i < 12; i++) {
      d.sessions[`2026-07-${String(i + 1).padStart(2, '0')}`] = session(
        `2026-07-${String(i + 1).padStart(2, '0')}`,
        'bench-press',
        100,
      )
    }
    const j = buildJourney(d, TODAY)
    const ten = j.rail.find((r) => r.metric === 'sessions' && r.target === 10)
    expect(ten?.state).toBe('done')
  })
})

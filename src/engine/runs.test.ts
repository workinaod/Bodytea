import { describe, expect, it } from 'vitest'
import type { RunPoint } from '../types'
import { emptyAppData } from '../types'
import {
  acceptFix,
  avgMph,
  buildRunLog,
  estKcal,
  runGoalReview,
  compressTrack,
  fitBounds,
  fmtDuration,
  fmtPace,
  haversineMi,
  mileSplits,
  paceSecPerMi,
  totalDistanceMi,
  weeklyMiles,
} from './runs'

/** A straight north run: 1 minute of latitude ≈ 1.1508 miles. */
function straightTrack(miles: number, secPerMi: number): RunPoint[] {
  const pts: RunPoint[] = []
  const steps = Math.round(miles * 20) // a fix every ~0.05 mi
  for (let i = 0; i <= steps; i++) {
    const mi = (miles * i) / steps
    pts.push([40 + mi / 69.05, -74, Math.round(mi * secPerMi)])
  }
  return pts
}

describe('run math', () => {
  it('haversine matches a known distance (1° latitude ≈ 69 mi)', () => {
    expect(haversineMi(40, -74, 41, -74)).toBeCloseTo(69.05, 0)
  })

  it('accumulates distance and pace over a track', () => {
    const track = straightTrack(3, 600) // 3 mi at 10:00/mi
    expect(totalDistanceMi(track)).toBeCloseTo(3, 1)
    const pace = paceSecPerMi(totalDistanceMi(track), 1800)
    expect(fmtPace(pace)).toMatch(/^10:0\d\/mi$|^9:5\d\/mi$/)
    expect(mileSplits(track)).toHaveLength(3)
    expect(mileSplits(track)[0]).toBeGreaterThan(550)
  })

  it('rejects junk fixes: bad accuracy, teleports, standing jitter', () => {
    const prev: RunPoint = [40, -74, 100]
    expect(acceptFix(prev, 40.001, -74, 110, 99)).toBe(false) // accuracy
    expect(acceptFix(prev, 41, -74, 110, 10)).toBe(false) // 69 mi in 10 s
    expect(acceptFix(prev, 40.00001, -74, 105, 10)).toBe(false) // barely moved, too soon
    expect(acceptFix(prev, 40.001, -74, 110, 10)).toBe(true) // honest fix
    expect(acceptFix(null, 40, -74, 0, 10)).toBe(true) // first fix
  })

  it('compresses long tracks but keeps the endpoints', () => {
    const track = straightTrack(10, 600)
    const c = compressTrack(track, 50)
    expect(c.length).toBeLessThanOrEqual(52)
    expect(c[0]).toEqual(track[0])
    expect(c[c.length - 1]).toEqual(track[track.length - 1])
    expect(totalDistanceMi(c)).toBeCloseTo(10, 0)
  })

  it('builds a complete log and buckets weekly mileage', () => {
    const track = straightTrack(2, 540)
    const log = buildRunLog('r1', 'run', '2026-08-05', '2026-08-05T09:00:00Z', 1080, track)
    expect(log.distanceMi).toBeCloseTo(2, 1)
    expect(log.splits).toHaveLength(2)
    const data = emptyAppData('2026-08-03')
    data.runs.push(log, { ...log, id: 'r2', date: '2026-08-07' })
    const weeks = weeklyMiles(data, '2026-08-09', 4)
    expect(weeks[weeks.length - 1].value).toBeCloseTo(4, 0)
  })

  it('mph for rides and duration formatting', () => {
    expect(avgMph(15, 3600)).toBe(15)
    expect(fmtDuration(3725)).toBe('1:02:05')
    expect(fmtDuration(605)).toBe('10:05')
  })

  it('fitBounds picks a zoom that contains the whole track', () => {
    const track = straightTrack(3, 600)
    const { zoom } = fitBounds(track, 480, 220)
    expect(zoom).toBeGreaterThan(8)
    expect(zoom).toBeLessThanOrEqual(17)
  })
})

describe('estKcal', () => {
  it('lands on the ACSM table for a 6 mph run', () => {
    // 175 lb → 79.4 kg, 6 mph → 9.9 METs, 30 min → ~393 kcal
    expect(estKcal('run', 3, 1800, 175)).toBe(393)
  })
  it('rides burn less than runs at the same speed', () => {
    expect(estKcal('bike', 3, 1800, 175)).toBeLessThan(estKcal('run', 3, 1800, 175))
  })
  it('a treadmill run with no GPS distance still burns calories', () => {
    // The bug this fixes: half an hour of real running indoors scored
    // zero, because speed cannot be computed without distance. It falls
    // back to the activity's moderate MET instead of pretending nothing
    // happened.
    const indoors = estKcal('run', 0, 1800, 175)
    expect(indoors).toBeGreaterThan(300)
    expect(indoors).toBeLessThan(estKcal('bike', 0, 1800, 175) * 2)
  })

  it('walking is costed as walking, not as a slow run', () => {
    expect(estKcal('walk', 1.5, 1800, 175)).toBeLessThan(estKcal('run', 1.5, 1800, 175))
  })

  it('refuses junk inputs', () => {
    // Under a minute is a mis-tap, not a session, whatever the distance.
    expect(estKcal('run', 1, 30, 175)).toBe(0)
    expect(estKcal('run', 0, 0, 175)).toBe(0)
  })
})

describe('runGoalReview', () => {
  function dataWith(goal: 'endurance' | 'vertical', answers?: Record<string, string>) {
    const d = emptyAppData('2026-08-10', '2026-08-10')
    d.plan.goal = goal
    d.plan.goalAnswers = answers
    return d
  }
  const run = (id: string, date: string, mi: number, sec: number) => ({
    id, activity: 'run' as const, date, startedAt: `${date}T09:00:00.000Z`,
    durationSec: sec, distanceMi: mi, avgPaceSec: Math.round(sec / mi), splits: [], points: [],
  })

  it('marathon pickers get a marathon check-in with long-run guidance', () => {
    const d = dataWith('endurance', { 'race-distance': 'Marathon' })
    const log = run('r1', '2026-08-12', 4, 2400)
    d.runs.push(log)
    const rev = runGoalReview(d, log)!
    expect(rev.title).toBe('Marathon check-in')
    expect(rev.rows.some((r) => r.label === 'Race' && r.value.includes('26.2'))).toBe(true)
    expect(rev.notes.join(' ')).toContain('20 mi')
    expect(rev.notes.join(' ')).not.toContain('—')
  })

  it('a "marathon by fall" goal statement resolves without the picker', () => {
    const d = dataWith('vertical')
    d.plan.goalStatement = 'run a marathon by fall'
    const log = run('r1', '2026-08-12', 4, 2400)
    d.runs.push(log)
    expect(runGoalReview(d, log)?.title).toBe('Marathon check-in')
  })

  it('lifters with no run goal get nothing; endurance without a race still reviews', () => {
    const lifter = dataWith('vertical')
    const log = run('r1', '2026-08-12', 4, 2400)
    lifter.runs.push(log)
    expect(runGoalReview(lifter, log)).toBeNull()
    const noRace = dataWith('endurance')
    noRace.runs.push(log)
    expect(runGoalReview(noRace, log)?.title).toBe('Distance check-in')
  })

  it('rides never get a run review', () => {
    const d = dataWith('endurance', { 'race-distance': 'Marathon' })
    const log = { ...run('r1', '2026-08-12', 10, 2400), activity: 'bike' as const }
    expect(runGoalReview(d, log)).toBeNull()
  })
})

describe('every race length resolves', () => {
  const log = { id: 'r', activity: 'run' as const, date: '2026-08-12', startedAt: 't', durationSec: 2400, distanceMi: 4, avgPaceSec: 600, splits: [], points: [] }
  const at = (statement: string) => {
    const d = emptyAppData('2026-08-10', '2026-08-10')
    d.plan.goal = 'endurance'
    d.plan.goalStatement = statement
    d.runs.push(log)
    return runGoalReview(d, log)!
  }
  it('resolves ultras, halves, and short races from typed goals', () => {
    expect(at('run my first 50k ultra').title).toBe('Ultra check-in')
    expect(at('sub 2 half marathon').title).toBe('Half marathon check-in')
    expect(at('crush a 10k this fall').title).toBe('10K check-in')
    expect(at('first 5k with my daughter').title).toBe('5K check-in')
  })
  it('the ultra build asks for more than a marathon build', () => {
    const ultra = at('100 mile ultra')
    expect(ultra.rows.some((r) => r.label === 'Race' && r.value.includes('31'))).toBe(true)
    expect(ultra.notes.join(' ')).toContain('48 mi')
  })
})

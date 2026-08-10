import { describe, expect, it } from 'vitest'
import type { RunPoint } from '../types'
import { emptyAppData } from '../types'
import {
  acceptFix,
  avgMph,
  buildRunLog,
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

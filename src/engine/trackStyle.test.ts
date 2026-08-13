import { describe, expect, it } from 'vitest'
import type { RunPoint } from '../activityTypes'
import { segmentSpeedsMph, speedColor, speedRange } from './trackStyle'

/** Points spaced east at a fixed time step, so speed is controllable. */
function leg(count: number, degPerStep: number, secPerStep: number): RunPoint[] {
  return Array.from({ length: count }, (_, i) => [0, i * degPerStep, i * secPerStep] as RunPoint)
}

describe('segmentSpeedsMph', () => {
  it('returns one speed per segment', () => {
    expect(segmentSpeedsMph(leg(5, 0.001, 10))).toHaveLength(4)
  })

  it('is empty for a track too short to have a segment', () => {
    expect(segmentSpeedsMph(leg(1, 0.001, 10))).toEqual([])
    expect(segmentSpeedsMph([])).toEqual([])
  })

  it('reads faster when the same ground is covered in less time', () => {
    const slow = segmentSpeedsMph(leg(3, 0.001, 20))[0]
    const fast = segmentSpeedsMph(leg(3, 0.001, 5))[0]
    expect(fast).toBeGreaterThan(slow)
  })

  it('yields zero rather than Infinity when two fixes share a timestamp', () => {
    // Phones really do this, and one Infinity would poison every
    // percentile downstream.
    const pts: RunPoint[] = [
      [0, 0, 10],
      [0, 0.001, 10],
    ]
    expect(segmentSpeedsMph(pts)).toEqual([0])
  })
})

describe('speedRange', () => {
  it('ignores a single glitch segment at the top', () => {
    const speeds = [6, 6.2, 5.9, 6.1, 6, 5.8, 6.3, 6, 40]
    const { fast } = speedRange(speeds)
    // Without percentiles the 40 mph glitch would own the top of the
    // ramp and flatten the whole run into one colour.
    expect(fast).toBeLessThan(20)
  })

  it('widens a dead-steady effort so it does not become a rainbow', () => {
    const { slow, fast } = speedRange([6, 6, 6, 6, 6, 6])
    expect(fast - slow).toBeGreaterThanOrEqual(0.4)
  })

  it('falls back safely with almost no data', () => {
    const { slow, fast } = speedRange([])
    expect(fast).toBeGreaterThan(slow)
  })
})

describe('speedColor', () => {
  it('gives amber at the slow end and lime at the fast end', () => {
    expect(speedColor(4, 4, 8)).toBe('rgb(250,190,60)')
    expect(speedColor(8, 4, 8)).toBe('rgb(163,230,53)')
  })

  it('clamps rather than extrapolating past either end', () => {
    expect(speedColor(0, 4, 8)).toBe(speedColor(4, 4, 8))
    expect(speedColor(99, 4, 8)).toBe(speedColor(8, 4, 8))
  })

  it('always returns a parseable rgb triple', () => {
    for (const mph of [0, 3, 5.5, 7, 12, NaN]) {
      expect(speedColor(mph, 4, 8)).toMatch(/^rgb\(\d{1,3},\d{1,3},\d{1,3}\)$/)
    }
  })
})

import { describe, expect, it } from 'vitest'
import { E1RM_MAX_REPS, e1RM } from './stats'

describe('e1RM stays inside the formula s evidence', () => {
  it('matches Epley across the range it was fitted on', () => {
    expect(e1RM(225, 5)).toBe(263) // 225 × (1 + 5/30)
    expect(e1RM(135, 10)).toBe(180)
    expect(e1RM(100, 3)).toBe(110)
  })

  it('a max single estimates itself, not 3% more than itself', () => {
    // Epley's raw form returns 1.033 × weight at one rep, so a genuine
    // 200 lb single was recorded as a 207 lb max nobody had ever lifted.
    expect(e1RM(200, 1)).toBe(200)
    expect(e1RM(200, 0)).toBe(200)
  })

  it('stops extrapolating past the rep cap', () => {
    expect(e1RM(100, 20)).toBe(e1RM(100, E1RM_MAX_REPS))
    expect(e1RM(100, 50)).toBe(e1RM(100, E1RM_MAX_REPS))
  })

  it('a light high-rep set cannot outrank a genuinely heavy one', () => {
    // The inversion this cap exists to stop: uncapped Epley scored
    // 100 lb × 20 at 167 and 140 lb × 5 at 163, so the light set was
    // logged as a PR and drawn as a new strength high.
    expect(e1RM(100, 20)).toBeLessThan(e1RM(140, 5))
  })

  it('is still monotonic in weight and in reps up to the cap', () => {
    for (let reps = 1; reps <= E1RM_MAX_REPS; reps++) {
      expect(e1RM(100, reps)).toBeLessThanOrEqual(e1RM(105, reps))
    }
    for (let reps = 2; reps <= E1RM_MAX_REPS; reps++) {
      expect(e1RM(100, reps)).toBeGreaterThan(e1RM(100, reps - 1))
    }
  })
})

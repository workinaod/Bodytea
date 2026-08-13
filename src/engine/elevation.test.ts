import { describe, expect, it } from 'vitest'
import type { RunPoint } from '../activityTypes'
import {
  acceptsAltitude,
  currentGradePct,
  elevationStats,
  hasElevation,
  mToFt,
  smoothAltitudes,
} from './elevation'
import { climbKcal, estKcal } from './runs'
import { cardioKcal } from './intensity'
import { FLOOR_HEIGHT_M } from '../plan/cardio'

/**
 * Points along a straight eastward line at a fixed latitude. At the
 * equator 0.001° of longitude is ~111 m, which makes the horizontal
 * distances easy to reason about when checking a grade.
 */
function track(alts: (number | null)[], stepDeg = 0.001): RunPoint[] {
  return alts.map((a, i) =>
    a === null
      ? ([0, i * stepDeg, i * 30] as RunPoint)
      : ([0, i * stepDeg, i * 30, a] as RunPoint),
  )
}

describe('acceptsAltitude', () => {
  it('takes a confident fix', () => {
    expect(acceptsAltitude(120, 4)).toBe(true)
  })

  it('rejects a fix whose vertical accuracy is worse than the threshold', () => {
    expect(acceptsAltitude(120, 40)).toBe(false)
  })

  it('rejects a fix that states no accuracy at all', () => {
    // Some Android chipsets hand back an altitude with a null accuracy.
    // Believing it is exactly how flat ground grows mountains.
    expect(acceptsAltitude(120, null)).toBe(false)
    expect(acceptsAltitude(120, undefined)).toBe(false)
  })

  it('rejects a missing altitude', () => {
    expect(acceptsAltitude(null, 3)).toBe(false)
    expect(acceptsAltitude(undefined, 3)).toBe(false)
  })

  it('rejects altitudes off the face of the planet', () => {
    expect(acceptsAltitude(-2000, 2)).toBe(false)
    expect(acceptsAltitude(40000, 2)).toBe(false)
  })
})

describe('smoothAltitudes', () => {
  it('deletes a lone spike instead of spreading it', () => {
    // The median runs first precisely so this 60 m spike vanishes
    // rather than being averaged into its neighbours.
    const out = smoothAltitudes(track([100, 100, 160, 100, 100]))
    for (const a of out) expect(a as number).toBeLessThan(105)
  })

  it('keeps a real slope intact', () => {
    // A realistic length: the filter's window spans 5 fixes, so a track
    // only 5 fixes long is ALL edge and gets pulled flat. Sessions are
    // hundreds of fixes; the ends losing a little is the price of the
    // spike rejection above, and it is paid once, not per hill.
    const ramp = Array.from({ length: 40 }, (_, i) => 100 + i * 5)
    const out = smoothAltitudes(track(ramp))
    expect(out[0] as number).toBeLessThan(out[39] as number)
    expect((out[39] as number) - (out[0] as number)).toBeGreaterThan(170)
  })

  it('leaves gaps as gaps rather than inventing terrain', () => {
    const out = smoothAltitudes(track([100, null, 100, null, 100]))
    expect(out[1]).toBeNull()
    expect(out[3]).toBeNull()
  })

  it('returns all nulls when nothing carried an altitude', () => {
    expect(smoothAltitudes(track([null, null, null]))).toEqual([null, null, null])
  })
})

describe('elevationStats', () => {
  it('reports nothing for a track with no altitude', () => {
    expect(elevationStats(track([null, null, null])).samples).toBe(0)
    expect(elevationStats(track([null, null, null])).gainFt).toBe(0)
  })

  it('does not turn flat-ground noise into a climb', () => {
    // A phone on level ground, wobbling ±2 m all session. Every one of
    // these fixes is individually plausible; summing the differences
    // naively reports tens of metres of climb. The right answer is 0.
    const noise = [100, 102, 98, 101, 99, 102, 98, 100, 101, 99, 100, 98, 102, 100]
    const stats = elevationStats(track(noise))
    expect(stats.gainFt).toBe(0)
    expect(stats.lossFt).toBe(0)
  })

  it('banks a genuine hill', () => {
    // 200 m up over 50 fixes, held at the top, then back down: the
    // shape of an out-and-back over a ridge.
    const up = Array.from({ length: 50 }, (_, i) => 100 + i * 4)
    const summit = Array.from({ length: 10 }, () => 296)
    const stats = elevationStats(track([...up, ...summit, ...[...up].reverse()]))
    // 196 m climbed ≈ 643 ft. Smoothing rounds the shoulders, so allow
    // a margin either side rather than demanding the exact figure.
    expect(stats.gainFt).toBeGreaterThan(580)
    expect(stats.gainFt).toBeLessThan(680)
    expect(stats.lossFt).toBeGreaterThan(580)
    expect(stats.lossFt).toBeLessThan(680)
  })

  it('reports the high and low water marks', () => {
    const up = Array.from({ length: 30 }, (_, i) => 100 + i * 5)
    const stats = elevationStats(track([...up, ...[...up].reverse()]))
    expect(stats.maxFt).toBeGreaterThan(stats.minFt as number)
    expect(stats.minFt).toBeLessThan(mToFt(140))
    expect(stats.maxFt).toBeGreaterThan(mToFt(200))
  })

  it('measures a noisy climb close to the truth', () => {
    // What a real recording looks like: a steady 150 m climb with the
    // ±3 m jitter a phone actually produces on every fix. Deterministic
    // pseudo-noise, so this test cannot flake.
    const alts = Array.from({ length: 120 }, (_, i) => {
      const jitter = ((Math.sin(i * 12.9898) * 43758.5453) % 1) * 6 - 3
      return 200 + i * 1.25 + jitter
    })
    const stats = elevationStats(track(alts))
    // Truth is 148.75 m ≈ 488 ft. The noise must not add a second hill.
    expect(stats.gainFt).toBeGreaterThan(420)
    expect(stats.gainFt).toBeLessThan(560)
    // And a monotonic climb should bank almost no descent.
    expect(stats.lossFt).toBeLessThan(60)
  })

  it('survives a single lonely altitude', () => {
    const stats = elevationStats(track([100]))
    expect(stats.gainFt).toBe(0)
    expect(stats.samples).toBe(1)
  })

  it('ignores points with no altitude when measuring', () => {
    // Half the fixes lost their altitude — under trees, in a street
    // canyon — and the climb still has to come out of what survived.
    const withGaps = Array.from({ length: 60 }, (_, i) => (i % 2 === 0 ? 100 + i * 3 : null))
    const stats = elevationStats(track(withGaps))
    expect(stats.gainFt).toBeGreaterThan(400)
    expect(stats.samples).toBe(30)
  })
})

describe('hasElevation', () => {
  it('is false for a track recorded before altitude existed', () => {
    expect(hasElevation(track([null, null]))).toBe(false)
  })
  it('is true once any fix carried one', () => {
    expect(hasElevation(track([null, 100, null]))).toBe(true)
  })
})

describe('currentGradePct', () => {
  it('is zero on the flat', () => {
    expect(currentGradePct(track([100, 100, 100, 100, 100, 100]))).toBe(0)
  })

  it('reads positive going up and negative coming down', () => {
    const up = track([100, 105, 110, 115, 120, 125, 130])
    expect(currentGradePct(up)).toBeGreaterThan(0)
    const down = track([130, 125, 120, 115, 110, 105, 100])
    expect(currentGradePct(down)).toBeLessThan(0)
  })

  it('never returns a cliff face from two noisy fixes', () => {
    // Two points a metre apart with a 20 m altitude disagreement is a
    // 2000% grade if you divide naively. The lookback exists to stop
    // exactly that reaching the readout.
    const tight = track([100, 120], 0.00001)
    expect(Math.abs(currentGradePct(tight))).toBeLessThanOrEqual(45)
  })

  it('is zero when there is nothing to measure', () => {
    expect(currentGradePct(track([]))).toBe(0)
    expect(currentGradePct(track([100]))).toBe(0)
    expect(currentGradePct(track([null, null]))).toBe(0)
  })
})

describe('climbKcal', () => {
  it('charges nothing for flat ground', () => {
    expect(climbKcal(0, 175)).toBe(0)
    expect(climbKcal(-50, 175)).toBe(0)
  })

  it('lands on the field rule of ~1 kcal per kg per 100 m', () => {
    // 175 lb ≈ 79.4 kg, up 305 m (1,000 ft) ≈ 79.4 × 3.05 ≈ 242 kcal.
    const kcal = climbKcal(305, 175)
    expect(kcal).toBeGreaterThan(215)
    expect(kcal).toBeLessThan(270)
  })

  it('scales with bodyweight', () => {
    expect(climbKcal(300, 250)).toBeGreaterThan(climbKcal(300, 130))
  })
})

describe('estKcal with climb', () => {
  it('bills a hilly hour above a flat one at the same pace', () => {
    const flat = estKcal('run', 6, 3600, 175, 0)
    const hilly = estKcal('run', 6, 3600, 175, 300)
    expect(hilly).toBeGreaterThan(flat)
  })

  it('leaves flat sessions exactly as they were', () => {
    // The parameter defaults, so every existing caller is unaffected.
    expect(estKcal('run', 6, 3600, 175)).toBe(estKcal('run', 6, 3600, 175, 0))
  })

  it('bills the climb even when GPS measured no distance', () => {
    // A stair session or a trail with no usable horizontal fix still
    // did the vertical work.
    expect(estKcal('hike', 0, 3600, 175, 200)).toBeGreaterThan(estKcal('hike', 0, 3600, 175, 0))
  })

  it('applies to all four GPS activities', () => {
    for (const a of ['run', 'bike', 'walk', 'hike'] as const) {
      expect(estKcal(a, 4, 3600, 175, 250)).toBeGreaterThan(estKcal(a, 4, 3600, 175, 0))
    }
  })
})

describe('stair machine floors', () => {
  const base = { activityId: 'stairs', minutes: 30, bodyweightLb: 175 }

  it('bills the climb on top of the machine MET', () => {
    const withFloors = cardioKcal({ ...base, floors: 60 })
    const without = cardioKcal({ ...base, floors: 0 })
    expect(withFloors.kcal).toBeGreaterThan(without.kcal)
    expect(withFloors.climbKcal).toBeGreaterThan(0)
  })

  it('separates level 4 from level 14 at identical duration', () => {
    // Same half hour on the machine. The floors are the only thing
    // that says one was twice the work, which is the entire reason
    // the console number is worth typing in.
    const easy = cardioKcal({ ...base, floors: 40 })
    const hard = cardioKcal({ ...base, floors: 100 })
    expect(hard.kcal).toBeGreaterThan(easy.kcal)
  })

  it('leaves every other activity untouched', () => {
    // No floors entered anywhere else, so nothing already logged
    // changes value.
    expect(cardioKcal({ activityId: 'swim', minutes: 30, bodyweightLb: 175 }).climbKcal).toBe(0)
    expect(cardioKcal({ activityId: 'stairs', minutes: 30, bodyweightLb: 175 }).climbKcal).toBe(0)
  })

  it('a floor is ten feet, matching what the console means', () => {
    expect(mToFt(FLOOR_HEIGHT_M)).toBe(10)
  })
})

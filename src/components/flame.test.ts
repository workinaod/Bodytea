import { describe, expect, it } from 'vitest'
import { FLAME_TIERS } from '../plan/achievements'
import { RUNG } from './Flame'

// ============================================================
// Every rung must LOOK like a rung.
//
// This exists because it did not. The styling was keyed to the
// seven coarse levels in the plan data while the ladder has
// eleven rungs, so day 14 rendered pixel-identical to day 7 and
// day 500 to day 365. Three of the eleven progressions changed
// nothing, and a progression that changes nothing teaches people
// that the ladder is decoration.
//
// So: a row per rung, and every axis strictly moves. Adding a
// rung to FLAME_TIERS without giving it a look now fails here
// rather than shipping as a silent duplicate.
// ============================================================

describe('the flame ladder', () => {
  it('has a look for every rung, and no rung the ladder does not have', () => {
    const rungs = FLAME_TIERS.map((t) => t.from)
    expect(Object.keys(RUNG).map(Number).sort((a, b) => a - b)).toEqual([...rungs].sort((a, b) => a - b))
  })

  it('gets bigger at every single step', () => {
    const scales = FLAME_TIERS.map((t) => RUNG[t.from].scale)
    for (let i = 1; i < scales.length; i++) {
      expect(scales[i], `${FLAME_TIERS[i].name} is not bigger than ${FLAME_TIERS[i - 1].name}`).toBeGreaterThan(
        scales[i - 1],
      )
    }
  })

  it('gets faster at every single step', () => {
    const speeds = FLAME_TIERS.map((t) => RUNG[t.from].speed)
    for (let i = 1; i < speeds.length; i++) {
      expect(speeds[i], `${FLAME_TIERS[i].name} does not burn faster than ${FLAME_TIERS[i - 1].name}`).toBeLessThan(
        speeds[i - 1],
      )
    }
  })

  it('never throws fewer embers than the rung below', () => {
    const embers = FLAME_TIERS.map((t) => RUNG[t.from].embers)
    expect(embers[0], 'day one should throw nothing').toBe(0)
    for (let i = 1; i < embers.length; i++) {
      expect(embers[i]).toBeGreaterThan(embers[i - 1])
    }
  })

  it('burns more tongues as it climbs, because a blaze is not a big wisp', () => {
    const tongues = FLAME_TIERS.map((t) => RUNG[t.from].tongues)
    expect(tongues[0], 'day one is one wisp').toBe(1)
    expect(tongues[tongues.length - 1]).toBeGreaterThanOrEqual(8)
    for (let i = 1; i < tongues.length; i++) {
      expect(tongues[i], `${FLAME_TIERS[i].name} burns fewer tongues than the rung below`).toBeGreaterThanOrEqual(
        tongues[i - 1],
      )
    }
  })

  it('widens its bed and grows taller at every step', () => {
    const beds = FLAME_TIERS.map((t) => RUNG[t.from].bed)
    const heights = FLAME_TIERS.map((t) => RUNG[t.from].height)
    for (let i = 1; i < beds.length; i++) {
      expect(beds[i]).toBeGreaterThan(beds[i - 1])
      expect(heights[i]).toBeGreaterThan(heights[i - 1])
    }
  })

  it('starts small enough to be losable and ends big enough to be worth keeping', () => {
    const first = RUNG[FLAME_TIERS[0].from]
    const last = RUNG[FLAME_TIERS[FLAME_TIERS.length - 1].from]
    expect(first.glow).toBe('none')
    expect(last.scale / first.scale).toBeGreaterThan(3)
  })
})

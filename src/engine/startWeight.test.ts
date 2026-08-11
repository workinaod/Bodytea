import { describe, expect, it } from 'vitest'
import { getExercise } from '../plan/exercises'
import { suggestedStartWeight, type Experience } from './startWeight'

const LEVELS: Experience[] = ['new', 'returning', 'trained']

describe('suggestedStartWeight', () => {
  it('returns null for unloaded movements', () => {
    expect(suggestedStartWeight(getExercise('box-jump'), 175, 'trained')).toBeNull()
  })

  it('seeds a per-dumbbell weight for DB pressing', () => {
    const def = getExercise('incline-db-press')
    // 175 lb returning lifter: 0.16 × 175 ≈ 28 → rounds to 30 per hand
    expect(suggestedStartWeight(def, 175, 'returning')).toBe(30)
  })

  it('treats a goblet squat as one total dumbbell', () => {
    const def = getExercise('goblet-squat')
    // 175 lb returning: 0.22 × 175 ≈ 38.5 → 40 lb goblet
    expect(suggestedStartWeight(def, 175, 'returning')).toBe(40)
  })

  it('seeds bar movements as total load', () => {
    const def = getExercise('ez-bar-curl')
    expect(suggestedStartWeight(def, 175, 'returning')).toBe(35)
  })

  it('never suggests below 5 lb and scales with experience', () => {
    for (const id of ['incline-db-press', 'goblet-squat', 'one-arm-db-row', 'ez-bar-curl']) {
      const def = getExercise(id)
      const w = LEVELS.map((lv) => suggestedStartWeight(def, 175, lv)!)
      expect(Math.min(...w)).toBeGreaterThanOrEqual(5)
      // more history → equal or heavier start
      expect(w[0]).toBeLessThanOrEqual(w[1])
      expect(w[1]).toBeLessThanOrEqual(w[2])
      // multiples of 5, always
      for (const x of w) expect(x % 5).toBe(0)
    }
  })

  it('clamps absurd bodyweights and defaults a missing one', () => {
    const def = getExercise('incline-db-press')
    expect(suggestedStartWeight(def, 0, 'returning')).toBe(suggestedStartWeight(def, 175, 'returning'))
    expect(suggestedStartWeight(def, 5000, 'returning')).toBe(suggestedStartWeight(def, 330, 'returning'))
  })
})

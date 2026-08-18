import { describe, expect, it } from 'vitest'
import type { EquipTag } from '../types'
import { EXERCISES } from './exercises'
import { canDo } from './equip'
import { parseRepRange } from '../engine/reps'
import {
  GENERAL_WORKOUTS,
  MIN_FITTED_ITEMS,
  generalWorkoutsFor,
} from './generalWorkouts'

// Everything a plan can own; fitting against it must change nothing.
const FULL_GYM: EquipTag[] = [
  'none', 'dumbbell', 'barbell', 'bench', 'incline-bench', 'rack', 'pullup-bar',
  'box', 'plate', 'machine', 'open-space', 'hill-stairs', 'court', 'treadmill',
  'cones', 'band', 'hurdle', 'med-ball', 'kettlebell', 'trap-bar', 'sled', 'partner',
]

describe('general workouts shelf', () => {
  it('every item is a real catalog exercise', () => {
    for (const w of GENERAL_WORKOUTS) {
      for (const item of w.items) {
        expect(EXERCISES[item.exerciseId], `${w.id}: ${item.exerciseId}`).toBeDefined()
      }
    }
  })

  it('workout ids are unique and every workout is worth doing as authored', () => {
    const ids = GENERAL_WORKOUTS.map((w) => w.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const w of GENERAL_WORKOUTS) {
      expect(w.items.length, `${w.id} items`).toBeGreaterThanOrEqual(MIN_FITTED_ITEMS)
      expect(w.minutes, `${w.id} minutes`).toBeGreaterThan(0)
      expect(w.tagline.length, `${w.id} tagline`).toBeGreaterThan(10)
    }
  })

  it('prescriptions use the template vocabulary', () => {
    for (const w of GENERAL_WORKOUTS) {
      for (const item of w.items) {
        expect(item.sets, `${w.id}: ${item.exerciseId} sets`).toBeGreaterThanOrEqual(1)
        expect(item.repText.trim().length, `${w.id}: ${item.exerciseId} repText`).toBeGreaterThan(0)
        // A plain leading count that is not timed must carry repsNum, the
        // same convention TemplateEntry follows, so rep-only drills halve
        // and the rep engine can read the ask.
        const plain = /^\d+(\s*\/\s*\w+)?$/.test(item.repText.trim())
        if (plain) {
          expect(item.repsNum, `${w.id}: ${item.exerciseId} repsNum`).toBeDefined()
        }
        // Ranges must parse, or the collapse to one number cannot happen.
        if (/\d+\s*[-–]\s*\d+\s*$/.test(item.repText.trim())) {
          expect(parseRepRange(item.repText), `${w.id}: ${item.exerciseId} range`).not.toBeNull()
        }
      }
    }
  })

  it('a full gym gets the whole shelf, exactly as authored', () => {
    const fitted = generalWorkoutsFor(FULL_GYM)
    expect(fitted.map((w) => w.id)).toEqual(GENERAL_WORKOUTS.map((w) => w.id))
    for (const [i, w] of fitted.entries()) {
      expect(w.items).toEqual(GENERAL_WORKOUTS[i].items)
    }
  })

  it('a bare floor still gets real workouts, and every item is runnable', () => {
    const owned: EquipTag[] = ['none']
    const fitted = generalWorkoutsFor(owned)
    // The bodyweight staples must survive with nothing owned.
    const ids = fitted.map((w) => w.id)
    for (const id of ['no-gear-burner', 'hotel-room', 'core-15', 'mobility-reset', 'morning-wake']) {
      expect(ids, id).toContain(id)
    }
    // The guard bites: nothing on the fitted shelf asks for gear the
    // athlete does not own.
    const ownedSet = new Set(owned)
    for (const w of fitted) {
      for (const item of w.items) {
        expect(canDo(item.exerciseId, ownedSet), `${w.id}: ${item.exerciseId}`).toBe(true)
      }
      expect(w.items.length, `${w.id} fitted size`).toBeGreaterThanOrEqual(MIN_FITTED_ITEMS)
    }
  })

  it('drops a workout that substitution collapses below usefulness', () => {
    // Push Day Express on a bare floor: every press degrades to push-up
    // or pike push-up, dedupe leaves two movements, and two movements is
    // not a push day. Shown with holes it would be a lie; it is dropped.
    const fitted = generalWorkoutsFor(['none'])
    expect(fitted.map((w) => w.id)).not.toContain('push-express')
  })

  it('substitutes rather than drops when a substitute exists', () => {
    // Full Body in 30 with dumbbells only: the press has no bench, so it
    // degrades through the chain instead of vanishing.
    const fitted = generalWorkoutsFor(['none', 'dumbbell'])
    const full30 = fitted.find((w) => w.id === 'full-body-30')
    expect(full30).toBeDefined()
    const ids = full30!.items.map((i) => i.exerciseId)
    expect(ids).not.toContain('flat-db-press')
    expect(ids).toContain('goblet-squat')
    const ownedSet = new Set<EquipTag>(['none', 'dumbbell'])
    for (const id of ids) expect(canDo(id, ownedSet), id).toBe(true)
  })
})

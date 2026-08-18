import { describe, expect, it } from 'vitest'
import { emptyAppData, type AppData, type SessionLog } from '../types'
import { addDaysISO } from './calendar'
import { repStepFor, type RepRange } from './reps'

// ============================================================
// A plate is only an increment if it is the right size.
//
// ACSM's band is 2 to 10 percent of the working load, and the split is
// that large-muscle compounds take the top of it and small single-joint
// work takes the bottom (R3 3.2, source S1). Five pounds on a 20 lb
// lateral raise is 25 percent. The range topping out was earning that
// jump anyway, and the set after it is one somebody misses, which the
// rest of the engine then reads as a movement that is failing.
//
// The load steps are what they are. Gyms stock 5 lb plates and dumbbell
// racks that climb in fives, so the answer is not a smaller plate. It is
// to spend that exposure on a rep instead, and take the plate when the
// top of the range comes round a second time.
// ============================================================

const START = '2026-08-10'
const RANGE: RepRange = { low: 8, high: 12 }

function data(): AppData {
  const d = emptyAppData(START, START)
  d.settings.onboarded = true
  return d
}

function past(d: AppData, date: string, exerciseId: string, target: number, weightLb?: number) {
  d.sessions[date] = {
    date,
    templateId: 'tuesday',
    status: 'completed',
    exercises: [
      {
        exerciseId,
        sets: [0, 1, 2].map(() => ({ targetReps: String(target), done: true, weightLb })),
      },
    ],
  } as SessionLog
}

describe('a plate too big to be a step', () => {
  it('spends the exposure on a rep instead, on a light lateral raise', () => {
    // 5 lb on 20 lb is 25 percent. Nowhere near the band.
    const d = data()
    past(d, addDaysISO(START, -7), 'lateral-raise', 12, 20)
    const step = repStepFor(d, 'lateral-raise', RANGE, START)
    expect(step.wrapped).toBe(false)
    // Holds AT the top, which is the whole point. Resetting to 8 at the
    // same weight would be less work than last week for a cleared week.
    expect(step.reps).toBe(12)
  })

  it('takes the plate when the top comes round a second time', () => {
    // One repeat is a hold. Two is a stall, and a rep target that never
    // moves again is the same bug this engine was written to end.
    const d = data()
    past(d, addDaysISO(START, -14), 'lateral-raise', 12, 20)
    past(d, addDaysISO(START, -7), 'lateral-raise', 12, 20)
    const step = repStepFor(d, 'lateral-raise', RANGE, START)
    expect(step.wrapped).toBe(true)
    expect(step.reps).toBe(8)
  })

  it('wraps normally once the same lift is heavy enough', () => {
    // 5 lb on 60 lb is 8.3 percent, inside the band. Nothing to fix.
    const d = data()
    past(d, addDaysISO(START, -7), 'lateral-raise', 12, 60)
    expect(repStepFor(d, 'lateral-raise', RANGE, START).wrapped).toBe(true)
  })

  it('leaves compounds alone even when they are light', () => {
    // Somebody pressing the 30s takes the 35s. That is a 17 percent jump
    // and it is also just how a dumbbell rack works. The band is for a
    // lift with room to be precise, not an argument for stalling novices.
    const d = data()
    past(d, addDaysISO(START, -7), 'flat-db-press', 12, 30)
    expect(repStepFor(d, 'flat-db-press', RANGE, START).wrapped).toBe(true)
  })

  it('leaves unloaded work alone, which has no plate at all', () => {
    const d = data()
    past(d, addDaysISO(START, -7), 'push-up', 12, undefined)
    expect(repStepFor(d, 'push-up', RANGE, START).wrapped).toBe(true)
  })

  it('leaves a movement the muscle map has never heard of alone', () => {
    // An unknown id has no primary regions, so it cannot be proven small.
    // Guessing "small" for anything unrecognised would stall the whole
    // athletic library, which the map covers only in part.
    const d = data()
    past(d, addDaysISO(START, -7), 'not-a-real-exercise', 12, 20)
    expect(repStepFor(d, 'not-a-real-exercise', RANGE, START).wrapped).toBe(true)
  })

  it('does not fire before the top of the range', () => {
    // Mid-range the next step was always a rep. The rule must not read as
    // "hold" somewhere it was never going to add load anyway.
    const d = data()
    past(d, addDaysISO(START, -7), 'lateral-raise', 9, 20)
    const step = repStepFor(d, 'lateral-raise', RANGE, START)
    expect(step).toEqual({ reps: 10, wrapped: false, backOff: false, staleSteps: 0 })
  })

  it('still hands a long layoff back to the bottom, not the top', () => {
    // Time away outranks everything above it. Coming back after two
    // months to the top of the range is how a plan loses somebody in
    // their first week back.
    const d = data()
    past(d, addDaysISO(START, -60), 'lateral-raise', 12, 20)
    const step = repStepFor(d, 'lateral-raise', RANGE, START)
    expect(step.reps).toBe(8)
    expect(step.wrapped).toBe(false)
    expect(step.staleSteps).toBeGreaterThan(0)
  })
})

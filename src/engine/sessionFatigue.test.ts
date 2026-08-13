import { describe, expect, it } from 'vitest'
import type { ExerciseLog, SetLog } from '../sessionTypes'
import { isAutomatic, respondToSet, SHORTFALL_TO_ACT } from './sessionFatigue'

// ============================================================
// "The third set came out at five of eight and the app asked me
// for eight again."
//
// Everything the engine knew about a set going badly reached the
// athlete as a button, and a button you have to notice mid-set is
// a button most people miss. So the session kept asking for a
// weight that had already been shown to be too much, and then
// wrote the failures into the log as though they were the
// athlete's.
//
// The line these tests defend: the LOAD comes down on its own and
// says why, and WORK is never removed without being asked.
// ============================================================

const set = (o: Partial<SetLog> = {}): SetLog => ({
  targetReps: '8',
  weightLb: 100,
  reps: 8,
  done: false,
  ...o,
})

const log = (sets: SetLog[], o: Partial<ExerciseLog> = {}): ExerciseLog => ({
  exerciseId: 'goblet-squat',
  sets,
  ...o,
})

describe('where the automatic line is drawn', () => {
  it('moves the weight by itself and never the work', () => {
    expect(isAutomatic('drop-load')).toBe(true)
    expect(isAutomatic('offer-ease')).toBe(false)
  })
})

describe('a set that came up short', () => {
  it('takes the weight down for the sets still to come', () => {
    const res = respondToSet(log([set({ done: true, achieved: 5 }), set(), set()]), 0)
    expect(res?.kind).toBe('drop-load')
    expect(res!.weightLb!).toBeLessThan(100)
    expect(res!.because).toMatch(/short/)
  })

  it('says the new number out loud, because an unexplained change is a bug report', () => {
    const res = respondToSet(log([set({ done: true, achieved: 5 }), set()]), 0)
    expect(res!.because).toContain(String(res!.weightLb))
    expect(res!.because).not.toMatch(/—/)
  })

  it('ignores a miss by one, which is a rep and not a verdict', () => {
    const near = 8 - (SHORTFALL_TO_ACT - 1)
    expect(respondToSet(log([set({ done: true, achieved: near }), set()]), 0)).toBeNull()
  })

  it('does nothing when the set was hit', () => {
    expect(respondToSet(log([set({ done: true }), set()]), 0)).toBeNull()
    expect(respondToSet(log([set({ done: true, achieved: 8 }), set()]), 0)).toBeNull()
  })

  it('has nothing to say about the last set of a movement', () => {
    expect(respondToSet(log([set({ done: true }), set({ done: true, achieved: 4 })]), 1)).toBeNull()
  })

  it('stays out of the way once the athlete has already dropped it themselves', () => {
    // They took 100 down to 85 for the remaining sets. That decision stands.
    const res = respondToSet(log([set({ done: true, achieved: 5 }), set({ weightLb: 85 })]), 0)
    expect(res).toBeNull()
  })
})

describe('an empty tank', () => {
  it('drops the load when nothing was left and the reps went with it', () => {
    const res = respondToSet(log([set({ done: true, achieved: 7 }), set()], { rir: 0 }), 0)
    expect(res?.kind).toBe('drop-load')
    expect(res!.because).toMatch(/tank/)
  })

  it('leaves a hard set that still hit its number alone', () => {
    expect(respondToSet(log([set({ done: true }), set()], { rir: 0 }), 0)).toBeNull()
  })
})

describe('the weight already coming down inside a movement', () => {
  it('stops treating it as a load problem and offers to shorten the day', () => {
    // Set 1 at 100, set 2 taken down to 90 by the athlete and completed.
    // Nothing to fix on the bar; this is the day running out.
    const res = respondToSet(
      log([set({ done: true }), set({ done: true, weightLb: 90 }), set({ weightLb: 90 })]),
      1,
    )
    expect(res?.kind).toBe('offer-ease')
    expect(isAutomatic(res!.kind)).toBe(false)
    expect(res!.weightLb).toBeUndefined()
  })
})

describe('the load never becomes a fiction', () => {
  it('always moves by a real amount, at every weight in the domain', () => {
    for (let w = 10; w <= 400; w += 5) {
      const res = respondToSet(log([set({ done: true, weightLb: w, achieved: 4 }), set({ weightLb: w })]), 0)
      if (!res) continue
      expect(res.weightLb, `${w} lb`).toBeLessThan(w)
      expect(res.weightLb, `${w} lb`).toBeGreaterThan(0)
    }
  })

  it('says nothing on bodyweight work, where there is no weight to take off', () => {
    expect(respondToSet(log([set({ done: true, weightLb: undefined, achieved: 3 }), set()]), 0)).toBeNull()
  })
})

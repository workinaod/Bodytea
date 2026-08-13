import { describe, expect, it } from 'vitest'
import { emptyAppData, type AppData, type SessionLog } from '../types'
import type { SetLog } from '../sessionTypes'
import { addDaysISO } from './calendar'
import { repStepFor, STALE_DAYS } from './reps'
import { nextSessionSuggestions, SHORT_SESSIONS_TO_ACT } from './fatigue'

// ============================================================
// The progression that stopped progressing.
//
// An athlete on an 8-12 range who did exactly what the app asked,
// every week, got this: 8, 9, 10, 11, and then 11 forever. The
// weight never moved off the number they started with.
//
// The cause was that the rule read SetLog.reps, which is a copy
// of the prescription taken when the session skeleton is built
// and never written again. Nothing in the app updates it: there
// is no reps input, and patchSet is only ever called with `done`
// or `weightLb`. So the moment the climbing target passed that
// frozen number, every set stopped counting as cleared, the range
// never reached its top, the wrap never fired, and the load never
// got the step the wrap is supposed to hand it.
//
// These tests walk the whole cycle rather than checking one step,
// because a single step looked correct the entire time it was
// broken. Only the fourth week tells you anything.
// ============================================================

const START = '2026-08-10'
const RANGE = { low: 8, high: 12 }

const fresh = (): AppData => {
  const d = emptyAppData(START, START)
  d.settings.onboarded = true
  return d
}

/**
 * A logged session. `achieved` is left off unless the athlete came up
 * short, which is exactly how the app writes it: absent means the ask
 * was met.
 */
function logged(
  d: AppData,
  date: string,
  exerciseId: string,
  opts: { target: number; weightLb: number; achieved?: number; light?: boolean; rir?: number },
) {
  const set: SetLog = {
    targetReps: String(opts.target),
    weightLb: opts.weightLb,
    // The prescription echo the old rule was reading. Deliberately stale
    // and deliberately wrong, because that is the production shape.
    reps: 10,
    done: true,
    ...(opts.achieved !== undefined ? { achieved: opts.achieved } : {}),
    ...(opts.light ? { light: true } : {}),
  }
  d.sessions[date] = {
    date,
    templateId: 'tuesday',
    status: 'completed',
    exercises: [
      {
        exerciseId,
        sets: [set, { ...set }, { ...set }],
        ...(opts.rir !== undefined ? { rir: opts.rir } : {}),
      },
    ],
  } as SessionLog
}

describe('a full double-progression cycle', () => {
  it('climbs the range, wraps at the top, and hands the step to the bar', () => {
    const d = fresh()
    const seen: { reps: number; wrapped: boolean }[] = []
    let weight = 100

    for (let week = 0; week < 11; week++) {
      const date = addDaysISO(START, week * 7)
      const step = repStepFor(d, 'goblet-squat', RANGE, date)
      if (step.wrapped) weight += 10
      seen.push({ reps: step.reps, wrapped: step.wrapped })
      logged(d, date, 'goblet-squat', { target: step.reps, weightLb: weight })
    }

    // Every rung of the range, then back to the bottom. Not 8, 9, 10, 11, 11, 11.
    expect(seen.map((s) => s.reps)).toEqual([8, 9, 10, 11, 12, 8, 9, 10, 11, 12, 8])
    // And the wrap actually fired, twice, which is what moves the load.
    expect(seen.filter((s) => s.wrapped)).toHaveLength(2)
    expect(weight).toBe(120)
  })

  it('does not stall at the top of a wide range', () => {
    const d = fresh()
    const wide = { low: 6, high: 15 }
    let last = 0
    for (let week = 0; week < 10; week++) {
      const date = addDaysISO(START, week * 7)
      const step = repStepFor(d, 'goblet-squat', wide, date)
      last = step.reps
      logged(d, date, 'goblet-squat', { target: step.reps, weightLb: 100 })
    }
    expect(last).toBe(15)
  })
})

describe('history written before any of this existed', () => {
  it('reads a set that was ticked off as the clear it actually was', () => {
    const d = fresh()
    // No `achieved` anywhere, the shape every existing user has on disk.
    logged(d, START, 'goblet-squat', { target: 11, weightLb: 100 })
    const step = repStepFor(d, 'goblet-squat', RANGE, addDaysISO(START, 7))
    expect(step.reps).toBe(12)
    expect(step.backOff).toBe(false)
  })

  it('resumes a lift that the old rule had frozen', () => {
    const d = fresh()
    // Where a stuck athlete actually sits: parked at 11 of an 8-12.
    for (let week = 0; week < 4; week++) {
      logged(d, addDaysISO(START, week * 7), 'goblet-squat', { target: 11, weightLb: 100 })
    }
    const step = repStepFor(d, 'goblet-squat', RANGE, addDaysISO(START, 28))
    expect(step.reps).toBe(12)
  })
})

describe('coming up short', () => {
  it('holds the number rather than asking for more', () => {
    const d = fresh()
    logged(d, START, 'goblet-squat', { target: 10, weightLb: 100, achieved: 7 })
    const step = repStepFor(d, 'goblet-squat', RANGE, addDaysISO(START, 7))
    expect(step.reps).toBe(10)
    expect(step.wrapped).toBe(false)
  })

  it('only gives load back when it was also all the athlete had', () => {
    const d = fresh()
    logged(d, START, 'goblet-squat', { target: 10, weightLb: 100, achieved: 7, rir: 0 })
    expect(repStepFor(d, 'goblet-squat', RANGE, addDaysISO(START, 7)).backOff).toBe(true)

    const easy = fresh()
    logged(easy, START, 'goblet-squat', { target: 10, weightLb: 100, achieved: 7, rir: 3 })
    expect(repStepFor(easy, 'goblet-squat', RANGE, addDaysISO(START, 7)).backOff).toBe(false)
  })
})

describe('a hard day is not a hard lift', () => {
  it('lets a movement that went well keep climbing on a day that did not', () => {
    const d = fresh()
    const date = START
    d.sessions[date] = {
      date,
      templateId: 'tuesday',
      status: 'completed',
      // The whole day was brutal, answered once at the halfway point.
      feel: 'heavy',
      exercises: [
        // The squat is what made it brutal, and it says so.
        {
          exerciseId: 'goblet-squat',
          rir: 0,
          sets: [{ targetReps: '10', weightLb: 200, reps: 10, done: true }],
        },
        // The curls flew, and nothing about the squat should hold them.
        {
          exerciseId: 'ez-bar-curl',
          rir: 3,
          sets: [{ targetReps: '10', weightLb: 40, reps: 10, done: true }],
        },
      ],
    } as SessionLog

    const next = addDaysISO(START, 7)
    expect(repStepFor(d, 'goblet-squat', RANGE, next).reps).toBe(10)
    expect(repStepFor(d, 'ez-bar-curl', RANGE, next).reps).toBe(11)
  })
})

describe('time away', () => {
  it('starts the range again rather than quoting a number from months ago', () => {
    const d = fresh()
    logged(d, START, 'goblet-squat', { target: 12, weightLb: 200 })
    const step = repStepFor(d, 'goblet-squat', RANGE, addDaysISO(START, STALE_DAYS + 1))
    expect(step.reps).toBe(RANGE.low)
    expect(step.wrapped).toBe(false)
  })

  it('leaves a lift trained inside the window alone', () => {
    const d = fresh()
    logged(d, START, 'goblet-squat', { target: 10, weightLb: 200 })
    const step = repStepFor(d, 'goblet-squat', RANGE, addDaysISO(START, STALE_DAYS - 1))
    expect(step.reps).toBe(11)
    expect(step.staleSteps).toBe(0)
  })

  it('hands back more load the longer the layoff, and then stops', () => {
    const d = fresh()
    logged(d, START, 'goblet-squat', { target: 12, weightLb: 200 })
    const after = (days: number) => repStepFor(d, 'goblet-squat', RANGE, addDaysISO(START, days)).staleSteps
    expect(after(30)).toBe(1)
    expect(after(60)).toBe(2)
    expect(after(90)).toBe(3)
    // Two years off is not twenty-six steps back.
    expect(after(730)).toBe(3)
  })
})

describe('a shortfall the athlete never taps a button about', () => {
  it('eventually tells the next session to start lighter', () => {
    // The between-session engine only ever heard from the can't-finish
    // sheet, so somebody who quietly grinds out five of the eight, week
    // after week, was invisible to it. The shortfall reached the load
    // engine inside the session and then went nowhere.
    const d = fresh()
    for (let i = 0; i < SHORT_SESSIONS_TO_ACT; i++) {
      logged(d, addDaysISO(START, i * 3), 'goblet-squat', { target: 10, weightLb: 100, achieved: 6 })
    }
    const said = nextSessionSuggestions(d, addDaysISO(START, SHORT_SESSIONS_TO_ACT * 3 + 1))
    expect(said.some((s) => s.kind === 'start-lighter' && s.exerciseId === 'goblet-squat')).toBe(true)
  })

  it('does not act on one bad day', () => {
    const d = fresh()
    logged(d, START, 'goblet-squat', { target: 10, weightLb: 100, achieved: 6 })
    expect(nextSessionSuggestions(d, addDaysISO(START, 2))).toEqual([])
  })
})

describe('the range never runs backwards', () => {
  it('keeps every prescribed number inside the range, whatever the history', () => {
    const d = fresh()
    for (let week = 0; week < 30; week++) {
      const date = addDaysISO(START, week * 7)
      const step = repStepFor(d, 'goblet-squat', RANGE, date)
      expect(step.reps, `week ${week + 1} prescribed ${step.reps}`).toBeGreaterThanOrEqual(RANGE.low)
      expect(step.reps, `week ${week + 1} prescribed ${step.reps}`).toBeLessThanOrEqual(RANGE.high)
      logged(d, date, 'goblet-squat', { target: step.reps, weightLb: 100 })
    }
  })
})

import { describe, expect, it } from 'vitest'
import { emptyAppData, defaultWeekState, type AppData, type SessionLog, type Tier } from '../types'
import { resolveDay } from './resolveDay'
import { addDaysISO } from './calendar'
import { loadStepLb, parseRepRange, repLabel, repStepFor, repTargetFor } from './reps'

// ============================================================
// "WHY ARE YOU STILL GIVING REP RANGES I TOLD YOU TO STOP THAT."
// Users never pick reps. The plan keeps the range because it is
// programming data; the athlete sees one number.
// ============================================================

const START = '2026-08-10'

function data(tier: Tier = 1): AppData {
  const d = emptyAppData(START, START)
  d.settings.onboarded = true
  const week = defaultWeekState(START)
  week.tier = tier
  week.tierPickedAt = `${START}T08:00:00.000Z`
  d.weeks[START] = week
  return d
}

/** A past session of `exerciseId` at `target`, with every set done or not. */
function past(d: AppData, date: string, exerciseId: string, target: number, cleared: boolean) {
  d.sessions[date] = {
    date,
    templateId: 'tuesday',
    status: 'completed',
    exercises: [
      {
        exerciseId,
        sets: [0, 1, 2].map((i) => ({
          targetReps: String(target),
          done: cleared || i === 0,
          weightLb: 30,
        })),
      },
    ],
  } as SessionLog
}

describe('parseRepRange', () => {
  it('only treats an actual range as a range', () => {
    expect(parseRepRange('8-12')).toEqual({ low: 8, high: 12 })
    expect(parseRepRange('12')).toBeNull()
    expect(parseRepRange('30 sec')).toBeNull()
    expect(parseRepRange('AMRAP')).toBeNull()
    expect(parseRepRange('10 / leg')).toBeNull()
    expect(parseRepRange(undefined)).toBeNull()
  })

  it('rejects a backwards range instead of trusting it', () => {
    expect(parseRepRange('12-8')).toBeNull()
  })
})

describe('the number you are shown', () => {
  it('starts at the load end, never the middle or the top', () => {
    expect(repTargetFor(data(), 'incline-db-press', { low: 8, high: 12 }, '2026-08-11')).toBe(8)
  })

  it('adds a rep once you clear every set', () => {
    const d = data()
    past(d, '2026-08-04', 'incline-db-press', 8, true)
    expect(repTargetFor(d, 'incline-db-press', { low: 8, high: 12 }, '2026-08-11')).toBe(9)
  })

  it('holds the number when you did not finish', () => {
    const d = data()
    past(d, '2026-08-04', 'incline-db-press', 9, false)
    expect(repTargetFor(d, 'incline-db-press', { low: 8, high: 12 }, '2026-08-11')).toBe(9)
  })

  it('resets to the bottom at the top of the range, because load goes up instead', () => {
    const d = data()
    past(d, '2026-08-04', 'incline-db-press', 12, true)
    expect(repTargetFor(d, 'incline-db-press', { low: 8, high: 12 }, '2026-08-11')).toBe(8)
  })

  it('reads the most recent session, not the first one it finds', () => {
    const d = data()
    past(d, '2026-07-28', 'incline-db-press', 8, true)
    past(d, '2026-08-04', 'incline-db-press', 11, true)
    expect(repTargetFor(d, 'incline-db-press', { low: 8, high: 12 }, '2026-08-11')).toBe(12)
  })

  it('ignores a skipped session entirely', () => {
    const d = data()
    past(d, '2026-08-04', 'incline-db-press', 8, true)
    d.sessions['2026-08-04'].status = 'skipped'
    expect(repTargetFor(d, 'incline-db-press', { low: 8, high: 12 }, '2026-08-11')).toBe(8)
  })
})

describe('repLabel', () => {
  it('collapses a range and passes everything else through', () => {
    const d = data()
    expect(repLabel('8-12', d, 'incline-db-press', '2026-08-11')).toBe('8')
    expect(repLabel('12', d, 'x', '2026-08-11')).toBe('12')
    expect(repLabel('30 sec', d, 'x', '2026-08-11')).toBe('30 sec')
    expect(repLabel('10 / leg', d, 'x', '2026-08-11')).toBe('10 / leg')
  })

  it('keeps the units on a range that has them', () => {
    expect(repLabel('40-60 sec', data(), 'farmer-carry', '2026-08-11')).toBe('40 sec')
  })
})

describe('no day the app hands out shows a range', () => {
  it('at any tier, for four weeks', () => {
    for (const tier of [1, 2, 3] as Tier[]) {
      const d = data(tier)
      for (let i = 0; i < 7 * 4; i++) {
        const day = resolveDay(addDaysISO(START, i), d)
        for (const e of day.exercises) {
          expect(
            parseRepRange(e.repText),
            `tier ${tier} ${day.templateId} ${e.exerciseId} still shows "${e.repText}"`,
          ).toBeNull()
        }
      }
    }
  })

  it('shows the owner Tuesday as single numbers', () => {
    const day = resolveDay(addDaysISO(START, 1), data(1))
    expect(day.exercises.map((e) => `${e.sets}x${e.repText}`)).toEqual([
      '4x8',
      '3x8',
      '3x6',
      '2x8',
      '3x15',
      '2x12',
    ])
  })
})

// ============================================================
// The wrap, and what it costs.
//
// Climbing the reps and resetting to the bottom is only half of
// double progression. The other half is that the LOAD goes up at
// the wrap, and for a while nothing did it, so the prescription
// cycled 8 to 12 and back to 8 at the same weight forever.
// ============================================================

describe('repStepFor: the wrap that hands the next step to the bar', () => {
  const RANGE = { low: 8, high: 12 }

  it('does not wrap while there are reps left to climb', () => {
    const d = data()
    past(d, addDaysISO(START, -7), 'flat-db-press', 8, true)
    const step = repStepFor(d, 'flat-db-press', RANGE, START)
    expect(step.reps).toBe(9)
    expect(step.wrapped).toBe(false)
  })

  it('wraps to the bottom, and says so, once the top is cleared', () => {
    const d = data()
    past(d, addDaysISO(START, -7), 'flat-db-press', 12, true)
    const step = repStepFor(d, 'flat-db-press', RANGE, START)
    expect(step.reps).toBe(8)
    expect(step.wrapped).toBe(true)
  })

  it('holds, and does not wrap, when the top was not cleared', () => {
    const d = data()
    past(d, addDaysISO(START, -7), 'flat-db-press', 12, false)
    const step = repStepFor(d, 'flat-db-press', RANGE, START)
    expect(step.reps).toBe(12)
    expect(step.wrapped).toBe(false)
  })

  it('starting fresh is the bottom of the range, and is not a wrap', () => {
    expect(repStepFor(data(), 'flat-db-press', RANGE, START)).toEqual({
      reps: 8,
      wrapped: false,
      backOff: false,
    })
  })
})

describe('loadStepLb', () => {
  it('gives the legs a bigger step, because 5 lb on a squat is noise', () => {
    expect(loadStepLb('goblet-squat')).toBe(10)
    expect(loadStepLb('romanian-deadlift')).toBe(10)
  })

  it('keeps upper body at 5', () => {
    expect(loadStepLb('flat-db-press')).toBe(5)
    expect(loadStepLb('db-lateral-raise')).toBe(5)
  })

  it('falls back to the small step for an exercise it does not know', () => {
    expect(loadStepLb('not-a-real-exercise')).toBe(5)
  })
})

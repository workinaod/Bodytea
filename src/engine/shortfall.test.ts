import { describe, expect, it } from 'vitest'
import { emptyAppData, type AppData } from '../types'
import type { SessionLog } from '../sessionTypes'
import { nextSessionSuggestions } from './fatigue'
import { respondToSet } from './sessionFatigue'
import { SHORTFALL_TO_ACT, loadProvedWrong } from './shortfall'

// ============================================================
// R3 s9.2 says the in-session load drop needs no outcome of its own, and
// escalates to the failing flag "which already exists" if the same
// movement is dropped in 3 sessions inside 21 days.
//
// It did not, for half the evidence. The drop fires on either a
// two-rep shortfall or a set that emptied the tank and finished one
// down. The flag counted only the first, so an athlete grinding to
// failure and missing by one had the weight taken off the bar every
// session and was handed the same prescription the next time, forever.
//
// Proved by probe before it was fixed: three such sessions returned no
// suggestions at all, while three two-rep sessions returned start-lighter
// with a count of 3.
// ============================================================

const SQUAT = 'goblet-squat'
const TODAY = '2026-06-01'
const THREE_WEEKS = ['2026-05-15', '2026-05-22', '2026-05-29']

/** One session of one movement, with whatever went wrong spelled out. */
function session(
  d: AppData,
  date: string,
  opts: { achieved: number; rir?: number },
): AppData {
  d.sessions[date] = {
    date,
    templateId: 't',
    status: 'completed',
    exercises: [
      {
        exerciseId: SQUAT,
        ...(opts.rir === undefined ? {} : { rir: opts.rir }),
        sets: [
          { targetReps: '8', done: true, achieved: opts.achieved, weightLb: 100 },
          { targetReps: '8', done: false, weightLb: 100 },
        ],
      },
    ],
  } as unknown as SessionLog
  return d
}

const flagged = (d: AppData) =>
  nextSessionSuggestions(d, TODAY).filter((s) => s.exerciseId === SQUAT)

describe('the load drop and the failing flag read the same evidence', () => {
  it('takes the weight off when the tank is empty and the number was missed', () => {
    // One rep down, nothing in reserve. The app acts on this.
    const d = session(emptyAppData(TODAY, TODAY), '2026-05-15', { achieved: 7, rir: 0 })
    const res = respondToSet(d.sessions['2026-05-15'].exercises[0], 0)
    expect(res?.kind).toBe('drop-load')
  })

  it('and three of those in 21 days flags the movement', () => {
    let d = emptyAppData(TODAY, TODAY)
    for (const date of THREE_WEEKS) d = session(d, date, { achieved: 7, rir: 0 })
    const out = flagged(d)
    expect(out).toHaveLength(1)
    expect(out[0].kind).toBe('start-lighter')
    expect(out[0].count).toBe(3)
  })

  it('still flags the plain two-rep shortfall it always did', () => {
    let d = emptyAppData(TODAY, TODAY)
    for (const date of THREE_WEEKS) d = session(d, date, { achieved: 6 })
    expect(flagged(d)).toHaveLength(1)
  })

  it('does NOT flag one rep down with reps still in the tank', () => {
    // The guard that stops this becoming "any miss at all". Missing the
    // last rep with two in reserve is a rounding error on a good day,
    // and the app takes no weight off for it either.
    let d = emptyAppData(TODAY, TODAY)
    for (const date of THREE_WEEKS) d = session(d, date, { achieved: 7, rir: 2 })
    expect(flagged(d)).toHaveLength(0)
    const res = respondToSet(d.sessions[THREE_WEEKS[0]].exercises[0], 0)
    expect(res).toBeNull()
  })

  it('agrees with itself: anything the drop acts on, the flag counts', () => {
    // Pinned as literals rather than against the constant, because a
    // test that asks the code what it thinks always agrees with it.
    expect(SHORTFALL_TO_ACT).toBe(2)
    const log = (achieved: number, rir?: number) => ({
      exerciseId: SQUAT,
      ...(rir === undefined ? {} : { rir }),
      sets: [{ targetReps: '8', done: true, achieved, weightLb: 100 }],
    })
    expect(loadProvedWrong(log(6) as never)).toBe(true) // two down
    expect(loadProvedWrong(log(7, 0) as never)).toBe(true) // one down, empty
    expect(loadProvedWrong(log(7, 2) as never)).toBe(false) // one down, reps left
    expect(loadProvedWrong(log(8, 0) as never)).toBe(false) // made it
  })
})

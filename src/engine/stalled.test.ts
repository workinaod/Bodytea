import { describe, expect, it } from 'vitest'
import { emptyAppData, type AppData } from '../types'
import type { SessionLog } from '../sessionTypes'
import { EXPOSURES_BEFORE_STALLED, flagNotes, nextSessionSuggestions, stalledLifts } from './fatigue'
import { repStepFor } from './reps'

// ============================================================
// R3 s9.2: "if 2 clean sessions never arrive within 6 exposures,
// escalate to plateau ladder rung 3".
//
// Nothing noticed. A flagged movement was softened and then left there,
// silently, for as long as it took: the coach repeated "two clean
// sessions in a row puts it back to normal" every session, having
// already watched six of them go by without it. Advice the app has seen
// fail is not advice, and the athlete has no way to know the plan has
// run out of ideas.
//
// Rung 3 is back off AND re-climb. The load half already shipped
// (prescription.ts softens via dropTo with a proportional floor). The
// re-climb was missing entirely: the reps never restarted at the bottom
// of the range, so there was nothing to climb.
// ============================================================

const SQUAT = 'goblet-squat'
const RANGE = { low: 8, high: 12 }

/** Weekly Mondays from the first, so exposures are easy to count. */
const WEEK = [
  '2026-01-05', '2026-01-12', '2026-01-19', '2026-01-26', '2026-02-02',
  '2026-02-09', '2026-02-16', '2026-02-23', '2026-03-02',
]
const TODAY = '2026-03-03'

function log(d: AppData, date: string, achieved: number, rir?: number): AppData {
  d.sessions[date] = {
    date,
    templateId: 't',
    status: 'completed',
    exercises: [
      {
        exerciseId: SQUAT,
        ...(rir === undefined ? {} : { rir }),
        sets: [{ targetReps: '10', done: true, achieved, weightLb: 100 }],
      },
    ],
  } as unknown as SessionLog
  return d
}

const SHORT = 6 // four under a ten, comfortably past SHORTFALL_TO_ACT
const CLEAN = 10

/** Three shorts raises the flag; `after` is what happened next, in order. */
function history(after: number[]): AppData {
  let d = emptyAppData(TODAY, TODAY)
  for (const date of WEEK.slice(0, 3)) d = log(d, date, SHORT)
  after.forEach((a, i) => {
    d = log(d, WEEK[3 + i], a)
  })
  return d
}

/** Never two clean in a row, so the flag can never clear on its own. */
const LIMPING = [SHORT, CLEAN, SHORT, CLEAN, SHORT, CLEAN]

describe('a movement the lighter weight never rescued', () => {
  it('is stalled once six exposures have gone by', () => {
    expect(stalledLifts(history(LIMPING), TODAY).has(SQUAT)).toBe(true)
  })

  it('is not stalled on the fifth', () => {
    expect(stalledLifts(history(LIMPING.slice(0, 5)), TODAY).has(SQUAT)).toBe(false)
  })

  it('counts the session that raised the flag as exposure zero', () => {
    // The six are the chances the softened prescription gets to work.
    // The day the flag was written is not one of them, and off-by-one
    // here is a whole extra session of an athlete grinding.
    expect(EXPOSURES_BEFORE_STALLED).toBe(6)
    expect(stalledLifts(history(LIMPING.slice(0, 6)), TODAY).has(SQUAT)).toBe(true)
  })

  it('never stalls a movement that actually came back', () => {
    // Two clean in a row clears the flag, and a cleared flag has no
    // exposures to accumulate.
    const d = history([CLEAN, CLEAN, SHORT, CLEAN, SHORT, CLEAN])
    expect(stalledLifts(d, TODAY).has(SQUAT)).toBe(false)
  })
})

describe('what the athlete actually gets', () => {
  it('restarts the range at its bottom', () => {
    const d = history(LIMPING)
    expect(repStepFor(d, SQUAT, RANGE, TODAY).reps).toBe(RANGE.low)
  })

  it('leaves the climb alone while the flag is still young', () => {
    // Five exposures in, the plan is still giving the lighter weight a
    // chance, and the rep target is whatever the progression says.
    const d = history(LIMPING.slice(0, 5))
    expect(repStepFor(d, SQUAT, RANGE, TODAY).reps).not.toBe(RANGE.low)
  })

  it('stops repeating advice it has watched fail six times', () => {
    const said = nextSessionSuggestions(history(LIMPING), TODAY).find(
      (s) => s.exerciseId === SQUAT && s.kind === 'start-lighter',
    )
    expect(said).toBeDefined()
    expect(said!.because).toContain('bottom of the range')
    expect(said!.because).not.toContain('puts it back to normal')
  })

  it('still says the ordinary thing before it has run out of ideas', () => {
    const said = nextSessionSuggestions(history(LIMPING.slice(0, 3)), TODAY).find(
      (s) => s.exerciseId === SQUAT && s.kind === 'start-lighter',
    )
    expect(said!.because).toContain('puts it back to normal')
  })
})

describe('restarting the range adds a lever, it does not spend one', () => {
  it('keeps the load back-off a stalled lift had already earned', () => {
    // Caught in the slice 6 review. The first version returned a fresh
    // step for a stalled movement and threw backOff away with it, so the
    // one lift going worst quietly STOPPED getting its step down at the
    // moment the app decided it was stuck. Rung 3 is back off AND
    // re-climb, not re-climb instead of backing off.
    let d = emptyAppData(TODAY, TODAY)
    for (const date of WEEK.slice(0, 3)) d = log(d, date, SHORT)
    LIMPING.forEach((a, i) => {
      d = log(d, WEEK[3 + i], a)
    })
    // The most recent session fell short with nothing left in the tank,
    // which is the exact pair that earns a step down.
    d = log(d, WEEK[8], SHORT, 0)

    const step = repStepFor(d, SQUAT, RANGE, TODAY)
    expect(step.reps).toBe(RANGE.low) // still restarted
    expect(step.backOff).toBe(true) // and still owed the weight back
    expect(step.wrapped).toBe(false) // nothing wraps while it restarts
  })
})

describe('the athlete is actually told', () => {
  // Found in the slice 6 review, and it undercut the whole slice. The
  // failing flag softens the load and now restarts the range, and
  // NOTHING said why: FatigueSuggestion.because has carried the sentence
  // since it was written, its own comment reads "an unexplained change
  // reads as a bug", and prescription.ts (the only caller) reads `kind`
  // alone. A squat went from 10 at 100 to 8 at 90 in silence.
  const HERE = new Set([SQUAT])

  it('says why a stalled movement restarted its range', () => {
    const notes = flagNotes(history(LIMPING), TODAY, HERE)
    expect(notes).toHaveLength(1)
    expect(notes[0]).toContain('bottom of the range')
  })

  it('says why an ordinary flagged movement opens lighter', () => {
    const notes = flagNotes(history(LIMPING.slice(0, 3)), TODAY, HERE)
    expect(notes).toHaveLength(1)
    expect(notes[0]).toContain('opens lighter today')
    expect(notes[0]).toContain('back to normal')
  })

  it('says nothing about a movement that is not in today', () => {
    // The flag is global; the note belongs to the day on screen.
    expect(flagNotes(history(LIMPING), TODAY, new Set(['bench-press']))).toEqual([])
  })

  it('says nothing at all when nothing is flagged', () => {
    expect(flagNotes(emptyAppData(TODAY, TODAY), TODAY, HERE)).toEqual([])
  })

  it('writes the stalled sentence once, not once per place it appears', () => {
    // Two copies of a sentence drift, and a coach that says almost the
    // same thing in two places reads as two coaches.
    const note = flagNotes(history(LIMPING), TODAY, HERE)[0]
    const said = nextSessionSuggestions(history(LIMPING), TODAY).find(
      (x) => x.exerciseId === SQUAT && x.kind === 'start-lighter',
    )!
    expect(note.endsWith(said.because)).toBe(true)
  })
})

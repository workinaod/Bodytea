import { describe, expect, it } from 'vitest'
import { emptyAppData, type AppData } from '../types'
import { resolveDay, blockMathFor } from './resolveDay'
import { isAthleteAuthored } from '../plan/bookletOps'
import { addDaysISO } from './calendar'

// ============================================================
// Whose week is it.
//
// The deload used to be a date: week 4 of every block, on every plan,
// sets halved. That is the right call on a booklet BodyT wrote, because
// BodyT designed the block. It is the wrong call on a routine somebody
// brought from home, and the app's own standing rule says so: suggest
// only, never auto. Halving their sets on a calendar is not coaching,
// it is taking their week off them.
//
// R17 asked the owner to settle it because the app was saying both
// things at once: analyze.ts promised imported athletes an automatic
// deload every fourth week while R5 said preserve. The answer was that
// it depends on the situation, and whose plan it is, is the situation
// the engine can actually see.
// ============================================================

const START = '2026-08-10' // Monday, week 1 of block 1
/** Week 4 of the block, which is where the calendar puts a deload. */
const DELOAD_WEEK = addDaysISO(START, 21)

function athlete(theirs: boolean): AppData {
  const data = emptyAppData(START)
  data.settings.onboarded = true
  if (theirs) data.plan.routineGoals = ['muscle']
  return data
}

describe('the calendar still says what it always said', () => {
  it('puts week 4 of the block where it has always been', () => {
    expect(blockMathFor(DELOAD_WEEK, START).weekInBlock).toBe(4)
    expect(blockMathFor(DELOAD_WEEK, START).isDeload).toBe(true)
    expect(blockMathFor(START, START).isDeload).toBe(false)
  })
})

describe('a booklet BodyT wrote', () => {
  it('runs the deload, because it designed the block', () => {
    const day = resolveDay(DELOAD_WEEK, athlete(false))
    expect(day.isDeload).toBe(true)
    expect(day.banners.some((b) => b.id === 'deload')).toBe(true)
    expect(day.banners.some((b) => b.id === 'deload-offer')).toBe(false)
  })
})

describe('a routine the athlete brought', () => {
  it('is offered a deload and never handed one', () => {
    const day = resolveDay(DELOAD_WEEK, athlete(true))
    expect(day.banners.some((b) => b.id === 'deload-offer')).toBe(true)
    expect(day.banners.some((b) => b.id === 'deload')).toBe(false)
  })

  it('keeps every set the athlete put there', () => {
    // The measurable half. Same date, same block position, and the only
    // difference is who built the week.
    const ours = resolveDay(DELOAD_WEEK, athlete(false))
    const theirs = resolveDay(DELOAD_WEEK, athlete(true))
    const sets = (d: typeof ours) => d.exercises.reduce((n, e) => n + e.sets, 0)
    // Asserted, not guarded on. An `if (exercises.length)` around this
    // would let the whole comparison vanish the day the fixture changes,
    // and a test that cannot fail is not a test.
    expect(ours.exercises.length, 'the fixture stopped producing a session').toBeGreaterThan(0)
    expect(sets(theirs), 'their sets were cut to match a block they did not ask for').toBeGreaterThan(sets(ours))
  })

  it('does not tell them tomorrow is a deload when it is not', () => {
    // debrief.ts and workoutBrief.ts both read day.isDeload to say what
    // tomorrow is. If the field kept meaning "the calendar says so" they
    // would promise an unload that never arrives.
    expect(resolveDay(DELOAD_WEEK, athlete(true)).isDeload).toBe(false)
  })
})

describe('one answer to who built this', () => {
  it('reads a routine goal or a why-it-works as the athlete having built it', () => {
    expect(isAthleteAuthored({ routineGoals: ['muscle'], whyWorks: undefined })).toBe(true)
    expect(isAthleteAuthored({ routineGoals: undefined, whyWorks: 'it is short' })).toBe(true)
    expect(isAthleteAuthored({ routineGoals: undefined, whyWorks: undefined })).toBe(false)
  })
})

import { describe, expect, it } from 'vitest'
import { emptyAppData, defaultWeekState, type AppData, type ResolvedExercise, type SessionLog } from '../types'
import { addDaysISO } from './calendar'
import { resolveDay } from './resolveDay'
import { applyWeekRamp } from './transforms'
import { overloadedRegions } from './volume'
import { GAIN_TO_PROMOTE, MIN_SESSIONS_TO_JUDGE, PHASE_WEEKS, phaseFor, phaseIndexFor, phaseNote } from './phase'

// ============================================================
// A block that goes somewhere, and a phase that knows what
// happened in the last one.
//
// Weeks 1, 2 and 3 of every block used to be the same
// prescription three times over, and week 17 handed back block 1
// exactly as written on day one with a banner reading "the
// program loops". Sixteen weeks of training changed nothing
// about what came next, which is the whole complaint: the app
// runs out of opinions and the athlete goes and writes their own
// program.
// ============================================================

const START = '2026-08-10' // a Monday

function data(): AppData {
  const d = emptyAppData(START, START)
  d.settings.onboarded = true
  for (let w = 0; w < 40; w++) {
    const monday = addDaysISO(START, w * 7)
    d.weeks[monday] = defaultWeekState(monday)
  }
  return d
}

const ex = (exerciseId: string, sets: number, repText = '8', kind = 'lift') =>
  ({ exerciseId, name: exerciseId, kind, restSec: 90, sets, repText }) as ResolvedExercise

/** Every lifting set of a day, keyed by exercise, for one date. */
const setsOn = (d: AppData, date: string) =>
  Object.fromEntries(resolveDay(date, d).exercises.map((e) => [e.exerciseId, e.sets]))

describe('the week ramp', () => {
  it('gives the main lift one more set at the top of the block', () => {
    const d = data()
    // Monday of week 1 and Monday of week 3 are the same authored day.
    const wk1 = setsOn(d, addDaysISO(START, 0))
    const wk3 = setsOn(d, addDaysISO(START, 14))
    const gained = Object.keys(wk3).filter((id) => (wk3[id] ?? 0) > (wk1[id] ?? 0))
    expect(gained, 'exactly one movement should gain a set').toHaveLength(1)
    expect(wk3[gained[0]]).toBe(wk1[gained[0]] + 1)
  })

  it('leaves weeks one and two identical, because the build starts at three', () => {
    const d = data()
    expect(setsOn(d, addDaysISO(START, 7))).toEqual(setsOn(d, addDaysISO(START, 0)))
  })

  it('says so, once, on the day it happens', () => {
    const d = data()
    const ids = (date: string) => resolveDay(date, d).banners.map((b) => b.id)
    expect(ids(addDaysISO(START, 14))).toContain('peak-week')
    expect(ids(addDaysISO(START, 0))).not.toContain('peak-week')
    expect(ids(addDaysISO(START, 21))).not.toContain('peak-week') // deload
  })

  it('does not ramp the deload', () => {
    const day = [ex('goblet-squat', 4)]
    expect(applyWeekRamp(day, 4)).toBe(day)
    expect(applyWeekRamp(day, 1)).toBe(day)
    expect(applyWeekRamp(day, 2)).toBe(day)
  })

  it('adds the set to the main lift and to nothing else', () => {
    const day = [ex('goblet-squat', 4), ex('bulgarian-split-squat', 3), ex('lateral-raise', 3, '15')]
    const out = applyWeekRamp(day, 3)
    expect(out.map((e) => e.sets)).toEqual([5, 3, 3])
  })

  it('refuses the set on a day that cannot afford it', () => {
    // Enough curling that the biceps are already at the ceiling. An extra
    // set of chin-ups on top is exactly the case that broke the Friday:
    // the volume trim will not cut an opening movement, so nothing
    // downstream can pay for it and the guard has to live here.
    const day = [ex('chin-up', 4, '8'), ex('ez-bar-curl', 3, '12'), ex('hammer-curl', 3, '12')]
    const out = applyWeekRamp(day, 3)
    if (out !== day) expect(overloadedRegions(out)).toEqual([])
  })

  it('leaves a day with no main lift alone', () => {
    const day = [ex('lateral-raise', 3, '15'), ex('plank-side-plank', 3, '30 sec', 'core')]
    expect(applyWeekRamp(day, 3)).toBe(day)
  })

  it('never hands out a week-3 day that is over a muscle ceiling', () => {
    const d = data()
    for (let w = 0; w < 12; w++) {
      for (let i = 0; i < 7; i++) {
        const date = addDaysISO(START, w * 7 + i)
        const day = resolveDay(date, d)
        expect(overloadedRegions(day.exercises), `${date} wk${day.weekIndex}`).toEqual([])
      }
    }
  })
})

describe('which phase it is', () => {
  it('turns over at week seventeen, not before', () => {
    expect(phaseIndexFor(1)).toBe(1)
    expect(phaseIndexFor(PHASE_WEEKS)).toBe(1)
    expect(phaseIndexFor(PHASE_WEEKS + 1)).toBe(2)
    expect(phaseIndexFor(PHASE_WEEKS * 2 + 1)).toBe(3)
  })
})

/** `n` sessions of `exerciseId`, weekly from `fromISO`, climbing by `stepLb`. */
function trained(d: AppData, exerciseId: string, fromISO: string, n: number, stepLb: number) {
  for (let i = 0; i < n; i++) {
    const date = addDaysISO(fromISO, i * 7)
    d.sessions[date] = {
      date,
      templateId: 'monday',
      status: 'completed',
      exercises: [
        {
          exerciseId,
          sets: [{ targetReps: '8', weightLb: 100 + i * stepLb, reps: 8, done: true }],
        },
      ],
    } as SessionLog
  }
}

describe('what a new phase does with the last one', () => {
  const intoPhase2 = addDaysISO(START, PHASE_WEEKS * 7) // first Monday of phase 2

  it('changes nothing during phase one', () => {
    const d = data()
    trained(d, 'goblet-squat', START, 12, 10)
    expect(phaseFor(d, addDaysISO(START, 7)).overrides).toEqual({})
  })

  it('promotes a lift the athlete genuinely got stronger at', () => {
    const d = data()
    // Twelve sessions climbing 10 lb a week is unambiguous.
    trained(d, 'goblet-squat', START, 12, 10)
    const phase = phaseFor(d, intoPhase2)
    expect(phase.index).toBe(2)
    const squat = phase.verdicts.find((v) => v.from === 'goblet-squat')
    expect(squat?.outcome).toBe('promoted')
    expect(squat?.to).not.toBe('goblet-squat')
    expect(phase.overrides.squatVariation).toBe(squat?.to)
  })

  it('holds a lift that stalled, because harder is not the answer to stuck', () => {
    const d = data()
    trained(d, 'goblet-squat', START, 12, 0) // trained often, moved never
    const squat = phaseFor(d, intoPhase2).verdicts.find((v) => v.from === 'goblet-squat')
    expect(squat?.outcome).toBe('stalled')
    expect(squat?.to).toBe('goblet-squat')
  })

  it('holds a lift there is not enough evidence about', () => {
    const d = data()
    trained(d, 'goblet-squat', START, MIN_SESSIONS_TO_JUDGE - 1, 20)
    const squat = phaseFor(d, intoPhase2).verdicts.find((v) => v.from === 'goblet-squat')
    expect(squat?.outcome).toBe('untested')
    expect(squat?.to).toBe('goblet-squat')
  })

  it('needs a real gain, not a rounding error', () => {
    const d = data()
    // Twelve sessions, but the estimate barely moves.
    trained(d, 'goblet-squat', START, 12, 0)
    d.sessions[addDaysISO(START, 11 * 7)]!.exercises[0].sets[0].weightLb =
      100 * (1 + GAIN_TO_PROMOTE / 2)
    expect(phaseFor(d, intoPhase2).verdicts.find((v) => v.from === 'goblet-squat')?.outcome).toBe('stalled')
  })

  it('actually programs the promoted lift', () => {
    const d = data()
    trained(d, 'goblet-squat', START, 12, 10)
    const promoted = phaseFor(d, intoPhase2).overrides.squatVariation
    expect(promoted).toBeTruthy()
    // Somewhere in the first week of phase 2 the new movement shows up
    // and the old one does not.
    const ids = new Set<string>()
    for (let i = 0; i < 7; i++) {
      for (const e of resolveDay(addDaysISO(intoPhase2, i), d).exercises) ids.add(e.exerciseId)
    }
    expect(ids.has(promoted!)).toBe(true)
    expect(ids.has('goblet-squat')).toBe(false)
  })

  it('tells the athlete what changed, without an em dash in sight', () => {
    const d = data()
    trained(d, 'goblet-squat', START, 12, 10)
    const { index, verdicts } = phaseFor(d, intoPhase2)
    const note = phaseNote(index, verdicts)
    expect(note).toMatch(/Phase 2/)
    expect(note).not.toMatch(/—/)
    expect(resolveDay(intoPhase2, d).banners.find((b) => b.id === 'phase-complete')?.text).toBe(note)
  })
})

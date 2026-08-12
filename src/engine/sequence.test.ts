import { describe, expect, it } from 'vitest'
import { emptyAppData, defaultWeekState, type AppData, type ResolvedExercise, type Tier } from '../types'
import { buildFromTemplate } from './transforms'
import { resolveDay } from './resolveDay'
import { addDaysISO } from './calendar'
import {
  band,
  capAccessorySets,
  isAccessory,
  isMisordered,
  lowRep,
  orderSession,
  MAX_ACCESSORY_SETS,
} from './sequence'

// ============================================================
// The complaint, verbatim: "is 4 sets of lateral raises with 15
// reps each set in the middle of a session a great idea dude".
// It is not, and the Tuesday push day shipped exactly that, at
// position four of seven with a loaded close-grip press still to
// come.
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

/** The day as authored, before ordering or capping. */
const raw = (id: string) => {
  const plan = data().plan
  return buildFromTemplate(plan.templates[id], 1, 'A', plan)
}

const ex = (exerciseId: string, sets: number, repText: string, kind = 'lift') =>
  ({ exerciseId, name: exerciseId, kind, restSec: 90, sets, repText }) as ResolvedExercise

describe('reading a prescription', () => {
  it('takes the bottom of a rep range', () => {
    expect(lowRep('15-20')).toBe(15)
    expect(lowRep('12')).toBe(12)
    expect(lowRep('40-60 sec')).toBe(40)
    expect(lowRep(undefined)).toBeNull()
    expect(lowRep('AMRAP')).toBeNull()
  })
})

describe('telling accessory work from the real lifts', () => {
  it('calls a lateral raise what it is', () => {
    expect(isAccessory(ex('lateral-raise', 4, '15-20'))).toBe(true)
    expect(isAccessory(ex('overhead-tricep-extension', 3, '12'))).toBe(true)
  })

  it('does not mistake a close-grip press for isolation', () => {
    // One primary muscle, but three regions and a heavy rep range. The
    // muscle map alone would get this wrong; the prescription saves it.
    expect(isAccessory(ex('close-grip-press', 3, '8-10'))).toBe(false)
    expect(isAccessory(ex('incline-db-press', 4, '8-12'))).toBe(false)
  })

  it('only ever applies to lifts', () => {
    expect(isAccessory(ex('box-jump', 3, '3', 'jump'))).toBe(false)
  })
})

describe('the sequence', () => {
  it('puts power first, then compounds, then isolation, then core', () => {
    expect(band(ex('box-jump', 3, '3', 'jump'))).toBeLessThan(band(ex('incline-db-press', 4, '8-12')))
    expect(band(ex('incline-db-press', 4, '8-12'))).toBeLessThan(band(ex('lateral-raise', 3, '15-20')))
    expect(band(ex('lateral-raise', 3, '15-20'))).toBeLessThan(band(ex('hanging-leg-raise', 3, '12', 'core')))
  })

  it('moves the lateral raises behind every press', () => {
    const ordered = orderSession(raw('tuesday')).map((e) => e.exerciseId)
    const lateral = ordered.indexOf('lateral-raise')
    for (const press of ['incline-db-press', 'flat-db-press', 'standing-ohp', 'close-grip-press']) {
      expect(ordered.indexOf(press), `${press} must come before the raises`).toBeLessThan(lateral)
    }
  })

  it('flags the day as written, and is happy with the day reordered', () => {
    expect(isMisordered(raw('tuesday'))).toBe(true)
    expect(isMisordered(orderSession(raw('tuesday')))).toBe(false)
  })

  it('leaves an already-correct day exactly as the author wrote it', () => {
    const day = raw('wednesday')
    expect(orderSession(day)).toEqual(day)
  })

  it('is stable, so the author keeps their ordering inside a band', () => {
    const day = [ex('flat-db-press', 3, '8-12'), ex('incline-db-press', 4, '8-12')]
    expect(orderSession(day).map((e) => e.exerciseId)).toEqual(['flat-db-press', 'incline-db-press'])
  })
})

describe('accessory dosing', () => {
  it('caps isolation at three sets', () => {
    const [e] = capAccessorySets([ex('lateral-raise', 4, '15-20')])
    expect(e.sets).toBe(MAX_ACCESSORY_SETS)
  })

  it('never touches a compound', () => {
    const [e] = capAccessorySets([ex('incline-db-press', 4, '8-12')])
    expect(e.sets).toBe(4)
  })

  it('leaves accessory work that was already reasonable alone', () => {
    const [e] = capAccessorySets([ex('prone-y-raise', 2, '12')])
    expect(e.sets).toBe(2)
  })
})

describe('every day the resolver hands out', () => {
  it('is in a runnable order at every tier', () => {
    for (const tier of [1, 2, 3] as Tier[]) {
      const d = data(tier)
      for (let i = 0; i < 7 * 4; i++) {
        const date = addDaysISO(START, i)
        const day = resolveDay(date, d)
        if (day.exercises.length === 0) continue
        expect(
          isMisordered(day.exercises),
          `tier ${tier} ${date} (${day.templateId}): ${day.exercises.map((e) => e.exerciseId).join(' > ')}`,
        ).toBe(false)
      }
    }
  })

  it('never asks for more than three sets of an isolation movement', () => {
    for (const tier of [1, 2, 3] as Tier[]) {
      const d = data(tier)
      for (let i = 0; i < 7 * 4; i++) {
        const day = resolveDay(addDaysISO(START, i), d)
        for (const e of day.exercises) {
          if (isAccessory(e)) expect(e.sets, `${day.templateId} ${e.exerciseId}`).toBeLessThanOrEqual(MAX_ACCESSORY_SETS)
        }
      }
    }
  })

  it('runs the owner Tuesday as four presses, then the raises', () => {
    const ids = resolveDay(addDaysISO(START, 1), data(1)).exercises.map((e) => e.exerciseId)
    expect(ids).toEqual([
      'incline-db-press',
      'flat-db-press',
      'standing-ohp',
      'close-grip-press',
      'lateral-raise',
      'prone-y-raise',
    ])
  })
})

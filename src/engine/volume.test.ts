import { describe, expect, it } from 'vitest'
import { emptyAppData, defaultWeekState, type AppData, type ResolvedExercise, type Tier } from '../types'
import { resolveDay } from './resolveDay'
import { buildFromTemplate } from './transforms'
import { addDaysISO } from './calendar'
import {
  ceilingFor,
  weightDropped,
  focusRegions,
  kindWeight,
  overloadedRegions,
  preFatigued,
  regionLoad,
  totalSets,
  trimForVolume,
  PROTECTED_LEAD,
} from './volume'

// ============================================================
// The case is real, not hypothetical: the owner got through 11 of
// 23 sets on the Tuesday push day with cooked shoulders and 12
// sets still in front of them.
//
// buildFromTemplate is the UNCAPPED builder, so these tests see
// the raw day the plan author wrote. resolveDay now caps, and the
// bottom block checks that instead.
// ============================================================

const START = '2026-08-10' // a Monday

function data(tier: Tier = 1): AppData {
  const d = emptyAppData(START, START)
  d.settings.onboarded = true
  const week = defaultWeekState(START)
  week.tier = tier
  week.tierPickedAt = `${START}T08:00:00.000Z`
  d.weeks[START] = week
  return d
}

/** The day exactly as authored, before any cap. */
function raw(templateId: string): ResolvedExercise[] {
  const plan = data().plan
  return buildFromTemplate(plan.templates[templateId], 1, 'A', plan)
}

function ex(exerciseId: string, sets: number, kind = 'lift'): ResolvedExercise {
  return { exerciseId, name: exerciseId, kind, restSec: 90, sets, repText: '8-12' } as ResolvedExercise
}

describe('fractional set accounting', () => {
  it('counts a prime mover whole and an assisting muscle by half', () => {
    const load = regionLoad([ex('incline-db-press', 4)])
    expect(load['chest-upper']).toBe(4)
    expect(load['delts-front']).toBe(2)
    expect(load.triceps).toBe(2)
  })

  it('doses a jump well below a lift, because it is not the same set', () => {
    expect(kindWeight('jump')).toBeLessThan(kindWeight('lift'))
    expect(kindWeight('mobility')).toBe(0)
    const jumps = regionLoad([ex('box-jump', 4, 'jump')])
    const lifts = regionLoad([ex('goblet-squat', 4, 'lift')])
    expect(jumps.quads!).toBeLessThan(lifts.quads!)
  })

  it('ignores exercises with no muscle mapping instead of throwing', () => {
    expect(regionLoad([ex('not-a-real-exercise', 3)])).toEqual({})
  })

  it('small assisting muscles get a lower ceiling than the big movers', () => {
    expect(ceilingFor('triceps')).toBeLessThan(ceilingFor('chest'))
  })

  it('gives the day its own targets more room than the collateral', () => {
    const focus = focusRegions([ex('incline-db-press', 4), ex('flat-db-press', 3)])
    expect(focus.has('chest-upper')).toBe(true)
    expect(focus.has('triceps')).toBe(false) // assisted, never the point
    expect(ceilingFor('chest-upper', focus)).toBeGreaterThan(ceilingFor('chest-upper'))
    expect(ceilingFor('triceps', focus)).toBe(ceilingFor('triceps'))
  })
})

describe('the Tuesday push day, as authored', () => {
  it('is 23 sets across seven movements', () => {
    expect(raw('tuesday')).toHaveLength(7)
    expect(totalSets(raw('tuesday'))).toBe(23)
  })

  it('buries the triceps and front delts, neither of which the day is for', () => {
    const load = regionLoad(raw('tuesday'))
    expect(load.triceps).toBe(11.5)
    expect(load['delts-front']).toBe(10.5)
    const over = overloadedRegions(raw('tuesday')).map((o) => o.region)
    expect(over).toEqual(['triceps', 'delts-front'])
  })

  it('lands the overhead press on delts that already did the work', () => {
    const ohp = preFatigued(raw('tuesday')).find((s) => s.exerciseId === 'standing-ohp')
    expect(ohp?.region).toBe('delts-front')
    expect(ohp?.priorLoad).toBe(3.5)
  })
})

describe('trimForVolume', () => {
  it('brings the push day under, and says what it changed', () => {
    const { exercises, cuts, stillOver } = trimForVolume(raw('tuesday'))
    expect(stillOver).toEqual([])
    expect(totalSets(exercises)).toBe(18)
    expect(cuts.length).toBeGreaterThan(0)
  })

  it('drops the redundant arm work rather than leaving a token set', () => {
    const { exercises, cuts } = trimForVolume(raw('tuesday'))
    expect(exercises.find((e) => e.exerciseId === 'overhead-tricep-extension')).toBeUndefined()
    expect(cuts.find((c) => c.exerciseId === 'overhead-tricep-extension')?.to).toBe(0)
    for (const e of exercises) expect(e.sets).toBeGreaterThanOrEqual(2)
  })

  it('keeps the day recognisable: the presses and the OHP survive', () => {
    const ids = trimForVolume(raw('tuesday')).exercises.map((e) => e.exerciseId)
    expect(ids).toEqual(
      expect.arrayContaining(['incline-db-press', 'flat-db-press', 'standing-ohp', 'lateral-raise']),
    )
  })

  it('never touches the opening movements', () => {
    const day = raw('tuesday')
    const { exercises } = trimForVolume(day)
    for (let i = 0; i < PROTECTED_LEAD; i++) expect(exercises[i].sets).toBe(day[i].sets)
  })

  it('leaves the leg days alone: glutes are what they are FOR', () => {
    // The first cut of this engine wanted to delete the Bulgarian split
    // squat from every Monday. That was the model being wrong, not the
    // plan. Both of these must come through untouched.
    for (const id of ['monday', 'wednesday']) {
      expect(trimForVolume(raw(id)).cuts, `${id} should not be trimmed`).toEqual([])
    }
  })

  it('leaves a session that is already sane completely alone', () => {
    const light = [ex('incline-db-press', 3), ex('lateral-raise', 3), ex('prone-y-raise', 2)]
    const { cuts, stillOver } = trimForVolume(light)
    expect(cuts).toEqual([])
    expect(stillOver).toEqual([])
  })

  it('terminates when nothing legal is left to cut', () => {
    const stuck = [ex('close-grip-press', 12), ex('overhead-tricep-extension', 12)]
    const { cuts, stillOver } = trimForVolume(stuck)
    expect(cuts).toEqual([])
    expect(stillOver.length).toBeGreaterThan(0) // says so rather than looping
  })
})

describe('resolveDay caps every day it hands out', () => {
  const tiers: Tier[] = [1, 2, 3]

  it('never returns a day that asks too much of any muscle', () => {
    for (const tier of tiers) {
      const d = data(tier)
      for (let i = 0; i < 7 * 4; i++) {
        const date = addDaysISO(START, i)
        const day = resolveDay(date, d)
        if (day.exercises.length === 0) continue
        const over = overloadedRegions(day.exercises)
        expect(over, `tier ${tier} ${date} (${day.templateId}) is over: ${JSON.stringify(over)}`).toEqual([])
      }
    }
  })

  it('caps the push day and explains it in the banner', () => {
    const day = resolveDay(addDaysISO(START, 1), data(1)) // Tuesday
    expect(day.templateId).toBe('tuesday')
    expect(totalSets(day.exercises)).toBe(18)
    const banner = day.banners.find((b) => b.id === 'volume-capped')
    expect(banner?.text).toContain('Overhead Tricep Extension')
  })

  it('says nothing on a day that needed no cap', () => {
    const day = resolveDay(START, data(1)) // Monday, left alone
    expect(day.banners.find((b) => b.id === 'volume-capped')).toBeUndefined()
  })
})

describe('fatigue that is already in the log', () => {
  const set = (weightLb: number, done = true) => ({ weightLb, done })

  it('spots the weight coming down inside an exercise', () => {
    // The owner's Tuesday: 70, 70, 70, then 65 on the fourth OHP set.
    expect(weightDropped([set(70), set(70), set(70), set(65)])).toBe(true)
  })

  it('does not call a steady exercise fatigued', () => {
    expect(weightDropped([set(70), set(70), set(70)])).toBe(false)
    expect(weightDropped([set(65), set(70)])).toBe(false) // climbing
  })

  it('needs two finished sets before it says anything', () => {
    expect(weightDropped([set(70)])).toBe(false)
    expect(weightDropped([set(70), set(65, false)])).toBe(false)
  })

  it('ignores bodyweight work, which has no weight to drop', () => {
    expect(weightDropped([{ done: true }, { done: true }])).toBe(false)
  })
})

describe('slack: the same engine at a lower ceiling', () => {
  it('finds nothing on an already-capped day', () => {
    const day = trimForVolume(raw('tuesday')).exercises
    expect(trimForVolume(day).cuts).toEqual([])
  })

  it('but finds more once fatigue lowers the bar', () => {
    const day = trimForVolume(raw('tuesday')).exercises
    const eased = trimForVolume(day, 3)
    expect(eased.cuts.length).toBeGreaterThan(0)
    expect(totalSets(eased.exercises)).toBeLessThan(totalSets(day))
  })

  it('still refuses to gut the opening lifts', () => {
    const day = trimForVolume(raw('tuesday')).exercises
    const eased = trimForVolume(day, 6)
    for (let i = 0; i < PROTECTED_LEAD; i++) expect(eased.exercises[i].sets).toBe(day[i].sets)
  })
})

import { describe, expect, it } from 'vitest'
import { emptyAppData, defaultWeekState, type AppData, type ResolvedExercise } from '../types'
import { resolveDay } from './resolveDay'
import { addDaysISO } from './calendar'
import {
  ceilingFor,
  overloadedRegions,
  preFatigued,
  regionLoad,
  totalSets,
  trimForVolume,
  volumeVerdict,
  PROTECTED_LEAD,
} from './volume'

// ============================================================
// The case these tests exist for is real, not hypothetical: the
// owner got through 11 of 23 sets on the Tuesday push day with
// cooked shoulders and 12 sets still in front of them. Every
// number below is resolved from the actual plan, so if the plan
// changes the test moves with it instead of guarding a fixture.
// ============================================================

const START = '2026-08-10' // a Monday
const TUESDAY = '2026-08-11'

// Tier 1 is the full plan, the one the owner actually trains.
function data(): AppData {
  const d = emptyAppData(START, START)
  d.settings.onboarded = true
  const week = defaultWeekState(START)
  week.tier = 1
  week.tierPickedAt = `${START}T08:00:00.000Z`
  d.weeks[START] = week
  return d
}

const pushDay = (): ResolvedExercise[] => resolveDay(TUESDAY, data()).exercises
const dayAt = (offset: number): ResolvedExercise[] =>
  resolveDay(addDaysISO(START, offset), data()).exercises

function ex(exerciseId: string, sets: number): ResolvedExercise {
  return { exerciseId, name: exerciseId, kind: 'lift', restSec: 90, sets, repText: '8-12' } as ResolvedExercise
}

describe('fractional set accounting', () => {
  it('counts a prime mover whole and an assisting muscle by half', () => {
    // incline press: chest-upper primary, front delts + triceps secondary
    const load = regionLoad([ex('incline-db-press', 4)])
    expect(load['chest-upper']).toBe(4)
    expect(load['delts-front']).toBe(2)
    expect(load.triceps).toBe(2)
  })

  it('ignores exercises with no muscle mapping instead of throwing', () => {
    expect(regionLoad([ex('not-a-real-exercise', 3)])).toEqual({})
  })

  it('ignores the cardio wash regions', () => {
    const load = regionLoad([ex('easy-run', 1)])
    expect(load['full-body']).toBeUndefined()
    expect(load.heart).toBeUndefined()
  })

  it('small assisting muscles get a lower ceiling than the big movers', () => {
    expect(ceilingFor('triceps')).toBeLessThan(ceilingFor('chest'))
    expect(ceilingFor('delts-front')).toBeLessThan(ceilingFor('quads'))
  })
})

describe('the Tuesday push day, as shipped', () => {
  it('is 23 sets across seven movements', () => {
    const day = pushDay()
    expect(day).toHaveLength(7)
    expect(totalSets(day)).toBe(23)
  })

  // The whole point. If this ever stops failing the ceiling check,
  // either the plan got fixed or the accounting broke, and both are
  // worth a human looking at the diff.
  it('buries the triceps and front delts past their ceiling', () => {
    const load = regionLoad(pushDay())
    expect(load.triceps).toBe(11.5)
    expect(load['delts-front']).toBe(10.5)

    const over = overloadedRegions(pushDay()).map((o) => o.region)
    expect(over).toContain('triceps')
    expect(over).toContain('delts-front')
  })

  it('lands the overhead press on delts that already did the work', () => {
    const stacked = preFatigued(pushDay())
    const ohp = stacked.find((s) => s.exerciseId === 'standing-ohp')
    expect(ohp, 'standing OHP should be flagged as pre-fatigued').toBeDefined()
    expect(ohp!.region).toBe('delts-front')
    expect(ohp!.priorLoad).toBe(3.5)
  })
})

describe('trimForVolume', () => {
  it('brings every muscle back under its ceiling', () => {
    const { exercises, stillOver } = trimForVolume(pushDay())
    expect(stillOver).toEqual([])
    expect(totalSets(exercises)).toBeLessThan(23)
  })

  it('never touches the opening movements', () => {
    const day = pushDay()
    const { exercises } = trimForVolume(day)
    for (let i = 0; i < PROTECTED_LEAD; i++) {
      expect(exercises[i].sets, `${exercises[i].exerciseId} is a lead movement`).toBe(day[i].sets)
    }
  })

  it('drops the redundant arm work rather than leaving a token set', () => {
    const { exercises, cuts } = trimForVolume(pushDay())
    // Overhead extension is pure interest after 11.5 tricep sets.
    expect(exercises.find((e) => e.exerciseId === 'overhead-tricep-extension')).toBeUndefined()
    expect(cuts.find((c) => c.exerciseId === 'overhead-tricep-extension')?.to).toBe(0)
    // Anything kept is kept at a working number of sets, never one.
    for (const e of exercises) expect(e.sets).toBeGreaterThanOrEqual(2)
  })

  it('keeps the day recognisable: the opening press and the OHP survive', () => {
    const ids = trimForVolume(pushDay()).exercises.map((e) => e.exerciseId)
    expect(ids).toContain('incline-db-press')
    expect(ids).toContain('flat-db-press')
    expect(ids).toContain('standing-ohp')
    expect(ids.length).toBeGreaterThanOrEqual(4)
  })

  it('reports exactly what it changed', () => {
    const day = pushDay()
    const { cuts, exercises } = trimForVolume(day)
    expect(cuts.length).toBeGreaterThan(0)
    for (const c of cuts) {
      const before = day.find((e) => e.exerciseId === c.exerciseId)!
      const after = exercises.find((e) => e.exerciseId === c.exerciseId)
      expect(c.from).toBe(before.sets)
      // A dropped movement reports to: 0 and is gone from the list.
      expect(c.to).toBe(after?.sets ?? 0)
      expect(c.to).toBeLessThan(c.from)
    }
    // Nothing silently vanishes: every removal has a cut to explain it.
    for (const e of day) {
      if (!exercises.some((k) => k.exerciseId === e.exerciseId)) {
        expect(cuts.find((c) => c.exerciseId === e.exerciseId)?.to).toBe(0)
      }
    }
  })

  it('leaves a session that is already sane completely alone', () => {
    const light = [ex('incline-db-press', 3), ex('lateral-raise', 3), ex('prone-y-raise', 2)]
    const { exercises, cuts, stillOver } = trimForVolume(light)
    expect(cuts).toEqual([])
    expect(stillOver).toEqual([])
    expect(exercises.map((e) => e.sets)).toEqual([3, 3, 2])
  })

  it('terminates when nothing legal is left to cut', () => {
    // Two movements, both protected, both hammering the triceps.
    const stuck = [ex('close-grip-press', 12), ex('overhead-tricep-extension', 12)]
    const { cuts, stillOver } = trimForVolume(stuck)
    expect(cuts).toEqual([])
    expect(stillOver.length).toBeGreaterThan(0) // says so rather than looping
  })
})

describe('the rest of the tier 1 week', () => {
  // Tuesday was the day that got noticed, not the only offender.
  // Monday asks the glutes for nearly double what one session pays
  // for. Recording it here so a plan edit that fixes or worsens any
  // of these shows up as a moved number rather than a shrug.
  const WORST: [number, string, number][] = [
    [0, 'glutes', 18],
    [1, 'triceps', 11.5],
    [2, 'glutes', 14],
    [4, 'lats', 12],
  ]

  for (const [offset, region, load] of WORST) {
    it(`day +${offset} buries the ${region}`, () => {
      const over = overloadedRegions(dayAt(offset))
      expect(over.find((o) => o.region === region)?.load).toBe(load)
    })
  }

  it('leaves the mobility and athletic days alone', () => {
    expect(overloadedRegions(dayAt(3))).toEqual([]) // Thursday mobility
    expect(overloadedRegions(dayAt(5))).toEqual([]) // Saturday athletic
  })

  it('always reduces the overload, and never invents a new one', () => {
    const debt = (list: ReturnType<typeof overloadedRegions>) =>
      list.reduce((n, o) => n + o.over, 0)
    for (const offset of [0, 1, 2, 4]) {
      const before = overloadedRegions(dayAt(offset))
      const { stillOver, cuts } = trimForVolume(dayAt(offset))
      expect(cuts.length, `day +${offset} should have something to cut`).toBeGreaterThan(0)
      expect(debt(stillOver), `day +${offset} should end up lighter`).toBeLessThan(debt(before))
      const was = new Set(before.map((o) => o.region))
      for (const o of stillOver) {
        expect(was.has(o.region), `${o.region} was not overloaded before the trim`).toBe(true)
      }
    }
  })

  // The push and pull days come all the way down. The two leg days do
  // not, and that is the honest answer rather than a bug: glutes are
  // what Monday and Wednesday are FOR, and every remaining movement is
  // a prime mover for them. The verdict reports the leftover instead
  // of pretending or gutting the session.
  it('clears the push and pull days completely', () => {
    expect(trimForVolume(dayAt(1)).stillOver).toEqual([])
    expect(trimForVolume(dayAt(4)).stillOver).toEqual([])
  })

  it('says so when a leg day is still glute-heavy after trimming', () => {
    for (const offset of [0, 2]) {
      const left = trimForVolume(dayAt(offset)).stillOver
      expect(left.map((o) => o.region)).toEqual(['glutes'])
    }
  })
})

describe('volumeVerdict', () => {
  it('flags the push day and offers a fix', () => {
    const v = volumeVerdict(pushDay())
    expect(v.heavy).toBe(true)
    expect(v.total).toBe(23)
    expect(v.trim).not.toBeNull()
    expect(v.trim!.cuts.length).toBeGreaterThan(0)
  })

  it('stays quiet on a reasonable day', () => {
    const v = volumeVerdict([ex('incline-db-press', 3), ex('lateral-raise', 3)])
    expect(v.heavy).toBe(false)
    expect(v.trim).toBeNull()
  })
})

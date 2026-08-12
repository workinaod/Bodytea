import { describe, expect, it } from 'vitest'
import { defaultWeekState, emptyAppData, type AppData, type EquipTag, type ResolvedExercise } from '../types'
import { getExercise } from '../plan/exercises'
import { MOVEMENT } from '../plan/movement'
import {
  applyAutomatic,
  planAdjustments,
  readSignals,
  weekLoad,
  EXTRA_LOAD_MINUTES,
} from './adapt'

// ============================================================
// The scenarios this engine exists for, written as the week
// they actually happen in. Nobody rebuilds a programme because
// Wednesday got missed; the plan is supposed to notice.
// ============================================================

const TODAY = '2026-08-14' // Friday
const MONDAY = '2026-08-10'

function base(): AppData {
  const d = emptyAppData(MONDAY, TODAY)
  d.settings.onboarded = true
  d.weeks[MONDAY] = defaultWeekState(MONDAY)
  return d
}

const GYM = new Set<EquipTag>([
  'none', 'dumbbell', 'barbell', 'bench', 'incline-bench', 'rack', 'pullup-bar',
  'box', 'plate', 'machine', 'open-space',
])
const DUMBBELLS_ONLY = new Set<EquipTag>(['none', 'dumbbell', 'bench'])

const ex = (exerciseId: string, sets = 3): ResolvedExercise => {
  const def = getExercise(exerciseId)
  return { exerciseId, name: def.name, kind: def.kind, restSec: def.restSec, sets, repText: '8' }
}

function session(date: string, o: Partial<AppData['sessions'][string]> = {}) {
  return {
    date,
    templateId: 'monday',
    status: 'completed' as const,
    exercises: [],
    ...o,
  }
}

const nameOf = (id: string) => {
  const d = getExercise(id)
  return { name: d.name, kind: d.kind, restSec: d.restSec }
}

describe('reading what actually happened', () => {
  it('says nothing about a week that went fine', () => {
    const d = base()
    d.sessions['2026-08-10'] = session('2026-08-10')
    d.sessions['2026-08-12'] = session('2026-08-12')
    expect(readSignals(d, TODAY)).toEqual([])
  })

  it('notices missed sessions, but not a single one', () => {
    const d = base()
    d.sessions['2026-08-11'] = session('2026-08-11', { status: 'skipped' })
    expect(readSignals(d, TODAY).some((s) => s.kind === 'missed')).toBe(false)
    d.sessions['2026-08-12'] = session('2026-08-12', { status: 'skipped' })
    const missed = readSignals(d, TODAY).find((s) => s.kind === 'missed')
    expect(missed?.count).toBe(2)
  })

  it('notices two hours of basketball nobody planned', () => {
    const d = base()
    d.cardio['2026-08-13'] = [
      { id: 'c1', activityId: 'basketball', minutes: 120, at: '2026-08-13T20:00:00.000Z' },
    ] as never
    const extra = readSignals(d, TODAY).find((s) => s.kind === 'extra-load')
    expect(extra).toBeDefined()
    expect(extra!.detail).toContain('120 minutes')
  })

  it('ignores a short walk, which is not a training load', () => {
    const d = base()
    d.cardio['2026-08-13'] = [
      { id: 'c1', activityId: 'walk', minutes: EXTRA_LOAD_MINUTES - 15, at: '2026-08-13T20:00:00.000Z' },
    ] as never
    expect(readSignals(d, TODAY).some((s) => s.kind === 'extra-load')).toBe(false)
  })

  it('notices two bad nights, and lets one go', () => {
    const d = base()
    d.weeks[MONDAY].badSleepDates = ['2026-08-13']
    expect(readSignals(d, TODAY).some((s) => s.kind === 'poor-sleep')).toBe(false)
    d.weeks[MONDAY].badSleepDates = ['2026-08-12', '2026-08-13']
    expect(readSignals(d, TODAY).some((s) => s.kind === 'poor-sleep')).toBe(true)
  })

  it('turns repeated pain into a JOINT, which is the thing a plan can route around', () => {
    const d = base()
    // Two pain notes on a pressing movement. The note records muscles; the
    // joint comes from the movement's metadata.
    for (const date of ['2026-08-11', '2026-08-13']) {
      d.sessions[date] = session(date, {
        fatigue: [{ exerciseId: 'flat-db-press', reason: 'pain', atSetIdx: 2, regions: ['chest'] }],
      })
    }
    const pain = readSignals(d, TODAY).find((s) => s.kind === 'joint-pain')
    expect(pain?.joints).toContain('shoulder')
    expect(pain?.count).toBe(2)
  })

  it('does not reroute off a single complaint', () => {
    const d = base()
    d.sessions['2026-08-13'] = session('2026-08-13', {
      fatigue: [{ exerciseId: 'flat-db-press', reason: 'pain', atSetIdx: 2, regions: ['chest'] }],
    })
    expect(readSignals(d, TODAY).some((s) => s.kind === 'joint-pain')).toBe(false)
  })

  it('does not mistake "that was hard" for pain', () => {
    const d = base()
    for (const date of ['2026-08-11', '2026-08-13']) {
      d.sessions[date] = session(date, {
        fatigue: [{ exerciseId: 'flat-db-press', reason: 'fried', atSetIdx: 2, regions: ['chest'] }],
      })
    }
    expect(readSignals(d, TODAY).some((s) => s.kind === 'joint-pain')).toBe(false)
  })

  it('notices a week of sessions that all felt heavy', () => {
    const d = base()
    for (const date of ['2026-08-10', '2026-08-11', '2026-08-12']) {
      d.sessions[date] = session(date, { feel: 'heavy' })
    }
    expect(readSignals(d, TODAY).some((s) => s.kind === 'accumulated-fatigue')).toBe(true)
  })
})

describe('a week away with only dumbbells', () => {
  const day = [ex('barbell-row'), ex('front-squat'), ex('lat-pulldown')]

  it('rewrites the session automatically, because it cannot otherwise be done', () => {
    const adj = planAdjustments(day, { owned: DUMBBELLS_ONLY, signals: [] })
    expect(adj.every((a) => a.automatic)).toBe(true)
    expect(adj).toHaveLength(3)
  })

  it('keeps the movement pattern of everything it swaps', () => {
    const adj = planAdjustments(day, { owned: DUMBBELLS_ONLY, signals: [] })
    for (const a of adj) {
      expect(MOVEMENT[a.toExerciseId!].pattern, `${a.exerciseId} → ${a.toExerciseId}`).toBe(
        MOVEMENT[a.exerciseId!].pattern,
      )
    }
  })

  it('names the missing gear rather than saying "equipment"', () => {
    const adj = planAdjustments([ex('barbell-row')], { owned: DUMBBELLS_ONLY, signals: [] })
    expect(adj[0].because).toContain('barbell')
  })

  it('leaves the prescription alone, so next week\'s progression still reads', () => {
    const applied = applyAutomatic(day, planAdjustments(day, { owned: DUMBBELLS_ONLY, signals: [] }), nameOf)
    expect(applied.map((e) => e.sets)).toEqual([3, 3, 3])
    expect(applied.map((e) => e.repText)).toEqual(['8', '8', '8'])
    expect(applied.every((e) => e.swappedFrom)).toBe(true)
  })

  it('changes nothing when the gym is available', () => {
    expect(planAdjustments(day, { owned: GYM, signals: [] })).toEqual([])
  })
})

describe('a shoulder that keeps complaining', () => {
  const d = base()
  for (const date of ['2026-08-11', '2026-08-13']) {
    d.sessions[date] = session(date, {
      fatigue: [{ exerciseId: 'flat-db-press', reason: 'pain', atSetIdx: 2, regions: ['chest'] }],
    })
  }
  const signals = readSignals(d, TODAY)

  it('routes around the joint without a tap, and keeps training the pattern', () => {
    const day = [ex('flat-db-press'), ex('leg-extension')]
    const adj = planAdjustments(day, { owned: GYM, signals })
    const swap = adj.find((a) => a.exerciseId === 'flat-db-press')
    expect(swap?.automatic).toBe(true)
    expect(MOVEMENT[swap!.toExerciseId!].stress).not.toContain('shoulder')
    expect(MOVEMENT[swap!.toExerciseId!].pattern).toBe('push-horizontal')
  })

  it('leaves movements that do not touch the shoulder alone', () => {
    const adj = planAdjustments([ex('leg-extension'), ex('goblet-squat')], { owned: GYM, signals })
    expect(adj).toEqual([])
  })

  it('says which joint, in the athlete\'s words', () => {
    const adj = planAdjustments([ex('flat-db-press')], { owned: GYM, signals })
    expect(adj[0].because).toContain('shoulder')
  })
})

describe('tired, and already loaded up', () => {
  it('proposes holding the load rather than doing it silently', () => {
    const d = base()
    d.weeks[MONDAY].badSleepDates = ['2026-08-12', '2026-08-13']
    const adj = planAdjustments([ex('goblet-squat')], { owned: GYM, signals: readSignals(d, TODAY) })
    const hold = adj.find((a) => a.kind === 'hold-load')
    expect(hold?.automatic).toBe(false)
    expect(hold?.because).toContain('bad nights')
  })

  it('only cuts volume when tired AND already loaded, not for either alone', () => {
    const tiredOnly = base()
    tiredOnly.weeks[MONDAY].badSleepDates = ['2026-08-12', '2026-08-13']
    expect(
      planAdjustments([ex('goblet-squat')], { owned: GYM, signals: readSignals(tiredOnly, TODAY) }).some(
        (a) => a.kind === 'reduce-volume',
      ),
    ).toBe(false)

    const both = base()
    both.weeks[MONDAY].badSleepDates = ['2026-08-12', '2026-08-13']
    both.cardio['2026-08-13'] = [
      { id: 'c1', activityId: 'basketball', minutes: 120, at: '2026-08-13T20:00:00.000Z' },
    ] as never
    const adj = planAdjustments([ex('goblet-squat')], { owned: GYM, signals: readSignals(both, TODAY) })
    expect(adj.some((a) => a.kind === 'reduce-volume')).toBe(true)
  })

  it('never makes a day harder than the plan called for', () => {
    // The one-way rule: this engine removes and reroutes, it does not add.
    const both = base()
    both.weeks[MONDAY].badSleepDates = ['2026-08-12', '2026-08-13']
    both.cardio['2026-08-13'] = [
      { id: 'c1', activityId: 'basketball', minutes: 120, at: '2026-08-13T20:00:00.000Z' },
    ] as never
    for (const a of planAdjustments([ex('goblet-squat')], { owned: GYM, signals: readSignals(both, TODAY) })) {
      expect(a.kind).not.toBe('add-volume')
      if (a.sets !== undefined) expect(a.sets).toBeGreaterThan(0)
    }
  })
})

describe('the week the body actually had', () => {
  it('counts the sport nobody programmed alongside the sessions that were', () => {
    const d = base()
    d.sessions[MONDAY] = session(MONDAY, {
      exercises: [{ exerciseId: 'front-squat', sets: [{ targetReps: '5', done: true }, { targetReps: '5', done: true }] }],
    })
    d.cardio['2026-08-13'] = [
      { id: 'c1', activityId: 'basketball', minutes: 120, at: '2026-08-13T20:00:00.000Z' },
    ] as never
    const load = weekLoad(d, TODAY)
    expect(load.planned).toBeGreaterThan(0)
    expect(load.unplanned).toBeGreaterThan(0)
  })

  it('reads zero for a week with nothing in it', () => {
    expect(weekLoad(base(), TODAY)).toEqual({ planned: 0, unplanned: 0 })
  })
})

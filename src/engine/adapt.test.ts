import { describe, expect, it } from 'vitest'
import { defaultWeekState, emptyAppData, type AppData, type EquipTag, type ResolvedExercise } from '../types'
import { getExercise } from '../plan/exercises'
import { MOVEMENT } from '../plan/movement'
import { adaptSession } from './adapt'
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
      { id: 'c1', activityId: 'basketball', label: 'Basketball', when: 'solo', minutes: 120, at: '2026-08-13T20:00:00.000Z' },
    ] as never
    const extra = readSignals(d, TODAY).find((s) => s.kind === 'extra-load')
    expect(extra).toBeDefined()
    expect(extra!.detail).toContain('120 minutes')
  })

  it('ignores a short walk, which is not a training load', () => {
    const d = base()
    d.cardio['2026-08-13'] = [
      { id: 'c1', activityId: 'walk', label: 'Walk', when: 'solo', minutes: EXTRA_LOAD_MINUTES - 15, at: '2026-08-13T20:00:00.000Z' },
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

describe('short sleep cuts SETS, not the session', () => {
  // Sleep restriction largely preserves maximal strength on a single
  // effort. What degrades is repeated effort, time to exhaustion and
  // reaction time, while perceived exertion climbs — the same set feels
  // harder than it is. So the sets are what should give, at the same
  // weight, and a day off is the wrong answer entirely. Somebody who
  // sleeps badly twice a week and is told to skip trains half as much as
  // they should for the rest of their life.
  const badlySlept = () => {
    const d = base()
    d.weeks[MONDAY].badSleepDates = ['2026-08-12', '2026-08-13']
    return d
  }

  it('offers fewer sets at the same weight, off sleep alone', () => {
    const adj = planAdjustments([ex('goblet-squat')], { owned: GYM, signals: readSignals(badlySlept(), TODAY) })
    const cut = adj.find((a) => a.kind === 'reduce-volume')
    expect(cut?.automatic).toBe(false)
    expect(cut?.because).toContain('same weight')
  })

  it('does NOT tell somebody to hold the load off one bad stretch of sleep', () => {
    // Strength is the thing sleep loss spares. Holding it would be
    // treating the one preserved quality as the damaged one.
    const adj = planAdjustments([ex('goblet-squat')], { owned: GYM, signals: readSignals(badlySlept(), TODAY) })
    expect(adj.some((a) => a.kind === 'hold-load')).toBe(false)
  })

  it('never proposes skipping, whatever the signals say', () => {
    const d = badlySlept()
    d.cardio['2026-08-13'] = [
      { id: 'c1', activityId: 'basketball', label: 'Basketball', when: 'solo', minutes: 120, at: '2026-08-13T20:00:00.000Z' },
    ] as never
    for (const a of planAdjustments([ex('goblet-squat')], { owned: GYM, signals: readSignals(d, TODAY) })) {
      expect(['substitute', 'reduce-volume', 'hold-load', 'add-recovery']).toContain(a.kind)
      if (a.sets !== undefined) expect(a.sets).toBe(1)
    }
  })

  it('does not cut a SECOND time when the resolver already cut for sleep', () => {
    // Two consecutive bad nights already costs a third of the day's
    // volume inside resolveDay. Another set on top is two reductions for
    // one night's sleep.
    const adj = planAdjustments([ex('goblet-squat')], {
      owned: GYM,
      signals: readSignals(badlySlept(), TODAY),
      alreadyCutForSleep: true,
    })
    expect(adj.some((a) => a.kind === 'reduce-volume')).toBe(false)
  })

  it('adds the hold-load only once unplanned load is stacked on top', () => {
    const d = badlySlept()
    d.cardio['2026-08-13'] = [
      { id: 'c1', activityId: 'basketball', label: 'Basketball', when: 'solo', minutes: 120, at: '2026-08-13T20:00:00.000Z' },
    ] as never
    const adj = planAdjustments([ex('goblet-squat')], { owned: GYM, signals: readSignals(d, TODAY) })
    expect(adj.some((a) => a.kind === 'reduce-volume')).toBe(true)
    expect(adj.some((a) => a.kind === 'hold-load')).toBe(true)
  })

  it('never makes a day harder than the plan called for', () => {
    // The one-way rule: this engine removes and reroutes, it does not add.
    const both = base()
    both.weeks[MONDAY].badSleepDates = ['2026-08-12', '2026-08-13']
    both.cardio['2026-08-13'] = [
      { id: 'c1', activityId: 'basketball', label: 'Basketball', when: 'solo', minutes: 120, at: '2026-08-13T20:00:00.000Z' },
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
      { id: 'c1', activityId: 'basketball', label: 'Basketball', when: 'solo', minutes: 120, at: '2026-08-13T20:00:00.000Z' },
    ] as never
    const load = weekLoad(d, TODAY)
    expect(load.planned).toBeGreaterThan(0)
    expect(load.unplanned).toBeGreaterThan(0)
  })

  it('reads zero for a week with nothing in it', () => {
    expect(weekLoad(base(), TODAY)).toEqual({ planned: 0, unplanned: 0 })
  })
})


describe('coming back after missing sessions', () => {
  const missedTwice = () => {
    const d = base()
    d.sessions['2026-08-11'] = session('2026-08-11', { status: 'skipped' })
    d.sessions['2026-08-12'] = session('2026-08-12', { status: 'skipped' })
    return d
  }

  it('proposes holding the weight rather than picking up where the plan expected', () => {
    const adj = planAdjustments([ex('goblet-squat')], {
      owned: GYM,
      signals: readSignals(missedTwice(), TODAY),
    })
    const hold = adj.find((a) => a.kind === 'hold-load')
    expect(hold?.automatic).toBe(false)
    expect(hold?.because).toContain('Coming back')
  })

  it('keeps the VOLUME after a gap, which is the opposite of the sleep case', () => {
    // The mirror image, and the reason these two must not share an
    // answer. Nothing is fatigued after a gap; if anything there is
    // slight detraining, so the volume is wanted and it is the LOAD that
    // should not pick up where the plan expected.
    const adj = planAdjustments([ex('goblet-squat')], { owned: GYM, signals: readSignals(missedTwice(), TODAY) })
    expect(adj.some((a) => a.kind === 'reduce-volume')).toBe(false)
    expect(adj.some((a) => a.kind === 'hold-load')).toBe(true)
  })

  it('says the load thing once, not twice, when they are also short of sleep', () => {
    const d = missedTwice()
    d.weeks[MONDAY].badSleepDates = ['2026-08-12', '2026-08-13']
    const adj = planAdjustments([ex('goblet-squat')], { owned: GYM, signals: readSignals(d, TODAY) })
    expect(adj.filter((a) => a.kind === 'hold-load')).toHaveLength(1)
    // And the acute problem still wins on volume.
    expect(adj.some((a) => a.kind === 'reduce-volume')).toBe(true)
  })
})

describe('a proposal the athlete actually took', () => {
  const day = [ex('goblet-squat', 4), ex('flat-db-press', 3), ex('couch-stretch', 2)]

  it('does nothing at all until it is accepted', () => {
    const d = base()
    expect(adaptSession(day, d, TODAY, [...GYM], nameOf).exercises.map((e) => e.sets)).toEqual([4, 3, 2])
  })

  it('does not ANNOUNCE a proposal as though it had been applied', () => {
    // adaptSession filters to the automatic adjustments before it writes
    // any note. Drop that filter and the day grows a banner explaining a
    // change nobody agreed to and nothing actually made, which is worse
    // than either doing it or staying quiet.
    const d = base()
    d.weeks[MONDAY].badSleepDates = ['2026-08-12', '2026-08-13']
    d.cardio['2026-08-13'] = [
      { id: 'c1', activityId: 'basketball', label: 'Basketball', when: 'solo', minutes: 120, at: '2026-08-13T20:00:00.000Z' },
    ] as never
    const out = adaptSession(day, d, TODAY, [...GYM], nameOf)
    expect(readSignals(d, TODAY).length).toBeGreaterThan(0) // the offers exist
    expect(out.notes).toEqual([]) // and the day says nothing about them
    expect(out.exercises.map((e) => e.sets)).toEqual([4, 3, 2])
  })

  it('takes one set off each lift once accepted', () => {
    const d = base()
    d.adapt[TODAY] = ['reduce-volume']
    const out = adaptSession(day, d, TODAY, [...GYM], nameOf)
    expect(out.exercises.map((e) => e.sets)).toEqual([3, 2, 2])
    expect(out.notes.join(' ')).toContain('set off each lift')
  })

  it('leaves stretching alone, because cutting a set of that is not a reduction', () => {
    const d = base()
    d.adapt[TODAY] = ['reduce-volume']
    const out = adaptSession([ex('couch-stretch', 3)], d, TODAY, [...GYM], nameOf)
    expect(out.exercises[0].sets).toBe(3)
  })

  it('never cuts a lift below the point where it stops training anything', () => {
    const d = base()
    d.adapt[TODAY] = ['reduce-volume']
    const out = adaptSession([ex('goblet-squat', 2)], d, TODAY, [...GYM], nameOf)
    expect(out.exercises[0].sets).toBe(2)
  })

  it('holding the load is NOT the same switch as cutting sets', () => {
    // Two different decisions off two different pieces of evidence. Running
    // them through one control is how "take it easy" quietly became three
    // reductions stacked on one session.
    const d = base()
    d.adapt[TODAY] = ['hold-load']
    expect(adaptSession(day, d, TODAY, [...GYM], nameOf).exercises.map((e) => e.sets)).toEqual([4, 3, 2])
  })
})

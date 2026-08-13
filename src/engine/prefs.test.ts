import { describe, expect, it } from 'vitest'
import { emptyAppData, defaultWeekState, type AppData, type SessionLog } from '../types'
import { addDaysISO } from './calendar'
import { resolveDay } from './resolveDay'
import { estimateMinutes } from './focus'
import { phaseFor, PHASE_WEEKS } from './phase'
import { planAdjustments, readSignals } from './adapt'
import { isMisordered } from './sequence'
import { limitedJoints } from '../prefsTypes'
import { envelopeSchema } from '../store/schema'

// ============================================================
// The app remembering what it was told.
//
// Before this there was no preference memory anywhere. data.swaps
// is keyed by a single ISO date, so swapping out a movement you
// hate bought one day of relief and it was back tomorrow. An
// injury was inferred from a rolling 14-day window of "I can't
// finish this" answers, which meant the only way to keep the plan
// off a bad shoulder was to keep hurting it at least once a
// fortnight. And "I have forty minutes" was answered by a sheet
// offering to end the session early, which is not a plan for
// forty minutes.
//
// Every test here is really the same test: the athlete said
// something, and next week the app still knows.
// ============================================================

const START = '2026-08-10'

function data(): AppData {
  const d = emptyAppData(START, START)
  d.settings.onboarded = true
  for (let w = 0; w < 40; w++) {
    const monday = addDaysISO(START, w * 7)
    d.weeks[monday] = defaultWeekState(monday)
  }
  return d
}

/** Every exercise the plan hands out across one week. */
function weekIds(d: AppData, from: string): Set<string> {
  const ids = new Set<string>()
  for (let i = 0; i < 7; i++) {
    for (const e of resolveDay(addDaysISO(from, i), d).exercises) ids.add(e.exerciseId)
  }
  return ids
}

describe('a movement they said to keep out', () => {
  it('stops appearing, and not just for one day', () => {
    const before = data()
    const victim = [...weekIds(before, START)].find((id) => id === 'romanian-deadlift')
    expect(victim, 'fixture assumes the RDL is programmed').toBeTruthy()

    const d = data()
    d.prefs.blocked = [{ exerciseId: 'romanian-deadlift', reason: 'hurts', since: START }]
    // Not one day. Every day, this week and next month.
    expect(weekIds(d, START).has('romanian-deadlift')).toBe(false)
    expect(weekIds(d, addDaysISO(START, 28)).has('romanian-deadlift')).toBe(false)
  })

  it('puts something in its place rather than leaving a hole', () => {
    const plain = data()
    const d = data()
    d.prefs.blocked = [{ exerciseId: 'romanian-deadlift', reason: 'dislike', since: START }]
    const day = (s: AppData) =>
      [0, 1, 2, 3, 4, 5, 6]
        .map((i) => resolveDay(addDaysISO(START, i), s))
        .find((r) => r.exercises.some((e) => e.exerciseId === 'romanian-deadlift' || e.swappedFrom === 'romanian-deadlift'))
    const was = day(plain)
    const now = day(d)
    expect(was).toBeTruthy()
    expect(now?.exercises.some((e) => e.swappedFrom === 'romanian-deadlift')).toBe(true)
  })
})

describe('a substitute landing in the right place', () => {
  it('is re-sequenced, not left in the slot of the movement it replaced', () => {
    // A blocked primary squat is swapped for a secondary one, and the
    // secondary inherited the primary's opening position: a whole day of
    // lifting led by a hack squat with two primaries queued behind it,
    // every session, because the substitution ran after the sort.
    const d = data()
    d.prefs.blocked = [{ exerciseId: 'goblet-squat', reason: 'dislike', since: START }]
    for (let i = 0; i < 28; i++) {
      const r = resolveDay(addDaysISO(START, i), d)
      if (r.kind !== 'session') continue
      expect(
        isMisordered(r.exercises),
        `${r.date}: ${r.exercises.map((e) => e.exerciseId).join(' > ')}`,
      ).toBe(false)
    }
  })
})

describe('a limitation they typed in', () => {
  /** Everything the plan wants to change about one week, for a stated joint. */
  const adjustmentsFor = (d: AppData, from: string) =>
    [0, 1, 2, 3, 4, 5, 6]
      .map((i) => resolveDay(addDaysISO(from, i), d))
      .filter((r) => r.kind === 'session')
      .flatMap((r) =>
        planAdjustments(r.exercises, {
          owned: new Set(d.plan.equipment),
          signals: readSignals(d, r.date),
          limited: limitedJoints(d.prefs),
        }),
      )

  it('never expires, however long since it was last mentioned', () => {
    const d = data()
    d.prefs.limitations = [{ label: 'dodgy left knee', joints: ['knee'], since: START }]
    // An inferred pain signal lives in a rolling 14-day window, so by now
    // it would be long gone. That window is exactly what this is not.
    expect(adjustmentsFor(d, START).length).toBeGreaterThan(0)
    expect(adjustmentsFor(d, addDaysISO(START, 120)).length).toBeGreaterThan(0)
  })

  it('says something about a joint even when no substitute can spare it', () => {
    // There is no way to squat without loading a knee: the pattern IS the
    // stress, so substitutesFor correctly returns nothing. Going quiet
    // about precisely the movements that hurt is the old bug.
    const d = data()
    d.prefs.limitations = [{ label: 'knee', joints: ['knee'], since: START }]
    const adj = adjustmentsFor(d, START)
    expect(adj.some((a) => a.kind === 'reduce-load' || a.kind === 'substitute')).toBe(true)
  })

  it('leaves the plan alone when nothing has been stated', () => {
    expect(adjustmentsFor(data(), START)).toEqual([])
  })
})

describe('a lift they pinned', () => {
  const intoPhase2 = addDaysISO(START, PHASE_WEEKS * 7)

  function climbing(d: AppData, exerciseId: string) {
    for (let i = 0; i < 12; i++) {
      const date = addDaysISO(START, i * 7)
      d.sessions[date] = {
        date,
        templateId: 'monday',
        status: 'completed',
        exercises: [{ exerciseId, sets: [{ targetReps: '8', weightLb: 100 + i * 10, reps: 8, done: true }] }],
      } as SessionLog
    }
  }

  it('is left alone at a phase boundary even when it was earned', () => {
    const earned = data()
    climbing(earned, 'goblet-squat')
    expect(phaseFor(earned, intoPhase2).verdicts.find((v) => v.from === 'goblet-squat')?.outcome).toBe('promoted')

    const pinned = data()
    climbing(pinned, 'goblet-squat')
    pinned.prefs.pinned = ['goblet-squat']
    const v = phaseFor(pinned, intoPhase2).verdicts.find((x) => x.from === 'goblet-squat')
    expect(v?.outcome).toBe('pinned')
    expect(v?.to).toBe('goblet-squat')
    expect(phaseFor(pinned, intoPhase2).overrides.squatVariation).toBeUndefined()
  })
})

describe('the time they actually have', () => {
  it('shortens the day to fit rather than offering to abandon it', () => {
    const full = data()
    const rushed = data()
    rushed.prefs.sessionMinutes = 25

    const busiest = (s: AppData) =>
      [0, 1, 2, 3, 4, 5, 6]
        .map((i) => resolveDay(addDaysISO(START, i), s))
        .reduce((a, b) => (estimateMinutes(a.exercises) >= estimateMinutes(b.exercises) ? a : b))

    const before = busiest(full)
    const after = resolveDay(before.date, rushed)
    expect(estimateMinutes(before.exercises)).toBeGreaterThan(25)
    expect(estimateMinutes(after.exercises)).toBeLessThan(estimateMinutes(before.exercises))
  })

  it('leaves a day that already fits completely alone', () => {
    const full = data()
    const generous = data()
    generous.prefs.sessionMinutes = 600
    for (let i = 0; i < 7; i++) {
      const date = addDaysISO(START, i)
      expect(resolveDay(date, generous).exercises).toEqual(resolveDay(date, full).exercises)
    }
  })

  it('never cuts a day down to nothing, whatever the budget', () => {
    const d = data()
    d.prefs.sessionMinutes = 1
    for (let i = 0; i < 7; i++) {
      const r = resolveDay(addDaysISO(START, i), d)
      if (r.kind !== 'session') continue
      expect(r.exercises.length, `${r.date} was emptied`).toBeGreaterThan(0)
    }
  })
})

describe('data written before any of this existed', () => {
  it('parses, and starts with nothing said', () => {
    const d = data()
    const envelope = { schemaVersion: 20, exportedAt: START, appVersion: '1.0.0', data: { ...d } } as Record<string, unknown>
    delete (envelope.data as Record<string, unknown>).prefs
    const parsed = envelopeSchema.safeParse(envelope)
    expect(parsed.success, parsed.success ? '' : JSON.stringify(parsed.error?.issues[0])).toBe(true)
    if (parsed.success) {
      expect(parsed.data.data.prefs).toEqual({ blocked: [], pinned: [], limitations: [] })
    }
  })
})

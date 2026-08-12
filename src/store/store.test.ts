import { describe, expect, it } from 'vitest'
import { emptyAppData, SCHEMA_VERSION } from '../types'
import { buildExport, buildEnvelope, parseEnvelope, serializeState } from './backup'
import { migrate } from './schema'
import { MIN_KCAL_REST, MIN_KCAL_TRAINING } from '../plan/kcalFloor'
import { macrosFor } from '../engine/stats'

function fixtureData() {
  const data = emptyAppData('2026-08-10')
  data.settings.onboarded = true
  data.sessions['2026-08-10'] = {
    date: '2026-08-10',
    templateId: 'monday',
    status: 'completed',
    readiness: { flags: [false, false, false, false], downgraded: false },
    exercises: [
      { exerciseId: 'box-jump', sets: [{ targetReps: '3', reps: 3, done: true }] },
      { exerciseId: 'goblet-squat', sets: [{ targetReps: '6-8', weightLb: 80, reps: 8, done: true }] },
    ],
  }
  // A start-time intensity choice rides on the log and must round-trip
  data.sessions['2026-08-12'] = {
    date: '2026-08-12',
    templateId: 'wednesday',
    status: 'downgraded-completed',
    intensity: 'minimum',
    exercises: [{ exerciseId: 'goblet-squat', sets: [{ targetReps: '6-8', reps: 8, done: true }] }],
  }
  data.excuses.push({
    id: 'x1',
    at: '2026-08-11T10:00:00.000Z',
    date: '2026-08-11',
    scope: 'day',
    action: 'skip',
    reason: 'busy',
    proofPhotoId: 'p1',
    accepted: true,
    minimumViableTaken: false,
    escalationLevelAtTime: 0,
  })
  data.photos.push({ id: 'p1', kind: 'proof', takenAt: '2026-08-11T09:00:00.000Z', w: 100, h: 100, bytes: 1234 })
  data.meals['2026-08-10'] = {
    date: '2026-08-10',
    entries: [
      { id: 'm1', at: '2026-08-10T12:00:00.000Z', label: 'Chicken + rice', proteinG: 60, kcal: 750, source: 'mealTemplate', servings: 1 },
    ],
    supplements: { creatine: true, fishOil: false, vitD3: true, electrolytes: false },
  }
  data.measurements.push({ date: '2026-08-16', weightLb: 197, waistIn: 36, photoIds: { front: 'p1' } })
  data.coach.feed.push({ id: 'c1', at: '2026-08-10T18:00:00.000Z', kind: 'coach', situation: 'session-done', text: 'Work banked.' })
  data.coach.shownMessageIds.push('session-done:0')
  data.coach.surfacedInsights['recomp-waist'] = '2026-08-16'
  return data
}

describe('backup round trip', () => {
  it('serialize → parse yields deep-equal data', () => {
    const data = fixtureData()
    const raw = serializeState(data)
    const parsed = parseEnvelope(raw)
    expect(parsed.data).toEqual(data)
  })

  it('full export inlines photo blobs and round-trips', async () => {
    const data = fixtureData()
    const env = await buildExport(data, true, async (id) => (id === 'p1' ? 'aGVsbG8=' : null))
    expect(env.photoBlobs).toEqual({ p1: 'aGVsbG8=' })
    const parsed = parseEnvelope(JSON.stringify(env))
    expect(parsed.data).toEqual(data)
    expect(parsed.photoBlobs).toEqual({ p1: 'aGVsbG8=' })
  })

  it('data-only export omits blobs', async () => {
    const env = await buildExport(fixtureData(), false, async () => 'nope')
    expect(env.photoBlobs).toBeUndefined()
  })
})

describe('migrations', () => {
  it('upgrades a v1 backup (no reminder settings) to the current schema', () => {
    const env = JSON.parse(serializeState(fixtureData())) as {
      schemaVersion: number
      data: { settings: Record<string, unknown> }
    }
    env.schemaVersion = 1
    delete env.data.settings.remindersEnabled
    delete env.data.settings.reminderTimes
    const parsed = parseEnvelope(JSON.stringify(env))
    expect(parsed.schemaVersion).toBe(SCHEMA_VERSION)
    expect(parsed.data.settings.remindersEnabled).toBe(false)
    expect(parsed.data.settings.reminderTimes).toEqual(['05:00', '17:00']) // v6 trims to two, v12 moves to 5/5
  })

  it('upgrades a v2 backup (weeks without ball fields) to v3', () => {
    const env = JSON.parse(serializeState(fixtureData())) as {
      schemaVersion: number
      data: { weeks: Record<string, Record<string, unknown>> }
    }
    env.schemaVersion = 2
    env.data.weeks['2026-08-10'] = {
      mondayISO: '2026-08-10',
      tier: 1,
      tierPickedAt: null,
      tierChanges: [],
      ballThisWeek: null,
      gigFlags: {},
      badSleepDates: [],
    }
    const parsed = parseEnvelope(JSON.stringify(env))
    expect(parsed.schemaVersion).toBe(SCHEMA_VERSION)
    expect(parsed.data.weeks['2026-08-10'].ballDates).toEqual([])
    expect(parsed.data.weeks['2026-08-10'].cnsSwapDates).toEqual([])
  })

  it('upgrades a v3 backup through the chain: NAOD V4 preset injected, history untouched (owner continuity)', () => {
    const env = JSON.parse(serializeState(fixtureData())) as {
      schemaVersion: number
      data: Record<string, unknown> & { settings: Record<string, unknown> }
    }
    // Reconstruct a faithful v3 envelope: no plan/profile/grocery/units yet.
    env.schemaVersion = 3
    delete env.data.plan
    delete env.data.profile
    delete env.data.grocery
    delete env.data.settings.units
    delete env.data.swaps
    delete env.data.dayLoad
    const parsed = parseEnvelope(JSON.stringify(env))
    expect(parsed.schemaVersion).toBe(SCHEMA_VERSION)
    expect(parsed.data.plan.name).toBe('NAOD V4') // v7 upgrades the owner's preset
    expect(parsed.data.swaps).toEqual({}) // v8 seeds the swap map
    expect(parsed.data.dayLoad).toEqual({}) // v9 seeds the day-trim map
    expect(parsed.data.plan.goal).toBe('vertical')
    expect(parsed.data.plan.lifeRules).toEqual({ djWeekend: true, longShiftMonday: true })
    expect(Object.keys(parsed.data.plan.templates).length).toBeGreaterThanOrEqual(11)
    expect(parsed.data.profile).toEqual({})
    expect(parsed.data.grocery).toEqual([])
    expect(parsed.data.settings.units).toBe('imperial')
  })

  it('upgrades a v4 backup to v5: gig toggles become day-marked life events', () => {
    const env = JSON.parse(serializeState(fixtureData())) as {
      schemaVersion: number
      data: Record<string, unknown> & {
        plan: Record<string, unknown>
        weeks: Record<string, Record<string, unknown>>
      }
    }
    // Reconstruct a faithful v4 envelope: gigFlags model, no lifeEvents/cardio/swaps.
    env.schemaVersion = 4
    delete env.data.cardio
    delete env.data.swaps
    delete env.data.plan.lifeEvents
    env.data.weeks['2026-08-10'] = {
      mondayISO: '2026-08-10',
      tier: 1,
      tierPickedAt: null,
      tierChanges: [],
      ballThisWeek: null,
      ballDates: [],
      cnsSwapDates: [],
      gigFlags: { djFriNight: true, djSatNight: true, longShiftBeforeMon: true, friPushedToSat: true },
      badSleepDates: [],
    }
    const parsed = parseEnvelope(JSON.stringify(env))
    expect(parsed.schemaVersion).toBe(SCHEMA_VERSION)
    // Owner's defs seeded from his lifeRules
    expect(parsed.data.plan.lifeEvents.map((e) => e.id).sort()).toEqual(['dj', 'shift'])
    const w = parsed.data.weeks['2026-08-10']
    expect(w.events.dj).toEqual([5, 6])
    expect(w.friPushedToSat).toBe(true)
    expect('gigFlags' in w).toBe(false)
    // "Long shift before Monday" = Sunday that ENDS the previous week
    expect(parsed.data.weeks['2026-08-03']?.events.shift).toEqual([0])
    expect(parsed.data.cardio).toEqual({})
  })
})

describe('every activity the tracker can record survives a backup', () => {
  it('accepts a hike, which the tracker offers and the schema refused', () => {
    // The Track sheet has offered four GPS activities since it was
    // redesigned, and RunTrackerSheet takes all four. The zod mirror
    // still listed three. So a tracked hike saved fine, sat in the
    // app fine, and then failed its own backup the moment the user
    // tried to restore one: "activity: invalid enum value". Their
    // whole history, refused over a walk in the woods.
    for (const activity of ['run', 'bike', 'walk', 'hike'] as const) {
      const data = fixtureData()
      data.runs = [
        {
          id: `r-${activity}`,
          activity,
          date: '2026-08-10',
          startedAt: '2026-08-10T12:00:00.000Z',
          durationSec: 1800,
          distanceMi: 2.4,
          avgPaceSec: 750,
          splits: [750, 750],
          points: [],
        },
      ]
      expect(parseEnvelope(serializeState(data)).data.runs[0].activity).toBe(activity)
    }
  })
})

describe('import validation', () => {
  it('rejects non-JSON', () => {
    expect(() => parseEnvelope('not json')).toThrow(/not valid JSON/)
  })

  it('rejects JSON that is not a backup', () => {
    expect(() => parseEnvelope('{"hello":"world"}')).toThrow(/schema version/i)
  })

  it('rejects newer schema versions with a clear message', () => {
    const env = { ...JSON.parse(serializeState(fixtureData())), schemaVersion: 99 }
    expect(() => parseEnvelope(JSON.stringify(env))).toThrow(/newer app version/)
  })

  it('rejects structurally broken data with a path', () => {
    const env = JSON.parse(serializeState(fixtureData()))
    env.data.sessions['2026-08-10'].status = 'exploded'
    expect(() => parseEnvelope(JSON.stringify(env))).toThrow(/sessions/)
  })
})

describe('v9 → v10: meal plan becomes per-user booklet data', () => {
  it("injects the owner's PDF meals for NAOD plans", () => {
    const env = JSON.parse(serializeState(fixtureData())) as {
      schemaVersion: number
      data: { plan: Record<string, unknown> }
    }
    env.schemaVersion = 9
    delete env.data.plan.mealPlan
    const parsed = parseEnvelope(JSON.stringify(env))
    const mp = parsed.data.plan.mealPlan
    expect(mp.templates.some((t) => t.id === 't-breakfast')).toBe(true) // PDF meals verbatim
    expect(mp.supplements.map((s) => s.id)).toContain('creatine')
    expect(mp.grocery.some((g) => g.category === 'Protein')).toBe(true)
  })

  it('scales generic templates to a non-NAOD plan’s own targets', () => {
    const env = JSON.parse(serializeState(fixtureData())) as {
      schemaVersion: number
      data: {
        plan: Record<string, unknown> & { nutrition: { kcalTraining: number; kcalRest: number } }
        settings: Record<string, unknown>
      }
    }
    env.schemaVersion = 9
    env.data.plan.name = 'Vertical Project · 6-Day'
    env.data.plan.nutrition = { kcalTraining: 2900, kcalRest: 2600 }
    env.data.settings.proteinTargetG = 175
    delete env.data.plan.mealPlan
    const parsed = parseEnvelope(JSON.stringify(env))
    const mp = parsed.data.plan.mealPlan
    const trainP = mp.templates.filter((t) => t.dayType === 'training').reduce((s, t) => s + t.proteinG, 0)
    expect(Math.abs(trainP - 175)).toBeLessThanOrEqual(12)
    expect(mp.templates.some((t) => t.id === 't-breakfast')).toBe(false) // not the owner's meals
  })
})

describe('v10 → v11: sub-10% body fat joins the owner’s goal', () => {
  it("writes the target into NAOD plans and leaves others alone", () => {
    const env = JSON.parse(serializeState(fixtureData())) as {
      schemaVersion: number
      data: { plan: Record<string, unknown> & { customTargets: unknown[] } }
    }
    env.schemaVersion = 10
    env.data.plan.goalStatement = 'Consistent dunks, elite speed, and a build that shows it.'
    env.data.plan.customTargets = []
    const parsed = parseEnvelope(JSON.stringify(env))
    expect(parsed.data.plan.goalStatement).toContain('sub-10% body fat')
    expect(parsed.data.plan.customTargets).toEqual([{ label: 'Body fat', target: 10, unit: '%' }])

    // A generated plan keeps its own words and targets
    const env2 = JSON.parse(serializeState(fixtureData())) as {
      schemaVersion: number
      data: { plan: Record<string, unknown> & { customTargets: unknown[] } }
    }
    env2.schemaVersion = 10
    env2.data.plan.name = 'Vertical Project · 6-Day'
    env2.data.plan.goalStatement = 'dunk by June'
    env2.data.plan.customTargets = []
    const parsed2 = parseEnvelope(JSON.stringify(env2))
    expect(parsed2.data.plan.goalStatement).toBe('dunk by June')
    expect(parsed2.data.plan.customTargets).toEqual([])
  })

  it('does not duplicate the target when the chain runs from older versions', () => {
    const env = JSON.parse(serializeState(fixtureData())) as {
      schemaVersion: number
      data: Record<string, unknown> & { settings: Record<string, unknown> }
    }
    env.schemaVersion = 3
    delete env.data.plan
    delete env.data.profile
    delete env.data.grocery
    delete env.data.settings.units
    delete env.data.swaps
    delete env.data.dayLoad
    const parsed = parseEnvelope(JSON.stringify(env))
    const targets = parsed.data.plan.customTargets.filter((t) => t.label === 'Body fat')
    expect(targets).toHaveLength(1)
    expect(parsed.data.measurements.every((m) => m.bodyFatPct === undefined)).toBe(true)
  })
})

describe('v11 → v12: reminders move to 5 AM / 5 PM', () => {
  it('replaces shipped defaults but keeps hand-set times', () => {
    const def = JSON.parse(serializeState(fixtureData())) as {
      schemaVersion: number
      data: { settings: { reminderTimes: string[] } }
    }
    def.schemaVersion = 11
    def.data.settings.reminderTimes = ['11:30', '18:30']
    expect(parseEnvelope(JSON.stringify(def)).data.settings.reminderTimes).toEqual(['05:00', '17:00'])

    const custom = JSON.parse(serializeState(fixtureData())) as {
      schemaVersion: number
      data: { settings: { reminderTimes: string[] } }
    }
    custom.schemaVersion = 11
    custom.data.settings.reminderTimes = ['06:15', '19:00']
    expect(parseEnvelope(JSON.stringify(custom)).data.settings.reminderTimes).toEqual(['06:15', '19:00'])
  })
})

describe('v12 → v13: multi-day cardio backups + GPS runs', () => {
  it('wraps the old single weekday into an array and seeds runs', () => {
    const env = JSON.parse(serializeState(fixtureData())) as {
      schemaVersion: number
      data: { runs?: unknown; weeks: Record<string, Record<string, unknown>> }
    }
    env.schemaVersion = 12
    delete env.data.runs
    env.data.weeks['2026-08-10'] = {
      mondayISO: '2026-08-10',
      tier: 1,
      tierPickedAt: null,
      tierChanges: [],
      ballThisWeek: false,
      ballDates: [],
      cnsSwapDates: [],
      cardio: { exerciseId: 'easy-jog', weekday: 4 },
      events: {},
      badSleepDates: [],
    }
    const parsed = parseEnvelope(JSON.stringify(env))
    expect(parsed.data.runs).toEqual([])
    expect(parsed.data.weeks['2026-08-10'].cardio).toEqual({ exerciseId: 'easy-jog', weekdays: [4] })
  })
})

describe('v13 → v14: the basketball voice becomes owner-only', () => {
  it('NAOD plans keep ball; everything else goes generic', () => {
    const env = JSON.parse(serializeState(fixtureData())) as {
      schemaVersion: number
      data: { plan: Record<string, unknown> }
    }
    env.schemaVersion = 13
    delete env.data.plan.sportMode
    expect(parseEnvelope(JSON.stringify(env)).data.plan.sportMode).toBe('ball')

    const env2 = JSON.parse(serializeState(fixtureData())) as {
      schemaVersion: number
      data: { plan: Record<string, unknown> }
    }
    env2.schemaVersion = 13
    env2.data.plan.name = 'Muscle Builder. 4-Day'
    delete env2.data.plan.sportMode
    expect(parseEnvelope(JSON.stringify(env2)).data.plan.sportMode).toBe('generic')
  })
})

describe('v14 → v15: un-finish the mis-tapped Aug 11 session', () => {
  type Env = { schemaVersion: number; data: ReturnType<typeof fixtureData> }

  function withAug11(session: Partial<ReturnType<typeof fixtureData>['sessions'][string]>): Env {
    const env = JSON.parse(serializeState(fixtureData())) as Env
    env.schemaVersion = 14
    env.data.sessions['2026-08-11'] = {
      date: '2026-08-11',
      templateId: 'tuesday',
      status: 'partial',
      startedAt: '2026-08-11T15:00:00.000Z',
      endedAt: '2026-08-11T15:04:00.000Z',
      exercises: [
        { exerciseId: 'box-jump', sets: [{ targetReps: '3', reps: 3, done: true }] },
        { exerciseId: 'goblet-squat', sets: [{ targetReps: '6-8', reps: 8, done: false }] },
      ],
      ...session,
    }
    env.data.coach.feed.push({
      id: 'dbf1',
      at: '2026-08-11T15:04:01.000Z',
      kind: 'debrief',
      text: 'Debrief · phantom',
      debrief: { date: '2026-08-11', title: 'phantom', recap: [], recovery: [], eat: [], sleep: [], tomorrow: '' },
    })
    return env
  }

  it('removes a session ended during the first exercise, and its debrief', () => {
    const parsed = parseEnvelope(JSON.stringify(withAug11({})))
    expect(parsed.data.sessions['2026-08-11']).toBeUndefined()
    expect(parsed.data.coach.feed.some((f) => f.kind === 'debrief' && f.debrief?.date === '2026-08-11')).toBe(false)
    expect(parsed.data.sessions['2026-08-10']).toBeDefined() // neighbors untouched
  })

  it('keeps real partials: work logged past the first exercise', () => {
    const env = withAug11({
      exercises: [
        { exerciseId: 'box-jump', sets: [{ targetReps: '3', reps: 3, done: true }] },
        { exerciseId: 'goblet-squat', sets: [{ targetReps: '6-8', reps: 8, done: true }] },
      ],
    })
    const parsed = parseEnvelope(JSON.stringify(env))
    expect(parsed.data.sessions['2026-08-11']).toBeDefined()
  })

  it('keeps sessions that were never ended', () => {
    const env = withAug11({ endedAt: undefined })
    delete (env.data.sessions['2026-08-11'] as { endedAt?: string }).endedAt
    const parsed = parseEnvelope(JSON.stringify(env))
    expect(parsed.data.sessions['2026-08-11']).toBeDefined()
  })
})

describe('v15 → v16: repair lands on the right date (Aug 10) + push purge', () => {
  function v15Env() {
    const env = JSON.parse(serializeState(fixtureData())) as {
      schemaVersion: number
      data: ReturnType<typeof fixtureData>
    }
    env.schemaVersion = 15
    return env
  }

  it('un-finishes the Monday Aug 10 phantom and drops its debrief', () => {
    const env = v15Env()
    // the mis-tapped finish: ended during exercise 1, nothing logged past it
    env.data.sessions['2026-08-10'] = {
      date: '2026-08-10',
      templateId: 'monday',
      status: 'partial',
      startedAt: '2026-08-11T03:20:00.000Z',
      endedAt: '2026-08-11T03:24:00.000Z',
      exercises: [
        { exerciseId: 'box-jump', sets: [{ targetReps: '3', reps: 3, done: true }] },
        { exerciseId: 'goblet-squat', sets: [{ targetReps: '6-8', reps: 8, done: false }] },
      ],
    }
    env.data.coach.feed.push({
      id: 'dbf0',
      at: '2026-08-11T03:24:01.000Z',
      kind: 'debrief',
      text: 'Debrief · Monday, Aug 10',
      debrief: { date: '2026-08-10', title: 'phantom', recap: [], recovery: [], eat: [], sleep: [], tomorrow: '' },
    })
    const parsed = parseEnvelope(JSON.stringify(env))
    expect(parsed.data.sessions['2026-08-10']).toBeUndefined()
    expect(parsed.data.coach.feed.some((f) => f.kind === 'debrief' && f.debrief?.date === '2026-08-10')).toBe(false)
    expect(parsed.data.sessions['2026-08-12']).toBeDefined() // neighbors untouched
  })

  it('keeps a genuinely completed Aug 10 and purges push-me entries', () => {
    const env = v15Env()
    env.data.coach.feed.push({
      id: 'p1',
      at: '2026-08-11T10:00:00.000Z',
      kind: 'coach',
      situation: 'push',
      text: 'Clock in.',
    })
    const parsed = parseEnvelope(JSON.stringify(env))
    expect(parsed.data.sessions['2026-08-10']).toBeDefined() // fixture Monday is completed, kept
    expect(parsed.data.coach.feed.some((f) => f.situation === 'push')).toBe(false)
    expect(parsed.data.coach.feed.some((f) => f.kind === 'coach' && f.situation === 'session-done')).toBe(true) // other coach items stay
  })
})

describe('v17 → v18: stored em dashes are swept clean', () => {
  function v17Env() {
    const env = JSON.parse(serializeState(fixtureData())) as {
      schemaVersion: number
      data: ReturnType<typeof fixtureData>
    }
    env.schemaVersion = 17
    return env
  }

  it('rewrites feed prose, meal labels, plan name and goal statement', () => {
    const env = v17Env()
    env.data.coach.feed.push({
      id: 'em1',
      at: '2026-08-11T10:00:00.000Z',
      kind: 'coach',
      situation: 'comeback',
      text: "The last session is ancient history — this one's the only one that exists.",
    })
    env.data.meals['2026-08-10'] = {
      date: '2026-08-10',
      entries: [
        { id: 'm1', at: '2026-08-10T12:00:00.000Z', label: 'Breakfast — Greek yogurt & berries', proteinG: 30, kcal: 320, source: 'chip', servings: 1 },
      ],
      supplements: {},
    }
    env.data.plan.name = 'Vertical Project — 6-Day'
    env.data.plan.goalStatement = 'sub-10% body fat — a build that shows it.'
    const parsed = parseEnvelope(JSON.stringify(env))
    expect(parsed.data.coach.feed.find((f) => f.id === 'em1')?.text).toBe(
      "The last session is ancient history, this one's the only one that exists.",
    )
    expect(parsed.data.meals['2026-08-10'].entries[0].label).toBe('Breakfast · Greek yogurt & berries')
    expect(parsed.data.plan.name).toBe('Vertical Project · 6-Day')
    expect(parsed.data.plan.goalStatement).toBe('sub-10% body fat, a build that shows it.')
    expect(JSON.stringify(parsed.data)).not.toContain('—')
  })
})

describe('v18 → v19: everyone but the owner restarts onboarding', () => {
  function v18Env() {
    const env = JSON.parse(serializeState(fixtureData())) as {
      schemaVersion: number
      data: ReturnType<typeof fixtureData>
    }
    env.schemaVersion = 18
    return env
  }

  it("keeps the owner's NAOD booklet and onboarded state untouched", () => {
    const env = v18Env()
    env.data.plan.name = 'NAOD V4'
    env.data.plan.sportMode = 'ball'
    env.data.settings.onboarded = true
    const parsed = parseEnvelope(JSON.stringify(env))
    expect(parsed.data.settings.onboarded).toBe(true)
    expect(parsed.data.plan.name).toBe('NAOD V4')
  })

  it('sends a generated-plan user back through onboarding', () => {
    const env = v18Env()
    env.data.plan.name = 'Vertical Project · 6-Day'
    env.data.plan.sportMode = 'generic'
    env.data.settings.onboarded = true
    const parsed = parseEnvelope(JSON.stringify(env))
    expect(parsed.data.settings.onboarded).toBe(false)
  })

  it('never deletes what they logged', () => {
    const env = v18Env()
    env.data.plan.sportMode = 'generic'
    env.data.plan.name = 'Cut Engine · 4-Day'
    const before = {
      sessions: Object.keys(env.data.sessions).length,
      measurements: env.data.measurements.length,
      feed: env.data.coach.feed.length,
    }
    expect(before.sessions).toBeGreaterThan(0)
    const parsed = parseEnvelope(JSON.stringify(env))
    expect(Object.keys(parsed.data.sessions).length).toBe(before.sessions)
    expect(parsed.data.measurements.length).toBe(before.measurements)
    expect(parsed.data.coach.feed.length).toBe(before.feed)
  })
})

describe('v19 → v20 repairs calorie targets written without a floor', () => {
  // A booklet's calorie target is written ONCE at onboarding and read
  // forever after. Flooring the generator protects new plans and does
  // nothing at all for a plan already on disk, and the unfloored
  // bring-your-own-routine path wrote 950/650 for a 90 lb athlete.
  it('raises a stored crash target to the floor', () => {
    const env = buildEnvelope(fixtureData()) as unknown as Record<string, unknown>
    const data = env.data as { plan: { nutrition: { kcalTraining: number; kcalRest: number } } }
    data.plan.nutrition = { kcalTraining: 950, kcalRest: 650 }
    env.schemaVersion = 19
    const out = migrate(env)
    expect(out.data.plan.nutrition.kcalTraining).toBeGreaterThanOrEqual(MIN_KCAL_TRAINING)
    expect(out.data.plan.nutrition.kcalRest).toBeGreaterThanOrEqual(MIN_KCAL_REST)
  })

  it('leaves a healthy stored target exactly as it was', () => {
    const env = buildEnvelope(fixtureData()) as unknown as Record<string, unknown>
    const data = env.data as { plan: { nutrition: { kcalTraining: number; kcalRest: number } } }
    data.plan.nutrition = { kcalTraining: 3000, kcalRest: 2700 }
    env.schemaVersion = 19
    const out = migrate(env)
    expect(out.data.plan.nutrition).toEqual({ kcalTraining: 3000, kcalRest: 2700 })
  })
})

describe('macro totals refuse to pretend', () => {
  // The app logged protein and calories only for its whole life, so every
  // meal already on a device has no carb or fat behind it, and a custom
  // entry never will. A carb ring drawn confidently over a day the app
  // only half understands is the exact class of quietly-wrong number the
  // rest of this codebase exists to avoid.
  const day = (entries: unknown[]) => {
    const d = emptyAppData('2026-08-10')
    d.meals['2026-08-10'] = { entries, supplements: [] } as never
    return d
  }

  it('reports full coverage when every entry carries macros', () => {
    const m = macrosFor(
      day([
        { id: 'a', at: '', label: 'Chicken', proteinG: 70, kcal: 375, carbsG: 0, fatG: 8, source: 'chip', servings: 1 },
      ]),
      '2026-08-10',
    )
    expect(m.coverage).toBe(1)
    expect(m.fatG).toBe(8)
  })

  it('backfills a legacy food-chip entry from the food library', () => {
    // Logged before carbs and fat were stored, but it knows which food it
    // was, and the library knows the rest.
    const m = macrosFor(
      day([{ id: 'a', at: '', label: 'Rice', proteinG: 4, kcal: 205, source: 'chip', foodId: 'rice', servings: 2 }]),
      '2026-08-10',
    )
    expect(m.carbsG).toBe(90)
    expect(m.coverage).toBe(1)
  })

  it('reports PARTIAL coverage rather than a confident zero', () => {
    const m = macrosFor(
      day([
        { id: 'a', at: '', label: 'Rice', proteinG: 4, kcal: 200, source: 'chip', foodId: 'rice', servings: 1 },
        { id: 'b', at: '', label: 'Whatever I ate out', proteinG: 30, kcal: 800, source: 'custom', servings: 1 },
      ]),
      '2026-08-10',
    )
    expect(m.kcal).toBe(1000)
    expect(m.coveredKcal).toBe(200)
    expect(m.coverage).toBeCloseTo(0.2, 2)
    // And it does NOT claim the custom meal had no carbs.
    expect(m.carbsG).toBe(45)
  })

  it('reports zero coverage for a day of untracked entries, so the UI can stay quiet', () => {
    const m = macrosFor(
      day([{ id: 'a', at: '', label: 'Dinner', proteinG: 40, kcal: 700, source: 'custom', servings: 1 }]),
      '2026-08-10',
    )
    expect(m.coverage).toBe(0)
    expect(m.coveredKcal).toBe(0)
  })

  it('scales macros by servings', () => {
    const m = macrosFor(
      day([{ id: 'a', at: '', label: 'Oats', proteinG: 8, kcal: 225, carbsG: 40, fatG: 4, source: 'chip', servings: 2.5 }]),
      '2026-08-10',
    )
    expect(m.carbsG).toBe(100)
    expect(m.fatG).toBe(10)
  })

  it('handles a day with no meals at all', () => {
    expect(macrosFor(emptyAppData('2026-08-10'), '2026-08-10')).toEqual({
      proteinG: 0, carbsG: 0, fatG: 0, kcal: 0, coveredKcal: 0, coverage: 0,
    })
  })
})

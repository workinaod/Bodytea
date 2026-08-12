import { describe, expect, it } from 'vitest'
import type { AppData, ISODate, SessionLog } from '../types'
import { emptyAppData } from '../types'
import { addDaysISO } from './calendar'
import { resolveDay } from './resolveDay'
import { streakState } from './streak'
import { athleteFacts } from './achievementFacts'
import { evaluateAchievements, nextUp } from './achievements'
import { ACHIEVEMENTS, ACHIEVEMENT_BY_ID, flameFor, FLAME_MIN } from '../plan/achievements'

const START: ISODate = '2026-01-05' // a Monday

function base(): AppData {
  const d = emptyAppData(START)
  d.settings.phaseStartDate = START
  d.settings.installedAt = START
  return d
}

/** Log the day exactly as the plan wrote it, all sets done. */
function train(d: AppData, date: ISODate, opts: { at?: string; weight?: number } = {}) {
  const day = resolveDay(date, d)
  const s: SessionLog = {
    date,
    templateId: day.templateId ?? 't',
    status: 'completed',
    startedAt: opts.at ?? `${date}T09:00:00`,
    endedAt: opts.at ?? `${date}T10:00:00`,
    exercises: day.exercises.map((e) => ({
      exerciseId: e.exerciseId,
      sets: Array.from({ length: e.sets }, () => ({
        targetReps: '8',
        weightLb: opts.weight ?? 100,
        reps: 8,
        done: true,
      })),
    })),
  }
  d.sessions[date] = s
  return s
}

/** Every scheduled day in [from, from+days) trained. */
function trainRange(d: AppData, from: ISODate, days: number, opts: { at?: string; weight?: number } = {}) {
  for (let i = 0; i < days; i++) {
    const date = addDaysISO(from, i)
    const r = resolveDay(date, d)
    if (r.kind === 'session' || r.kind === 'mobility' || r.kind === 'cardio-backup') train(d, date, opts)
  }
}

describe('the catalog itself', () => {
  it('has no duplicate ids', () => {
    const ids = ACHIEVEMENTS.map((a) => a.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('never uses an em dash, anywhere', () => {
    for (const a of ACHIEVEMENTS) {
      for (const s of [a.name, a.blurb, a.requirement]) expect(s).not.toContain('—')
    }
  })

  it('states a requirement for every single one', () => {
    for (const a of ACHIEVEMENTS) expect(a.requirement.trim().length).toBeGreaterThan(8)
  })

  it('rewards nothing for merely using the app', () => {
    const banned = /\bopen(ed|ing)?\b|\bview(ed|ing)?\b|\btap(ped)?\b|\blog(ged)? in\b|\bvisit/i
    for (const a of ACHIEVEMENTS) expect(a.requirement).not.toMatch(banned)
  })

  it('keeps competition wins as trophies and everything else as badges', () => {
    for (const a of ACHIEVEMENTS) {
      expect(a.kind === 'trophy').toBe(a.category === 'competition')
    }
  })
})

describe('the flame', () => {
  it('stays dark under a week, because a 3 day streak is not a streak', () => {
    expect(flameFor(FLAME_MIN - 1)).toBeNull()
    expect(flameFor(0)).toBeNull()
  })

  it('climbs a tier at each milestone', () => {
    expect(flameFor(7)!.level).toBe(1)
    expect(flameFor(29)!.level).toBe(1)
    expect(flameFor(30)!.name).toBe('Heating Up')
    expect(flameFor(90)!.name).toBe('On Fire')
    expect(flameFor(180)!.name).toBe('Blazing')
    expect(flameFor(365)!.name).toBe('Inferno')
    expect(flameFor(2000)!.name).toBe('Inferno')
  })
})

describe('streak in calendar days', () => {
  it('counts rest days as part of the run', () => {
    const d = base()
    trainRange(d, START, 14)
    // Two full weeks with nothing missed is 14 days, not "however
    // many sessions the plan happened to schedule".
    expect(streakState(d, addDaysISO(START, 13)).current).toBe(14)
  })

  it('a missed scheduled day resets it', () => {
    const d = base()
    trainRange(d, START, 21)
    // Wipe one trained day in the middle
    const gap = Object.keys(d.sessions).sort()[6]
    delete d.sessions[gap]
    const s = streakState(d, addDaysISO(START, 20))
    expect(s.current).toBeLessThan(21)
    expect(s.best).toBeGreaterThan(0)
  })

  it('an unfinished today does not break anything', () => {
    const d = base()
    trainRange(d, START, 10)
    const tomorrow = addDaysISO(START, 10)
    expect(streakState(d, tomorrow).current).toBe(10)
  })

  it('best survives a break, because badges are permanent', () => {
    const d = base()
    trainRange(d, START, 30)
    const after = addDaysISO(START, 40) // ten days of nothing
    const s = streakState(d, after)
    expect(s.current).toBe(0)
    expect(s.best).toBe(30)
    // and the badge earned at 30 stays earned
    const got = evaluateAchievements(d, after).find((x) => x.def.id === 'heating-up')!
    expect(got.earned).toBe(true)
  })
})

describe('what the logs prove', () => {
  it('an empty athlete has earned nothing at all', () => {
    const states = evaluateAchievements(base(), START)
    expect(states.every((s) => !s.earned)).toBe(true)
  })

  it('a 3 AM session is a night shift, not an early rise', () => {
    const d = base()
    // 1 AM belongs to the night before on this app's 3 AM clock
    trainRange(d, START, 30, { at: `${START}T01:30:00` })
    const f = athleteFacts(d, addDaysISO(START, 30))
    expect(f.earlySessions).toBe(0)
    expect(f.lateSessions).toBeGreaterThan(0)
  })

  it('5 AM counts as early', () => {
    const d = base()
    for (let i = 0; i < 40; i++) {
      const date = addDaysISO(START, i)
      const r = resolveDay(date, d)
      if (r.kind === 'session') train(d, date, { at: `${date}T05:15:00` })
    }
    const f = athleteFacts(d, addDaysISO(START, 40))
    expect(f.earlySessions).toBeGreaterThanOrEqual(10)
    expect(f.lateSessions).toBe(0)
    const early = evaluateAchievements(d, addDaysISO(START, 40)).find((s) => s.def.id === 'early-riser')!
    expect(early.earned).toBe(true)
  })

  it('a perfect week only counts once the week is over', () => {
    const d = base()
    trainRange(d, START, 7)
    // Still inside that week: nothing banked yet
    expect(athleteFacts(d, addDaysISO(START, 6)).perfectWeeks).toBe(0)
    // Week closed
    expect(athleteFacts(d, addDaysISO(START, 8)).perfectWeeks).toBe(1)
  })

  it('counts a personal record only when it beats a real previous best', () => {
    const d = base()
    // Same weight every session: no records after the first entry
    trainRange(d, START, 21, { weight: 100 })
    const flat = athleteFacts(d, addDaysISO(START, 21))
    expect(flat.prTotal).toBe(0)

    const up = base()
    let w = 100
    for (let i = 0; i < 21; i++) {
      const date = addDaysISO(START, i)
      if (resolveDay(date, up).kind !== 'session') continue
      train(up, date, { weight: (w += 5) })
    }
    expect(athleteFacts(up, addDaysISO(START, 21)).prTotal).toBeGreaterThan(0)
  })

  it('a repeatable badge counts every clear, a one-off caps at one', () => {
    const d = base()
    trainRange(d, START, 35)
    const states = evaluateAchievements(d, addDaysISO(START, 36))
    const locked = states.find((s) => s.def.id === 'locked-in')!
    expect(locked.def.repeatable).toBe(true)
    expect(locked.count).toBeGreaterThan(1)
    const heating = states.find((s) => s.def.id === 'heating-up')!
    expect(heating.count).toBe(1)
  })

  it('the social and competition rows stay locked until that data exists', () => {
    const d = base()
    trainRange(d, START, 60)
    for (const s of evaluateAchievements(d, addDaysISO(START, 60))) {
      if (s.def.pending) expect(s.earned).toBe(false)
    }
  })

  it('Ozympic God needs a finished cut with the consistency behind it', () => {
    const d = base()
    d.plan.customTargets = [{ label: 'Body weight', target: 170, unit: 'lb' }]
    d.measurements = [
      { date: START, weightLb: 200, photoIds: {} },
      { date: addDaysISO(START, 60), weightLb: 168, photoIds: {} },
    ]
    // 32 lb down and on target, but nothing logged: no badge.
    const lazy = evaluateAchievements(d, addDaysISO(START, 60)).find((s) => s.def.id === 'ozympic-god')!
    expect(lazy.earned).toBe(false)
  })

  it('hitting the target from below counts too, for a gain goal', () => {
    const d = base()
    d.plan.customTargets = [{ label: 'Body weight', target: 190, unit: 'lb' }]
    d.measurements = [
      { date: START, weightLb: 175, photoIds: {} },
      { date: addDaysISO(START, 60), weightLb: 191, photoIds: {} },
    ]
    const f = athleteFacts(d, addDaysISO(START, 60))
    expect(f.hitTargetWeight).toBe(true)
    expect(f.weightGainedLb).toBe(16)
    expect(f.weightLostLb).toBe(0)
  })
})

describe('what to chase next', () => {
  it('offers things already started, never things at zero', () => {
    const d = base()
    trainRange(d, START, 10)
    const next = nextUp(evaluateAchievements(d, addDaysISO(START, 11)))
    expect(next.length).toBeGreaterThan(0)
    for (const s of next) {
      expect(s.earned).toBe(false)
      expect(s.progress).toBeGreaterThan(0)
      expect(s.def.pending).toBeFalsy()
    }
  })

  it('every measured achievement is one the catalog actually lists', () => {
    const d = base()
    for (const s of evaluateAchievements(d, START)) {
      expect(ACHIEVEMENT_BY_ID[s.def.id]).toBeDefined()
      expect(s.target).toBeGreaterThan(0)
    }
  })
})

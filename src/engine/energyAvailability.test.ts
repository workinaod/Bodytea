import { describe, expect, it } from 'vitest'
import { emptyAppData, type AppData, type SessionLog } from '../types'
import { addDaysISO } from './calendar'
import { EA_LOW, energyCheck, energyCopy } from './energyAvailability'

// ============================================================
// R1's eval case 10 is the whole reason this file exists: a 120 lb
// woman at 18 percent body fat, training six times a week and running
// thirty kilometres, eating 1,400. Every floor in the app says she is
// fine, because no floor knows how much she trains.
// ============================================================

const TODAY = '2026-08-31'

function athlete(over: { bf?: number; lb?: number; kcal?: number; female?: boolean } = {}): AppData {
  const d = emptyAppData('2026-06-01')
  d.settings.onboarded = true
  d.profile = { bfFormula: over.female === false ? 'male' : 'female', heightIn: 64, age: 28 }
  d.plan.nutrition = { kcalTraining: over.kcal ?? 1400, kcalRest: (over.kcal ?? 1400) - 200 }
  d.measurements = [
    { date: addDaysISO(TODAY, -3), weightLb: over.lb ?? 120, bodyFatPct: over.bf ?? 18, photoIds: {} },
  ]
  return d
}

function lifted(d: AppData, count: number): AppData {
  for (let i = 0; i < count; i++) {
    const date = addDaysISO(TODAY, -(i + 1))
    d.sessions[date] = {
      date,
      templateId: 't',
      status: 'done',
      exercises: [{ exerciseId: 'back-squat', sets: [{ targetReps: '8', done: true, reps: 8 }] }],
    } as unknown as SessionLog
  }
  return d
}

function ran(d: AppData, count: number, minutes = 60, kcal?: number): AppData {
  for (let i = 0; i < count; i++) {
    const date = addDaysISO(TODAY, -(i + 1))
    d.cardio[date] = [
      { id: `c${i}`, at: `${date}T18:00`, activityId: 'run', label: 'Run', when: 'solo', minutes, ...(kcal ? { kcalEst: kcal } : {}) },
    ]
  }
  return d
}

describe('the athlete the floors cannot see', () => {
  it('catches R1 case 10, which clears every floor in the app', () => {
    const d = ran(lifted(athlete(), 24), 12)
    const c = energyCheck(d, TODAY)!
    expect(c).not.toBeNull()
    // Pinned exactly, so a change to the arithmetic has to be deliberate.
    // R1 states this persona as FFM ~45 kg, ~375 kcal/day of training, EA
    // ~23, and a suggestion of 1,700 to 1,750. This fixture is one
    // realisation of her week (24 lifts and 12 hour-long runs in 28 days)
    // and every number it produces lands inside what the pack says.
    expect(c.ffmKg).toBe(44.6)
    expect(c.exerciseKcalPerDay).toBe(392)
    expect(c.ea).toBe(22.6)
    expect(c.suggestKcal).toBe(1750)
    expect(c.ea).toBeLessThan(EA_LOW)
    // and the suggestion clears the line by construction
    expect((c.suggestKcal - c.exerciseKcalPerDay) / c.ffmKg).toBeGreaterThanOrEqual(EA_LOW)
    expect(c.suggestKcal).toBeGreaterThan(c.intakeKcal)
  })

  it('says nothing at all when the same intake covers the training', () => {
    // Same body, same food, far less training. Nothing to warn about.
    const d = lifted(athlete({ kcal: 2200 }), 8)
    expect(energyCheck(d, TODAY)).toBeNull()
  })
})

describe('it refuses to compute what it cannot know', () => {
  it('without a tape reading there is no lean mass and so no number', () => {
    const d = ran(lifted(athlete(), 24), 12)
    d.measurements = d.measurements.map((m) => ({ ...m, bodyFatPct: undefined }))
    expect(energyCheck(d, TODAY)).toBeNull()
  })

  it('without logged training it does not assume a training load', () => {
    const d = athlete()
    expect(energyCheck(d, TODAY)).toBeNull()
  })

  it('without a weigh-in there is nothing to scale by', () => {
    const d = ran(lifted(athlete(), 24), 12)
    d.measurements = d.measurements.map((m) => ({ ...m, weightLb: undefined }))
    expect(energyCheck(d, TODAY)).toBeNull()
  })
})

describe('the evidence is not the same on both sides', () => {
  it('calls it low for a woman and a caution for a man', () => {
    const her = energyCheck(ran(lifted(athlete(), 24), 12), TODAY)!
    const him = energyCheck(ran(lifted(athlete({ female: false }), 24), 12), TODAY)!
    expect(her.level).toBe('low')
    expect(him.level).toBe('caution')
  })

  it('never names a condition, on either side', () => {
    for (const female of [true, false]) {
      const c = energyCheck(ran(lifted(athlete({ female }), 24), 12), TODAY)!
      const copy = energyCopy(c).toLowerCase()
      for (const word of ['red-s', 'reds', 'disorder', 'syndrome', 'amenorrhea', 'diagnos', 'osteoporosis']) {
        expect(copy, `${female ? 'female' : 'male'} copy names "${word}"`).not.toContain(word)
      }
      expect(copy).toContain('would clear it')
    }
  })

  it('says out loud that the male number is less settled', () => {
    const him = energyCheck(ran(lifted(athlete({ female: false }), 24), 12), TODAY)!
    expect(energyCopy(him)).toContain('less settled')
  })
})

describe('counting the training honestly', () => {
  it('does not let an unpriced cardio session make training look free', () => {
    // A session saved without a calorie estimate must not count as zero:
    // cheaper training reads as higher energy availability, which is the
    // direction that hides the warning.
    const priced = energyCheck(ran(lifted(athlete(), 24), 12, 60, 500), TODAY)!
    const unpriced = energyCheck(ran(lifted(athlete(), 24), 12, 60), TODAY)!
    expect(unpriced.exerciseKcalPerDay).toBeGreaterThan(0)
    expect(priced.exerciseKcalPerDay).toBeGreaterThan(unpriced.exerciseKcalPerDay)
  })

  it('counts a tracked run once, not twice', () => {
    // saveRun writes the route AND a mirrored cardio entry. Adding both
    // would double every GPS session and overstate the training cost.
    const d = ran(lifted(athlete(), 24), 1, 60)
    const before = energyCheck(d, TODAY)!.exerciseKcalPerDay
    const date = addDaysISO(TODAY, -1)
    d.cardio[date][0].runId = 'r1'
    d.runs = [{
      id: 'r1', activity: 'run', date, startedAt: `${date}T18:00`, durationSec: 3600,
      distanceMi: 6, avgPaceSec: 600, splits: [], points: [],
    } as AppData['runs'][number]]
    expect(energyCheck(d, TODAY)!.exerciseKcalPerDay).toBe(before)
  })
})

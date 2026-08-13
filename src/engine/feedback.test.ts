import { describe, expect, it } from 'vitest'
import { emptyAppData, type AppData, type SessionLog } from '../types'
import { addDaysISO } from './calendar'
import { sessionTonnage } from './stats'
import { generateInsights } from './insights'

// ============================================================
// What the athlete is told about their own session.
//
// Found by simulating twenty people through eight weeks of
// training and reading the screen rather than the engines. Both
// of these are single lines of copy, and both of them are the
// kind of wrong that costs an app its credibility: one flatters,
// one accuses, and neither is true.
// ============================================================

const START = '2026-01-05'

const fresh = (): AppData => {
  const d = emptyAppData(START, START)
  d.settings.onboarded = true
  return d
}

describe('the tonnage it reports', () => {
  it('counts the reps that happened, not the reps that were asked for', () => {
    // Three sets of ten at 100 lb asked for, six achieved on every one.
    const session = {
      date: START,
      templateId: 'monday',
      status: 'completed',
      exercises: [
        {
          exerciseId: 'goblet-squat',
          sets: [0, 1, 2].map(() => ({
            targetReps: '10',
            weightLb: 100,
            reps: 10, // the prescription echo
            achieved: 6, // what actually happened
            done: true,
          })),
        },
      ],
    } as SessionLog
    expect(sessionTonnage(session)).toBe(1800)
    expect(sessionTonnage(session), 'must not report the prescribed 3000').not.toBe(3000)
  })

  it('still counts a set that met its target and says nothing about it', () => {
    const session = {
      date: START,
      templateId: 'monday',
      status: 'completed',
      exercises: [
        {
          exerciseId: 'goblet-squat',
          sets: [{ targetReps: '10', weightLb: 100, reps: 10, done: true }],
        },
      ],
    } as SessionLog
    expect(sessionTonnage(session)).toBe(1000)
  })
})

describe('the first debrief a new athlete ever sees', () => {
  it('does not accuse them of a week they were not here for', () => {
    // Installed today. There is no food log because there has been no time
    // to keep one, and the rule that counts ABSENCE cannot tell that from
    // somebody who could not be bothered.
    const d = fresh()
    d.settings.installedAt = START
    const fired = generateInsights(d, START).map((i) => i.ruleId)
    expect(fired, 'nothing should scold a brand new account').not.toContain('meals-unlogged')
  })

  it('still says it once the athlete has genuinely been ignoring it', () => {
    const d = fresh()
    d.settings.installedAt = START
    const later = addDaysISO(START, 30)
    const fired = generateInsights(d, later).map((i) => i.ruleId)
    expect(fired).toContain('meals-unlogged')
  })
})

describe('someone quietly falling away', () => {
  /** Four weeks of scheduled days, training all but every `skipEvery`-th. */
  function attendance(skipEvery: number): AppData {
    const d = fresh()
    d.settings.installedAt = START
    for (let w = 0; w < 4; w++) {
      const monday = addDaysISO(START, w * 7)
      d.weeks[monday] = { mondayISO: monday, tier: 1 } as AppData['weeks'][string]
    }
    let n = 0
    for (let i = 0; i < 28; i++) {
      const date = addDaysISO(START, i)
      const wd = new Date(date + 'T12:00:00').getDay()
      if (!d.plan.tier1ByWeekday[wd as 0]) continue
      n++
      if (n % skipEvery === 0) continue
      d.sessions[date] = {
        date, templateId: 'monday', status: 'completed',
        exercises: [{ exerciseId: 'goblet-squat', sets: [{ targetReps: '8', weightLb: 100, reps: 8, done: true }] }],
      } as SessionLog
    }
    // The fixture has to actually contain training, or the test proves nothing.
    expect(Object.keys(d.sessions).length).toBeGreaterThan(10)
    return d
  }

  it('says something when half the month did not happen', () => {
    // Nothing at all logged for four weeks, which is as clear as it gets.
    const d = fresh()
    d.settings.installedAt = START
    for (let i = 0; i < 28; i++) {
      const monday = addDaysISO(START, Math.floor(i / 7) * 7)
      d.weeks[monday] = { mondayISO: monday, tier: 1 } as AppData['weeks'][string]
    }
    const fired = generateInsights(d, addDaysISO(START, 28)).map((i) => i.ruleId)
    expect(fired).toContain('attendance-slipping')
  })

  it('reaches the debrief rather than just existing', () => {
    // Only the top two insights are ever shown. A rule that fires and then
    // loses every tiebreak is indistinguishable from one that does not.
    const d = fresh()
    d.settings.installedAt = START
    for (let i = 0; i < 28; i++) {
      const monday = addDaysISO(START, Math.floor(i / 7) * 7)
      d.weeks[monday] = { mondayISO: monday, tier: 1 } as AppData['weeks'][string]
    }
    const top = generateInsights(d, addDaysISO(START, 28)).slice(0, 2).map((i) => i.ruleId)
    expect(top).toContain('attendance-slipping')
  })

  it('stays quiet for somebody who is turning up', () => {
    const d = attendance(10) // misses one scheduled day in ten
    const fired = generateInsights(d, addDaysISO(START, 28)).map((i) => i.ruleId)
    expect(fired).not.toContain('attendance-slipping')
  })

  it('stays quiet in the first three weeks, when the ratio means nothing', () => {
    const d = fresh()
    d.settings.installedAt = START
    for (let i = 0; i < 14; i++) {
      const monday = addDaysISO(START, Math.floor(i / 7) * 7)
      d.weeks[monday] = { mondayISO: monday, tier: 1 } as AppData['weeks'][string]
    }
    const fired = generateInsights(d, addDaysISO(START, 14)).map((i) => i.ruleId)
    expect(fired).not.toContain('attendance-slipping')
  })

  it('does not tell somebody off for taking the lighter tier the app offered', () => {
    // Every week dropped to tier 2, and every tier-2 day trained. The
    // tier-1 days they did not do were never asked of them.
    const d = fresh()
    d.settings.installedAt = START
    for (let w = 0; w < 4; w++) {
      const monday = addDaysISO(START, w * 7)
      d.weeks[monday] = { mondayISO: monday, tier: 2 } as AppData['weeks'][string]
    }
    const placement = d.plan.tierDefaultPlacement[2]
    for (let i = 0; i < 28; i++) {
      const date = addDaysISO(START, i)
      const wd = new Date(date + 'T12:00:00').getDay()
      if (!Object.values(placement).includes(wd as 0)) continue
      d.sessions[date] = {
        date, templateId: 'monday', status: 'completed',
        exercises: [{ exerciseId: 'goblet-squat', sets: [{ targetReps: '8', weightLb: 100, reps: 8, done: true }] }],
      } as SessionLog
    }
    const fired = generateInsights(d, addDaysISO(START, 28)).map((i) => i.ruleId)
    expect(fired).not.toContain('attendance-slipping')
  })
})

import { describe, expect, it } from 'vitest'
import { emptyAppData, type AppData } from '../types'
import { resolveDay } from './resolveDay'
import { briefForDay, briefForItems, planBrief } from './workoutBrief'

// ============================================================
// The session-level explanation. Every number in it is measured
// off the day the screen is actually showing, so these pin that
// it reads the resolved day rather than the template, and that
// the order it explains is the order the sequencer produces.
// ============================================================

const START = '2026-08-10' // a Monday

function makeData(): AppData {
  const d = emptyAppData(START)
  d.settings.onboarded = true
  return d
}

describe('the brief for a plan day', () => {
  it('counts the muscles the day actually loads, biggest first', () => {
    const data = makeData()
    const day = resolveDay('2026-08-12', data) // lower strength Wednesday
    const brief = briefForDay(day, data)

    expect(brief.focus.length).toBeGreaterThan(0)
    // Sorted by load, descending, and a leg day leads with legs.
    const sets = brief.focus.map((f) => f.sets)
    expect([...sets].sort((a, b) => b - a)).toEqual(sets)
    expect(brief.focus[0].label.toLowerCase()).toMatch(/quad|glute|hamstring/)
    // Labels are the readable ones, never the raw region keys.
    expect(brief.focus.every((f) => !f.label.includes('-'))).toBe(true)
  })

  it('explains the order in the order the sequencer actually produces', () => {
    const data = makeData()
    const day = resolveDay('2026-08-10', data) // power + first step: jumps then lifts
    const brief = briefForDay(day, data)

    const labels = brief.blocks.map((b) => b.label)
    expect(labels).toContain('Explosive work')
    expect(labels).toContain('Main lifts')
    expect(labels.indexOf('Explosive work')).toBeLessThan(labels.indexOf('Main lifts'))
    // Every block names the movements in it and says why it sits there.
    for (const b of brief.blocks) {
      expect(b.movements.length, b.label).toBeGreaterThan(0)
      expect(b.why.length, b.label).toBeGreaterThan(20)
    }
    // The movements named are the day's own, none invented, none dropped.
    expect(brief.blocks.flatMap((b) => b.movements).sort()).toEqual(
      day.exercises.map((e) => e.name).sort(),
    )
  })

  it('says where the week sits, and what the plan has done to this day', () => {
    const data = makeData()
    const brief = briefForDay(resolveDay('2026-08-10', data), data)
    expect(brief.placement.join(' ')).toMatch(/Week 1 of the plan\. Block 1, week 1 of 4\./)
    // Monday is the max-effort day on the preset, so it is called out.
    expect(brief.placement.join(' ')).toMatch(/max-effort/i)
    expect(brief.placement.join(' ')).not.toMatch(/Deload/i)

    // Week 4 is the deload, and the brief says so rather than leaving
    // somebody to wonder why the day got smaller.
    const deload = briefForDay(resolveDay('2026-09-02', data), data)
    expect(deload.placement.join(' ')).toMatch(/Deload week/)
    expect(deload.placement.join(' ')).toMatch(/Week 4 of the plan\. Block 1, week 4 of 4\./)
  })

  it('threads the athlete\'s own words back to them when they gave any', () => {
    const data = makeData()
    data.plan.goalStatement = 'dunk on a 10-ft rim by June'
    const brief = briefForDay(resolveDay('2026-08-10', data), data)
    expect(brief.placement.join(' ')).toContain('dunk on a 10-ft rim by June')
  })

  it('names the day it is making up, when it is making one up', () => {
    const data = makeData()
    const brief = briefForDay(resolveDay('2026-08-11', data), data, '2026-08-11')
    expect(brief.placement[0]).toMatch(/Running 08-11's workout today/)
  })

  it('sizes the session in sets, movements and minutes', () => {
    const data = makeData()
    const day = resolveDay('2026-08-12', data)
    const brief = briefForDay(day, data)
    expect(brief.totalSets).toBe(day.exercises.reduce((n, e) => n + e.sets, 0))
    expect(brief.minutes).toBeGreaterThan(0)
    expect(brief.headline).toMatch(/^\d+ sets across \d+ movements, about \d+ min\.$/)
    expect(brief.intent).toBe(day.tagline)
  })
})

describe('the brief for work the plan never scheduled', () => {
  it('carries no plan placement, because there is none to claim', () => {
    const brief = briefForItems(
      [
        { exerciseId: 'push-up', sets: 3, repText: '10', repsNum: 10 },
        { exerciseId: 'goblet-squat', sets: 3, repText: '10', repsNum: 10 },
      ],
      'Nothing but a floor.',
    )
    expect(brief.placement).toEqual([])
    expect(brief.intent).toBe('Nothing but a floor.')
    expect(brief.totalSets).toBe(6)
    expect(brief.focus.length).toBeGreaterThan(0)
  })

  it('still explains the order it will be run in', () => {
    // Deliberately handed over in the wrong order: the brief explains the
    // session as the app will actually run it, not as it was typed.
    const brief = briefForItems([
      { exerciseId: 'plank-side-plank', sets: 2, repText: '30 sec' },
      { exerciseId: 'box-jump', sets: 3, repText: '3', repsNum: 3 },
      { exerciseId: 'goblet-squat', sets: 3, repText: '8', repsNum: 8 },
    ])
    expect(brief.blocks.map((b) => b.label)).toEqual(['Explosive work', 'Main lifts', 'Core'])
  })

  it('leaves out a muscle that only caught a rounding error', () => {
    const brief = briefForItems([{ exerciseId: 'push-up', sets: 1, repText: '10', repsNum: 10 }])
    // One set of push-ups pays the chest a full set and the assisting
    // muscles half of one; naming the halves would be noise dressed as data.
    expect(brief.focus.every((f) => f.sets >= 1)).toBe(true)
  })
})

describe('the plan brief', () => {
  it('describes the booklet the athlete actually trains on', () => {
    const data = makeData()
    data.plan.goalStatement = 'lose 30 lb by summer'
    const bp = planBrief(data)

    expect(bp.name).toBe(data.plan.name)
    expect(bp.goalStatement).toBe('lose 30 lb by summer')
    // Seven days, Monday first, every one named from the plan's own templates.
    expect(bp.week).toHaveLength(7)
    expect(bp.week[0].weekday).toBe('Monday')
    expect(bp.week[6].weekday).toBe('Sunday')
    for (const d of bp.week) {
      expect(d.title.length, d.weekday).toBeGreaterThan(0)
      expect(d.tagline.length, d.weekday).toBeGreaterThan(0)
    }
    // The count is of real training days, not of the seven rows.
    const training = bp.week.filter((d) => d.title !== 'Rest').length
    expect(bp.headline).toContain(`${training} training day`)
    expect(bp.rules.length).toBeGreaterThanOrEqual(3)
  })

  it('leaves the goal line out rather than inventing one', () => {
    const data = makeData()
    data.plan.goalStatement = '   '
    expect(planBrief(data).goalStatement).toBeUndefined()
  })

  it('reads a rebuilt week, not the preset it started from', () => {
    const data = makeData()
    // Wipe Tuesday: the brief must show it as rest, because it now is.
    data.plan.tier1ByWeekday[2] = null
    const bp = planBrief(data)
    expect(bp.week.find((d) => d.weekday === 'Tuesday')!.title).toBe('Rest')
  })
})

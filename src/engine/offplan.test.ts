import { describe, expect, it } from 'vitest'
import { emptyAppData, type AppData } from '../types'
import { nutritionDayType } from './dayType'
import { composeDebrief } from './debrief'

// ============================================================
// Off-plan sessions: workouts the schedule never asked for.
// A make-up, a rerun of a previous day, a shelf workout, or one
// built by hand all land as ordinary SessionLogs; these pin the
// places the rest of the engine has to read them honestly.
// ============================================================

const START = '2026-08-10'

function makeData(): AppData {
  const d = emptyAppData(START)
  d.settings.onboarded = true
  return d
}

describe('rest days with real logged work', () => {
  it('eat like training days once a set actually lands', () => {
    const data = makeData()
    // An off-plan session on rest Sunday: still rest while nothing is
    // ticked, training the moment a set actually lands.
    data.sessions['2026-08-16'] = {
      date: '2026-08-16',
      templateId: 'custom',
      customTitle: 'Quick pump',
      status: 'partial',
      exercises: [{ exerciseId: 'push-up', sets: [{ targetReps: '10', done: false }] }],
    }
    expect(nutritionDayType('2026-08-16', data)).toBe('rest')
    data.sessions['2026-08-16'].exercises[0].sets[0].done = true
    expect(nutritionDayType('2026-08-16', data)).toBe('training')
  })

  it('an abandoned skeleton or a skip never flips the day', () => {
    const data = makeData()
    data.sessions['2026-08-16'] = {
      date: '2026-08-16',
      templateId: 'custom',
      customTitle: 'Never happened',
      status: 'skipped',
      exercises: [{ exerciseId: 'push-up', sets: [{ targetReps: '10', done: true }] }],
    }
    expect(nutritionDayType('2026-08-16', data)).toBe('rest')
  })
})

describe('the debrief on off-plan work', () => {
  it('titles a custom session by its own name', () => {
    const data = makeData()
    data.sessions['2026-08-16'] = {
      date: '2026-08-16',
      templateId: 'custom',
      customTitle: 'Hotel Room Special',
      status: 'completed',
      exercises: [{ exerciseId: 'push-up', sets: [{ targetReps: '10', reps: 10, done: true }] }],
    }
    const { debrief } = composeDebrief(data, data.sessions['2026-08-16'], '2026-08-16')
    expect(debrief.title).toContain('Hotel Room Special')
    expect(debrief.title).not.toContain('Rest')
  })

  it('tells a make-up from a rerun by whether the original day has a log', () => {
    const data = makeData()
    const makeup = {
      date: '2026-08-16',
      templateId: 'monday',
      status: 'completed' as const,
      makeupFor: '2026-08-11',
      exercises: [{ exerciseId: 'goblet-squat', sets: [{ targetReps: '8', reps: 8, weightLb: 50, done: true }] }],
    }
    data.sessions['2026-08-16'] = makeup
    // Tuesday has no log: this was a make-up.
    let recap = composeDebrief(data, makeup, '2026-08-16').debrief.recap.join(' ')
    expect(recap).toContain('Make-up for 08-11')

    // Tuesday was trained: the same session is a rerun, and says so.
    data.sessions['2026-08-11'] = {
      date: '2026-08-11',
      templateId: 'tuesday',
      status: 'completed',
      exercises: [],
    }
    recap = composeDebrief(data, makeup, '2026-08-16').debrief.recap.join(' ')
    expect(recap).toContain("Ran 08-11's workout again")
    expect(recap).not.toContain('Make-up for')
  })
})

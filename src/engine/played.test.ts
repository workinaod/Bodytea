import { describe, expect, it } from 'vitest'
import { playedFrom } from '../logic/cardioActions'

// ============================================================
// Whether a session makes the day a GAME DAY.
//
// This is not decoration. A played day covers the week's
// conditioning requirement and protects the next day's speed
// work, so getting it wrong changes what the plan asks of
// somebody tomorrow.
//
// The bug: isIntenseSport answers off the mode chip and returns
// TRUE when no mode was picked, which was correct back when
// every entry came off a form that always asked. The live timer
// never asks. So from the day tracking shipped, a fifteen-minute
// shootaround marked the day played, banked the week's
// conditioning, and cancelled the next day's speed work.
// ============================================================

describe('the mode chip, when there is one', () => {
  it('still decides, exactly as it always did', () => {
    expect(playedFrom({ activityId: 'basketball', mode: 'games' })).toBe(true)
    expect(playedFrom({ activityId: 'basketball', mode: 'shooting' })).toBe(false)
    expect(playedFrom({ activityId: 'soccer', mode: 'match' })).toBe(true)
    expect(playedFrom({ activityId: 'soccer', mode: 'kickaround' })).toBe(false)
    expect(playedFrom({ activityId: 'football', mode: 'throwing' })).toBe(false)
  })

  it('outranks a measurement that disagrees', () => {
    // Somebody who says they were shooting around was shooting around,
    // whatever the pedometer made of it.
    expect(playedFrom({ activityId: 'basketball', mode: 'shooting', intensity: 'high' })).toBe(false)
  })
})

describe('a tracked session, where nothing was asked', () => {
  it('does not call a low-intensity hour a game', () => {
    // The bug, stated: this returned true and there was no way to say
    // otherwise, because no mode was ever picked.
    expect(playedFrom({ activityId: 'basketball', intensity: 'low' })).toBe(false)
    expect(playedFrom({ activityId: 'soccer', intensity: 'low' })).toBe(false)
  })

  it('does call a real one a game', () => {
    expect(playedFrom({ activityId: 'basketball', intensity: 'standard' })).toBe(true)
    expect(playedFrom({ activityId: 'basketball', intensity: 'high' })).toBe(true)
  })

  it('lets the athlete overrule the phone', () => {
    // They tracked an hour, the pedometer saw a slow one, and they say
    // it took everything. Theirs is the better evidence.
    expect(playedFrom({ activityId: 'basketball', intensity: 'low', feltIntensity: 'high' })).toBe(true)
    // And the other way: measured hard, but they were messing about.
    expect(playedFrom({ activityId: 'basketball', intensity: 'high', feltIntensity: 'low' })).toBe(false)
  })

  it('keeps the old answer when there is nothing new to go on', () => {
    // No mode, no steps, no answer: an hour of ball logged by hand on a
    // phone that measured nothing. Silently dropping days people did
    // play would be a worse bug than the one being fixed.
    expect(playedFrom({ activityId: 'basketball' })).toBe(true)
    expect(playedFrom({ activityId: 'soccer' })).toBe(true)
  })
})

describe('things that were never game days', () => {
  it('leaves non-sport activities alone at every tier', () => {
    for (const id of ['run', 'bike', 'walk', 'hike', 'swim', 'row-erg', 'jump-rope', 'custom', 'snow']) {
      for (const tier of ['low', 'standard', 'high'] as const) {
        expect(playedFrom({ activityId: id, intensity: tier })).toBe(false)
        expect(playedFrom({ activityId: id, feltIntensity: tier })).toBe(false)
      }
      expect(playedFrom({ activityId: id })).toBe(false)
    }
  })
})

describe('deleting a GPS session removes both of its records', () => {
  it('takes the RunLog with the cardio entry', async () => {
    // A GPS session is two records and the cardio list only ever showed
    // one. Deleting it dropped the entry and left the RunLog behind, so
    // the session stayed in the Progress table, the weekly mileage chart
    // and every total, while the list it was deleted from showed it gone.
    const { useAppStore } = await import('../store/appStore')
    const { logCardio, removeCardio } = await import('../logic/cardioActions')
    const { loggedSessions } = await import('./activityLog')

    useAppStore.getState().update((d) => {
      d.runs = [
        {
          id: 'gps-1', activity: 'run', date: '2026-08-12',
          startedAt: '2026-08-12T07:00:00.000Z', durationSec: 1800,
          distanceMi: 3.2, distanceSource: 'gps', avgPaceSec: 562, splits: [], points: [],
        },
      ]
      d.cardio = {}
    })
    const id = logCardio('2026-08-12', {
      activityId: 'run', label: 'Run', when: 'solo', runId: 'gps-1', miles: 3.2, minutes: 30,
    })
    expect(loggedSessions(useAppStore.getState().data)).toHaveLength(1)

    removeCardio('2026-08-12', id)
    const after = useAppStore.getState().data
    expect(after.runs).toHaveLength(0)
    expect(loggedSessions(after)).toHaveLength(0)
  })

  it('leaves unrelated runs alone', async () => {
    const { useAppStore } = await import('../store/appStore')
    const { logCardio, removeCardio } = await import('../logic/cardioActions')

    useAppStore.getState().update((d) => {
      d.runs = [
        {
          id: 'keep-me', activity: 'run', date: '2026-08-12',
          startedAt: '2026-08-12T07:00:00.000Z', durationSec: 1800,
          distanceMi: 3.2, distanceSource: 'gps', avgPaceSec: 562, splits: [], points: [],
        },
      ]
      d.cardio = {}
    })
    const id = logCardio('2026-08-12', {
      activityId: 'basketball', label: 'Basketball', when: 'solo', minutes: 60,
    })
    removeCardio('2026-08-12', id)
    expect(useAppStore.getState().data.runs).toHaveLength(1)
  })
})

describe('the cardio mirror of a GPS session', () => {
  it('carries no distance when the run itself claims none', async () => {
    // A session that never got a fix keeps whatever scraps the tracker
    // saw before giving up, under a twentieth of a mile, marked 'none'.
    // The mirror used to copy that number unconditionally, which fed
    // GPS noise straight into the achievement mileage the RunLog path
    // is careful to suppress.
    const { useAppStore } = await import('../store/appStore')
    const { saveRun } = await import('../logic/cardioActions')
    const { travelMiles } = await import('./activityLog')

    useAppStore.getState().update((d) => {
      d.runs = []
      d.cardio = {}
    })
    saveRun({
      id: 'nofix', activity: 'run', date: '2026-08-12',
      startedAt: '2026-08-12T07:00:00.000Z', durationSec: 1800,
      distanceMi: 0.04, distanceSource: 'none', avgPaceSec: 0, splits: [], points: [],
    })
    const mirror = useAppStore.getState().data.cardio['2026-08-12'][0]
    expect(mirror.runId).toBe('nofix')
    expect(mirror.miles).toBeUndefined()
    expect(travelMiles(mirror)).toBe(0)
  })

  it('carries the distance when the run does claim one', async () => {
    const { useAppStore } = await import('../store/appStore')
    const { saveRun } = await import('../logic/cardioActions')

    useAppStore.getState().update((d) => {
      d.runs = []
      d.cardio = {}
    })
    saveRun({
      id: 'real', activity: 'hike', date: '2026-08-12',
      startedAt: '2026-08-12T07:00:00.000Z', durationSec: 3600,
      distanceMi: 4.2, distanceSource: 'gps', avgPaceSec: 857, splits: [], points: [],
    })
    const mirror = useAppStore.getState().data.cardio['2026-08-12'][0]
    expect(mirror.miles).toBe(4.2)
    // And it is a hike, not a bike. That label was a two-way choice
    // made when there were only two GPS activities.
    expect(mirror.label).toBe('Hike')
  })
})

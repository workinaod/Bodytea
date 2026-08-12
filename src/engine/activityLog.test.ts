import { describe, expect, it } from 'vitest'
import type { AppData, CardioEntry, ISODate, RunLog } from '../types'
import { emptyAppData } from '../types'
import { isRunMirror, loggedSessions, travelMiles } from './activityLog'

// ============================================================
// Reading the two logs as one, without counting anything twice
// and without deleting anything that was only sitting nearby.
// ============================================================

const TODAY: ISODate = '2026-08-12'
const base = (): AppData => emptyAppData('2026-06-01', '2026-06-01')

let n = 0
function entry(e: Partial<CardioEntry> & { activityId: string }): CardioEntry {
  return { id: `c${n++}`, at: `${TODAY}T12:00:00.000Z`, label: e.activityId, when: 'solo', ...e }
}
function run(r: Partial<RunLog> & { date: ISODate }): RunLog {
  return {
    id: `r${n++}`, activity: 'run', startedAt: `${r.date}T07:00:00.000Z`,
    durationSec: 1800, distanceMi: 3, avgPaceSec: 600, splits: [], points: [], ...r,
  }
}

describe('isRunMirror reads the LOG date, not the write timestamp', () => {
  it('matches a legacy pair whose entry was stamped in another timezone', () => {
    // `at` is new Date().toISOString(), which is UTC. Anyone west of
    // Greenwich logging in the evening stamps TOMORROW. Reading the day
    // off that stamp meant no legacy pair ever matched for them, and
    // every GPS run they had ever tracked counted twice.
    const r = run({ date: TODAY, durationSec: 1800 })
    const e = entry({ activityId: 'run', minutes: 30, at: '2026-08-13T02:30:00.000Z' })
    expect(isRunMirror(e, TODAY, [r])).toBe(true)
  })

  it('does not swallow a back-dated entry that merely resembles today is run', () => {
    // The other half of the same bug. `at` is the moment of WRITING, so
    // an entry logged today for last Tuesday carries today's stamp. Read
    // off that stamp it looked like the shadow of this morning's run and
    // vanished from every total.
    const r = run({ date: TODAY, durationSec: 1800 })
    const backdated = entry({ activityId: 'run', minutes: 30, at: `${TODAY}T20:00:00.000Z` })
    expect(isRunMirror(backdated, '2026-08-04', [r])).toBe(false)
  })

  it('still matches a linked pair by id, whatever the dates say', () => {
    const r = run({ date: TODAY })
    expect(isRunMirror(entry({ activityId: 'run', runId: r.id }), '1999-01-01', [r])).toBe(true)
  })
})

describe('loggedSessions', () => {
  it('keeps a back-dated entry in the day it was logged for', () => {
    const d = base()
    d.runs = [run({ date: TODAY, durationSec: 1800, distanceSource: 'gps' })]
    d.cardio['2026-08-04'] = [entry({ activityId: 'run', minutes: 30, at: `${TODAY}T20:00:00.000Z` })]
    const all = loggedSessions(d)
    expect(all).toHaveLength(2)
    expect(all.map((s) => s.date).sort()).toEqual(['2026-08-04', TODAY])
  })

  it('reports newest first', () => {
    const d = base()
    d.cardio['2026-08-01'] = [entry({ activityId: 'tennis', minutes: 60 })]
    d.cardio['2026-08-09'] = [entry({ activityId: 'tennis', minutes: 60 })]
    expect(loggedSessions(d).map((s) => s.date)).toEqual(['2026-08-09', '2026-08-01'])
  })
})

describe('travelMiles', () => {
  it('counts ground covered and not court shuffling', () => {
    for (const id of ['run', 'bike', 'walk', 'hike']) {
      expect(travelMiles({ activityId: id, miles: 3 })).toBe(3)
    }
    for (const id of ['basketball', 'tennis', 'pickleball', 'volleyball']) {
      expect(travelMiles({ activityId: id, miles: 3 })).toBe(0)
    }
  })
})

describe('achievement facts read travel only', () => {
  it('does not mint distance or pace records from court shuffling', async () => {
    const { athleteFacts } = await import('./achievementFacts')
    const withCourt = base()
    const plain = base()
    for (const [i, d] of ['2026-08-02', '2026-08-05', '2026-08-09'].entries()) {
      // Each pickleball session covers more court than the last, which
      // under the old code minted a "distance record" every time, plus
      // a "pace record" computed from minutes over shuffle distance.
      withCourt.cardio[d] = [
        entry({ activityId: 'pickleball', minutes: 60 - i * 5, miles: 1 + i, distanceSource: 'steps' }),
      ]
    }
    const a = athleteFacts(withCourt, TODAY)
    const b = athleteFacts(plain, TODAY)
    expect(a.cardioMilesTotal).toBe(b.cardioMilesTotal)
    expect(a.distanceRecords).toBe(b.distanceRecords)
    expect(a.paceRecords).toBe(b.paceRecords)
  })

  it('still counts a real run', async () => {
    const { athleteFacts } = await import('./achievementFacts')
    const d = base()
    d.cardio['2026-08-02'] = [entry({ activityId: 'run', minutes: 30, miles: 3 })]
    d.cardio['2026-08-09'] = [entry({ activityId: 'run', minutes: 40, miles: 4.5 })]
    const f = athleteFacts(d, TODAY)
    expect(f.cardioMilesTotal).toBe(7.5)
    expect(f.distanceRecords).toBe(1)
  })
})

import { describe, expect, it } from 'vitest'
import { emptyAppData, type AppData, type SessionLog } from '../types'
import {
  coverageOf,
  groupCoverage,
  groupsOf,
  staleGroups,
  STALE_DAYS,
} from './pickHelp'

// ============================================================
// The numbers behind "what should I pick?". Every one of them
// is read off completed sets, so these pin that unfinished work
// never counts as training and that a group cannot be reported
// overdue before there was time to be overdue.
// ============================================================

const START = '2026-08-10'
const TODAY = '2026-08-24'

function makeData(): AppData {
  const d = emptyAppData(START, START)
  d.settings.onboarded = true
  return d
}

function session(date: string, exerciseId: string, doneSets: number): SessionLog {
  return {
    date,
    templateId: 'custom',
    customTitle: 'test',
    status: 'completed',
    exercises: [
      {
        exerciseId,
        sets: Array.from({ length: doneSets }, () => ({ targetReps: '10', reps: 10, done: true })),
      },
    ],
  }
}

describe('grouping a movement', () => {
  it('groups by prime movers, never by the muscles merely helping', () => {
    // A press pays the triceps, but it is not an arms exercise and
    // calling it one would make the arms group mean nothing.
    expect(groupsOf('flat-db-press')).toEqual(['chest'])
    expect(groupsOf('barbell-row')).toContain('back')
    expect(groupsOf('hammer-curl')).toEqual(['arms'])
    expect(groupsOf('hip-thrust')).toEqual(['glutes'])
    expect(groupsOf('hollow-hold')).toEqual(['core'])
  })

  it('lets one movement honestly serve two groups', () => {
    // A squat is quads and glutes, and pretending otherwise would
    // under-count one of them on every leg day.
    const g = groupsOf('goblet-squat')
    expect(g).toContain('legs')
    expect(g).toContain('glutes')
  })

  it('returns nothing for a movement with no muscle mapping', () => {
    expect(groupsOf('not-a-real-exercise')).toEqual([])
  })
})

describe('what has actually been trained', () => {
  it('counts completed sets in the window and dates the last one', () => {
    const data = makeData()
    data.sessions['2026-08-22'] = session('2026-08-22', 'barbell-row', 3)
    data.sessions['2026-08-12'] = session('2026-08-12', 'flat-db-press', 4)

    const cov = groupCoverage(data, TODAY)
    const back = cov.find((c) => c.group === 'back')!
    const chest = cov.find((c) => c.group === 'chest')!

    expect(back.sets).toBe(3)
    expect(back.daysSince).toBe(2)
    // Twelve days back is outside the 7-day window, so it scores no
    // sets, but the app still knows when it last happened.
    expect(chest.sets).toBe(0)
    expect(chest.daysSince).toBe(12)
  })

  it('never counts a set nobody finished', () => {
    const data = makeData()
    const s = session('2026-08-23', 'barbell-row', 3)
    for (const set of s.exercises[0].sets) set.done = false
    data.sessions['2026-08-23'] = s

    const back = groupCoverage(data, TODAY).find((c) => c.group === 'back')!
    expect(back.sets).toBe(0)
    expect(back.daysSince).toBeNull()
  })

  it('ignores a skipped day entirely', () => {
    const data = makeData()
    const s = session('2026-08-23', 'barbell-row', 3)
    s.status = 'skipped'
    data.sessions['2026-08-23'] = s
    expect(groupCoverage(data, TODAY).find((c) => c.group === 'back')!.daysSince).toBeNull()
  })
})

describe('what to suggest', () => {
  it('says nothing at all to somebody who has never trained', () => {
    // Seven "you have never trained this" lines on day one is noise
    // dressed as insight.
    expect(staleGroups(makeData(), TODAY)).toEqual([])
  })

  it('stays quiet while the app is younger than the staleness window', () => {
    const data = makeData()
    data.sessions['2026-08-10'] = session('2026-08-10', 'barbell-row', 3)
    // Two days in, nothing can honestly be called overdue yet.
    expect(staleGroups(data, '2026-08-12')).toEqual([])
  })

  it('ranks never-trained above long-neglected, and longer gaps above shorter', () => {
    const data = makeData()
    data.sessions['2026-08-23'] = session('2026-08-23', 'flat-db-press', 3) // chest, yesterday
    data.sessions['2026-08-12'] = session('2026-08-12', 'barbell-row', 3) // back, 12 days
    data.sessions['2026-08-16'] = session('2026-08-16', 'goblet-squat', 3) // legs + glutes, 8 days

    const stale = staleGroups(data, TODAY)
    const groups = stale.map((s) => s.group)

    // Trained yesterday, so not on the list at all.
    expect(groups).not.toContain('chest')
    // Two weeks of training and never once a shoulder or a core set is
    // the most useful thing the app can say, so untouched leads.
    expect(stale[0].daysSince).toBeNull()
    const untouched = stale.filter((s) => s.daysSince === null).map((s) => s.group)
    expect([...untouched].sort()).toEqual(['arms', 'core', 'shoulders'])
    // They lead the list, ahead of anything merely overdue.
    expect(groups.slice(0, untouched.length).sort()).toEqual([...untouched].sort())
    // Then by how long it has been, longest first.
    const dated = stale.filter((s) => s.daysSince !== null)
    expect(dated.map((s) => s.group)).toEqual(['back', 'legs', 'glutes'])
    expect(dated.map((s) => s.daysSince)).toEqual([12, 8, 8])
    // Nothing fresher than the threshold ever reaches the list.
    expect(stale.every((s) => s.daysSince === null || s.daysSince >= STALE_DAYS)).toBe(true)
  })
})

describe('what a draft workout covers', () => {
  it('reports the groups picked so far, and nothing it has not', () => {
    const covered = coverageOf([{ exerciseId: 'push-up' }, { exerciseId: 'hammer-curl' }])
    expect(covered.has('chest')).toBe(true)
    expect(covered.has('arms')).toBe(true)
    expect(covered.has('back')).toBe(false)
    expect(coverageOf([]).size).toBe(0)
  })
})

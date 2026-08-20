import { describe, expect, it } from 'vitest'
import type { SessionLog } from '../types'
import { emptyAppData } from '../types'
import { lateNightGraceDate, msUntilNextMidnight, stillOpenForLogging } from './rollover'

describe('msUntilNextMidnight', () => {
  it('computes the wall-clock distance to just past midnight', () => {
    const ms = msUntilNextMidnight(new Date(2026, 7, 8, 22, 0, 0)) // Aug 8, 10pm
    expect(ms).toBe(2 * 3600_000 + 2000)
  })

  it('is DST-safe across the US spring-forward night (Mar 8 2026)', () => {
    // 10pm Mar 7 → midnight Mar 8 is a normal 2h; 10pm Mar 8 → Mar 9 too.
    // The interesting case: from 1:30am on the transition night the distance
    // must reflect the actual wall clock, never go negative or overshoot 25h.
    const fromLateNight = msUntilNextMidnight(new Date(2026, 2, 8, 1, 30, 0))
    expect(fromLateNight).toBeGreaterThan(0)
    expect(fromLateNight).toBeLessThanOrEqual(25 * 3600_000)
    const fallBack = msUntilNextMidnight(new Date(2026, 10, 1, 1, 30, 0))
    expect(fallBack).toBeGreaterThan(0)
    expect(fallBack).toBeLessThanOrEqual(25 * 3600_000)
  })

  it('never returns less than a second', () => {
    expect(msUntilNextMidnight(new Date(2026, 7, 9, 0, 0, 1, 900))).toBeGreaterThanOrEqual(1000)
  })
})

describe('lateNightGraceDate', () => {
  // Phase starts Mon Aug 3 on the NAOD preset: Sat Aug 8 is a scheduled
  // speed session, Sun Aug 9 is rest.
  function makeData(sessions: Record<string, SessionLog> = {}) {
    const data = emptyAppData('2026-08-03')
    data.sessions = sessions
    return data
  }

  const inProgress: SessionLog = {
    date: '2026-08-08',
    templateId: 'saturday',
    status: 'partial',
    startedAt: '2026-08-08T23:10:00.000Z',
    exercises: [],
  }

  it("anchors on yesterday at 00:30 when yesterday's session is unfinished", () => {
    const grace = lateNightGraceDate(makeData({ '2026-08-08': inProgress }), '2026-08-09', new Date(2026, 7, 9, 0, 30))
    expect(grace).toBe('2026-08-08')
  })

  it('anchors on an UNSTARTED scheduled yesterday, the 12–3am workout counts as its day', () => {
    const grace = lateNightGraceDate(makeData(), '2026-08-09', new Date(2026, 7, 9, 0, 30))
    expect(grace).toBe('2026-08-08')
  })

  it('does not anchor on an unstarted REST yesterday', () => {
    // Sun Aug 9 is rest → Monday 00:30 rolls straight over
    expect(lateNightGraceDate(makeData(), '2026-08-10', new Date(2026, 7, 10, 0, 30))).toBeNull()
  })

  it('unstarted days close at 03:00; an in-progress session holds until 06:00', () => {
    // never started → 3:01 is too late to begin it as yesterday
    expect(lateNightGraceDate(makeData(), '2026-08-09', new Date(2026, 7, 9, 3, 1))).toBeNull()
    // actively training across 3am → the anchor must NOT flip mid-workout
    const data = makeData({ '2026-08-08': inProgress })
    expect(lateNightGraceDate(data, '2026-08-09', new Date(2026, 7, 9, 3, 1))).toBe('2026-08-08')
    expect(lateNightGraceDate(data, '2026-08-09', new Date(2026, 7, 9, 6, 1))).toBeNull()
  })

  it('does not apply when the session is finished or skipped', () => {
    const done = { ...inProgress, status: 'completed' as const, endedAt: '2026-08-09T00:05:00.000Z' }
    expect(lateNightGraceDate(makeData({ '2026-08-08': done }), '2026-08-09', new Date(2026, 7, 9, 0, 30))).toBeNull()
    const skipped = { ...inProgress, status: 'skipped' as const }
    expect(lateNightGraceDate(makeData({ '2026-08-08': skipped }), '2026-08-09', new Date(2026, 7, 9, 0, 30))).toBeNull()
  })

  it('refuses to act when today and the wall clock disagree', () => {
    const data = makeData({ '2026-08-08': inProgress })
    expect(lateNightGraceDate(data, '2026-08-10', new Date(2026, 7, 9, 0, 30))).toBeNull()
  })
})

// ============================================================
// A finished session used to close the day out. It should not:
// people finish the plan's work, then play ball, then remember
// the abs. The day takes more until 3am, same window the rest
// of the app already uses for late work.
// ============================================================

describe('how long a day takes more work', () => {
  it('the live day is always open', () => {
    expect(stillOpenForLogging('2026-08-19', '2026-08-19', new Date(2026, 7, 19, 15, 0))).toBe(true)
    // Even at one minute to midnight.
    expect(stillOpenForLogging('2026-08-19', '2026-08-19', new Date(2026, 7, 19, 23, 59))).toBe(true)
  })

  it('yesterday keeps taking work until 3am, and not a minute past', () => {
    const at = (h: number, m = 0) => new Date(2026, 7, 20, h, m)
    // Just after midnight the home day has flipped, but last night is
    // still the night somebody is logging.
    expect(stillOpenForLogging('2026-08-19', '2026-08-20', at(0, 30))).toBe(true)
    expect(stillOpenForLogging('2026-08-19', '2026-08-20', at(2, 59))).toBe(true)
    expect(stillOpenForLogging('2026-08-19', '2026-08-20', at(3, 0))).toBe(false)
    expect(stillOpenForLogging('2026-08-19', '2026-08-20', at(9, 0))).toBe(false)
  })

  it('closes older days even inside the window', () => {
    // Two nights ago is history. It is edited through the record, not
    // by adding to it.
    expect(stillOpenForLogging('2026-08-18', '2026-08-20', new Date(2026, 7, 20, 1, 0))).toBe(false)
  })

  it('stays open when grace has already made yesterday the home day', () => {
    // An unfinished session holds the anchor; the day it holds is open
    // by the first rule, with no special case needed.
    expect(stillOpenForLogging('2026-08-19', '2026-08-19', new Date(2026, 7, 20, 1, 0))).toBe(true)
  })
})

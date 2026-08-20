import { describe, expect, it } from 'vitest'
import { emptyAppData, type AppData } from '../types'
import type { SessionLog } from '../sessionTypes'
import { appendDecision } from './decisions'
import {
  HITS_TO_MOVE,
  MISSES_TO_MOVE,
  applyScheduleMove,
  scheduleDecision,
  scheduleFitOffer,
} from './scheduleFit'

// ============================================================
// The plan asks for Tuesday. The athlete trains Thursday, has done for a
// month, and nothing ever noticed: the plan went on being wrong the same
// way indefinitely while the athlete went on "missing" a session they
// had in fact done.
//
// Read from the LOG, never from the plan. J7's adherenceShape carries
// the same comment for the same reason: reading the plan would make this
// a mirror rather than a measurement.
// ============================================================

const TODAY = '2026-06-01' // a Monday
const PUSH = 'push-day'

function athlete(): AppData {
  const d = emptyAppData(TODAY, TODAY)
  d.settings.onboarded = true
  d.plan.templates = { [PUSH]: { kind: 'session', entries: [{}] } } as never
  d.plan.tier1ByWeekday = { 0: null, 1: null, 2: PUSH, 3: null, 4: null, 5: null, 6: null }
  return d
}

/** Real work logged on this date. */
function trained(d: AppData, date: string): AppData {
  d.sessions[date] = {
    date,
    templateId: PUSH,
    status: 'completed',
    exercises: [{ exerciseId: 'flat-db-press', sets: [{ targetReps: '8', done: true, achieved: 8, weightLb: 50 }] }],
  } as unknown as SessionLog
  return d
}

/** Thursdays trained, Tuesdays missed, `n` weeks of each. */
function drifted(n: number): AppData {
  let d = athlete()
  // 2026-05-28, 05-21, 05-14, 05-07 are Thursdays; the Tuesdays before
  // them are simply never logged.
  const thursdays = ['2026-05-28', '2026-05-21', '2026-05-14', '2026-05-07']
  for (const date of thursdays.slice(0, n)) d = trained(d, date)
  return d
}

describe('the plan learns which day it actually happens on', () => {
  it('says nothing while it is still a couple of weeks', () => {
    expect(MISSES_TO_MOVE).toBe(3)
    expect(HITS_TO_MOVE).toBe(3)
    expect(scheduleFitOffer(drifted(2), TODAY)).toBeNull()
  })

  it('offers the move once both sides are a pattern', () => {
    const offer = scheduleFitOffer(drifted(4), TODAY)
    expect(offer?.from).toBe(2) // Tuesday
    expect(offer?.to).toBe(4) // Thursday
    expect(offer?.templateId).toBe(PUSH)
  })

  it('says nothing to somebody who trains on the day they were asked', () => {
    let d = athlete()
    for (const date of ['2026-05-26', '2026-05-19', '2026-05-12', '2026-05-05']) d = trained(d, date)
    expect(scheduleFitOffer(d, TODAY)).toBeNull()
  })

  it('moves the slot and leaves the old day empty', () => {
    const d = drifted(4)
    const offer = scheduleFitOffer(d, TODAY)!
    applyScheduleMove(d, offer)
    expect(d.plan.tier1ByWeekday[4]).toBe(PUSH)
    expect(d.plan.tier1ByWeekday[2]).toBeNull()
  })

  it('stops asking after the move, because the evidence is gone', () => {
    const d = drifted(4)
    const offer = scheduleFitOffer(d, TODAY)!
    applyScheduleMove(d, offer)
    appendDecision(d, scheduleDecision(offer, 'accepted', TODAY, 0))
    expect(scheduleFitOffer(d, TODAY)).toBeNull()
  })

  it('takes a no for an answer', () => {
    const d = drifted(4)
    appendDecision(d, scheduleDecision(scheduleFitOffer(d, TODAY)!, 'declined', TODAY, 0))
    expect(scheduleFitOffer(d, '2026-06-02')).toBeNull()
    // And the plan is untouched by a no.
    expect(d.plan.tier1ByWeekday[2]).toBe(PUSH)
  })
})

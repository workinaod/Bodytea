import { describe, expect, it } from 'vitest'
import { emptyAppData, type AppData } from '../types'
import type { SessionLog } from '../sessionTypes'
import { appendDecision } from './decisions'
import { CLEAN_EXPOSURES_FOR_STEP, limitStepDecision, limitStepOffer, loadBackLb } from './limitLoad'

// ============================================================
// A stated limitation had no way out.
//
// `prefs.limitations` carries no expiry on purpose: an injury you typed
// in should not evaporate because you went quiet for a fortnight. The
// cost was that it never ended either. Tell the app about a knee at
// signup and every squat drops to 85% and stays there through however
// many pain-free months follow, with nothing that could hand it back.
//
// R3 s9.2: three clean exposures buys ONE step, offered and never taken
// automatically, and any pain note stops it for good.
// ============================================================

const SQUAT = 'goblet-squat' // stress: knee
const PRESS = 'flat-db-press' // stress: shoulder, elbow
const SINCE = '2026-01-05'
const TODAY = '2026-06-01'
const STEP_LB = 10 // lower body, pinned rather than imported

function athlete(joints: string[] = ['knee']): AppData {
  const d = emptyAppData(SINCE, TODAY)
  d.settings.onboarded = true
  d.prefs.limitations = [{ label: 'dodgy knee', joints: joints as never, since: SINCE }]
  return d
}

/** A session that worked the movement, optionally with a pain note on it. */
function did(d: AppData, date: string, exerciseId = SQUAT, hurt = false): AppData {
  d.sessions[date] = {
    date,
    templateId: 't',
    status: 'completed',
    exercises: [{ exerciseId, sets: [{ targetReps: '8', done: true, achieved: 8, weightLb: 100 }] }],
    ...(hurt ? { fatigue: [{ exerciseId, reason: 'pain', atSetIdx: 1, regions: ['quads'] }] } : {}),
  } as unknown as SessionLog
  return d
}

const CLEAN = ['2026-03-02', '2026-03-09', '2026-03-16', '2026-03-23']

describe('earning the weight back', () => {
  it('offers nothing until the joint has been quiet long enough', () => {
    let d = athlete()
    d = did(d, CLEAN[0])
    d = did(d, CLEAN[1])
    expect(limitStepOffer(d, TODAY)).toBeNull()
  })

  it('offers a step after three clean sessions', () => {
    expect(CLEAN_EXPOSURES_FOR_STEP).toBe(3)
    let d = athlete()
    for (const date of CLEAN.slice(0, 3)) d = did(d, date)
    const offer = limitStepOffer(d, TODAY)
    expect(offer?.joint).toBe('knee')
    expect(offer?.clean).toBe(3)
  })

  it('counts only sessions that actually loaded the joint', () => {
    // Three pressing sessions say nothing about a knee.
    let d = athlete()
    for (const date of CLEAN.slice(0, 3)) d = did(d, date, PRESS)
    expect(limitStepOffer(d, TODAY)).toBeNull()
  })

  it('starts the count over when the joint complains', () => {
    let d = athlete()
    d = did(d, CLEAN[0])
    d = did(d, CLEAN[1])
    d = did(d, CLEAN[2], SQUAT, true) // flared
    d = did(d, CLEAN[3])
    expect(limitStepOffer(d, TODAY)).toBeNull()
  })
})

describe('what an accepted step is worth', () => {
  const earned = (): AppData => {
    let d = athlete()
    for (const date of CLEAN.slice(0, 3)) d = did(d, date)
    const offer = limitStepOffer(d, TODAY)!
    appendDecision(d, limitStepDecision(offer, 'accepted', '2026-03-24', 0))
    return d
  }

  it('hands back exactly one step, not the whole reduction', () => {
    expect(loadBackLb(earned(), SQUAT, TODAY)).toBe(STEP_LB)
  })

  it('gives nothing to somebody who never mentioned a joint', () => {
    const d = emptyAppData(SINCE, TODAY)
    expect(loadBackLb(d, SQUAT, TODAY)).toBe(0)
  })

  it('gives nothing on a movement that does not load the joint', () => {
    expect(loadBackLb(earned(), PRESS, TODAY)).toBe(0)
  })

  it('takes it all back the moment the joint flares again', () => {
    // R3 is unambiguous: on any pain note, stay down. Permanent rather
    // than a cooldown, because this is an injury the athlete told us
    // about, not one the app inferred from a bad week.
    let d = earned()
    d = did(d, '2026-04-06', SQUAT, true)
    expect(loadBackLb(d, SQUAT, TODAY)).toBe(0)
    expect(limitStepOffer(d, TODAY)).toBeNull()
  })

  it('makes the second step earn its own three sessions', () => {
    // Otherwise one good month buys four steps at once.
    let d = earned()
    d = did(d, '2026-04-06')
    d = did(d, '2026-04-13')
    expect(limitStepOffer(d, TODAY)).toBeNull()
    d = did(d, '2026-04-20')
    expect(limitStepOffer(d, TODAY)?.clean).toBe(3)
  })

  it('moves a two-joint movement at the slower joint’s pace', () => {
    // A press loading a good elbow and a bad shoulder waits for the
    // shoulder. Min, not max, because that is the safe way round.
    let d = athlete(['shoulder', 'elbow'])
    for (const date of CLEAN.slice(0, 3)) d = did(d, date, PRESS)
    const offer = limitStepOffer(d, TODAY)!
    expect(offer.joint).toBe('shoulder')
    appendDecision(d, limitStepDecision(offer, 'accepted', '2026-03-24', 0))
    // Shoulder has a step, elbow has none, so the press gets nothing.
    expect(loadBackLb(d, PRESS, TODAY)).toBe(0)
  })
})

describe('a no is still a no', () => {
  it('does not ask again the next day', () => {
    let d = athlete()
    for (const date of CLEAN.slice(0, 3)) d = did(d, date)
    const offer = limitStepOffer(d, TODAY)!
    appendDecision(d, limitStepDecision(offer, 'declined', TODAY, 0))
    expect(limitStepOffer(d, '2026-06-02')).toBeNull()
  })
})

describe('it asks on a day the answer shows up', () => {
  // Found by screenshot in the slice 7 review. The card offered knee
  // weight back on a pressing day, so tapping it changed nothing on
  // screen and read as broken. The decision is standing; the moment to
  // ask is a day that actually loads the joint.
  const ready = (): AppData => {
    let d = athlete()
    for (const date of CLEAN.slice(0, 3)) d = did(d, date)
    return d
  }

  it('asks on a day that loads the joint', () => {
    expect(limitStepOffer(ready(), TODAY, new Set(['knee'] as never))?.joint).toBe('knee')
  })

  it('stays quiet on a day that does not', () => {
    expect(limitStepOffer(ready(), TODAY, new Set(['shoulder'] as never))).toBeNull()
  })

  it('still answers when the caller does not care which day it is', () => {
    // The engine is usable without a day, which is what keeps the unit
    // tests above honest about the rule rather than about the screen.
    expect(limitStepOffer(ready(), TODAY)?.joint).toBe('knee')
  })
})

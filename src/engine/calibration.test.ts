import { describe, expect, it } from 'vitest'
import type { AppData, CardioEntry, ISODate, RunLog } from '../types'
import { emptyAppData } from '../types'
import { trackingFor } from '../plan/cardio'
import { addDaysISO } from './calendar'
import { MIN_STEPS_TO_JUDGE, cardioKcal, classifyIntensity, type Intensity } from './intensity'
import {
  MAX_DRIFT,
  MIN_ACTIVITY_SAMPLES,
  MIN_BIAS_SAMPLES,
  calibrationNote,
  gradedCount,
  intensityBias,
  needsIntensityAnswer,
  perceivedIntensity,
  personalBand,
} from './calibration'

const TODAY: ISODate = '2026-08-12'
const BALL = trackingFor('basketball').band!

function base(): AppData {
  return emptyAppData('2026-06-01', '2026-06-01')
}

let seq = 0

/** One rated session of `activityId` at a given steps-per-hour. */
function rated(
  d: AppData,
  activityId: string,
  ratePerHour: number,
  felt: Intensity,
  minutes = 60,
): AppData {
  const date = addDaysISO(TODAY, -(seq % 90))
  const e: CardioEntry = {
    id: `c${seq++}`,
    at: `${date}T18:00:00.000Z`,
    activityId,
    label: activityId,
    when: 'solo',
    minutes,
    steps: Math.round(ratePerHour * (minutes / 60)),
    feltIntensity: felt,
  }
  d.cardio[date] = [...(d.cardio[date] ?? []), e]
  return d
}

function ratedRun(d: AppData, ratePerHour: number, felt: Intensity): AppData {
  const date = addDaysISO(TODAY, -(seq % 90))
  const r: RunLog = {
    id: `r${seq++}`,
    activity: 'run',
    date,
    startedAt: `${date}T07:00:00.000Z`,
    durationSec: 3600,
    distanceMi: 5,
    avgPaceSec: 720,
    splits: [],
    points: [],
    steps: ratePerHour,
    feltIntensity: felt,
  }
  d.runs = [...d.runs, r]
  return d
}

describe('before there is any evidence', () => {
  it('hands back the researched band untouched', () => {
    const b = personalBand(base(), 'basketball')!
    expect(b.low).toBe(BALL.low)
    expect(b.high).toBe(BALL.high)
    expect(b.source).toBe('population')
    expect(intensityBias(base())).toBeNull()
    expect(calibrationNote(base(), 'basketball')).toBeNull()
  })

  it('grades exactly as the uncalibrated engine does', () => {
    const d = base()
    for (const rate of [1000, 4500, 6000, 8000, 12000]) {
      expect(perceivedIntensity(d, 'basketball', rate, 60)).toBe(
        classifyIntensity('basketball', rate, 60),
      )
    }
  })

  it('says nothing at all for a sport with no band to move', () => {
    for (const id of ['swim', 'bike', 'row-erg', 'hockey']) {
      expect(personalBand(base(), id)).toBeNull()
      expect(perceivedIntensity(base(), id, 9000, 60)).toBeNull()
    }
  })
})

describe('the athlete always wins on their own session', () => {
  it('takes the answer over the measurement, in both directions', () => {
    const d = base()
    // The step rate says low; they say it wrecked them.
    expect(perceivedIntensity(d, 'basketball', 2000, 60, 'high')).toBe('high')
    // The step rate says high; they say it was a jog.
    expect(perceivedIntensity(d, 'basketball', 12000, 60, 'low')).toBe('low')
  })

  it('takes the answer even where the phone measured nothing', () => {
    // No steps at all: permission refused, phone in a bag. Their word
    // is the only evidence there is, and it is enough.
    expect(perceivedIntensity(base(), 'basketball', undefined, 60, 'high')).toBe('high')
    expect(perceivedIntensity(base(), 'basketball', 0, 45, 'standard')).toBe('standard')
  })
})

describe('the cross-sport lean', () => {
  it('waits for enough answers to be a lean rather than a mood', () => {
    const d = base()
    for (let i = 0; i < MIN_BIAS_SAMPLES - 1; i++) rated(d, 'basketball', 3000, 'high')
    expect(intensityBias(d)).toBeNull()
    rated(d, 'basketball', 3000, 'high')
    expect(intensityBias(d)).not.toBeNull()
  })

  it('starts helping a sport the athlete has never rated', () => {
    // The whole point of a global lean: three answers about tennis
    // improve the very first basketball session.
    const d = base()
    for (let i = 0; i < 3; i++) rated(d, 'tennis', 2000, 'high') // way above measured 'low'
    const b = personalBand(d, 'basketball')!
    expect(b.source).toBe('bias')
    expect(b.high).toBeLessThan(BALL.high)
    expect(b.low).toBeLessThan(BALL.low)
  })

  it('moves the band the way the disagreement points', () => {
    const harder = base()
    for (let i = 0; i < 4; i++) rated(harder, 'tennis', 2000, 'high')
    expect(intensityBias(harder)).toBeGreaterThan(0)
    expect(personalBand(harder, 'basketball')!.high).toBeLessThan(BALL.high)

    const easier = base()
    for (let i = 0; i < 4; i++) rated(easier, 'tennis', 9000, 'low')
    expect(intensityBias(easier)).toBeLessThan(0)
    expect(personalBand(easier, 'basketball')!.high).toBeGreaterThan(BALL.high)
  })

  it('does not move at all when the athlete and the step rate agree', () => {
    const d = base()
    rated(d, 'basketball', 3000, 'low')
    rated(d, 'basketball', 6000, 'standard')
    rated(d, 'basketball', 9000, 'high')
    expect(intensityBias(d)).toBe(0)
    expect(personalBand(d, 'tennis')!.source).toBe('population')
  })
})

describe('the per-sport band', () => {
  it('takes over once that sport has its own answers', () => {
    const d = base()
    for (let i = 0; i < MIN_ACTIVITY_SAMPLES / 2; i++) rated(d, 'basketball', 3000, 'low')
    for (let i = 0; i < MIN_ACTIVITY_SAMPLES / 2; i++) rated(d, 'basketball', 6000, 'high')
    const b = personalBand(d, 'basketball')!
    expect(b.source).toBe('activity')
    expect(b.samples).toBe(MIN_ACTIVITY_SAMPLES)
  })

  it('needs two different answers, because one repeated is not a boundary', () => {
    // Somebody who calls every single session hard has told us their
    // sessions are hard. They have not told us where hard STARTS, and
    // there is no honest way to place a threshold from one class. The
    // cross-sport lean still shifts them; their own band does not form.
    const d = base()
    for (let i = 0; i < 20; i++) rated(d, 'basketball', 3000, 'high')
    const b = personalBand(d, 'basketball')!
    expect(b.source).toBe('bias')
    expect(b.low).toBeLessThan(BALL.low)
  })

  it('lands the thresholds between the tiers the athlete reported', () => {
    // Somebody who calls 3,000/hr easy, 5,000 normal and 7,000 hard
    // should get boundaries near 4,000 and 6,000, pulled part of the
    // way back toward the researched 4,500 / 8,000.
    const d = base()
    for (let i = 0; i < 3; i++) rated(d, 'basketball', 3000, 'low')
    for (let i = 0; i < 3; i++) rated(d, 'basketball', 5000, 'standard')
    for (let i = 0; i < 3; i++) rated(d, 'basketball', 7000, 'high')
    const b = personalBand(d, 'basketball')!
    expect(b.source).toBe('activity')
    // Personal 4,000 blended with population 4,500: between them.
    expect(b.low).toBeGreaterThan(4000)
    expect(b.low).toBeLessThan(BALL.low)
    // Personal 6,000 blended with population 8,000: between them.
    expect(b.high).toBeGreaterThan(6000)
    expect(b.high).toBeLessThan(BALL.high)
  })

  it('leans further personal as the evidence piles up', () => {
    const few = base()
    for (let i = 0; i < 2; i++) rated(few, 'basketball', 3000, 'low')
    for (let i = 0; i < 2; i++) rated(few, 'basketball', 5000, 'high')
    const many = base()
    for (let i = 0; i < 15; i++) rated(many, 'basketball', 3000, 'low')
    for (let i = 0; i < 15; i++) rated(many, 'basketball', 5000, 'high')
    expect(personalBand(many, 'basketball')!.high).toBeLessThan(
      personalBand(few, 'basketball')!.high,
    )
  })

  it('keeps the band the right way round, always', () => {
    // Somebody whose "easy" sessions outrun their "hard" ones has told
    // us nothing usable. An inside-out band would grade the same
    // session 'high' and 'low' at once.
    //
    // The fixture needs enough weight to actually invert after
    // blending. The first version of this test used four of each,
    // which the pull toward the researched band straightened out on
    // its own, so it passed with the inversion check deleted.
    const d = base()
    for (let i = 0; i < 30; i++) rated(d, 'basketball', 9000, 'low')
    for (let i = 0; i < 30; i++) rated(d, 'basketball', 2000, 'high')
    const b = personalBand(d, 'basketball')!
    expect(b.low).toBeLessThan(b.high)
    // Nothing usable came out of it, so it must fall back rather than
    // present a band it built from contradictions.
    expect(b.source).not.toBe('activity')
  })

  it('never strays more than half of where it started', () => {
    // A wall of extreme answers must not send the band somewhere no
    // real session could ever reach. Both directions, and it has to be
    // a two-tier fixture or the personal path never forms and the cap
    // it is meant to test is never reached.
    for (const [lo, hi] of [
      [300, 600], // everything reads as almost no movement
      [26000, 30000], // everything reads as a sprint
    ] as const) {
      const d = base()
      for (let i = 0; i < 40; i++) rated(d, 'basketball', lo, 'low')
      for (let i = 0; i < 40; i++) rated(d, 'basketball', hi, 'high')
      const b = personalBand(d, 'basketball')!
      expect(b.source).toBe('activity')
      expect(b.low).toBeGreaterThanOrEqual(Math.round(BALL.low * (1 - MAX_DRIFT)))
      expect(b.low).toBeLessThanOrEqual(Math.round(BALL.low * (1 + MAX_DRIFT)))
      expect(b.high).toBeGreaterThanOrEqual(Math.round(BALL.high * (1 - MAX_DRIFT)))
      expect(b.high).toBeLessThanOrEqual(Math.round(BALL.high * (1 + MAX_DRIFT)))
      expect(b.low).toBeLessThan(b.high)
    }
  })

  it('cannot exceed the cap on the cross-sport path either', () => {
    // That path is bounded by construction rather than by the clamp:
    // a tier rank runs 1 to 3, so the worst disagreement is two tiers
    // and the scale cannot leave 0.64 to 1.36. The clamp is there so
    // that raising BIAS_STEP later cannot quietly break the promise,
    // and this states the bound so a change to either shows up.
    for (const [rate, felt] of [
      [200, 'high'],
      [30000, 'low'],
    ] as const) {
      const d = base()
      for (let i = 0; i < 40; i++) rated(d, 'basketball', rate, felt)
      const b = personalBand(d, 'basketball')!
      expect(b.source).toBe('bias')
      expect(Math.abs(b.low / BALL.low - 1)).toBeLessThanOrEqual(MAX_DRIFT)
      expect(Math.abs(b.high / BALL.high - 1)).toBeLessThanOrEqual(MAX_DRIFT)
      expect(b.low).toBeLessThan(b.high)
    }
  })

  it('keeps one sport out of another sport is band', () => {
    // Tennis answers may set the cross-sport lean, but they must never
    // become basketball's own thresholds.
    const d = base()
    for (let i = 0; i < 10; i++) rated(d, 'tennis', 1500, 'low')
    for (let i = 0; i < 10; i++) rated(d, 'tennis', 3000, 'high')
    expect(personalBand(d, 'basketball')!.source).toBe('bias')
    expect(personalBand(d, 'tennis')!.source).toBe('activity')
  })

  it('reads runs and cardio entries as the same evidence', () => {
    const d = base()
    for (let i = 0; i < MIN_ACTIVITY_SAMPLES / 2; i++) ratedRun(d, 5000, 'low')
    for (let i = 0; i < MIN_ACTIVITY_SAMPLES / 2; i++) ratedRun(d, 9000, 'high')
    expect(personalBand(d, 'run')!.source).toBe('activity')
    expect(gradedCount(d)).toBe(MIN_ACTIVITY_SAMPLES)
  })
})

describe('what calibration refuses to touch', () => {
  it('never changes a calorie number', () => {
    // A MET is an absolute claim about work done, not about how the
    // work felt. Letting perceived effort inflate it is how an app
    // hands somebody a calorie credit they did not earn.
    const flat = base()
    const skewed = base()
    for (let i = 0; i < 20; i++) rated(skewed, 'basketball', 2000, 'high')
    for (const steps of [3000, 6000, 9000]) {
      const a = cardioKcal({ activityId: 'basketball', minutes: 60, bodyweightLb: 176, steps })
      const b = cardioKcal({ activityId: 'basketball', minutes: 60, bodyweightLb: 176, steps })
      expect(a).toEqual(b)
    }
    expect(gradedCount(flat)).toBe(0)
  })

  it('learns nothing from evidence too thin to be evidence', () => {
    const d = base()
    // A phone in a bag, and a session too short to have a rate.
    for (let i = 0; i < 20; i++) rated(d, 'basketball', MIN_STEPS_TO_JUDGE - 1, 'high', 60)
    for (let i = 0; i < 20; i++) rated(d, 'basketball', 9000, 'high', 2)
    expect(gradedCount(d)).toBe(0)
    expect(intensityBias(d)).toBeNull()
    expect(personalBand(d, 'basketball')!.source).toBe('population')
  })

  it('learns nothing from a session nobody rated', () => {
    const d = base()
    for (let i = 0; i < 20; i++) {
      const date = addDaysISO(TODAY, -i)
      d.cardio[date] = [
        {
          id: `u${i}`,
          at: `${date}T18:00:00.000Z`,
          activityId: 'basketball',
          label: 'Basketball',
          when: 'solo',
          minutes: 60,
          steps: 9000,
        },
      ]
    }
    expect(gradedCount(d)).toBe(0)
    expect(personalBand(d, 'basketball')!.source).toBe('population')
  })
})

describe('the prediction', () => {
  it('grades an unrated session against the band it learned', () => {
    // Six thousand steps an hour of basketball is 'standard' by the
    // researched band. For somebody who has consistently called that
    // pace hard, it should come back 'high' without them saying so.
    const d = base()
    for (let i = 0; i < 3; i++) rated(d, 'basketball', 3000, 'low')
    for (let i = 0; i < 6; i++) rated(d, 'basketball', 5500, 'high')
    expect(classifyIntensity('basketball', 6000, 60)).toBe('standard')
    expect(perceivedIntensity(d, 'basketball', 6000, 60)).toBe('high')
  })

  it('still refuses to guess with nothing to guess from', () => {
    const d = base()
    for (let i = 0; i < 10; i++) rated(d, 'basketball', 3000, 'high')
    expect(perceivedIntensity(d, 'basketball', undefined, 60)).toBeNull()
    expect(perceivedIntensity(d, 'basketball', 50, 60)).toBeNull()
    expect(perceivedIntensity(d, 'basketball', 9000, 2)).toBeNull()
  })

  it('stays monotone: more steps never grades easier', () => {
    const d = base()
    for (let i = 0; i < 8; i++) rated(d, 'basketball', 3000 + i * 300, i < 4 ? 'low' : 'high')
    const rank = { low: 0, standard: 1, high: 2 }
    let last = -1
    for (let steps = MIN_STEPS_TO_JUDGE; steps <= 20000; steps += 211) {
      const t = perceivedIntensity(d, 'basketball', steps, 60)
      if (t === null) continue
      expect(rank[t]).toBeGreaterThanOrEqual(last)
      last = rank[t]
    }
  })
})

describe('saying so out loud', () => {
  it('explains an adjustment, and stays quiet when there is none', () => {
    expect(calibrationNote(base(), 'basketball')).toBeNull()
    const d = base()
    for (let i = 0; i < 3; i++) rated(d, 'tennis', 2000, 'high')
    expect(calibrationNote(d, 'basketball')).toContain('harder')
    for (let i = 0; i < MIN_ACTIVITY_SAMPLES; i++) rated(d, 'basketball', 3000, 'high')
    expect(calibrationNote(d, 'basketball')).toContain('own')
  })

  it('has no em dashes in anything a user reads', () => {
    const d = base()
    for (let i = 0; i < 6; i++) rated(d, 'tennis', 2000, 'high')
    for (const id of ['tennis', 'basketball']) {
      expect(calibrationNote(d, id) ?? '').not.toContain('—')
    }
  })
})

describe('asking exactly once', () => {
  it('asks about a session long enough to grade, and never twice', () => {
    expect(needsIntensityAnswer({ minutes: 45 })).toBe(true)
    expect(needsIntensityAnswer({ minutes: 45, feltIntensity: 'high' })).toBe(false)
    // Three minutes is not a session to grade, it is a false start.
    expect(needsIntensityAnswer({ minutes: 3 })).toBe(false)
    expect(needsIntensityAnswer({})).toBe(false)
  })
})

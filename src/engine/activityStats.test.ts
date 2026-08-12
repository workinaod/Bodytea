import { describe, expect, it } from 'vitest'
import type { AppData, CardioEntry, ISODate, RunLog } from '../types'
import { emptyAppData } from '../types'
import { addDaysISO } from './calendar'
import {
  MIN_SESSIONS_TO_COMPARE,
  TREND_DEADBAND,
  intensityTrend,
  sportSummary,
  sportTotals,
} from './activityStats'

const TODAY: ISODate = '2026-08-12'

function base(): AppData {
  return emptyAppData('2026-06-01', '2026-06-01')
}

let seq = 0
function entry(e: Partial<CardioEntry> & { activityId: string }): CardioEntry {
  return {
    id: `c${seq++}`,
    at: '2026-08-12T12:00:00.000Z',
    label: e.label ?? e.activityId,
    when: 'solo',
    ...e,
  }
}

function log(d: AppData, date: ISODate, e: CardioEntry): AppData {
  d.cardio[date] = [...(d.cardio[date] ?? []), e]
  return d
}

function run(r: Partial<RunLog> & { date: ISODate }): RunLog {
  return {
    id: `r${seq++}`,
    activity: 'run',
    startedAt: `${r.date}T07:00:00.000Z`,
    durationSec: 1800,
    distanceMi: 3,
    avgPaceSec: 600,
    splits: [],
    points: [],
    ...r,
  }
}

describe('sportSummary', () => {
  it('rolls GPS runs and cardio entries into one row per sport', () => {
    // The whole point: basketball logged from the timer and basketball
    // logged by hand are the same sport and belong on the same line.
    const d = base()
    log(d, TODAY, entry({ activityId: 'basketball', minutes: 60, kcalEst: 500, steps: 7000, intensity: 'standard' }))
    log(d, addDaysISO(TODAY, -3), entry({ activityId: 'basketball', minutes: 45, kcalEst: 380 }))
    d.runs = [run({ date: addDaysISO(TODAY, -1), distanceMi: 3.2, kcalEst: 320, distanceSource: 'gps' })]

    const rows = sportSummary(d, TODAY)
    expect(rows).toHaveLength(2)
    const ball = rows.find((r) => r.activityId === 'basketball')!
    expect(ball.sessions).toBe(2)
    expect(ball.minutes).toBe(105)
    expect(ball.kcal).toBe(880)
    expect(ball.steps).toBe(7000)
    // Only one of the two carried a measured tier, and only it votes.
    expect(ball.measured).toBe(1)
    expect(ball.mix).toEqual({ low: 0, standard: 1, high: 0 })
  })

  it('puts the biggest calorie contributor first', () => {
    const d = base()
    log(d, TODAY, entry({ activityId: 'volleyball', minutes: 90, kcalEst: 300 }))
    log(d, TODAY, entry({ activityId: 'soccer', minutes: 60, kcalEst: 700 }))
    log(d, TODAY, entry({ activityId: 'swim', minutes: 30, kcalEst: 250 }))
    expect(sportSummary(d, TODAY).map((r) => r.activityId)).toEqual(['soccer', 'volleyball', 'swim'])
  })

  it('leaves everything outside the window alone', () => {
    const d = base()
    log(d, addDaysISO(TODAY, -29), entry({ activityId: 'tennis', minutes: 60, kcalEst: 400 }))
    log(d, addDaysISO(TODAY, -30), entry({ activityId: 'tennis', minutes: 60, kcalEst: 400 }))
    // A day in the future is a clock that moved backwards, not a session.
    log(d, addDaysISO(TODAY, 1), entry({ activityId: 'tennis', minutes: 60, kcalEst: 400 }))
    const rows = sportSummary(d, TODAY, 30)
    expect(rows[0].sessions).toBe(1)
    expect(rows[0].kcal).toBe(400)
  })

  it('never counts a distance nobody measured', () => {
    // A run that never got a fix still carries whatever scraps of
    // distance the tracker saw before giving up: under a twentieth of
    // a mile, marked 'none'. That is noise wearing a number, and it
    // must not reach a mileage total.
    //
    // Distance FROM STEPS is the opposite case. A treadmill mile is a
    // real mile, measured a different way, and dropping it would make
    // every indoor session look like it never happened.
    const d = base()
    d.runs = [
      run({ date: TODAY, distanceMi: 0.04, distanceSource: 'none', kcalEst: 90 }),
      run({ date: TODAY, distanceMi: 2.6, distanceSource: 'steps', steps: 4200, kcalEst: 300 }),
      run({ date: TODAY, distanceMi: 3.1, distanceSource: 'gps', kcalEst: 310 }),
    ]
    const row = sportSummary(d, TODAY)[0]
    expect(row.sessions).toBe(3)
    expect(row.miles).toBe(5.7)
    expect(row.steps).toBe(4200)
  })

  it('keeps the name the user typed for a custom activity', () => {
    const d = base()
    log(d, TODAY, entry({ activityId: 'custom', label: 'Padel', minutes: 60, kcalEst: 400 }))
    expect(sportSummary(d, TODAY)[0].label).toBe('Padel')
  })

  it('is empty rather than wrong when nothing was logged', () => {
    expect(sportSummary(base(), TODAY)).toEqual([])
    expect(sportTotals([])).toEqual({ sessions: 0, minutes: 0, kcal: 0, steps: 0, miles: 0 })
  })

  it('adds the columns up the way a reader would', () => {
    const d = base()
    log(d, TODAY, entry({ activityId: 'soccer', minutes: 60, kcalEst: 700, miles: 4.1, steps: 6000 }))
    log(d, TODAY, entry({ activityId: 'tennis', minutes: 45, kcalEst: 400, miles: 1.9, steps: 3900 }))
    expect(sportTotals(sportSummary(d, TODAY))).toEqual({
      sessions: 2,
      minutes: 105,
      kcal: 1100,
      steps: 9900,
      miles: 6.0,
    })
  })
})

describe('intensityTrend', () => {
  /** n sessions of one tier, spread back from `endsAt`. */
  function block(d: AppData, endsAt: ISODate, tier: 'low' | 'standard' | 'high', n: number) {
    for (let i = 0; i < n; i++) {
      log(d, addDaysISO(endsAt, -i * 2), entry({ activityId: 'basketball', minutes: 60, kcalEst: 400, intensity: tier }))
    }
  }

  it('says nothing until there is enough measured work on both sides', () => {
    const d = base()
    block(d, TODAY, 'high', MIN_SESSIONS_TO_COMPARE)
    // Recent half is full, the half before it is empty.
    expect(intensityTrend(d, TODAY, 30)).toBeNull()

    block(d, addDaysISO(TODAY, -30), 'low', MIN_SESSIONS_TO_COMPARE - 1)
    expect(intensityTrend(d, TODAY, 30)).toBeNull()
  })

  it('calls a real climb a climb', () => {
    const d = base()
    block(d, addDaysISO(TODAY, -30), 'low', 4)
    block(d, TODAY, 'high', 4)
    const t = intensityTrend(d, TODAY, 30)!
    expect(t.direction).toBe('up')
    expect(t.before).toBe(1)
    expect(t.now).toBe(3)
  })

  it('calls a real drop a drop', () => {
    const d = base()
    block(d, addDaysISO(TODAY, -30), 'high', 4)
    block(d, TODAY, 'low', 4)
    expect(intensityTrend(d, TODAY, 30)!.direction).toBe('down')
  })

  it('does not call noise a direction', () => {
    // Same tier both halves is flat, obviously. The band exists for the
    // case just off that: one session in eight grading differently is
    // not news, and reporting it as "your training is getting harder"
    // is the kind of thing that makes people stop believing an app.
    const d = base()
    block(d, addDaysISO(TODAY, -30), 'standard', 8)
    block(d, TODAY, 'standard', 7)
    log(d, TODAY, entry({ activityId: 'basketball', minutes: 60, kcalEst: 400, intensity: 'high' }))
    const t = intensityTrend(d, TODAY, 30)!
    expect(t.now - t.before).toBeLessThan(TREND_DEADBAND)
    expect(t.direction).toBe('flat')
  })

  it('ignores sessions with no measured tier entirely', () => {
    // Hand-logged hours have no evidence to vote with. If they counted
    // as anything, a month of honest manual logging would swing the
    // trend without a single thing having been measured.
    const d = base()
    block(d, addDaysISO(TODAY, -30), 'low', 4)
    block(d, TODAY, 'high', 4)
    const withMeasured = intensityTrend(d, TODAY, 30)!
    for (let i = 0; i < 20; i++) {
      log(d, addDaysISO(TODAY, -i), entry({ activityId: 'soccer', minutes: 60, kcalEst: 500 }))
    }
    expect(intensityTrend(d, TODAY, 30)).toEqual(withMeasured)
  })
})

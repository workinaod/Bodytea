import { describe, expect, it } from 'vitest'
import type { AppData, CardioEntry, ISODate, RunLog } from '../types'
import { emptyAppData } from '../types'
import { addDaysISO } from './calendar'
import { travelMiles } from './activityLog'
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
    log(d, TODAY, entry({ activityId: 'basketball', minutes: 60, kcalEst: 500, steps: 7000, feltIntensity: 'standard' }))
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
    expect(ball.graded).toBe(1)
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

describe('a GPS run is one session, not two', () => {
  // saveRun writes the route as a RunLog AND logs a cardio entry beside
  // it, because the conditioning machinery reads the cardio log. The
  // first version of this rollup read both and added them up, so every
  // tracked run showed as two sessions with twice the miles and twice
  // the minutes. Anybody who used the GPS tracker had a wrong month.

  it('counts a linked pair once', () => {
    const d = base()
    const r = run({ date: TODAY, distanceMi: 3.2, durationSec: 1800, kcalEst: 320, distanceSource: 'gps' })
    d.runs = [r]
    log(d, TODAY, entry({ activityId: 'run', runId: r.id, miles: 3.2, minutes: 30, label: 'Run' }))
    const row = sportSummary(d, TODAY)[0]
    expect(row.sessions).toBe(1)
    expect(row.miles).toBe(3.2)
    expect(row.minutes).toBe(30)
    expect(row.kcal).toBe(320)
  })

  it('counts an unlinked legacy pair once too', () => {
    // Entries written before runId existed carry no link. They still
    // match on the exact signature saveRun leaves: same day, same
    // activity, same rounded duration.
    const d = base()
    d.runs = [run({ date: TODAY, distanceMi: 3.2, durationSec: 1800, kcalEst: 320, distanceSource: 'gps' })]
    log(d, TODAY, entry({ activityId: 'run', miles: 3.2, minutes: 30, label: 'Run' }))
    expect(sportSummary(d, TODAY)[0].sessions).toBe(1)
  })

  it('still counts a genuinely separate session on the same day', () => {
    const d = base()
    d.runs = [run({ date: TODAY, distanceMi: 3.2, durationSec: 1800, distanceSource: 'gps' })]
    // A different sport that afternoon is not the morning's run.
    log(d, TODAY, entry({ activityId: 'basketball', minutes: 30, kcalEst: 200 }))
    expect(sportTotals(sportSummary(d, TODAY)).sessions).toBe(2)
  })

  it('still counts a SECOND run on the same day', () => {
    // The case that decides how tight the legacy match has to be. A
    // tracked 30-minute run in the morning and a hand-logged
    // 45-minute jog that evening are two sessions. Matching on day
    // and sport alone would swallow the second one.
    const d = base()
    d.runs = [run({ date: TODAY, distanceMi: 3.2, durationSec: 1800, distanceSource: 'gps' })]
    log(d, TODAY, entry({ activityId: 'run', label: 'Run', miles: 4.5, minutes: 45 }))
    const row = sportSummary(d, TODAY)[0]
    expect(row.sessions).toBe(2)
    expect(row.minutes).toBe(75)
    expect(row.miles).toBe(7.7)
  })
})

describe('intensityTrend', () => {
  /** n sessions of one tier, spread back from `endsAt`. */
  function block(d: AppData, endsAt: ISODate, tier: 'low' | 'standard' | 'high', n: number) {
    for (let i = 0; i < n; i++) {
      log(d, addDaysISO(endsAt, -i * 2), entry({ activityId: 'basketball', minutes: 60, kcalEst: 400, feltIntensity: tier }))
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
    log(d, TODAY, entry({ activityId: 'basketball', minutes: 60, kcalEst: 400, feltIntensity: 'high' }))
    const t = intensityTrend(d, TODAY, 30)!
    expect(t.now - t.before).toBeLessThan(TREND_DEADBAND)
    expect(t.direction).toBe('flat')
  })

  it('ignores sessions with nothing to grade them by entirely', () => {
    // An hour logged by hand, with no step count and no answer, has no
    // evidence to vote with. If it counted as anything, a month of
    // honest manual logging would swing the trend without a single
    // session having been measured or rated.
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

describe('travelMiles', () => {
  it('counts ground covered and not court shuffling', () => {
    // A pickleball hour genuinely covers about a mile of court, and
    // that is a real number for that sport. It is not travel, and
    // adding it to a lifetime mileage badge puts volleyball footwork
    // in the same column as a hike. Before steps existed only the four
    // activities that ask for miles could contribute; this is that
    // same set, without a hardcoded list.
    for (const id of ['run', 'bike', 'walk', 'hike', 'soccer', 'football']) {
      expect(travelMiles({ activityId: id, miles: 3 })).toBe(3)
    }
    for (const id of ['basketball', 'tennis', 'pickleball', 'volleyball']) {
      expect(travelMiles({ activityId: id, miles: 3 })).toBe(0)
    }
  })

  it('is zero for anything without a distance at all', () => {
    expect(travelMiles({ activityId: 'run' })).toBe(0)
    expect(travelMiles({ activityId: 'run', miles: 0 })).toBe(0)
    expect(travelMiles({ activityId: 'swim', miles: 2 })).toBe(0)
  })
})

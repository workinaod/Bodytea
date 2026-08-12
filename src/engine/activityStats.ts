import type { AppData, ISODate } from '../types'
import { addDaysISO } from './calendar'
import { loggedSessions, type LoggedSession } from './activityLog'
import { perceivedIntensity } from './calibration'
import type { Intensity } from './intensity'

// ============================================================
// What all that tracking adds up to.
//
// The app records sport in two places for good reasons: GPS runs
// and rides get their own log with a route on it, and everything
// else lands as a cardio entry on a day. Neither is wrong, but
// asking "how much basketball have I actually played this month"
// meant reading both and adding them up by hand, which nobody
// does, so the answer was effectively unavailable.
//
// This rolls the two together per activity. The interesting
// column is the intensity mix, because it answers the question a
// training log is supposed to answer and never could before: not
// "did you show up" but "how hard, and is that changing".
//
// Only sessions the phone actually measured carry a tier. A hand
// -logged hour of ball counts toward time and calories and simply
// does not vote on intensity, which is right: it has no evidence
// to vote with.
// ============================================================

export interface ActivityRollup {
  activityId: string
  label: string
  emoji: string
  sessions: number
  minutes: number
  /** Miles, summed only where a distance was honestly recorded. */
  miles: number
  kcal: number
  steps: number
  /** How the graded sessions came out. Absent tiers are zero. */
  mix: Record<Intensity, number>
  /** Sessions carrying a tier from either source, so a bar can scale. */
  graded: number
}

/**
 * Every sport trained in the window, biggest calorie contributor
 * first, because that ordering answers "what is actually doing the
 * work" without the reader having to compare rows.
 *
 * Sessions arrive through engine/activityLog.ts, which is what stops
 * a GPS run being counted once as a route and again as the cardio
 * entry saveRun writes beside it.
 */
export function sportSummary(data: AppData, today: ISODate, days = 30): ActivityRollup[] {
  const since = addDaysISO(today, -(days - 1))
  const by = new Map<string, ActivityRollup>()

  for (const s of loggedSessions(data, { from: since, to: today })) {
    let row = by.get(s.activityId)
    if (!row) {
      row = {
        activityId: s.activityId,
        label: s.label,
        emoji: s.emoji,
        sessions: 0,
        minutes: 0,
        miles: 0,
        kcal: 0,
        steps: 0,
        mix: { low: 0, standard: 0, high: 0 },
        graded: 0,
      }
      by.set(s.activityId, row)
    }
    row.sessions++
    row.minutes += s.minutes
    row.miles += s.miles ?? 0
    row.kcal += s.kcal ?? 0
    row.steps += s.steps ?? 0
    // Their own answer where they gave one, the calibrated prediction
    // where they did not, and nothing at all where neither is possible.
    const tier = tierOf(data, s)
    if (tier) {
      row.mix[tier]++
      row.graded++
    }
  }

  return [...by.values()]
    .map((r) => ({ ...r, miles: Math.round(r.miles * 100) / 100 }))
    .sort((a, b) => b.kcal - a.kcal || b.minutes - a.minutes)
}

/** How hard this session was for this athlete, best evidence first. */
function tierOf(data: AppData, s: LoggedSession): Intensity | null {
  return perceivedIntensity(data, s.activityId, s.steps, s.minutes, s.felt)
}

/** The window's totals, for the one line above the table. */
export function sportTotals(rows: ActivityRollup[]): {
  sessions: number
  minutes: number
  kcal: number
  steps: number
  miles: number
} {
  return {
    sessions: rows.reduce((s, r) => s + r.sessions, 0),
    minutes: rows.reduce((s, r) => s + r.minutes, 0),
    kcal: rows.reduce((s, r) => s + r.kcal, 0),
    steps: rows.reduce((s, r) => s + r.steps, 0),
    miles: Math.round(rows.reduce((s, r) => s + r.miles, 0) * 100) / 100,
  }
}

/**
 * Is the training getting harder, easier, or neither?
 *
 * Compares the measured tiers of the recent window against the one
 * before it. Null whenever either half has too little measured work
 * to compare, which is most of the time early on and is the honest
 * answer then.
 */
export function intensityTrend(
  data: AppData,
  today: ISODate,
  days = 30,
): { direction: 'up' | 'down' | 'flat'; now: number; before: number } | null {
  const score = (rows: ActivityRollup[]) => {
    const m = rows.reduce(
      (a, r) => ({
        low: a.low + r.mix.low,
        standard: a.standard + r.mix.standard,
        high: a.high + r.mix.high,
      }),
      { low: 0, standard: 0, high: 0 },
    )
    const n = m.low + m.standard + m.high
    // Two sessions is not a trend, it is two sessions.
    if (n < MIN_SESSIONS_TO_COMPARE) return null
    return (m.low * 1 + m.standard * 2 + m.high * 3) / n
  }
  const now = score(sportSummary(data, today, days))
  const before = score(sportSummary(data, addDaysISO(today, -days), days))
  if (now === null || before === null) return null
  const delta = now - before
  return {
    direction: Math.abs(delta) < TREND_DEADBAND ? 'flat' : delta > 0 ? 'up' : 'down',
    now: Math.round(now * 100) / 100,
    before: Math.round(before * 100) / 100,
  }
}

/** Under this there is nothing to compare, only noise. */
export const MIN_SESSIONS_TO_COMPARE = 3

/**
 * How much the average tier must move to count as a direction. A
 * fifth of a tier is about one session in five changing grade, which
 * is the smallest change worth telling somebody about.
 */
export const TREND_DEADBAND = 0.2

export interface DayActivity {
  emoji: string
  label: string
  minutes: number
  steps?: number
  miles?: number
  kcal?: number
  /** Their answer, or the calibrated read of the step rate. */
  tier: Intensity | null
}

/**
 * What was trained on one day, for the Today and Week tabs.
 *
 * Both used to say only that cardio existed: a chip that counted
 * entries and a "played" marker. An hour of tracked ball and a
 * fifteen-minute walk looked identical on both screens, which is
 * exactly the information the tracking was added to provide.
 */
export function dayActivities(data: AppData, date: ISODate): DayActivity[] {
  return loggedSessions(data, { from: date, to: date }).map((s) => ({
    emoji: s.emoji,
    label: s.label,
    minutes: s.minutes,
    ...(s.steps ? { steps: s.steps } : {}),
    ...(s.miles ? { miles: s.miles } : {}),
    ...(s.kcal ? { kcal: s.kcal } : {}),
    tier: tierOf(data, s),
  }))
}

/** Minutes as something a person says out loud. */
export function shortDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

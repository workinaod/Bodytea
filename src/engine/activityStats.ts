import type { AppData, CardioEntry, ISODate, RunLog } from '../types'
import { cardioActivity } from '../plan/cardio'
import { addDaysISO } from './calendar'
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
  /** How the measured sessions graded out. Absent tiers are zero. */
  mix: Record<Intensity, number>
  /** Sessions that carried a measured tier, so a mix bar can scale. */
  measured: number
}

/** A run log read as though it were a cardio entry, so one loop covers both. */
function fromRun(r: RunLog): CardioEntry & { minutes: number } {
  return {
    id: r.id,
    at: r.startedAt,
    activityId: r.activity,
    label: r.activity,
    when: 'solo',
    minutes: Math.round(r.durationSec / 60),
    // A run with no measured distance reports none, rather than a zero
    // that would drag the mileage total down with a phantom entry.
    ...(r.distanceSource !== 'none' && r.distanceMi > 0 ? { miles: r.distanceMi } : {}),
    ...(r.steps ? { steps: r.steps } : {}),
    ...(r.kcalEst ? { kcalEst: r.kcalEst } : {}),
  }
}

/**
 * Every sport trained in the window, biggest calorie contributor
 * first, because that ordering answers "what is actually doing the
 * work" without the reader having to compare rows.
 */
export function sportSummary(data: AppData, today: ISODate, days = 30): ActivityRollup[] {
  const since = addDaysISO(today, -(days - 1))
  const by = new Map<string, ActivityRollup>()

  const add = (e: CardioEntry) => {
    const def = cardioActivity(e.activityId)
    let row = by.get(e.activityId)
    if (!row) {
      row = {
        activityId: e.activityId,
        // A custom activity carries its own name, and the label on the
        // entry is the one the user typed.
        label: e.activityId === 'custom' ? e.label : def.label,
        emoji: def.emoji,
        sessions: 0,
        minutes: 0,
        miles: 0,
        kcal: 0,
        steps: 0,
        mix: { low: 0, standard: 0, high: 0 },
        measured: 0,
      }
      by.set(e.activityId, row)
    }
    row.sessions++
    row.minutes += e.minutes ?? 0
    row.miles += e.miles ?? 0
    row.kcal += e.kcalEst ?? 0
    row.steps += e.steps ?? 0
    if (e.intensity) {
      row.mix[e.intensity]++
      row.measured++
    }
  }

  for (const [date, entries] of Object.entries(data.cardio)) {
    if (date < since || date > today) continue
    for (const e of entries) add(e)
  }
  for (const r of data.runs) {
    if (r.date < since || r.date > today) continue
    add(fromRun(r))
  }

  return [...by.values()]
    .map((r) => ({ ...r, miles: Math.round(r.miles * 100) / 100 }))
    .sort((a, b) => b.kcal - a.kcal || b.minutes - a.minutes)
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

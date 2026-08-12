import type { AppData, CardioEntry, ISODate, RunLog } from '../types'
import { cardioActivity, trackingFor } from '../plan/cardio'
import type { Intensity } from './intensity'

// ============================================================
// Every logged session, exactly once.
//
// The app writes sport to two places, and a GPS run goes in
// BOTH: saveRun stores the route as a RunLog and then calls
// logCardio so the conditioning and played-day machinery sees
// it, because that machinery reads the cardio log. Correct, and
// invisible, right up until something adds the two together.
//
// Which is what happened. The first version of sportSummary read
// both logs and summed them, so every tracked run showed up as
// two sessions with twice the miles and twice the minutes, and
// the monthly total was wrong for anybody who used the GPS
// tracker. Calibration would have counted the same session twice
// as evidence.
//
// So the de-duplication lives here, once, and both engines read
// through it rather than reaching into data.cardio and data.runs
// on their own. A cardio entry written by saveRun carries the
// run's id and is skipped in favour of the RunLog, which is the
// richer record.
//
// LEGACY. Entries written before runId existed carry no link, so
// they fall back to matching a run on the same day, same
// activity, same rounded duration. That is precisely the
// signature saveRun leaves, and two genuinely separate sessions
// of identical length on one day is a duplicate worth collapsing
// anyway.
// ============================================================

export interface LoggedSession {
  activityId: string
  label: string
  emoji: string
  date: ISODate
  minutes: number
  /** Only where distance was honestly recorded. */
  miles?: number
  steps?: number
  kcal?: number
  /** What the athlete said. Ground truth, never a guess. */
  felt?: Intensity
  /** True for the GPS log, which carries a route and splits. */
  gps: boolean
}

/**
 * Is this cardio entry the shadow of a run already in data.runs?
 *
 * `date` is the log date, which is the key the entry is filed under.
 * The first version read it off `e.at` instead, and `at` is
 * `new Date().toISOString()`, which is two different wrong things at
 * once. It is UTC, so anyone west of Greenwich logging in the evening
 * stamps tomorrow and no legacy pair ever matches. And it is the
 * moment of WRITING, so a session logged today for last Tuesday
 * carries today's stamp and can be mistaken for the shadow of a run
 * that happened today, which deletes it from every total.
 */
export function isRunMirror(e: CardioEntry, date: ISODate, runs: RunLog[]): boolean {
  if (e.runId) return runs.some((r) => r.id === e.runId)
  // No link: match the exact signature saveRun leaves behind.
  return runs.some(
    (r) =>
      r.date === date &&
      r.activity === e.activityId &&
      Math.round(r.durationSec / 60) === e.minutes,
  )
}

function fromRun(r: RunLog): LoggedSession {
  const def = cardioActivity(r.activity)
  return {
    activityId: r.activity,
    label: def.label,
    emoji: def.emoji,
    date: r.date,
    minutes: Math.round(r.durationSec / 60),
    // A session the satellites never saw reports no distance, rather
    // than a zero that would drag a mileage total down with it.
    ...(r.distanceSource !== 'none' && r.distanceMi > 0 ? { miles: r.distanceMi } : {}),
    ...(r.steps ? { steps: r.steps } : {}),
    ...(r.kcalEst ? { kcal: r.kcalEst } : {}),
    ...(r.feltIntensity ? { felt: r.feltIntensity } : {}),
    gps: true,
  }
}

function fromEntry(e: CardioEntry, date: ISODate): LoggedSession {
  const def = cardioActivity(e.activityId)
  return {
    activityId: e.activityId,
    // A session somebody named "Padel" says Padel everywhere.
    label: e.activityId === 'custom' ? e.label : def.label,
    emoji: def.emoji,
    date,
    minutes: e.minutes ?? 0,
    ...(e.miles ? { miles: e.miles } : {}),
    ...(e.steps ? { steps: e.steps } : {}),
    ...(e.kcalEst ? { kcal: e.kcalEst } : {}),
    ...(e.feltIntensity ? { felt: e.feltIntensity } : {}),
    gps: false,
  }
}

/**
 * Everything trained, newest first, each session counted once.
 *
 * `from` and `to` are inclusive. A session dated after `to` is a clock
 * that moved backwards rather than work that happened, and is dropped.
 */
export function loggedSessions(
  data: AppData,
  range?: { from?: ISODate; to?: ISODate },
): LoggedSession[] {
  const inRange = (d: ISODate) =>
    (range?.from === undefined || d >= range.from) && (range?.to === undefined || d <= range.to)

  const out: LoggedSession[] = []
  for (const [date, entries] of Object.entries(data.cardio)) {
    if (!inRange(date)) continue
    for (const e of entries) {
      if (isRunMirror(e, date, data.runs)) continue
      out.push(fromEntry(e, date))
    }
  }
  for (const r of data.runs) {
    if (inRange(r.date)) out.push(fromRun(r))
  }
  return out.sort((a, b) => (a.date > b.date ? -1 : a.date < b.date ? 1 : 0))
}

/**
 * Distance that means somebody went somewhere.
 *
 * Court sports now carry a `miles` figure, derived from steps at a
 * shuffle stride, and it is a real and useful number for that sport:
 * an hour of pickleball genuinely covers about a mile of court. What
 * it is NOT is travel, and adding it to a lifetime mileage total puts
 * volleyball footwork in the same column as a hike.
 *
 * Before steps existed, only the four activities that ask for miles
 * on the log form could contribute, which is exactly the set whose
 * distance comes from going somewhere. This restores that scope
 * without hardcoding a list.
 */
export function travelMiles(e: { activityId: string; miles?: number }): number {
  if (!e.miles || e.miles <= 0) return 0
  return trackingFor(e.activityId).distance === 'gps' ? e.miles : 0
}

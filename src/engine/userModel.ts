import type { AppData, ISODate } from '../types'
import { addDaysISO, daysBetween, weekdayOf } from './calendar'
import { groupsOf, type MuscleGroup } from './pickHelp'
import { supplementRecord } from '../plan/supplements'

// ============================================================
// What the app has worked out about this person, and how sure it is.
//
// Every engine downstream of here wants the same four or five numbers,
// and until now each one derived its own from raw logs at the point of
// use. That is how two screens end up disagreeing about how much
// somebody trains, and it is why J8, B1 and five wiring jobs all list
// this as their dependency.
//
// THE SHAPE IS THE POINT. A fact is never a bare number. It carries
// where it came from, how many samples it rests on, how old the newest
// one is, and a confidence DERIVED from those, never typed by hand.
// That is the same rule plan/knowledge.ts applies to research claims,
// for the same reason: a number with no provenance cannot be argued
// with, and this app's whole position is that it explains itself.
//
// AND IT RETURNS NULL A LOT. `null` means "not enough to say", which is
// a real answer and the right one for a new account. calibration.ts
// established that pattern and it holds here: the alternative is an
// engine that speaks confidently in week one on three data points.
// ============================================================

/** Where a fact came from, so a wrong one can be traced. */
export type FactSource = 'measurements' | 'sessions' | 'plan'

export interface UserFact<T> {
  value: T
  from: FactSource
  /** The newest observation behind it. */
  asOf: ISODate
  /** How many observations. Confidence rides on this. */
  samples: number
  /**
   * 0 to 1, COMPUTED. Never assigned.
   *
   * Two things move it and both are honest: how much evidence there is,
   * and how stale the newest piece of it has gone. A fact from four
   * weeks ago is not the same claim it was when it was written.
   */
  confidence: number
  /** Present when something known distorts the reading. */
  caveat?: string
}

/** Full confidence needs this many samples. HOUSE, and stated openly. */
const FULL_EVIDENCE = 8
/** Past this many days with nothing new, a fact is stale. HOUSE. */
const STALE_DAYS = 21

function fact<T>(
  value: T,
  from: FactSource,
  asOf: ISODate,
  samples: number,
  today: ISODate,
  caveat?: string,
): UserFact<T> {
  const evidence = Math.min(1, samples / FULL_EVIDENCE)
  const age = Math.max(0, daysBetween(asOf, today))
  const freshness = age <= STALE_DAYS ? 1 : Math.max(0.3, 1 - (age - STALE_DAYS) / 60)
  return {
    value,
    from,
    asOf,
    samples,
    confidence: Math.round(evidence * freshness * 100) / 100,
    ...(caveat ? { caveat } : {}),
  }
}

/**
 * Bodyweight, smoothed, in lb per week.
 *
 * A scale reading is mostly water. Exponential smoothing is the standard
 * answer and the app already tells athletes to weigh often and judge on
 * the trend, so this is the number behind that advice.
 *
 * THE CREATINE PROBLEM, which is why supplementRecord is imported here.
 * Creatine pulls 1 to 2 kg of water on in the first weeks. An engine
 * reading a trend through that window sees a bulk that is not happening
 * and, if it is autoregulating calories, cuts them. W16 put
 * `confoundsWeightTrend` on the record for exactly this moment. The
 * trend is still returned, because hiding it would be worse, but it
 * carries the caveat and a downstream engine can decline to act on it.
 */
export function weightTrend(data: AppData, today: ISODate): UserFact<number> | null {
  const points = (data.measurements ?? [])
    .filter((m) => typeof m.weightLb === 'number' && daysBetween(m.date, today) >= 0)
    .sort((a, b) => a.date.localeCompare(b.date))
  if (points.length < 3) return null

  const ALPHA = 0.3
  let ewma = points[0].weightLb as number
  for (const p of points.slice(1)) ewma = ALPHA * (p.weightLb as number) + (1 - ALPHA) * ewma

  const first = points[0]
  const last = points[points.length - 1]
  const span = Math.max(1, daysBetween(first.date, last.date))
  const perWeek = Math.round((((last.weightLb as number) - (first.weightLb as number)) / span) * 7 * 100) / 100

  const confounder = (data.plan.mealPlan.supplements ?? []).find(
    (s) => s.source === 'app' && supplementRecord(s.id)?.confoundsWeightTrend,
  )
  return fact(
    perWeek,
    'measurements',
    last.date,
    points.length,
    today,
    confounder
      ? 'Creatine pulls water on in the first weeks, so some of this is not fat or muscle. Judge it again in a month.'
      : undefined,
  )
}

/** Hard sets a week, from what was actually ticked. */
export function workCapacity(data: AppData, today: ISODate, windowDays = 28): UserFact<number> | null {
  let sets = 0
  let sessions = 0
  let newest: ISODate | null = null
  for (let i = 0; i < windowDays; i++) {
    const date = addDaysISO(today, -i)
    const s = data.sessions[date]
    if (!s || s.status === 'skipped') continue
    const done = s.exercises.reduce((n, ex) => n + ex.sets.filter((x) => x.done).length, 0)
    if (done === 0) continue
    sets += done
    sessions++
    if (!newest) newest = date
  }
  if (sessions < 2 || !newest) return null
  return fact(Math.round((sets / windowDays) * 7), 'sessions', newest, sessions, today)
}

/** Days since each muscle group last did real work. */
export function recoveryByRegion(
  data: AppData,
  today: ISODate,
  windowDays = 28,
): UserFact<Partial<Record<MuscleGroup, number>>> | null {
  const last: Partial<Record<MuscleGroup, number>> = {}
  let sessions = 0
  let newest: ISODate | null = null
  for (let i = 0; i < windowDays; i++) {
    const date = addDaysISO(today, -i)
    const s = data.sessions[date]
    if (!s || s.status === 'skipped') continue
    let counted = false
    for (const ex of s.exercises) {
      if (ex.sets.filter((x) => x.done).length === 0) continue
      counted = true
      for (const g of groupsOf(ex.exerciseId)) if (last[g] === undefined) last[g] = i
    }
    if (counted) {
      sessions++
      if (!newest) newest = date
    }
  }
  if (sessions < 2 || !newest) return null
  return fact(last, 'sessions', newest, sessions, today)
}

/**
 * Which days of the week they actually train.
 *
 * Not which days the plan asks for. The gap between those two is the
 * whole input to schedule fit, and reading the plan instead of the log
 * would make it a mirror rather than a measurement.
 */
export function adherenceShape(
  data: AppData,
  today: ISODate,
  windowDays = 28,
): UserFact<number[]> | null {
  const byWeekday = [0, 0, 0, 0, 0, 0, 0]
  let sessions = 0
  let newest: ISODate | null = null
  for (let i = 0; i < windowDays; i++) {
    const date = addDaysISO(today, -i)
    const s = data.sessions[date]
    if (!s || s.status === 'skipped') continue
    if (s.exercises.reduce((n, ex) => n + ex.sets.filter((x) => x.done).length, 0) === 0) continue
    byWeekday[weekdayOf(date)]++
    sessions++
    if (!newest) newest = date
  }
  if (sessions < 3 || !newest) return null
  return fact(byWeekday, 'sessions', newest, sessions, today)
}

export interface UserModel {
  weightTrendLbPerWeek: UserFact<number> | null
  hardSetsPerWeek: UserFact<number> | null
  daysSinceRegion: UserFact<Partial<Record<MuscleGroup, number>>> | null
  trainsOnWeekday: UserFact<number[]> | null
}

/**
 * Everything the app has worked out, in one call.
 *
 * Named readUserModel and not userModel because the dead-export scan
 * matches names anywhere in a file, and every importer of this module
 * writes './userModel' in its import path. A function sharing its
 * module's name can never be reported dead. That is a footgun, not a
 * feature.
 *
 * Deliberately a plain read with no caching. Every number here is
 * cheap, the data is already in memory, and a stale cache in a coaching
 * engine is a wrong answer delivered confidently.
 */
export function readUserModel(data: AppData, today: ISODate): UserModel {
  return {
    weightTrendLbPerWeek: weightTrend(data, today),
    hardSetsPerWeek: workCapacity(data, today),
    daysSinceRegion: recoveryByRegion(data, today),
    trainsOnWeekday: adherenceShape(data, today),
  }
}

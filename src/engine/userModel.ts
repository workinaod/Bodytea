import type { AppData, ISODate } from '../types'
import { addDaysISO, daysBetween, weekdayOf } from './calendar'
import { groupsOf, type MuscleGroup } from './pickHelp'
import { supplementRecord } from '../plan/supplements'
import { smoothBodyFat, tapeIsFresh } from '../plan/bmr'

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
/**
 * Body fat from the tape, smoothed, and only while it still describes
 * this body.
 *
 * This is the input the good calorie model wants. The app has had a full
 * tape flow behind it since day one, with step-by-step instructions and
 * a Navy-formula estimator, and the number it produced went to the
 * progress chart and nowhere near the calorie target.
 *
 * Two things can make a reading stop being true, and both retire it
 * rather than downgrade it: two months of calendar, or a weight change
 * big enough that the composition behind it has moved regardless of the
 * date. A retired tape reading is worse than none, because a stale
 * fat-free mass is confidently wrong where the anthropometric model is
 * only ever roughly right, and the equation cannot tell which it got.
 */
function bodyComposition(data: AppData, today: ISODate): UserFact<number> | null {
  const taped = (data.measurements ?? [])
    .filter((m) => typeof m.bodyFatPct === 'number' && daysBetween(m.date, today) >= 0)
    .sort((a, b) => a.date.localeCompare(b.date))
  if (taped.length === 0) return null

  const recent = taped.slice(-3)
  const pct = smoothBodyFat(recent.map((m) => m.bodyFatPct as number))
  if (pct === null) return null

  const last = taped[taped.length - 1]
  const weighed = (data.measurements ?? [])
    .filter((m) => typeof m.weightLb === 'number' && daysBetween(m.date, today) >= 0)
    .sort((a, b) => a.date.localeCompare(b.date))
  // No current weight means no drift check, not a failed one: an absent
  // reading must never retire a tape the calendar says is still good.
  const now = weighed[weighed.length - 1]?.weightLb
  const fresh = tapeIsFresh({
    ageDays: daysBetween(last.date, today),
    weightAtTapeLb: now === undefined ? undefined : last.weightLb,
    bodyweightLb: now ?? 0,
  })
  if (!fresh) return null

  return fact(pct, 'measurements', last.date, recent.length, today)
}

/**
 * How far back a weight trend looks. R1 asks for a 2 to 3 week trend.
 *
 * This was unbounded, which was worse than imprecise, it was backwards.
 * An athlete thirty pounds down over five months and perfectly FLAT for
 * the last one regressed to 1.29 lb a week of loss, so the step rule read
 * "on track" and offered the one person on a plateau nothing at all. A
 * trend is a statement about recent weeks; it has to be scoped to them.
 */
export const TREND_WINDOW_DAYS = 21

/**
 * Something the app knows is moving the scale that is not energy balance.
 *
 * Its own function because three engines ask the question and only one of
 * them wants a trend. Reading it off `weightTrend(...)?.caveat` meant the
 * guard quietly stopped guarding whenever the window held too few
 * weigh-ins to produce a trend at all.
 */
export function trendIsConfounded(data: AppData): boolean {
  return (data.plan?.mealPlan?.supplements ?? []).some(
    (s) => s.source === 'app' && supplementRecord(s.id)?.confoundsWeightTrend,
  )
}

export function weightTrend(
  data: AppData,
  today: ISODate,
  windowDays = TREND_WINDOW_DAYS,
): UserFact<number> | null {
  const points = (data.measurements ?? [])
    .filter((m) => {
      const age = daysBetween(m.date, today)
      return typeof m.weightLb === 'number' && age >= 0 && age < windowDays
    })
    .sort((a, b) => a.date.localeCompare(b.date))
  if (points.length < 3) return null

  // A least-squares slope through every weigh-in, not the line between
  // the first and the last.
  //
  // This function used to compute an exponentially weighted average and
  // then never read it, returning an endpoint-to-endpoint slope instead.
  // The mistake underneath that is worth naming: an EWMA smooths a LEVEL,
  // and what a coach needs here is a RATE, so the smoothed number had
  // nowhere to go and the endpoints got used. Nothing failed, because two
  // points do describe a direction. It just meant one heavy Sunday at
  // either end of the window swung the answer, and a calorie suggestion
  // now rides on this.
  //
  // A regression uses all of them. A single bad reading in a series of
  // eight moves it by a fraction of what it moves an endpoint.
  const first = points[0]
  const last = points[points.length - 1]
  const xs = points.map((p) => daysBetween(first.date, p.date))
  const ys = points.map((p) => p.weightLb as number)
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length
  const my = ys.reduce((a, b) => a + b, 0) / ys.length
  const varX = xs.reduce((acc, x) => acc + (x - mx) ** 2, 0)
  // Every weigh-in on one day has no slope to find, only a level.
  if (varX === 0) return null
  const cov = xs.reduce((acc, x, i) => acc + (x - mx) * (ys[i] - my), 0)
  const perWeek = Math.round((cov / varX) * 7 * 100) / 100

  const confounder = trendIsConfounded(data)
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
  bodyFatPct: UserFact<number> | null
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
    bodyFatPct: bodyComposition(data, today),
    weightTrendLbPerWeek: weightTrend(data, today),
    hardSetsPerWeek: workCapacity(data, today),
    daysSinceRegion: recoveryByRegion(data, today),
    trainsOnWeekday: adherenceShape(data, today),
  }
}

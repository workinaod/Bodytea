import type { AppData, ISODate } from '../types'
import { bodyweightHeuristicKcal, DEFAULT_SESSIONS_PER_WEEK, maintenanceKcal } from '../plan/bmr'
import { KCAL_PER_LB_TISSUE } from '../plan/sportsNutrition'
import { addDaysISO } from './calendar'
import { nutritionInputsNow } from './nutritionRecheck'
import { kcalFor } from './stats'
import { TREND_WINDOW_DAYS, trendIsConfounded, weightTrend } from './userModel'

// ============================================================
// What this body actually costs to run, as opposed to what the
// equations predict it costs.
//
// Every maintenance number in the app so far is a prediction. Good
// predictions, from validated equations, but predictions: they describe
// the average person with this fat-free mass, not this person. And R1 is
// explicit that the gap widens in exactly the situation people care most
// about. Maintenance falls as a cut goes on, by more than the lost mass
// accounts for, and it stays down. A deficit that worked in week two
// underdelivers by week ten, and the model never notices because the
// model was never watching.
//
// There is an arithmetic answer sitting in the data already. If somebody
// ate roughly I calories a day and their weight moved W pounds over the
// window, then
//
//   measured maintenance = mean intake - (weekly change x 3500 / 7)
//
// Losing a pound a week on 2,000 means running on 2,500.
//
// The catch, and it is the whole reason this file is careful: HALF of
// that equation is trustworthy and half is not. The scale is a scale. The
// food log is a person remembering to write things down, and food logs
// under-report, systematically and by a lot. So the measurement never
// fully replaces the model. It gets a bounded vote, weighted by how many
// days were actually logged, and capped well below one no matter how
// diligent somebody is.
//
// Which way the errors fall matters, and they fall the safe way. An
// under-reported log makes measured maintenance look LOW, which tightens
// the deficit cap and makes the app refuse to cut further. The dangerous
// direction, a log that overstates eating, is the rare one, and the
// sanity band below catches it before it can widen anybody's deficit.
//
// This is the seed of autoregulation, not the whole of it: one number,
// learned, bounded, and disclosed. See engine/calibration.ts for the same
// idea applied to intensity, including why that file refuses to touch
// calories at all.
// ============================================================

/**
 * Both halves of the equation, over the same days.
 *
 * This used to average intake over 28 days and pair it with a weight
 * trend that had no window at all, so the two sides of "intake minus what
 * the scale did" described different stretches of somebody's life. Same
 * window now, and it is the trend's window, because that is the one R1
 * puts a number on.
 */
const WINDOW_DAYS = TREND_WINDOW_DAYS

/** Below this the mean intake is a story about the days somebody logged. */
const MIN_LOGGED_FRACTION = 0.6

/** A trend needs a real stretch of the window behind it, not two days. */
const MIN_TREND_DAYS = 14
const MIN_WEIGH_INS = 3

/**
 * The vote a perfectly logged month earns. Anything less scales down.
 *
 * Never 1, at any amount of logging. A food log is self-reported and
 * self-reporting runs light, so a measured maintenance built on one
 * inherits that bias whole. Half is the most this seed will ever hand it.
 *
 * Written as a fraction of the window rather than a separate clamp,
 * because the first version had a ramp and a cap that could not both be
 * live: the minimum logging threshold already put every valid case at the
 * cap, so the ramp never did anything. One expression, both jobs.
 */
export const MAX_MEASUREMENT_TRUST = 0.5

/**
 * How far measured may sit from modeled before the log is the problem.
 *
 * Bodies do not run 40 percent cheaper than two validated equations say.
 * A gap that size means the log is describing somebody else's week.
 */
const SANITY_BAND = 0.4

export interface LearnedMaintenance {
  /** What the equations predict. */
  modeledKcal: number
  /** What the food log and the scale say, before any blending. */
  measuredKcal: number
  /** The two combined, which is the number to use. */
  kcal: number
  /** 0 to 1, how much of the gap the measurement was allowed to close. */
  trust: number
  daysLogged: number
  meanIntakeKcal: number
  trendLbPerWeek: number
}

/**
 * Maintenance with the athlete's own evidence folded in, or nothing.
 *
 * Null whenever the evidence would not support the claim: too few logged
 * days, too little weight history, a confounded trend, or an intake that
 * disagrees with two validated equations by more than any real body does.
 */
export function learnedMaintenance(data: AppData, today: ISODate): LearnedMaintenance | null {
  const now = nutritionInputsNow(data, today)
  if (now.bodyweightLb === null) return null

  const trend = weightTrend(data, today)
  if (trendIsConfounded(data)) return null
  if (!trend || trend.samples < MIN_WEIGH_INS) return null

  // Span measured INSIDE the window, not across all history: a weigh-in
  // last spring does not make this fortnight three weeks long.
  const weighed = (data.measurements ?? []).filter(
    (m) => typeof m.weightLb === 'number' && m.date > addDaysISO(today, -WINDOW_DAYS) && m.date <= today,
  )
  if (weighed.length < MIN_WEIGH_INS) return null
  const spanDays =
    (Date.parse(weighed[weighed.length - 1].date) - Date.parse(weighed[0].date)) / 86_400_000
  if (spanDays < MIN_TREND_DAYS) return null

  let logged = 0
  let total = 0
  for (let i = 0; i < WINDOW_DAYS; i++) {
    const kcal = kcalFor(data, addDaysISO(today, -i))
    if (kcal <= 0) continue
    logged++
    total += kcal
  }
  if (logged / WINDOW_DAYS < MIN_LOGGED_FRACTION) return null

  const meanIntakeKcal = Math.round(total / logged)
  const measuredKcal = Math.round(meanIntakeKcal - (trend.value * KCAL_PER_LB_TISSUE) / 7)

  const modeledKcal = maintenanceKcal(
    {
      bodyweightLb: now.bodyweightLb,
      sex: now.sex,
      heightIn: now.heightIn,
      ageYears: now.ageYears,
      bodyFatPct: now.bodyFatPct,
    },
    { sessionsPerWeek: now.sessionsPerWeek ?? DEFAULT_SESSIONS_PER_WEEK },
    bodyweightHeuristicKcal(now.bodyweightLb, now.sex, now.heightIn),
  ).kcal

  if (Math.abs(measuredKcal - modeledKcal) / modeledKcal > SANITY_BAND) return null

  const trust = MAX_MEASUREMENT_TRUST * (logged / WINDOW_DAYS)
  return {
    modeledKcal,
    measuredKcal,
    kcal: Math.round(modeledKcal + (measuredKcal - modeledKcal) * trust),
    trust: Math.round(trust * 100) / 100,
    daysLogged: logged,
    meanIntakeKcal,
    trendLbPerWeek: trend.value,
  }
}

/**
 * A gap smaller than this is the two methods agreeing. HOUSE, and it is
 * one rounding step of the numbers everything else here is printed in.
 */
export const WORTH_SAYING_KCAL = 50

/**
 * What it found, said plainly, or nothing.
 *
 * Null when the model and the measurement agree, which is the common
 * case and not news. The learned number still feeds the deficit cap
 * either way; this is only about whether it is worth interrupting
 * somebody to mention it.
 */
export function learnedCopyFor(m: LearnedMaintenance): string | null {
  const gap = Math.abs(m.measuredKcal - m.modeledKcal)
  if (gap < WORTH_SAYING_KCAL) return null
  const dir = m.measuredKcal < m.modeledKcal ? 'less' : 'more'
  return (
    `The equations put your maintenance near ${m.modeledKcal}. Your own last four weeks, ` +
    `${m.daysLogged} days of food against the scale, say about ${gap} ${dir}. ` +
    `Working number is ${m.kcal}, leaning on the estimate more than the log, because food logs run light.`
  )
}

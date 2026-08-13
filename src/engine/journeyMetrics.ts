import type { AppData, ISODate } from '../types'
import type { StageMetric } from '../journeyTypes'
import {
  MAX_ETA_WEEKS,
  MIN_OBSERVED_DAYS,
  MIN_OBSERVED_POINTS,
  NOISE_FLOOR,
  OBSERVED_CAP_MULTIPLE,
  STAGE_DECAY,
  type StageSpec,
} from '../plan/milestones'
import { addDaysISO, daysBetween } from './calendar'
import { currentStreak, latestBodyweightLb, liftSeries, totalSessions } from './stats'

// ============================================================
// Reading where somebody is, and what that says about when
// they will get where they are going.
//
// Split from journey.ts, which assembles the ladder: this half
// only answers three questions, and each is a place the feature
// could quietly start lying.
//
//   what is the number now      readMetric
//   how fast is it moving       observedRatePerWeek
//   is that enough to promise   estimateWeeks
//
// estimateWeeks refuses more often than it answers, and the
// refusals are the point. A date printed here is one the
// athlete will remember in eight weeks.
// ============================================================

/** Where the estimate came from, shown to the athlete in those words. */
export type EtaBasis = 'observed' | 'modelled' | 'none'

// ---------------- Reading where they are now ----------------

/**
 * The current value of a metric, or null when the app genuinely does
 * not know.
 *
 * Exhaustive over StageMetric on purpose: the switch has no default, so
 * adding a variant to the union without teaching this function to read
 * it fails the build. That is what makes "no stage the app cannot
 * verify" a property of the type system instead of a promise in a
 * comment.
 */
export function readMetric(data: AppData, m: StageMetric, exerciseId?: string, today?: ISODate): number | null {
  switch (m) {
    case 'weightLb':
      return latestBodyweightLb(data)
    case 'waistIn':
      return lastMeasured(data, 'waistIn')
    case 'bodyFatPct':
      return lastMeasured(data, 'bodyFatPct')
    case 'vertIn':
      return lastMeasured(data, 'vertIn')
    case 'topSetLb': {
      // The heaviest set actually completed, NOT the e1RM.
      //
      // Epley capped at 12 reps carries error wider than the 5 lb
      // increment being scored, so an e1RM-scored "bench 185" can light
      // up on a lucky set of twelve at 135. e1RM is the right tool for
      // a trend line and the wrong one for "did you do the thing".
      if (!exerciseId) return null
      const s = liftSeries(data, exerciseId)
      return s.length ? Math.max(...s.map((p) => p.weightLb)) : null
    }
    case 'repMax': {
      if (!exerciseId) return null
      const s = liftSeries(data, exerciseId)
      return s.length ? Math.max(...s.map((p) => p.reps)) : null
    }
    case 'longRunMi': {
      const runs = data.runs ?? []
      return runs.length ? Math.max(...runs.map((r) => r.distanceMi ?? 0)) : null
    }
    case 'weeklyMi': {
      const runs = data.runs ?? []
      if (!runs.length) return null
      const byWeek = new Map<string, number>()
      for (const r of runs) byWeek.set(r.date.slice(0, 7) + r.date.slice(8, 10), 0)
      let best = 0
      for (const r of runs) {
        const k = r.date
        const wk = k.slice(0, 8)
        const cur = (byWeek.get(wk) ?? 0) + (r.distanceMi ?? 0)
        byWeek.set(wk, cur)
        best = Math.max(best, cur)
      }
      return best
    }
    case 'sessions':
      return totalSessions(data)
    case 'streakDays':
      // The app's day, not the wall clock. currentStreak defaults to
      // todayISO() and every other date in this engine comes from
      // useToday(), so leaving it to default made the one metric that
      // can fall to zero read a different day from the rest of the path
      // — and made it untestable, which is how it was found.
      return currentStreak(data, today)
  }
}

export function lastMeasured(data: AppData, key: 'waistIn' | 'bodyFatPct' | 'vertIn'): number | null {
  for (let i = data.measurements.length - 1; i >= 0; i--) {
    const v = data.measurements[i][key]
    if (typeof v === 'number') return v
  }
  return null
}

/** Chronological (date, value) for a measurement metric, for the observed rate. */
export function measuredSeries(data: AppData, key: 'weightLb' | 'waistIn' | 'bodyFatPct' | 'vertIn') {
  return data.measurements
    .filter((m) => typeof m[key] === 'number')
    .map((m) => ({ date: m.date, value: m[key] as number }))
    .sort((a, b) => (a.date < b.date ? -1 : 1))
}

// ---------------- The observed rate ----------------

/**
 * What this athlete is ACTUALLY doing per week, or null when the data
 * cannot carry a slope.
 *
 * Least squares over the recent window. It returns null rather than a
 * small number when the series is short, flat or going the wrong way,
 * because "your squat is going up 0.3 lb a week, see you in 2029" is
 * arithmetic pretending to be coaching. A stalled lift should say it
 * has stalled.
 */
export function observedRatePerWeek(
  points: { date: ISODate; value: number }[],
  today: ISODate,
  opts: { skipFirstDays?: number } = {},
): number | null {
  let pts = points
  if (opts.skipFirstDays && pts.length) {
    // The first stretch of a new deficit is glycogen and the water
    // bound to it, several pounds that were never fat. Regressing
    // through them projects a rate nobody can hold.
    const from = addDaysISO(pts[0].date, opts.skipFirstDays)
    const trimmed = pts.filter((p) => p.date >= from)
    if (trimmed.length >= MIN_OBSERVED_POINTS) pts = trimmed
  }
  if (pts.length < MIN_OBSERVED_POINTS) return null
  const span = daysBetween(pts[0].date, pts[pts.length - 1].date)
  if (span < MIN_OBSERVED_DAYS) return null

  const xs = pts.map((p) => daysBetween(pts[0].date, p.date) / 7)
  const ys = pts.map((p) => p.value)
  const n = xs.length
  const mx = xs.reduce((a, b) => a + b, 0) / n
  const my = ys.reduce((a, b) => a + b, 0) / n
  let num = 0
  let den = 0
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my)
    den += (xs[i] - mx) ** 2
  }
  if (den === 0) return null
  void today
  return num / den
}

// ---------------- Turning a rate into a date ----------------

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function etaLabelFor(today: ISODate, weeks: number): string {
  const target = addDaysISO(today, Math.round(weeks * 7))
  const [y, m] = target.split('-')
  const month = MONTHS[Number(m) - 1]
  return today.slice(0, 4) === y ? month : `${month} ${y.slice(2)}`
}

interface EtaInput {
  gap: number
  modelledPerWeek: number
  observedPerWeek: number | null
  metric: StageMetric
  /** Position in this track's remaining ladder, 0 = the next one. */
  index: number
}

/**
 * The estimate, and every reason to refuse one.
 *
 * The refusals matter more than the arithmetic. A number here is a
 * promise the athlete will remember in eight weeks, so the bar for
 * printing one is high and the fallbacks say what is missing rather
 * than shrugging.
 */
export function estimateWeeks(a: EtaInput): { weeks?: number; basis: EtaBasis; note?: string } {
  if (a.gap <= 0) return { basis: 'none' }

  // Later stages are further out than a straight line says. A novice's
  // hot first block, drawn forward, goes straight through the plateau
  // every single one of them hits.
  const decay = STAGE_DECAY ** a.index
  const modelled = a.modelledPerWeek * decay

  const floor = NOISE_FLOOR[a.metric]
  if (floor !== undefined && modelled < floor) {
    return {
      basis: 'none',
      note: `This is now moving slower than it can be measured. Scored on the work, not the number.`,
    }
  }

  let rate = modelled
  let basis: EtaBasis = 'modelled'
  if (a.observedPerWeek !== null && a.observedPerWeek > 0) {
    // Their own rate wins, but a hot month does not get to promise a
    // hot year — the first weeks of anything regress.
    rate = Math.min(a.observedPerWeek, modelled * OBSERVED_CAP_MULTIPLE)
    basis = 'observed'
  } else if (a.observedPerWeek !== null && a.observedPerWeek <= 0) {
    return {
      basis: 'none',
      note: 'This has not moved lately, so there is no honest date to give. It comes back the moment it does.',
    }
  }

  if (rate <= 0) return { basis: 'none' }
  const weeks = a.gap / rate
  if (weeks > MAX_ETA_WEEKS) {
    return { basis: 'none', note: 'Further out than two years, which is past the point an estimate means anything.' }
  }
  return { weeks: Math.max(1, Math.round(weeks)), basis }
}

// ---------------- Did they reach it ----------------

const MEASUREMENT_METRICS: StageMetric[] = ['weightLb', 'waistIn', 'bodyFatPct']

/**
 * Whether a stage counts as reached.
 *
 * Two classes, deliberately scored differently:
 *
 *   PERFORMANCES — a squat, a vertical, a first half marathon — count
 *   on one verified effort. You did it or you did not, and making
 *   somebody do it twice to see it on the path would be absurd.
 *
 *   MEASUREMENTS — the scale, the tape — count on a trailing mean, or
 *   on two readings four days apart that are both past. A scale swings
 *   two pounds on salt and sleep, and a stage that lights up on a dry
 *   morning and stays lit is a lie the athlete catches themselves.
 */
export function reachedNow(data: AppData, spec: StageSpec, current: number | null, descending: boolean): boolean {
  if (current === null) return false
  const past = (v: number) => (descending ? v <= spec.target : v >= spec.target)
  if (!MEASUREMENT_METRICS.includes(spec.metric)) return past(current)

  const key = spec.metric as 'weightLb' | 'waistIn' | 'bodyFatPct'
  const series = measuredSeries(data, key)
  if (series.length === 0) return false
  const last = series[series.length - 1]
  const window = series.filter((p) => daysBetween(p.date, last.date) <= 7)
  // A "trailing mean" of one reading is just the reading, which defeats
  // the entire point of smoothing it: a scale that reads 199.5 once on a
  // dry Tuesday would light the 200 stage and leave it lit. Two readings
  // minimum, or fall through to the two-confirmations rule below.
  const mean = window.length >= 2 ? window.reduce((a, b) => a + b.value, 0) / window.length : null
  if (mean !== null && past(mean)) return true
  const confirms = series.filter((p) => past(p.value))
  if (confirms.length >= 2) {
    return daysBetween(confirms[0].date, confirms[confirms.length - 1].date) >= 4
  }
  return false
}

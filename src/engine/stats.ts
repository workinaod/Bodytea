import type { AppData, ISODate, SessionLog } from '../types'
import { addDaysISO, daysBetween, todayISO } from './calendar'
import { resolveDay } from './resolveDay'
import { weightTrend } from './userModel'
import { getExercise } from '../plan/exercises'
import { FOODS } from '../plan/foods'

// ============================================================
// Derived numbers: streaks, e1RM trends, PRs, adherence,
// protein stats, and the PDF's 3-4 week kcal check-in rule.
// ============================================================

/**
 * Epley is fitted to heavy, low-rep sets and drifts badly outside them.
 * Past about a dozen reps a set stops being a strength test and becomes
 * a conditioning one, and the formula keeps extrapolating anyway: 100 lb
 * for 20 reps scored 167, which beat a genuine heavy 140 × 5 at 163.
 * That inversion crowned the light set a PR, drew it on the strength
 * chart, and fed it to the board's "strength climbing" check.
 *
 * So reps are capped where the formula's evidence runs out. A 20-rep set
 * still counts, it just cannot claim to predict a max it never tested.
 */
export const E1RM_MAX_REPS = 12

/** Epley estimated 1RM. */
export function e1RM(weightLb: number, reps: number): number {
  // Epley returns 1.033 × weight at a single rep. A max single is not an
  // estimate of itself, and rounding it up invented 7 lb on a 200 lb pull.
  if (reps <= 1) return Math.round(weightLb)
  return Math.round(weightLb * (1 + Math.min(reps, E1RM_MAX_REPS) / 30))
}

/** Best (heaviest-estimated) set of an exercise within one session. */
function bestSetOf(session: SessionLog, exerciseId: string): { weightLb: number; reps: number } | null {
  const log = session.exercises.find((e) => e.exerciseId === exerciseId)
  if (!log) return null
  let best: { weightLb: number; reps: number } | null = null
  for (const s of log.sets) {
    // What was actually done outranks what was asked for. `reps` is the
    // prescription copied in when the session was built, so on a set that
    // came up short it overstates the work and the estimate with it.
    const reps = s.achieved ?? s.reps
    if (!s.done || s.weightLb === undefined || !reps) continue
    if (!best || e1RM(s.weightLb, reps) > e1RM(best.weightLb, best.reps)) {
      best = { weightLb: s.weightLb, reps }
    }
  }
  return best
}

export interface LiftPoint {
  date: ISODate
  e1rm: number
  weightLb: number
  reps: number
}

/** Chronological e1RM series for a lift. */
export function liftSeries(data: AppData, exerciseId: string): LiftPoint[] {
  return Object.values(data.sessions)
    .filter((s) => s.status !== 'skipped')
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .flatMap((s) => {
      const best = bestSetOf(s, exerciseId)
      return best ? [{ date: s.date, e1rm: e1RM(best.weightLb, best.reps), ...best }] : []
    })
}

/** Best pull-up (or other bodyweight max) rep count series. */
export function repMaxSeries(data: AppData, exerciseId: string): { date: ISODate; reps: number }[] {
  return Object.values(data.sessions)
    .filter((s) => s.status !== 'skipped')
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .flatMap((s) => {
      const log = s.exercises.find((e) => e.exerciseId === exerciseId)
      if (!log) return []
      // What was done, not what was asked for. `reps` is the prescription
      // copied in when the session was built, so a bodyweight athlete who
      // came up short was credited the full ask, and the series could
      // never show the struggle or the recovery from it.
      const best = Math.max(0, ...log.sets.filter((x) => x.done).map((x) => x.achieved ?? x.reps ?? 0))
      return best > 0 ? [{ date: s.date, reps: best }] : []
    })
}

export interface PR {
  exerciseId: string
  name: string
  kind: 'e1rm' | 'reps'
  value: number
  prev: number | null
}

/** PRs set by this session vs all prior history. */
export function detectPRs(data: AppData, session: SessionLog): PR[] {
  const prs: PR[] = []
  for (const log of session.exercises) {
    const def = getExercise(log.exerciseId)
    if (def.kind !== 'lift' && def.kind !== 'core') continue
    const best = bestSetOf(session, log.exerciseId)
    if (best) {
      const history = liftSeries(data, log.exerciseId).filter((p) => p.date < session.date)
      const prevBest = history.length ? Math.max(...history.map((p) => p.e1rm)) : null
      const now = e1RM(best.weightLb, best.reps)
      if (prevBest === null ? now > 0 : now > prevBest) {
        if (prevBest !== null) prs.push({ exerciseId: log.exerciseId, name: def.name, kind: 'e1rm', value: now, prev: prevBest })
      }
    } else {
      // bodyweight rep PRs (pull-ups etc.), on the reps actually done
      const reps = Math.max(0, ...log.sets.filter((s) => s.done).map((s) => s.achieved ?? s.reps ?? 0))
      if (reps > 0) {
        const history = repMaxSeries(data, log.exerciseId).filter((p) => p.date < session.date)
        const prevBest = history.length ? Math.max(...history.map((p) => p.reps)) : null
        if (prevBest !== null && reps > prevBest) {
          prs.push({ exerciseId: log.exerciseId, name: def.name, kind: 'reps', value: reps, prev: prevBest })
        }
      }
    }
  }
  return prs
}

/** Tonnage (lb lifted) for a session. */
export function sessionTonnage(session: SessionLog): number {
  let total = 0
  for (const ex of session.exercises) {
    for (const s of ex.sets) {
      // What was lifted, not what was asked for. `reps` is the prescription
      // copied in when the session was built, so on a day somebody came up
      // short this counted the reps they did not do and then congratulated
      // them on the total. A number the athlete knows is generous is worse
      // than no number: it is the moment they stop believing the other ones.
      const reps = s.achieved ?? s.reps
      if (s.done && s.weightLb && reps) total += s.weightLb * reps
    }
  }
  return Math.round(total)
}

export function sessionSetsDone(session: SessionLog): { done: number; total: number } {
  let done = 0
  let total = 0
  for (const ex of session.exercises) {
    for (const s of ex.sets) {
      total++
      if (s.done) done++
    }
  }
  return { done, total }
}

// ---------- Session grades ----------
// "Partial" says nothing. Grades say how the day actually went, measured
// against the session as it was started (post-intensity): extremely light
// (0-1 exercises touched / under a quarter), light, half, full, and
// overtime, more work logged than the plan asked for.

export type SessionGrade = 'extremely-light' | 'light' | 'half' | 'full' | 'overtime'

export const GRADE_LABEL: Record<SessionGrade, string> = {
  'extremely-light': 'Extremely light',
  light: 'Light',
  half: 'Half session',
  full: 'Full session',
  overtime: 'Overtime',
}

/** Upper bound of a rep target: "8-12" → 12, "10" → 10, "30 sec" → 30. */
function targetUpper(targetReps: string): number | null {
  const m = /(\d+)(?:\s*[-–]\s*(\d+))?/.exec(targetReps)
  if (!m) return null
  return Number(m[2] ?? m[1])
}

export function sessionGrade(session: SessionLog): SessionGrade {
  const considered = session.exercises.filter(
    (e, i) => !e.skipped && (session.trimmedFromIndex === undefined || i < session.trimmedFromIndex),
  )
  const sets = considered.flatMap((e) => e.sets)
  const total = sets.length
  const done = sets.filter((s) => s.done).length
  if (total === 0 || done === 0) return 'extremely-light'

  if (done === total) {
    const timed = (t: string) => /sec|min|hold/.test(t)
    const over = sets.some((s) => {
      const upper = targetUpper(s.targetReps)
      if (upper === null) return false
      const actual = timed(s.targetReps) ? s.seconds : s.reps
      return actual !== undefined && actual > upper
    })
    return over ? 'overtime' : 'full'
  }

  const touched = considered.filter((e) => e.sets.some((s) => s.done)).length
  const f = done / total
  if (f < 0.25 || (touched <= 1 && considered.length > 2)) return 'extremely-light'
  if (f < 0.5) return 'light'
  return 'half'
}

/**
 * Current streak: consecutive scheduled training days (per the resolved
 * plan) with a non-skipped log, counting back from today. Rest days pass
 * through; today passes through if not yet logged.
 */
export function currentStreak(data: AppData, today: ISODate = todayISO()): number {
  let streak = 0
  let date = today
  for (let i = 0; i < 400; i++) {
    const resolved = resolveDay(date, data)
    const scheduled = resolved.kind === 'session' || resolved.kind === 'mobility' || resolved.kind === 'cardio-backup'
    if (scheduled) {
      const log = data.sessions[date]
      if (log && log.status !== 'skipped') {
        streak++
      } else if (date === today) {
        // today not logged yet, doesn't break the streak
      } else if (daysBetween(data.settings.phaseStartDate, date) < 0) {
        break
      } else {
        break
      }
    }
    date = addDaysISO(date, -1)
    if (daysBetween(data.settings.phaseStartDate, date) < 0) break
  }
  return streak
}

/** Count of completed (non-skipped) sessions, all time. */
export function totalSessions(data: AppData): number {
  return Object.values(data.sessions).filter((s) => s.status !== 'skipped').length
}

export type DayAdherence = 'done' | 'partial' | 'skipped' | 'missed' | 'rest' | 'future'

/** Adherence per day for the calendar heatmap (last `days` days). */
export function adherenceMap(
  data: AppData,
  days: number,
  today: ISODate = todayISO(),
): { date: ISODate; state: DayAdherence }[] {
  const out: { date: ISODate; state: DayAdherence }[] = []
  for (let i = days - 1; i >= 0; i--) {
    const date = addDaysISO(today, -i)
    if (daysBetween(data.settings.phaseStartDate, date) < 0) {
      out.push({ date, state: 'rest' })
      continue
    }
    const resolved = resolveDay(date, data)
    const scheduled = resolved.kind === 'session' || resolved.kind === 'mobility' || resolved.kind === 'cardio-backup'
    if (!scheduled) {
      out.push({ date, state: 'rest' })
      continue
    }
    const log = data.sessions[date]
    const excused = data.excuses.some((e) => e.date === date || (e.scope === 'week' && e.date <= date && daysBetween(e.date, date) < 7))
    if (log) {
      if (log.status === 'skipped') out.push({ date, state: 'skipped' })
      else if (log.status === 'partial' || log.status === 'downgraded-completed') out.push({ date, state: 'partial' })
      else out.push({ date, state: 'done' })
    } else if (date === today) {
      out.push({ date, state: 'future' })
    } else {
      out.push({ date, state: excused ? 'skipped' : 'missed' })
    }
  }
  return out
}

// ---------- Protein / nutrition stats ----------

export function proteinFor(data: AppData, date: ISODate): number {
  const day = data.meals[date]
  if (!day) return 0
  return Math.round(day.entries.reduce((s, e) => s + e.proteinG * e.servings, 0))
}

/**
 * The most recent bodyweight the athlete has actually recorded.
 *
 * Nutrition targets are grams per kilogram, so they need this, and there
 * is no `settings.bodyweightLb`: weight lives in the check-in history
 * where it belongs, because it moves.
 */
export function latestBodyweightLb(data: AppData): number | null {
  const withWeight = data.measurements
    .filter((m) => m.weightLb !== undefined)
    .sort((a, b) => (a.date > b.date ? -1 : 1))
  return withWeight[0]?.weightLb ?? null
}

export interface DayMacros {
  proteinG: number
  carbsG: number
  fatG: number
  kcal: number
  /** Calories the carb/fat numbers could actually account for. */
  coveredKcal: number
  /** Fraction of the day's calories with carb and fat data behind them. */
  coverage: number
}

/**
 * The day's macros, and how much of the day they actually describe.
 *
 * Coverage is the honest part. The app logged protein and calories only
 * for its whole life, so every meal already on a device has no carb or
 * fat behind it, and a custom entry never will. Backfilling from foodId
 * recovers the food chips; the rest is unknown, and drawing a confident
 * carb ring over a day the app only half understands is exactly the kind
 * of quietly-wrong number the rest of this codebase exists to avoid.
 *
 * The UI decides what to do with a partial day. This just refuses to
 * pretend.
 */
export function macrosFor(data: AppData, date: ISODate): DayMacros {
  const day = data.meals[date]
  const out: DayMacros = { proteinG: 0, carbsG: 0, fatG: 0, kcal: 0, coveredKcal: 0, coverage: 0 }
  if (!day) return out
  for (const e of day.entries) {
    const n = e.servings
    out.proteinG += e.proteinG * n
    out.kcal += e.kcal * n
    const food = e.foodId ? FOODS.find((f) => f.id === e.foodId) : undefined
    const carbs = e.carbsG ?? food?.carbsG
    const fat = e.fatG ?? food?.fatG
    if (carbs !== undefined && fat !== undefined) {
      out.carbsG += carbs * n
      out.fatG += fat * n
      out.coveredKcal += e.kcal * n
    }
  }
  out.proteinG = Math.round(out.proteinG)
  out.carbsG = Math.round(out.carbsG)
  out.fatG = Math.round(out.fatG)
  out.kcal = Math.round(out.kcal)
  out.coveredKcal = Math.round(out.coveredKcal)
  out.coverage = out.kcal > 0 ? out.coveredKcal / out.kcal : 0
  return out
}

export function kcalFor(data: AppData, date: ISODate): number {
  const day = data.meals[date]
  if (!day) return 0
  return Math.round(day.entries.reduce((s, e) => s + e.kcal * e.servings, 0))
}

/** Consecutive days (ending yesterday or today) at/above the protein target. */
export function proteinStreak(data: AppData, today: ISODate = todayISO()): number {
  const target = data.settings.proteinTargetG
  let streak = 0
  let date = today
  // today only counts if already at target
  if (proteinFor(data, date) < target) date = addDaysISO(date, -1)
  for (let i = 0; i < 400; i++) {
    if (proteinFor(data, date) >= target) {
      streak++
      date = addDaysISO(date, -1)
    } else break
  }
  return streak
}

// ---------- The 3-4 week check-in rule ----------

export interface KcalBumpSuggestion {
  weightChangeLb: number
  strengthGainPct: number
}

/**
 * PDF rule: if after 3-4 weeks the scale isn't creeping up while strength
 * climbs, add 150-200 kcal to training days. Fires only when the bonus is
 * still 0 and there's enough data.
 */
export function kcalBumpSuggestion(data: AppData): KcalBumpSuggestion | null {
  if (data.settings.trainingDayKcalBonus !== 0) return null
  const ms = data.measurements.filter((m) => m.weightLb !== undefined)
  if (ms.length < 3) return null
  const last = ms[ms.length - 1]
  const threeWeeksAgo = ms.filter((m) => daysBetween(m.date, last.date) >= 21)
  if (!threeWeeksAgo.length) return null
  const baseline = threeWeeksAgo[threeWeeksAgo.length - 1]
  const weightChange = (last.weightLb ?? 0) - (baseline.weightLb ?? 0)
  if (weightChange >= 1) return null // scale is creeping up, rule not triggered

  // This whole rule rests on "the scale is not moving", so it is only as
  // good as the scale. Creatine pulls 1 to 2 kg of water on in the first
  // weeks and lets it go again on the way out, and neither has anything
  // to do with energy balance. The dangerous direction is COMING OFF it:
  // the drop reads as under-eating and this would tell somebody to add
  // calories they do not need.
  //
  // So when the user model says the trend is confounded, the answer is
  // no answer. It re-evaluates on its own once the water settles.
  if (weightTrend(data, last.date)?.caveat) return null

  // strength climbing? any tracked lift e1RM +3% over the same window
  let bestGain = 0
  for (const { exerciseId } of data.plan.trackedLifts) {
    const series = liftSeries(data, exerciseId)
    const recent = series.filter((p) => p.date > baseline.date)
    const before = series.filter((p) => p.date <= baseline.date)
    if (!recent.length || !before.length) continue
    const prevMax = Math.max(...before.map((p) => p.e1rm))
    const nowMax = Math.max(...recent.map((p) => p.e1rm))
    if (prevMax > 0) bestGain = Math.max(bestGain, (nowMax - prevMax) / prevMax)
  }
  if (bestGain >= 0.03) {
    return { weightChangeLb: Math.round(weightChange * 10) / 10, strengthGainPct: Math.round(bestGain * 100) }
  }
  return null
}

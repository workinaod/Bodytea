import type { AppData, ISODate, Measurement } from '../types'
import { addDaysISO, daysBetween } from './calendar'
import { getExercise } from '../plan/exercises'
import { cohortStats, weeksTraining, type CohortStat } from './cohort'
import { lastClosed, PERIOD_KINDS, type PeriodBounds, type PeriodKind } from './periods'
import { resolveDay } from './resolveDay'
import { detectPRs, liftSeries, proteinFor, sessionSetsDone, sessionTonnage } from './stats'
import type { ReviewDelta } from './review'

// ============================================================
// The period review: week, month, quarter, year.
//
// One shape for all four, because the athlete's question is the
// same at every scale ("did that add up to anything?") and four
// near-identical review engines would drift apart within a
// month. What changes with the scale is what is worth SAYING:
// a week asks for photos, a quarter and a year put the first
// photo next to the latest one.
//
// Everything here is derived. Nothing is stored but the fact
// that a review has been seen, so a review of March computed in
// December says exactly what it would have said in April.
// ============================================================

export interface PeriodHighlight {
  /** Leading glyph for the card. Emoji, never an icon font. */
  icon: string
  label: string
  detail: string
}

export interface PeriodGoal {
  label: string
  detail: string
}

/** A before/after pair for one camera angle, across the whole period. */
export interface PhotoPair {
  angle: 'front' | 'side' | 'back'
  beforeId: string
  afterId: string
  beforeDate: ISODate
  afterDate: ISODate
  weeksApart: number
}

export interface PeriodReview {
  bounds: PeriodBounds
  sessionsDone: number
  sessionsScheduled: number
  adherencePct: number | null
  setsDone: number
  tonnageLb: number
  prCount: number
  sessionsPerWeek: number
  proteinPct: number | null
  progression: ReviewDelta[]
  strength: { label: string; beforeE1rm: number; afterE1rm: number; pct: number }[]
  highlights: PeriodHighlight[]
  goals: PeriodGoal[]
  cohort: CohortStat[]
  /** Quarter and year only: the arc from the first photo to the latest. */
  photos: PhotoPair[]
  /** Week only: the standing ask for front and side shots. */
  askForPhotos: boolean
  /** Angles this athlete has never captured. Drives the ask's wording. */
  missingAngles: ('front' | 'side')[]
  /** Enough happened to be worth showing. */
  worthShowing: boolean
}

const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

const ANGLES: ('front' | 'side' | 'back')[] = ['front', 'side', 'back']

/**
 * Photo arc for a period.
 *
 * A quarter or a year is asked to show the WHOLE distance travelled, so
 * the "before" is the earliest photo the athlete has ever taken, not the
 * earliest one inside the window. Someone who started in January and is
 * reading their Q3 review wants January next to September; three months
 * of nearly identical September photos is not a before and after.
 */
function photoPairs(measurements: Measurement[], to: ISODate): PhotoPair[] {
  const upTo = measurements.filter((m) => m.date <= to)
  const pairs: PhotoPair[] = []
  for (const angle of ANGLES) {
    const withAngle = upTo.filter((m) => m.photoIds[angle])
    if (withAngle.length < 2) continue
    const first = withAngle[0]
    const last = withAngle[withAngle.length - 1]
    const beforeId = first.photoIds[angle]!
    const afterId = last.photoIds[angle]!
    if (beforeId === afterId) continue
    pairs.push({
      angle,
      beforeId,
      afterId,
      beforeDate: first.date,
      afterDate: last.date,
      weeksApart: Math.max(1, Math.round(daysBetween(first.date, last.date) / 7)),
    })
  }
  return pairs
}

/** Angles with no photo on record at all, of the two a check-in insists on. */
function missingAnglesFor(measurements: Measurement[]): ('front' | 'side')[] {
  const out: ('front' | 'side')[] = []
  for (const angle of ['front', 'side'] as const) {
    if (!measurements.some((m) => m.photoIds[angle])) out.push(angle)
  }
  return out
}

export function periodReview(data: AppData, bounds: PeriodBounds): PeriodReview {
  const { from, to } = bounds
  const days = daysBetween(from, to) + 1
  const weeks = Math.max(1, days / 7)

  // ---- Sessions, sets, tonnage, PRs ----
  let sessionsDone = 0
  let sessionsScheduled = 0
  let setsDone = 0
  let tonnageLb = 0
  let prCount = 0
  for (let d = from; d <= to; d = addDaysISO(d, 1)) {
    if (daysBetween(data.settings.phaseStartDate, d) < 0) continue
    const log = data.sessions[d]
    const kind = resolveDay(d, data).kind
    if (kind === 'session' || kind === 'mobility' || kind === 'cardio-backup') sessionsScheduled++
    if (!log || log.status === 'skipped') continue
    sessionsDone++
    setsDone += sessionSetsDone(log).done
    tonnageLb += sessionTonnage(log)
    prCount += detectPRs(data, log).length
  }
  const adherencePct =
    sessionsScheduled > 0 ? Math.min(100, Math.round((sessionsDone / sessionsScheduled) * 100)) : null

  // ---- Protein: only days with food logged can be graded ----
  let pLogged = 0
  let pHit = 0
  for (let d = from; d <= to; d = addDaysISO(d, 1)) {
    const g = proteinFor(data, d)
    if (g <= 0) continue
    pLogged++
    if (g >= data.settings.proteinTargetG) pHit++
  }
  const minLogged = bounds.kind === 'week' ? 3 : 10
  const proteinPct = pLogged >= minLogged ? Math.round((pHit / pLogged) * 100) : null

  // ---- Body deltas: first vs last check-in inside the window ----
  const inWindow = data.measurements.filter((m) => m.date >= from && m.date <= to)
  const keys = [
    { key: 'weightLb', label: 'Weight', unit: 'lb', better: 'down' },
    { key: 'bodyFatPct', label: 'Body fat', unit: '%', better: 'down' },
    { key: 'waistIn', label: 'Waist', unit: 'in', better: 'down' },
    { key: 'vertIn', label: 'Vert / rim', unit: 'in', better: 'up' },
  ] as const
  const progression: ReviewDelta[] = keys.map(({ key, label, unit, better }) => {
    const before = inWindow.find((m) => num(m[key]))?.[key]
    const after = [...inWindow].reverse().find((m) => num(m[key]))?.[key]
    const delta = num(before) && num(after) ? Math.round((after - before) * 10) / 10 : undefined
    return { key, label, unit, before, after, delta, better }
  })

  // ---- Strength: tracked lifts with a reading at both ends ----
  const strength: PeriodReview['strength'] = []
  for (const t of data.plan.trackedLifts) {
    const series = liftSeries(data, t.exerciseId).filter((p) => p.date >= from && p.date <= to)
    if (series.length < 2) continue
    const beforeE1rm = Math.round(series[0].e1rm)
    const afterE1rm = Math.round(series[series.length - 1].e1rm)
    if (beforeE1rm <= 0) continue
    strength.push({
      label: t.label ?? getExercise(t.exerciseId).name,
      beforeE1rm,
      afterE1rm,
      pct: Math.round(((afterE1rm - beforeE1rm) / beforeE1rm) * 100),
    })
  }

  // ---- Highlights: the things worth saying out loud ----
  const highlights: PeriodHighlight[] = []
  if (prCount > 0) {
    highlights.push({
      icon: '🏆',
      label: `${prCount} personal ${prCount === 1 ? 'record' : 'records'}`,
      detail: 'Numbers that had never been done before. They are on the record now.',
    })
  }
  const best = [...strength].sort((a, b) => b.pct - a.pct)[0]
  if (best && best.pct > 0) {
    highlights.push({
      icon: '💪',
      label: `${best.label} up ${best.pct}%`,
      detail: `${best.beforeE1rm} lb to ${best.afterE1rm} lb estimated max.`,
    })
  }
  if (tonnageLb > 0) {
    highlights.push({
      icon: '🏋️',
      label: `${Math.round(tonnageLb).toLocaleString()} lb moved`,
      detail: `Across ${setsDone} ${setsDone === 1 ? 'set' : 'sets'}. Weight times reps, every one of them.`,
    })
  }
  if (adherencePct !== null && adherencePct >= 90 && sessionsScheduled >= 3) {
    highlights.push({
      icon: '🎯',
      label: 'Nearly every session kept',
      detail: `${sessionsDone} of ${sessionsScheduled}. That is the whole trick, and most people cannot do it.`,
    })
  }

  // ---- Goals accomplished: body targets crossed inside the window ----
  const goals: PeriodGoal[] = []
  for (const d of progression) {
    if (!num(d.delta) || d.delta === 0) continue
    const good = d.better === 'up' ? d.delta > 0 : d.delta < 0
    if (!good) continue
    const size = Math.abs(d.delta)
    if (d.key === 'weightLb' && size < 1) continue
    if (d.key === 'bodyFatPct' && size < 0.5) continue
    goals.push({
      label: `${d.label} ${d.delta > 0 ? 'up' : 'down'} ${size}${d.unit === '%' ? '%' : ` ${d.unit}`}`,
      detail: `${d.before}${d.unit === '%' ? '%' : ''} to ${d.after}${d.unit === '%' ? '%' : ''} over ${bounds.label}.`,
    })
  }

  const sessionsPerWeek = Math.round((sessionsDone / weeks) * 10) / 10
  const cohort = cohortStats({
    sessionsPerWeek,
    weeksTraining: weeksTraining(data, to),
    adherencePct,
    proteinPct,
  })

  const wantsPhotoArc = bounds.kind === 'quarter' || bounds.kind === 'year'

  return {
    bounds,
    sessionsDone,
    sessionsScheduled,
    adherencePct,
    setsDone,
    tonnageLb: Math.round(tonnageLb),
    prCount,
    sessionsPerWeek,
    proteinPct,
    progression,
    strength,
    highlights,
    goals,
    cohort,
    photos: wantsPhotoArc ? photoPairs(data.measurements, to) : [],
    askForPhotos: bounds.kind === 'week',
    missingAngles: missingAnglesFor(data.measurements),
    // A period nobody trained in has nothing to review. Saying so is
    // kinder than a story of zeros with a percentile attached.
    worthShowing: sessionsDone > 0 || inWindow.length > 0,
  }
}

/**
 * The reviews owed right now: every period that has closed, has not been
 * seen, and had something in it.
 *
 * Longest period first. On the 1st of January four of these come due at
 * once, and the year is the one the athlete actually wants; the week is
 * the footnote.
 */
export function reviewsDue(data: AppData, today: ISODate, seen: string[]): PeriodReview[] {
  const out: PeriodReview[] = []
  for (const kind of [...PERIOD_KINDS].reverse() as PeriodKind[]) {
    const bounds = lastClosed(kind, today)
    if (seen.includes(bounds.id)) continue
    if (bounds.to < data.settings.phaseStartDate) continue
    const review = periodReview(data, bounds)
    if (!review.worthShowing) continue
    out.push(review)
  }
  return out
}


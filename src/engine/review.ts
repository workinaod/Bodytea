import type { AppData, ISODate } from '../types'
import { addDaysISO, daysBetween } from './calendar'
import { resolveDay } from './resolveDay'
import { liftSeries, proteinFor } from './stats'
import { getExercise } from '../plan/exercises'

// ============================================================
// Milestone reviews: at 3 months, 6 months, and 1 year the app
// sits the user down, deltas, before/after photos, and a
// verdict that weighs GAINS against EFFORT. High effort earns
// respect even when the numbers stall; low effort gets named
// even when genetics carried the numbers.
// ============================================================

/** The three fixed distances. Named so the screens can pass one around. */
export type ReviewMarkId = '3mo' | '6mo' | '1yr'

export interface ReviewMark {
  id: ReviewMarkId
  days: number
  label: string
}

export const REVIEW_MARKS: ReviewMark[] = [
  { id: '3mo', days: 91, label: '3-Month Review' },
  { id: '6mo', days: 182, label: '6-Month Review' },
  { id: '1yr', days: 365, label: '1-Year Review' },
]

export interface ReviewDelta {
  key: string
  label: string
  unit: string
  before?: number
  after?: number
  delta?: number
  /** Which direction counts as progress for this metric. */
  better: 'up' | 'down'
}

export interface ReviewLine {
  tone: 'win' | 'note' | 'callout'
  text: string
}

export interface MilestoneReview {
  markId: ReviewMark['id']
  label: string
  from: ISODate
  to: ISODate
  scheduled: number
  done: number
  partial: number
  adherencePct: number | null
  proteinPct: number | null
  strength: { label: string; beforeE1rm: number; afterE1rm: number; pct: number }[]
  deltas: ReviewDelta[]
  beforePhotoId?: string
  afterPhotoId?: string
  verdict: string
  lines: ReviewLine[]
}

/** Marks whose day-count has elapsed since phase start. */
export function unlockedMarks(data: AppData, today: ISODate): ReviewMark[] {
  const elapsed = daysBetween(data.settings.phaseStartDate, today)
  return REVIEW_MARKS.filter((m) => elapsed >= m.days)
}

/** The earliest unlocked mark the user hasn't opened yet. */
export function reviewReady(data: AppData, today: ISODate): ReviewMark | null {
  const seen = data.settings.reviewsSeen ?? []
  return unlockedMarks(data, today).find((m) => !seen.includes(m.id)) ?? null
}

function num(v: number | undefined): v is number {
  return typeof v === 'number' && Number.isFinite(v)
}

export function buildMilestoneReview(data: AppData, markId: ReviewMark['id'], today: ISODate): MilestoneReview {
  const mark = REVIEW_MARKS.find((m) => m.id === markId)!
  const from = data.settings.phaseStartDate
  const end = addDaysISO(from, mark.days - 1)
  const to = end < today ? end : today

  // ---- Attendance over the window (scheduled session days only) ----
  let scheduled = 0
  let done = 0
  let partial = 0
  for (let d = from; d <= to; d = addDaysISO(d, 1)) {
    const day = resolveDay(d, data)
    if (day.kind !== 'session') continue
    scheduled++
    const log = data.sessions[d]
    if (!log) continue
    if (log.status === 'completed' || log.status === 'downgraded-completed') done++
    else if (log.status === 'partial' && log.endedAt) partial++
  }
  const adherencePct = scheduled >= 8 ? Math.round(((done + 0.5 * partial) / scheduled) * 100) : null

  // ---- Protein effort: target-hit days / days that logged anything ----
  let pDaysLogged = 0
  let pDaysHit = 0
  for (let d = from; d <= to; d = addDaysISO(d, 1)) {
    const g = proteinFor(data, d)
    if (g > 0) {
      pDaysLogged++
      if (g >= data.settings.proteinTargetG) pDaysHit++
    }
  }
  const proteinPct = pDaysLogged >= 10 ? Math.round((pDaysHit / pDaysLogged) * 100) : null

  // ---- Body deltas: first vs last check-in inside the window ----
  const inWindow = data.measurements.filter((m) => m.date >= from && m.date <= to)
  const firstOf = (key: 'weightLb' | 'bodyFatPct' | 'waistIn' | 'vertIn') => inWindow.find((m) => num(m[key]))?.[key]
  const lastOf = (key: 'weightLb' | 'bodyFatPct' | 'waistIn' | 'vertIn') => [...inWindow].reverse().find((m) => num(m[key]))?.[key]
  const mkDelta = (key: 'weightLb' | 'bodyFatPct' | 'waistIn' | 'vertIn', label: string, unit: string, better: 'up' | 'down'): ReviewDelta => {
    const before = firstOf(key)
    const after = lastOf(key)
    const delta = num(before) && num(after) ? Math.round((after - before) * 10) / 10 : undefined
    return { key, label, unit, before, after, delta, better }
  }
  const deltas = [
    mkDelta('weightLb', 'Weight', 'lb', 'down'),
    mkDelta('bodyFatPct', 'Body fat', '%', 'down'),
    mkDelta('waistIn', 'Waist', 'in', 'down'),
    mkDelta('vertIn', 'Vert / rim', 'in', 'up'),
  ]

  // ---- Strength: tracked lifts with data at both ends ----
  const strength: MilestoneReview['strength'] = []
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
  const strengthAvgPct = strength.length
    ? Math.round(strength.reduce((s, x) => s + x.pct, 0) / strength.length)
    : null

  // ---- Before / after photos (front angle from check-ins) ----
  const beforePhotoId = inWindow.find((m) => m.photoIds.front)?.photoIds.front
  const afterPhotoId = [...inWindow].reverse().find((m) => m.photoIds.front && m.photoIds.front !== beforePhotoId)?.photoIds.front

  // ---- The verdict: gains weighed against effort ----
  const lines: ReviewLine[] = []
  const bf = deltas.find((d) => d.key === 'bodyFatPct')
  const waist = deltas.find((d) => d.key === 'waistIn')
  const vert = deltas.find((d) => d.key === 'vertIn')

  if (num(vert?.delta) && vert!.delta! >= 1.5) {
    lines.push({ tone: 'win', text: `Vert up ${vert!.delta}". Not luck, that's force production you built rep by rep.` })
  }
  if (num(bf?.delta) && bf!.delta! <= -1.5) {
    lines.push({ tone: 'win', text: `Body fat down ${Math.abs(bf!.delta!)}% while training hard. The hardest combo there is.` })
  }
  if (num(waist?.delta) && waist!.delta! <= -1) {
    lines.push({ tone: 'win', text: `Waist down ${Math.abs(waist!.delta!)}". The recomp shows on the tape, not just the mirror.` })
  }
  if (strengthAvgPct !== null && strengthAvgPct >= 8) {
    lines.push({ tone: 'win', text: `Strength up ~${strengthAvgPct}% across your tracked lifts. The base is getting deeper.` })
  }
  if (proteinPct !== null && proteinPct >= 75) {
    lines.push({ tone: 'win', text: `Protein target hit on ${proteinPct}% of logged days. That discipline is why the muscle stays.` })
  }
  if (proteinPct !== null && proteinPct < 50) {
    lines.push({ tone: 'callout', text: `Protein hit on only ${proteinPct}% of logged days. Every adaptation you're chasing is built from what you didn't eat. Fix this before touching the training.` })
  }

  const noBodyMovement =
    (!num(bf?.delta) || Math.abs(bf!.delta!) < 1) &&
    (!num(waist?.delta) || Math.abs(waist!.delta!) < 0.5)

  if (adherencePct !== null && adherencePct >= 85 && noBodyMovement && (strengthAvgPct ?? 0) < 5) {
    lines.push({
      tone: 'note',
      text: 'Attendance was excellent but the needles barely moved. Not a character problem, a levers problem. Check calories, sleep, and whether the weights actually went up.',
    })
  }
  if (adherencePct !== null && adherencePct < 60) {
    lines.push({
      tone: 'callout',
      text: `You made ${adherencePct}% of scheduled sessions. The plan didn't fail, attendance did. Everything else here is downstream of that number.`,
    })
  }
  if (inWindow.length < 3) {
    lines.push({ tone: 'note', text: 'Barely any check-ins this period. The review can only grade what you wrote down. Log weekly and the next one gets sharper.' })
  }
  if (!beforePhotoId || !afterPhotoId) {
    lines.push({ tone: 'note', text: 'No before/after photos this period. Take front/side/back at the next check-in. The camera catches what the scale hides.' })
  }

  // Opening sentence by effort tier, closing by trajectory.
  let opening: string
  if (adherencePct === null) {
    opening = `${mark.label}: not enough scheduled weeks landed in this window to grade attendance yet.`
  } else if (adherencePct >= 85) {
    opening = `${mark.label}: ${adherencePct}% attendance. You showed up like it mattered. That's the whole foundation, and you built it.`
  } else if (adherencePct >= 60) {
    opening = `${mark.label}: ${adherencePct}% attendance. Real work happened, but there's a gap between the plan and the life. Close it and everything below accelerates.`
  } else {
    opening = `${mark.label}: ${adherencePct}% attendance. Read that number twice before reading anything else here.`
  }
  const wins = lines.filter((l) => l.tone === 'win').length
  const closing =
    wins >= 3
      ? 'Keep the exact same inputs. This is what progress looks like from the inside.'
      : wins >= 1
        ? 'The wins are real. Protect the habits that made them and attack ONE weak lever next block.'
        : 'Nothing compounds until the showing-up does. Next review, the first number is the only one being judged.'
  const verdict = `${opening} ${closing}`

  return {
    markId,
    label: mark.label,
    from,
    to,
    scheduled,
    done,
    partial,
    adherencePct,
    proteinPct,
    strength,
    deltas,
    beforePhotoId,
    afterPhotoId,
    verdict,
    lines,
  }
}

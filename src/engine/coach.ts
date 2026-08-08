import type {
  AppData,
  CoachSituation,
  ExcuseReason,
  ExcuseRecord,
  ISODate,
  SessionLog,
  WeekState,
} from '../types'
import { MESSAGE_POOLS } from '../plan/messages'
import { addDaysISO, daysBetween, formatShort, mondayOf, weekdayOf } from './calendar'

// ============================================================
// The accountability engine. Pure functions: the UI feeds events
// in and renders what comes back; nothing here touches storage.
// ============================================================

export function interpolate(text: string, vars: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (_, k: string) => (k in vars ? String(vars[k]) : `{${k}}`))
}

/**
 * Anti-repeat variant selection: unseen variants first; once all have
 * been seen, the least-recently-shown wins. `shownIds` is the global
 * ring buffer (capped by the caller).
 */
export function pickVariant(
  poolId: string,
  variants: string[],
  shownIds: string[],
): { text: string; shownId: string } {
  const idsFor = variants.map((_, i) => `${poolId}:${i}`)
  const unseen = idsFor.findIndex((id) => !shownIds.includes(id))
  if (unseen >= 0) return { text: variants[unseen], shownId: idsFor[unseen] }
  // all seen — pick the one shown longest ago (earliest position in ring)
  let bestIdx = 0
  let bestPos = Infinity
  idsFor.forEach((id, i) => {
    const pos = shownIds.lastIndexOf(id)
    if (pos < bestPos) {
      bestPos = pos
      bestIdx = i
    }
  })
  return { text: variants[bestIdx], shownId: idsFor[bestIdx] }
}

export const SHOWN_RING_CAP = 300

export function pushShown(shownIds: string[], id: string): string[] {
  const next = [...shownIds.filter((x) => x !== id), id]
  return next.length > SHOWN_RING_CAP ? next.slice(next.length - SHOWN_RING_CAP) : next
}

// ---------- Escalation ----------

/** Non-accepted excuses in the trailing 30 days (before `now`). */
export function unprovenExcusesInWindow(
  excuses: ExcuseRecord[],
  todayIso: ISODate,
  windowDays = 30,
): ExcuseRecord[] {
  return excuses.filter(
    (e) =>
      !e.accepted &&
      e.action !== 'unexplained-miss' &&
      daysBetween(e.date, todayIso) >= 0 &&
      daysBetween(e.date, todayIso) < windowDays,
  )
}

/** Level for the NEXT unproven skip, based on prior history. */
export function escalationLevel(excuses: ExcuseRecord[], todayIso: ISODate): 0 | 1 | 2 | 3 {
  const n = unprovenExcusesInWindow(excuses, todayIso).length
  return Math.min(3, n) as 0 | 1 | 2 | 3
}

function priorDatesText(excuses: ExcuseRecord[], todayIso: ISODate): string {
  const dates = unprovenExcusesInWindow(excuses, todayIso)
    .map((e) => e.date)
    .sort()
  return dates.map(formatShort).join(', ')
}

// ---------- Message selection ----------

export interface CoachMessage {
  situation: CoachSituation
  poolId: string
  text: string
  shownId: string
}

export function coachMessageFor(
  data: AppData,
  situation: CoachSituation,
  todayIso: ISODate,
  vars: Record<string, string | number> = {},
  poolOverride?: string,
): CoachMessage {
  let pool = poolOverride
    ? MESSAGE_POOLS.find((p) => p.id === poolOverride)
    : undefined
  if (!pool) {
    if (situation === 'skip-no-proof') {
      const level = escalationLevel(data.excuses, todayIso)
      pool = MESSAGE_POOLS.find((p) => p.situation === situation && p.level === level)
    } else {
      pool = MESSAGE_POOLS.find((p) => p.situation === situation)
    }
  }
  if (!pool) throw new Error(`No message pool for ${situation}`)

  const level = escalationLevel(data.excuses, todayIso)
  const allVars: Record<string, string | number> = {
    count: unprovenExcusesInWindow(data.excuses, todayIso).length + 1,
    dates: priorDatesText(data.excuses, todayIso) || 'today',
    proteinTarget: data.settings.proteinTargetG,
    level,
    ...vars,
  }
  const picked = pickVariant(pool.id, pool.variants, data.coach.shownMessageIds)
  return {
    situation,
    poolId: pool.id,
    text: interpolate(picked.text, allVars),
    shownId: picked.shownId,
  }
}

// ---------- Contradiction heuristics ----------

export interface Contradiction {
  poolId: 'contradiction-sick-pr' | 'contradiction-busy-meals' | 'contradiction-tier-full'
  vars: Record<string, string | number>
}

/** Checks run when a session is FINISHED. */
export function contradictionsOnSessionFinish(
  data: AppData,
  session: SessionLog,
  hadPR: boolean,
): Contradiction[] {
  const out: Contradiction[] = []
  const yesterday = addDaysISO(session.date, -1)

  // "Sick" yesterday + PR today
  if (hadPR) {
    const sickYesterday = data.excuses.some(
      (e) => e.date === yesterday && e.reason === 'sick' && !e.accepted,
    )
    if (sickYesterday) out.push({ poolId: 'contradiction-sick-pr', vars: {} })
  }

  // Tier dropped this week without an accepted excuse, then a FULL session
  // logged anyway ("so you had it in you"). Tier 1 = full week, 3 = bare
  // minimum, so a drop is to > from.
  const monday = mondayOf(session.date)
  const week = data.weeks[monday]
  const drops = week?.tierChanges.filter((c) => c.to > c.from) ?? []
  if (drops.length > 0) {
    const anyExcused = drops.some((c) => {
      const ex = data.excuses.find((e) => e.id === c.excuseId)
      return ex?.accepted
    })
    const allDone =
      session.status === 'completed' &&
      session.exercises.length > 0 &&
      session.exercises.every((e) => e.sets.every((s) => s.done))
    if (!anyExcused && allDone) out.push({ poolId: 'contradiction-tier-full', vars: {} })
  }

  return out
}

/** Check run when the user claims "busy" in the SkipFlow. */
export function busyButMealsLogged(data: AppData, date: ISODate): boolean {
  const meals = data.meals[date]
  return (meals?.entries.length ?? 0) >= 4
}

// ---------- Excuse acceptance (the rules that make proof real) ----------

/**
 * A gig claim is auto-accepted only when the matching gig flag was already
 * set on that week in the Week tab — a conflict declared in advance is a
 * fact the app can verify from its own state.
 */
export function gigSanctioned(week: WeekState | undefined, date: ISODate): boolean {
  if (!week) return false
  const wd = weekdayOf(date)
  if (wd === 5) return !!week.gigFlags.djFriNight
  if (wd === 6) return !!week.gigFlags.djSatNight
  if (wd === 1) return !!week.gigFlags.longShiftBeforeMon
  return false
}

export function anyGigFlag(week: WeekState | undefined): boolean {
  return !!(
    week &&
    (week.gigFlags.djFriNight || week.gigFlags.djSatNight || week.gigFlags.longShiftBeforeMon)
  )
}

/**
 * Single acceptance rule used by every excuse writer: proof (already
 * freshness-validated at capture) accepts; a gig claim accepts only when
 * the week's gig flags corroborate it. Nothing else auto-accepts.
 */
export function excuseAccepted(opts: {
  reason: ExcuseReason
  proofPhotoId?: string
  week: WeekState | undefined
  date: ISODate
  scope: 'day' | 'week'
}): boolean {
  if (opts.proofPhotoId) return true
  if (opts.reason === 'gig') {
    return opts.scope === 'week' ? anyGigFlag(opts.week) : gigSanctioned(opts.week, opts.date)
  }
  return false
}

// ---------- Fallback-week monitor ----------

/** Tier 2/3 weeks among the trailing `window` week states (incl. current). */
export function fallbackWeekCount(data: AppData, todayIso: ISODate, window = 5): number {
  let count = 0
  for (let i = 0; i < window; i++) {
    const monday = mondayOf(addDaysISO(todayIso, -7 * i))
    const week = data.weeks[monday]
    if (week && week.tier > 1) count++
  }
  return count
}

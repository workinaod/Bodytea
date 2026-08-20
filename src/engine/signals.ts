import type { AppData, ISODate } from '../types'
import { addDaysISO, daysBetween, mondayOf } from './calendar'
import { loggedSessions } from './activityLog'
import { MOVEMENT, type Joint } from '../plan/movement'

// ============================================================
// What the last fortnight is telling us, read once.
//
// The reading half of engine/adapt.ts, split out for the reason that
// file's own comment gives: reading the week and deciding what to do
// about it are deliberately separate, because the same reading drives
// the automatic reroutes, the proposals, and the line the coach says out
// loud, and those three drifting apart is how an app ends up explaining
// a change it did not make.
//
// Nothing here decides anything. Every function answers "what
// happened", and adapt.ts answers "so what".
// ============================================================

/**
 * Two bad nights immediately before today, which is the condition the
 * resolver already cuts a third of the volume on.
 *
 * Lives here rather than in resolveDay so there is ONE definition: this
 * file has to know whether that cut has already happened before it
 * offers another one, and two copies of the rule would drift.
 */
export function twoConsecutiveBadNightsBefore(data: AppData, dateISO: ISODate): boolean {
  const week = data.weeks[mondayOf(dateISO)]
  if (!week) return false
  const all = new Set(week.badSleepDates)
  return all.has(addDaysISO(dateISO, -1)) && all.has(addDaysISO(dateISO, -2))
}

/** How far back the reading goes. Beyond two weeks it is history, not context. */
export const SIGNAL_WINDOW_DAYS = 14

/** A joint has to complain more than once before the plan reroutes around it. */
export const PAIN_PATTERN_COUNT = 2

/** Sessions missed inside the window before the plan stops pretending. */
export const MISS_PATTERN_COUNT = 2

/** Unplanned minutes of sport in a day that count as a real training load. */
export const EXTRA_LOAD_MINUTES = 60

export type SignalKind =
  | 'missed'
  | 'extra-load'
  | 'poor-sleep'
  | 'earned-progression'
  | 'joint-pain'
  | 'equipment-gap'
  | 'accumulated-fatigue'

export interface Signal {
  kind: SignalKind
  /** Most recent date this was observed. */
  at: ISODate
  /** How many times inside the window. */
  count: number
  /** Plain sentence, shown to the athlete. */
  detail: string
  /** Joints, for joint-pain. */
  joints?: Joint[]
  /** Exercise ids the signal is about. */
  exerciseIds?: string[]
}

/**
 * Everything the last fortnight is telling us, read once.
 *
 * Deliberately separate from deciding what to do about it: the same
 * reading drives the automatic reroutes, the proposals, and the line the
 * coach says out loud, and those three drifting apart is how an app ends
 * up explaining a change it did not make.
 */
export function readSignals(data: AppData, today: ISODate): Signal[] {
  const from = addDaysISO(today, -SIGNAL_WINDOW_DAYS)
  const inWindow = <T extends { date: ISODate }>(x: T) => x.date >= from && x.date <= today
  const out: Signal[] = []

  // ---- Missed sessions ----
  const skipped = Object.values(data.sessions)
    .filter((s) => inWindow(s) && s.status === 'skipped')
    .sort((a, b) => (a.date > b.date ? -1 : 1))
  if (skipped.length >= MISS_PATTERN_COUNT) {
    out.push({
      kind: 'missed',
      at: skipped[0].date,
      count: skipped.length,
      detail: `${skipped.length} sessions missed in the last two weeks.`,
    })
  }

  // ---- Unplanned load: sport nobody programmed ----
  //
  // Read through activityLog so a GPS run counts once rather than twice.
  // Two hours of basketball is a training day whether or not the plan
  // called for one, and the plan pretending otherwise is how somebody
  // ends up doing a heavy lower day on legs that already played.
  const byDate = new Map<ISODate, number>()
  for (const s of loggedSessions(data, { from, to: today })) {
    byDate.set(s.date, (byDate.get(s.date) ?? 0) + s.minutes)
  }
  const bigDays = [...byDate.entries()].filter(([, min]) => min >= EXTRA_LOAD_MINUTES).sort((a, b) => (a[0] > b[0] ? -1 : 1))
  if (bigDays.length) {
    const [date, minutes] = bigDays[0]
    const ago = daysBetween(date, today)
    if (ago <= 2) {
      out.push({
        kind: 'extra-load',
        at: date,
        count: bigDays.length,
        detail: `${Math.round(minutes)} minutes of sport ${ago === 0 ? 'today' : ago === 1 ? 'yesterday' : `${ago} days ago`}, on top of the plan.`,
      })
    }
  }

  // ---- Sleep ----
  const badNights = new Set<ISODate>()
  for (const week of Object.values(data.weeks)) {
    for (const d of week.badSleepDates) if (d >= from && d <= today) badNights.add(d)
  }
  const recentBad = [...badNights].filter((d) => daysBetween(d, today) <= 3).sort().reverse()
  if (recentBad.length >= 2) {
    out.push({
      kind: 'poor-sleep',
      at: recentBad[0],
      count: recentBad.length,
      detail: `${recentBad.length} bad nights in the last few days.`,
    })
  }

  // ---- Joints that keep complaining ----
  //
  // Pain notes carry the muscle regions they happened on; the JOINT comes
  // from the movement's own metadata, which is what makes "my shoulder
  // hurts" something the planner can route around rather than sympathise
  // with.
  const painByJoint = new Map<Joint, { count: number; at: ISODate; ids: Set<string> }>()
  for (const s of Object.values(data.sessions)) {
    if (!inWindow(s)) continue
    for (const n of s.fatigue ?? []) {
      if (n.reason !== 'pain') continue
      for (const j of MOVEMENT[n.exerciseId]?.stress ?? []) {
        const cur = painByJoint.get(j) ?? { count: 0, at: s.date, ids: new Set<string>() }
        cur.count++
        cur.ids.add(n.exerciseId)
        if (s.date > cur.at) cur.at = s.date
        painByJoint.set(j, cur)
      }
    }
  }
  for (const [joint, v] of painByJoint) {
    if (v.count < PAIN_PATTERN_COUNT) continue
    out.push({
      kind: 'joint-pain',
      at: v.at,
      count: v.count,
      joints: [joint],
      exerciseIds: [...v.ids],
      detail: `Your ${joint.replace('-', ' ')} has been flagged ${v.count} times recently.`,
    })
  }

  // ---- Accumulated fatigue: heavy sessions stacking without a light one ----
  const recent = Object.values(data.sessions)
    .filter((s) => inWindow(s) && s.status !== 'skipped' && s.date >= addDaysISO(today, -7))
    .sort((a, b) => (a.date > b.date ? -1 : 1))
  const heavy = recent.filter((s) => s.feel === 'heavy').length
  if (heavy >= 3) {
    out.push({
      kind: 'accumulated-fatigue',
      at: recent[0]?.date ?? today,
      count: heavy,
      detail: `${heavy} of the last week's sessions were graded heavy.`,
    })
  }

  return out.sort((a, b) => (a.at > b.at ? -1 : 1))
}

/**
 * How long a joint keeps complaining before an app should stop guessing.
 *
 * Not a new promise. adapt.ts has told athletes since it was written
 * that "if it is still there in two weeks, that is a question for a
 * physio and not for an app", and nothing ever checked whether it was
 * still there in two weeks. The sentence repeated itself every session,
 * forever, which is the app making a commitment about a date and then
 * quietly declining to keep it.
 */
export const PAIN_PERSISTS_DAYS = 14

/**
 * A quiet stretch this long ends a run of complaint.
 *
 * Without it, one flare last winter and one this morning would read as
 * a shoulder that has been hurting for a year, and the athlete would be
 * sent to a physio over two separate bad days. A joint that goes quiet
 * for a fortnight recovered; what comes after is a new complaint.
 */
const COMPLAINT_GAP_DAYS = SIGNAL_WINDOW_DAYS

/**
 * Joints whose current run of complaint has already outlasted the two
 * weeks the app promised to give it.
 *
 * Reads ALL history rather than the signal window on purpose: the whole
 * question is how long this has been going on, and a fortnight-wide
 * window can only ever answer "a fortnight at most".
 */
export function persistentPainJoints(data: AppData, today: ISODate): Joint[] {
  const byJoint = new Map<Joint, ISODate[]>()
  for (const s of Object.values(data.sessions)) {
    if (s.date > today) continue
    for (const n of s.fatigue ?? []) {
      if (n.reason !== 'pain') continue
      for (const j of MOVEMENT[n.exerciseId]?.stress ?? []) {
        byJoint.set(j, [...(byJoint.get(j) ?? []), s.date])
      }
    }
  }

  const out: Joint[] = []
  for (const [joint, all] of byJoint) {
    const dates = [...new Set(all)].sort()
    const newest = dates[dates.length - 1]
    // Still a live complaint, or history? A joint that stopped hurting
    // three weeks ago is not a physio question today.
    if (daysBetween(newest, today) > COMPLAINT_GAP_DAYS) continue
    // Walk back through the current run, stopping at the first quiet
    // stretch long enough to count as recovery.
    let start = newest
    for (let i = dates.length - 2; i >= 0; i--) {
      if (daysBetween(dates[i], start) > COMPLAINT_GAP_DAYS) break
      start = dates[i]
    }
    if (daysBetween(start, newest) >= PAIN_PERSISTS_DAYS) out.push(joint)
  }
  return out
}

import type { AppData, ISODate } from '../types'
import { addDaysISO, daysBetween, todayISO } from './calendar'
import { resolveDay } from './resolveDay'

// ============================================================
// The streak the flame counts.
//
// `currentStreak` in stats.ts counts consecutive SCHEDULED DAYS
// logged, which is a fine measure of adherence but is not what a
// fire icon means to anyone. On a 5-day plan its "30" arrives
// after six weeks and its "365" after a year and a half, so the
// badge ladder (a month, a quarter, half a year, a year) would
// have been lying about every rung.
//
// This counts CALENDAR DAYS since the last missed session. Rest
// days are part of the run, because resting on a rest day is
// following the plan, not breaking it. Today never breaks a
// streak until today is over.
// ============================================================

export interface StreakState {
  /** Days in the run right now. */
  current: number
  /** Longest run ever, which is what the permanent badges record. */
  best: number
}

function isScheduled(data: AppData, date: ISODate): boolean {
  const r = resolveDay(date, data)
  return r.kind === 'session' || r.kind === 'mobility' || r.kind === 'cardio-backup'
}

/**
 * One pass over the history gives both numbers. Badges are
 * permanent, so a 30 day run that later broke still counts: they
 * are earned against `best`, never against `current`.
 */
export function streakState(data: AppData, today: ISODate = todayISO()): StreakState {
  const start = data.settings.phaseStartDate
  if (daysBetween(start, today) < 0) return { current: 0, best: 0 }

  let run = 0
  let best = 0
  for (let date = start; daysBetween(date, today) >= 0; date = addDaysISO(date, 1)) {
    const log = data.sessions[date]
    const held = !isScheduled(data, date) || (log !== undefined && log.status !== 'skipped')
    if (!held) {
      // An unfinished today is not a miss yet. Leave the run standing
      // and stop: there is nothing after today to count.
      if (date === today) break
      run = 0
      continue
    }
    run++
    if (run > best) best = run
  }
  return { current: run, best }
}

/** Just the live number, for the flame. */
export function streakDays(data: AppData, today: ISODate = todayISO()): number {
  return streakState(data, today).current
}

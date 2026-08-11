import type { AppData, ISODate } from '../types'
import { addDaysISO, localISO } from './calendar'
import { resolveDay } from './resolveDay'

// ============================================================
// Day-rollover math. Pure; the live clock in logic/clock.ts
// and the screens consume these.
// ============================================================

/**
 * Milliseconds until just past the next local midnight. DST-safe:
 * date-part construction lets the JS engine resolve the real wall-clock
 * distance, whether the night is 23, 24, or 25 hours long.
 */
export function msUntilNextMidnight(now: Date): number {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 2)
  return Math.max(1000, next.getTime() - now.getTime())
}

/**
 * Late-night grace: between midnight and 03:00, "yesterday" stays the
 * live day when its work is still in play — an unfinished session keeps
 * its clock, and a scheduled day never started can STILL be started (a
 * midnight-to-three workout counts as the day it belongs to). A day
 * that was finished or explicitly skipped rolls over immediately.
 * Returns yesterday's date while grace applies, else null.
 */
export function lateNightGraceDate(
  data: AppData,
  today: ISODate,
  now: Date,
): ISODate | null {
  if (now.getHours() >= 3) return null
  if (localISO(now) !== today) return null // clock/state disagree — no grace games
  const yesterday = addDaysISO(today, -1)
  const s = data.sessions[yesterday]
  if (s) {
    const inProgress = s.status === 'partial' && !!s.startedAt && !s.endedAt
    return inProgress ? yesterday : null
  }
  const resolved = resolveDay(yesterday, data)
  return resolved.kind === 'session' || resolved.kind === 'mobility' ? yesterday : null
}

import type { ISODate, SessionLog } from '../types'
import { addDaysISO, localISO } from './calendar'

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
 * Late-night grace: between midnight and 03:00, an unfinished session
 * from "yesterday" keeps the Today screen anchored on yesterday so the
 * lifter finishing at 12:40am logs against the day they actually trained.
 * Returns yesterday's date while grace applies, else null.
 */
export function lateNightGraceDate(
  sessions: Record<ISODate, SessionLog>,
  today: ISODate,
  now: Date,
): ISODate | null {
  if (now.getHours() >= 3) return null
  if (localISO(now) !== today) return null // clock/state disagree — no grace games
  const yesterday = addDaysISO(today, -1)
  const s = sessions[yesterday]
  if (!s) return null
  const inProgress = s.status === 'partial' && !!s.startedAt && !s.endedAt
  return inProgress ? yesterday : null
}

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
 * live day when its work is still in play, an unfinished session keeps
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
  if (now.getHours() >= 6) return null
  if (localISO(now) !== today) return null // clock/state disagree, no grace games
  const yesterday = addDaysISO(today, -1)
  const s = data.sessions[yesterday]
  if (s) {
    // A session actively in progress keeps its day PAST 3:00, never
    // yank the anchor mid-workout. 06:00 is the hard backstop.
    const inProgress = s.status === 'partial' && !!s.startedAt && !s.endedAt
    return inProgress ? yesterday : null
  }
  // Never started: startable as its own day only inside the 12–3 window
  if (now.getHours() >= 3) return null
  const resolved = resolveDay(yesterday, data)
  return resolved.kind === 'session' || resolved.kind === 'mobility' ? yesterday : null
}

/**
 * Can more work still be logged against this day?
 *
 * A day is not over the moment one session ends. People finish the
 * plan's session, then play ball, then remember the abs they did, and
 * the app used to shut the door on all of it: the first finished
 * session closed the day out.
 *
 * The live day is always open. Yesterday stays open until 03:00, the
 * same window the rest of the app already uses for work that belongs to
 * the day before the clock says so. Past that, a day is history and is
 * edited through the record, not by adding to it.
 */
export function stillOpenForLogging(date: ISODate, homeDate: ISODate, now: Date): boolean {
  if (date === homeDate) return true
  return date === addDaysISO(localISO(now), -1) && now.getHours() < 3
}

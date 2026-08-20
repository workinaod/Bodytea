import type { ISODate } from '../types'
import { addDaysISO, localISO, mondayOf } from './calendar'

// ============================================================
// Calendar periods: the week, month, quarter and year a date
// falls in, and the one before it.
//
// Its own file because two very different things need the same
// boundaries and must never disagree about them: the review
// engine that summarises a period, and the surface that decides
// a period has closed and one is owed.
//
// Local-date math only, same rule as calendar.ts. Weeks start
// Monday, because the rest of the app already does.
// ============================================================

export type PeriodKind = 'week' | 'month' | 'quarter' | 'year'

export const PERIOD_KINDS: PeriodKind[] = ['week', 'month', 'quarter', 'year']

export interface PeriodBounds {
  kind: PeriodKind
  /** Stable across renders and safe to persist: 'w-2026-08-10', 'q-2026-3'. */
  id: string
  /** How the athlete reads it: 'Week of Aug 10', 'Q3 2026'. */
  label: string
  from: ISODate
  to: ISODate
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const parts = (iso: ISODate): [number, number, number] => {
  const [y, m, d] = iso.split('-').map(Number)
  return [y, m, d]
}

const firstOfMonth = (y: number, m: number): ISODate =>
  `${y}-${String(m).padStart(2, '0')}-01`

/** Last day of month m (1-based) in year y. Day 0 of the next month. */
const lastOfMonth = (y: number, m: number): ISODate => localISO(new Date(y, m, 0))

/** The period of `kind` that contains `date`. */
export function boundsFor(kind: PeriodKind, date: ISODate): PeriodBounds {
  const [y, m] = parts(date)
  if (kind === 'week') {
    const from = mondayOf(date)
    const [, fm, fd] = parts(from)
    return {
      kind,
      id: `w-${from}`,
      label: `Week of ${SHORT[fm - 1]} ${fd}`,
      from,
      to: addDaysISO(from, 6),
    }
  }
  if (kind === 'month') {
    return {
      kind,
      id: `m-${y}-${String(m).padStart(2, '0')}`,
      label: `${MONTHS[m - 1]} ${y}`,
      from: firstOfMonth(y, m),
      to: lastOfMonth(y, m),
    }
  }
  if (kind === 'quarter') {
    const q = Math.floor((m - 1) / 3) + 1
    return {
      kind,
      id: `q-${y}-${q}`,
      label: `Q${q} ${y}`,
      from: firstOfMonth(y, q * 3 - 2),
      to: lastOfMonth(y, q * 3),
    }
  }
  return {
    kind,
    id: `y-${y}`,
    label: String(y),
    from: `${y}-01-01`,
    to: `${y}-12-31`,
  }
}

/**
 * The most recent period of `kind` that has FINISHED as of `today`.
 *
 * One day back is all it takes: the day before a period's first day is
 * always inside the period before it, whatever its length. Doing it by
 * month arithmetic instead is how you end up reviewing February twice
 * on March 31st.
 */
export function lastClosed(kind: PeriodKind, today: ISODate): PeriodBounds {
  return boundsFor(kind, addDaysISO(boundsFor(kind, today).from, -1))
}

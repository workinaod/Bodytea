import type { ISODate, Weekday } from '../types'

// ============================================================
// Local-date math. No UTC anywhere: all keys are local
// "YYYY-MM-DD" strings and arithmetic is date-part based
// (new Date(y, m, d+n)), which is immune to DST shifts.
// Weeks start Monday.
// ============================================================

export function localISO(d: Date): ISODate {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function todayISO(): ISODate {
  return localISO(new Date())
}

export function toDate(iso: ISODate): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDaysISO(iso: ISODate, n: number): ISODate {
  const [y, m, d] = iso.split('-').map(Number)
  return localISO(new Date(y, m - 1, d + n))
}

export function weekdayOf(iso: ISODate): Weekday {
  return toDate(iso).getDay() as Weekday
}

/** Monday of the week containing `iso` (Monday-start weeks). */
export function mondayOf(iso: ISODate): ISODate {
  const wd = weekdayOf(iso)
  const delta = wd === 0 ? -6 : 1 - wd
  return addDaysISO(iso, delta)
}

/** Whole days from a to b (b - a). DST-immune via UTC-noon anchoring. */
export function daysBetween(a: ISODate, b: ISODate): number {
  const [ay, am, ad] = a.split('-').map(Number)
  const [by, bm, bd] = b.split('-').map(Number)
  const au = Date.UTC(ay, am - 1, ad)
  const bu = Date.UTC(by, bm - 1, bd)
  return Math.round((bu - au) / 86400000)
}

/**
 * 1-based week number since the phase start (a Monday).
 * Dates before the phase start clamp to week 1.
 */
export function weekIndexFor(dateISO: ISODate, phaseStartISO: ISODate): number {
  const days = daysBetween(mondayOf(phaseStartISO), mondayOf(dateISO))
  return Math.max(1, Math.floor(days / 7) + 1)
}

export function formatDayLabel(iso: ISODate): string {
  const d = toDate(iso)
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })
}

export function formatShort(iso: ISODate): string {
  return toDate(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function isToday(iso: ISODate): boolean {
  return iso === todayISO()
}

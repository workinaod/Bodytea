import type { AppData, ISODate } from '../types'
import { addDaysISO, daysBetween, mondayOf } from './calendar'
import { resolveDay } from './resolveDay'

// ============================================================
// Launch reconcile: every past scheduled day with neither a
// session log nor an excuse becomes a confrontation. Silence
// is impossible — that's the accountability contract.
// ============================================================

export interface MissedDay {
  date: ISODate
  templateId: string | null
  title: string
  cns: boolean
}

function isExcused(data: AppData, date: ISODate): boolean {
  return data.excuses.some((e) => {
    if (e.scope === 'day') return e.date === date
    // week-scope excuse: covers its whole Monday-week
    const weekMonday = mondayOf(e.date)
    return mondayOf(date) === weekMonday
  })
}

/**
 * Scheduled days strictly before `today` with no log and no excuse.
 * Looks back at most `maxDays` (and never before phase start).
 */
export function findUnexplainedMisses(
  data: AppData,
  today: ISODate,
  maxDays = 60,
): MissedDay[] {
  const out: MissedDay[] = []
  const start = data.settings.phaseStartDate
  for (let i = 1; i <= maxDays; i++) {
    const date = addDaysISO(today, -i)
    if (daysBetween(start, date) < 0) break
    const resolved = resolveDay(date, data)
    const scheduled =
      resolved.kind === 'session' || resolved.kind === 'mobility' || resolved.kind === 'cardio-backup'
    if (!scheduled) continue
    if (data.sessions[date]) continue
    if (isExcused(data, date)) continue
    out.push({
      date,
      templateId: resolved.templateId,
      title: resolved.title,
      cns: resolved.cns,
    })
  }
  return out.reverse() // oldest first
}

/** Group misses by week Monday — used for the bulk "that was a travel week" resolution. */
export function groupMissesByWeek(misses: MissedDay[]): Map<ISODate, MissedDay[]> {
  const map = new Map<ISODate, MissedDay[]>()
  for (const m of misses) {
    const monday = mondayOf(m.date)
    const arr = map.get(monday) ?? []
    arr.push(m)
    map.set(monday, arr)
  }
  return map
}

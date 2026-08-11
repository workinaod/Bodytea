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
 * Looks back at most `maxDays` (and never before phase start). Pass
 * `now` to honor the late-night window: before 03:00, yesterday is
 * still in play (startable under grace) and must not be flagged.
 */
export function findUnexplainedMisses(
  data: AppData,
  today: ISODate,
  maxDays = 60,
  now?: Date,
): MissedDay[] {
  const out: MissedDay[] = []
  const start = data.settings.phaseStartDate
  const installed = data.settings.installedAt
  for (let i = 1; i <= maxDays; i++) {
    if (i === 1 && now && now.getHours() < 3) continue
    const date = addDaysISO(today, -i)
    if (daysBetween(start, date) < 0) break
    // the app can't interrogate days from before it existed
    if (daysBetween(installed, date) < 0) break
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

// ---------- Rest-day make-up ----------

export interface MakeupCandidate {
  date: ISODate
  templateId: string
  title: string
  cns: boolean
}

/**
 * The first workout missed THIS week (Monday through yesterday): a
 * scheduled session/mobility day whose log is absent or skipped. A
 * week-scope excuse (travel/sick write-off) suppresses the offer; a
 * day-scope excuse does NOT — the excuse explained the miss, it didn't
 * do the work.
 */
export function makeupCandidate(data: AppData, today: ISODate): MakeupCandidate | null {
  const monday = mondayOf(today)
  const weekWrittenOff = data.excuses.some((e) => e.scope === 'week' && mondayOf(e.date) === monday)
  if (weekWrittenOff) return null
  for (let d = monday; d < today; d = addDaysISO(d, 1)) {
    if (daysBetween(data.settings.installedAt, d) < 0) continue
    const resolved = resolveDay(d, data)
    if (resolved.kind !== 'session' && resolved.kind !== 'mobility') continue
    if (!resolved.templateId) continue
    const s = data.sessions[d]
    if (s && s.status !== 'skipped') continue
    return { date: d, templateId: resolved.templateId, title: resolved.title, cns: resolved.cns }
  }
  return null
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

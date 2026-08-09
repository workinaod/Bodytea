import type { AppData, ISODate } from '../types'
import { addDaysISO, daysBetween, todayISO } from './calendar'
import { adherenceMap, currentStreak, liftSeries, proteinFor, totalSessions } from './stats'

// ============================================================
// Leaderboard stats, computed purely over AppData. `null` means
// "unranked — not enough data yet" and is shown as such locally;
// unranked metrics are pushed as 0 so they sit at the bottom.
// ============================================================

export interface MyBoardStats {
  streak: number
  /** % of scheduled days honored over 30 days; null under 8 scheduled. */
  consistency30: number | null
  /** Mean e1RM gain % across tracked lifts over 90 days; null without enough lift data. */
  prGain90: number | null
  /** % of logged meal days hitting the protein target; null under 10 logged. */
  protein30: number | null
  sessionsTotal: number
}

export function computeBoardStats(data: AppData, today: ISODate = todayISO()): MyBoardStats {
  // ---- Consistency: (done + half-credit partials) / everything scheduled ----
  const adher = adherenceMap(data, 30, today)
  let done = 0
  let partial = 0
  let scheduled = 0
  for (const d of adher) {
    if (d.state === 'done') done++
    else if (d.state === 'partial') partial++
    if (d.state === 'done' || d.state === 'partial' || d.state === 'skipped' || d.state === 'missed') scheduled++
  }
  const consistency30 = scheduled >= 8 ? round1(((done + 0.5 * partial) / scheduled) * 100) : null

  // ---- PR gains: first→best e1RM inside the 90-day window, per tracked lift ----
  const gains: number[] = []
  for (const { exerciseId } of data.plan.trackedLifts) {
    const window = liftSeries(data, exerciseId).filter(
      (p) => daysBetween(p.date, today) >= 0 && daysBetween(p.date, today) <= 90,
    )
    if (window.length < 3) continue
    if (daysBetween(window[0].date, window[window.length - 1].date) < 14) continue
    const first = window[0].e1rm
    const best = Math.max(...window.slice(1).map((p) => p.e1rm))
    if (first > 0) gains.push(((best - first) / first) * 100)
  }
  const prGain90 = gains.length ? round1(gains.reduce((s, g) => s + g, 0) / gains.length) : null

  // ---- Protein discipline: hit days / logged days over 30 ----
  let logged = 0
  let hit = 0
  for (let i = 0; i < 30; i++) {
    const date = addDaysISO(today, -i)
    const day = data.meals[date]
    if (!day || day.entries.length === 0) continue
    logged++
    if (proteinFor(data, date) >= data.settings.proteinTargetG) hit++
  }
  const protein30 = logged >= 10 ? round1((hit / logged) * 100) : null

  return {
    streak: currentStreak(data, today),
    consistency30,
    prGain90,
    protein30,
    sessionsTotal: totalSessions(data),
  }
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

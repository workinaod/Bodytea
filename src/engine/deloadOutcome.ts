import type { AppData, ISODate } from '../types'
import type { DecisionRecord, DecisionVerdict } from '../decisionTypes'
import { isAthleteAuthored } from '../plan/bookletOps'
import { addDaysISO, daysBetween, mondayOf } from './calendar'
import { decisionRow } from './decisions'
import {
  DELOAD_METRIC,
  DELOAD_RULE_VERSION,
  DELOAD_TYPE,
  DELOAD_WINDOW_DAYS,
} from './proposals'
import { blockMathFor } from './resolveDay'
import { liftSeries } from './stats'

// ============================================================
// Did the deload buy anything.
//
// It is the most expensive thing this app does: a whole week of reduced
// training, every fourth week, taken entirely on faith. Nothing could
// say whether it helped, and "we do this because programs do this" is
// not an answer a coach should be satisfied with.
//
// R3's test is rebound. If the week off the gas did its job, the best
// estimated one-rep max in the sessions after it beats the best in the
// sessions before it. Any exceedance counts, because the claim being
// tested is modest: that backing off let something recover.
//
// No rebound, with attendance fine, is a real and useful answer. It says
// scheduled deloads are not this athlete's bottleneck, and R3 sends that
// to the volume rung rather than to another deload.
//
// Nobody agrees to a deload, so there is no accept event and no row to
// judge. The row is manufactured afterwards by the same block math that
// scheduled the week, which is what keeps the trigger and the verdict
// pinnable by one golden test.
//
// Athlete-authored plans are skipped entirely. BodyT does not deload a
// routine somebody brought, so there is nothing here that it caused.
// ============================================================

/** Ignore a rebound smaller than this: it is the same lift twice. */
export const REBOUND_LB = 2.5

function bestE1rmBetween(data: AppData, from: ISODate, to: ISODate): number | null {
  let best: number | null = null
  for (const { exerciseId } of data.plan?.trackedLifts ?? []) {
    for (const p of liftSeries(data, exerciseId)) {
      if (p.date < from || p.date > to) continue
      if (best === null || p.e1rm > best) best = p.e1rm
    }
  }
  return best
}

/** Mondays of deload weeks whose after-window has fully elapsed. */
function settledDeloadWeeks(data: AppData, today: ISODate): ISODate[] {
  const phaseStart = data.settings?.phaseStartDate
  if (!phaseStart || isAthleteAuthored(data.plan)) return []
  const out: ISODate[] = []
  // Walk back a year of Mondays: enough for three full phases, and the
  // ledger stops anything being judged twice.
  for (let w = 1; w <= 52; w++) {
    const monday = mondayOf(addDaysISO(today, -w * 7))
    if (monday < phaseStart) break
    if (!blockMathFor(monday, phaseStart).isDeload) continue
    const weekEnd = addDaysISO(monday, 6)
    if (daysBetween(weekEnd, today) < DELOAD_WINDOW_DAYS) continue
    out.push(monday)
  }
  return out
}

/**
 * Judge every deload whose window has closed, and record what it found.
 *
 * Returns how many were settled. Rows already in the ledger are left
 * alone: a verdict is written once, and a correction is a new row.
 */
export function settleDeloads(data: AppData, today: ISODate): number {
  const already = new Set(
    (data.decisions ?? []).filter((d) => d.type === DELOAD_TYPE).map((d) => d.target),
  )
  const rows: DecisionRecord[] = []
  for (const monday of settledDeloadWeeks(data, today)) {
    if (already.has(monday)) continue
    const before = bestE1rmBetween(data, addDaysISO(monday, -DELOAD_WINDOW_DAYS), addDaysISO(monday, -1))
    const after = bestE1rmBetween(data, addDaysISO(monday, 7), addDaysISO(monday, 6 + DELOAD_WINDOW_DAYS))

    let verdict: DecisionVerdict
    if (before === null || after === null) verdict = 'abandoned'
    else if (after - before >= REBOUND_LB) verdict = 'worked'
    else if (before - after >= REBOUND_LB) verdict = 'worse'
    else verdict = 'no-change'

    rows.push({
      ...decisionRow({
        type: DELOAD_TYPE,
        // The week itself is the target, so two deloads never collide.
        target: monday,
        ruleVersion: DELOAD_RULE_VERSION,
        evidence: { beforeBestE1rm: before ?? 0, weekOf: monday },
        response: 'accepted',
        at: monday,
        seq: (data.decisions ?? []).length + rows.length,
      }),
      metricId: DELOAD_METRIC,
      windowDays: DELOAD_WINDOW_DAYS,
      windowClosesAt: addDaysISO(monday, 6 + DELOAD_WINDOW_DAYS),
      baseline: before ?? undefined,
      outcome: after ?? undefined,
      verdict,
    })
  }
  if (rows.length) data.decisions = [...(data.decisions ?? []), ...rows]
  return rows.length
}

/**
 * What the deload actually bought, said plainly, including nothing.
 *
 * Every line names the window it is about, and that is not decoration.
 * A verdict becomes visible 27 to 34 days after its deload started, and
 * the next deload starts on day 28, so this card lands almost entirely
 * inside the following deload week. The J8 review pass caught the screen
 * saying "DELOAD WEEK: sets halved" in lime and, directly beneath it,
 * "your lifts have not come back up since the deload week" about a
 * different week entirely. Anchoring each sentence three weeks AFTER the
 * week being judged makes that misreading impossible, because nobody is
 * three weeks after a week they are standing in.
 */
export function deloadVerdictCopy(row: DecisionRecord): string | null {
  if (row.type !== DELOAD_TYPE || !row.verdict) return null
  switch (row.verdict) {
    case 'worked':
      return `Three weeks after your last deload, your best lift was up on anything from the three weeks before it. That week off the gas did its job.`
    case 'no-change':
      return `Three weeks either side of your last deload, your best lift did not move. One is not a pattern, but if the next one does the same, what is holding you back is not fatigue.`
    case 'worse':
      return `Three weeks after your last deload, your best lift still had not come back up. Worth watching, because a deload is meant to leave you fresher, not flatter.`
    default:
      return null
  }
}

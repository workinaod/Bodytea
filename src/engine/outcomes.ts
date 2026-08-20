import type { AppData, ISODate } from '../types'
import type { DecisionRecord, DecisionVerdict } from '../decisionTypes'
import {
  ADAPT_GRADES_THAT_COUNT,
  ADAPT_METRIC,
  ADAPT_TYPE,
  STEP_METRIC,
  STEP_TYPE,
} from './proposals'
import { sessionGrade } from './stats'
import { daysBetween } from './calendar'
import { trendIsConfounded, weightTrend } from './userModel'

// ============================================================
// Did it work.
//
// The ledger records what was offered and what was answered. On its own
// that is a diary. This is the half that makes it evidence: every
// accepted intervention gets judged, on the metric and the window that
// were fixed BEFORE anyone knew the answer.
//
// Five rules from R3, and the fourth is the one that matters most.
//
//   PRE-REGISTER. The metric, the window and the number to beat are set
//   when the offer is accepted. An outcome chosen afterwards is a story.
//   That work happens at the offer site; this file only reads it.
//
//   ISOLATE. One open intervention per target. A second one on the same
//   target closes the first as unattributable, because two changes at
//   once means neither can be credited.
//
//   COMPARE LIKE WITH LIKE. Baseline and outcome are the same
//   measurement, taken the same way, either side of the window.
//
//   EVERY INTERVENTION MUST BE ABLE TO FAIL. If no observation could
//   mark it "did not work", it does not ship. This is the rule that
//   keeps a ledger from becoming a compliment generator, and the reason
//   `worse` and `no-change` are ordinary answers here rather than edge
//   cases.
//
//   REVERT IS SAID OUT LOUD. "That did not help, so it is back to how it
//   was" is the sentence that makes an app trustworthy. Silent reversion
//   is a bug.
//
// `unattributable` is a real and common verdict and is as easy to record
// as success. A ledger that can only say yes teaches the wrong thing.
// ============================================================

/**
 * A change smaller than this is the same reading twice.
 *
 * Weight trends are noisy; a hundredth of a pound a week is not a
 * result. HOUSE, and deliberately wider than the scale's precision.
 */
export const MEANINGFUL_TREND_DELTA = 0.2

/** Accepted, its window has closed, and nothing has judged it yet. */
export function dueForVerdict(data: AppData, today: ISODate): DecisionRecord[] {
  return (data.decisions ?? []).filter(
    (d) =>
      d.response === 'accepted' &&
      !d.verdict &&
      d.windowClosesAt !== undefined &&
      daysBetween(d.windowClosesAt, today) >= 0,
  )
}

/**
 * Was this row's outcome muddied by something else on the same target.
 *
 * Any later decision on the same target inside the window means two
 * things changed at once, and neither can be credited for what happened.
 */
function isolated(data: AppData, row: DecisionRecord): boolean {
  return !(data.decisions ?? []).some(
    (d) =>
      d.id !== row.id &&
      d.target === row.target &&
      d.offeredAt > row.offeredAt &&
      (row.windowClosesAt === undefined || d.offeredAt <= row.windowClosesAt),
  )
}

export interface Judged {
  row: DecisionRecord
  outcome: number
  verdict: DecisionVerdict
}

/**
 * The verdict on one accepted intervention, or null if it cannot be read.
 *
 * Computed by the same deterministic code that made the offer, which is
 * what lets a golden test pin the trigger and the verdict together.
 */
export function judge(data: AppData, row: DecisionRecord, today: ISODate): Judged | null {
  if (row.type === ADAPT_TYPE) return judgeAdapt(data, row)
  if (row.type !== STEP_TYPE) return null
  if (row.metricId !== STEP_METRIC || row.baseline === undefined) return null

  const trend = weightTrend(data, today)
  if (!trend) {
    // Nothing to read. Not a failure, and not a success either: the
    // athlete stopped weighing in, which is its own answer.
    return { row, outcome: Number.NaN, verdict: 'abandoned' }
  }
  if (!isolated(data, row) || trendIsConfounded(data)) {
    return { row, outcome: trend.value, verdict: 'unattributable' }
  }

  // The step was meant to move the trend toward the goal band. Which
  // direction counts as better is carried by the step itself: a negative
  // step was asking the scale to fall faster.
  const asked = Number(row.evidence.stepKcal ?? 0)
  const moved = trend.value - row.baseline
  if (Math.abs(moved) < MEANINGFUL_TREND_DELTA) {
    return { row, outcome: trend.value, verdict: 'no-change' }
  }
  const wanted = asked < 0 ? -1 : 1
  return { row, outcome: trend.value, verdict: Math.sign(moved) === wanted ? 'worked' : 'worse' }
}

/**
 * Did the sessions inside the window actually get done.
 *
 * R3 watches "day completed, and the next comparable session not short"
 * for a volume cut, and "the held ask is cleared next time" for a load
 * hold. Both come down to the same readable thing: sessions after the
 * change got finished at what was asked. Counted rather than averaged,
 * because one clean session out of three is not a fix.
 *
 * Nothing logged inside the window is `abandoned`, which is a different
 * answer from failure: an intervention nobody trained after tells you
 * about attendance, not about the intervention.
 */
function judgeAdapt(data: AppData, row: DecisionRecord): Judged | null {
  if (row.metricId !== ADAPT_METRIC || row.windowClosesAt === undefined) return null
  const counts = (g: string) => (ADAPT_GRADES_THAT_COUNT as readonly string[]).includes(g)

  const inWindow = Object.entries(data.sessions ?? {})
    .filter(([date, s]) => date >= row.offeredAt && date <= row.windowClosesAt! && s.status !== 'skipped')
    .sort(([a], [b]) => a.localeCompare(b))
  if (inWindow.length === 0) return { row, outcome: Number.NaN, verdict: 'abandoned' }
  if (!isolated(data, row)) return { row, outcome: inWindow.length, verdict: 'unattributable' }

  const done = inWindow.filter(([, s]) => counts(sessionGrade(s))).length
  const rate = Math.round((done / inWindow.length) * 100) / 100
  if (done === inWindow.length) return { row, outcome: rate, verdict: 'worked' }
  if (done === 0) return { row, outcome: rate, verdict: 'worse' }
  return { row, outcome: rate, verdict: 'no-change' }
}

/**
 * The row with its outcome written in.
 *
 * A decision accumulating its own outcome is that row's lifecycle, not an
 * edit: the ledger stays append-only in the sense that matters, which is
 * that a CORRECTION to a recorded verdict is a new row rather than a
 * rewrite of this one.
 */
export function settle(j: Judged): DecisionRecord {
  return { ...j.row, outcome: Number.isFinite(j.outcome) ? j.outcome : undefined, verdict: j.verdict }
}

/** Write the verdicts that are due. Returns how many were settled. */
export function settleDue(data: AppData, today: ISODate): number {
  const due = dueForVerdict(data, today)
  if (due.length === 0) return 0
  const byId = new Map(due.map((row) => [row.id, judge(data, row, today)]))
  data.decisions = (data.decisions ?? []).map((d) => {
    const j = byId.get(d.id)
    return j ? settle(j) : d
  })
  return [...byId.values()].filter(Boolean).length
}

/**
 * How long a settled verdict stays on screen.
 *
 * It expires on its own rather than needing a seen-flag: feedback about
 * something that finished three weeks ago is history, not news, and a
 * card that never leaves is the nagging this whole slice exists to stop.
 */
export const VERDICT_VISIBLE_DAYS = 7

/**
 * Did the last thing we tried on this target make it worse.
 *
 * Its own question because a rule that is about to propose more of the
 * same needs to know. Without it the screen said, in two cards at once,
 * "that did not help, back to where you were is a fair call" and "about
 * 250 kcal a day less would put you back in it".
 */
export function lastAttemptBackfired(data: AppData, target: string, today: ISODate): boolean {
  const judged = (data.decisions ?? []).filter(
    (d) => d.target === target && d.verdict !== undefined && d.windowClosesAt !== undefined,
  )
  const last = judged[judged.length - 1]
  if (!last?.windowClosesAt) return false
  const age = daysBetween(last.windowClosesAt, today)
  return last.verdict === 'worse' && age >= 0 && age <= VERDICT_VISIBLE_DAYS
}

/**
 * The verdict worth showing today, if there is one.
 *
 * `types` scopes it to the screen asking. Without that the food screen
 * would happily announce that trimming the sets did the job, because
 * judging is global and the freshest verdict is not always about the
 * thing the athlete is currently looking at.
 */
export function freshVerdict(data: AppData, today: ISODate, types?: readonly string[]): DecisionRecord | null {
  const fresh = (data.decisions ?? []).filter(
    (d) =>
      d.verdict &&
      (types === undefined || types.includes(d.type)) &&
      d.windowClosesAt !== undefined &&
      daysBetween(d.windowClosesAt, today) >= 0 &&
      daysBetween(d.windowClosesAt, today) <= VERDICT_VISIBLE_DAYS &&
      verdictCopy(d) !== null,
  )
  return fresh.length ? fresh[fresh.length - 1] : null
}

/**
 * What to tell the athlete, including when the answer is no.
 *
 * Null when there is nothing worth saying. A verdict of `worked` is worth
 * one line; `worse` is worth more, because that is the sentence people
 * remember an app for.
 */
export function verdictCopy(row: DecisionRecord): string | null {
  if (!row.verdict) return null
  if (row.type === ADAPT_TYPE) return adaptVerdictCopy(row)
  if (row.type !== STEP_TYPE) return null
  const step = Math.abs(Number(row.evidence.stepKcal ?? 0))
  switch (row.verdict) {
    case 'worked':
      return `That ${step} kcal change did what it was meant to. Your trend moved the way you wanted it to.`
    case 'no-change':
      return `Three weeks on, that ${step} kcal change moved your trend by almost nothing. Worth trying something other than food.`
    case 'worse':
      return `That ${step} kcal change did not help, and your trend went the other way. Back to where you were is a fair call.`
    case 'unattributable':
      return `Too much changed at once to say whether that ${step} kcal move did anything. Not a failure, just not readable.`
    case 'abandoned':
      return null
    default:
      return null
  }
}

/** The same honesty, about training rather than food. */
function adaptVerdictCopy(row: DecisionRecord): string | null {
  const what = row.target === 'reduce-volume' ? 'trimming the sets' : 'holding the weight'
  switch (row.verdict) {
    case 'worked':
      return `${what[0].toUpperCase()}${what.slice(1)} did the job. Every session since went the distance.`
    case 'no-change':
      return `${what[0].toUpperCase()}${what.slice(1)} helped some sessions and not others. Worth looking at what else is different on the hard days.`
    case 'worse':
      return `${what[0].toUpperCase()}${what.slice(1)} did not fix it. Sessions are still coming up short, so the problem is somewhere other than the size of the day.`
    case 'unattributable':
      return `Too much changed at once to say whether ${what} helped.`
    default:
      return null
  }
}

import type { AppData, ISODate, Weekday } from '../types'
import type { DecisionRecord } from '../decisionTypes'
import { addDaysISO, weekdayOf } from './calendar'
import { decisionRow, offerPolicy } from './decisions'
import { SCHEDULE_RULE_VERSION, SCHEDULE_TYPE } from './proposals'
import { DAY_NAME } from '../plan/words'

// ============================================================
// Moving a session to the day it actually happens on.
//
// The plan asks for Tuesday. The athlete trains Thursday, every week,
// and has done for a month. Nothing in the app ever noticed, so the plan
// went on being wrong in the same way indefinitely and the athlete went
// on "missing" a session they had in fact done.
//
// J7 built adherenceShape for exactly this and left it waiting: which
// days they TRAIN, read from the log rather than from the plan, because
// reading the plan would make it a mirror instead of a measurement.
//
// Suggest only. A plan is a promise somebody made to themselves and
// rewriting their week without asking is not a small liberty.
// ============================================================

/** How far back the shape is read. Four weeks, same as the user model. */
export const SCHEDULE_WINDOW_DAYS = 28

/** Times the plan asked and nothing happened, before it is a pattern. */
export const MISSES_TO_MOVE = 3

/** Times they trained on a day the plan leaves empty. */
export const HITS_TO_MOVE = 3

export interface SlotMove {
  from: Weekday
  to: Weekday
  templateId: string
  /** How the evidence stacked up, for the ledger and the card. */
  missed: number
  trained: number
}

/** Did real work happen on this date. */
function workedOn(data: AppData, date: ISODate): boolean {
  const s = data.sessions[date]
  if (!s || s.status === 'skipped') return false
  return s.exercises.some((ex) => !ex.skipped && ex.sets.some((x) => x.done))
}

/**
 * The move worth offering, if the last four weeks make one obvious.
 *
 * Tier 1 only. Tiers 2 and 3 are placements the athlete picks per week
 * rather than a standing schedule, so moving one would be answering a
 * question nobody asked.
 */
export function scheduleFitOffer(data: AppData, today: ISODate): SlotMove | null {
  if (!offerPolicy(data, SCHEDULE_TYPE, 'tier1', today).allowed) return null

  const missed = [0, 0, 0, 0, 0, 0, 0]
  const trained = [0, 0, 0, 0, 0, 0, 0]
  for (let i = 1; i <= SCHEDULE_WINDOW_DAYS; i++) {
    const date = addDaysISO(today, -i)
    const wd = weekdayOf(date)
    const asked = !!data.plan?.tier1ByWeekday?.[wd]
    const did = workedOn(data, date)
    if (asked && !did) missed[wd]++
    if (!asked && did) trained[wd]++
  }

  let worst: Weekday | null = null
  for (let wd = 0 as Weekday; wd < 7; wd = (wd + 1) as Weekday) {
    if (missed[wd] < MISSES_TO_MOVE) continue
    if (worst === null || missed[wd] > missed[worst]) worst = wd
  }
  let best: Weekday | null = null
  for (let wd = 0 as Weekday; wd < 7; wd = (wd + 1) as Weekday) {
    if (trained[wd] < HITS_TO_MOVE) continue
    if (best === null || trained[wd] > trained[best]) best = wd
  }
  if (worst === null || best === null) return null

  const templateId = data.plan.tier1ByWeekday[worst]
  if (!templateId) return null
  return { from: worst, to: best, templateId, missed: missed[worst], trained: trained[best] }
}

/**
 * Move the slot. Called only from an accepted offer, never on its own.
 *
 * A straight move rather than a swap: the day being left is empty by
 * definition (the offer only ever picks a `to` the plan does not use),
 * so there is nothing to trade back.
 */
export function applyScheduleMove(data: AppData, move: SlotMove): void {
  data.plan.tier1ByWeekday[move.to] = move.templateId
  data.plan.tier1ByWeekday[move.from] = null
}

export function scheduleDecision(
  move: SlotMove,
  response: 'accepted' | 'declined',
  at: ISODate,
  seq: number,
): DecisionRecord {
  return decisionRow({
    type: SCHEDULE_TYPE,
    target: 'tier1',
    ruleVersion: SCHEDULE_RULE_VERSION,
    evidence: { from: move.from, to: move.to, missed: move.missed, trained: move.trained },
    response,
    at,
    seq,
  })
}

/** Short, because it is a card. */
export function scheduleCopy(move: SlotMove): string {
  return `You have trained ${DAY_NAME[move.to]} ${move.trained} times and missed ${DAY_NAME[move.from]} ${move.missed}. Move the session?`
}

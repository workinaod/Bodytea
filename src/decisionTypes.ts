import type { ISODate } from './types'

// ============================================================
// Every suggestion the app made, and what came of it.
//
// Two holes this closes, and the second one is the reason it is first in
// R3's ship order.
//
// Nothing anywhere asks whether a suggestion WORKED. The app proposes a
// deload, a load drop, a calorie step, and then never looks back, so it
// cannot tell an intervention that helps from one that does nothing, and
// it never will until the offers are written down.
//
// And declines are discarded on purpose. That was defended as keeping a
// rejected suggestion from shaping next week, which is right about the
// PLAN and wrong about the CONVERSATION: with no record, the same
// proposal comes back tomorrow off the same evidence, and the app cannot
// tell somebody who disagreed from somebody who never saw it.
//
// Append-only. A row is never edited; a correction is a new row. That is
// what makes it evidence rather than state.
// ============================================================

export type DecisionResponse = 'accepted' | 'declined' | 'expired-unseen'

/**
 * How it turned out. `unattributable` is a real and common answer and is
 * recorded as readily as success, because a ledger that can only say yes
 * teaches the wrong thing.
 */
export type DecisionVerdict = 'worked' | 'no-change' | 'worse' | 'unattributable' | 'abandoned'

export interface DecisionRecord {
  id: string
  /** What was proposed: 'nutrition-recheck', 'calorie-step', 'deload'. */
  type: string
  /** What it was about, so two proposals of a kind can be told apart. */
  target: string
  /** Which version of the rule made the offer, so old rows stay readable. */
  ruleVersion: number
  /**
   * The evidence, as VALUES rather than prose: counts, dates, numbers.
   * A sentence cannot be compared against next month's sentence.
   */
  evidence: Record<string, number | string>
  offeredAt: ISODate
  response?: DecisionResponse
  respondedAt?: ISODate

  // ---- The outcome half. Written later, by the same code that made the
  // offer, so a golden test can pin the trigger and the verdict together.
  /** The one metric pre-registered before the outcome was known. */
  metricId?: string
  windowDays?: number
  windowClosesAt?: ISODate
  baseline?: number
  outcome?: number
  verdict?: DecisionVerdict
  revertTaken?: boolean
}

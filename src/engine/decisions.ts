import type { AppData, ISODate } from '../types'
import type { DecisionRecord } from '../decisionTypes'
import { daysBetween } from './calendar'
import { ADAPT_TYPE } from './proposals'

// ============================================================
// Saying no, and being heard.
//
// Declines used to leave no trace at all. That was a deliberate choice
// and it was half right: a rejected suggestion must not quietly reshape
// next week's plan. But it was applied to the wrong thing. With nothing
// recorded, the same proposal comes back tomorrow off the same evidence,
// and the app cannot tell somebody who disagreed from somebody who never
// saw the card. Four days of that and a person stops reading any of them.
//
// So the decline is stored, and only the OFFERING POLICY reads it.
// Nothing here touches a load, a volume, a calorie target or a safety
// rule. This is a file about manners.
//
// Three rungs, and they get quieter:
//
//   Say no once, and that proposal is gone for a fortnight.
//   Unless the evidence genuinely got worse, in which case it may come
//   back early and has to say what changed.
//   Say no three times to the same thing and it stops for two months and
//   becomes a stated preference. Four is nagging in any language.
// ============================================================

/** One no buys a fortnight of quiet. */
export const DECLINE_COOLDOWN_DAYS = 14

/** After this many, it is not a misunderstanding. */
export const DECLINES_BEFORE_BACKOFF = 3

/** How long the app stays out of the way once it has been told properly. */
export const BACKOFF_DAYS = 56

/**
 * Evidence that got worse, not merely different.
 *
 * Three things count, and nothing else does.
 *
 * A number that doubled, or a signal that was not there before: R3's own
 * examples are a pain count going 2 to 4 and a new kind of signal
 * joining, and both are cases where re-asking is coaching rather than
 * pestering.
 *
 * And a signed number that crossed zero, which doubling cannot see. An
 * athlete on a cut who was losing 0.4 lb a week and is now GAINING 0.6 is
 * plainly in a different situation, but 0.6 is not twice 0.4, so the
 * first version of this rule stayed silent through exactly the change
 * most worth mentioning. A metric changing sign is a change in kind.
 *
 * Anything softer than these is noise wearing a reason.
 */
function evidenceStrengthened(
  then: DecisionRecord['evidence'],
  now: DecisionRecord['evidence'],
): boolean {
  for (const [k, v] of Object.entries(now)) {
    if (!(k in then)) return true
    const was = then[k]
    if (typeof v !== 'number' || typeof was !== 'number' || v === was) continue
    // Zero is handled first and on purpose. Left to the doubling test it
    // decides by accident, because any number at all clears zero times
    // two, and "nothing became something" would have been true for a
    // step size moving off a floor as readily as for a first twinge.
    if (was === 0) return v !== 0 // something started
    if (v === 0) continue // something stopped: better, and not a reason to re-ask
    if (Math.abs(v) >= Math.abs(was) * 2) return true
    if (Math.sign(v) !== Math.sign(was)) return true
  }
  return false
}

/** Every decline of one proposal, oldest first. */
function declinesOf(data: AppData, type: string, target: string): DecisionRecord[] {
  return (data.decisions ?? []).filter(
    (d) => d.type === type && d.target === target && d.response === 'declined',
  )
}

export interface OfferPolicy {
  allowed: boolean
  /** Set when it is allowed early because the evidence got worse. */
  returningBecauseWorse?: boolean
  /** How many times this exact proposal has been turned down. */
  declines: number
}

/**
 * May this proposal be shown at all.
 *
 * `evidence` is what the rule would show TODAY. Passing it is what lets a
 * genuinely worsening situation through the cooldown; leave it out and
 * the cooldown is absolute.
 */
export function offerPolicy(
  data: AppData,
  type: string,
  target: string,
  today: ISODate,
  evidence?: DecisionRecord['evidence'],
): OfferPolicy {
  const declines = declinesOf(data, type, target)
  if (declines.length === 0) return { allowed: true, declines: 0 }

  const last = declines[declines.length - 1]
  const since = daysBetween(last.respondedAt ?? last.offeredAt, today)

  // Told properly. Stay out of the way, and no evidence gets past this:
  // somebody who has said no three times is not waiting to be persuaded.
  if (declines.length >= DECLINES_BEFORE_BACKOFF) {
    return { allowed: since >= BACKOFF_DAYS, declines: declines.length }
  }

  if (since >= DECLINE_COOLDOWN_DAYS) return { allowed: true, declines: declines.length }

  if (evidence && evidenceStrengthened(last.evidence, evidence)) {
    return { allowed: true, returningBecauseWorse: true, declines: declines.length }
  }
  return { allowed: false, declines: declines.length }
}

/**
 * The row to append when somebody answers a card.
 *
 * A builder, not a writer: the engine never mutates, and the screen
 * appends what this returns. The id is derived rather than random so a
 * test can pin a whole ledger.
 */
export function decisionRow(a: {
  type: string
  target: string
  ruleVersion: number
  evidence: DecisionRecord['evidence']
  response: DecisionRecord['response']
  at: ISODate
  seq: number
}): DecisionRecord {
  return {
    id: `${a.type}:${a.target}:${a.at}:${a.seq}`,
    type: a.type,
    target: a.target,
    ruleVersion: a.ruleVersion,
    evidence: a.evidence,
    offeredAt: a.at,
    response: a.response,
    respondedAt: a.at,
  }
}

/** Append-only: a row is never edited, and a correction is a new row. */
export function appendDecision(data: AppData, row: DecisionRecord): void {
  data.decisions = [...(data.decisions ?? []), row]
}

/** What to say when a proposal comes back early because things got worse. */
export function returningCopy(p: OfferPolicy): string {
  return p.returningBecauseWorse
    ? 'You said no to this recently. Bringing it back because the evidence got stronger, not because I forgot.'
    : ''
}

/**
 * The ledger row for an answer to a training proposal.
 *
 * Here rather than in the action that writes it, for the same reason the
 * calorie step's row builder lives beside its rule: a row composed at the
 * call site is a row no test can reach, which is how a rule version went
 * unpinned until a probe found it.
 */
export function adaptDecision(a: {
  choice: string
  response: DecisionRecord['response']
  evidence: DecisionRecord['evidence']
  at: ISODate
  windowClosesAt: ISODate
  ruleVersion: number
  metricId: string
  seq: number
}): DecisionRecord {
  const row = decisionRow({
    type: ADAPT_TYPE,
    target: a.choice,
    ruleVersion: a.ruleVersion,
    evidence: a.evidence,
    response: a.response,
    at: a.at,
    seq: a.seq,
  })
  if (a.response !== 'accepted') return row
  return { ...row, metricId: a.metricId, windowClosesAt: a.windowClosesAt }
}

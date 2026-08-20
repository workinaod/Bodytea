import type { AppData, ISODate } from '../types'
import type { DecisionRecord } from '../decisionTypes'
import type { SessionLog } from '../sessionTypes'
import { decisionRow, offerPolicy } from './decisions'
import { READY_FLAGS_TO_DOWNGRADE, READY_RULE_VERSION, READY_TARGET, READY_TYPE } from './proposals'

// ============================================================
// Whether this athlete's readiness flags are worth acting on.
//
// Two of four flags dials the day back: a set off every lift, lighter
// weights, a third less jumping. Right for most people. For somebody who
// sleeps badly and has sore legs most Mondays it fires on an ordinary
// week, cuts a session that would have been fine, and does it again next
// Monday, forever, because nothing was watching what happened after.
//
// R3 s9.2 makes this pattern-level and nothing else. A single downgrade
// says nothing: people have bad days. A downgrade FOLLOWED by a
// completed day and a normal next session was one nobody needed, and
// enough of those is a fact about the flags rather than about the week.
//
// The answer is an offer, never an edit. Turning down the weight the app
// gives somebody's own answers is not a call it makes by itself.
// ============================================================

/** Unneeded downgrades before the app will raise the subject. */
export const DOWNGRADES_BEFORE_EASING = 4

/** Flags needed once the athlete has taken the offer. */
export const EASED_FLAGS_TO_DOWNGRADE = READY_FLAGS_TO_DOWNGRADE + 1

const done = (s: SessionLog) =>
  s.status === 'completed' || s.status === 'downgraded-completed' || !!s.endedAt

function logs(data: AppData, today: ISODate): SessionLog[] {
  return Object.values(data.sessions)
    .filter((s) => s.date <= today && s.status !== 'skipped')
    .sort((a, b) => (a.date < b.date ? -1 : 1))
}

/**
 * Downgrades this athlete turned out not to need.
 *
 * R3's test, both halves: the dialled-back day was finished, AND the next
 * session after it was normal. Either half alone is not evidence. A day
 * somebody completed but then followed with another downgrade is a
 * genuinely rough patch, which is exactly what the flags are for.
 */
function unneeded(data: AppData, today: ISODate): SessionLog[] {
  const all = logs(data, today)
  const out: SessionLog[] = []
  for (let i = 0; i < all.length; i++) {
    const s = all[i]
    if (!s.readiness?.downgraded || !done(s)) continue
    const next = all[i + 1]
    if (!next || next.readiness?.downgraded) continue
    out.push(s)
  }
  return out
}

/** Whether the athlete has taken the offer to ease the threshold. */
function eased(data: AppData): boolean {
  return (data.decisions ?? []).some((d) => d.type === READY_TYPE && d.response === 'accepted')
}

/** Flags out of four that dial today back, for this athlete. */
export function downgradeThreshold(data: AppData): number {
  return eased(data) ? EASED_FLAGS_TO_DOWNGRADE : READY_FLAGS_TO_DOWNGRADE
}

export interface EarlyFlags {
  /** Downgrades that were followed by a completed day and a normal next. */
  count: number
}

/** Worth raising the subject today, if it is. */
export function earlyFlagOffer(data: AppData, today: ISODate): EarlyFlags | null {
  if (eased(data)) return null
  const count = unneeded(data, today).length
  if (count < DOWNGRADES_BEFORE_EASING) return null
  if (!offerPolicy(data, READY_TYPE, READY_TARGET, today).allowed) return null
  return { count }
}

export function readinessDecision(
  offer: EarlyFlags,
  response: 'accepted' | 'declined',
  at: ISODate,
  seq: number,
): DecisionRecord {
  return decisionRow({
    type: READY_TYPE,
    target: READY_TARGET,
    ruleVersion: READY_RULE_VERSION,
    evidence: { unneededDowngrades: offer.count },
    response,
    at,
    seq,
  })
}

/** Short, because it is a card. */
export function earlyFlagCopy(o: EarlyFlags): string {
  return `${o.count} dialled-back days went fine and so did the day after. Only dial back when it is really bad?`
}

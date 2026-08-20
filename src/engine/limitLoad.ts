import type { AppData, ISODate } from '../types'
import type { DecisionRecord } from '../decisionTypes'
import { MOVEMENT, type Joint } from '../plan/movement'
import { loadStepLb } from './reps'
import { decisionRow, offerPolicy } from './decisions'
import { LIMIT_RULE_VERSION, LIMIT_TYPE } from './proposals'

// ============================================================
// Giving back load somebody earned.
//
// A stated limitation has no expiry, deliberately: an injury you typed
// in should not evaporate because you went quiet for a fortnight. The
// cost was that it never ended either. Tell the app about a knee at
// signup and every movement loading it drops to 85% and stays there,
// through however many pain-free months follow, with nothing that could
// ever hand the weight back.
//
// R3 s9.2: three clean exposures buys ONE step, offered and never taken
// automatically, and any pain note stops the whole thing for good.
//
// Per JOINT rather than per movement, because that is what the athlete
// actually told us about and what the reduce-load adjustment already
// works on. A movement loading two limited joints gets the smaller of
// the two allowances, which is the safe way round.
// ============================================================

/** Pain-free sessions on the joint before another step is offered. */
export const CLEAN_EXPOSURES_FOR_STEP = 3

/** Sessions in date order, oldest first, ignoring skips and the future. */
function sessionsUpTo(data: AppData, today: ISODate) {
  return Object.values(data.sessions)
    .filter((s) => s.date <= today && s.status !== 'skipped')
    .sort((a, b) => (a.date < b.date ? -1 : 1))
}

/** Every joint a session's pain notes point at. */
function painJoints(s: { fatigue?: { exerciseId: string; reason: string }[] }): Set<Joint> {
  const out = new Set<Joint>()
  for (const n of s.fatigue ?? []) {
    if (n.reason !== 'pain') continue
    for (const j of MOVEMENT[n.exerciseId]?.stress ?? []) out.add(j)
  }
  return out
}

/** Accepted steps on this joint, oldest first. */
function stepsTaken(data: AppData, joint: Joint): DecisionRecord[] {
  return (data.decisions ?? []).filter(
    (d) => d.type === LIMIT_TYPE && d.target === joint && d.response === 'accepted',
  )
}

/**
 * Has this joint complained since the app started handing weight back.
 *
 * R3 is unambiguous: any pain note and it stays down. Permanent rather
 * than a cooldown, because this is an injury the athlete told us about,
 * and the app going quiet for six weeks before trying the same thing
 * again is not what "stay down" means.
 */
function flaredSinceFirstStep(data: AppData, joint: Joint, today: ISODate): boolean {
  const steps = stepsTaken(data, joint)
  if (!steps.length) return false
  const from = steps[0].respondedAt ?? steps[0].offeredAt
  return sessionsUpTo(data, today).some((s) => s.date > from && painJoints(s).has(joint))
}

/**
 * How many steps of load this movement has earned back.
 *
 * Zero unless every limited joint it loads has earned one, which is why
 * this is a min and not a max: a split squat that loads a good hip and a
 * bad knee moves at the knee's pace.
 */
function stepsBackFor(data: AppData, exerciseId: string, today: ISODate): number {
  const limited = new Set((data.prefs?.limitations ?? []).flatMap((l) => l.joints))
  const mine = (MOVEMENT[exerciseId]?.stress ?? []).filter((j) => limited.has(j))
  if (!mine.length) return 0
  let least = Infinity
  for (const j of mine) {
    least = Math.min(least, flaredSinceFirstStep(data, j, today) ? 0 : stepsTaken(data, j).length)
  }
  return least === Infinity ? 0 : least
}

/** Pounds to add back on this movement today. */
export function loadBackLb(data: AppData, exerciseId: string, today: ISODate): number {
  return stepsBackFor(data, exerciseId, today) * loadStepLb(exerciseId)
}

export interface LimitStep {
  joint: Joint
  /** The athlete's own words for it, shown back to them. */
  label: string
  /** Clean exposures standing behind the offer. */
  clean: number
}

/**
 * The joint worth offering a step back on today, if there is one.
 *
 * Counts exposures since the last step rather than since the limitation,
 * so each step has to be earned on its own evidence instead of one good
 * month buying four of them at once.
 */
export function limitStepOffer(data: AppData, today: ISODate): LimitStep | null {
  for (const lim of data.prefs?.limitations ?? []) {
    for (const joint of lim.joints) {
      if (flaredSinceFirstStep(data, joint, today)) continue
      const steps = stepsTaken(data, joint)
      const from = steps.length ? (steps[steps.length - 1].respondedAt ?? steps[steps.length - 1].offeredAt) : lim.since
      let clean = 0
      let flared = false
      for (const s of sessionsUpTo(data, today)) {
        if (s.date <= from) continue
        const loaded = s.exercises.some((e) =>
          !e.skipped && (MOVEMENT[e.exerciseId]?.stress ?? []).includes(joint) && e.sets.some((x) => x.done),
        )
        if (!loaded) continue
        if (painJoints(s).has(joint)) { flared = true; break }
        clean++
      }
      if (flared || clean < CLEAN_EXPOSURES_FOR_STEP) continue
      // A no is a no for a fortnight, same ladder as every other offer.
      if (!offerPolicy(data, LIMIT_TYPE, joint, today).allowed) continue
      return { joint, label: lim.label, clean }
    }
  }
  return null
}

/** The ledger row for an answer to the offer. */
export function limitStepDecision(
  step: LimitStep,
  response: 'accepted' | 'declined',
  at: ISODate,
  seq: number,
): DecisionRecord {
  return decisionRow({
    type: LIMIT_TYPE,
    target: step.joint,
    ruleVersion: LIMIT_RULE_VERSION,
    evidence: { cleanExposures: step.clean },
    response,
    at,
    seq,
  })
}

/** Short, because it is a card. */
export function limitStepCopy(step: LimitStep): string {
  return `Your ${step.joint.replace('-', ' ')} has been quiet for ${step.clean} sessions. Want a bit of weight back on it?`
}

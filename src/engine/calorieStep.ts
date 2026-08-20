import type { AppData, ISODate } from '../types'
import { bodyweightHeuristicKcal, DEFAULT_SESSIONS_PER_WEEK, maintenanceKcal } from '../plan/bmr'
import { MAX_DEFICIT, MIN_KCAL_TRAINING } from '../plan/kcalFloor'
import { addDaysISO } from './calendar'
import { decisionRow, offerPolicy } from './decisions'
import { lastAttemptBackfired } from './outcomes'
import { STEP_METRIC, STEP_RULE_VERSION, STEP_TARGET, STEP_TYPE, STEP_WINDOW_DAYS } from './proposals'
import { KCAL_PER_LB_TISSUE, weeklyGainRangeLb, weeklyLossRangeLb } from '../plan/sportsNutrition'
import { learnedMaintenance } from './maintenanceLearned'
import { nutritionInputsNow } from './nutritionRecheck'
import { kcalBumpSuggestion } from './stats'
import { TREND_WINDOW_DAYS, trendIsConfounded, weightTrend } from './userModel'

// ============================================================
// The scale is the truth serum. Nothing was drinking it.
//
// Every calorie number this app produces is a model's opening bid: an
// equation, an activity multiplier, a goal adjustment. All of that is
// prediction. The measured weight trend is the only thing in the system
// that knows what actually happened, and until this file it adjusted
// nothing. Somebody could hold a target for two months, lose nothing, and
// the app would keep printing the same number with the same confidence.
//
// The rule, from R1 section 4.2:
//
//   Compare the smoothed trend against the band the goal asks for.
//   If it misses, the static 3,500 kcal per pound convention says the
//   correction is (miss in lb/wk) x 500 kcal/day.
//   Apply HALF of that, clamped to 100 to 250, rounded to 50.
//
// The halving and the clamp are not timidity, they are the sourced
// limitations of the convention itself. It is a static rule: bodies
// offset deficits, so it overestimates long-run loss by well over half
// at a year, and the maintenance that a cut is measured against keeps
// falling as the cut goes on. It is only ever a step size between two
// measurements, never a forecast, and a step that is too small costs a
// fortnight while a step that is too big costs trust.
//
// Two more things it will not do. It will not act on a trend the app
// knows is confounded, because creatine water is not fat. And it will
// not step a target that a person set themselves without saying so.
//
// Suggest only. Nothing here writes.
// ============================================================

/** Half the static correction, because the static rule runs hot. */
export const STEP_FRACTION = 0.5

export const STEP_MIN = 100
export const STEP_MAX = 250

/** Never adjust on a fortnight of noise. */
const MIN_DAYS_OF_TREND = 14
const MIN_WEIGH_INS = 3



export { STEP_METRIC, STEP_RULE_VERSION, STEP_TARGET, STEP_TYPE, STEP_WINDOW_DAYS } from './proposals'

export interface CalorieStep {
  /** Signed kcal/day, rounded to 50. Negative means eat less. */
  stepKcal: number
  /** What the scale is actually doing, lb/wk. */
  trendLbPerWeek: number
  /** What this goal asks for, lb/wk, signed the same way. */
  band: [number, number]
  /** The target this steps from, and what it becomes. */
  fromKcal: number
  toKcal: number
  /** 'slow' means the goal is not happening fast enough, 'fast' too fast. */
  miss: 'slow' | 'fast'
  /** The values behind it, as they go into the ledger. */
  evidence: Record<string, number>
  /** Declined before, back early because the evidence worsened. */
  returningBecauseWorse: boolean
}

const round50 = (n: number) => Math.round(n / 50) * 50

/**
 * The step this athlete's own scale is asking for, or nothing.
 *
 * Null is the common answer and the correct one: inside the band, not
 * enough history, a confounded trend, or a goal with no band at all.
 */
export function calorieStep(data: AppData, today: ISODate): CalorieStep | null {
  const goal = data.plan?.goal
  const fromKcal = data.plan?.nutrition?.kcalTraining
  if (!goal || !fromKcal) return null
  if (goal !== 'lean' && goal !== 'muscle') return null

  // A flat scale with strength climbing is not a stalled cut, it is a
  // recomp, and it is the one reading where "you are losing too slowly"
  // is exactly wrong. That signal is older than this rule and better
  // evidence than the scale alone, so it wins.
  //
  // Without this the same athlete saw both cards at once: add 150 to 200
  // kcal from one, take 250 away from the other.
  if (kcalBumpSuggestion(data)) return null

  // The last change on this target was judged and it made things worse.
  // Proposing more of the same, in the same breath as a card saying "back
  // to where you were is a fair call", is the app arguing with itself.
  // Stand down and let the revert stand; R3 escalates on failure rather
  // than repeating.
  if (lastAttemptBackfired(data, STEP_TARGET, today)) return null

  const trend = weightTrend(data, today)
  // A trend the app knows is distorted is not evidence. Creatine pulls
  // water on and lets it go, and neither direction is energy balance.
  if (trendIsConfounded(data)) return null
  if (!trend || trend.samples < MIN_WEIGH_INS) return null

  // Span measured INSIDE the trend window. Reading it off all history let
  // a weigh-in from last spring vouch for a fortnight that contained
  // three readings in two days, which is the same defect the trend itself
  // had and the same one learnedMaintenance had.
  const weighed = (data.measurements ?? []).filter(
    (m) => typeof m.weightLb === 'number' && m.date > addDaysISO(today, -TREND_WINDOW_DAYS) && m.date <= today,
  )
  const first = weighed[0]?.date
  const last = weighed[weighed.length - 1]?.date
  if (!first || !last) return null
  const days = (Date.parse(last) - Date.parse(first)) / 86_400_000
  if (days < MIN_DAYS_OF_TREND) return null

  const now = nutritionInputsNow(data, today)
  const bw = now.bodyweightLb
  if (bw === null) return null

  // Bands are stated as magnitudes; a cut's is a loss, so it is negative.
  const [lo, hi] = goal === 'lean' ? weeklyLossRangeLb(bw) : weeklyGainRangeLb(bw)
  const band: [number, number] = goal === 'lean' ? [-hi, -lo] : [lo, hi]

  const rate = trend.value
  if (rate >= band[0] && rate <= band[1]) return null
  const miss = goal === 'lean' ? (rate > band[1] ? 'slow' : 'fast') : rate < band[0] ? 'slow' : 'fast'
  const missLbPerWeek = rate > band[1] ? rate - band[1] : rate - band[0]

  // The static correction, halved and clamped. Sign follows the miss:
  // losing too slowly means eating less, gaining too slowly means more.
  const magnitude = Math.min(
    STEP_MAX,
    Math.max(STEP_MIN, Math.abs(missLbPerWeek) * KCAL_PER_LB_TISSUE * STEP_FRACTION / 7),
  )
  const stepKcal = round50(magnitude) * (missLbPerWeek > 0 ? -1 : 1)

  // The floors and the deficit cap outrank the scale, every time, and
  // both are measured against maintenance. Use the LEARNED number when
  // there is enough evidence for one: the cap exists to stop a deficit
  // going too deep, and "too deep" is relative to what this body actually
  // costs to run, not to what the equations predicted before it started
  // adapting. Falls back to the model, computed from the same inputs the
  // rest of the nutrition engine uses rather than a second gathering.
  const maintenance =
    learnedMaintenance(data, today)?.kcal ??
    maintenanceKcal(
      { bodyweightLb: bw, sex: now.sex, heightIn: now.heightIn, ageYears: now.ageYears, bodyFatPct: now.bodyFatPct },
      { sessionsPerWeek: now.sessionsPerWeek ?? DEFAULT_SESSIONS_PER_WEEK },
      bodyweightHeuristicKcal(bw, now.sex, now.heightIn),
    ).kcal
  const floor = Math.max(MIN_KCAL_TRAINING, Math.round(maintenance * (1 - MAX_DEFICIT)))
  const toKcal = Math.max(floor, fromKcal + stepKcal)
  // Already at the floor: the pace has to move, not the food.
  if (toKcal === fromKcal) return null

  const evidence = { stepKcal: toKcal - fromKcal, trendLbPerWeek: rate, fromKcal }
  // Somebody who has already said no to this does not get asked again
  // tomorrow. The exception is evidence that genuinely got worse, which
  // is why today's numbers are handed to the policy rather than just the
  // question. See engine/decisions.ts.
  const policy = offerPolicy(data, STEP_TYPE, STEP_TARGET, today, evidence)
  if (!policy.allowed) return null

  return {
    stepKcal: toKcal - fromKcal,
    trendLbPerWeek: rate,
    band,
    fromKcal,
    toKcal,
    miss,
    evidence,
    returningBecauseWorse: policy.returningBecauseWorse === true,
  }
}

/** Why the number is moving, in the athlete's own evidence. */
export function stepCopy(s: CalorieStep): string {
  const rate = Math.abs(s.trendLbPerWeek).toFixed(2)
  const dir = s.trendLbPerWeek < 0 ? 'down' : 'up'
  const want = `${Math.abs(s.band[0]).toFixed(2)} to ${Math.abs(s.band[1]).toFixed(2)} lb a week`
  const move = s.stepKcal < 0 ? 'less' : 'more'
  return (
    `Your scale says ${rate} lb a week ${dir} over the last few weeks, and this goal wants ${want}. ` +
    `About ${Math.abs(s.stepKcal)} kcal a day ${move} would put you back in it. ` +
    `Small on purpose: a step this size is a nudge between weigh-ins, not a prediction.`
  )
}

/**
 * The ledger row for an answer to this card.
 *
 * Here rather than in the screen because a screen composing a ledger row
 * inline is a row no test can reach: the rule version went unpinned until
 * a review probe set it to 7 and nothing went red. One place knows what
 * this proposal looks like written down.
 */
export function stepDecision(
  s: CalorieStep,
  response: 'accepted' | 'declined',
  at: ISODate,
  seq: number,
) {
  const row = decisionRow({
    type: STEP_TYPE,
    target: STEP_TARGET,
    ruleVersion: STEP_RULE_VERSION,
    evidence: s.evidence,
    response,
    at,
    seq,
  })
  if (response !== 'accepted') return row
  // Pre-registered here and nowhere else: the metric, the window and the
  // number to beat are all fixed at the moment the athlete says yes.
  return {
    ...row,
    metricId: STEP_METRIC,
    windowDays: STEP_WINDOW_DAYS,
    windowClosesAt: addDaysISO(at, STEP_WINDOW_DAYS),
    baseline: s.trendLbPerWeek,
  }
}

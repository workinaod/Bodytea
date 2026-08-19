import { heightAdjustmentKcal, toKg } from './sportsNutrition'

// ============================================================
// What this body actually burns, from what we actually know about it.
//
// The app has been running every calorie target off bodyweight times
// fifteen (fourteen for women). That number has no study behind it. It
// has no age term, so a 45 year old and a 22 year old at the same weight
// are handed the same maintenance. It scales linearly with total mass,
// so it inflates badly at the top: a 320 lb man is told 4,800 kcal is
// his maintenance when two validated equations put him near 3,000.
// Telling somebody to eat 1,800 calories more than they burn, while they
// are asking for help losing weight, is the worst thing this file could
// do, and until this commit it was what it did.
//
// Meanwhile the app already knew better and never asked itself. Age is
// collected in onboarding and read by exactly one screen. Body fat has a
// whole tape-measure flow behind it, with step-by-step instructions and a
// Navy-formula estimator, and it feeds the progress chart and nothing
// else. Two collected answers, both of them the exact input a validated
// equation wants, both ignored by the number they were collected for.
//
// So: three models, best first, and the app uses the best one it has the
// inputs for.
//
//   Katch-McArdle, when a usable tape reading exists. A body-composition
//   equation beats a weight-based one in anyone lean or muscular, which
//   is most of the people who use this.
//
//   Mifflin-St Jeor, when height and age exist. The ADA review put it
//   within 10% of measured resting energy more often than anything else
//   compared.
//
//   Bodyweight times fifteen, when we know nothing else. Unchanged, so
//   nobody's number moves without new information, and flagged so the
//   explain layer can say out loud that it is a rough opening bid and
//   what would sharpen it.
//
// The first two return RESTING energy, so they need an activity
// multiplier on top. The third is already a maintenance estimate with an
// unstated activity level baked in, which is one more reason it is last.
//
// Activity follows R1's architecture (a): the multiplier covers
// non-training life only, and a session's own cost is added on the day it
// happens. The alternative is one blended weekly multiplier that includes
// training, and mixing the two is how you count a workout twice.
//
// Every number is only the opening bid. The measured weight trend is the
// truth serum and overrides all of this once it exists.
//
// Constants and citations: plan/bmr.refs.ts, sourced from
// research/R1-nutrition.md section 2 and 3.
// ============================================================

export type BmrModel = 'katch-mcardle' | 'mifflin-st-jeor' | 'bodyweight'

/** The onboarding answer to "most days, are you sitting or moving?". */
export type DayMovement = 'Sitting' | 'On my feet' | 'Always moving'

// ---------------- The equations ----------------

/** Cunningham 1991, the one the fitness world calls Katch-McArdle. */
export const CUNNINGHAM_INTERCEPT = 370
export const CUNNINGHAM_PER_KG_FFM = 21.6

/** Mifflin-St Jeor 1990. */
export const MIFFLIN_PER_KG = 10
export const MIFFLIN_PER_CM = 6.25
export const MIFFLIN_PER_YEAR = -5
export const MIFFLIN_SEX_OFFSET: Record<'male' | 'female', number> = { male: 5, female: -161 }

/** The house heuristic, kept only as the last branch. */
export const KCAL_PER_LB: Record<'male' | 'female', number> = { male: 15, female: 14 }

/**
 * What every athlete got before the model chain existed.
 *
 * Both nutrition paths computed this line themselves and had already
 * drifted apart once, which is the same failure plan/kcalFloor.ts exists
 * to stop. One definition, so the fallback cannot fork again.
 */
export function bodyweightHeuristicKcal(bodyweightLb: number, sex?: 'male' | 'female', heightIn?: number): number {
  return Math.round((bodyweightLb * KCAL_PER_LB[sex ?? 'male']) / 50) * 50 + heightAdjustmentKcal(heightIn, sex)
}

const CM_PER_IN = 2.54

/**
 * Fat-free mass in kg.
 *
 * Returns null rather than a number when the body-fat figure is outside
 * what a tape can honestly produce, because a bad FFM is worse than no
 * FFM: it looks like the good model and answers with the wrong number.
 */
function ffmKg(bodyweightLb: number, bodyFatPct: number): number | null {
  if (!(bodyFatPct >= 3 && bodyFatPct <= 60)) return null
  if (!(bodyweightLb > 0)) return null
  return toKg(bodyweightLb) * (1 - bodyFatPct / 100)
}

function katchMcArdle(ffm: number): number {
  return CUNNINGHAM_INTERCEPT + CUNNINGHAM_PER_KG_FFM * ffm
}

function mifflinStJeor(a: {
  bodyweightLb: number
  heightIn: number
  ageYears: number
  sex?: 'male' | 'female'
}): number {
  return (
    MIFFLIN_PER_KG * toKg(a.bodyweightLb) +
    MIFFLIN_PER_CM * (a.heightIn * CM_PER_IN) +
    MIFFLIN_PER_YEAR * a.ageYears +
    MIFFLIN_SEX_OFFSET[a.sex ?? 'male']
  )
}

// ---------------- Which model, and is the tape any good ----------------

/** Below this the equations stop being about adults. */
export const MIN_AGE_YEARS = 14
export const MAX_AGE_YEARS = 100
export const MIN_HEIGHT_IN = 48
export const MAX_HEIGHT_IN = 90

/**
 * A tape reading this old is not describing this body any more.
 *
 * Either half of it can expire the reading: two months of calendar, or a
 * weight change big enough that the composition behind the number has
 * moved regardless of the date. Stale tape falls back to Mifflin rather
 * than carrying a stale fat-free mass forward, which is R1's own v1 call
 * and the conservative one: an old body-composition number is confidently
 * wrong, where the anthropometric model is only ever roughly right.
 */
export const FRESH_TAPE_DAYS = 60
export const FRESH_TAPE_WEIGHT_PCT = 0.05

export function tapeIsFresh(a: {
  ageDays: number
  weightAtTapeLb?: number
  bodyweightLb: number
}): boolean {
  if (!(a.ageDays >= 0) || a.ageDays > FRESH_TAPE_DAYS) return false
  if (a.weightAtTapeLb === undefined || !(a.weightAtTapeLb > 0)) return true
  const drift = Math.abs(a.bodyweightLb - a.weightAtTapeLb) / a.weightAtTapeLb
  return drift <= FRESH_TAPE_WEIGHT_PCT
}

/**
 * One body-fat figure from the recent tape readings, newest last.
 *
 * The median of the last three, not the newest one: a single sloppy
 * measurement moves body fat by several points, and several points moves
 * the calorie target by about a meal. Two readings take the lower-index
 * one of the pair rather than averaging, so the output is always a number
 * somebody actually measured.
 */
export function smoothBodyFat(readings: number[]): number | null {
  const recent = readings.filter((n) => Number.isFinite(n) && n >= 3 && n <= 60).slice(-3)
  if (recent.length === 0) return null
  const sorted = [...recent].sort((a, b) => a - b)
  return sorted[Math.floor((sorted.length - 1) / 2)]
}

// ---------------- Activity ----------------

/**
 * Non-training life, as a multiple of resting energy.
 *
 * The bands are the NASEM/IOM physical activity levels. The cut-points
 * between rows are ours. Note what these do NOT include: the sessions
 * themselves, which are added separately and only on the days they
 * happen. A multiplier that already contains training, plus a session
 * add, is the double-count this architecture exists to avoid.
 */
export const PAL_BANDS: { upToSessions: number; band: [number, number] }[] = [
  { upToSessions: 0, band: [1.2, 1.3] },
  { upToSessions: 2, band: [1.25, 1.4] },
  { upToSessions: 4, band: [1.3, 1.45] },
  { upToSessions: 6, band: [1.35, 1.5] },
  { upToSessions: Infinity, band: [1.4, 1.5] },
]

/** Doubly-labelled-water territory. Never granted from a training log. */
export const PAL_CEILING = 1.9

/**
 * Where inside the band this athlete sits.
 *
 * Sitting all day is the bottom of it by definition. Not having answered
 * lands nearer the middle than the top, because the known failure mode is
 * people believing they move more than they do, and an underestimate
 * self-corrects upward off the weight trend while an overestimate stalls
 * a cut and costs trust.
 */
const MOVEMENT_POSITION: Record<DayMovement, number> = {
  Sitting: 0,
  'On my feet': 0.75,
  'Always moving': 1,
}
const UNANSWERED_POSITION = 0.5

function basePal(sessionsPerWeek: number, movement?: DayMovement): number {
  const sessions = Math.max(0, Math.min(14, Math.round(sessionsPerWeek || 0)))
  const row = PAL_BANDS.find((r) => sessions <= r.upToSessions) ?? PAL_BANDS[PAL_BANDS.length - 1]
  const [lo, hi] = row.band
  const at = movement ? MOVEMENT_POSITION[movement] : UNANSWERED_POSITION
  return Math.min(PAL_CEILING, Math.round((lo + (hi - lo) * at) * 1000) / 1000)
}

/**
 * Metabolic equivalents, for turning a logged session into calories.
 * One MET is roughly a kcal per kg per hour, and resting already covers
 * the first one, so a session's own cost is (MET - 1) x kg x hours.
 */
export const MET_ANCHORS = { strength: 5, conditioning: 8, walking: 4.3, running: 9.8 } as const
export type MetActivity = keyof typeof MET_ANCHORS

/** How long a session runs when nothing has been logged to say otherwise. */
export const TYPICAL_SESSION_HOURS = 1

/**
 * Sessions a week, when the caller has no week to point at.
 *
 * The middle of what this app builds (three to six days), which keeps a
 * caller that cannot say landing in the same activity band it would have
 * landed in before any of this existed.
 */
export const DEFAULT_SESSIONS_PER_WEEK = 4

function sessionKcal(bodyweightLb: number, hours: number, activity: MetActivity = 'strength'): number {
  if (!(bodyweightLb > 0) || !(hours > 0)) return 0
  return Math.round((MET_ANCHORS[activity] - 1) * toKg(bodyweightLb) * hours)
}

// ---------------- The number everything else hangs off ----------------

export interface BodyKnowledge {
  bodyweightLb: number
  sex?: 'male' | 'female'
  heightIn?: number
  ageYears?: number
  /** Already smoothed and already checked for staleness by the caller. */
  bodyFatPct?: number
}

export interface Maintenance {
  /** Training-day maintenance, kcal, rounded to 50. */
  kcal: number
  /** Maintenance on a day with no session in it, kcal, rounded to 50. */
  restKcal: number
  /** Resting energy before any activity. Null on the heuristic branch. */
  restingKcal: number | null
  model: BmrModel
  /** The activity multiplier used. Null on the heuristic branch. */
  pal: number | null
  /** What the athlete could give us that would sharpen this. */
  sharpenWith: 'tape' | 'height-and-age' | null
}

const round50 = (n: number) => Math.round(n / 50) * 50

/**
 * Resting energy from the best model this athlete's data supports.
 *
 * Null means neither equation can run, which is the heuristic's cue.
 */
function restingEnergy(k: BodyKnowledge): { kcal: number; model: BmrModel } | null {
  const bw = k.bodyweightLb
  if (!(bw > 0)) return null
  if (k.bodyFatPct !== undefined) {
    const ffm = ffmKg(bw, k.bodyFatPct)
    if (ffm !== null) return { kcal: katchMcArdle(ffm), model: 'katch-mcardle' }
  }
  const h = k.heightIn
  const age = k.ageYears
  if (
    h !== undefined && h >= MIN_HEIGHT_IN && h <= MAX_HEIGHT_IN &&
    age !== undefined && age >= MIN_AGE_YEARS && age <= MAX_AGE_YEARS
  ) {
    return { kcal: mifflinStJeor({ bodyweightLb: bw, heightIn: h, ageYears: age, sex: k.sex }), model: 'mifflin-st-jeor' }
  }
  return null
}

/**
 * Maintenance, training day and rest day.
 *
 * `heuristicKcal` is the caller's own last-resort number, passed in so
 * the two callers that already compute it (the guided booklet and the
 * bring-your-own-routine path) keep producing exactly what they produce
 * today for an athlete we know nothing else about. Nobody's target moves
 * without new information about them.
 */
export function maintenanceKcal(
  k: BodyKnowledge,
  activity: { sessionsPerWeek: number; movement?: DayMovement; sessionHours?: number },
  heuristicKcal: number,
): Maintenance {
  const resting = restingEnergy(k)
  if (!resting) {
    // Passed through untouched, NOT re-rounded. The caller's number is
    // already rounded to 50 and then nudged by height in steps of 25, so
    // rounding it again here silently deletes the nudge and moves a
    // target for somebody who told us nothing new. It did exactly that
    // for one commit, and an end-to-end test that pins a real athlete's
    // rest-day calories is what caught it.
    return {
      kcal: heuristicKcal,
      restKcal: heuristicKcal,
      restingKcal: null,
      model: 'bodyweight',
      pal: null,
      sharpenWith: 'height-and-age',
    }
  }
  const pal = basePal(activity.sessionsPerWeek, activity.movement)
  const rest = resting.kcal * pal
  const session = activity.sessionsPerWeek > 0
    ? sessionKcal(k.bodyweightLb, activity.sessionHours ?? TYPICAL_SESSION_HOURS)
    : 0
  return {
    kcal: round50(rest + session),
    restKcal: round50(rest),
    restingKcal: Math.round(resting.kcal),
    model: resting.model,
    pal,
    sharpenWith: resting.model === 'katch-mcardle' ? null : 'tape',
  }
}

/**
 * The movement answer, narrowed to what the activity bands accept.
 *
 * The onboarding question already promises this: "sets the calorie
 * baseline before a single session is counted" is exactly what a
 * non-training multiplier is. Until this commit the answer moved the
 * number by 50 kcal, on one goal out of seven.
 */
export function dayMovementOf(ans: Record<string, string> = {}): DayMovement | undefined {
  const a = ans['day-movement']
  return a === 'Sitting' || a === 'On my feet' || a === 'Always moving' ? a : undefined
}

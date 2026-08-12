import type { AppData } from '../types'
import { trackingFor } from '../plan/cardio'
import { loggedSessions } from './activityLog'
import {
  MIN_MINUTES_TO_JUDGE,
  MIN_STEPS_TO_JUDGE,
  classifyIntensity,
  stepsPerHour,
  type Intensity,
} from './intensity'

// ============================================================
// Learning what YOUR hard looks like.
//
// The bands in plan/cardio.ts come from population research, and
// population research is about a population. A post player who
// bangs in the paint and a guard who runs the floor can work
// equally hard and produce step rates an hour apart. Graded
// against one average, one of them is told all season that they
// took it easy.
//
// So the app asks, once, at the end of every tracked session:
// how hard was that. The answer is never overwritten and never
// argued with. What it IS used for is the gap between it and the
// step rate, which is the only thing that can tell us the average
// is wrong for this person. Enough of those gaps and the band
// moves to fit them.
//
// TWO SPEEDS, on purpose.
//
// A per-sport band needs its own samples and is worth waiting
// for, because "hard basketball" and "hard pickleball" are
// genuinely different questions. A global bias needs far fewer,
// because someone who reports harder than measured in one sport
// almost always does it in all of them. The global one starts
// helping after three answers; the per-sport one takes over once
// that sport has four of its own. That is what makes the app
// useful in week one instead of month three.
//
// WHAT THIS DOES NOT TOUCH: calories.
//
// A MET is a multiple of resting metabolism, an absolute physical
// claim, and it belongs to the work done rather than to how the
// work felt. Someone deconditioned finds 4,000 steps an hour all
// out and still burns what 4,000 steps an hour costs. Letting
// perceived effort inflate a calorie number is how a food app
// hands somebody a 600-calorie credit they did not earn, so the
// calorie path stays on the population band and this file stays
// out of it. See engine/intensity.ts, cardioKcal.
// ============================================================

/** Per-sport personalization needs its own evidence. */
export const MIN_ACTIVITY_SAMPLES = 4

/** A cross-sport lean shows up much sooner than a per-sport one. */
export const MIN_BIAS_SAMPLES = 3

/**
 * How far one tier of disagreement moves the band. A user who
 * reports one tier above measured has their thresholds pulled 18%
 * closer, so the same session grades where they say it does.
 */
export const BIAS_STEP = 0.18

/** The band may not stray further than this from the researched one. */
export const MAX_DRIFT = 0.5

/** Blending strength: at this many samples the band is half personal. */
export const PRIOR_STRENGTH = 6

const RANK: Record<Intensity, number> = { low: 1, standard: 2, high: 3 }

export interface PersonalBand {
  low: number
  high: number
  /** How many graded sessions shaped this. */
  samples: number
  /** What moved it, for the line that explains itself. */
  source: 'population' | 'bias' | 'activity'
}

/** One session reduced to the only two things calibration needs. */
interface Sample {
  rate: number
  felt: Intensity
}

/**
 * Every graded session, read through engine/activityLog.ts so a GPS
 * run counts once rather than twice. Counting it twice would let one
 * hard morning move the band as far as two.
 */
function allSamples(data: AppData): { activityId: string; sample: Sample }[] {
  const out: { activityId: string; sample: Sample }[] = []
  for (const s of loggedSessions(data)) {
    // The same floors classification uses. A rate read off two minutes,
    // or off a phone that rode in a bag, is not evidence of anything,
    // and letting it vote would teach the band from noise.
    if (!s.felt || s.steps === undefined) continue
    if (s.steps < MIN_STEPS_TO_JUDGE || s.minutes < MIN_MINUTES_TO_JUDGE) continue
    out.push({ activityId: s.activityId, sample: { rate: stepsPerHour(s.steps, s.minutes), felt: s.felt } })
  }
  return out
}

/** Just this sport's, for the per-sport band. */
function samplesFor(data: AppData, activityId: string): Sample[] {
  return allSamples(data)
    .filter((x) => x.activityId === activityId)
    .map((x) => x.sample)
}

/**
 * How far this athlete's own read sits from the researched one,
 * averaged across every sport. Positive means they consistently
 * call it harder than the step rate does.
 *
 * Null until there is enough to be a lean rather than a mood.
 */
export function intensityBias(data: AppData): number | null {
  const graded = allSamples(data).filter(({ activityId }) => trackingFor(activityId).band)
  if (graded.length < MIN_BIAS_SAMPLES) return null
  let sum = 0
  for (const { activityId, sample } of graded) {
    const band = trackingFor(activityId).band!
    const measured: Intensity =
      sample.rate <= band.low ? 'low' : sample.rate >= band.high ? 'high' : 'standard'
    sum += RANK[sample.felt] - RANK[measured]
  }
  return Math.round((sum / graded.length) * 100) / 100
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/**
 * The mean rate of the sessions graded at each tier, which is what a
 * personal threshold is built out of.
 */
function meansByTier(samples: Sample[]): Partial<Record<Intensity, number>> {
  const out: Partial<Record<Intensity, number>> = {}
  for (const tier of ['low', 'standard', 'high'] as const) {
    const hits = samples.filter((s) => s.felt === tier)
    if (hits.length) out[tier] = hits.reduce((a, s) => a + s.rate, 0) / hits.length
  }
  return out
}

/**
 * The band this athlete should be graded against for one sport.
 *
 * Falls back cleanly, always: the sport's own answers if there are
 * enough, the cross-sport lean if not, and the researched band if
 * neither. Nothing here can produce a band that is not ordered, and
 * nothing can move it more than half of where it started.
 */
/**
 * Memo, keyed on the data object itself.
 *
 * personalBand walks the whole history, and the screens call it once
 * per SESSION shown: the Progress table, the Week rows and the Today
 * line were each re-reading every session ever logged, for every
 * session ever logged. Quadratic, and it lands on the main thread of
 * a phone.
 *
 * The store replaces `data` on every update rather than mutating it,
 * so identity is a correct cache key and a stale band is not
 * reachable. Weak, so old snapshots are collected.
 */
const BAND_CACHE = new WeakMap<AppData, Map<string, PersonalBand | null>>()

export function personalBand(data: AppData, activityId: string): PersonalBand | null {
  let perActivity = BAND_CACHE.get(data)
  if (!perActivity) {
    perActivity = new Map()
    BAND_CACHE.set(data, perActivity)
  }
  if (perActivity.has(activityId)) return perActivity.get(activityId) ?? null
  const built = computeBand(data, activityId)
  perActivity.set(activityId, built)
  return built
}

function computeBand(data: AppData, activityId: string): PersonalBand | null {
  const base = trackingFor(activityId).band
  if (!base) return null
  const pop: PersonalBand = { low: base.low, high: base.high, samples: 0, source: 'population' }

  const mine = samplesFor(data, activityId)
  if (mine.length >= MIN_ACTIVITY_SAMPLES) {
    const built = fromOwnAnswers(mine, base)
    if (built) return { ...built, samples: mine.length, source: 'activity' }
  }

  const bias = intensityBias(data)
  if (bias === null || bias === 0) return { ...pop, samples: mine.length }
  // Reporting harder than measured means the thresholds are too high
  // for this person, so they come down and the same session grades up.
  const scale = clamp(1 - bias * BIAS_STEP, 1 - MAX_DRIFT, 1 + MAX_DRIFT)
  return {
    low: Math.round(base.low * scale),
    high: Math.round(base.high * scale),
    samples: mine.length,
    source: 'bias',
  }
}

/**
 * Thresholds placed between the tiers the athlete actually reported,
 * then pulled back toward the researched band by how little evidence
 * there is. Null when the answers cannot place a boundary, which is
 * the honest outcome of somebody who called every session the same.
 */
function fromOwnAnswers(
  samples: Sample[],
  base: { low: number; high: number },
): { low: number; high: number } | null {
  const m = meansByTier(samples)
  // A boundary needs a tier on each side of it. With only 'low' and
  // 'high' answers the middle is unobserved, so it gets split in
  // thirds rather than invented.
  const lowT =
    m.low !== undefined && m.standard !== undefined
      ? (m.low + m.standard) / 2
      : m.low !== undefined && m.high !== undefined
        ? m.low + (m.high - m.low) / 3
        : null
  const highT =
    m.standard !== undefined && m.high !== undefined
      ? (m.standard + m.high) / 2
      : m.low !== undefined && m.high !== undefined
        ? m.low + ((m.high - m.low) * 2) / 3
        : null
  if (lowT === null && highT === null) return null

  const w = samples.length / (samples.length + PRIOR_STRENGTH)
  const blend = (personal: number | null, population: number) =>
    personal === null
      ? population
      : Math.round(
          clamp(
            population * (1 - w) + personal * w,
            population * (1 - MAX_DRIFT),
            population * (1 + MAX_DRIFT),
          ),
        )

  const low = blend(lowT, base.low)
  const high = blend(highT, base.high)
  // Somebody whose "easy" sessions outrun their "hard" ones has told us
  // nothing usable. Rather than grade them against a band that is
  // inside out, hand back the researched one.
  return low < high ? { low, high } : null
}

/**
 * How hard this session was FOR THIS ATHLETE.
 *
 * Their own answer wins outright wherever they gave one: it is not a
 * guess to be improved on, it is the ground truth everything else is
 * trying to predict. Where they did not answer, the calibrated band
 * predicts it, which is the whole point of having asked.
 */
export function perceivedIntensity(
  data: AppData,
  activityId: string,
  steps: number | undefined,
  minutes: number,
  felt?: Intensity,
): Intensity | null {
  if (felt) return felt
  const band = personalBand(data, activityId)
  if (!band || band.source === 'population') {
    return classifyIntensity(activityId, steps, minutes)
  }
  if (steps === undefined || steps < MIN_STEPS_TO_JUDGE) return null
  if (minutes < MIN_MINUTES_TO_JUDGE) return null
  const rate = stepsPerHour(steps, minutes)
  return rate <= band.low ? 'low' : rate >= band.high ? 'high' : 'standard'
}

/**
 * The sentence that says what the app has learned, or admits it has
 * not learned anything yet. An adjustment nobody can see is
 * indistinguishable from a bug.
 */
export function calibrationNote(data: AppData, activityId: string): string | null {
  const band = personalBand(data, activityId)
  if (!band || band.source === 'population') return null
  const base = trackingFor(activityId).band!
  const harder = band.high < base.high
  return band.source === 'activity'
    ? `Graded against your own ${band.samples} rated sessions, not the average.`
    : harder
      ? 'Adjusted down: you rate your sessions harder than the step count does.'
      : 'Adjusted up: you rate your sessions easier than the step count does.'
}

/** Has this session already been asked about? Used to ask exactly once. */
export function needsIntensityAnswer(e: {
  feltIntensity?: Intensity
  minutes?: number
}): boolean {
  return !e.feltIntensity && (e.minutes ?? 0) >= MIN_MINUTES_TO_JUDGE
}

/** Sessions rated so far, for the line that says how close it is. */
export function gradedCount(data: AppData): number {
  return allSamples(data).length
}

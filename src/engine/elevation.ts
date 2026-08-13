import type { RunPoint } from '../activityTypes'
import { haversineMi } from './geoMath'

// ============================================================
// Elevation, from the only altimeter a browser actually has.
//
// The geolocation API reports altitude in metres above the WGS84
// ellipsoid (the recorder in screens/, and platform/geo.ts, are
// what actually read it — this module is pure and takes points).
// It is the noisiest number that API gives: a phone standing
// still on flat ground routinely swings ±10 m between fixes,
// because altitude is solved from satellite geometry that is far
// weaker vertically than horizontally.
//
// Summed naively, that noise IS the result. A 40-minute walk on
// a pancake-flat road reports 600 ft of climb, every session
// looks like a mountain stage, and the calorie number inherits
// the fiction. So nothing here trusts a single fix:
//
//   1. REJECT   fixes whose own altitudeAccuracy says they are
//               guesses, and fixes with no altitude at all.
//   2. SMOOTH   what survives, with a moving median (kills the
//               one-off spike a mean would average INTO the
//               track) followed by a short mean.
//   3. RATCHET  gain only once the smoothed trace has climbed
//               past a threshold, so a hill counts and a hover
//               does not.
//
// There is no barometer here. The Web platform exposes none, and
// iOS Safari exposes nothing resembling one, so the pressure
// altimeter every dedicated watch uses is simply off the table.
// That is the ceiling on how good this can get outdoors, and it
// is why an indoor climb is entered rather than measured.
// ============================================================

/** Metres per foot, the app displays feet. */
const FT_PER_M = 3.28084

/**
 * Worst vertical accuracy still worth reading, in metres.
 *
 * Deliberately looser than the 50 m horizontal gate in runs.ts:
 * vertical error runs roughly 1.5x horizontal on the same fix, so
 * reusing the horizontal number would throw away most of a normal
 * urban session. Above this the fix is noise wearing a number.
 */
export const MAX_ALT_ACCURACY_M = 12

/**
 * Metres the smoothed trace must gain before the climb is banked.
 *
 * This is the single most important constant in the file. Too low
 * and residual noise accumulates into phantom summits; too high and
 * genuine rolling terrain reads as flat. 3 m is about one storey,
 * comfortably above the smoothed noise floor and below any hill a
 * person would describe as a hill.
 */
export const GAIN_THRESHOLD_M = 3

/** Altitude in metres for a point, when it carried one. */
export function altOf(p: RunPoint): number | null {
  const a = p[3]
  return typeof a === 'number' && Number.isFinite(a) ? a : null
}

/** Does this track carry any usable altitude at all? */
export function hasElevation(points: RunPoint[]): boolean {
  return points.some((p) => altOf(p) !== null)
}

/**
 * Should this fix's altitude be believed?
 *
 * Called at record time, one fix at a time. A fix can be perfectly
 * good horizontally and useless vertically, which is why this is a
 * separate gate from acceptFix rather than a clause inside it: the
 * route still wants the point, the profile does not.
 */
export function acceptsAltitude(altitude: number | null | undefined, altitudeAccuracy: number | null | undefined): boolean {
  if (typeof altitude !== 'number' || !Number.isFinite(altitude)) return false
  // Somewhere between the Dead Sea shore and low earth orbit. A fix
  // outside this is a parsing accident, not a place.
  if (altitude < -500 || altitude > 9000) return false
  // No stated accuracy means the platform declined to characterise
  // its own guess. Android hands this back on some chipsets, and
  // trusting it is how flat ground grows mountains.
  if (typeof altitudeAccuracy !== 'number' || !Number.isFinite(altitudeAccuracy)) return false
  return altitudeAccuracy <= MAX_ALT_ACCURACY_M
}

/** Median of a small window. Odd and even lengths both handled. */
function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b)
  const mid = s.length >> 1
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

/**
 * Smooth the altitude trace: median filter, then a light mean.
 *
 * The median goes first on purpose. GPS altitude error is spiky
 * rather than gaussian — one fix jumps 15 m and its neighbours are
 * fine — and a mean would spread that spike across the window
 * instead of deleting it. The median deletes it outright; the mean
 * afterwards takes the staircase off what is left.
 *
 * Points with no altitude keep their gaps: they are skipped, not
 * interpolated, so a stretch under a bridge does not invent terrain.
 */
export function smoothAltitudes(points: RunPoint[], window = 5): (number | null)[] {
  const raw = points.map(altOf)
  const idx: number[] = []
  for (let i = 0; i < raw.length; i++) if (raw[i] !== null) idx.push(i)
  if (idx.length === 0) return raw

  const half = Math.max(1, Math.floor(window / 2))
  const vals = idx.map((i) => raw[i] as number)

  const med = vals.map((_, k) => {
    const lo = Math.max(0, k - half)
    const hi = Math.min(vals.length, k + half + 1)
    return median(vals.slice(lo, hi))
  })

  const out: (number | null)[] = raw.map(() => null)
  med.forEach((_, k) => {
    const lo = Math.max(0, k - 1)
    const hi = Math.min(med.length, k + 2)
    let sum = 0
    for (let j = lo; j < hi; j++) sum += med[j]
    out[idx[k]] = sum / (hi - lo)
  })
  return out
}

export interface ElevationStats {
  /** Total climb, feet, after smoothing and thresholding. */
  gainFt: number
  /** Total descent, feet. Positive number. */
  lossFt: number
  /** Lowest and highest smoothed point, feet. Null with no data. */
  minFt: number | null
  maxFt: number | null
  /** Metres climbed, kept unrounded for the calorie math. */
  gainM: number
  /** How many fixes carried a usable altitude. */
  samples: number
}

export const EMPTY_ELEVATION: ElevationStats = {
  gainFt: 0,
  lossFt: 0,
  minFt: null,
  maxFt: null,
  gainM: 0,
  samples: 0,
}

/**
 * Climb and descent over a whole track.
 *
 * The ratchet: a running reference altitude only moves when the
 * smoothed trace has pulled GAIN_THRESHOLD_M away from it, and the
 * whole of that move is banked at once. Drifting 2 m up and back
 * down all session banks nothing, which is the correct answer for
 * flat ground.
 */
export function elevationStats(points: RunPoint[]): ElevationStats {
  const smoothed = smoothAltitudes(points).filter((a): a is number => a !== null)
  if (smoothed.length < 2) {
    return smoothed.length === 1
      ? { ...EMPTY_ELEVATION, samples: 1, minFt: Math.round(smoothed[0] * FT_PER_M), maxFt: Math.round(smoothed[0] * FT_PER_M) }
      : EMPTY_ELEVATION
  }

  let gainM = 0
  let lossM = 0
  let ref = smoothed[0]
  let min = smoothed[0]
  let max = smoothed[0]

  for (const a of smoothed) {
    if (a < min) min = a
    if (a > max) max = a
    const d = a - ref
    if (d >= GAIN_THRESHOLD_M) {
      gainM += d
      ref = a
    } else if (d <= -GAIN_THRESHOLD_M) {
      lossM += -d
      ref = a
    }
  }

  return {
    gainFt: Math.round(gainM * FT_PER_M),
    lossFt: Math.round(lossM * FT_PER_M),
    minFt: Math.round(min * FT_PER_M),
    maxFt: Math.round(max * FT_PER_M),
    gainM,
    samples: smoothed.length,
  }
}

/**
 * Grade right now, as a percentage, for the live readout.
 *
 * Measured over the last stretch rather than the last fix: a single
 * pair of fixes is two noisy altitudes divided by a few metres of
 * ground, which produces a grade of several hundred percent and a
 * readout that flickers. Looking back over a minimum run of ground
 * makes the denominator big enough for the answer to mean something.
 */
export function currentGradePct(points: RunPoint[], lookbackMi = 0.06): number {
  const smoothed = smoothAltitudes(points)
  // Walk back until enough ground is covered AND both ends have altitude.
  let end = -1
  for (let i = points.length - 1; i >= 0; i--) {
    if (smoothed[i] !== null) {
      end = i
      break
    }
  }
  if (end < 1) return 0

  let mi = 0
  for (let i = end; i > 0; i--) {
    mi += haversineMi(points[i - 1][0], points[i - 1][1], points[i][0], points[i][1])
    if (mi >= lookbackMi && smoothed[i - 1] !== null) {
      const rise = (smoothed[end] as number) - (smoothed[i - 1] as number)
      const runM = mi * 1609.344
      if (runM < 1) return 0
      // Clamped: past roughly 45% nothing is being run or ridden, it
      // is being climbed, and the number is far more likely to be a
      // bad fix than a genuine wall.
      return Math.max(-45, Math.min(45, Math.round((rise / runM) * 1000) / 10))
    }
  }
  return 0
}

/** Feet, for anything that already holds metres. */
export function mToFt(m: number): number {
  return Math.round(m * FT_PER_M)
}

/** Metres, for the stored feet going back into the physics. */
export function ftToM(ft: number): number {
  return ft / FT_PER_M
}

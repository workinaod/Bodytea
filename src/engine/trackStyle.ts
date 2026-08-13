import type { RunPoint } from '../activityTypes'
import { haversineMi } from './geoMath'

// ============================================================
// Colouring a route by how fast it was covered.
//
// A single flat line says where you went. A graded line says how
// it went: where you held pace, where the hill took it out of
// you, where you were waiting at a light. Same pixels, one more
// dimension of the session.
//
// Pure and separate from the map so the thresholds can be tested
// without a DOM, and so the map stays a map.
// ============================================================

/**
 * Speed of each segment in mph. Length is points.length - 1, so
 * segment i runs from points[i] to points[i + 1].
 *
 * A zero or negative time step yields 0 rather than Infinity: fixes
 * arriving with the same timestamp is a real thing phones do, and
 * one Infinity poisons every percentile downstream.
 */
export function segmentSpeedsMph(points: RunPoint[]): number[] {
  const out: number[] = []
  for (let i = 1; i < points.length; i++) {
    const dt = points[i][2] - points[i - 1][2]
    if (dt <= 0) {
      out.push(0)
      continue
    }
    const mi = haversineMi(points[i - 1][0], points[i - 1][1], points[i][0], points[i][1])
    out.push((mi / dt) * 3600)
  }
  return out
}

/**
 * The speed band to spread the colour ramp across.
 *
 * Percentiles, not min and max. One GPS glitch producing a 40 mph
 * segment would otherwise own the top of the scale and squash the
 * entire real run into the bottom two percent of the ramp, painting
 * a uniform line — the exact thing grading was meant to avoid.
 */
export function speedRange(speeds: number[]): { slow: number; fast: number } {
  const moving = speeds.filter((s) => s > 0.3).sort((a, b) => a - b)
  if (moving.length < 4) return { slow: 0, fast: 1 }
  // Indexed off (n - 1), which is what keeps the maximum out of the
  // p90 on short tracks. Indexing off n hands the top slot straight
  // back to the glitch this function exists to exclude.
  const at = (p: number) => moving[Math.max(0, Math.min(moving.length - 1, Math.floor((moving.length - 1) * p)))]
  const slow = at(0.1)
  const fast = at(0.9)
  // A metronome-steady effort has a near-zero spread, and dividing by
  // it turns rounding noise into a rainbow. Force a floor so a steady
  // run reads as one confident colour.
  return fast - slow < 0.4 ? { slow, fast: slow + 0.4 } : { slow, fast }
}

/**
 * Colour for a segment: slow is amber, fast is the app's lime.
 *
 * Amber rather than red. Red reads as an error on a dark map, and a
 * slow mile is not an error — it is a hill, or a rest, or the point
 * of the session.
 */
export function speedColor(mph: number, slow: number, fast: number): string {
  if (!Number.isFinite(mph)) return SLOW_RGB
  const span = fast - slow
  const t = span <= 0 ? 1 : Math.max(0, Math.min(1, (mph - slow) / span))
  // Amber (250,190,60) → lime (163,230,53), interpolated in plain RGB.
  // Good enough across this short a span, and it keeps the function
  // dependency-free and trivially testable.
  const r = Math.round(250 + (163 - 250) * t)
  const g = Math.round(190 + (230 - 190) * t)
  const b = Math.round(60 + (53 - 60) * t)
  return `rgb(${r},${g},${b})`
}

const SLOW_RGB = 'rgb(250,190,60)'

// ============================================================
// Body-fat estimate from a tape measure (US Navy circumference
// method). Not lab-grade, nothing at home is, but consistent,
// repeatable, and needs only a $3 tape. The app's stance: the
// TREND is the truth; measure the same way every time.
// ============================================================

export interface BodyFatInputs {
  formula: 'male' | 'female'
  heightIn: number
  neckIn: number
  waistIn: number
  /** Required for the female formula only. */
  hipIn?: number
}

/**
 * US Navy estimate, inches. Returns null when inputs can't produce a
 * sane number (tape errors like neck ≥ waist).
 */
export function estimateBodyFat(i: BodyFatInputs): number | null {
  const { formula, heightIn, neckIn, waistIn, hipIn } = i
  if (heightIn < 48 || heightIn > 90 || neckIn <= 5 || waistIn <= 15) return null
  const log10 = Math.log10
  let pct: number
  if (formula === 'male') {
    if (waistIn - neckIn < 1) return null
    pct = 86.010 * log10(waistIn - neckIn) - 70.041 * log10(heightIn) + 36.76
  } else {
    if (!hipIn || hipIn <= 20) return null
    if (waistIn + hipIn - neckIn < 1) return null
    pct = 163.205 * log10(waistIn + hipIn - neckIn) - 97.684 * log10(heightIn) - 78.387
  }
  if (!Number.isFinite(pct) || pct < 2 || pct > 60) return null
  return Math.round(pct * 10) / 10
}

/** Step-by-step tape guidance, written for someone who has never done this. */
export const TAPE_STEPS: Record<'neck' | 'waist' | 'hip', { title: string; how: string[] }> = {
  neck: {
    title: 'Neck',
    how: [
      'Stand tall, look straight ahead, shoulders relaxed, not shrugged.',
      'Wrap the tape just BELOW the Adam’s apple, sloping slightly downward toward the front.',
      'Snug against the skin but not squeezing. Don’t flex or swallow while reading it.',
    ],
  },
  waist: {
    title: 'Waist',
    how: [
      'Measure at NAVEL height, directly over the belly button.',
      'Relax the stomach completely. No sucking in, no pushing out. Breathe out normally, then read.',
      'Tape level all the way around, snug but never digging in.',
    ],
  },
  hip: {
    title: 'Hips',
    how: [
      'Feet together. Wrap the tape around the WIDEST point of the hips/glutes.',
      'Check in a mirror that the tape is level front to back.',
      'Snug, not compressing. Read at the side.',
    ],
  },
}

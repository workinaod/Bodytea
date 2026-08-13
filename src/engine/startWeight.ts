import type { ExerciseDef } from '../types'

// ============================================================
// First-session working weights: nobody should stare at an
// empty stepper. Pattern-based fractions of bodyweight, scaled
// by training history. After session one the feel check-in and
// history take over; the user can always adjust by hand.
// ============================================================

export type Experience = 'new' | 'returning' | 'casual' | 'trained'
/**
 * Which column of the fraction tables to seed from.
 *
 * `casual` shares the middle column with `returning`: a starting weight
 * is a coarse guess that the first session corrects either way, and
 * splitting the tables four ways would be false precision. Where the two
 * genuinely differ is RATE, and that lives in plan/milestones.ts.
 */
const LEVEL: Record<Experience, number> = { new: 0, returning: 1, casual: 1, trained: 2 }

/** Fraction of bodyweight for a sane working set: [new, returning, trained]. */
function fractions(def: ExerciseDef, perHand: boolean): [number, number, number] | null {
  const n = def.name.toLowerCase()
  if (/goblet/.test(n)) return [0.15, 0.22, 0.3]
  if (/squat|lunge|split|step-?up/.test(n)) return perHand ? [0.08, 0.12, 0.18] : [0.4, 0.65, 0.9]
  if (/rdl|romanian|deadlift|hinge|hip thrust|good morning|swing/.test(n))
    return perHand ? [0.1, 0.15, 0.2] : [0.5, 0.8, 1.1]
  if (/bench|incline|floor press|chest/.test(n)) return perHand ? [0.1, 0.16, 0.22] : [0.3, 0.5, 0.7]
  if (/ohp|overhead|shoulder press|push press|arnold/.test(n)) return perHand ? [0.07, 0.11, 0.16] : [0.2, 0.32, 0.45]
  if (/row|pulldown|pull-?down/.test(n)) return perHand ? [0.1, 0.16, 0.22] : [0.3, 0.45, 0.6]
  if (/curl|extension|raise|fly|flye|face pull|pullover|kickback|shrug/.test(n))
    return perHand ? [0.03, 0.05, 0.08] : [0.12, 0.2, 0.28]
  if (/carry|farmer|suitcase/.test(n)) return perHand ? [0.15, 0.25, 0.35] : [0.3, 0.5, 0.7]
  if (/press/.test(n)) return perHand ? [0.08, 0.13, 0.18] : [0.25, 0.4, 0.55]
  return null
}

export function suggestedStartWeight(
  def: ExerciseDef,
  bodyweightLb: number,
  experience: Experience,
): number | null {
  if (def.kind !== 'lift' && def.kind !== 'carry') return null
  if (!/dumbbell|barbell|kettlebell|ez bar|trap bar|plate|weighted/i.test(def.equipment)) return null
  const perHand = /dumbbell/i.test(def.equipment) && !/goblet|1 dumbbell/i.test(def.equipment)
  const f = fractions(def, perHand)
  if (!f) return null
  const bw = Math.min(330, Math.max(90, bodyweightLb || 175))
  return Math.max(5, Math.round((bw * f[LEVEL[experience]]) / 5) * 5)
}

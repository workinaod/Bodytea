import type { SlotId } from '../types'

// ============================================================
// 4-week block rotation (PDF "4-WEEK BLOCK ROTATION" table).
// Core movers never rotate; only these accessory slots do.
// After Block 3 it loops back to Block 1.
//
// Documented interpretation decisions (rotation table is
// authoritative where day tables disagree):
// - press1/press2 encode the Tuesday pairing: B1 Incline 4x + Flat 3x,
//   B2 Flat 4x + Incline 3x ("Flat DB + Incline mix"),
//   B3 Floor Press 4x + Incline 3x ("Floor Press + Incline").
// - The core slot is offset between Monday and Wednesday so Block 1
//   reproduces the PDF day tables exactly (Mon = hanging leg raise,
//   Wed = weighted sit-up) while still rotating every block.
// - Friday's fixed Hammer Curl collides with the curl slot in Block 3
//   (curl slot = hammer curl); the dedupe transform substitutes the
//   EZ bar curl for the fixed entry that block.
// ============================================================

export const BLOCK_SLOTS: Record<1 | 2 | 3, Record<SlotId, string>> = {
  1: {
    squatVariation: 'goblet-squat',
    lowerAccessory: 'bulgarian-split-squat',
    hamstring: 'single-leg-rdl',
    press1: 'incline-db-press',
    press2: 'flat-db-press',
    rowVariation: 'barbell-row',
    curl: 'ez-bar-curl',
    calf: 'single-leg-calf-raise',
    coreMon: 'hanging-leg-raise',
    coreWed: 'weighted-situp',
  },
  2: {
    squatVariation: 'db-front-squat',
    lowerAccessory: 'walking-lunge',
    hamstring: 'good-morning',
    press1: 'flat-db-press',
    press2: 'incline-db-press',
    rowVariation: 'one-arm-db-row',
    curl: 'incline-db-curl',
    calf: 'seated-calf-raise',
    coreMon: 'weighted-situp',
    coreWed: 'plank-side-plank',
  },
  3: {
    squatVariation: 'heels-elevated-goblet',
    lowerAccessory: 'step-up',
    hamstring: 'slider-leg-curl',
    press1: 'floor-press',
    press2: 'incline-db-press',
    rowVariation: 'chest-supported-row',
    curl: 'hammer-curl',
    calf: 'double-leg-calf-raise',
    coreMon: 'plank-side-plank',
    coreWed: 'hanging-leg-raise',
  },
}

/**
 * Rep-text overrides when a slot resolves to an exercise whose scheme
 * differs from the slot's default (e.g. planks are timed, good mornings
 * aren't per-leg).
 */
export const SLOT_REPTEXT_OVERRIDES: Record<string, { repText: string; repsNum?: number }> = {
  'good-morning': { repText: '8-10' },
  'slider-leg-curl': { repText: '10-12' },
  'double-leg-calf-raise': { repText: '10-12' },
  'plank-side-plank': { repText: '30-45 sec each' },
  'hanging-leg-raise': { repText: '15', repsNum: 15 },
  'weighted-situp': { repText: '15', repsNum: 15 },
}

/**
 * Core movers. NEVER rotate, progress these all year (PDF list).
 * Used by stats (PR charts) and coach messaging.
 */
export const CORE_MOVERS = [
  'front-squat',
  'goblet-squat',
  'romanian-deadlift',
  'hip-thrust',
  'max-velocity-sprint',
  'falling-start-sprint',
  'box-jump',
  'approach-jump',
  'pull-up',
  'standing-ohp',
  'incline-db-press',
] as const

/** The e1RM progress charts track these loaded lifts. */
export const TRACKED_LIFTS: { exerciseId: string; label: string }[] = [
  { exerciseId: 'front-squat', label: 'Front Squat' },
  { exerciseId: 'romanian-deadlift', label: 'RDL' },
  { exerciseId: 'hip-thrust', label: 'Hip Thrust' },
  { exerciseId: 'standing-ohp', label: 'OHP' },
  { exerciseId: 'incline-db-press', label: 'Incline Press' },
  { exerciseId: 'barbell-row', label: 'Barbell Row' },
]

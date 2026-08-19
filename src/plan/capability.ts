// Type-only, so this file adds no runtime edge back to movement.ts and the
// two can reference each other without a cycle.
import type { MovementPattern } from './movement'

// ============================================================
// What a movement REQUIRES OF A BODY, as distinct from what it hurts.
//
// The distinction is the whole reason this file exists, and it is sharp:
//
//   `stress` is about a joint that HURTS. Capability is about a function
//   the body DOES NOT HAVE. A knee that hurts wants less knee load. A
//   person who cannot get down to the floor has no pain at all and needs
//   a different shape of movement entirely.
//
// Before this, seven joints were the entire vocabulary of human
// limitation available to the planner. `Limitation.joints` was the only
// channel into the engine, so "I cannot kneel", "I cannot get to the
// floor" and "I cannot raise my arm overhead" mapped to nothing at all.
// R6's safety pack states those constraints in prose and has been
// unshippable for exactly that reason: there was no field saying which of
// the 194 movements involve kneeling.
//
// DERIVED, THEN CORRECTED. Most of this is mechanical from what the
// catalog already knows: a squat is not prone, a floor press is supine,
// vertical pushing is overhead. So the defaults come from pattern, and
// OVERRIDES carries every movement the defaults get wrong. That keeps
// 194 records honest without 194 hand-authored blocks, and
// capability.test.ts reports the real hit rate rather than trusting the
// 70 percent the research pack estimated.
//
// The derivation is a HOUSE HEURISTIC. Every override is a judgement
// somebody made about a specific movement, which is why they are listed
// one per line with the reason attached rather than folded into rules.
// ============================================================

/** A function the movement demands. A body without it cannot do this at all. */
export type CapabilityBlock =
  | 'floorTransfer'
  | 'kneeling'
  | 'prone'
  | 'supine'
  | 'overheadRom'
  | 'deepKneeFlexion'
  | 'deepHipFlexion'

export interface CapabilityDemands {
  /** Getting down to and back up from the floor. */
  floorTransfer: boolean
  /** Bearing weight on the knees. */
  kneeling: boolean
  /** Lying face down. */
  prone: boolean
  /** Lying face up. */
  supine: boolean
  /** Arms above shoulder height under load. */
  overheadRom: boolean
  /** REQUIRES the deep range, not merely passes through it. */
  deepKneeFlexion: boolean
  deepHipFlexion: boolean
  /** Ground reaction force. 0 none, 3 maximal. */
  impact: 0 | 1 | 2 | 3
}

const NONE: CapabilityDemands = {
  floorTransfer: false, kneeling: false, prone: false, supine: false,
  overheadRom: false, deepKneeFlexion: false, deepHipFlexion: false, impact: 0,
}

/** What the pattern alone implies. Corrected per movement below. */
const BY_PATTERN: Partial<Record<MovementPattern, Partial<CapabilityDemands>>> = {
  squat: { deepKneeFlexion: true, deepHipFlexion: true },
  hinge: { deepHipFlexion: true },
  lunge: { deepKneeFlexion: true, deepHipFlexion: true },
  'push-vertical': { overheadRom: true },
  'pull-vertical': { overheadRom: true },
  // Bracing and anti-rotation are overwhelmingly floor work in this
  // catalog: planks, dead bugs, bird dogs, hollow holds.
  brace: { floorTransfer: true, prone: true },
  'anti-rotation': { floorTransfer: true },
  flexion: { floorTransfer: true, supine: true },
  conditioning: { impact: 2 },
}

/**
 * Where the pattern gets it wrong, one line each with the reason.
 *
 * A movement appears here because a default is false about it, not
 * because it is interesting. If this list grows past roughly a third of
 * the catalog the defaults are the wrong defaults and belong rewritten.
 */
const OVERRIDES: Record<string, Partial<CapabilityDemands>> = {
  // Squat pattern, but seated or machine-supported: no deep range demanded.
  'leg-press': { deepKneeFlexion: false, deepHipFlexion: false },
  'wall-sit': { deepKneeFlexion: false, deepHipFlexion: false },
  'hack-squat': { deepHipFlexion: false },
  // Hinge pattern done lying down.
  'glute-bridge': { floorTransfer: true, supine: true, deepHipFlexion: false },
  'single-leg-glute-bridge': { floorTransfer: true, supine: true, deepHipFlexion: false },
  'hip-thrust': { floorTransfer: true, deepHipFlexion: false },
  // Pressing on a bench is supine; pressing on the floor is supine AND a
  // transfer down to it.
  'flat-db-press': { supine: true },
  'incline-db-press': { supine: true },
  'close-grip-press': { supine: true },
  'floor-press': { floorTransfer: true, supine: true },
  // The push-up family is prone floor work. Incline versions are the
  // whole point for somebody who cannot get down, so they stay off it.
  'push-up': { floorTransfer: true, prone: true },
  'decline-push-up': { floorTransfer: true, prone: true },
  'archer-push-up': { floorTransfer: true, prone: true },
  'diamond-push-up': { floorTransfer: true, prone: true },
  'incline-push-up': { prone: true },
  // Brace and anti-rotation. The pattern default (floor, prone) is right
  // about the planks and the superman and wrong about the two that are
  // face up or on the knees, so only those two are here.
  'hollow-hold': { floorTransfer: true, supine: true, prone: false },
  'dead-bug': { floorTransfer: true, supine: true },
  'bird-dog': { floorTransfer: true, kneeling: true },
  // Flexion defaults to floor and supine, which is the sit-up. The one
  // that hangs is the exception.
  'hanging-leg-raise': { floorTransfer: false, overheadRom: true },
  // Conditioning covers a walk and a hill sprint, which are not the same
  // ground reaction force at all.
  'easy-walk': { impact: 1 },
  'brisk-walk': { impact: 1 },
  'incline-walk': { impact: 1 },
  'bike-erg': { impact: 0 },
  'rowing-erg': { impact: 0 },
  'parking-lot-sprint': { impact: 3 },
  'hill-sprint': { impact: 3 },
  'stair-run': { impact: 3 },
  // A chest-supported row is the one row you lie on.
  'chest-supported-row': { prone: true },
}

/**
 * Everything a movement demands.
 *
 * Takes the pattern rather than looking it up, which keeps this file free
 * of a runtime import of the catalog it describes.
 */
export function demandsOf(exerciseId: string, pattern: MovementPattern): CapabilityDemands {
  return { ...NONE, ...(BY_PATTERN[pattern] ?? {}), ...(OVERRIDES[exerciseId] ?? {}) }
}

/**
 * Does this movement demand something the athlete does not have?
 *
 * Impact is not a block, it is a ceiling, so it is handled by the caller
 * that knows the ceiling rather than folded in here.
 */
export function blockedByCapability(
  exerciseId: string,
  pattern: MovementPattern,
  cannot: CapabilityBlock[],
): boolean {
  if (cannot.length === 0) return false
  const d = demandsOf(exerciseId, pattern)
  return cannot.some((c) => d[c])
}

/** Every id in OVERRIDES, so a test can prove they are all real movements. */
export const OVERRIDDEN_IDS = Object.keys(OVERRIDES)

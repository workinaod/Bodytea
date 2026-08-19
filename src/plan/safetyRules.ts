import type { CapabilityBlock } from './capability'
import type { Joint } from './movement'

// ============================================================
// What a declared limitation means for the plan.
//
// R6 wrote this table months of evidence ago and it has sat unusable,
// because its rows are POSITIONS ("all kneeling and quadruped work",
// "all floor-based supine and prone work") and the only channel into the
// planner was seven joint names. plan/capability.ts added the missing
// vocabulary, so the table can finally be code.
//
// These are programming constraints, not diagnoses. The app suggests
// substitutions and never decides anything is wrong with anybody. The
// joint rows assume no red-flag severity: R6's classifier tier is a
// separate job and this file deliberately does not pretend to it.
//
// Confidence is carried per row because most of it is house heuristic
// standing on a sourced umbrella. The CDC arthritis guidance says
// activity is good for a painful joint and to choose joint-friendly
// movements; it does not say "partial range to comfortable depth". The
// first is why the row exists, the second is ours, and the two are
// marked differently on purpose.
// ============================================================

export type ConstraintId =
  | Joint
  | 'cannot-kneel'
  | 'cannot-get-to-floor'
  | 'cannot-raise-arm-overhead'
  | 'uses-cane-or-support'
  | 'dizziness-on-standing'

export interface SafetyConstraint {
  id: ConstraintId
  /** Functions the plan must not require. */
  blocks: CapabilityBlock[]
  /** Joints to route load away from. Empty for the non-joint rows. */
  avoid: Joint[]
  /**
   * Highest ground reaction force allowed, or undefined for no cap.
   * 0 means nothing that leaves the ground.
   */
  impactCap?: 0 | 1 | 2 | 3
  /** Why this row exists at all. 'source' or the honest alternative. */
  confidence: 'source' | 'house-heuristic'
  /** R6's own source ids, so a row can be traced back to its evidence. */
  sourceRefs: string[]
}

/**
 * R6 section 5, one row at a time.
 *
 * The joint rows keep their existing `avoid` route AND gain the deep
 * range block, which is the part that was missing: routing a knee away
 * from load never stopped the plan asking for a full-depth squat.
 */
export const CONSTRAINTS: Record<ConstraintId, SafetyConstraint> = {
  shoulder: {
    id: 'shoulder', blocks: ['overheadRom'], avoid: ['shoulder'],
    confidence: 'house-heuristic', sourceRefs: ['CDC-ARTH'],
  },
  elbow: {
    id: 'elbow', blocks: [], avoid: ['elbow'],
    confidence: 'house-heuristic', sourceRefs: ['CDC-ARTH'],
  },
  wrist: {
    // R6 is explicit that the wrist row is about the implement rather
    // than a capability: prefer a neutral grip. No block belongs here.
    id: 'wrist', blocks: [], avoid: ['wrist'],
    confidence: 'house-heuristic', sourceRefs: ['CDC-ARTH'],
  },
  'lower-back': {
    id: 'lower-back', blocks: [], avoid: ['lower-back'], impactCap: 1,
    confidence: 'house-heuristic', sourceRefs: ['CDC-ARTH'],
  },
  hip: {
    id: 'hip', blocks: ['deepHipFlexion'], avoid: ['hip'], impactCap: 1,
    confidence: 'house-heuristic', sourceRefs: ['CDC-ARTH'],
  },
  knee: {
    id: 'knee', blocks: ['deepKneeFlexion'], avoid: ['knee'], impactCap: 1,
    confidence: 'source', sourceRefs: ['CDC-ARTH'],
  },
  ankle: {
    id: 'ankle', blocks: [], avoid: ['ankle'], impactCap: 0,
    confidence: 'house-heuristic', sourceRefs: ['CDC-ARTH', 'CDC-OLDER'],
  },
  'cannot-kneel': {
    id: 'cannot-kneel', blocks: ['kneeling'], avoid: [],
    confidence: 'house-heuristic', sourceRefs: ['HOUSE'],
  },
  'cannot-get-to-floor': {
    id: 'cannot-get-to-floor', blocks: ['floorTransfer', 'prone', 'supine'], avoid: [],
    confidence: 'house-heuristic', sourceRefs: ['CDC-OLDER'],
  },
  'cannot-raise-arm-overhead': {
    id: 'cannot-raise-arm-overhead', blocks: ['overheadRom'], avoid: [],
    confidence: 'house-heuristic', sourceRefs: ['HOUSE'],
  },
  'uses-cane-or-support': {
    id: 'uses-cane-or-support', blocks: [], avoid: [], impactCap: 0,
    confidence: 'source', sourceRefs: ['CDC-OLDER'],
  },
  'dizziness-on-standing': {
    // Standing-only dizziness is R6's YELLOW. Dizziness at rest or on
    // exertion, and any fainting, is RED and belongs to the classifier
    // this file does not implement.
    id: 'dizziness-on-standing', blocks: ['floorTransfer'], avoid: [], impactCap: 1,
    confidence: 'house-heuristic', sourceRefs: ['PARQ-2025', 'ACSM-ALG'],
  },
}

/** Every constraint an athlete has declared, resolved from their own keys. */
export function constraintsFor(keys: readonly string[]): SafetyConstraint[] {
  return keys.map((k) => CONSTRAINTS[k as ConstraintId]).filter(Boolean)
}

/**
 * What the planner needs, unioned across everything declared.
 *
 * The impact cap is the LOWEST any constraint asks for, because two
 * limitations do not average into a compromise: an ankle that says no
 * jumping and a back that says light jumping means no jumping.
 */
export function planningLimits(keys: readonly string[]): {
  cannot: CapabilityBlock[]
  avoid: Joint[]
  impactCap?: 0 | 1 | 2 | 3
} {
  const cs = constraintsFor(keys)
  const caps = cs.map((c) => c.impactCap).filter((n): n is 0 | 1 | 2 | 3 => n !== undefined)
  return {
    cannot: [...new Set(cs.flatMap((c) => c.blocks))],
    avoid: [...new Set(cs.flatMap((c) => c.avoid))],
    impactCap: caps.length ? (Math.min(...caps) as 0 | 1 | 2 | 3) : undefined,
  }
}

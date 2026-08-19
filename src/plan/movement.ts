import type { AthleticQuality } from './athletic'
import { blockedByCapability, type CapabilityBlock } from './capability'

// ============================================================
// What the app KNOWS about a strength movement, past its name.
//
// athletic.ts already models the 91 drills properly: quality,
// direction, level, impact, CNS cost, what regresses to what.
// The 94 strength movements had muscles, an equipment tag, and a
// free-text `qualities` array that has drifted to 290 distinct
// strings across the catalog — "Jump force base", "Leg strength",
// "Squat pattern" — which is prose for a human to read, not
// something a planner can reason over.
//
// So the planner could not answer questions it obviously should:
//
//   This day has four pushes and one pull. Is that balanced?
//   Their shoulder hurts. What else can train chest that does
//     not load a shoulder?
//   They are brand new. Is a barbell front squat a reasonable
//     first squat, or should they start somewhere else?
//   They only have dumbbells this week. What is the nearest
//     movement that does the SAME JOB, not just the same muscle?
//   This session already has three high-fatigue lifts in it.
//
// Every one of those is a relationship, and none of them is
// answerable from a list. This file is the relationships.
//
// FIVE AXES, each earning its place by answering one of those.
//
//   PATTERN is the job the movement does. Substitution is
//   pattern-preserving: a dumbbell bench is a fine stand-in for a
//   barbell bench and a lateral raise is not, even though both
//   "train shoulders". Muscle overlap alone produced exactly that
//   kind of nonsense swap.
//
//   ROLE is where it belongs in a session. A primary goes first
//   and heavy; an isolation is not a substitute for one no matter
//   how much muscle overlap it has.
//
//   SKILL and LEVEL are about the athlete, not the movement's
//   difficulty. A front squat is not "harder" than a leg press,
//   it is harder to DO CORRECTLY, and handing it to somebody in
//   week one is how people learn to hate lifting.
//
//   FATIGUE is systemic cost, which is what stops three heavy
//   compounds landing on one day and is not the same thing as the
//   per-muscle set counting engine/volume.ts already does.
//
//   STRESS is the joints a movement actually loads. This is what
//   makes "my shoulder hurts" actionable rather than sympathetic:
//   route around the joint, keep training everything else.
//
// TRANSFER connects this file to athletic.ts, so the app can say
// why a lift is in a jumper's plan in the jumper's own terms.
//
// VETTING: nothing here is invented. Patterns and roles are the
// standard strength-programming vocabulary; regression and
// progression chains follow the accepted teaching order; stress
// lists are the joints a movement is commonly modified FOR, not
// every joint it touches. Where a judgement was genuinely close,
// the entry takes the more conservative option, because the cost
// of calling something advanced that is not is one extra week of
// an easier movement, and the cost of the reverse is an injury.
// ============================================================

export type MovementPattern =
  | 'squat'
  | 'hinge'
  | 'lunge'
  | 'push-horizontal'
  | 'push-vertical'
  | 'pull-horizontal'
  | 'pull-vertical'
  | 'carry'
  | 'brace'
  | 'flexion'
  | 'anti-rotation'
  | 'isolation'
  | 'calf'
  | 'mobility'
  | 'conditioning'

export const PATTERN_LABELS: Record<MovementPattern, string> = {
  squat: 'Squat',
  hinge: 'Hinge',
  lunge: 'Lunge / single leg',
  'push-horizontal': 'Horizontal push',
  'push-vertical': 'Vertical push',
  'pull-horizontal': 'Horizontal pull',
  'pull-vertical': 'Vertical pull',
  carry: 'Carry',
  brace: 'Core brace',
  flexion: 'Core flexion',
  'anti-rotation': 'Anti-rotation',
  isolation: 'Isolation',
  calf: 'Calf',
  mobility: 'Mobility',
  conditioning: 'Conditioning',
}

/** Where a movement belongs in a session, which is not the same as how hard it is. */
export type ProgrammingRole =
  | 'primary'
  | 'secondary'
  | 'accessory'
  | 'isolation'
  | 'prehab'
  | 'conditioning'
  | 'mobility'

/** Joints a movement loads enough that pain there should route around it. */
export type Joint = 'shoulder' | 'elbow' | 'wrist' | 'lower-back' | 'hip' | 'knee' | 'ankle'

export type MovementLevel = 'foundation' | 'intermediate' | 'advanced'

export interface MovementMeta {
  pattern: MovementPattern
  role: ProgrammingRole
  laterality: 'bilateral' | 'unilateral' | 'alternating'
  /** 0 = safe to do unsupervised on day one … 3 = genuinely needs coaching. */
  skill: 0 | 1 | 2 | 3
  /** Systemic cost of one hard set. 0 trivial … 3 whole-body. */
  fatigue: 0 | 1 | 2 | 3
  level: MovementLevel
  /**
   * ACCEPTS external load if the athlete has any.
   *
   * Not "this athlete can add weight to it": a reverse lunge takes
   * dumbbells perfectly well and is still tagged 'none' because it can
   * also be done with nothing. Whether load is actually available is an
   * equipment question, and equipment lives in equip.ts.
   *
   * False means the movement has no load lever at all and progresses by
   * leverage or reps, which is what tells the rep engine that reaching
   * the top of the range is the END of the ladder rather than the moment
   * to add weight.
   */
  loadable: boolean
  /** Loads the muscle at a long length, where the growth stimulus per set is highest. */
  stretchLoaded: boolean
  /** Joints this loads enough that discomfort there should route around it. */
  stress: Joint[]
  regressions?: string[]
  progressions?: string[]
  /** Athletic qualities this strength work actually feeds. */
  transfer?: AthleticQuality[]
}

type Opt = Partial<Omit<MovementMeta, 'pattern' | 'role'>>

const M = (pattern: MovementPattern, role: ProgrammingRole, o: Opt = {}): MovementMeta => ({
  pattern,
  role,
  laterality: 'bilateral',
  skill: 1,
  fatigue: 1,
  level: 'foundation',
  loadable: true,
  stretchLoaded: false,
  stress: [],
  ...o,
})

export const MOVEMENT: Record<string, MovementMeta> = {
  // ---------------- Squat ----------------
  'goblet-squat': M('squat', 'primary', { skill: 1, fatigue: 2, stretchLoaded: true, stress: ['knee'], progressions: ['db-front-squat', 'front-squat'], regressions: ['wall-sit'], transfer: ['athletic-strength', 'vertical-power'] }),
  'db-front-squat': M('squat', 'primary', { skill: 2, fatigue: 2, level: 'intermediate', stretchLoaded: true, stress: ['knee'], regressions: ['goblet-squat'], progressions: ['front-squat'], transfer: ['athletic-strength', 'vertical-power'] }),
  'front-squat': M('squat', 'primary', { skill: 3, fatigue: 3, level: 'advanced', stretchLoaded: true, stress: ['knee', 'wrist', 'lower-back'], regressions: ['db-front-squat', 'goblet-squat'], transfer: ['athletic-strength', 'vertical-power', 'explosive-strength'] }),
  'heels-elevated-goblet': M('squat', 'secondary', { skill: 1, fatigue: 2, stretchLoaded: true, stress: ['knee'], regressions: ['goblet-squat'], transfer: ['athletic-strength'] }),
  'hack-squat': M('squat', 'secondary', { skill: 1, fatigue: 2, stretchLoaded: true, stress: ['knee'], regressions: ['leg-press'], transfer: ['athletic-strength'] }),
  'leg-press': M('squat', 'secondary', { skill: 0, fatigue: 2, stress: ['knee'], progressions: ['hack-squat'], transfer: ['athletic-strength'] }),
  'wall-sit': M('squat', 'accessory', { skill: 0, fatigue: 1, loadable: false, stress: ['knee'], progressions: ['goblet-squat'] }),

  // ---------------- Hinge ----------------
  'romanian-deadlift': M('hinge', 'primary', { skill: 3, fatigue: 3, level: 'advanced', stretchLoaded: true, stress: ['lower-back', 'hip'], regressions: ['db-rdl', 'cable-pull-through'], transfer: ['horizontal-power', 'sprint-hamstring', 'athletic-strength'] }),
  'db-rdl': M('hinge', 'primary', { skill: 2, fatigue: 2, level: 'intermediate', stretchLoaded: true, stress: ['lower-back', 'hip'], regressions: ['cable-pull-through', 'band-good-morning', 'glute-bridge'], progressions: ['romanian-deadlift'], transfer: ['sprint-hamstring', 'horizontal-power'] }),
  'good-morning': M('hinge', 'secondary', { skill: 3, fatigue: 3, level: 'advanced', stretchLoaded: true, stress: ['lower-back', 'hip'], regressions: ['band-good-morning', 'db-rdl'], transfer: ['sprint-hamstring'] }),
  'single-leg-rdl': M('hinge', 'secondary', { laterality: 'unilateral', skill: 3, fatigue: 2, level: 'intermediate', stretchLoaded: true, stress: ['lower-back', 'hip'], regressions: ['db-rdl'], transfer: ['balance-stability', 'sprint-hamstring'] }),
  'hip-thrust': M('hinge', 'secondary', { skill: 1, fatigue: 2, stress: ['hip'], regressions: ['glute-bridge'], transfer: ['horizontal-power', 'acceleration'] }),
  'glute-bridge': M('hinge', 'accessory', { skill: 0, fatigue: 1, loadable: false, progressions: ['single-leg-glute-bridge', 'hip-thrust'], transfer: ['horizontal-power'] }),
  'single-leg-glute-bridge': M('hinge', 'accessory', { laterality: 'unilateral', skill: 1, fatigue: 1, loadable: false, regressions: ['glute-bridge'], progressions: ['hip-thrust'], transfer: ['horizontal-power', 'acceleration'] }),
  'cable-pull-through': M('hinge', 'accessory', { skill: 1, fatigue: 1, stretchLoaded: true, stress: ['hip'], progressions: ['db-rdl'], transfer: ['horizontal-power'] }),
  'band-good-morning': M('hinge', 'accessory', { skill: 1, fatigue: 1, stretchLoaded: true, stress: ['lower-back'], progressions: ['db-rdl'], transfer: ['sprint-hamstring'] }),
  'machine-leg-curl': M('hinge', 'isolation', { skill: 0, fatigue: 1, stress: ['knee'], transfer: ['sprint-hamstring'] }),
  'seated-leg-curl': M('hinge', 'isolation', { skill: 0, fatigue: 1, stretchLoaded: true, stress: ['knee'], transfer: ['sprint-hamstring'] }),
  'slider-leg-curl': M('hinge', 'isolation', { skill: 1, fatigue: 1, loadable: false, stress: ['knee'], progressions: ['nordic-curl'], transfer: ['sprint-hamstring'] }),
  'nordic-curl': M('hinge', 'accessory', { skill: 2, fatigue: 2, level: 'advanced', loadable: false, stretchLoaded: true, stress: ['knee'], regressions: ['slider-leg-curl'], transfer: ['sprint-hamstring'] }),

  // ---------------- Lunge / single leg ----------------
  'walking-lunge': M('lunge', 'secondary', { laterality: 'alternating', skill: 1, fatigue: 2, stretchLoaded: true, stress: ['knee'], regressions: ['reverse-lunge', 'split-squat'], transfer: ['acceleration', 'athletic-strength'] }),
  'reverse-lunge': M('lunge', 'secondary', { laterality: 'alternating', skill: 1, fatigue: 2, stress: ['knee'], regressions: ['split-squat'], progressions: ['walking-lunge'], transfer: ['acceleration'] }),
  'split-squat': M('lunge', 'secondary', { laterality: 'unilateral', skill: 1, fatigue: 2, stress: ['knee'], progressions: ['bulgarian-split-squat', 'shrimp-squat'], transfer: ['athletic-strength', 'balance-stability'] }),
  'bulgarian-split-squat': M('lunge', 'secondary', { laterality: 'unilateral', skill: 2, fatigue: 2, level: 'intermediate', stretchLoaded: true, stress: ['knee', 'hip'], regressions: ['split-squat'], transfer: ['athletic-strength', 'balance-stability'] }),
  'step-up': M('lunge', 'accessory', { laterality: 'unilateral', skill: 1, fatigue: 2, stress: ['knee'], regressions: ['reverse-lunge'], transfer: ['acceleration', 'vertical-power'] }),
  'shrimp-squat': M('lunge', 'secondary', { laterality: 'unilateral', skill: 3, fatigue: 2, level: 'advanced', loadable: false, stress: ['knee'], regressions: ['split-squat', 'reverse-lunge'], transfer: ['balance-stability', 'athletic-strength'] }),
  'cossack-squat': M('lunge', 'accessory', { laterality: 'alternating', skill: 2, fatigue: 1, level: 'intermediate', loadable: false, stretchLoaded: true, stress: ['knee', 'hip'], regressions: ['split-squat'], transfer: ['lateral-power', 'balance-stability'] }),
  'lateral-lunge': M('lunge', 'accessory', { laterality: 'alternating', skill: 1, fatigue: 1, stretchLoaded: true, stress: ['knee', 'hip'], transfer: ['lateral-power'] }),
  'single-leg-squat-box': M('lunge', 'accessory', { laterality: 'unilateral', skill: 2, fatigue: 2, level: 'intermediate', loadable: false, stress: ['knee'], regressions: ['split-squat'], transfer: ['balance-stability'], progressions: ['cossack-squat', 'shrimp-squat'] }),
  'hip-abduction-machine': M('lunge', 'prehab', { skill: 0, fatigue: 0, stress: ['hip'], transfer: ['balance-stability', 'cod'] }),
  'band-lateral-walk': M('lunge', 'prehab', { skill: 0, fatigue: 0, loadable: false, stress: ['hip'], transfer: ['balance-stability', 'cod'] }),

  // ---------------- Horizontal push ----------------
  'flat-db-press': M('push-horizontal', 'primary', { skill: 1, fatigue: 2, stretchLoaded: true, stress: ['shoulder', 'elbow'], regressions: ['floor-press', 'push-up'], transfer: ['athletic-strength'] }),
  'incline-db-press': M('push-horizontal', 'primary', { skill: 1, fatigue: 2, stretchLoaded: true, stress: ['shoulder', 'elbow'], regressions: ['flat-db-press', 'push-up'], transfer: ['athletic-strength'] }),
  'floor-press': M('push-horizontal', 'secondary', { skill: 1, fatigue: 2, stress: ['elbow'], regressions: ['push-up'], transfer: ['athletic-strength'] }),
  'close-grip-press': M('push-horizontal', 'secondary', { skill: 2, fatigue: 2, level: 'intermediate', stress: ['elbow', 'shoulder'], regressions: ['diamond-push-up', 'floor-press'] }),
  'machine-chest-press': M('push-horizontal', 'secondary', { skill: 0, fatigue: 2, stress: ['shoulder'], regressions: ['incline-push-up'] }),
  'push-up': M('push-horizontal', 'secondary', { skill: 1, fatigue: 2, loadable: false, stress: ['shoulder', 'wrist'], regressions: ['incline-push-up'], progressions: ['decline-push-up', 'archer-push-up'], transfer: ['athletic-strength'] }),
  'incline-push-up': M('push-horizontal', 'accessory', { skill: 0, fatigue: 1, loadable: false, stress: ['wrist'], progressions: ['push-up'] }),
  'decline-push-up': M('push-horizontal', 'secondary', { skill: 1, fatigue: 2, level: 'intermediate', loadable: false, stress: ['shoulder', 'wrist'], regressions: ['push-up'], progressions: ['archer-push-up'] }),
  'archer-push-up': M('push-horizontal', 'secondary', { laterality: 'alternating', skill: 2, fatigue: 2, level: 'advanced', loadable: false, stress: ['shoulder', 'wrist'], regressions: ['decline-push-up'] }),
  'diamond-push-up': M('push-horizontal', 'accessory', { skill: 1, fatigue: 1, loadable: false, stress: ['wrist', 'elbow'], regressions: ['push-up'], progressions: ['decline-push-up'] }),
  'pec-deck': M('push-horizontal', 'isolation', { skill: 0, fatigue: 1, stretchLoaded: true, stress: ['shoulder'] }),
  'cable-fly': M('push-horizontal', 'isolation', { skill: 1, fatigue: 1, stretchLoaded: true, stress: ['shoulder'] }),

  // ---------------- Vertical push ----------------
  'standing-ohp': M('push-vertical', 'primary', { skill: 2, fatigue: 3, level: 'intermediate', stress: ['shoulder', 'lower-back'], regressions: ['db-shoulder-press', 'band-overhead-press'], transfer: ['athletic-strength'] }),
  'db-shoulder-press': M('push-vertical', 'secondary', { skill: 1, fatigue: 2, stress: ['shoulder'], regressions: ['band-overhead-press'], progressions: ['standing-ohp'] }),
  'band-overhead-press': M('push-vertical', 'accessory', { skill: 1, fatigue: 1, stress: ['shoulder'], progressions: ['db-shoulder-press'] }),
  'pike-push-up': M('push-vertical', 'secondary', { skill: 2, fatigue: 2, level: 'intermediate', loadable: false, stress: ['shoulder', 'wrist'], regressions: ['db-shoulder-press', 'band-overhead-press'] }),

  // ---------------- Horizontal pull ----------------
  'barbell-row': M('pull-horizontal', 'primary', { skill: 2, fatigue: 3, level: 'intermediate', stress: ['lower-back'], regressions: ['one-arm-db-row', 'chest-supported-row'], transfer: ['athletic-strength'] }),
  'one-arm-db-row': M('pull-horizontal', 'primary', { laterality: 'unilateral', skill: 1, fatigue: 2, stretchLoaded: true, regressions: ['chest-supported-row', 'band-row'], transfer: ['athletic-strength'] }),
  'chest-supported-row': M('pull-horizontal', 'secondary', { skill: 0, fatigue: 1, stretchLoaded: true, regressions: ['band-row'] }),
  'chest-supported-row-machine': M('pull-horizontal', 'secondary', { skill: 0, fatigue: 1, stretchLoaded: true, regressions: ['band-row'] }),
  'seated-cable-row': M('pull-horizontal', 'secondary', { skill: 0, fatigue: 1, stretchLoaded: true, regressions: ['band-row'] }),
  'inverted-row': M('pull-horizontal', 'secondary', { skill: 1, fatigue: 1, loadable: false, progressions: ['underhand-inverted-row'] }),
  'underhand-inverted-row': M('pull-horizontal', 'secondary', { skill: 1, fatigue: 1, loadable: false, stress: ['elbow'] }),
  'band-row': M('pull-horizontal', 'accessory', { skill: 0, fatigue: 1, progressions: ['inverted-row'] }),
  'face-pull': M('pull-horizontal', 'prehab', { skill: 0, fatigue: 0, stress: ['shoulder'] }),
  'band-face-pull': M('pull-horizontal', 'prehab', { skill: 0, fatigue: 0, stress: ['shoulder'] }),
  'band-pull-apart': M('pull-horizontal', 'prehab', { skill: 0, fatigue: 0 }),
  'prone-y-raise': M('pull-horizontal', 'prehab', { skill: 0, fatigue: 0, stress: ['shoulder'] }),
  'prone-rear-delt-raise': M('pull-horizontal', 'prehab', { skill: 0, fatigue: 0, loadable: false }),
  'rear-delt-raise': M('pull-horizontal', 'isolation', { skill: 0, fatigue: 0, stress: ['shoulder'] }),

  // ---------------- Vertical pull ----------------
  'pull-up': M('pull-vertical', 'primary', { skill: 2, fatigue: 2, level: 'intermediate', loadable: false, stretchLoaded: true, stress: ['shoulder', 'elbow'], regressions: ['assisted-pull-up', 'lat-pulldown'], transfer: ['athletic-strength'] }),
  'chin-up': M('pull-vertical', 'primary', { skill: 2, fatigue: 2, level: 'intermediate', loadable: false, stretchLoaded: true, stress: ['elbow', 'shoulder'], regressions: ['assisted-pull-up'] }),
  'assisted-pull-up': M('pull-vertical', 'secondary', { skill: 1, fatigue: 2, stretchLoaded: true, stress: ['shoulder'], progressions: ['pull-up'] }),
  'lat-pulldown': M('pull-vertical', 'secondary', { skill: 0, fatigue: 1, stretchLoaded: true, stress: ['shoulder'], progressions: ['pull-up'] }),
  'straight-arm-pulldown': M('pull-vertical', 'isolation', { skill: 1, fatigue: 1, stretchLoaded: true, stress: ['shoulder'] }),
  'db-pullover': M('pull-vertical', 'isolation', { skill: 1, fatigue: 1, stretchLoaded: true, stress: ['shoulder'] }),

  // ---------------- Isolation: arms and delts ----------------
  'ez-bar-curl': M('isolation', 'isolation', { skill: 0, fatigue: 1, stress: ['elbow', 'wrist'] }),
  'hammer-curl': M('isolation', 'isolation', { skill: 0, fatigue: 1, stress: ['elbow'] }),
  'incline-db-curl': M('isolation', 'isolation', { skill: 0, fatigue: 1, stretchLoaded: true, stress: ['elbow', 'shoulder'] }),
  'cable-curl': M('isolation', 'isolation', { skill: 0, fatigue: 1, stress: ['elbow'] }),
  'band-curl': M('isolation', 'isolation', { skill: 0, fatigue: 0, stress: ['elbow'] }),
  'overhead-tricep-extension': M('isolation', 'isolation', { skill: 0, fatigue: 1, stretchLoaded: true, stress: ['elbow', 'shoulder'] }),
  'tricep-pushdown': M('isolation', 'isolation', { skill: 0, fatigue: 1, stress: ['elbow'] }),
  'band-pressdown': M('isolation', 'isolation', { skill: 0, fatigue: 0, stress: ['elbow'] }),
  'lateral-raise': M('isolation', 'isolation', { skill: 0, fatigue: 1, stress: ['shoulder'] }),
  'cable-lateral-raise': M('isolation', 'isolation', { skill: 0, fatigue: 1, stress: ['shoulder'] }),
  'leg-extension': M('isolation', 'isolation', { skill: 0, fatigue: 1, stress: ['knee'] }),

  // ---------------- Calf ----------------
  'single-leg-calf-raise': M('calf', 'accessory', { laterality: 'unilateral', skill: 0, fatigue: 1, stretchLoaded: true, stress: ['ankle'], transfer: ['ankle-stiffness', 'foot-ankle'] }),
  'double-leg-calf-raise': M('calf', 'accessory', { skill: 0, fatigue: 1, stress: ['ankle'], progressions: ['single-leg-calf-raise'], transfer: ['ankle-stiffness'] }),
  'seated-calf-raise': M('calf', 'accessory', { skill: 0, fatigue: 1, stress: ['ankle'], transfer: ['foot-ankle'] }),
  'standing-calf-machine': M('calf', 'accessory', { skill: 0, fatigue: 1, stretchLoaded: true, stress: ['ankle'], transfer: ['ankle-stiffness'] }),
  'bodyweight-calf-raise': M('calf', 'accessory', { laterality: 'unilateral', skill: 0, fatigue: 1, loadable: false, stretchLoaded: true, stress: ['ankle'], transfer: ['ankle-stiffness'], progressions: ['single-leg-calf-raise'] }),
  'tibialis-raise': M('calf', 'prehab', { skill: 0, fatigue: 0, loadable: false, stress: ['ankle'], transfer: ['foot-ankle'] }),

  // ---------------- Core ----------------
  'plank-side-plank': M('brace', 'accessory', { skill: 0, fatigue: 1, loadable: false, transfer: ['balance-stability'], progressions: ['hollow-hold'] }),
  'hollow-hold': M('brace', 'accessory', { skill: 1, fatigue: 1, loadable: false, transfer: ['balance-stability'] }),
  'dead-bug': M('anti-rotation', 'accessory', { skill: 0, fatigue: 0, loadable: false, transfer: ['coordination'] }),
  'bird-dog': M('anti-rotation', 'prehab', { skill: 0, fatigue: 0, loadable: false, stress: ['lower-back'], transfer: ['balance-stability'], progressions: ['dead-bug'] }),
  'superman-hold': M('brace', 'prehab', { skill: 0, fatigue: 0, loadable: false, stress: ['lower-back'], progressions: ['hollow-hold'] }),
  'hanging-leg-raise': M('flexion', 'accessory', { skill: 2, fatigue: 1, level: 'intermediate', loadable: false, stress: ['shoulder'], regressions: ['weighted-situp'] }),
  'weighted-situp': M('flexion', 'accessory', { skill: 0, fatigue: 1, stress: ['lower-back'] }),

  // ---------------- Carry ----------------
  'farmer-carry': M('carry', 'accessory', { skill: 0, fatigue: 2, transfer: ['athletic-strength', 'balance-stability'] }),
  'towel-hang': M('carry', 'accessory', { skill: 0, fatigue: 1, loadable: false, stress: ['shoulder', 'elbow'] }),
  'dead-hang': M('carry', 'mobility', { skill: 0, fatigue: 0, loadable: false, stress: ['shoulder'], progressions: ['towel-hang'] }),

  // ---------------- Mobility ----------------
  'hip-9090-switch': M('mobility', 'mobility', { skill: 1, fatigue: 0, loadable: false, stress: ['hip'] }),
  'deep-squat-hold': M('mobility', 'mobility', { skill: 0, fatigue: 0, loadable: false, stress: ['knee', 'ankle'] }),
  'ankle-wall-mobilization': M('mobility', 'mobility', { skill: 0, fatigue: 0, loadable: false, stress: ['ankle'] }),
  'couch-stretch': M('mobility', 'mobility', { skill: 0, fatigue: 0, loadable: false, stress: ['knee', 'hip'] }),
  't-spine-opener': M('mobility', 'mobility', { skill: 0, fatigue: 0, loadable: false }),
  'dynamic-warmup': M('mobility', 'mobility', { skill: 0, fatigue: 0, loadable: false }),

  // ---------------- Conditioning ----------------
  'easy-walk': M('conditioning', 'conditioning', { skill: 0, fatigue: 0, loadable: false }),
  'brisk-walk': M('conditioning', 'conditioning', { skill: 0, fatigue: 1, loadable: false }),
  'easy-jog': M('conditioning', 'conditioning', { skill: 0, fatigue: 1, loadable: false, stress: ['knee', 'ankle'] }),
  'incline-walk': M('conditioning', 'conditioning', { skill: 0, fatigue: 1, loadable: false }),
  'parking-lot-sprint': M('conditioning', 'conditioning', { skill: 1, fatigue: 2, loadable: false, stress: ['knee', 'ankle'], transfer: ['acceleration'] }),
  'stair-run': M('conditioning', 'conditioning', { skill: 0, fatigue: 2, loadable: false, stress: ['knee'], transfer: ['acceleration'] }),
  'hill-sprint': M('conditioning', 'conditioning', { skill: 1, fatigue: 2, loadable: false, stress: ['knee', 'ankle'], transfer: ['acceleration', 'horizontal-power'] }),
  'circuit-a': M('conditioning', 'conditioning', { skill: 0, fatigue: 2, loadable: false }),
  'circuit-b': M('conditioning', 'conditioning', { skill: 0, fatigue: 2, loadable: false }),
  'bike-erg': M('conditioning', 'conditioning', { skill: 0, fatigue: 1, loadable: false }),
  'rowing-erg': M('conditioning', 'conditioning', { skill: 0, fatigue: 2, loadable: false, stress: ['lower-back'] }),
}

export function movementFor(id: string): MovementMeta | null {
  return MOVEMENT[id] ?? null
}

// ---------------- Reasoning over the graph ----------------

const LEVEL_RANK: Record<MovementLevel, number> = { foundation: 0, intermediate: 1, advanced: 2 }

/** Push and pull are opposites; everything else stands alone. */
const OPPOSITE: Partial<Record<MovementPattern, MovementPattern>> = {
  'push-horizontal': 'pull-horizontal',
  'pull-horizontal': 'push-horizontal',
  'push-vertical': 'pull-vertical',
  'pull-vertical': 'push-vertical',
}

export function oppositePattern(p: MovementPattern): MovementPattern | null {
  return OPPOSITE[p] ?? null
}

export interface SubstituteQuery {
  /** Equipment tags the athlete has, already including 'none'. */
  can: (id: string) => boolean
  /** Joints to route around. A movement stressing any of these is out. */
  avoid?: Joint[]
  /**
   * Functions the body does not have, which is a different question from
   * a joint that hurts and needs a different field to ask it.
   *
   * `avoid` routes around pain: less load on that knee. `cannot` routes
   * around absence: somebody who cannot get down to the floor is not in
   * pain and does not want a lighter plank, they want a movement that
   * happens standing up. Seven joints used to be the whole vocabulary
   * here, so "I cannot kneel" reached the planner as nothing at all.
   */
  cannot?: CapabilityBlock[]
  /**
   * Never hand back something harder to execute than this.
   *
   * Defaults to one step above the movement being replaced, floored at 1,
   * NOT to the movement's own skill. A leg press is skill 0 and almost
   * nothing else is, so the stricter rule left a machine-only movement
   * with no legal substitute at all — which is exactly the athlete who
   * needs one, the week they are away from their gym. Skill 1 is "the
   * app's own guide is enough"; 2 and above is where coaching starts, and
   * that line is the one worth holding.
   */
  maxSkill?: 0 | 1 | 2 | 3
  /** Cap the systemic cost, for a day that has already taken enough. */
  maxFatigue?: 0 | 1 | 2 | 3
  /**
   * Joints to NARROW around rather than route around. Limit-range mode.
   *
   * `avoid` is a hard reject and it is right for a joint that hurt twice
   * in a fortnight: that movement, today, is out. It is the wrong tool
   * for a limitation somebody declared once and lives with, because
   * every squat in this catalog stresses the knee, so a declared bad
   * knee emptied the entire squat pattern and the athlete got no lower
   * body work at all rather than a gentler version of it.
   *
   * R6's own row for the knee says what should happen instead: partial
   * squats, leg-press-style patterns before deep free squats. So a
   * limited joint keeps its movements and reorders them, and `cannot`
   * removes the deep-range ones. Narrow, do not delete.
   */
  limited?: Joint[]
}

/**
 * The nearest movement that does the SAME JOB.
 *
 * Pattern first, because that is what a substitution has to preserve.
 * Swapping a bench press for a lateral raise because both "train
 * shoulders" is how a muscle-overlap search fails, and it fails
 * confidently. Role is the tie-break after that: a primary should be
 * replaced by something that can carry a session, not by an isolation.
 *
 * Ordered by how close the replacement is, and never harder to execute
 * than the movement it replaces, because a substitution arrives at the
 * worst possible moment to learn a new skill: mid-session, on a day that
 * already went wrong.
 */
export function substitutesFor(id: string, q: SubstituteQuery): string[] {
  const meta = MOVEMENT[id]
  if (!meta) return []
  const avoid = new Set(q.avoid ?? [])
  const limited = new Set(q.limited ?? [])
  const maxSkill = q.maxSkill ?? Math.max(meta.skill, 1)
  const scored: { id: string; score: number }[] = []
  for (const [otherId, m] of Object.entries(MOVEMENT)) {
    if (otherId === id) continue
    if (m.pattern !== meta.pattern) continue
    if (m.skill > maxSkill) continue
    if (q.maxFatigue !== undefined && m.fatigue > q.maxFatigue) continue
    if (m.stress.some((j) => avoid.has(j))) continue
    if (blockedByCapability(otherId, m.pattern, q.cannot ?? [])) continue
    if (!q.can(otherId)) continue
    let score = 0
    // A movement that loads a limited joint is still offered, and offered
    // after every movement that does not. This is the whole of
    // limit-range mode: the pattern survives and the gentlest option
    // surfaces first.
    //
    // The penalty is deliberately large enough to dominate the closeness
    // scoring below rather than trade against it. A better role match is
    // not a reason to put the knee they told us about back at the top of
    // the list; within each group the normal ranking still decides.
    if (m.stress.some((j) => limited.has(j))) score -= 1000
    if (m.role === meta.role) score += 4
    if (m.laterality === meta.laterality) score += 2
    if (m.stretchLoaded === meta.stretchLoaded) score += 1
    // Closest level wins, in either direction.
    score -= Math.abs(LEVEL_RANK[m.level] - LEVEL_RANK[meta.level])
    scored.push({ id: otherId, score })
  }
  return scored.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id)).map((s) => s.id)
}

/**
 * The full ladder through a movement: what builds to it, then what it
 * earns. Same shape as athletic.ts's progressionChain, deliberately, so
 * the UI can render one thing for both libraries.
 */
export function movementChain(id: string): string[] {
  const meta = MOVEMENT[id]
  if (!meta) return [id]
  const seen = new Set<string>([id])
  const back: string[] = []
  let cur = meta.regressions?.[0]
  while (cur && !seen.has(cur) && back.length < 4) {
    seen.add(cur)
    back.unshift(cur)
    cur = MOVEMENT[cur]?.regressions?.[0]
  }
  const fwd: string[] = []
  cur = meta.progressions?.[0]
  while (cur && !seen.has(cur) && fwd.length < 4) {
    seen.add(cur)
    fwd.push(cur)
    cur = MOVEMENT[cur]?.progressions?.[0]
  }
  return [...back, id, ...fwd]
}

/** One step easier, that this athlete can actually do. */
export function regressionFor(id: string, can: (x: string) => boolean): string | null {
  return (MOVEMENT[id]?.regressions ?? []).find(can) ?? null
}

/** One step harder, earned. */
export function progressionFor(id: string, can: (x: string) => boolean): string | null {
  return (MOVEMENT[id]?.progressions ?? []).find(can) ?? null
}

export interface PatternCount {
  pattern: MovementPattern
  sets: number
}

/** Sets landing on each movement pattern across a session. */
export function patternLoad(exercises: { exerciseId: string; sets: number }[]): PatternCount[] {
  const by = new Map<MovementPattern, number>()
  for (const e of exercises) {
    const m = MOVEMENT[e.exerciseId]
    if (!m || m.pattern === 'mobility' || m.pattern === 'conditioning') continue
    by.set(m.pattern, (by.get(m.pattern) ?? 0) + Math.max(0, e.sets))
  }
  return [...by.entries()].map(([pattern, sets]) => ({ pattern, sets })).sort((a, b) => b.sets - a.sets)
}

export interface PatternImbalance {
  pattern: MovementPattern
  opposite: MovementPattern
  sets: number
  oppositeSets: number
}

/**
 * Push/pull imbalance, which is the one that actually shows up on people.
 *
 * A ratio rather than a difference: two sets against zero is a rounding
 * error on a light day, and eight against two is a year of rounded
 * shoulders. Only flagged when the heavier side is doing real volume.
 */
export const IMBALANCE_RATIO = 2
export const IMBALANCE_MIN_SETS = 4

export function patternImbalances(exercises: { exerciseId: string; sets: number }[]): PatternImbalance[] {
  const load = new Map(patternLoad(exercises).map((p) => [p.pattern, p.sets]))
  const out: PatternImbalance[] = []
  for (const [pattern, sets] of load) {
    const opposite = OPPOSITE[pattern]
    if (!opposite) continue
    const oppositeSets = load.get(opposite) ?? 0
    if (sets < IMBALANCE_MIN_SETS) continue
    if (sets >= (oppositeSets || 0.5) * IMBALANCE_RATIO) {
      out.push({ pattern, opposite, sets, oppositeSets })
    }
  }
  return out.sort((a, b) => b.sets - a.sets)
}

/**
 * Systemic cost of a session, which is not the same question as the
 * per-muscle set count engine/volume.ts answers. Three heavy compounds
 * can be perfectly balanced per muscle and still be a day nobody
 * recovers from.
 */
export function sessionFatigue(exercises: { exerciseId: string; sets: number }[]): number {
  return exercises.reduce((n, e) => n + (MOVEMENT[e.exerciseId]?.fatigue ?? 0) * Math.max(0, e.sets), 0)
}

/** Movements that load a joint the athlete has flagged. */
export function stressing(exercises: { exerciseId: string }[], joints: Joint[]): string[] {
  const set = new Set(joints)
  return exercises.filter((e) => (MOVEMENT[e.exerciseId]?.stress ?? []).some((j) => set.has(j))).map((e) => e.exerciseId)
}

/** Everything in the library that feeds one athletic quality. */
export function transfersTo(quality: AthleticQuality): string[] {
  return Object.entries(MOVEMENT)
    .filter(([, m]) => m.transfer?.includes(quality))
    .map(([id]) => id)
}

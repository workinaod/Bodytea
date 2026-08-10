import type { EquipTag } from '../types'

// ============================================================
// Normalized equipment vocabulary for the generator. The prose
// `ExerciseDef.equipment` stays for display; these tags answer
// "can this user, with this gear, do this exercise?"
// A missing entry means bodyweight-anywhere ('none').
// ============================================================

export const EXERCISE_EQUIP: Record<string, EquipTag[]> = {
  // ---- Monday ----
  'falling-start-sprint': ['open-space'],
  'box-jump': ['box'],
  'goblet-squat': ['dumbbell'],
  'db-front-squat': ['dumbbell'],
  'heels-elevated-goblet': ['dumbbell', 'plate'],
  'romanian-deadlift': ['barbell'],
  'bulgarian-split-squat': ['dumbbell', 'bench'],
  'walking-lunge': ['dumbbell'],
  'step-up': ['dumbbell', 'bench'],
  'single-leg-calf-raise': ['dumbbell'],
  'hanging-leg-raise': ['pullup-bar'],
  // ---- Tuesday ----
  'incline-db-press': ['dumbbell', 'incline-bench'],
  'flat-db-press': ['dumbbell', 'bench'],
  'floor-press': ['barbell'],
  'standing-ohp': ['barbell'],
  'lateral-raise': ['dumbbell'],
  'close-grip-press': ['barbell', 'bench'],
  'overhead-tricep-extension': ['dumbbell'],
  'prone-y-raise': ['dumbbell', 'incline-bench'],
  // ---- Wednesday ----
  'front-squat': ['barbell'],
  'hip-thrust': ['barbell', 'bench'],
  'single-leg-rdl': ['dumbbell'],
  'good-morning': ['barbell'],
  'slider-leg-curl': ['none'],
  'seated-calf-raise': ['dumbbell', 'bench'],
  'double-leg-calf-raise': ['dumbbell'],
  'weighted-situp': ['dumbbell'],
  'plank-side-plank': ['none'],
  // ---- Thursday ----
  'hip-9090-switch': ['none'],
  'deep-squat-hold': ['none'],
  'ankle-wall-mobilization': ['none'],
  'couch-stretch': ['none'],
  't-spine-opener': ['none'],
  'dead-hang': ['pullup-bar'],
  'easy-walk': ['none'],
  // ---- Friday ----
  'pull-up': ['pullup-bar'],
  'barbell-row': ['barbell'],
  'db-pullover': ['dumbbell', 'bench'],
  'one-arm-db-row': ['dumbbell', 'bench'],
  'chest-supported-row': ['dumbbell', 'incline-bench'],
  'rear-delt-raise': ['dumbbell'],
  'ez-bar-curl': ['barbell'],
  'incline-db-curl': ['dumbbell', 'incline-bench'],
  'hammer-curl': ['dumbbell'],
  'farmer-carry': ['dumbbell'],
  'towel-hang': ['pullup-bar'],
  // ---- Saturday ----
  'dynamic-warmup': ['none'],
  'max-velocity-sprint': ['open-space'],
  'flying-sprint': ['open-space'],
  'pogo-hop': ['none'],
  'approach-jump': ['court'],
  'dunk-attempt': ['court'],
  // ---- Cardio ----
  'easy-jog': ['open-space'],
  'brisk-walk': ['none'],
  'incline-walk': ['treadmill'],
  'hill-sprint': ['hill-stairs'],
  'parking-lot-sprint': ['open-space'],
  'stair-run': ['hill-stairs'],
  'circuit-a': ['none'],
  'circuit-b': ['none'],
  // ---- Generator catalog ----
  'push-up': ['none'],
  'pike-push-up': ['none'],
  'inverted-row': ['none'],
  'chin-up': ['pullup-bar'],
  'split-squat': ['none'],
  'reverse-lunge': ['none'],
  'glute-bridge': ['none'],
  'hollow-hold': ['none'],
  'dead-bug': ['none'],
  'db-shoulder-press': ['dumbbell'],
  'lat-pulldown': ['machine'],
  'seated-cable-row': ['machine'],
  'leg-press': ['machine'],
  'machine-leg-curl': ['machine'],
  'bike-erg': ['machine'],
  'rowing-erg': ['machine'],
  'db-rdl': ['dumbbell'],

  // ---- Athletic Performance Library ----
  'two-point-start': ['open-space'],
  'three-point-start': ['open-space'],
  'push-up-start': ['open-space'],
  'wall-drive': [],
  'a-march': [],
  'a-skip': [],
  'resisted-start': ['band', 'open-space'],
  'sled-sprint': ['sled', 'open-space'],
  'accel-20': ['open-space'],
  'flying-20': ['open-space'],
  'build-up-sprint': ['open-space'],
  'wicket-run': ['hurdle', 'open-space'],
  'dribble-run': [],
  'standing-vertical-jump': [],
  'countermovement-jump': [],
  'squat-jump': [],
  'one-foot-jump': ['open-space'],
  'penultimate-drill': ['open-space'],
  'penultimate-approach-jump': ['open-space'],
  'low-box-approach-jump': ['box', 'open-space'],
  'broad-jump': ['open-space'],
  'broad-jump-stick': ['open-space'],
  'repeated-broad-jump': ['open-space'],
  'single-leg-broad-jump': ['open-space'],
  'power-bound': ['open-space'],
  'single-leg-bound': ['open-space'],
  'ankle-hop': [],
  'alternating-pogo': [],
  'single-leg-pogo': [],
  'line-hop': [],
  'rudiment-hop': ['open-space'],
  'snap-down-rebound': [],
  'low-hurdle-hop': ['hurdle'],
  'depth-drop': ['box'],
  'depth-jump': ['box'],
  'repeated-cmj': [],
  'snap-down': [],
  'snap-down-stick': [],
  'drop-landing': ['box'],
  'single-leg-landing': [],
  'decel-stick': ['open-space'],
  'lateral-bound': ['open-space'],
  'lateral-bound-stick': ['open-space'],
  'skater-bound': ['open-space'],
  'lateral-line-hop': [],
  'crossover-bound': ['open-space'],
  'lateral-shuffle': ['open-space'],
  'shuttle-5-10-5': ['cones', 'open-space'],
  'l-drill': ['cones', 'open-space'],
  'shuffle-to-sprint': ['open-space'],
  'crossover-run': ['open-space'],
  'plant-and-go': ['open-space'],
  'cut-45': ['open-space'],
  'cut-90': ['open-space'],
  'turn-180': ['open-space'],
  'curved-sprint': ['open-space'],
  'mirror-drill': ['partner', 'open-space'],
  'reactive-shuttle': ['cones', 'open-space'],
  'step-down': ['box'],
  'lateral-lunge': [],
  'single-leg-squat-box': ['bench'],
  'balance-to-jump': [],
  'trap-bar-jump': ['trap-bar'],
  'jump-squat': ['dumbbell'],
  'kb-swing': ['kettlebell'],
  'mb-scoop-toss': ['med-ball', 'open-space'],
  'mb-rotational-throw': ['med-ball'],
  'mb-overhead-throw': ['med-ball', 'open-space'],
  'sled-push': ['sled'],
  'nordic-curl': ['bench', 'partner'],
  'tibialis-raise': [],
}

export function equipFor(id: string): EquipTag[] {
  return EXERCISE_EQUIP[id] ?? ['none']
}

/** Can this exercise be done with the given equipment? ('none' always can.) */
export function canDo(id: string, owned: Set<EquipTag>): boolean {
  const need = equipFor(id)
  return need.every((t) => t === 'none' || owned.has(t))
}

/**
 * Fixed-anchor substitutions in preference order (same movement job,
 * decreasing equipment). Used at plan-generation time only.
 */
export const SUBSTITUTIONS: Record<string, string[]> = {
  'falling-start-sprint': ['parking-lot-sprint', 'pogo-hop'],
  'box-jump': ['pogo-hop', 'circuit-a'],
  'max-velocity-sprint': ['hill-sprint', 'parking-lot-sprint', 'circuit-a'],
  'flying-sprint': ['parking-lot-sprint', 'circuit-a'],
  'approach-jump': ['box-jump', 'pogo-hop'],
  'dunk-attempt': ['box-jump', 'pogo-hop'],
  'romanian-deadlift': ['db-rdl', 'single-leg-rdl', 'glute-bridge'],
  'db-rdl': ['single-leg-rdl', 'glute-bridge'],
  'good-morning': ['db-rdl', 'glute-bridge'],
  'hip-thrust': ['glute-bridge'],
  'front-squat': ['goblet-squat', 'split-squat'],
  'goblet-squat': ['split-squat'],
  'pull-up': ['lat-pulldown', 'inverted-row'],
  'chin-up': ['inverted-row'],
  'barbell-row': ['one-arm-db-row', 'seated-cable-row', 'inverted-row'],
  'standing-ohp': ['db-shoulder-press', 'pike-push-up'],
  'db-shoulder-press': ['pike-push-up'],
  'incline-db-press': ['flat-db-press', 'push-up'],
  'flat-db-press': ['floor-press', 'push-up'],
  'lateral-raise': ['pike-push-up'],
  'overhead-tricep-extension': ['pike-push-up', 'push-up'],
  'prone-y-raise': ['inverted-row'],
  'rear-delt-raise': ['inverted-row'],
  'farmer-carry': ['towel-hang', 'dead-hang'],
  'hanging-leg-raise': ['hollow-hold'],
  'weighted-situp': ['hollow-hold'],
  'dead-hang': ['couch-stretch'],
  'towel-hang': ['dead-hang'],
  'bulgarian-split-squat': ['split-squat', 'reverse-lunge'],
  'walking-lunge': ['reverse-lunge'],
  'step-up': ['reverse-lunge'],
  'single-leg-calf-raise': ['double-leg-calf-raise', 'pogo-hop'],
  'double-leg-calf-raise': ['pogo-hop'],
  'seated-calf-raise': ['double-leg-calf-raise', 'pogo-hop'],
}

/** Resolve an exercise to itself or its best equipment-legal substitute (null if nothing fits). */
export function resolveForEquipment(id: string, owned: Set<EquipTag>): string | null {
  if (canDo(id, owned)) return id
  for (const sub of SUBSTITUTIONS[id] ?? []) {
    if (canDo(sub, owned)) return sub
  }
  return null
}

import type { MuscleRegion } from '../components/MuscleMap'

// ============================================================
// Muscle activation per exercise — drives the MuscleMap visual.
// Primary = the muscles doing the job; secondary = assisting.
// Cardio uses 'heart' (+ 'full-body' wash).
// ============================================================

export interface MuscleActivation {
  primary: MuscleRegion[]
  secondary: MuscleRegion[]
}

export const EXERCISE_MUSCLES: Record<string, MuscleActivation> = {
  // ---- Monday: power + first step ----
  'falling-start-sprint': { primary: ['glutes', 'hamstrings'], secondary: ['quads', 'calves', 'hip-flexors'] },
  'box-jump': { primary: ['quads', 'glutes'], secondary: ['calves', 'hamstrings'] },
  'goblet-squat': { primary: ['quads', 'glutes'], secondary: ['abs', 'adductors'] },
  'db-front-squat': { primary: ['quads', 'glutes'], secondary: ['abs', 'mid-back'] },
  'heels-elevated-goblet': { primary: ['quads'], secondary: ['glutes', 'adductors'] },
  'romanian-deadlift': { primary: ['hamstrings', 'glutes'], secondary: ['lower-back', 'forearms'] },
  'bulgarian-split-squat': { primary: ['quads', 'glutes'], secondary: ['adductors', 'hamstrings'] },
  'walking-lunge': { primary: ['quads', 'glutes'], secondary: ['hamstrings', 'calves'] },
  'step-up': { primary: ['glutes', 'quads'], secondary: ['hamstrings', 'calves'] },
  'single-leg-calf-raise': { primary: ['calves'], secondary: ['achilles-feet'] },
  'hanging-leg-raise': { primary: ['abs', 'hip-flexors'], secondary: ['obliques', 'forearms'] },

  // ---- Tuesday: push ----
  'incline-db-press': { primary: ['chest-upper'], secondary: ['delts-front', 'triceps'] },
  'flat-db-press': { primary: ['chest'], secondary: ['delts-front', 'triceps'] },
  'floor-press': { primary: ['triceps', 'chest'], secondary: ['delts-front'] },
  'standing-ohp': { primary: ['delts-front', 'delts-side'], secondary: ['triceps', 'chest-upper', 'abs'] },
  'lateral-raise': { primary: ['delts-side'], secondary: ['traps'] },
  'close-grip-press': { primary: ['triceps'], secondary: ['chest', 'delts-front'] },
  'overhead-tricep-extension': { primary: ['triceps'], secondary: ['delts-front'] },
  'prone-y-raise': { primary: ['delts-rear', 'mid-back'], secondary: ['traps'] },

  // ---- Wednesday: lower strength ----
  'front-squat': { primary: ['quads', 'glutes'], secondary: ['abs', 'mid-back'] },
  'hip-thrust': { primary: ['glutes'], secondary: ['hamstrings', 'lower-back'] },
  'single-leg-rdl': { primary: ['hamstrings', 'glutes'], secondary: ['lower-back', 'abs'] },
  'good-morning': { primary: ['hamstrings', 'lower-back'], secondary: ['glutes'] },
  'slider-leg-curl': { primary: ['hamstrings'], secondary: ['glutes', 'abs'] },
  'seated-calf-raise': { primary: ['calves'], secondary: ['achilles-feet'] },
  'double-leg-calf-raise': { primary: ['calves'], secondary: ['achilles-feet'] },
  'weighted-situp': { primary: ['abs'], secondary: ['hip-flexors'] },
  'plank-side-plank': { primary: ['abs', 'obliques'], secondary: ['delts-front', 'lower-back'] },

  // ---- Thursday: mobility ----
  'hip-9090-switch': { primary: ['hip-flexors', 'glutes'], secondary: ['adductors'] },
  'deep-squat-hold': { primary: ['adductors', 'hip-flexors'], secondary: ['calves', 'lower-back'] },
  'ankle-wall-mobilization': { primary: ['tibialis', 'achilles-feet'], secondary: ['calves'] },
  'couch-stretch': { primary: ['hip-flexors', 'quads'], secondary: [] },
  't-spine-opener': { primary: ['mid-back'], secondary: ['chest', 'delts-rear'] },
  'dead-hang': { primary: ['lats', 'forearms'], secondary: ['delts-side'] },
  'easy-walk': { primary: ['heart'], secondary: ['full-body'] },

  // ---- Friday: pull + grip ----
  'pull-up': { primary: ['lats'], secondary: ['biceps', 'mid-back', 'forearms'] },
  'barbell-row': { primary: ['lats', 'mid-back'], secondary: ['biceps', 'delts-rear', 'lower-back'] },
  'db-pullover': { primary: ['lats', 'chest'], secondary: ['triceps'] },
  'one-arm-db-row': { primary: ['lats'], secondary: ['biceps', 'mid-back'] },
  'chest-supported-row': { primary: ['mid-back', 'delts-rear'], secondary: ['lats', 'biceps'] },
  'rear-delt-raise': { primary: ['delts-rear'], secondary: ['mid-back', 'traps'] },
  'ez-bar-curl': { primary: ['biceps'], secondary: ['forearms'] },
  'incline-db-curl': { primary: ['biceps'], secondary: [] },
  'hammer-curl': { primary: ['biceps', 'forearms'], secondary: [] },
  'farmer-carry': { primary: ['forearms', 'traps'], secondary: ['abs', 'obliques'] },
  'towel-hang': { primary: ['forearms'], secondary: ['lats'] },

  // ---- Saturday: speed + elastic ----
  'dynamic-warmup': { primary: ['full-body'], secondary: ['heart'] },
  'max-velocity-sprint': { primary: ['hamstrings', 'glutes'], secondary: ['calves', 'hip-flexors'] },
  'flying-sprint': { primary: ['hamstrings', 'glutes'], secondary: ['calves', 'hip-flexors'] },
  'pogo-hop': { primary: ['calves', 'achilles-feet'], secondary: ['quads'] },
  'approach-jump': { primary: ['glutes', 'quads'], secondary: ['hamstrings', 'calves'] },
  'dunk-attempt': { primary: ['glutes', 'quads'], secondary: ['calves', 'abs'] },

  // ---- Cardio backups ----
  'easy-jog': { primary: ['heart'], secondary: ['full-body'] },
  'brisk-walk': { primary: ['heart'], secondary: ['full-body'] },
  'incline-walk': { primary: ['heart'], secondary: ['glutes', 'calves'] },
  'hill-sprint': { primary: ['glutes', 'hamstrings'], secondary: ['heart', 'calves'] },
  'parking-lot-sprint': { primary: ['hamstrings', 'glutes'], secondary: ['heart', 'quads'] },
  'stair-run': { primary: ['quads', 'glutes'], secondary: ['calves', 'heart'] },
  'circuit-a': { primary: ['full-body'], secondary: ['heart'] },
  'circuit-b': { primary: ['abs', 'hip-flexors'], secondary: ['heart', 'full-body'] },

  // ---- Generator catalog (bodyweight tier + gym machines) ----
  'push-up': { primary: ['chest', 'triceps'], secondary: ['delts-front', 'abs'] },
  'pike-push-up': { primary: ['delts-front', 'delts-side'], secondary: ['triceps', 'chest-upper'] },
  'inverted-row': { primary: ['lats', 'mid-back'], secondary: ['biceps', 'delts-rear'] },
  'chin-up': { primary: ['biceps', 'lats'], secondary: ['mid-back', 'forearms'] },
  'split-squat': { primary: ['quads', 'glutes'], secondary: ['adductors', 'hamstrings'] },
  'reverse-lunge': { primary: ['glutes', 'quads'], secondary: ['hamstrings'] },
  'glute-bridge': { primary: ['glutes'], secondary: ['hamstrings', 'lower-back'] },
  'hollow-hold': { primary: ['abs'], secondary: ['hip-flexors', 'quads'] },
  'dead-bug': { primary: ['abs', 'obliques'], secondary: ['hip-flexors'] },
  'db-shoulder-press': { primary: ['delts-front', 'delts-side'], secondary: ['triceps', 'chest-upper'] },
  'lat-pulldown': { primary: ['lats'], secondary: ['biceps', 'mid-back'] },
  'seated-cable-row': { primary: ['mid-back', 'lats'], secondary: ['biceps', 'delts-rear'] },
  'leg-press': { primary: ['quads', 'glutes'], secondary: ['adductors', 'hamstrings'] },
  'machine-leg-curl': { primary: ['hamstrings'], secondary: ['calves'] },
  'bike-erg': { primary: ['heart'], secondary: ['quads', 'full-body'] },
  'rowing-erg': { primary: ['heart'], secondary: ['mid-back', 'quads'] },
  'db-rdl': { primary: ['hamstrings', 'glutes'], secondary: ['lower-back', 'forearms'] },

  // ---- Athletic Performance Library ----
  'two-point-start': { primary: ['glutes', 'hamstrings'], secondary: ['quads', 'calves', 'hip-flexors'] },
  'three-point-start': { primary: ['glutes', 'quads'], secondary: ['hamstrings', 'calves'] },
  'push-up-start': { primary: ['glutes', 'quads'], secondary: ['chest', 'hip-flexors'] },
  'wall-drive': { primary: ['hip-flexors', 'glutes'], secondary: ['calves', 'abs'] },
  'a-march': { primary: ['hip-flexors', 'calves'], secondary: ['glutes', 'abs'] },
  'a-skip': { primary: ['hip-flexors', 'calves'], secondary: ['hamstrings', 'glutes'] },
  'resisted-start': { primary: ['glutes', 'quads'], secondary: ['calves', 'hamstrings'] },
  'sled-sprint': { primary: ['glutes', 'quads'], secondary: ['calves', 'hamstrings'] },
  'accel-20': { primary: ['glutes', 'hamstrings'], secondary: ['quads', 'calves'] },
  'flying-20': { primary: ['hamstrings', 'glutes'], secondary: ['calves', 'hip-flexors'] },
  'build-up-sprint': { primary: ['hamstrings', 'glutes'], secondary: ['calves', 'quads'] },
  'wicket-run': { primary: ['hip-flexors', 'hamstrings'], secondary: ['calves', 'glutes'] },
  'dribble-run': { primary: ['calves', 'hip-flexors'], secondary: ['tibialis', 'hamstrings'] },
  'standing-vertical-jump': { primary: ['glutes', 'quads'], secondary: ['calves', 'hamstrings'] },
  'countermovement-jump': { primary: ['glutes', 'quads'], secondary: ['calves', 'hamstrings'] },
  'squat-jump': { primary: ['quads', 'glutes'], secondary: ['calves'] },
  'one-foot-jump': { primary: ['glutes', 'calves'], secondary: ['hip-flexors', 'quads'] },
  'penultimate-drill': { primary: ['glutes', 'quads'], secondary: ['calves', 'adductors'] },
  'penultimate-approach-jump': { primary: ['glutes', 'quads'], secondary: ['calves', 'hamstrings'] },
  'low-box-approach-jump': { primary: ['glutes', 'quads'], secondary: ['calves'] },
  'broad-jump': { primary: ['glutes', 'hamstrings'], secondary: ['quads', 'calves'] },
  'broad-jump-stick': { primary: ['glutes', 'quads'], secondary: ['hamstrings', 'calves'] },
  'repeated-broad-jump': { primary: ['glutes', 'hamstrings'], secondary: ['quads', 'calves'] },
  'single-leg-broad-jump': { primary: ['glutes', 'hamstrings'], secondary: ['calves', 'quads'] },
  'power-bound': { primary: ['glutes', 'hamstrings'], secondary: ['calves', 'hip-flexors'] },
  'single-leg-bound': { primary: ['glutes', 'calves'], secondary: ['hamstrings', 'achilles-feet'] },
  'ankle-hop': { primary: ['calves'], secondary: ['achilles-feet'] },
  'alternating-pogo': { primary: ['calves', 'hip-flexors'], secondary: ['achilles-feet'] },
  'single-leg-pogo': { primary: ['calves'], secondary: ['achilles-feet', 'glutes'] },
  'line-hop': { primary: ['calves'], secondary: ['tibialis', 'achilles-feet'] },
  'rudiment-hop': { primary: ['calves', 'glutes'], secondary: ['achilles-feet', 'abs'] },
  'snap-down-rebound': { primary: ['glutes', 'quads'], secondary: ['calves'] },
  'low-hurdle-hop': { primary: ['calves', 'quads'], secondary: ['glutes', 'achilles-feet'] },
  'depth-drop': { primary: ['quads', 'glutes'], secondary: ['calves', 'achilles-feet'] },
  'depth-jump': { primary: ['glutes', 'quads'], secondary: ['calves', 'achilles-feet'] },
  'repeated-cmj': { primary: ['glutes', 'quads'], secondary: ['calves', 'hamstrings'] },
  'snap-down': { primary: ['quads', 'glutes'], secondary: ['abs'] },
  'snap-down-stick': { primary: ['quads', 'glutes'], secondary: ['calves', 'abs'] },
  'drop-landing': { primary: ['quads', 'glutes'], secondary: ['calves', 'achilles-feet'] },
  'single-leg-landing': { primary: ['glutes', 'quads'], secondary: ['calves', 'adductors'] },
  'decel-stick': { primary: ['quads', 'glutes'], secondary: ['hamstrings', 'calves'] },
  'lateral-bound': { primary: ['glutes', 'adductors'], secondary: ['calves', 'quads'] },
  'lateral-bound-stick': { primary: ['glutes', 'adductors'], secondary: ['quads', 'calves'] },
  'skater-bound': { primary: ['glutes', 'adductors'], secondary: ['calves', 'hamstrings'] },
  'lateral-line-hop': { primary: ['calves', 'glutes'], secondary: ['adductors', 'achilles-feet'] },
  'crossover-bound': { primary: ['glutes', 'adductors'], secondary: ['hip-flexors', 'obliques'] },
  'lateral-shuffle': { primary: ['glutes', 'adductors'], secondary: ['quads', 'calves'] },
  'shuttle-5-10-5': { primary: ['quads', 'glutes'], secondary: ['adductors', 'calves'] },
  'l-drill': { primary: ['quads', 'glutes'], secondary: ['calves', 'adductors'] },
  'shuffle-to-sprint': { primary: ['glutes', 'adductors'], secondary: ['quads', 'hip-flexors'] },
  'crossover-run': { primary: ['hip-flexors', 'adductors'], secondary: ['glutes', 'obliques'] },
  'plant-and-go': { primary: ['quads', 'glutes'], secondary: ['adductors', 'calves'] },
  'cut-45': { primary: ['glutes', 'adductors'], secondary: ['calves', 'quads'] },
  'cut-90': { primary: ['quads', 'glutes'], secondary: ['adductors', 'calves'] },
  'turn-180': { primary: ['quads', 'glutes'], secondary: ['calves', 'hamstrings'] },
  'curved-sprint': { primary: ['glutes', 'adductors'], secondary: ['calves', 'hamstrings'] },
  'mirror-drill': { primary: ['adductors', 'glutes'], secondary: ['calves', 'quads'] },
  'reactive-shuttle': { primary: ['glutes', 'quads'], secondary: ['adductors', 'calves'] },
  'step-down': { primary: ['quads', 'glutes'], secondary: ['calves'] },
  'lateral-lunge': { primary: ['adductors', 'glutes'], secondary: ['quads', 'hamstrings'] },
  'single-leg-squat-box': { primary: ['quads', 'glutes'], secondary: ['abs', 'calves'] },
  'balance-to-jump': { primary: ['glutes', 'calves'], secondary: ['quads', 'abs'] },
  'trap-bar-jump': { primary: ['glutes', 'quads'], secondary: ['traps', 'calves'] },
  'jump-squat': { primary: ['glutes', 'quads'], secondary: ['calves'] },
  'kb-swing': { primary: ['glutes', 'hamstrings'], secondary: ['lower-back', 'abs'] },
  'mb-scoop-toss': { primary: ['glutes', 'hamstrings'], secondary: ['traps', 'delts-front'] },
  'mb-rotational-throw': { primary: ['obliques', 'glutes'], secondary: ['adductors', 'delts-front'] },
  'mb-overhead-throw': { primary: ['glutes', 'hamstrings'], secondary: ['delts-front', 'lower-back'] },
  'sled-push': { primary: ['quads', 'glutes'], secondary: ['calves', 'abs'] },
  'nordic-curl': { primary: ['hamstrings'], secondary: ['glutes', 'lower-back'] },
  'tibialis-raise': { primary: ['tibialis'], secondary: ['achilles-feet'] },
}

export function musclesFor(exerciseId: string): MuscleActivation {
  return EXERCISE_MUSCLES[exerciseId] ?? { primary: [], secondary: [] }
}

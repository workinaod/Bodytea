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
}

export function musclesFor(exerciseId: string): MuscleActivation {
  return EXERCISE_MUSCLES[exerciseId] ?? { primary: [], secondary: [] }
}

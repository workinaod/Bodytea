import type { EquipTag } from '../types'
import { resolveForEquipment } from './equip'

// ============================================================
// The general workouts shelf: ready-made sessions anyone can
// scroll through and run on any day, outside the plan's
// schedule. A quick pump on an off day, a hotel-room session
// on the road, a machine circuit on a gym day-pass.
//
// Data, not templates: these never enter PlanConfig and never
// touch the schedule. Running one produces an ordinary
// SessionLog with templateId 'custom' (logic/sessionStart.ts),
// so the record, the debrief and the stats treat it like any
// other work honestly done.
//
// Every item is authored at its best-equipped variant and
// degraded per athlete through the same substitution chains the
// generator uses (plan/equip.ts), so one shelf serves the full
// gym and the bare floor without lying to either.
// ============================================================

export interface GeneralWorkoutItem {
  exerciseId: string
  sets: number
  /** Same display vocabulary as templates: "8-12", "max", "30 sec", "10 / leg". */
  repText: string
  /** Numeric reps when repText is a plain count (same convention as TemplateEntry). */
  repsNum?: number
}

export type WorkoutFocus =
  | 'full-body'
  | 'upper'
  | 'lower'
  | 'push'
  | 'pull'
  | 'core'
  | 'explosive'
  | 'mobility'

export const FOCUS_LABEL: Record<WorkoutFocus, string> = {
  'full-body': 'Full body',
  upper: 'Upper body',
  lower: 'Lower body',
  push: 'Push',
  pull: 'Pull',
  core: 'Core',
  explosive: 'Explosive',
  mobility: 'Mobility',
}

export interface GeneralWorkout {
  id: string
  title: string
  tagline: string
  /** Honest wall-clock estimate, rests included. */
  minutes: number
  focus: WorkoutFocus
}

type WorkoutDef = GeneralWorkout & { items: GeneralWorkoutItem[] }

const W = (def: WorkoutDef) => def

export const GENERAL_WORKOUTS: WorkoutDef[] = [
  W({
    id: 'full-body-30',
    title: 'Full Body in 30',
    tagline: 'One squat, one press, one row. The whole body, half an hour.',
    minutes: 30,
    focus: 'full-body',
    items: [
      { exerciseId: 'goblet-squat', sets: 3, repText: '8-10' },
      { exerciseId: 'flat-db-press', sets: 3, repText: '8-10' },
      { exerciseId: 'barbell-row', sets: 3, repText: '8-10' },
      { exerciseId: 'db-shoulder-press', sets: 2, repText: '10-12' },
      { exerciseId: 'plank-side-plank', sets: 2, repText: '30 sec' },
    ],
  }),
  W({
    id: 'no-gear-burner',
    title: 'No-Gear Burner',
    tagline: 'Nothing but a floor. Still a real session.',
    minutes: 25,
    focus: 'full-body',
    items: [
      { exerciseId: 'push-up', sets: 4, repText: 'max' },
      { exerciseId: 'split-squat', sets: 3, repText: '10 / leg', repsNum: 10 },
      { exerciseId: 'glute-bridge', sets: 3, repText: '12-15' },
      { exerciseId: 'bodyweight-calf-raise', sets: 3, repText: '15-20' },
      { exerciseId: 'hollow-hold', sets: 3, repText: '30 sec' },
    ],
  }),
  W({
    id: 'hotel-room',
    title: 'Hotel Room Special',
    tagline: 'Twenty minutes between the bed and the wall. Travel is not a rest week.',
    minutes: 20,
    focus: 'full-body',
    items: [
      { exerciseId: 'push-up', sets: 3, repText: 'max' },
      { exerciseId: 'reverse-lunge', sets: 3, repText: '12 / leg', repsNum: 12 },
      { exerciseId: 'single-leg-glute-bridge', sets: 3, repText: '10 / side', repsNum: 10 },
      { exerciseId: 'wall-sit', sets: 2, repText: '45 sec' },
      { exerciseId: 'superman-hold', sets: 2, repText: '30 sec' },
    ],
  }),
  W({
    id: 'push-express',
    title: 'Push Day Express',
    tagline: 'Chest, shoulders, triceps. In and out.',
    minutes: 35,
    focus: 'push',
    items: [
      { exerciseId: 'incline-db-press', sets: 3, repText: '8-10' },
      { exerciseId: 'db-shoulder-press', sets: 3, repText: '8-10' },
      { exerciseId: 'lateral-raise', sets: 3, repText: '12-15' },
      { exerciseId: 'overhead-tricep-extension', sets: 2, repText: '10-12' },
      { exerciseId: 'push-up', sets: 2, repText: 'max' },
    ],
  }),
  W({
    id: 'pull-express',
    title: 'Pull Day Express',
    tagline: 'Back and biceps. The mirror muscles can wait their turn.',
    minutes: 35,
    focus: 'pull',
    items: [
      { exerciseId: 'pull-up', sets: 3, repText: 'max' },
      { exerciseId: 'barbell-row', sets: 3, repText: '8-10' },
      { exerciseId: 'rear-delt-raise', sets: 3, repText: '12-15' },
      { exerciseId: 'cable-curl', sets: 3, repText: '10-12' },
      { exerciseId: 'face-pull', sets: 2, repText: '15', repsNum: 15 },
    ],
  }),
  W({
    id: 'leg-day-40',
    title: 'Leg Day in 40',
    tagline: 'Squat, hinge, lunge, calves. The whole lower half.',
    minutes: 40,
    focus: 'lower',
    items: [
      { exerciseId: 'front-squat', sets: 3, repText: '6-8' },
      { exerciseId: 'romanian-deadlift', sets: 3, repText: '8-10' },
      { exerciseId: 'walking-lunge', sets: 3, repText: '10 / leg', repsNum: 10 },
      { exerciseId: 'standing-calf-machine', sets: 3, repText: '12-15' },
      { exerciseId: 'hollow-hold', sets: 2, repText: '30 sec' },
    ],
  }),
  W({
    id: 'glutes-hams',
    title: 'Glutes & Hamstrings',
    tagline: 'The posterior chain: where speed and strength both live.',
    minutes: 35,
    focus: 'lower',
    items: [
      { exerciseId: 'hip-thrust', sets: 4, repText: '8-10' },
      { exerciseId: 'db-rdl', sets: 3, repText: '10-12' },
      { exerciseId: 'slider-leg-curl', sets: 3, repText: '8-12' },
      { exerciseId: 'band-lateral-walk', sets: 2, repText: '15 / side', repsNum: 15 },
    ],
  }),
  W({
    id: 'upper-45',
    title: 'Upper Body Builder',
    tagline: 'Press and pull in one visit. Balanced on purpose.',
    minutes: 45,
    focus: 'upper',
    items: [
      { exerciseId: 'incline-db-press', sets: 3, repText: '8-10' },
      { exerciseId: 'barbell-row', sets: 3, repText: '8-10' },
      { exerciseId: 'db-shoulder-press', sets: 3, repText: '10', repsNum: 10 },
      { exerciseId: 'lat-pulldown', sets: 3, repText: '10-12' },
      { exerciseId: 'lateral-raise', sets: 2, repText: '12-15' },
      { exerciseId: 'cable-curl', sets: 2, repText: '10-12' },
    ],
  }),
  W({
    id: 'machine-circuit',
    title: 'Machine Circuit',
    tagline: 'Day pass at a big gym? Ride the machines end to end.',
    minutes: 40,
    focus: 'full-body',
    items: [
      { exerciseId: 'leg-press', sets: 3, repText: '10-12' },
      { exerciseId: 'machine-chest-press', sets: 3, repText: '10-12' },
      { exerciseId: 'lat-pulldown', sets: 3, repText: '10-12' },
      { exerciseId: 'seated-leg-curl', sets: 2, repText: '12-15' },
      { exerciseId: 'tricep-pushdown', sets: 2, repText: '12-15' },
      { exerciseId: 'cable-curl', sets: 2, repText: '12-15' },
    ],
  }),
  W({
    id: 'band-everything',
    title: 'Band Everything',
    tagline: 'One band, every direction. Packs into a jacket pocket.',
    minutes: 25,
    focus: 'full-body',
    items: [
      { exerciseId: 'band-overhead-press', sets: 3, repText: '12-15' },
      { exerciseId: 'band-row', sets: 3, repText: '12-15' },
      { exerciseId: 'band-good-morning', sets: 3, repText: '15', repsNum: 15 },
      { exerciseId: 'band-lateral-walk', sets: 2, repText: '15 / side', repsNum: 15 },
      { exerciseId: 'band-curl', sets: 2, repText: '15', repsNum: 15 },
      { exerciseId: 'band-pressdown', sets: 2, repText: '15', repsNum: 15 },
    ],
  }),
  W({
    id: 'core-15',
    title: 'Core Fifteen',
    tagline: 'Fifteen minutes of middle. No crunches into a sore neck.',
    minutes: 15,
    focus: 'core',
    items: [
      { exerciseId: 'hollow-hold', sets: 3, repText: '30 sec' },
      { exerciseId: 'dead-bug', sets: 3, repText: '10 / side', repsNum: 10 },
      { exerciseId: 'plank-side-plank', sets: 3, repText: '30 sec' },
      { exerciseId: 'bird-dog', sets: 2, repText: '10 / side', repsNum: 10 },
    ],
  }),
  W({
    id: 'explosive-20',
    title: 'Explosive Twenty',
    tagline: 'Jumps and sprints on fresh legs. Quality reps, full rests.',
    minutes: 20,
    focus: 'explosive',
    items: [
      { exerciseId: 'dynamic-warmup', sets: 1, repText: '5 min' },
      { exerciseId: 'pogo-hop', sets: 3, repText: '15', repsNum: 15 },
      { exerciseId: 'broad-jump', sets: 4, repText: '3', repsNum: 3 },
      { exerciseId: 'falling-start-sprint', sets: 4, repText: '3', repsNum: 3 },
    ],
  }),
  W({
    id: 'mobility-reset',
    title: 'Mobility Reset',
    tagline: 'Hips, ankles, upper back. Twenty minutes that pay all week.',
    minutes: 20,
    focus: 'mobility',
    items: [
      { exerciseId: 'hip-9090-switch', sets: 2, repText: '8 / side', repsNum: 8 },
      { exerciseId: 'deep-squat-hold', sets: 2, repText: '45 sec' },
      { exerciseId: 'couch-stretch', sets: 2, repText: '45 sec / side' },
      { exerciseId: 't-spine-opener', sets: 2, repText: '8 / side', repsNum: 8 },
      { exerciseId: 'ankle-wall-mobilization', sets: 2, repText: '10 / side', repsNum: 10 },
    ],
  }),
  W({
    id: 'morning-wake',
    title: 'Morning Wake-Up',
    tagline: 'Ten easy minutes to tell the body the day started.',
    minutes: 12,
    focus: 'mobility',
    items: [
      { exerciseId: 'dynamic-warmup', sets: 1, repText: '4 min' },
      { exerciseId: 'push-up', sets: 2, repText: '10', repsNum: 10 },
      { exerciseId: 'deep-squat-hold', sets: 2, repText: '30 sec' },
      { exerciseId: 'bird-dog', sets: 2, repText: '8 / side', repsNum: 8 },
    ],
  }),
]

/** A workout keeps its identity after equipment fitting; items carry what will actually be done. */
export interface FittedWorkout extends GeneralWorkout {
  items: GeneralWorkoutItem[]
}

/**
 * A workout survives fitting only when it stays worth doing: after
 * substitution collapses two items into the same movement, the duplicate
 * is dropped rather than done twice, and below this many distinct items
 * what is left is no longer the workout on the label.
 */
export const MIN_FITTED_ITEMS = 3

/**
 * The shelf, fitted to this athlete's gear.
 *
 * Each item resolves to itself or its best legal substitute through the
 * generator's own chains, so the workout an athlete opens is one they
 * can actually run. A workout with any unresolvable item is dropped
 * whole rather than shown with a hole in it, and duplicates created by
 * two items degrading to the same movement keep the first, tighter
 * prescription.
 */
export function generalWorkoutsFor(equipment: EquipTag[]): FittedWorkout[] {
  const owned = new Set(equipment)
  const out: FittedWorkout[] = []
  for (const w of GENERAL_WORKOUTS) {
    const fitted: GeneralWorkoutItem[] = []
    const seen = new Set<string>()
    let broken = false
    for (const item of w.items) {
      const id = resolveForEquipment(item.exerciseId, owned)
      if (!id) {
        broken = true
        break
      }
      if (seen.has(id)) continue
      seen.add(id)
      fitted.push(id === item.exerciseId ? item : { ...item, exerciseId: id })
    }
    if (!broken && fitted.length >= MIN_FITTED_ITEMS) out.push({ ...w, items: fitted })
  }
  return out
}

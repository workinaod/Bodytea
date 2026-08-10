// ============================================================
// Athletic metadata sidecar: the structured layer that makes the
// coach smart about athletic work. Every athletic exercise (new
// library + the base catalog's sprint/jump/strength movements)
// gets: qualities, direction, laterality, emphasis, level,
// impact + CNS cost, freshness, programming defaults, and
// progression/regression links. Substitutions preserve the
// PRIMARY quality — a max-velocity slot never becomes cardio.
// ============================================================

export type AthleticQuality =
  | 'acceleration'
  | 'max-velocity'
  | 'sprint-mechanics'
  | 'vertical-power'
  | 'horizontal-power'
  | 'lateral-power'
  | 'rotational-power'
  | 'elastic-reactive'
  | 'ankle-stiffness'
  | 'force-absorption'
  | 'deceleration'
  | 'cod'
  | 'reactive-agility'
  | 'balance-stability'
  | 'coordination'
  | 'sprint-hamstring'
  | 'foot-ankle'
  | 'athletic-strength'
  | 'explosive-strength'

export const QUALITY_LABELS: Record<AthleticQuality, string> = {
  acceleration: 'Acceleration',
  'max-velocity': 'Max velocity',
  'sprint-mechanics': 'Sprint mechanics',
  'vertical-power': 'Vertical power',
  'horizontal-power': 'Horizontal power',
  'lateral-power': 'Lateral power',
  'rotational-power': 'Rotational power',
  'elastic-reactive': 'Elastic / reactive',
  'ankle-stiffness': 'Ankle stiffness',
  'force-absorption': 'Force absorption',
  deceleration: 'Deceleration',
  cod: 'Change of direction',
  'reactive-agility': 'Reactive agility',
  'balance-stability': 'Balance / stability',
  coordination: 'Coordination',
  'sprint-hamstring': 'Sprint hamstring',
  'foot-ankle': 'Foot & ankle',
  'athletic-strength': 'Athletic strength',
  'explosive-strength': 'Explosive strength',
}

export type MovementDirection = 'vertical' | 'horizontal' | 'lateral' | 'rotational' | 'multi'
export type Laterality = 'bilateral' | 'unilateral' | 'alternating'
export type Emphasis = 'concentric' | 'elastic' | 'reactive' | 'absorption' | 'mixed'
export type AthleticLevel = 'foundation' | 'intermediate' | 'advanced'
export type ReactiveCue = 'visual' | 'audio' | 'partner' | 'app'

export const LEVEL_LABELS: Record<AthleticLevel, string> = {
  foundation: 'Foundation',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
}

export interface AthleticProgram {
  sets?: string
  reps?: string
  distance?: string
  duration?: string
  restSec: number
  intensity: string
}

export interface AthleticMeta {
  /** First entry = primary quality (drives substitution). */
  qualities: AthleticQuality[]
  direction: MovementDirection
  laterality: Laterality
  footing?: 'one-foot' | 'two-foot'
  emphasis: Emphasis
  /** Advanced = more force/speed/reactivity/landing competency, never "more flashy". */
  level: AthleticLevel
  /** 0 none … 3 high (joint/tendon impact). */
  impact: 0 | 1 | 2 | 3
  /** 0 low … 3 max (nervous-system cost). */
  cns: 0 | 1 | 2 | 3
  /** Must be done fresh — never at the end of a fatiguing session. */
  fresh: boolean
  program: AthleticProgram
  /** Easier movements that build toward this one. */
  regressions?: string[]
  /** What this earns you next. */
  progressions?: string[]
  /** Cue types a reactive drill can be driven by (scaffold for app-generated cues). */
  reactiveCues?: ReactiveCue[]
  warning?: string
}

const M = (m: AthleticMeta) => m

export const ATHLETIC: Record<string, AthleticMeta> = {
  // ================= ACCELERATION =================
  'wall-drive': M({
    qualities: ['sprint-mechanics', 'acceleration'], direction: 'horizontal', laterality: 'alternating', emphasis: 'concentric',
    level: 'foundation', impact: 0, cns: 0, fresh: false,
    program: { sets: '2-3', reps: '5 exchanges / leg', restSec: 60, intensity: 'crisp, not rushed' },
    progressions: ['a-march', 'falling-start-sprint'],
  }),
  'a-march': M({
    qualities: ['sprint-mechanics', 'coordination'], direction: 'horizontal', laterality: 'alternating', emphasis: 'concentric',
    level: 'foundation', impact: 0, cns: 0, fresh: false,
    program: { sets: '2-3', distance: '15-20 yd', restSec: 45, intensity: 'posture-perfect' },
    regressions: ['wall-drive'], progressions: ['a-skip'],
  }),
  'a-skip': M({
    qualities: ['sprint-mechanics', 'ankle-stiffness'], direction: 'horizontal', laterality: 'alternating', emphasis: 'elastic',
    level: 'foundation', impact: 1, cns: 0, fresh: false,
    program: { sets: '2-3', distance: '15-20 yd', restSec: 45, intensity: 'rhythmic' },
    regressions: ['a-march'], progressions: ['dribble-run', 'falling-start-sprint'],
  }),
  'falling-start-sprint': M({
    qualities: ['acceleration', 'horizontal-power'], direction: 'horizontal', laterality: 'alternating', emphasis: 'concentric',
    level: 'foundation', impact: 1, cns: 2, fresh: true,
    program: { sets: '1', reps: '4-6', distance: '5-10 yd', restSec: 180, intensity: 'max intent' },
    regressions: ['wall-drive', 'a-march'], progressions: ['two-point-start', 'three-point-start', 'resisted-start'],
  }),
  'two-point-start': M({
    qualities: ['acceleration'], direction: 'horizontal', laterality: 'alternating', emphasis: 'concentric',
    level: 'intermediate', impact: 1, cns: 2, fresh: true,
    program: { sets: '1', reps: '4-5', distance: '10 yd', restSec: 180, intensity: 'max intent' },
    regressions: ['falling-start-sprint'], progressions: ['three-point-start', 'resisted-start', 'accel-20'],
  }),
  'three-point-start': M({
    qualities: ['acceleration', 'horizontal-power'], direction: 'horizontal', laterality: 'alternating', emphasis: 'concentric',
    level: 'intermediate', impact: 1, cns: 2, fresh: true,
    program: { sets: '1', reps: '4-5', distance: '10 yd', restSec: 180, intensity: 'max intent' },
    regressions: ['two-point-start'], progressions: ['resisted-start', 'accel-20'],
  }),
  'push-up-start': M({
    qualities: ['acceleration', 'coordination'], direction: 'horizontal', laterality: 'alternating', emphasis: 'concentric',
    level: 'intermediate', impact: 1, cns: 2, fresh: true,
    program: { sets: '1', reps: '3-5', distance: '10 yd', restSec: 180, intensity: 'max intent' },
    regressions: ['two-point-start'], progressions: ['accel-20'],
  }),
  'resisted-start': M({
    qualities: ['acceleration', 'horizontal-power'], direction: 'horizontal', laterality: 'alternating', emphasis: 'concentric',
    level: 'intermediate', impact: 1, cns: 2, fresh: true,
    program: { sets: '1', reps: '4-6', distance: '5-10 yd', restSec: 180, intensity: '~85% of free speed' },
    regressions: ['falling-start-sprint'], progressions: ['sled-sprint', 'accel-20'],
  }),
  'sled-sprint': M({
    qualities: ['acceleration', 'horizontal-power'], direction: 'horizontal', laterality: 'alternating', emphasis: 'concentric',
    level: 'intermediate', impact: 1, cns: 2, fresh: true,
    program: { sets: '1', reps: '4-6', distance: '10-15 yd', restSec: 180, intensity: 'light load, full intent' },
    regressions: ['resisted-start', 'hill-sprint'], progressions: ['accel-20'],
  }),
  'hill-sprint': M({
    qualities: ['acceleration', 'horizontal-power'], direction: 'horizontal', laterality: 'alternating', emphasis: 'concentric',
    level: 'foundation', impact: 1, cns: 2, fresh: true,
    program: { sets: '1', reps: '6-10', distance: '10-30 yd', restSec: 120, intensity: 'hard, walk-down rest' },
    progressions: ['resisted-start', 'accel-20'],
  }),
  'accel-20': M({
    qualities: ['acceleration', 'max-velocity'], direction: 'horizontal', laterality: 'alternating', emphasis: 'concentric',
    level: 'intermediate', impact: 2, cns: 3, fresh: true,
    program: { sets: '1', reps: '3-5', distance: '20 yd', restSec: 210, intensity: 'max' },
    regressions: ['two-point-start', 'falling-start-sprint'], progressions: ['build-up-sprint', 'max-velocity-sprint'],
  }),

  // ================= MAX VELOCITY =================
  'dribble-run': M({
    qualities: ['sprint-mechanics', 'ankle-stiffness'], direction: 'horizontal', laterality: 'alternating', emphasis: 'elastic',
    level: 'intermediate', impact: 1, cns: 0, fresh: false,
    program: { sets: '2-3', distance: '15-20 yd', restSec: 60, intensity: 'rhythm-first' },
    regressions: ['a-skip'], progressions: ['build-up-sprint', 'wicket-run'],
  }),
  'build-up-sprint': M({
    qualities: ['max-velocity', 'sprint-mechanics'], direction: 'horizontal', laterality: 'alternating', emphasis: 'elastic',
    level: 'intermediate', impact: 2, cns: 2, fresh: true,
    program: { sets: '1', reps: '3-4', distance: '40-60 yd', restSec: 180, intensity: 'gears to 95%' },
    regressions: ['accel-20', 'a-skip'], progressions: ['max-velocity-sprint', 'flying-sprint'],
  }),
  'wicket-run': M({
    qualities: ['sprint-mechanics', 'max-velocity'], direction: 'horizontal', laterality: 'alternating', emphasis: 'elastic',
    level: 'advanced', impact: 2, cns: 2, fresh: true,
    program: { sets: '1', reps: '3-5', distance: '8-12 wickets', restSec: 180, intensity: 'tall + fast' },
    regressions: ['build-up-sprint', 'a-skip'], progressions: ['flying-sprint'],
  }),
  'max-velocity-sprint': M({
    qualities: ['max-velocity'], direction: 'horizontal', laterality: 'alternating', emphasis: 'elastic',
    level: 'advanced', impact: 3, cns: 3, fresh: true,
    program: { sets: '1', reps: '3-5', distance: '30-40 yd total', restSec: 240, intensity: 'true max' },
    regressions: ['build-up-sprint'], progressions: ['flying-sprint', 'flying-20'],
  }),
  'flying-sprint': M({
    qualities: ['max-velocity', 'elastic-reactive'], direction: 'horizontal', laterality: 'alternating', emphasis: 'elastic',
    level: 'advanced', impact: 3, cns: 3, fresh: true,
    program: { sets: '1', reps: '2-3', distance: 'fly 10 yd', restSec: 240, intensity: 'true max, relaxed' },
    regressions: ['build-up-sprint', 'max-velocity-sprint'], progressions: ['flying-20'],
  }),
  'flying-20': M({
    qualities: ['max-velocity'], direction: 'horizontal', laterality: 'alternating', emphasis: 'elastic',
    level: 'advanced', impact: 3, cns: 3, fresh: true,
    program: { sets: '1', reps: '2-3', distance: 'fly 20 yd', restSec: 300, intensity: 'true max, relaxed' },
    regressions: ['flying-sprint'],
    warning: 'The most CNS- and hamstring-expensive drill in the library. Tiny doses, long rests, never tired.',
  }),

  // ================= VERTICAL JUMPING =================
  'squat-jump': M({
    qualities: ['vertical-power', 'explosive-strength'], direction: 'vertical', laterality: 'bilateral', footing: 'two-foot', emphasis: 'concentric',
    level: 'foundation', impact: 1, cns: 1, fresh: true,
    program: { sets: '3', reps: '3-5', restSec: 120, intensity: 'max each rep' },
    progressions: ['standing-vertical-jump', 'countermovement-jump'],
  }),
  'standing-vertical-jump': M({
    qualities: ['vertical-power'], direction: 'vertical', laterality: 'bilateral', footing: 'two-foot', emphasis: 'concentric',
    level: 'foundation', impact: 1, cns: 1, fresh: true,
    program: { sets: '3', reps: '3-5', restSec: 90, intensity: 'max each rep' },
    regressions: ['squat-jump'], progressions: ['countermovement-jump'],
  }),
  'countermovement-jump': M({
    qualities: ['vertical-power', 'elastic-reactive'], direction: 'vertical', laterality: 'bilateral', footing: 'two-foot', emphasis: 'elastic',
    level: 'intermediate', impact: 2, cns: 2, fresh: true,
    program: { sets: '3', reps: '3', restSec: 120, intensity: 'max, stop when height drops' },
    regressions: ['standing-vertical-jump', 'squat-jump'], progressions: ['approach-jump', 'repeated-cmj', 'snap-down-rebound', 'box-jump'],
  }),
  'box-jump': M({
    qualities: ['vertical-power'], direction: 'vertical', laterality: 'bilateral', footing: 'two-foot', emphasis: 'concentric',
    level: 'intermediate', impact: 1, cns: 2, fresh: true,
    program: { sets: '3-4', reps: '3', restSec: 120, intensity: 'max takeoff, easy landing' },
    regressions: ['standing-vertical-jump'], progressions: ['countermovement-jump', 'depth-jump'],
  }),
  'approach-jump': M({
    qualities: ['vertical-power', 'elastic-reactive'], direction: 'vertical', laterality: 'bilateral', footing: 'two-foot', emphasis: 'elastic',
    level: 'intermediate', impact: 2, cns: 2, fresh: true,
    program: { sets: '1', reps: '5-8', restSec: 150, intensity: 'max, full reset' },
    regressions: ['countermovement-jump', 'penultimate-drill'], progressions: ['penultimate-approach-jump', 'dunk-attempt'],
  }),
  'penultimate-drill': M({
    qualities: ['vertical-power', 'coordination'], direction: 'vertical', laterality: 'bilateral', footing: 'two-foot', emphasis: 'concentric',
    level: 'foundation', impact: 1, cns: 1, fresh: false,
    program: { sets: '2-3', reps: '4-5', restSec: 90, intensity: 'slow → smooth' },
    progressions: ['low-box-approach-jump', 'penultimate-approach-jump'],
  }),
  'low-box-approach-jump': M({
    qualities: ['vertical-power'], direction: 'vertical', laterality: 'bilateral', footing: 'two-foot', emphasis: 'elastic',
    level: 'intermediate', impact: 1, cns: 2, fresh: true,
    program: { sets: '2-3', reps: '3-4', restSec: 120, intensity: 'max jump, easy catch' },
    regressions: ['penultimate-drill'], progressions: ['penultimate-approach-jump'],
  }),
  'penultimate-approach-jump': M({
    qualities: ['vertical-power', 'elastic-reactive'], direction: 'vertical', laterality: 'bilateral', footing: 'two-foot', emphasis: 'elastic',
    level: 'advanced', impact: 2, cns: 3, fresh: true,
    program: { sets: '1', reps: '4-6', restSec: 150, intensity: 'max, stop on height drop' },
    regressions: ['low-box-approach-jump', 'penultimate-drill', 'approach-jump'], progressions: ['dunk-attempt'],
  }),
  'one-foot-jump': M({
    qualities: ['vertical-power', 'elastic-reactive'], direction: 'vertical', laterality: 'unilateral', footing: 'one-foot', emphasis: 'elastic',
    level: 'advanced', impact: 3, cns: 3, fresh: true,
    program: { sets: '1', reps: '4-6 / leg', restSec: 150, intensity: 'max, quality only' },
    regressions: ['power-bound', 'single-leg-pogo', 'single-leg-landing'], progressions: ['dunk-attempt'],
  }),
  'dunk-attempt': M({
    qualities: ['vertical-power'], direction: 'vertical', laterality: 'bilateral', footing: 'two-foot', emphasis: 'elastic',
    level: 'advanced', impact: 3, cns: 3, fresh: true,
    program: { sets: '1', reps: '5-8', restSec: 180, intensity: 'the whole point' },
    regressions: ['penultimate-approach-jump', 'approach-jump'],
  }),

  // ================= HORIZONTAL POWER =================
  'broad-jump': M({
    qualities: ['horizontal-power'], direction: 'horizontal', laterality: 'bilateral', footing: 'two-foot', emphasis: 'concentric',
    level: 'foundation', impact: 2, cns: 1, fresh: true,
    program: { sets: '3', reps: '3', restSec: 120, intensity: 'max distance' },
    progressions: ['broad-jump-stick', 'repeated-broad-jump'],
  }),
  'broad-jump-stick': M({
    qualities: ['horizontal-power', 'force-absorption'], direction: 'horizontal', laterality: 'bilateral', footing: 'two-foot', emphasis: 'mixed',
    level: 'intermediate', impact: 2, cns: 2, fresh: true,
    program: { sets: '3', reps: '3', restSec: 120, intensity: 'max out, frozen catch' },
    regressions: ['broad-jump', 'snap-down-stick'], progressions: ['repeated-broad-jump', 'single-leg-broad-jump'],
  }),
  'repeated-broad-jump': M({
    qualities: ['horizontal-power', 'elastic-reactive'], direction: 'horizontal', laterality: 'bilateral', footing: 'two-foot', emphasis: 'reactive',
    level: 'advanced', impact: 3, cns: 2, fresh: true,
    program: { sets: '3', reps: 'x3 linked', restSec: 150, intensity: 'honest triples' },
    regressions: ['broad-jump-stick'], progressions: ['power-bound'],
  }),
  'single-leg-broad-jump': M({
    qualities: ['horizontal-power', 'balance-stability'], direction: 'horizontal', laterality: 'unilateral', footing: 'one-foot', emphasis: 'concentric',
    level: 'intermediate', impact: 2, cns: 2, fresh: true,
    program: { sets: '2-3', reps: '3 / leg', restSec: 120, intensity: 'clean sticks over distance' },
    regressions: ['broad-jump-stick', 'single-leg-landing'], progressions: ['power-bound', 'single-leg-bound'],
  }),
  'power-bound': M({
    qualities: ['horizontal-power', 'elastic-reactive'], direction: 'horizontal', laterality: 'alternating', footing: 'one-foot', emphasis: 'reactive',
    level: 'advanced', impact: 3, cns: 3, fresh: true,
    program: { sets: '3-4', distance: '15-25 yd', restSec: 180, intensity: 'big air, full rest' },
    regressions: ['single-leg-broad-jump', 'a-skip'], progressions: ['single-leg-bound'],
  }),
  'single-leg-bound': M({
    qualities: ['elastic-reactive', 'horizontal-power'], direction: 'horizontal', laterality: 'unilateral', footing: 'one-foot', emphasis: 'reactive',
    level: 'advanced', impact: 3, cns: 3, fresh: true,
    program: { sets: '2-3', reps: '3-4 / leg', restSec: 180, intensity: 'elite drill — earn it' },
    regressions: ['power-bound', 'single-leg-pogo'],
    warning: 'Only after months of pogos, bounds, and single-leg landing work. Grass or turf preferred.',
  }),

  // ================= ELASTIC / REACTIVE =================
  'ankle-hop': M({
    qualities: ['ankle-stiffness', 'elastic-reactive'], direction: 'vertical', laterality: 'bilateral', footing: 'two-foot', emphasis: 'elastic',
    level: 'foundation', impact: 1, cns: 0, fresh: false,
    program: { sets: '2-3', duration: '10-20 sec', restSec: 60, intensity: 'small + rhythmic' },
    progressions: ['pogo-hop', 'line-hop'],
  }),
  'pogo-hop': M({
    qualities: ['ankle-stiffness', 'elastic-reactive'], direction: 'vertical', laterality: 'bilateral', footing: 'two-foot', emphasis: 'elastic',
    level: 'foundation', impact: 1, cns: 1, fresh: false,
    program: { sets: '3-4', reps: '10-12', restSec: 90, intensity: 'stiff, springy' },
    regressions: ['ankle-hop'], progressions: ['alternating-pogo', 'single-leg-pogo', 'rudiment-hop', 'low-hurdle-hop'],
  }),
  'alternating-pogo': M({
    qualities: ['ankle-stiffness', 'sprint-mechanics'], direction: 'vertical', laterality: 'alternating', emphasis: 'elastic',
    level: 'intermediate', impact: 1, cns: 1, fresh: false,
    program: { sets: '2-3', reps: '10-20 contacts', restSec: 60, intensity: 'quick + quiet' },
    regressions: ['pogo-hop'], progressions: ['single-leg-pogo', 'dribble-run'],
  }),
  'single-leg-pogo': M({
    qualities: ['ankle-stiffness', 'elastic-reactive'], direction: 'vertical', laterality: 'unilateral', footing: 'one-foot', emphasis: 'elastic',
    level: 'intermediate', impact: 2, cns: 1, fresh: false,
    program: { sets: '2-3', reps: '8-15 / leg', restSec: 90, intensity: 'stop when rhythm breaks' },
    regressions: ['alternating-pogo', 'pogo-hop'], progressions: ['single-leg-bound', 'rudiment-hop'],
  }),
  'line-hop': M({
    qualities: ['coordination', 'ankle-stiffness'], direction: 'multi', laterality: 'bilateral', footing: 'two-foot', emphasis: 'elastic',
    level: 'foundation', impact: 1, cns: 0, fresh: false,
    program: { sets: '2-3', duration: '5-10 sec', restSec: 45, intensity: 'max frequency' },
    regressions: ['ankle-hop'], progressions: ['lateral-line-hop', 'rudiment-hop'],
  }),
  'rudiment-hop': M({
    qualities: ['elastic-reactive', 'coordination'], direction: 'multi', laterality: 'bilateral', emphasis: 'elastic',
    level: 'intermediate', impact: 1, cns: 1, fresh: false,
    program: { sets: '2-3', distance: '10-20 yd / pattern', restSec: 60, intensity: 'rhythm-perfect' },
    regressions: ['pogo-hop', 'line-hop'], progressions: ['low-hurdle-hop', 'power-bound'],
  }),
  'snap-down-rebound': M({
    qualities: ['elastic-reactive', 'vertical-power'], direction: 'vertical', laterality: 'bilateral', footing: 'two-foot', emphasis: 'reactive',
    level: 'intermediate', impact: 2, cns: 2, fresh: true,
    program: { sets: '3', reps: '3', restSec: 120, intensity: 'instant switch' },
    regressions: ['snap-down-stick', 'countermovement-jump'], progressions: ['depth-jump', 'repeated-cmj'],
  }),
  'low-hurdle-hop': M({
    qualities: ['elastic-reactive', 'vertical-power'], direction: 'vertical', laterality: 'bilateral', footing: 'two-foot', emphasis: 'reactive',
    level: 'intermediate', impact: 2, cns: 2, fresh: true,
    program: { sets: '3', reps: '4-6 hurdles', restSec: 120, intensity: 'quick + quiet' },
    regressions: ['pogo-hop', 'rudiment-hop'], progressions: ['depth-jump', 'repeated-cmj'],
  }),
  'depth-drop': M({
    qualities: ['force-absorption'], direction: 'vertical', laterality: 'bilateral', footing: 'two-foot', emphasis: 'absorption',
    level: 'intermediate', impact: 2, cns: 1, fresh: true,
    program: { sets: '3', reps: '3-4', restSec: 90, intensity: 'silent landings' },
    regressions: ['drop-landing', 'snap-down-stick'], progressions: ['depth-jump'],
  }),
  'depth-jump': M({
    qualities: ['elastic-reactive', 'vertical-power'], direction: 'vertical', laterality: 'bilateral', footing: 'two-foot', emphasis: 'reactive',
    level: 'advanced', impact: 3, cns: 3, fresh: true,
    program: { sets: '2-3', reps: '3', restSec: 180, intensity: 'shock method — tiny doses' },
    regressions: ['depth-drop', 'snap-down-rebound', 'low-hurdle-hop'],
    warning: 'Advanced only: months of landing + hurdle-hop base first. Modest box, short ground time, tiny volume.',
  }),
  'repeated-cmj': M({
    qualities: ['elastic-reactive', 'vertical-power'], direction: 'vertical', laterality: 'bilateral', footing: 'two-foot', emphasis: 'reactive',
    level: 'advanced', impact: 3, cns: 2, fresh: true,
    program: { sets: '2-3', reps: '4-6 linked', restSec: 150, intensity: 'every rep a real jump' },
    regressions: ['countermovement-jump', 'snap-down-rebound'],
  }),

  // ================= ABSORPTION / LANDING =================
  'snap-down': M({
    qualities: ['force-absorption'], direction: 'vertical', laterality: 'bilateral', footing: 'two-foot', emphasis: 'absorption',
    level: 'foundation', impact: 0, cns: 0, fresh: false,
    program: { sets: '2-3', reps: '5', restSec: 60, intensity: 'fast down, frozen catch' },
    progressions: ['snap-down-stick'],
  }),
  'snap-down-stick': M({
    qualities: ['force-absorption'], direction: 'vertical', laterality: 'bilateral', footing: 'two-foot', emphasis: 'absorption',
    level: 'foundation', impact: 1, cns: 1, fresh: false,
    program: { sets: '2-3', reps: '3-5', restSec: 75, intensity: 'two-second statue' },
    regressions: ['snap-down'], progressions: ['drop-landing', 'snap-down-rebound', 'lateral-bound-stick'],
  }),
  'drop-landing': M({
    qualities: ['force-absorption', 'deceleration'], direction: 'vertical', laterality: 'bilateral', footing: 'two-foot', emphasis: 'absorption',
    level: 'intermediate', impact: 2, cns: 1, fresh: true,
    program: { sets: '3', reps: '3-4', restSec: 90, intensity: 'silence = progress' },
    regressions: ['snap-down-stick'], progressions: ['depth-drop', 'single-leg-landing', 'depth-jump'],
  }),
  'single-leg-landing': M({
    qualities: ['force-absorption', 'balance-stability'], direction: 'vertical', laterality: 'unilateral', footing: 'one-foot', emphasis: 'absorption',
    level: 'intermediate', impact: 2, cns: 1, fresh: true,
    program: { sets: '2-3', reps: '3-4 / leg', restSec: 75, intensity: 'knee never caves' },
    regressions: ['snap-down-stick', 'step-down'], progressions: ['lateral-bound-stick', 'one-foot-jump', 'single-leg-bound'],
  }),
  'decel-stick': M({
    qualities: ['deceleration', 'force-absorption'], direction: 'horizontal', laterality: 'alternating', emphasis: 'absorption',
    level: 'intermediate', impact: 2, cns: 2, fresh: true,
    program: { sets: '1', reps: '4-6', distance: '10-15 yd', restSec: 150, intensity: 'shorter stop each week' },
    regressions: ['snap-down-stick', 'lateral-shuffle'], progressions: ['plant-and-go', 'turn-180', 'shuttle-5-10-5'],
  }),

  // ================= LATERAL =================
  'lateral-line-hop': M({
    qualities: ['ankle-stiffness', 'lateral-power'], direction: 'lateral', laterality: 'unilateral', footing: 'one-foot', emphasis: 'elastic',
    level: 'foundation', impact: 1, cns: 0, fresh: false,
    program: { sets: '2-3', duration: '5-10 sec / leg', restSec: 60, intensity: 'small + fast' },
    regressions: ['line-hop'], progressions: ['lateral-bound', 'skater-bound'],
  }),
  'lateral-shuffle': M({
    qualities: ['lateral-power', 'coordination'], direction: 'lateral', laterality: 'alternating', emphasis: 'concentric',
    level: 'foundation', impact: 1, cns: 1, fresh: false,
    program: { sets: '2-3', distance: '5-10 yd each way', restSec: 90, intensity: 'low + fast' },
    progressions: ['shuffle-to-sprint', 'lateral-bound', 'mirror-drill'],
  }),
  'lateral-bound': M({
    qualities: ['lateral-power', 'elastic-reactive'], direction: 'lateral', laterality: 'unilateral', footing: 'one-foot', emphasis: 'mixed',
    level: 'intermediate', impact: 2, cns: 2, fresh: true,
    program: { sets: '2-3', reps: '3-4 / side', restSec: 120, intensity: 'real distance' },
    regressions: ['lateral-line-hop', 'lateral-lunge'], progressions: ['lateral-bound-stick', 'skater-bound', 'crossover-bound'],
  }),
  'lateral-bound-stick': M({
    qualities: ['lateral-power', 'force-absorption'], direction: 'lateral', laterality: 'unilateral', footing: 'one-foot', emphasis: 'mixed',
    level: 'intermediate', impact: 2, cns: 2, fresh: true,
    program: { sets: '2-3', reps: '3 / side', restSec: 120, intensity: 'max bound, statue catch' },
    regressions: ['lateral-bound', 'single-leg-landing', 'snap-down-stick'], progressions: ['skater-bound', 'cut-90', 'plant-and-go'],
  }),
  'skater-bound': M({
    qualities: ['lateral-power', 'elastic-reactive'], direction: 'lateral', laterality: 'alternating', footing: 'one-foot', emphasis: 'reactive',
    level: 'advanced', impact: 3, cns: 2, fresh: true,
    program: { sets: '3', reps: '6-12 contacts', restSec: 120, intensity: 'springy exchanges' },
    regressions: ['lateral-bound-stick'], progressions: ['crossover-bound'],
  }),
  'crossover-bound': M({
    qualities: ['lateral-power', 'coordination'], direction: 'lateral', laterality: 'alternating', footing: 'one-foot', emphasis: 'mixed',
    level: 'advanced', impact: 2, cns: 2, fresh: true,
    program: { sets: '2-3', reps: '4-6 / direction', restSec: 120, intensity: 'hips lead' },
    regressions: ['skater-bound', 'crossover-run'], progressions: ['curved-sprint'],
  }),

  // ================= COD / AGILITY =================
  'crossover-run': M({
    qualities: ['coordination', 'cod'], direction: 'lateral', laterality: 'alternating', emphasis: 'elastic',
    level: 'foundation', impact: 1, cns: 0, fresh: false,
    program: { sets: '2', distance: '10-15 yd each way', restSec: 60, intensity: 'smooth' },
    progressions: ['crossover-bound', 'shuffle-to-sprint'],
  }),
  'shuffle-to-sprint': M({
    qualities: ['cod', 'acceleration'], direction: 'multi', laterality: 'alternating', emphasis: 'concentric',
    level: 'intermediate', impact: 2, cns: 2, fresh: true,
    program: { sets: '1', reps: '3-4 / side', restSec: 150, intensity: 'one violent hip flip' },
    regressions: ['lateral-shuffle'], progressions: ['reactive-shuttle', 'shuttle-5-10-5'],
  }),
  'plant-and-go': M({
    qualities: ['cod', 'deceleration'], direction: 'multi', laterality: 'unilateral', emphasis: 'mixed',
    level: 'intermediate', impact: 2, cns: 2, fresh: true,
    program: { sets: '1', reps: '3-4 / leg', distance: '5-10 yd', restSec: 150, intensity: 'full brake, full go' },
    regressions: ['decel-stick', 'lateral-bound-stick'], progressions: ['cut-90', 'turn-180', 'shuttle-5-10-5'],
  }),
  'cut-45': M({
    qualities: ['cod', 'lateral-power'], direction: 'multi', laterality: 'unilateral', emphasis: 'elastic',
    level: 'intermediate', impact: 2, cns: 2, fresh: true,
    program: { sets: '1', reps: '3-4 / side', restSec: 120, intensity: 'keep the speed' },
    regressions: ['lateral-bound', 'plant-and-go'], progressions: ['cut-90', 'curved-sprint'],
  }),
  'cut-90': M({
    qualities: ['cod', 'deceleration'], direction: 'multi', laterality: 'unilateral', emphasis: 'mixed',
    level: 'advanced', impact: 3, cns: 2, fresh: true,
    program: { sets: '1', reps: '3 / side', restSec: 150, intensity: 'sharp corners' },
    regressions: ['cut-45', 'plant-and-go', 'lateral-bound-stick'], progressions: ['turn-180', 'l-drill'],
  }),
  'turn-180': M({
    qualities: ['cod', 'deceleration'], direction: 'multi', laterality: 'unilateral', emphasis: 'mixed',
    level: 'advanced', impact: 3, cns: 2, fresh: true,
    program: { sets: '1', reps: '3-4', restSec: 150, intensity: 'low through the turn' },
    regressions: ['plant-and-go', 'decel-stick'], progressions: ['shuttle-5-10-5'],
  }),
  'curved-sprint': M({
    qualities: ['cod', 'max-velocity'], direction: 'multi', laterality: 'alternating', emphasis: 'elastic',
    level: 'advanced', impact: 2, cns: 2, fresh: true,
    program: { sets: '1', reps: '2-3 / direction', restSec: 180, intensity: '90%+ on the arc' },
    regressions: ['build-up-sprint', 'crossover-run'],
  }),
  'shuttle-5-10-5': M({
    qualities: ['cod', 'deceleration'], direction: 'multi', laterality: 'alternating', emphasis: 'mixed',
    level: 'advanced', impact: 3, cns: 3, fresh: true,
    program: { sets: '1', reps: '2-4', restSec: 180, intensity: 'timed, full recovery' },
    regressions: ['plant-and-go', 'turn-180'], progressions: ['l-drill', 'reactive-shuttle'],
  }),
  'l-drill': M({
    qualities: ['cod', 'coordination'], direction: 'multi', laterality: 'alternating', emphasis: 'mixed',
    level: 'advanced', impact: 3, cns: 2, fresh: true,
    program: { sets: '1', reps: '2-3 / side', restSec: 180, intensity: 'crisp lines' },
    regressions: ['shuttle-5-10-5', 'cut-90'],
  }),
  'mirror-drill': M({
    qualities: ['reactive-agility', 'lateral-power'], direction: 'multi', laterality: 'alternating', emphasis: 'reactive',
    level: 'intermediate', impact: 2, cns: 2, fresh: true,
    program: { sets: '3-4', duration: '5-8 sec', restSec: 90, intensity: 'react, never guess' },
    regressions: ['lateral-shuffle'], reactiveCues: ['visual', 'partner'],
  }),
  'reactive-shuttle': M({
    qualities: ['reactive-agility', 'cod'], direction: 'multi', laterality: 'alternating', emphasis: 'reactive',
    level: 'advanced', impact: 2, cns: 2, fresh: true,
    program: { sets: '2-3', reps: '4-6 reactions', restSec: 120, intensity: 'still → gone' },
    regressions: ['shuttle-5-10-5', 'shuffle-to-sprint'], reactiveCues: ['visual', 'audio', 'partner', 'app'],
  }),

  // ================= STABILITY / CONTROL =================
  'step-down': M({
    qualities: ['balance-stability', 'athletic-strength'], direction: 'vertical', laterality: 'unilateral', emphasis: 'absorption',
    level: 'foundation', impact: 0, cns: 0, fresh: false,
    program: { sets: '2-3', reps: '6-8 / leg', restSec: 90, intensity: '3-sec lowering' },
    progressions: ['single-leg-squat-box', 'single-leg-landing'],
  }),
  'lateral-lunge': M({
    qualities: ['lateral-power', 'athletic-strength'], direction: 'lateral', laterality: 'unilateral', emphasis: 'concentric',
    level: 'foundation', impact: 0, cns: 0, fresh: false,
    program: { sets: '3', reps: '8 / side', restSec: 90, intensity: 'controlled depth' },
    progressions: ['lateral-bound', 'cut-45'],
  }),
  'single-leg-squat-box': M({
    qualities: ['athletic-strength', 'balance-stability'], direction: 'vertical', laterality: 'unilateral', emphasis: 'mixed',
    level: 'intermediate', impact: 0, cns: 1, fresh: false,
    program: { sets: '3', reps: '5-6 / leg', restSec: 120, intensity: 'lower the box over time' },
    regressions: ['step-down'], progressions: ['single-leg-landing', 'one-foot-jump'],
  }),
  'balance-to-jump': M({
    qualities: ['balance-stability', 'vertical-power'], direction: 'vertical', laterality: 'unilateral', emphasis: 'concentric',
    level: 'intermediate', impact: 2, cns: 1, fresh: true,
    program: { sets: '2-3', reps: '3 / leg', restSec: 90, intensity: 'stillness → violence' },
    regressions: ['step-down', 'single-leg-landing'], progressions: ['one-foot-jump'],
  }),

  // ================= BALLISTIC / EQUIPMENT POWER =================
  'trap-bar-jump': M({
    qualities: ['explosive-strength', 'vertical-power'], direction: 'vertical', laterality: 'bilateral', footing: 'two-foot', emphasis: 'concentric',
    level: 'advanced', impact: 2, cns: 3, fresh: true,
    program: { sets: '3-4', reps: '3', restSec: 150, intensity: '15-30% of deadlift, violent' },
    regressions: ['jump-squat', 'countermovement-jump'],
  }),
  'jump-squat': M({
    qualities: ['explosive-strength', 'vertical-power'], direction: 'vertical', laterality: 'bilateral', footing: 'two-foot', emphasis: 'concentric',
    level: 'intermediate', impact: 2, cns: 2, fresh: true,
    program: { sets: '3', reps: '3-5', restSec: 120, intensity: 'light — speed is king' },
    regressions: ['countermovement-jump'], progressions: ['trap-bar-jump'],
  }),
  'kb-swing': M({
    qualities: ['explosive-strength', 'horizontal-power'], direction: 'horizontal', laterality: 'bilateral', emphasis: 'elastic',
    level: 'foundation', impact: 1, cns: 1, fresh: false,
    program: { sets: '3-4', reps: '8-12', restSec: 90, intensity: 'crisp snaps' },
    progressions: ['mb-scoop-toss', 'broad-jump'],
  }),
  'mb-scoop-toss': M({
    qualities: ['explosive-strength', 'vertical-power'], direction: 'vertical', laterality: 'bilateral', emphasis: 'concentric',
    level: 'foundation', impact: 1, cns: 1, fresh: true,
    program: { sets: '3', reps: '4-5', restSec: 120, intensity: '100% every throw' },
    regressions: ['kb-swing'], progressions: ['mb-overhead-throw', 'countermovement-jump'],
  }),
  'mb-rotational-throw': M({
    qualities: ['rotational-power'], direction: 'rotational', laterality: 'unilateral', emphasis: 'concentric',
    level: 'foundation', impact: 1, cns: 1, fresh: true,
    program: { sets: '3', reps: '4-5 / side', restSec: 90, intensity: 'hips first, full send' },
    progressions: ['mb-overhead-throw', 'crossover-bound'],
  }),
  'mb-overhead-throw': M({
    qualities: ['explosive-strength', 'vertical-power'], direction: 'vertical', laterality: 'bilateral', emphasis: 'concentric',
    level: 'intermediate', impact: 1, cns: 2, fresh: true,
    program: { sets: '3', reps: '3-4', restSec: 120, intensity: 'max distance' },
    regressions: ['mb-scoop-toss'],
  }),
  'sled-push': M({
    qualities: ['athletic-strength', 'horizontal-power'], direction: 'horizontal', laterality: 'alternating', emphasis: 'concentric',
    level: 'foundation', impact: 0, cns: 1, fresh: false,
    program: { sets: '3-5', distance: '10-20 yd', restSec: 120, intensity: 'moderate = crisp' },
    progressions: ['sled-sprint', 'resisted-start'],
  }),

  // ================= HAMSTRING / LOWER LEG =================
  'nordic-curl': M({
    qualities: ['sprint-hamstring'], direction: 'horizontal', laterality: 'bilateral', emphasis: 'absorption',
    level: 'intermediate', impact: 0, cns: 1, fresh: false,
    program: { sets: '2-3', reps: '3-6', restSec: 120, intensity: 'fight every degree' },
    regressions: ['slider-leg-curl', 'romanian-deadlift'],
  }),
  'slider-leg-curl': M({
    qualities: ['sprint-hamstring'], direction: 'horizontal', laterality: 'bilateral', emphasis: 'mixed',
    level: 'foundation', impact: 0, cns: 0, fresh: false,
    program: { sets: '3', reps: '8-12', restSec: 90, intensity: 'controlled' },
    progressions: ['nordic-curl'],
  }),
  'tibialis-raise': M({
    qualities: ['foot-ankle'], direction: 'vertical', laterality: 'bilateral', emphasis: 'mixed',
    level: 'foundation', impact: 0, cns: 0, fresh: false,
    program: { sets: '2-3', reps: '15-25', restSec: 60, intensity: 'burn = working' },
    progressions: ['ankle-hop'],
  }),

  // ================= EXISTING STRENGTH, CLASSIFIED ATHLETICALLY =================
  'front-squat': M({
    qualities: ['athletic-strength', 'explosive-strength'], direction: 'vertical', laterality: 'bilateral', emphasis: 'concentric',
    level: 'intermediate', impact: 0, cns: 2, fresh: false,
    program: { sets: '4', reps: '6-8', restSec: 180, intensity: '2-3 reps in the tank' },
    progressions: ['jump-squat', 'trap-bar-jump'],
  }),
  'romanian-deadlift': M({
    qualities: ['sprint-hamstring', 'athletic-strength'], direction: 'horizontal', laterality: 'bilateral', emphasis: 'mixed',
    level: 'foundation', impact: 0, cns: 1, fresh: false,
    program: { sets: '3', reps: '8', restSec: 150, intensity: 'hinge, not squat' },
    progressions: ['single-leg-rdl', 'good-morning', 'kb-swing', 'nordic-curl'],
  }),
  'single-leg-rdl': M({
    qualities: ['balance-stability', 'sprint-hamstring'], direction: 'horizontal', laterality: 'unilateral', emphasis: 'mixed',
    level: 'intermediate', impact: 0, cns: 1, fresh: false,
    program: { sets: '3', reps: '10 / leg', restSec: 90, intensity: 'slow + square' },
    regressions: ['romanian-deadlift'], progressions: ['single-leg-broad-jump'],
  }),
  'hip-thrust': M({
    qualities: ['horizontal-power', 'athletic-strength'], direction: 'horizontal', laterality: 'bilateral', emphasis: 'concentric',
    level: 'foundation', impact: 0, cns: 1, fresh: false,
    program: { sets: '4', reps: '8-10', restSec: 150, intensity: 'full lockout squeeze' },
    progressions: ['kb-swing', 'broad-jump'],
  }),
  'bulgarian-split-squat': M({
    qualities: ['athletic-strength', 'balance-stability'], direction: 'vertical', laterality: 'unilateral', emphasis: 'mixed',
    level: 'intermediate', impact: 0, cns: 1, fresh: false,
    program: { sets: '3', reps: '8-10 / leg', restSec: 120, intensity: 'controlled depth' },
    regressions: ['split-squat', 'reverse-lunge', 'step-up'], progressions: ['single-leg-squat-box'],
  }),
  'split-squat': M({
    qualities: ['athletic-strength', 'balance-stability'], direction: 'vertical', laterality: 'unilateral', emphasis: 'mixed',
    level: 'foundation', impact: 0, cns: 0, fresh: false,
    program: { sets: '3', reps: '10 / leg', restSec: 90, intensity: 'smooth' },
    progressions: ['bulgarian-split-squat', 'reverse-lunge'],
  }),
  'reverse-lunge': M({
    qualities: ['athletic-strength', 'balance-stability'], direction: 'vertical', laterality: 'unilateral', emphasis: 'mixed',
    level: 'foundation', impact: 0, cns: 0, fresh: false,
    program: { sets: '3', reps: '10 / leg', restSec: 90, intensity: 'knee-friendly' },
    progressions: ['bulgarian-split-squat', 'step-up'],
  }),
  'step-up': M({
    qualities: ['athletic-strength', 'balance-stability'], direction: 'vertical', laterality: 'unilateral', emphasis: 'concentric',
    level: 'foundation', impact: 0, cns: 0, fresh: false,
    program: { sets: '3', reps: '10 / leg', restSec: 90, intensity: 'no push-off cheat' },
    progressions: ['step-down', 'single-leg-squat-box'],
  }),
  'good-morning': M({
    qualities: ['sprint-hamstring', 'athletic-strength'], direction: 'horizontal', laterality: 'bilateral', emphasis: 'mixed',
    level: 'intermediate', impact: 0, cns: 1, fresh: false,
    program: { sets: '3', reps: '10', restSec: 120, intensity: 'light + long hamstrings' },
    regressions: ['romanian-deadlift'],
  }),
  'single-leg-calf-raise': M({
    qualities: ['foot-ankle', 'ankle-stiffness'], direction: 'vertical', laterality: 'unilateral', emphasis: 'mixed',
    level: 'foundation', impact: 0, cns: 0, fresh: false,
    program: { sets: '4', reps: '15-20 / leg', restSec: 60, intensity: 'full range, slow bottom' },
    progressions: ['pogo-hop', 'single-leg-pogo'],
  }),
  'dynamic-warmup': M({
    qualities: ['coordination'], direction: 'multi', laterality: 'alternating', emphasis: 'mixed',
    level: 'foundation', impact: 0, cns: 0, fresh: false,
    program: { duration: '6-10 min', restSec: 0, intensity: 'build to sprint-ready' },
  }),
}

/** Structured athletic metadata, when this exercise has it. */
export function athleticFor(id: string): AthleticMeta | null {
  return ATHLETIC[id] ?? null
}

/**
 * Quality-preserving substitutions: same PRIMARY quality, at or below
 * this movement's level (a sub should never be a level jump upward).
 */
export function athleticSubsFor(id: string): string[] {
  const meta = ATHLETIC[id]
  if (!meta) return []
  const primary = meta.qualities[0]
  const rank: Record<AthleticLevel, number> = { foundation: 0, intermediate: 1, advanced: 2 }
  return Object.entries(ATHLETIC)
    .filter(([otherId, m]) => otherId !== id && m.qualities[0] === primary && rank[m.level] <= rank[meta.level])
    .sort((a, b) => rank[b[1].level] - rank[a[1].level])
    .map(([otherId]) => otherId)
}

/** Full progression ladder through this movement: regressions → it → progressions. */
export function progressionChain(id: string): string[] {
  const meta = ATHLETIC[id]
  if (!meta) return [id]
  const back: string[] = []
  const seen = new Set<string>([id])
  let cur = meta.regressions?.[0]
  while (cur && !seen.has(cur) && back.length < 4) {
    seen.add(cur)
    back.unshift(cur)
    cur = ATHLETIC[cur]?.regressions?.[0]
  }
  const fwd: string[] = []
  cur = meta.progressions?.[0]
  while (cur && !seen.has(cur) && fwd.length < 4) {
    seen.add(cur)
    fwd.push(cur)
    cur = ATHLETIC[cur]?.progressions?.[0]
  }
  return [...back, id, ...fwd]
}

/** Compact "3×3 · 10 yd · rest 3 min · do fresh" line for the guide sheet. */
export function programLine(meta: AthleticMeta): string {
  const p = meta.program
  const bits: string[] = []
  if (p.sets && p.reps) bits.push(`${p.sets} × ${p.reps}`)
  else if (p.sets) bits.push(`${p.sets} sets`)
  else if (p.reps) bits.push(p.reps)
  if (p.distance) bits.push(p.distance)
  if (p.duration) bits.push(p.duration)
  if (p.restSec > 0) bits.push(p.restSec >= 60 ? `rest ${Math.round(p.restSec / 60)} min` : `rest ${p.restSec}s`)
  bits.push(p.intensity)
  if (meta.fresh) bits.push('do it FRESH')
  return bits.join(' · ')
}

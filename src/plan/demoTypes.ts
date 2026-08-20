// ============================================================
// The shape of a movement demo. This is data, not drawing:
// plan/demos.ts authors 148 of these, components/demoFigure.ts
// turns a pose into a body and ExerciseDemo animates between
// them. The type lives with the data rather than with either of
// the things that consume it, which is what let the drawing be
// replaced without reopening 148 hand-tuned movements.
//
// Angle conventions (all degrees, world frame, figure faces +x):
//   legs/arms  0 = straight down · +90 = horizontal forward ·
//              180 = straight up · negative = backward
//   torso      0 = upright · + = leaning forward
//   feet       0 = toe flat forward · + = toe pressing down
// ============================================================

export interface DemoPose {
  hx: number // hip x
  hy: number // hip y
  torso: number
  head: number // extra head tilt relative to torso
  thighF: number
  shinF: number
  footF: number
  thighB: number
  shinB: number
  footB: number
  armF: number
  foreF: number
  armB: number
  foreB: number
}

export type DemoEase = 'inout' | 'out' | 'in' | 'linear'

/** Segment: tween FROM the previous frame TO `p` over `d` ms, then pause `hold`. */
export interface DemoFrame {
  p: DemoPose
  d: number
  hold: number
  label: string | null
  ease: DemoEase
}

export type DemoHeld =
  | { kind: 'none' }
  | { kind: 'db'; at: 'wrists' | 'wristF' | 'wristB' | 'wristMid' | 'kneeF' }
  | { kind: 'plate'; at: 'chest' }
  | { kind: 'barbell'; at: 'wristMid' | 'backNeck' | 'hips' }
  | { kind: 'towel'; barY: number }

export type SceneItem =
  | { kind: 'seg'; x1: number; y1: number; x2: number; y2: number; w: number; tone?: 'faint' | 'accent' }
  | { kind: 'rect'; x: number; y: number; w: number; h: number; tone?: 'faint' | 'accent' }

export interface DemoSpec {
  frames: DemoFrame[]
  held: DemoHeld
  scene: SceneItem[]
  /** Draw the default ground line (default true). */
  ground?: boolean
}

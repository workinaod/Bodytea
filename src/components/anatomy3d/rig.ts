import type { DemoPose } from '../../plan/demoTypes'

// ============================================================
// The skeleton the 3D figure hangs on.
//
// It carries the SAME bone lengths as the 2D drawing, because the
// 194 pose sequences in plan/demos.ts are written in those units
// and in world-frame angles. Keeping the lengths means the poses
// transfer with no retargeting at all: a squat authored for the
// drawing is a squat here.
//
// The pose data is sagittal, so every joint rotates about Z and
// nothing twists. That is a real limitation and an honest one: a
// side plank and a rotational throw were drawn in profile and
// will read in profile. What the third dimension buys is not new
// poses, it is FORM, and a camera that can look at the movement
// from somewhere other than dead side on.
// ============================================================

/** Bone lengths, shared with the 2D figure so the poses transfer. */
export const BONE = {
  thigh: 16,
  shin: 15,
  foot: 6,
  torso: 19,
  upperArm: 11,
  forearm: 10,
  neck: 6.8,
} as const

export const D2R = Math.PI / 180

/** Every joint the pose data drives, as a world-frame angle in degrees. */
export interface RigAngles {
  /** Hip position, in the same 100x100 space the drawing uses. */
  hx: number
  hy: number
  torso: number
  head: number
  /** Near side (the one closest to camera in the profile view). */
  thighN: number
  shinN: number
  footN: number
  armN: number
  foreN: number
  /** Far side. */
  thighF: number
  shinF: number
  footF: number
  armF: number
  foreF: number
}

export function anglesOf(p: DemoPose): RigAngles {
  return {
    hx: p.hx,
    hy: p.hy,
    torso: p.torso,
    head: p.head,
    thighN: p.thighF,
    shinN: p.shinF,
    footN: p.footF,
    armN: p.armF,
    foreN: p.foreF,
    thighF: p.thighB,
    shinF: p.shinB,
    footF: p.footB,
    armF: p.armB,
    foreF: p.foreB,
  }
}

/**
 * The bones, named. Each one's rest pose points along its own -Y, so a
 * world angle becomes a rotation about Z and a CHILD's local rotation is
 * its world angle minus its parent's. Getting that subtraction wrong is
 * how a shin ends up bending the wrong way, so the joins are spelled out
 * rather than left to the caller.
 */
export const BONES = [
  'root',
  'spine',
  'neck',
  'head',
  'shoulderN',
  'upperArmN',
  'forearmN',
  'shoulderF',
  'upperArmF',
  'forearmF',
  'thighN',
  'shinN',
  'footN',
  'thighF',
  'shinF',
  'footF',
] as const

export type BoneName = (typeof BONES)[number]

/** Local Z rotation for every bone, in radians, for one pose. */
export function localRotations(a: RigAngles): Record<BoneName, number> {
  // The torso points UP out of the hip, the limbs point DOWN, which is
  // why the torso term is negated and the limbs are not.
  const spine = -a.torso * D2R
  return {
    root: 0,
    spine,
    // The head angle in the data is relative to the torso already.
    neck: -a.head * D2R,
    head: 0,
    // Arms hang from the shoulder, so their world angle is measured from
    // straight down, and the shoulder rides on the spine's rotation.
    shoulderN: 0,
    upperArmN: (a.armN + a.torso) * D2R,
    forearmN: (a.foreN - a.armN) * D2R,
    shoulderF: 0,
    upperArmF: (a.armF + a.torso) * D2R,
    forearmF: (a.foreF - a.armF) * D2R,
    // Legs hang from the root, which never rotates, so their world angle
    // is their local one.
    thighN: a.thighN * D2R,
    shinN: (a.shinN - a.thighN) * D2R,
    footN: (a.footN + 90 - a.shinN) * D2R,
    thighF: a.thighF * D2R,
    shinF: (a.shinF - a.thighF) * D2R,
    footF: (a.footF + 90 - a.shinF) * D2R,
  }
}

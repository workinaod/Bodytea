import type { MuscleRegion } from '../../plan/muscleRegions'
import type { BoneName } from './rig'

// ============================================================
// The body, as muscles hung on bones.
//
// One écorché, doing both jobs the app needs a body for: it POSES
// for a movement demo and it LIGHTS UP for the muscle map. Those
// were two separate drawings before, which is why the app could
// show you a squat and a muscle chart that disagreed about what
// a leg looks like.
//
// Every belly is a stretched ellipsoid parented to a bone. That
// is not a shortcut, it is how an anatomy model actually reads at
// 110 pixels: a muscle is a spindle, thick in the middle and
// tapering into tendon at both ends, and forty spindles in the
// right places is a body. Individual fibres would cost geometry
// nobody can see on a phone.
//
// Each belly carries its REGION, which is the same vocabulary
// plan/muscleRegions.ts uses, so highlighting is a material swap
// rather than a second set of shapes to keep in sync.
// ============================================================

export interface Belly {
  /** What lights this up, or null for bone, tendon and skull. */
  r: MuscleRegion | null
  bone: BoneName
  /** How far along the bone the belly sits, 0 at the joint it hangs from. */
  t: number
  /** Offset from the bone: forward (the way the figure faces) and sideways. */
  fwd?: number
  side?: number
  /** Half-extents. The figure faces +X, so rx is DEPTH front to back,
   *  ry runs along the bone, and rz is WIDTH side to side. A chest is
   *  wider than it is deep, which is the pair most easily got backwards. */
  rx: number
  ry: number
  rz: number
  /** Tilt about Z, for a muscle that does not run straight down the bone. */
  tilt?: number
}

/** Half the body's parts are mirrored, so sides are written once. */
const arm = (side: 'N' | 'F'): Belly[] => {
  const z = side === 'N' ? 1 : -1
  const u = `upperArm${side}` as BoneName
  const f = `forearm${side}` as BoneName
  const s = `shoulder${side}` as BoneName
  return [
    // The limb itself, under everything. Muscle bellies are spindles and
    // spindles alone read as a bag of beans; what makes them read as an
    // arm is the continuous shaft they are wrapped around, which is the
    // bone and the deep tissue nobody names.
    { r: null, bone: u, t: 0.5, rx: 1.3, ry: 5.6, rz: 1.4 },
    { r: null, bone: f, t: 0.5, rx: 1.1, ry: 5.2, rz: 1.2 },
    // The deltoid is three heads and they are three separate answers on
    // the muscle map, so they are three shapes here too.
    { r: 'delts-front', bone: s, t: 0.15, fwd: 2.2, side: z * 0.2, rx: 2.4, ry: 2.8, rz: 2.4 },
    { r: 'delts-side', bone: s, t: 0.35, fwd: 0, side: z * 1.2, rx: 2.6, ry: 3.4, rz: 2.9 },
    { r: 'delts-rear', bone: s, t: 0.15, fwd: -2.2, side: z * 0.2, rx: 2.3, ry: 2.8, rz: 2.3 },
    { r: 'biceps', bone: u, t: 0.5, fwd: 1.5, side: 0, rx: 1.9, ry: 3.6, rz: 2.0 },
    { r: 'triceps', bone: u, t: 0.48, fwd: -1.6, side: 0, rx: 2.0, ry: 3.8, rz: 2.1 },
    { r: 'forearms', bone: f, t: 0.3, fwd: 0.3, side: 0, rx: 1.8, ry: 3.4, rz: 1.9 },
    // Hand and elbow: not muscle, but a limb that stops at the wrist
    // reads as an amputation.
    { r: null, bone: f, t: 1.0, fwd: 0.2, side: 0, rx: 1.3, ry: 1.9, rz: 1.1 },
    { r: null, bone: u, t: 1, rx: 1.5, ry: 1.5, rz: 1.5 },
  ]
}

const leg = (side: 'N' | 'F'): Belly[] => {
  const th = `thigh${side}` as BoneName
  const sh = `shin${side}` as BoneName
  const ft = `foot${side}` as BoneName
  return [
    { r: null, bone: th, t: 0.5, rx: 1.9, ry: 8.2, rz: 2.0 },
    { r: null, bone: sh, t: 0.45, rx: 1.4, ry: 7.4, rz: 1.5 },
    { r: 'quads', bone: th, t: 0.45, fwd: 1.9, side: 0, rx: 3.0, ry: 6.4, rz: 3.3 },
    { r: 'hamstrings', bone: th, t: 0.5, fwd: -2.2, side: 0, rx: 2.7, ry: 6.0, rz: 3.0 },
    { r: 'adductors', bone: th, t: 0.42, fwd: 0.2, side: -0.6, rx: 2.2, ry: 5.6, rz: 2.3 },
    { r: 'calves', bone: sh, t: 0.3, fwd: -1.7, side: 0, rx: 2.2, ry: 4.2, rz: 2.5 },
    { r: 'tibialis', bone: sh, t: 0.3, fwd: 1.2, side: 0, rx: 1.5, ry: 3.8, rz: 1.6 },
    { r: 'achilles-feet', bone: sh, t: 0.9, fwd: -0.5, side: 0, rx: 1.1, ry: 1.9, rz: 1.3 },
    // The ankle first, then the foot along its own bone. Without the
    // ankle the foot reads as a shoe somebody left below the leg.
    { r: null, bone: sh, t: 1, rx: 1.4, ry: 1.4, rz: 1.5 },
    { r: 'achilles-feet', bone: ft, t: 0.38, fwd: 0.4, side: 0, rx: 1.5, ry: 3.2, rz: 1.9 },
    { r: null, bone: th, t: 1, rx: 2.4, ry: 2.0, rz: 2.4 },
  ]
}

/**
 * The trunk.
 *
 * Written along the spine bone, which runs from the hip UP, so `t`
 * climbs from pelvis to shoulder. The ribcage and pelvis are drawn as
 * bone rather than muscle: on an écorché those are the landmarks
 * everything else is read against.
 */
const TRUNK: Belly[] = [
  { r: null, bone: 'root', t: 0, fwd: -0.2, rx: 3.8, ry: 3.4, rz: 5.4 },
  { r: 'glutes', bone: 'root', t: 0, fwd: -3.0, side: 2.4, rx: 3.0, ry: 3.2, rz: 3.0 },
  { r: 'glutes', bone: 'root', t: 0, fwd: -3.0, side: -2.4, rx: 3.0, ry: 3.2, rz: 3.0 },
  { r: 'hip-flexors', bone: 'spine', t: 0.09, fwd: 2.2, side: 1.5, rx: 1.3, ry: 2.2, rz: 1.4 },
  { r: 'hip-flexors', bone: 'spine', t: 0.09, fwd: 2.2, side: -1.5, rx: 1.3, ry: 2.2, rz: 1.4 },
  { r: 'abs', bone: 'spine', t: 0.32, fwd: 3.2, rx: 2.2, ry: 4.0, rz: 2.8 },
  { r: 'obliques', bone: 'spine', t: 0.33, fwd: 1.2, side: 3.9, rx: 2.4, ry: 3.8, rz: 1.9 },
  { r: 'obliques', bone: 'spine', t: 0.33, fwd: 1.2, side: -3.9, rx: 2.4, ry: 3.8, rz: 1.9 },
  { r: 'lower-back', bone: 'spine', t: 0.24, fwd: -3.0, side: 1.6, rx: 1.8, ry: 3.4, rz: 1.9 },
  { r: 'lower-back', bone: 'spine', t: 0.24, fwd: -3.0, side: -1.6, rx: 1.8, ry: 3.4, rz: 1.9 },
  // The ribcage: the one volume everything on the trunk sits on.
  { r: null, bone: 'spine', t: 0.62, fwd: 0.3, rx: 4.2, ry: 5.0, rz: 5.6 },
  { r: 'chest', bone: 'spine', t: 0.66, fwd: 3.4, side: 2.4, rx: 2.4, ry: 2.6, rz: 3.2 },
  { r: 'chest', bone: 'spine', t: 0.66, fwd: 3.4, side: -2.4, rx: 2.4, ry: 2.6, rz: 3.2 },
  { r: 'chest-upper', bone: 'spine', t: 0.8, fwd: 3.0, side: 2.4, rx: 2.2, ry: 1.8, rz: 3.0 },
  { r: 'chest-upper', bone: 'spine', t: 0.8, fwd: 3.0, side: -2.4, rx: 2.2, ry: 1.8, rz: 3.0 },
  { r: 'lats', bone: 'spine', t: 0.52, fwd: -1.8, side: 4.2, rx: 2.6, ry: 5.4, rz: 2.2, tilt: 12 },
  { r: 'lats', bone: 'spine', t: 0.52, fwd: -1.8, side: -4.2, rx: 2.6, ry: 5.4, rz: 2.2, tilt: -12 },
  { r: 'mid-back', bone: 'spine', t: 0.7, fwd: -3.4, side: 2.1, rx: 2.2, ry: 3.2, rz: 2.6 },
  { r: 'mid-back', bone: 'spine', t: 0.7, fwd: -3.4, side: -2.1, rx: 2.2, ry: 3.2, rz: 2.6 },
  { r: 'traps', bone: 'spine', t: 0.95, fwd: -1.2, side: 2.2, rx: 2.4, ry: 2.2, rz: 3.4 },
  { r: 'traps', bone: 'spine', t: 0.95, fwd: -1.2, side: -2.2, rx: 2.4, ry: 2.2, rz: 3.4 },
  { r: 'traps', bone: 'neck', t: 0.35, fwd: -0.9, rx: 1.9, ry: 2.2, rz: 2.6 },
  { r: null, bone: 'neck', t: 0.6, fwd: 0.2, rx: 1.8, ry: 2.4, rz: 1.9 },
  { r: null, bone: 'head', t: 0.5, fwd: 0.4, rx: 3.3, ry: 3.9, rz: 3.0 },
]

export const BELLIES: Belly[] = [...TRUNK, ...arm('N'), ...arm('F'), ...leg('N'), ...leg('F')]

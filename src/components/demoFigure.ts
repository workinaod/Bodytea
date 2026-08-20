// ============================================================
// The body the exercise demos are drawn with.
//
// The demos used to be a stick figure: polylines for the limbs,
// a line for the torso, a circle for the head. The POSES were
// never the problem. plan/demos.ts holds 148 movements as real
// keyframed joint angles, and that data is untouched by this
// file. What was wrong was the drawing: strokes have no volume,
// so a squat and a hip hinge looked like the same bent wire.
//
// So this turns the same joints into a body with mass:
//
// 1. LIMBS TAPER, AS ONE OUTLINE. A thigh is thicker than a
//    shin because it is, and the silhouette is walked in one
//    path so the hairline draws the limb rather than the bones
//    inside it.
// 2. THE TRUNK IS A TRUNK. Chest, waist, lumbar curve and
//    glute, built in the torso's own frame so it stays right
//    at every lean the pose data asks for.
// 3. IT FACES SOMEWHERE. The head is a profile with a brow, a
//    chin and a nape, so a movement reads as forward or
//    backward without a caption.
//
// It is deliberately an anonymous mannequin: no face, no hair,
// no clothes, no expression. The Sergeant and the trainee are
// another lane's work and this must never drift into them.
// This figure demonstrates a movement and has no personality
// to develop.
//
// Pure geometry. It takes points and returns path strings, so
// the component and a preview script can draw the same body
// without either of them owning the shapes.
// ============================================================

import type { DemoPose } from '../plan/demoTypes'

export interface Pt {
  x: number
  y: number
}

const f2 = (n: number) => (Math.abs(n) < 0.005 ? '0' : n.toFixed(2))
const P = (p: Pt) => `${f2(p.x)},${f2(p.y)}`

/** Unit vector from a to b, and its length. Zero-safe: a limb can fold flat. */
function axis(a: Pt, b: Pt) {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = Math.hypot(dx, dy) || 0.0001
  return { ux: dx / len, uy: dy / len, len }
}

/**
 * A smooth closed outline through a ring of points.
 *
 * Catmull-Rom through the points, converted to cubics, so a shape
 * is authored as the handful of landmarks it actually has (chin,
 * brow, glute, lumbar) instead of as bezier handles nobody can
 * read six months later.
 */
function ring(pts: Pt[]): string {
  const n = pts.length
  let d = `M${P(pts[0])}`
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n]
    const p1 = pts[i]
    const p2 = pts[(i + 1) % n]
    const p3 = pts[(i + 2) % n]
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 }
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 }
    d += `C${P(c1)} ${P(c2)} ${P(p2)}`
  }
  return d + 'Z'
}

/**
 * A limb as ONE closed outline.
 *
 * The first draft stacked a tapered capsule per bone and let them
 * union. It read as a string of beads, because a hairline drawn
 * around every subpath draws the subpaths, not the limb. So the
 * outline is walked instead: down one side of the joint chain,
 * around the far cap, back up the other side, around the near cap.
 * One path, one silhouette, and the widths in between are free to
 * swell wherever a calf or a forearm belly belongs.
 */
function chain(pts: Pt[], radii: number[]): string {
  const n = pts.length
  // The outward normal at each point: perpendicular to the bone at
  // the ends, the bisector of both bones at a joint, so a bent
  // elbow keeps its thickness instead of pinching to nothing.
  const norm: Pt[] = []
  for (let i = 0; i < n; i++) {
    const prev = i > 0 ? axis(pts[i - 1], pts[i]) : null
    const next = i < n - 1 ? axis(pts[i], pts[i + 1]) : null
    const ax = prev ? -prev.uy : 0
    const ay = prev ? prev.ux : 0
    const bx = next ? -next.uy : 0
    const by = next ? next.ux : 0
    const m = Math.hypot(ax + bx, ay + by) || 0.0001
    norm.push({ x: (ax + bx) / m, y: (ay + by) / m })
  }
  const off = (i: number, s: number): Pt => ({
    x: pts[i].x + norm[i].x * radii[i] * s,
    y: pts[i].y + norm[i].y * radii[i] * s,
  })
  // A cap is three points, a shoulder either side and a tip past the
  // end, which the smoothing turns into a round end.
  const cap = (i: number, ux: number, uy: number): Pt[] => {
    const r = radii[i]
    const c = 0.74
    const s = (k: number) => ({
      x: pts[i].x + (norm[i].x * c * k + ux * c) * r,
      y: pts[i].y + (norm[i].y * c * k + uy * c) * r,
    })
    return [s(1), { x: pts[i].x + ux * r, y: pts[i].y + uy * r }, s(-1)]
  }
  const last = axis(pts[n - 2], pts[n - 1])
  const first = axis(pts[1], pts[0])
  const out: Pt[] = []
  for (let i = 0; i < n; i++) out.push(off(i, 1))
  out.push(...cap(n - 1, last.ux, last.uy))
  for (let i = n - 1; i >= 0; i--) out.push(off(i, -1))
  out.push(...cap(0, first.ux, first.uy))
  return ring(out)
}

/** Build a point from a local frame: origin + along*u + out*(u turned to face). */
function frame(o: Pt, ux: number, uy: number, along: number, out: number): Pt {
  return { x: o.x + along * ux - out * uy, y: o.y + along * uy + out * ux }
}

function lerp(a: Pt, b: Pt, t: number): Pt {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
}

/**
 * The trunk, in the torso's own frame.
 *
 * Landmarks as (fraction of hip-to-shoulder, depth in front of the
 * spine line). Negative depth is behind. The lumbar dip and the
 * glute behind it are what stop a hip hinge from reading as a
 * forward lean, so they are drawn even at this size. It stops AT
 * the shoulder joint rather than over it, so the deltoid the arm
 * carries stays a visible mass instead of being swallowed.
 */
const TRUNK: [number, number][] = [
  [-0.16, 2.7],
  [0.13, 4.3],
  [0.33, 4.4],
  [0.54, 4.2],
  [0.72, 4.9],
  // The pec is a PLANE that runs up into the shoulder, and it is high
  // on the ribcage. A single deep landmark low on the torso is a
  // sphere hanging off the front, which is a breast, not a chest.
  [0.86, 5.6],
  [0.96, 5.3],
  [1.06, 3.0],
  [1.06, -3.0],
  [0.94, -4.9],
  [0.74, -5.3],
  [0.5, -4.0],
  [0.2, -5.3],
  [-0.16, -3.6],
]

function trunk(hip: Pt, shoulder: Pt): string {
  const { ux, uy, len } = axis(hip, shoulder)
  return ring(TRUNK.map(([t, o]) => frame(hip, ux, uy, t * len, o)))
}

/**
 * The head in profile: crown, brow, face, chin, jaw, nape, occiput.
 *
 * Landmarks as (height above the head centre, depth in front of
 * it). A circle would be shorter to write and would point nowhere,
 * and half of these movements are only legible because you can see
 * which way the athlete is looking.
 */
const SKULL: [number, number][] = [
  [5.0, -1.4],
  [4.7, 1.0],
  [3.0, 2.7],
  [1.2, 3.3],
  [-0.4, 3.2],
  [-1.9, 2.9],
  // Two landmarks a short step apart, because a smooth curve through
  // widely spaced points rounds a chin away and leaves an egg.
  [-3.0, 2.4],
  [-3.6, 1.4],
  [-3.7, -0.6],
  [-3.0, -2.4],
  [-1.3, -3.8],
  [0.9, -4.5],
  [3.1, -3.7],
]

/** `up` is the head's own up vector; the face looks a quarter turn from it. */
/** Slightly under life scale: an 8-head figure carries authority, and
 *  the original drawing was closer to six and a half. */
const HEAD_SCALE = 0.87

function skull(centre: Pt, upx: number, upy: number): string {
  return ring(SKULL.map(([a, b]) => frame(centre, upx, upy, a * HEAD_SCALE, b * HEAD_SCALE)))
}

/** A foot: heel behind the ankle, sole along the ground, toe at the end. */
function foot(ankle: Pt, toe: Pt): string {
  const { ux, uy, len } = axis(ankle, toe)
  const pts: [number, number][] = [
    [-2.1, 1.4],
    [-2.5, -0.6],
    [-1.3, -1.7],
    [len * 0.45, -1.3],
    [len, -0.6],
    [len + 0.6, 0.8],
    [len * 0.5, 1.4],
  ]
  return ring(pts.map(([a, o]) => frame(ankle, ux, uy, a, o)))
}

// ---- How thick each part is, at each joint ----
// Profile depths, not widths: this figure is seen from the side.
const R = {
  pelvis: 3.0,
  hip: 3.7,
  knee: 2.6,
  calf: 2.95,
  ankle: 1.45,
  shoulder: 3.0,
  elbow: 1.95,
  fore: 2.2,
  wrist: 1.2,
  hand: 1.6,
  neckLow: 2.2,
  neckHigh: 1.9,
}

/** Where along the shin the calf sits, and along the forearm its belly. */
const CALF_AT = 0.32
const FORE_AT = 0.24
/** How far past the wrist the hand reaches. */
const HAND_AT = 1.7

/**
 * A leg: thigh, calf-swollen shin, and the foot as its own silhouette.
 *
 * It is rooted a little way UP the torso rather than at the hip joint,
 * so its round end is buried in the pelvis. Ending it at the joint put
 * a full circle where the hip is, and a circle wider than the pelvis
 * draws a lasso across it.
 */
function leg(hip: Pt, knee: Pt, ankle: Pt, toe: Pt, up: Pt): string {
  const calf = lerp(knee, ankle, CALF_AT)
  const root: Pt = { x: hip.x + up.x * 3.2, y: hip.y + up.y * 3.2 }
  return (
    chain([root, hip, knee, calf, ankle], [R.pelvis, R.hip, R.knee, R.calf, R.ankle]) +
    foot(ankle, toe)
  )
}

/** An arm: upper arm, forearm with its belly, and the hand on the end. */
function arm(shoulder: Pt, elbow: Pt, wrist: Pt): string {
  const belly = lerp(elbow, wrist, FORE_AT)
  const { ux, uy } = axis(elbow, wrist)
  const hand = { x: wrist.x + ux * HAND_AT, y: wrist.y + uy * HAND_AT }
  return chain([shoulder, elbow, belly, wrist, hand], [R.shoulder, R.elbow, R.fore, R.wrist, R.hand])
}

/**
 * The neck, drawn under the head and under the trunk so both cover
 * its ends. Rooted below the shoulder line for the same reason the
 * leg is rooted above the hip: a cap that pokes out of the shape it
 * belongs to reads as a collar.
 */
function neck(shoulder: Pt, headBase: Pt, up: Pt): string {
  const root: Pt = { x: shoulder.x - up.x * 2.2, y: shoulder.y - up.y * 2.2 }
  return chain([root, headBase], [R.neckLow, R.neckHigh])
}

// ---- Skeleton proportions (viewBox units) ----
// These live with the drawing because the bone lengths and the
// shapes hung on them are one thing: changing a thigh length
// without the thigh is how a figure ends up with a knee inside
// its shin.
const TH = 16 // thigh
const SH = 15 // shin
const FT = 6 // foot
const TOR = 19 // hip to shoulder
const ARM = 11 // shoulder to elbow
const FORE = 10 // elbow to wrist
const NECK = 6.8 // shoulder to head centre
export const HEAD_R = 5.0

const D2R = Math.PI / 180
const down = (deg: number) => ({ x: Math.sin(deg * D2R), y: Math.cos(deg * D2R) })
const up = (deg: number) => ({ x: Math.sin(deg * D2R), y: -Math.cos(deg * D2R) })

/** Forward kinematics: a pose's angles become world points. */
export function joints(p: DemoPose) {
  const hip: Pt = { x: p.hx, y: p.hy }
  const at = (o: Pt, l: number, d: Pt): Pt => ({ x: o.x + l * d.x, y: o.y + l * d.y })

  const kneeF = at(hip, TH, down(p.thighF))
  const ankleF = at(kneeF, SH, down(p.shinF))
  const toeF = at(ankleF, FT, { x: Math.cos(p.footF * D2R), y: Math.sin(p.footF * D2R) })
  const kneeB = at(hip, TH, down(p.thighB))
  const ankleB = at(kneeB, SH, down(p.shinB))
  const toeB = at(ankleB, FT, { x: Math.cos(p.footB * D2R), y: Math.sin(p.footB * D2R) })

  const shoulder = at(hip, TOR, up(p.torso))
  const headC = at(shoulder, NECK, up(p.torso + p.head))
  const elbowF = at(shoulder, ARM, down(p.armF))
  const wristF = at(elbowF, FORE, down(p.foreF))
  const elbowB = at(shoulder, ARM, down(p.armB))
  const wristB = at(elbowB, FORE, down(p.foreB))

  // The head's own up vector, so the profile faces where it looks.
  const hu = up(p.torso + p.head)

  // Anchor points for held equipment.
  const front = { x: Math.cos(p.torso * D2R), y: Math.sin(p.torso * D2R) }
  const chest: Pt = {
    x: hip.x + 0.62 * TOR * Math.sin(p.torso * D2R) + 3.2 * front.x,
    y: hip.y - 0.62 * TOR * Math.cos(p.torso * D2R) + 3.2 * front.y,
  }
  const backNeck: Pt = { x: shoulder.x - 2.8 * front.x, y: shoulder.y - 2.8 * front.y }
  const hipsAnchor: Pt = { x: hip.x + 2.5 * front.x, y: hip.y + 2.5 * front.y }
  const wristMid: Pt = { x: (wristF.x + wristB.x) / 2, y: (wristF.y + wristB.y) / 2 }

  return { hip, kneeF, ankleF, toeF, kneeB, ankleB, toeB, shoulder, headC, hu, elbowF, wristF, elbowB, wristB, chest, backNeck, hipsAnchor, wristMid }
}

export type Joints = ReturnType<typeof joints>

// ---- Form shading ----
//
// A flat fill is a sticker; a body is round. Each part carries its own
// gradient axis, laid ACROSS the part rather than across the picture,
// so a thigh at any angle is bright on the side facing the light and
// dark on the side away from it. That is the whole difference between
// a cut-out and something with a form to it, and it is what makes the
// figure hold up in a pose nobody drew it in.
//
// One light, from above and a little to the left, for every part in
// every frame. Shared lighting is what fuses the parts into a body.
const LIGHT = { x: -0.42, y: -0.91 }

/** A gradient axis in user space: lit end first, shadow end second. */
export type Shade = [number, number, number, number]

/**
 * The axis is deliberately NARROWER than the part's widest joint.
 *
 * Spanning the widest one means a thin segment sits entirely in the
 * middle of the ramp and comes out a flat mid-grey: a leg lit across
 * a 3.7 hip renders its 1.45 ankle with no light on it at all. Three
 * quarters puts the bright end and the terminator inside the thin
 * segments too, and the wide ones simply clip, which is what a wide
 * form does under a light anyway.
 */
const SPAN = 0.75

function shadeAcross(a: Pt, b: Pt, r: number): Shade {
  const { ux, uy } = axis(a, b)
  const nx = -uy
  const ny = ux
  // Point the axis at the light, so the bright stop lands on the side
  // that faces it however the limb is turned.
  const s = (nx * LIGHT.x + ny * LIGHT.y >= 0 ? 1 : -1) * r * SPAN
  const cx = (a.x + b.x) / 2
  const cy = (a.y + b.y) / 2
  return [cx + nx * s, cy + ny * s, cx - nx * s, cy - ny * s]
}

/** One drawn part: its outline and the axis its light runs along. */
export interface Part {
  d: string
  g: Shade
}

export interface BodyPaths {
  legB: Part
  armB: Part
  neck: Part
  trunk: Part
  head: Part
  legF: Part
  armF: Part
}

export function body(j: Joints): BodyPaths {
  // The head sits NECK from the shoulder, so its base is a little
  // below its centre along its own up vector.
  const base: Pt = { x: j.headC.x - j.hu.x * 2.6, y: j.headC.y - j.hu.y * 2.6 }
  const tu = axis(j.hip, j.shoulder)
  const up: Pt = { x: tu.ux, y: tu.uy }
  const crown: Pt = { x: j.headC.x + j.hu.x * 4, y: j.headC.y + j.hu.y * 4 }
  return {
    legB: { d: leg(j.hip, j.kneeB, j.ankleB, j.toeB, up), g: shadeAcross(j.hip, j.ankleB, R.hip) },
    armB: { d: arm(j.shoulder, j.elbowB, j.wristB), g: shadeAcross(j.shoulder, j.wristB, R.shoulder) },
    neck: { d: neck(j.shoulder, base, j.hu), g: shadeAcross(j.shoulder, base, R.neckLow) },
    trunk: { d: trunk(j.hip, j.shoulder), g: shadeAcross(j.hip, j.shoulder, 5.4) },
    head: { d: skull(j.headC, j.hu.x, j.hu.y), g: shadeAcross(base, crown, 4.2) },
    legF: { d: leg(j.hip, j.kneeF, j.ankleF, j.toeF, up), g: shadeAcross(j.hip, j.ankleF, R.hip) },
    armF: { d: arm(j.shoulder, j.elbowF, j.wristF), g: shadeAcross(j.shoulder, j.wristF, R.shoulder) },
  }
}

/** The part names, in the order they are drawn. */
export const PARTS = ['legB', 'armB', 'neck', 'trunk', 'head', 'legF', 'armF'] as const
export type PartKey = (typeof PARTS)[number]

import * as THREE from 'three'
import type { MuscleRegion } from '../../plan/muscleRegions'
import type { DemoPose } from '../../plan/demoTypes'
import { BELLIES } from './muscles'
import { BONE, D2R, anglesOf, localRotations, type BoneName } from './rig'

// ============================================================
// One écorché, built at runtime, used by everything that needs a
// body: the movement demo poses it, the muscle map lights it.
//
// Nothing is downloaded. The mesh is forty ellipsoids on a bone
// hierarchy, generated from the tables next door, which is why it
// weighs nothing, works offline, needs no licence and cannot 404.
// A bought model would look better and would also be a megabyte
// in the precache, an asset pipeline, and a licence to honour on
// every screen it appears on.
//
// The camera sits a few degrees off profile. Dead side on is what
// the pose data was drawn for and is the most legible angle for a
// movement; a slight turn is what tells you it is a body in a
// room rather than a sticker.
// ============================================================

/** How a belly is painted right now. */
export type Lit = 'base' | 'primary' | 'secondary'

interface BoneSpec {
  parent: BoneName | null
  /** Where this bone's joint sits in its parent's local space. */
  at: [number, number, number]
  len: number
  /** +1 when the bone runs up out of its joint, -1 when it hangs down. */
  dir: 1 | -1
}

// Half the shoulder width. An eight-head figure is about a quarter of its
// own height across the shoulders, and this body is roughly 62 units tall.
const SIDE = 7.0

const SKELETON: Record<BoneName, BoneSpec> = {
  root: { parent: null, at: [0, 0, 0], len: 0, dir: 1 },
  spine: { parent: 'root', at: [0, 0, 0], len: BONE.torso, dir: 1 },
  neck: { parent: 'spine', at: [0, BONE.torso, 0], len: BONE.neck * 0.55, dir: 1 },
  head: { parent: 'neck', at: [0, BONE.neck * 0.55, 0], len: BONE.neck * 0.45, dir: 1 },
  shoulderN: { parent: 'spine', at: [0, BONE.torso * 0.96, SIDE], len: 3, dir: -1 },
  upperArmN: { parent: 'shoulderN', at: [0, 0, 0], len: BONE.upperArm, dir: -1 },
  forearmN: { parent: 'upperArmN', at: [0, -BONE.upperArm, 0], len: BONE.forearm, dir: -1 },
  shoulderF: { parent: 'spine', at: [0, BONE.torso * 0.96, -SIDE], len: 3, dir: -1 },
  upperArmF: { parent: 'shoulderF', at: [0, 0, 0], len: BONE.upperArm, dir: -1 },
  forearmF: { parent: 'upperArmF', at: [0, -BONE.upperArm, 0], len: BONE.forearm, dir: -1 },
  thighN: { parent: 'root', at: [0, 0, SIDE * 0.52], len: BONE.thigh, dir: -1 },
  shinN: { parent: 'thighN', at: [0, -BONE.thigh, 0], len: BONE.shin, dir: -1 },
  footN: { parent: 'shinN', at: [0, -BONE.shin, 0], len: BONE.foot, dir: -1 },
  thighF: { parent: 'root', at: [0, 0, -SIDE * 0.52], len: BONE.thigh, dir: -1 },
  shinF: { parent: 'thighF', at: [0, -BONE.thigh, 0], len: BONE.shin, dir: -1 },
  footF: { parent: 'shinF', at: [0, -BONE.shin, 0], len: BONE.foot, dir: -1 },
}

/** Écorché palette: deep muscle, pale tendon, and the brand heat on top. */
const MUSCLE = 0x8f3f34
const TENDON = 0xc9bfae
const PRIMARY = 0xff5a2b
const SECONDARY = 0xb8442a

export interface FigureHandle {
  applyPose(p: DemoPose): void
  /** Swing the camera round the figure. Degrees off dead profile. */
  setTurn(deg: number): void
  setHighlight(primary: Set<MuscleRegion>, secondary: Set<MuscleRegion>): void
  setSize(w: number, h: number): void
  render(): void
  dispose(): void
}

export interface FigureOpts {
  /** Degrees off dead profile. A little is depth, a lot is illegible. */
  turn?: number
  /** Paint every muscle in the brand heat rather than écorché red. Used
   *  where the figure is a demo rather than a chart. */
  neutral?: boolean
}

export function createFigure(canvas: HTMLCanvasElement, opts: FigureOpts = {}): FigureHandle {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(30, 1, 1, 400)
  const dist = 128
  const aim = (deg: number) => {
    const t = deg * D2R
    camera.position.set(Math.sin(t) * dist, 44, Math.cos(t) * dist)
    camera.lookAt(0, 34, 0)
  }
  aim(opts.turn ?? 16)

  // Key, fill and rim. The rim is what separates a dark limb from the
  // dark card behind it, which at 110 pixels is most of the read.
  scene.add(new THREE.HemisphereLight(0xdfe8ef, 0x1a2730, 1.1))
  const key = new THREE.DirectionalLight(0xfff3e8, 2.2)
  key.position.set(-40, 70, 60)
  scene.add(key)
  const rim = new THREE.DirectionalLight(0x8fd0ff, 1.5)
  rim.position.set(50, 20, -60)
  scene.add(rim)

  const root = new THREE.Group()
  scene.add(root)

  const bones = {} as Record<BoneName, THREE.Group>
  for (const name of Object.keys(SKELETON) as BoneName[]) bones[name] = new THREE.Group()
  for (const name of Object.keys(SKELETON) as BoneName[]) {
    const spec = SKELETON[name]
    bones[name].position.set(spec.at[0], spec.at[1], spec.at[2])
    if (spec.parent) bones[spec.parent].add(bones[name])
    else root.add(bones[name])
  }

  // One sphere, reused. Every belly is that sphere scaled, which keeps
  // the whole body to a single geometry upload.
  const ball = new THREE.SphereGeometry(1, 14, 10)
  const mats = new Map<string, THREE.MeshStandardMaterial>()
  const material = (key: string, colour: number) => {
    let m = mats.get(key)
    if (!m) {
      m = new THREE.MeshStandardMaterial({ color: colour, roughness: 0.72, metalness: 0.02 })
      mats.set(key, m)
    }
    return m
  }
  const baseFor = (r: MuscleRegion | null) =>
    r === null ? material('tendon', TENDON) : material('muscle', opts.neutral ? 0xb06a52 : MUSCLE)

  const byRegion = new Map<MuscleRegion, THREE.Mesh[]>()
  for (const b of BELLIES) {
    const spec = SKELETON[b.bone]
    const mesh = new THREE.Mesh(ball, baseFor(b.r))
    mesh.position.set(b.fwd ?? 0, spec.dir * b.t * spec.len, b.side ?? 0)
    mesh.scale.set(b.rx, b.ry, b.rz)
    if (b.tilt) mesh.rotation.z = b.tilt * D2R
    bones[b.bone].add(mesh)
    if (b.r) {
      const list = byRegion.get(b.r) ?? []
      list.push(mesh)
      byRegion.set(b.r, list)
    }
  }

  const litPrimary = material('primary', PRIMARY)
  const litSecondary = material('secondary', SECONDARY)

  return {
    applyPose(p) {
      const a = anglesOf(p)
      const rot = localRotations(a)
      // The drawing works in a 100x100 box with the floor at y=90 and y
      // pointing down; this works in world units with the floor at 0 and
      // y pointing up. One conversion, in one place.
      root.position.set(a.hx - 50, 90 - a.hy, 0)
      for (const name of Object.keys(rot) as BoneName[]) bones[name].rotation.z = rot[name]
    },
    setHighlight(primary, secondary) {
      for (const [region, meshes] of byRegion) {
        const m = primary.has(region)
          ? litPrimary
          : secondary.has(region)
            ? litSecondary
            : baseFor(region)
        for (const mesh of meshes) mesh.material = m
      }
    },
    setTurn(deg) {
      aim(deg)
    },
    setSize(w, h) {
      renderer.setSize(w, h, false)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    },
    render() {
      renderer.render(scene, camera)
    },
    dispose() {
      ball.dispose()
      for (const m of mats.values()) m.dispose()
      renderer.dispose()
    },
  }
}

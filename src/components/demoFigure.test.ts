import { describe, expect, it } from 'vitest'
import { EXERCISE_DEMOS } from '../plan/demos'
import type { DemoPose } from '../plan/demoTypes'
import { PARTS, body, joints } from './demoFigure'
import { cursorAt, cycleOf, dwellOf, poseAt } from './demoMotion'

// ============================================================
// The figure survives every pose the app can put it in.
//
// The body is built from unit vectors between joints, and a unit
// vector wants a length to divide by. 148 movements times their
// keyframes is a lot of chances for two joints to land on the
// same point: a fully folded knee, an arm hanging dead straight,
// a pose authored with a typo. Divide by that zero and the path
// string carries NaN, and an SVG path with NaN in it does not
// warn, it just DISAPPEARS. A limb would vanish for one frame of
// one exercise and nobody would ever catch it by looking.
//
// So this walks the real data, through the real clock. The poses
// are read off demoMotion the way the component reads them,
// because the spline OVERSHOOTS: it passes through a keyframe
// carrying speed, so the pose a quarter of the way along a
// segment is not between the two keyframes the way a straight
// tween would be. Sampling the keyframes alone would miss every
// pose the athlete is actually drawn in.
// ============================================================

/** Every pose the animation paints, sampled the way it plays. */
function everyPose(): { id: string; at: string; p: DemoPose }[] {
  const out: { id: string; at: string; p: DemoPose }[] = []
  for (const [id, spec] of Object.entries(EXERCISE_DEMOS)) {
    const cycle = cycleOf(spec.frames)
    const steps = 40
    for (let i = 0; i < steps; i++) {
      const t = (cycle * i) / steps
      out.push({ id, at: `t=${Math.round(t)}ms`, p: poseAt(spec.frames, cursorAt(spec.frames, t)) })
    }
  }
  return out
}

describe('the demo figure', () => {
  const poses = everyPose()

  it('draws every pose in every movement, tweens included', () => {
    expect(poses.length).toBeGreaterThan(1000)
  })

  it('never emits a path the renderer would silently drop', () => {
    const broken: string[] = []
    for (const { id, at, p } of poses) {
      const b = body(joints(p))
      for (const name of PARTS) {
        const { d, g } = b[name]
        if (!d || d.length < 20) broken.push(`${id} ${at}: ${name} is empty`)
        else if (/NaN|Infinity|undefined/.test(d)) broken.push(`${id} ${at}: ${name} has a bad number`)
        if (g.some((n) => !Number.isFinite(n))) broken.push(`${id} ${at}: ${name} has no light on it`)
      }
    }
    expect(broken.slice(0, 10)).toEqual([])
  })

  it('keeps every part on the canvas the viewBox crops to', () => {
    // A coordinate in the hundreds means a limb flew off, which is the
    // other way a pose goes wrong: the path is valid and the figure is
    // somewhere nobody can see. The spline's overshoot is the reason
    // this is worth checking rather than assuming.
    const strays: string[] = []
    for (const { id, at, p } of poses) {
      const b = body(joints(p))
      for (const name of PARTS) {
        for (const m of b[name].d.matchAll(/-?\d+(\.\d+)?/g)) {
          const n = Number(m[0])
          if (n < -80 || n > 220) {
            strays.push(`${id} ${at}: ${name} reaches ${n}`)
            break
          }
        }
      }
    }
    expect(strays.slice(0, 10)).toEqual([])
  })
})

describe('the motion between keyframes', () => {
  // The whole point of the spline is that the figure does not stop at
  // every keyframe. If it did, this reads as a chain of separate
  // tweens again and you can count the frames by watching.
  const speedAt = (id: string, k: number, key: 'thighF' | 'hy') => {
    const frames = EXERCISE_DEMOS[id].frames
    let acc = 0
    for (let i = 0; i < k; i++) acc += frames[i].d + dwellOf(frames[i])
    acc += frames[k].d
    const before = poseAt(frames, cursorAt(frames, acc - 60))
    const at = poseAt(frames, cursorAt(frames, Math.max(0, acc - 1)))
    const after = poseAt(frames, cursorAt(frames, acc + dwellOf(frames[k]) + 60))
    return { in: Math.abs(at[key] - before[key]), out: Math.abs(after[key] - at[key]) }
  }

  it('carries speed through a keyframe the athlete is passing through', () => {
    // goblet-squat frame 1 is the bottom of the rep with a 220ms authored
    // pause, which is reading time rather than a paused squat.
    const frames = EXERCISE_DEMOS['goblet-squat'].frames
    expect(frames[1].hold).toBeGreaterThan(0)
    expect(frames[1].hold).toBeLessThan(600)
    const s = speedAt('goblet-squat', 1, 'thighF')
    expect(s.in).toBeGreaterThan(0.3)
    expect(s.out).toBeGreaterThan(0.3)
  })

  it('still stops dead where the athlete is holding a position', () => {
    const frames = EXERCISE_DEMOS['dead-hang'].frames
    const held = frames.findIndex((f) => f.hold >= 600)
    expect(held).toBeGreaterThan(-1)
    const s = speedAt('dead-hang', held, 'hy')
    expect(s.in).toBeLessThan(0.25)
  })

  it('spends far less of the loop standing still than the data asks for', () => {
    // 29% of every loop used to be dead air. The authored numbers are
    // untouched; this is the playback policy, and it is the difference
    // between a rep and a slideshow.
    let travel = 0
    let dwell = 0
    const seen = new Set<object>()
    for (const spec of Object.values(EXERCISE_DEMOS)) {
      if (seen.has(spec)) continue
      seen.add(spec)
      for (const f of spec.frames) {
        travel += f.d
        dwell += dwellOf(f)
      }
    }
    expect(dwell / (dwell + travel)).toBeLessThan(0.2)
  })
})

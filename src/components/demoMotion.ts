import type { DemoFrame, DemoPose } from '../plan/demoTypes'

// ============================================================
// How the figure gets from one keyframe to the next.
//
// The old playback tweened each segment on its own with an
// ease-in-out, which means the velocity hit ZERO at both ends of
// every segment. A squat therefore stopped dead at the top, at
// the bottom, and at every pose in between, and you could count
// the keyframes by watching. That is what "you can see the
// frames" is: not a low frame rate, a full stop four times a rep.
//
// So the poses are now a SPLINE through the keyframes rather
// than a chain of separate tweens. Each keyframe gets a tangent
// from its neighbours, and the curve passes through it without
// slowing down, exactly the way a rep does.
//
// A real pause is still a real pause. Two things zero a tangent
// and bring the figure to an honest stop:
//   · frame.hold  the athlete is holding that position
//   · frame.ease  'out' stops into a keyframe, 'in' starts from
//                 one, which is how the data spells an accent
//                 like the drive out of the bottom of a lift
// Everything else flows.
// ============================================================

const KEYS = [
  'hx', 'hy', 'torso', 'head',
  'thighF', 'shinF', 'footF', 'thighB', 'shinB', 'footB',
  'armF', 'foreF', 'armB', 'foreB',
] as const

/** Where the loop is: which segment, and how far into it. */
export interface Cursor {
  /** Index of the frame being travelled INTO. */
  idx: number
  /** 0 at the previous keyframe, 1 at this one, then held. */
  prog: number
}

/**
 * How long the figure actually rests on a keyframe.
 *
 * The pose data pauses at 197 of its 282 keyframes, median 300ms,
 * which is 29% of every loop spent standing perfectly still. Almost
 * none of that is a held position: it is reading time for the caption
 * that arrives with the frame. Watching it, the effect is exactly the
 * complaint, a movement that stops four times a rep.
 *
 * A real rep does turn around at each end, and the spline already
 * gives that for free by arriving with zero speed. What it does not
 * need is a third of a second of nothing after it. So an ordinary
 * pause becomes a beat, and a LONG one is left alone, because at 600ms
 * and up the data is describing an actual isometric: the top of a
 * plank, the bottom of a paused squat, a dead hang.
 *
 * The frames keep their authored numbers. This is playback.
 */
const BEAT = 110
const REAL_HOLD = 600
export function dwellOf(f: DemoFrame): number {
  return f.hold >= REAL_HOLD ? f.hold : Math.min(f.hold, BEAT)
}

/** Total length of one loop, travel plus what is left of the holds. */
export function cycleOf(frames: DemoFrame[]): number {
  let total = 0
  for (const f of frames) total += f.d + dwellOf(f)
  return total
}

/** Read a time on the loop's clock as a segment and a position in it. */
export function cursorAt(frames: DemoFrame[], t: number): Cursor {
  let acc = 0
  for (let i = 0; i < frames.length; i++) {
    const span = frames[i].d + dwellOf(frames[i])
    if (t < acc + span) {
      const local = t - acc
      return { idx: i, prog: local >= frames[i].d ? 1 : local / Math.max(1, frames[i].d) }
    }
    acc += span
  }
  return { idx: frames.length - 1, prog: 1 }
}

/**
 * The velocity at keyframe k, in pose units per millisecond.
 *
 * A centred difference over the two segments that meet there, which
 * is what makes the speed continuous across segments of different
 * lengths: a slow descent into a fast drive does not jerk.
 */
function tangent(frames: DemoFrame[], k: number, key: (typeof KEYS)[number]): number {
  const n = frames.length
  const prev = frames[(k - 1 + n) % n].p[key]
  const next = frames[(k + 1) % n].p[key]
  const span = frames[k].d + frames[(k + 1) % n].d
  return (next - prev) / Math.max(1, span)
}

/**
 * Does the figure genuinely stop at this end of this segment?
 *
 * Only a real isometric or an authored accent. A short authored pause
 * does NOT zero the tangent, because the turnaround at the bottom of a
 * rep already comes out near zero on its own: the centred difference
 * there compares two poses on the same side of the movement. Letting
 * the spline find that is what makes a squat reverse rather than halt.
 */
function stops(frames: DemoFrame[], idx: number, end: 'start' | 'end'): boolean {
  const n = frames.length
  const f = frames[idx]
  if (end === 'end') return f.hold >= REAL_HOLD || f.ease === 'out'
  return frames[(idx - 1 + n) % n].hold >= REAL_HOLD || f.ease === 'in'
}

/**
 * The pose at a point on the loop.
 *
 * Cubic Hermite between the two keyframes, with the tangents above.
 * Zero tangents at both ends collapse it to a smoothstep, which is
 * the old ease-in-out, so a held pose still eases the way it did.
 */
export function poseAt(frames: DemoFrame[], cur: Cursor): DemoPose {
  const n = frames.length
  const i = cur.idx
  const a = frames[(i - 1 + n) % n].p
  const b = frames[i].p
  const s = cur.prog
  if (s >= 1) return b
  const dt = frames[i].d
  const s2 = s * s
  const s3 = s2 * s
  const h00 = 2 * s3 - 3 * s2 + 1
  const h10 = s3 - 2 * s2 + s
  const h01 = -2 * s3 + 3 * s2
  const h11 = s3 - s2
  const flatIn = stops(frames, i, 'start')
  const flatOut = stops(frames, i, 'end')
  const out = {} as Record<(typeof KEYS)[number], number>
  for (const key of KEYS) {
    const ma = flatIn ? 0 : tangent(frames, (i - 1 + n) % n, key)
    const mb = flatOut ? 0 : tangent(frames, i, key)
    out[key] = h00 * a[key] + h10 * dt * ma + h01 * b[key] + h11 * dt * mb
  }
  return out as DemoPose
}

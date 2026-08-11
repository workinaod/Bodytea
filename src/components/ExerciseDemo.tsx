import { useEffect, useMemo, useRef, useState } from 'react'
import type { DemoPhotoSeq } from '../plan/demoPhotos'

// ============================================================
// Animated exercise demo: a stick figure performing the actual
// movement, drawn with forward kinematics from keyframe poses
// and tweened on requestAnimationFrame. Everything is inline
// SVG, works offline, no external assets.
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

// ---- Skeleton proportions (viewBox units) ----
const TH = 16 // thigh
const SH = 15 // shin
const FT = 6 // foot
const TOR = 19 // hip → shoulder
const ARM = 11 // shoulder → elbow
const FORE = 10 // elbow → wrist
const NECK = 6.8 // shoulder → head center
const HEAD_R = 4.6

const D2R = Math.PI / 180
const down = (deg: number) => ({ x: Math.sin(deg * D2R), y: Math.cos(deg * D2R) })
const up = (deg: number) => ({ x: Math.sin(deg * D2R), y: -Math.cos(deg * D2R) })

interface Pt {
  x: number
  y: number
}

function joints(p: DemoPose) {
  const hip: Pt = { x: p.hx, y: p.hy }
  const at = (o: Pt, l: number, d: { x: number; y: number }): Pt => ({ x: o.x + l * d.x, y: o.y + l * d.y })

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

  // anchor points for held equipment
  const front = { x: Math.cos(p.torso * D2R), y: Math.sin(p.torso * D2R) }
  const chest: Pt = {
    x: hip.x + 0.62 * TOR * Math.sin(p.torso * D2R) + 3.2 * front.x,
    y: hip.y - 0.62 * TOR * Math.cos(p.torso * D2R) + 3.2 * front.y,
  }
  const backNeck: Pt = { x: shoulder.x - 2.8 * front.x, y: shoulder.y - 2.8 * front.y }
  const hipsAnchor: Pt = { x: hip.x + 2.5 * front.x, y: hip.y + 2.5 * front.y }
  const wristMid: Pt = { x: (wristF.x + wristB.x) / 2, y: (wristF.y + wristB.y) / 2 }

  return { hip, kneeF, ankleF, toeF, kneeB, ankleB, toeB, shoulder, headC, elbowF, wristF, elbowB, wristB, chest, backNeck, hipsAnchor, wristMid }
}

function lerpPose(a: DemoPose, b: DemoPose, t: number): DemoPose {
  const out = {} as Record<keyof DemoPose, number>
  for (const k of Object.keys(a) as (keyof DemoPose)[]) out[k] = a[k] + (b[k] - a[k]) * t
  return out as DemoPose
}

function ease(t: number, kind: DemoEase): number {
  switch (kind) {
    case 'out':
      return 1 - Math.pow(1 - t, 3)
    case 'in':
      return t * t * t
    case 'linear':
      return t
    default:
      return 0.5 - 0.5 * Math.cos(Math.PI * t)
  }
}

const poly = (pts: Pt[]) => pts.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ')

/**
 * Animated movement demo. When a real photo sequence exists (see
 * plan/demoPhotos.ts) it plays the ordered stage photos with each caption
 * bound to the frame it describes; otherwise it falls back to the drawn
 * figure animation.
 */
export function ExerciseDemo({
  spec,
  photos = null,
  compact = false,
  className = '',
}: {
  spec: DemoSpec
  photos?: DemoPhotoSeq | null
  compact?: boolean
  className?: string
}) {
  const [photoBroken, setPhotoBroken] = useState(false)
  if (photos && photos.frames.length >= 2 && !photoBroken) {
    return <PhotoDemo photos={photos} compact={compact} className={className} onBroken={() => setPhotoBroken(true)} />
  }
  return <FigureDemo spec={spec} compact={compact} className={className} />
}

/** Real-photo demo: ordered stage frames, caption locked to the visible frame. */
function PhotoDemo({
  photos,
  compact,
  className,
  onBroken,
}: {
  photos: DemoPhotoSeq
  compact: boolean
  className: string
  onBroken: () => void
}) {
  const frames = photos.frames
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    setIdx(0)
    const reduced =
      typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const base = reduced ? 2400 : 1600
    let i = 0
    let timer: ReturnType<typeof setTimeout>
    const next = () => {
      // dwell longer on the final stage of a 3+ frame sequence before looping
      const dwell = frames.length > 2 && i === frames.length - 1 ? base * 1.6 : base
      timer = setTimeout(() => {
        i = (i + 1) % frames.length
        setIdx(i)
        next()
      }, dwell)
    }
    next()
    return () => clearTimeout(timer)
  }, [photos, frames.length])

  const base = `${import.meta.env.BASE_URL}demo/`

  return (
    <div className={className}>
      <div className="mx-auto w-full" style={{ maxWidth: compact ? undefined : 330 }}>
        <div className="relative aspect-[3/2] w-full overflow-hidden rounded-xl bg-surface-2">
          {frames.map((f, i) => (
            <img
              key={f.file + i}
              src={base + f.file}
              alt={f.caption}
              draggable={false}
              onError={onBroken}
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
                idx === i ? 'opacity-100' : 'opacity-0'
              }`}
            />
          ))}
        </div>
      </div>
      <div className={compact ? 'mt-1' : 'mt-1.5'}>
        <div className="flex items-center justify-center gap-1">
          {frames.map((_, i) => (
            <span key={i} className={`h-1 rounded-full transition-all duration-300 ${i === idx ? 'w-4 bg-accent' : 'w-1 bg-surface-2'}`} />
          ))}
        </div>
        <div className={`mx-auto mt-1 max-w-[280px] text-center font-bold leading-snug text-accent-soft ${compact ? 'text-[10.5px]' : 'text-[12px]'}`}>
          {frames[idx]?.caption}
        </div>
      </div>
    </div>
  )
}

/** Drawn stick-figure demo (fallback for movements with no photo pair). */
function FigureDemo({ spec, compact = false, className = '' }: { spec: DemoSpec; compact?: boolean; className?: string }) {
  const legFRef = useRef<SVGPolylineElement>(null)
  const legBRef = useRef<SVGPolylineElement>(null)
  const armFRef = useRef<SVGPolylineElement>(null)
  const armBRef = useRef<SVGPolylineElement>(null)
  const torsoRef = useRef<SVGLineElement>(null)
  const headRef = useRef<SVGCircleElement>(null)
  const heldARef = useRef<SVGGElement>(null)
  const heldBRef = useRef<SVGGElement>(null)
  const heldPathRef = useRef<SVGPathElement>(null)
  const [segIdx, setSegIdx] = useState(0)
  const segIdxRef = useRef(0)
  const [label, setLabel] = useState<string | null>(spec.frames[0]?.label ?? null)

  useEffect(() => {
    const frames = spec.frames
    if (frames.length < 2) return
    const reduced =
      typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const durs = frames.map((f) => (reduced ? Math.max(f.d + f.hold, 1200) : f.d + f.hold))
    const cycle = durs.reduce((s, d) => s + d, 0)

    // Start at the beginning of segment 1 so the loop opens with real motion.
    let t = durs[0]
    let last = performance.now()
    let raf = 0
    let lastLabel: string | null = null

    const apply = (p: DemoPose) => {
      const j = joints(p)
      legFRef.current?.setAttribute('points', poly([j.hip, j.kneeF, j.ankleF, j.toeF]))
      legBRef.current?.setAttribute('points', poly([j.hip, j.kneeB, j.ankleB, j.toeB]))
      armFRef.current?.setAttribute('points', poly([j.shoulder, j.elbowF, j.wristF]))
      armBRef.current?.setAttribute('points', poly([j.shoulder, j.elbowB, j.wristB]))
      if (torsoRef.current) {
        torsoRef.current.setAttribute('x1', j.hip.x.toFixed(2))
        torsoRef.current.setAttribute('y1', j.hip.y.toFixed(2))
        torsoRef.current.setAttribute('x2', j.shoulder.x.toFixed(2))
        torsoRef.current.setAttribute('y2', j.shoulder.y.toFixed(2))
      }
      if (headRef.current) {
        headRef.current.setAttribute('cx', j.headC.x.toFixed(2))
        headRef.current.setAttribute('cy', j.headC.y.toFixed(2))
      }
      const held = spec.held
      const place = (el: SVGGElement | null, pt: Pt) => el?.setAttribute('transform', `translate(${pt.x.toFixed(2)} ${pt.y.toFixed(2)})`)
      if (held.kind === 'db') {
        const a = held.at
        if (a === 'wrists') {
          place(heldARef.current, j.wristF)
          place(heldBRef.current, j.wristB)
        } else {
          place(heldARef.current, a === 'wristF' ? j.wristF : a === 'wristB' ? j.wristB : a === 'kneeF' ? { x: j.kneeF.x, y: j.kneeF.y - 2.2 } : j.wristMid)
        }
      } else if (held.kind === 'barbell') {
        place(heldARef.current, held.at === 'backNeck' ? j.backNeck : held.at === 'hips' ? j.hipsAnchor : j.wristMid)
      } else if (held.kind === 'plate') {
        place(heldARef.current, j.chest)
      } else if (held.kind === 'towel') {
        heldPathRef.current?.setAttribute(
          'd',
          `M ${j.wristF.x.toFixed(2)} ${held.barY} L ${j.wristF.x.toFixed(2)} ${j.wristF.y.toFixed(2)} M ${j.wristB.x.toFixed(2)} ${held.barY} L ${j.wristB.x.toFixed(2)} ${j.wristB.y.toFixed(2)}`,
        )
      }
    }

    apply(frames[0].p) // paint immediately, before the first rAF tick

    const tick = (now: number) => {
      const dt = Math.min(100, now - last)
      last = now
      t = (t + dt) % cycle
      // locate the active segment
      let acc = 0
      let idx = 0
      for (let i = 0; i < durs.length; i++) {
        if (t < acc + durs[i]) {
          idx = i
          break
        }
        acc += durs[i]
      }
      const f = frames[idx]
      const from = frames[(idx - 1 + frames.length) % frames.length].p
      const local = t - acc
      const travel = reduced ? 0 : Math.min(f.d, durs[idx])
      const prog = reduced ? 1 : local >= travel ? 1 : ease(local / Math.max(1, travel), f.ease)
      apply(prog >= 1 ? f.p : lerpPose(from, f.p, prog))
      if (idx !== segIdxRef.current) {
        segIdxRef.current = idx
        setSegIdx(idx)
        const l = f.label ?? lastLabel
        if (l !== lastLabel) {
          lastLabel = l
          setLabel(l)
        } else if (f.label) {
          setLabel(f.label)
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [spec])

  // Crop the viewBox to what the animation actually uses, so ground-based
  // movements fill the card instead of floating under empty sky.
  const view = useMemo(() => {
    let minY = Infinity
    let maxY = -Infinity
    for (const f of spec.frames) {
      const j = joints(f.p)
      for (const pt of [j.hip, j.kneeF, j.ankleF, j.toeF, j.kneeB, j.ankleB, j.toeB, j.shoulder, j.elbowF, j.wristF, j.elbowB, j.wristB]) {
        if (pt.y < minY) minY = pt.y
        if (pt.y > maxY) maxY = pt.y
      }
      minY = Math.min(minY, j.headC.y - HEAD_R)
      maxY = Math.max(maxY, j.headC.y + HEAD_R)
    }
    for (const s of spec.scene) {
      if (s.kind === 'seg') {
        minY = Math.min(minY, s.y1, s.y2)
        maxY = Math.max(maxY, s.y1, s.y2)
      } else {
        minY = Math.min(minY, s.y)
        maxY = Math.max(maxY, s.y + s.h)
      }
    }
    if (spec.ground !== false) maxY = Math.max(maxY, 90)
    const y = Math.max(0, minY - 6.5)
    const h = Math.min(100, maxY + 3) - y
    return { y, h }
  }, [spec])

  const tone = (t?: 'faint' | 'accent') => (t === 'accent' ? 'stroke-accent/70' : 'stroke-ink-faint/50')
  const held = spec.held

  return (
    <div className={className}>
      <div className="relative mx-auto w-full text-ink" style={{ maxWidth: compact ? undefined : 230 }}>
        <svg viewBox={`0 ${view.y.toFixed(1)} 100 ${view.h.toFixed(1)}`} className="w-full" role="img" aria-label="Animated movement demo">
          {spec.ground !== false && <line x1={6} y1={90} x2={94} y2={90} className="stroke-ink-faint/40" strokeWidth={1.4} strokeLinecap="round" />}
          {spec.scene.map((s, i) =>
            s.kind === 'seg' ? (
              <line key={i} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} strokeWidth={s.w} className={tone(s.tone)} strokeLinecap="round" />
            ) : (
              <rect key={i} x={s.x} y={s.y} width={s.w} height={s.h} rx={1.2} fill="none" strokeWidth={1.6} className={tone(s.tone)} />
            ),
          )}

          {/* far-side limbs */}
          <g stroke="currentColor" strokeOpacity={0.35} strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" fill="none">
            <polyline ref={legBRef} />
            <polyline ref={armBRef} />
          </g>
          {/* torso + head */}
          <line ref={torsoRef} stroke="currentColor" strokeWidth={3.6} strokeLinecap="round" />
          <circle ref={headRef} r={HEAD_R} fill="currentColor" />
          {/* near-side limbs */}
          <g stroke="currentColor" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" fill="none">
            <polyline ref={legFRef} />
            <polyline ref={armFRef} />
          </g>

          {/* held equipment */}
          {held.kind === 'db' && (
            <>
              <g ref={heldARef} className="text-accent">
                <circle r={held.at === 'wrists' ? 2.4 : 2.9} fill="currentColor" />
              </g>
              {held.at === 'wrists' && (
                <g ref={heldBRef} className="text-accent" opacity={0.5}>
                  <circle r={2.4} fill="currentColor" />
                </g>
              )}
            </>
          )}
          {held.kind === 'barbell' && (
            <g ref={heldARef} className="text-accent">
              <line x1={-11} y1={0} x2={11} y2={0} stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
              <circle r={4.1} fill="none" stroke="currentColor" strokeWidth={2.1} />
            </g>
          )}
          {held.kind === 'plate' && (
            <g ref={heldARef} className="text-accent">
              <circle r={3.1} fill="none" stroke="currentColor" strokeWidth={2} />
            </g>
          )}
          {held.kind === 'towel' && <path ref={heldPathRef} className="stroke-accent" strokeWidth={2.2} fill="none" strokeLinecap="round" />}
        </svg>
      </div>

      {/* phase indicator */}
      <div className={compact ? 'mt-0.5' : 'mt-1'}>
        <div className="flex items-center justify-center gap-1">
          {spec.frames.map((_, i) => (
            <span key={i} className={`h-1 rounded-full transition-all duration-300 ${i === segIdx ? 'w-4 bg-accent' : 'w-1 bg-surface-2'}`} />
          ))}
        </div>
        {label && (
          <div className={`mx-auto mt-1 max-w-[240px] text-center font-bold leading-snug text-accent-soft ${compact ? 'text-[10.5px]' : 'text-[12px]'}`}>
            {label}
          </div>
        )}
      </div>
    </div>
  )
}

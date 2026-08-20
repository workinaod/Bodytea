import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type { DemoPose, DemoSpec } from '../plan/demoTypes'
import { YouTubeEmbed } from './YouTubeEmbed'
import { HEAD_R, PARTS, body, joints } from './demoFigure'
import type { PartKey, Pt } from './demoFigure'
import { cursorAt, cycleOf, poseAt } from './demoMotion'
export type { DemoEase, DemoFrame, DemoHeld, DemoPose, DemoSpec, SceneItem } from '../plan/demoTypes'

// ============================================================
// The movement demo. A verified clip where one exists, and
// otherwise a figure performing the movement, tweened from
// keyframe poses on requestAnimationFrame: inline SVG, works
// offline, no external assets.
//
// The poses are plan/demos.ts and the body is demoFigure.ts. This
// file owns only the clock: which frame, how far between two of
// them, and painting the result. That split is why the drawing
// could be replaced without touching 148 hand-tuned movements.
//
// Angle conventions (all degrees, world frame, figure faces +x):
//   legs/arms  0 = straight down · +90 = horizontal forward ·
//              180 = straight up · negative = backward
//   torso      0 = upright · + = leaning forward
//   feet       0 = toe flat forward · + = toe pressing down
// ============================================================

/**
 * The movement, shown the best way there is for this exercise.
 *
 * A verified clip of a real person beats anything drawn, so it takes
 * the slot wherever one exists, which is 141 of the 194 exercises in
 * the library. The rest get the drawn figure.
 *
 * What used to sit here was a sequence of two to four stage photos
 * cross-fading on a timer. Stills cannot show a movement: they show
 * its endpoints and leave the athlete to imagine the part that
 * matters. 53 of the 55 exercises that had them also have a clip, so
 * the stills were the worst option on almost every screen that
 * offered them.
 */
export function ExerciseDemo({
  spec,
  videoId,
  query,
  compact = false,
  className = '',
}: {
  spec: DemoSpec
  /** A verified clip id, when the exercise has one. */
  videoId?: string
  /** The fallback search, so an exercise without a clip still has a door. */
  query?: string
  compact?: boolean
  className?: string
}) {
  // A clip needs the network. In a basement gym on no signal the
  // thumbnail is the first thing to fail, and it fails BEFORE anyone
  // taps, so it is a reliable signal that the iframe would fail too.
  // The drawn figure is the thing that always works, so that is what
  // a dead clip falls back to rather than an empty box.
  const [clipDead, setClipDead] = useState(false)
  if (videoId && !clipDead) {
    return (
      <div className={className}>
        <YouTubeEmbed videoId={videoId} query={query ?? ''} onPosterError={() => setClipDead(true)} />
      </div>
    )
  }
  return <FigureDemo spec={spec} compact={compact} className={className} />
}

// Three ramps, one light. The body reads as form rather than a
// cut-out, the near arm sits one step back so it separates from the
// chest it hangs over without a line drawn there, and the far side of
// the body is darker again so a lunge reads as one leg in front of
// the other. The dark line underneath is the silhouette.
const RAMPS = {
  body: ['#FDFEFE', '#DCE6EC', '#9DACB7', '#4E5B66'],
  near: ['#EDF2F5', '#C3D0D9', '#8493A0', '#414D57'],
  far: ['#7E8B96', '#5C6873', '#414B54', '#2B333A'],
} as const
/** Which ramp each part is painted with. */
const RAMP_OF: Record<PartKey, keyof typeof RAMPS> = {
  legB: 'far',
  armB: 'far',
  neck: 'body',
  trunk: 'body',
  head: 'body',
  legF: 'body',
  armF: 'near',
}
const LINE = '#0E161C'
/** The far hand's weight, one step back like the far limbs. */
const DEEP_ACCENT = '#8f3a1e'

/** Drawn figure demo (fallback for movements with no photo pair). */
function FigureDemo({ spec, compact = false, className = '' }: { spec: DemoSpec; compact?: boolean; className?: string }) {
  // One path and one gradient per part, plus the silhouette underneath.
  // Poses are written straight onto the elements: at 60fps a React
  // render per frame would be the most expensive thing on the rest
  // screen. The gradient axes move with the parts, which is what keeps
  // one light source pointing the same way in every pose.
  const outRef = useRef<SVGPathElement>(null)
  const partRefs = useRef<Record<string, SVGPathElement | null>>({})
  const gradRefs = useRef<Record<string, SVGLinearGradientElement | null>>({})
  const uid = useId().replace(/:/g, '')
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
    const cycle = reduced ? durs.reduce((sum, d) => sum + d, 0) : cycleOf(frames)

    // Start at the beginning of segment 1 so the loop opens with real motion.
    let t = frames[0].d
    let last = performance.now()
    let raf = 0
    let lastLabel: string | null = null

    const apply = (p: DemoPose) => {
      const j = joints(p)
      const b = body(j)
      let all = ''
      for (const k of PARTS) {
        const part = b[k]
        partRefs.current[k]?.setAttribute('d', part.d)
        const g = gradRefs.current[k]
        if (g) {
          g.setAttribute('x1', part.g[0].toFixed(2))
          g.setAttribute('y1', part.g[1].toFixed(2))
          g.setAttribute('x2', part.g[2].toFixed(2))
          g.setAttribute('y2', part.g[3].toFixed(2))
        }
        all += part.d
      }
      // The silhouette is every part at once, stroked. The fills on top
      // cover the half of that stroke which falls inside the body, so
      // what survives is one outline around the whole figure and no
      // seams between the parts.
      outRef.current?.setAttribute('d', all)
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
      const cur = cursorAt(frames, t)
      // Reduced motion gets the keyframes and nothing in between: the
      // information is the poses, and the travel is the part that moves.
      apply(reduced ? frames[cur.idx].p : poseAt(frames, cur))
      const idx = cur.idx
      if (idx !== segIdxRef.current) {
        segIdxRef.current = idx
        setSegIdx(idx)
        const f = frames[idx]
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
          {spec.ground !== false && (
            <>
              <defs>
                <linearGradient id="demo-ground" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0" stopColor="currentColor" stopOpacity="0" />
                  <stop offset="0.5" stopColor="currentColor" stopOpacity="0.35" />
                  <stop offset="1" stopColor="currentColor" stopOpacity="0" />
                </linearGradient>
              </defs>
              <line x1={4} y1={90} x2={96} y2={90} stroke="url(#demo-ground)" strokeWidth={2} strokeLinecap="round" />
            </>
          )}
          {spec.scene.map((s, i) =>
            s.kind === 'seg' ? (
              <line key={i} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} strokeWidth={s.w} className={tone(s.tone)} strokeLinecap="round" />
            ) : (
              <rect key={i} x={s.x} y={s.y} width={s.w} height={s.h} rx={1.2} fill="none" strokeWidth={1.6} className={tone(s.tone)} />
            ),
          )}

          {/* One gradient per part. The axes are written per frame in
              `apply`, so the light keeps pointing the same way however
              the limb it lights is turned. */}
          <defs>
            {PARTS.map((k) => (
              <linearGradient
                key={k}
                id={`${uid}-${k}`}
                gradientUnits="userSpaceOnUse"
                ref={(el) => {
                  gradRefs.current[k] = el
                }}
              >
                {RAMPS[RAMP_OF[k]].map((c, i, all) => (
                  <stop key={c} offset={i / (all.length - 1)} stopColor={c} />
                ))}
              </linearGradient>
            ))}
          </defs>
          {/* The silhouette: every part, stroked, under everything. */}
          <path ref={outRef} fill={LINE} stroke={LINE} strokeWidth={1.8} strokeLinejoin="round" />
          {PARTS.map((k) => (
            <path
              key={k}
              fill={`url(#${uid}-${k})`}
              ref={(el) => {
                partRefs.current[k] = el
              }}
            />
          ))}
          {/* Held equipment, on top of the hands that hold it. It keeps
              the same dark rim the body has, so it reads as an object in
              the same world rather than a highlight painted on one. */}
          {held.kind === 'db' && (
            <>
              <g ref={heldARef}>
                <circle r={held.at === 'wrists' ? 2.4 : 2.9} fill="var(--color-accent)" stroke={LINE} strokeWidth={0.9} />
              </g>
              {held.at === 'wrists' && (
                <g ref={heldBRef}>
                  <circle r={2.4} fill={DEEP_ACCENT} stroke={LINE} strokeWidth={0.9} />
                </g>
              )}
            </>
          )}
          {held.kind === 'barbell' && (
            <g ref={heldARef}>
              <line x1={-11} y1={0} x2={11} y2={0} stroke={LINE} strokeWidth={2.6} strokeLinecap="round" />
              <line x1={-11} y1={0} x2={11} y2={0} stroke="var(--color-accent)" strokeWidth={1.4} strokeLinecap="round" />
              <circle r={4.1} fill="var(--color-accent)" stroke={LINE} strokeWidth={0.9} />
            </g>
          )}
          {held.kind === 'plate' && (
            <g ref={heldARef}>
              <circle r={3.1} fill="var(--color-accent)" stroke={LINE} strokeWidth={0.9} />
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

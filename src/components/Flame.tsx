import { flameFor } from '../plan/achievements'
import { prefersReducedMotion } from '../platform/motion'

// ============================================================
// The streak, burning.
//
// ELEVEN rungs, and the fire is a DIFFERENT FIRE at each one.
//
// Two things were wrong before. The styling was keyed to the
// seven coarse levels in the plan data, so day 14 rendered
// pixel-identical to day 7 and day 500 to day 365: three of the
// eleven progressions changed nothing. And the fix of scaling
// one drawing up was not growth either, because a raging fire is
// not a big small fire. It is MORE FIRE: more tongues, a wider
// burning bed, and turbulence between them that a single shape
// cannot have no matter how large you draw it.
//
// So the geometry is generated. A rung declares how many tongues
// it burns, how tall, how far apart and how wide its bed is, and
// the paths come out of that. Day one is a single low wisp over
// a coal. A thousand days is eight tongues over a bed the full
// width of the frame, each one licking on its own clock, with a
// violet core no other fire in the app has.
//
// The independent clocks are the point. One tongue on a smooth
// curve reads as a logo breathing; eight tongues at unrelated
// speeds read as combustion, because nothing in the frame is
// ever doing the same thing twice.
//
// Day one is deliberately unimpressive: small, dim, slow, one
// tongue, no embers. A day-one streak should look like something
// you could lose by tomorrow. It is.
//
// The expensive parts are opt-in. Embers and the brightness
// gutter belong to display instances; a row chip caps its
// tongues at three, because at 16px the ninth one is smaller
// than a pixel and still costs a keyframe.
//
// Every layer is generated SVG and CSS. No image, no library,
// and it keeps working offline and inside a native wrapper.
// ============================================================

interface RungStyle {
  core: string
  mid: string
  outer: string
  /** Seconds. The body's period; every other layer derives from it. */
  speed: number
  glow: string
  /** Multiplier on the caller's size. Monotonic, and it is the point. */
  scale: number
  /** Ambient embers coming off the top. */
  embers: number
  /** How many flames stand in this fire. THE shape of growth. */
  flames: number
  /** How far the outer flames sit from the main one. */
  spread: number
  /** Vertical stretch of the whole cluster. A wisp is a little squatter. */
  height: number
}

/**
 * Keyed by the rung's day threshold, which is the stable identity of a
 * rung. `level` in the plan data stays what it is: a coarse grouping for
 * anything that needs one, not a styling key.
 */
export const RUNG: Record<number, RungStyle> = {
  1: { outer: '#7a4e2a', mid: '#b87a3e', core: '#edcb9c', speed: 3.4, glow: 'none', scale: 0.6, embers: 0, flames: 1, spread: 0, height: 0.8 },
  3: { outer: '#9a5f2e', mid: '#d8913f', core: '#f5da9e', speed: 2.9, glow: '0 0 4px rgba(216,145,63,0.25)', scale: 0.74, embers: 1, flames: 2, spread: 0.16, height: 0.83 },
  7: { outer: '#e0641c', mid: '#ff9633', core: '#ffd79b', speed: 2.5, glow: '0 0 7px rgba(255,120,40,0.32)', scale: 0.88, embers: 2, flames: 3, spread: 0.24, height: 0.86 },
  14: { outer: '#ff6a1f', mid: '#ffa02f', core: '#ffdf9f', speed: 2.2, glow: '0 0 10px rgba(255,125,40,0.4)', scale: 1, embers: 3, flames: 4, spread: 0.32, height: 0.88 },
  30: { outer: '#ff5a15', mid: '#ff8a20', core: '#ffe08a', speed: 1.9, glow: '0 0 13px rgba(255,110,30,0.5)', scale: 1.14, embers: 4, flames: 5, spread: 0.4, height: 0.9 },
  60: { outer: '#ff4d10', mid: '#ff820e', core: '#ffe87e', speed: 1.65, glow: '0 0 16px rgba(255,95,25,0.56)', scale: 1.28, embers: 5, flames: 6, spread: 0.48, height: 0.92 },
  90: { outer: '#ff3d0a', mid: '#ff7a10', core: '#fff0a0', speed: 1.4, glow: '0 0 19px rgba(255,80,20,0.62)', scale: 1.42, embers: 6, flames: 7, spread: 0.56, height: 0.94 },
  180: { outer: '#ff2f05', mid: '#ffd23c', core: '#ffffff', speed: 1.15, glow: '0 0 24px rgba(255,90,20,0.72)', scale: 1.58, embers: 7, flames: 8, spread: 0.64, height: 0.96 },
  // Past a year the core stops being orange. A fire that hot is blue at
  // the middle, and it is the first rung that looks like a different
  // substance rather than more of the same one.
  365: { outer: '#ff2a00', mid: '#9fd8ff', core: '#ffffff', speed: 0.95, glow: '0 0 28px rgba(120,190,255,0.6)', scale: 1.74, embers: 9, flames: 9, spread: 0.72, height: 0.98 },
  500: { outer: '#ff1f00', mid: '#7fcaff', core: '#ffffff', speed: 0.85, glow: '0 0 34px rgba(120,190,255,0.7)', scale: 1.9, embers: 11, flames: 10, spread: 0.8, height: 0.99 },
  1000: { outer: '#ff1400', mid: '#cbb2ff', core: '#ffffff', speed: 0.75, glow: '0 0 42px rgba(180,150,255,0.75)', scale: 2.1, embers: 13, flames: 11, spread: 0.88, height: 1 },
}

// ============================================================
// THE DRAWING.
//
// These three paths are the flame the app shipped with, kept
// exactly as they were. Four generated replacements were tried
// and every one of them was worse: triangles rooted in a floor,
// a picket of candles, a fan of needles. The lesson is written
// down rather than re-learned: a shape that reads as fire is
// worth more than a system that computes one, and growth does
// not require redrawing it.
//
// A bigger fire is MORE OF THIS FLAME. The rungs add copies,
// standing behind and beside the main one, smaller, offset, and
// each on its own clock, which is exactly how a real fire is
// built out of individual flames.
// ============================================================

const FLAME_W = 24
const FLAME_H = 32

/**
 * The flame outline, as explicit cubic segments.
 *
 * It is the exact path the app shipped with, converted from its
 * shorthand into seven absolute curves so the POINTS can be moved. That
 * is the whole reason for the conversion: a CSS transform can squash a
 * path but it can never change its shape, so every version of this
 * component so far has been a rigid outline being stretched, which is
 * why it read as constant no matter how the timings were tuned.
 *
 * Real fire changes shape. Below, the tip whips and the base holds
 * still, because that is what a flame anchored in fuel actually does.
 */
type Curve = [number, number, number, number, number, number]
const OUTER: { from: [number, number]; segs: Curve[] } = {
  from: [12, 0],
  segs: [
    [13.4, 5.4, 9.8, 7.6, 7.4, 10.6],
    [5, 13.6, 3, 16.6, 3, 20.4],
    [3, 26.2, 7.2, 32, 12, 32],
    [16.8, 32, 21, 26.2, 21, 20.4],
    [21, 16, 18.4, 13.4, 16, 10.2],
    [14.8, 11.8, 13.6, 12.8, 12.6, 12.8],
    [13.8, 9.2, 13.8, 4.2, 12, 0],
  ],
}
const MID: { from: [number, number]; segs: Curve[] } = {
  from: [12, 8],
  segs: [
    [13, 11.6, 10.6, 13, 9, 15],
    [7.4, 17, 6, 19, 6, 21.6],
    [6, 25.6, 8.8, 29, 12, 29],
    [15.2, 29, 18, 25.6, 18, 21.6],
    [18, 18.6, 16.2, 16.8, 14.6, 14.8],
    [13.8, 15.8, 13, 16.6, 12.4, 16.6],
    [13.2, 14.2, 13.2, 10.8, 12, 8],
  ],
}

/** Deterministic 0..1. Same seed, same fire, every render. */
function rnd(seed: number, k: number): number {
  const n = Math.sin(seed * 12.9898 + k * 78.233) * 43758.5453
  return n - Math.floor(n)
}

/**
 * One variant of a shape. `amp` is how far the TIP may wander; every
 * point moves less the closer it sits to the fuel, which is the rule
 * that keeps the flame rooted instead of wobbling like jelly.
 */
function variant(shape: { from: [number, number]; segs: Curve[] }, seed: number, amp: number): string {
  let k = 0
  const move = (x: number, y: number): string => {
    const w = Math.max(0, (FLAME_H - y) / FLAME_H) ** 1.4
    const dx = (rnd(seed, k++) - 0.5) * amp * 2 * w
    const dy = (rnd(seed, k++) - 0.5) * amp * 0.8 * w
    return `${(x + dx).toFixed(2)} ${(y + dy).toFixed(2)}`
  }
  const head = seed === 0 ? `${shape.from[0]} ${shape.from[1]}` : move(shape.from[0], shape.from[1])
  const body = shape.segs
    .map((c) =>
      seed === 0
        ? `C${c[0]} ${c[1]} ${c[2]} ${c[3]} ${c[4]} ${c[5]}`
        : `C${move(c[0], c[1])} ${move(c[2], c[3])} ${move(c[4], c[5])}`,
    )
    .join('')
  return `M${head}${body}Z`
}

const OUTER_D = variant(OUTER, 0, 0)
const MID_D = variant(MID, 0, 0)

/** The loop of shapes one path cycles through. Ends where it began. */
function morphValues(shape: { from: [number, number]; segs: Curve[] }, offset: number, amp: number): string {
  const frames = [0, 1, 2, 3, 4].map((i) => variant(shape, offset + i + 1, amp))
  return [...frames, frames[0]].join(';')
}

/**
 * The morph itself. SMIL rather than CSS because `d` is only animatable
 * in CSS in one engine, and this has to work in a PWA on any phone.
 * Reduced motion simply does not render it.
 */
function Morph({ values, dur }: { values: string; dur: number }) {
  return (
    <animate
      attributeName="d"
      values={values}
      dur={`${dur.toFixed(2)}s`}
      repeatCount="indefinite"
      calcMode="spline"
      keyTimes="0;0.2;0.4;0.6;0.8;1"
      keySplines=".4 0 .6 1;.4 0 .6 1;.4 0 .6 1;.4 0 .6 1;.4 0 .6 1"
    />
  )
}

/** How far the widest flame in this cluster sits from the middle. */
const reach = (s: RungStyle) => s.spread * 8.5

/**
 * The flames behind the main one: alternating sides, further out, smaller
 * and DIMMER as they go, and each one sunk a little lower than the last.
 *
 * The sinking is what stops it becoming a wedge. Rooted on one baseline,
 * a row of flames shrinking as they fan out draws a filled triangle, and
 * at the top rungs that is exactly what appeared: a flame standing on a
 * red pyramid. Dropped and faded, the same copies read as depth behind
 * the fire, which is what they are.
 */
function cluster(s: RungStyle, count: number) {
  const out: { dx: number; dy: number; k: number; o: number; i: number }[] = []
  for (let i = 1; i < count; i++) {
    const rank = Math.ceil(i / 2)
    const ranks = Math.ceil((count - 1) / 2)
    const side = i % 2 === 0 ? 1 : -1
    out.push({
      dx: side * reach(s) * (rank / ranks),
      dy: rank * 1.5,
      k: 0.8 - 0.1 * rank,
      o: Math.max(0.3, 0.92 - 0.11 * rank),
      i,
    })
  }
  return out
}

/** Seconds as a css duration. No two tongues may share one. */
const secs = (n: number) => `${n.toFixed(2)}s`

/**
 * How much of the rung's growth this instance actually spends.
 *
 * The ladder spans 0.6 to 2.1, which is a 3.5x range and exactly the
 * drama a ceremony or a profile header wants. A 16px row chip cannot
 * have it: at full range day one is a 10px smudge nobody can read and
 * day one thousand is 34px shoving the row apart. So the growth is
 * expressed in full at display size and compressed toward 1 in a chip.
 * Same ladder, same order, sized to the slot it is standing in.
 */
const growth = (scale: number, size: number) => 1 + (scale - 1) * Math.min(1, Math.max(0.42, size / 44))

/**
 * Embers coming off the fire.
 *
 * The bug that survived two fixes: these SPAWNED AT A FIXED HEIGHT.
 * Each one was given a `top` somewhere in the upper half of the frame
 * and animated from there, so an ember at 46% materialised in mid-air
 * halfway up and floated. Nothing ever came out of the fire. Varying
 * that height only spread the problem out.
 *
 * An ember leaves the TIP. Every one of these starts there, and the
 * only thing that differs is WHEN it leaves, how far it gets and which
 * way it drifts. That is the whole model, and it is the one that reads.
 *
 * (Also, earlier: a percentage in `translate` resolves against the
 * element's own box, so a 2px span told to travel -230% moved four
 * pixels and sat there. Travel is absolute and measured off the fire.)
 */
function Embers({ n, color, px, delay }: { n: number; color: string; px: number; delay: number }) {
  if (n === 0) return null
  // An ember is a physical speck: its SIZE grows far slower than the
  // fire and stops. Where it goes scales with the fire it left.
  const dot = Math.min(1.8, Math.max(1, (px / 44) ** 0.38))
  return (
    <>
      {Array.from({ length: n }, (_, i) => {
        const d = (i % 4 === 0 ? 2.2 : 1.4) * dot
        return (
          <span
            key={i}
            className="spark-bit absolute left-1/2 rounded-full"
            style={
              {
                width: d,
                height: d,
                background: color,
                // The tip, give or take the wander of the flames under it.
                top: `${2 + ((i * 17) % 9)}%`,
                marginLeft: `${(((i * 37) % 11) - 5) * 0.022 * px}px`,
                animationDelay: `${delay + ((i * 211) % 1500)}ms`,
                // Drifts as it rises. Travel stays inside about eight
                // tenths of the fire's own height: further than that and
                // most of them are out of frame before anybody sees one.
                '--sx': `${(((i * 53) % 9) - 4) * 0.035 * px}px`,
                '--sy': `${-(0.32 + ((i * 67) % 50) / 100) * px}px`,
                '--sd': `${1.1 + ((i * 7) % 9) / 10}s`,
              } as React.CSSProperties
            }
          />
        )
      })}
    </>
  )
}

/** How long the fire takes to catch. The streak beat's budget. */
export const IGNITE_MS = 1500

/**
 * The coals, lit before there is any flame. Sits at the base, glows,
 * and is gone by the time the fire has taken. Without it the ignition
 * reads as a shape fading in rather than as something catching.
 */
function EmberBed({ color }: { color: string }) {
  return (
    <span
      className="ember-bed pointer-events-none absolute bottom-0 left-1/2 rounded-full"
      style={{
        width: '46%',
        height: '18%',
        background: `radial-gradient(ellipse at center, ${color} 0%, ${color}88 38%, transparent 72%)`,
      }}
      aria-hidden
    />
  )
}

/**
 * The sparks thrown at the strike. One shot, wider and faster than the
 * embers, and the throw scales with the flame: a hero-sized fire that
 * sprays its sparks inside its own silhouette does not read as a strike.
 */
function Strike({ color, reach }: { color: string; reach: number }) {
  return (
    <>
      {Array.from({ length: 12 }, (_, i) => {
        const angle = (i / 12) * Math.PI - Math.PI // upper half only: sparks go up
        const far = 30 + ((i * 13) % 26)
        const d = i % 4 === 0 ? 4 : 2.5
        return (
          <span
            key={i}
            className="strike-bit absolute left-1/2 top-[74%] rounded-full"
            style={
              {
                width: d,
                height: d,
                background: color,
                animationDelay: `${(i * 21) % 100}ms`,
                '--sx': `${Math.round(Math.cos(angle) * far * reach)}px`,
                '--sy': `${Math.round(Math.sin(angle) * far * reach - 8)}px`,
              } as React.CSSProperties
            }
          />
        )
      })}
    </>
  )
}

export function Flame({
  streak,
  size = 22,
  /** Strike it: the flame catches from nothing, throwing sparks. One shot, on mount. */
  ignite = false,
  /** Ambient embers and the brightness gutter. Defaults on for display sizes. */
  alive,
}: {
  streak: number
  size?: number
  ignite?: boolean
  alive?: boolean
}) {
  const tier = flameFor(streak)
  if (!tier) return null
  const s = RUNG[tier.from]
  const still = prefersReducedMotion()
  // The full show costs a filter animation and a handful of particles,
  // which is fine on a hero and wrong on a chip that never leaves the
  // screen. Size is the honest signal for which one this is.
  const big = (alive ?? size >= 30) && !still
  const lit = big
  const px = size * growth(s.scale, size) * s.height

  // Two caps, both about legibility rather than taste. At 16px the
  // eleventh flame is thinner than a pixel and still costs a keyframe.
  // And past eight copies the cluster stops reading as flames at all and
  // starts filling in as a solid wedge behind the fire, so the top three
  // rungs draw the same eight and earn their difference on the five axes
  // that still move there: size, speed, core colour, embers and glow.
  const count = Math.min(size >= 30 ? 8 : 3, s.flames)
  const back = cluster(s, count)
  // A wide fire is wider than it is tall, so the frame widens with it
  // rather than shrinking the flames to fit a square.
  const vw = FLAME_W + reach(s) * 2 + 6
  // Each flame on its own clock. Nothing in the frame repeats together,
  // which is the entire difference between fire and a logo.
  // A morphing path is a repaint per frame, so only the display sizes get
  // it; a row chip keeps the cheap squash, which at 16px is all anybody
  // could see anyway. Where the shape morphs the squash comes OFF: two
  // flickers on one path fight and read as a wobble.
  const clock = (i: number) =>
    still || lit ? undefined : `flame-crackle ${secs(s.speed * (0.58 + i * 0.117))} linear infinite`
  const morph = lit && !still
  const path = { transformBox: 'fill-box', transformOrigin: '50% 100%' } as const

  // Both of these set `animation`, and an inline style beats a class rule
  // outright: `.catch-fire` supplying its own animation meant the breathe
  // below silently won and the ignition never played at all. One
  // declaration, with the breathe held until the fire has caught.
  const anim = still
    ? undefined
    : ignite
      ? `flame-ignite ${IGNITE_MS}ms cubic-bezier(0.3, 0.7, 0.4, 1) both, flame-breathe ${s.speed}s ease-in-out ${IGNITE_MS}ms infinite`
      : `flame-breathe ${s.speed}s ease-in-out infinite`

  return (
    // The outer frame does not move. The coals and the sparks live here,
    // OUTSIDE the body: the ignition scales the fire from almost nothing,
    // so anything inside it gets scaled to nothing too, and the coals
    // that are supposed to be lit before there is a flame vanished.
    <span
      className="flame relative inline-block shrink-0"
      style={{ width: (px * vw) / FLAME_H, height: px }}
      aria-hidden
    >
      {ignite && !still && <EmberBed color={s.core} />}
      {ignite && !still && <Strike color={s.core} reach={px / 46} />}
      <span
        className={`block h-full w-full will-change-transform ${ignite && !still ? 'catch-fire' : ''}`}
        style={{ animation: anim }}
      >
      <span
        className={`block h-full w-full ${lit ? 'flame-gutter' : ''}`}
        style={{ ['--gutter' as string]: secs(s.speed * 1.71) }}
      >
        {/* The glow belongs to the FIRE, not to the frame. On the frame
            it also fell on the sparks and the embers, and at the top of
            the ladder that is a 42px halo around a 2px dot: every
            particle rendered as a fat white orb parked in the air. It
            only ever looked right because the small rungs glow by 4px.
            It sits on the svg because both wrappers above animate
            `filter` already and would overwrite it. */}
        <svg
          viewBox={`0 0 ${vw} ${FLAME_H}`}
          className="h-full w-full"
          style={s.glow === 'none' ? undefined : { filter: `drop-shadow(${s.glow.split(',')[0]})` }}
        >
          {/* The fire behind the fire. Same flame, smaller, offset, and
              on its own clock, so nothing in the frame moves together. */}
          {back.map(({ dx, dy, k, o, i }) => (
            // The placement lives on a wrapper, NOT on the path. A CSS
            // transform (which is what the crackle animates) replaces the
            // SVG transform attribute outright, so putting both on one
            // element silently threw the offset and the scale away and
            // stacked every background flame at full size on the main one.
            <g
              key={`b${i}`}
              transform={`translate(${(vw / 2 - FLAME_W / 2 + dx).toFixed(2)} ${dy.toFixed(2)}) translate(12 32) scale(${k.toFixed(3)}) translate(-12 -32)`}
            >
              {/* Placement on the outer g, catching on this one: a CSS
                  transform replaces an SVG transform attribute, so the
                  two cannot share an element. */}
              <g
                className={ignite && !still ? 'recruit' : undefined}
                style={ignite && !still ? { animationDelay: `${140 + i * 110}ms` } : undefined}
              >
                <path d={OUTER_D} fill={s.outer} opacity={o} style={{ ...path, animation: clock(i) }}>
                  {morph && <Morph values={morphValues(OUTER, i * 3, 1.7)} dur={s.speed * (0.58 + i * 0.117) * 2.4} />}
                </path>
              </g>
            </g>
          ))}
          <g transform={`translate(${(vw / 2 - FLAME_W / 2).toFixed(2)} 0)`}>
            <path d={OUTER_D} fill={s.outer} style={{ ...path, animation: clock(0) }}>
              {morph && <Morph values={morphValues(OUTER, 0, 1.9)} dur={s.speed * 1.4} />}
            </path>
            <path d={MID_D} fill={s.mid} style={{ ...path, animation: clock(4) }}>
              {/* Off the body's clock on purpose: the inside of a fire
                  never moves with its edge. */}
              {morph && <Morph values={morphValues(MID, 31, 1.5)} dur={s.speed * 0.97} />}
            </path>
            <ellipse
              cx="12"
              cy="24.5"
              rx="3.1"
              ry="4.6"
              fill={s.core}
              opacity={0.92}
              style={{ ...path, animation: still ? undefined : `flame-core ${secs(s.speed * 0.41)} ease-in-out infinite` }}
            />
          </g>
        </svg>
      </span>
      </span>
      {/* A flame still catching throws no embers, and it has no tip to
          throw them from: the body is scaled down inside this frame
          while these sit at the frame's own top edge. They wait for the
          fire to be up. The coals throw the strike sparks meanwhile. */}
      {lit && <Embers n={s.embers} color={s.core} px={px} delay={ignite ? IGNITE_MS : 0} />}
    </span>
  )
}

/**
 * The whole streak badge: flame, count, tier name. It renders from day
 * one now. The honesty that used to come from hiding it comes from the
 * ember instead: day one is visibly the bottom of a long ladder.
 */
export function StreakBadge({ streak, size = 22 }: { streak: number; size?: number }) {
  const tier = flameFor(streak)
  if (!tier) return null
  return (
    <span className="inline-flex items-center gap-1.5">
      <Flame streak={streak} size={size} />
      <span className="num text-[15px] font-extrabold leading-none">×{streak}</span>
      <span className="eyebrow text-ink-faint">{tier.name}</span>
    </span>
  )
}

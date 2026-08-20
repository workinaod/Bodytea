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
const OUTER_D =
  'M12 0c1.4 5.4-2.2 7.6-4.6 10.6C5 13.6 3 16.6 3 20.4 3 26.2 7.2 32 12 32s9-5.8 9-11.6c0-4.4-2.6-7-5-10.2-1.2 1.6-2.4 2.6-3.4 2.6 1.2-3.6 1.2-8.6-.6-12.8Z'
const MID_D =
  'M12 8c1 3.6-1.4 5-3 7-1.6 2-3 4-3 6.6C6 25.6 8.8 29 12 29s6-3.4 6-7.4c0-3-1.8-4.8-3.4-6.8-.8 1-1.6 1.8-2.2 1.8.8-2.4.8-5.8-.4-8.6Z'

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

/** Deterministic, so nothing reshuffles on a re-render. */
function Embers({ n, color, spread }: { n: number; color: string; spread: number }) {
  if (n === 0) return null
  return (
    <>
      {Array.from({ length: n }, (_, i) => (
        <span
          key={i}
          className="spark-bit absolute left-1/2 top-[16%] rounded-full"
          style={
            {
              width: i % 3 === 0 ? 2.5 : 1.8,
              height: i % 3 === 0 ? 2.5 : 1.8,
              background: color,
              marginLeft: `${(((i * 37) % 13) - 6) * spread}px`,
              animationDelay: `${(i * 430) % 1900}ms`,
              '--sx': `${(((i * 53) % 15) - 7) * spread}px`,
              '--sd': `${1.5 + ((i * 7) % 12) / 10}s`,
            } as React.CSSProperties
          }
        />
      ))}
    </>
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
            className="strike-bit absolute left-1/2 top-1/2 rounded-full"
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
  const clock = (i: number) => (still ? undefined : `flame-crackle ${secs(s.speed * (0.58 + i * 0.117))} linear infinite`)
  const path = { transformBox: 'fill-box', transformOrigin: '50% 100%' } as const

  return (
    <span
      className={`flame relative inline-block shrink-0 will-change-transform ${ignite && !still ? 'catch-fire' : ''}`}
      style={{
        width: (px * vw) / FLAME_H,
        height: px,
        filter: `drop-shadow(${s.glow.split(',')[0]})`,
        animation: still ? undefined : `flame-breathe ${s.speed}s ease-in-out infinite`,
      }}
      aria-hidden
    >
      {ignite && !still && <Strike color={s.core} reach={px / 46} />}
      <span
        className={`block h-full w-full ${lit ? 'flame-gutter' : ''}`}
        style={{ ['--gutter' as string]: secs(s.speed * 1.71) }}
      >
        <svg viewBox={`0 0 ${vw} ${FLAME_H}`} className="h-full w-full">
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
              <path d={OUTER_D} fill={s.outer} opacity={o} style={{ ...path, animation: clock(i) }} />
            </g>
          ))}
          <g transform={`translate(${(vw / 2 - FLAME_W / 2).toFixed(2)} 0)`}>
            <path d={OUTER_D} fill={s.outer} style={{ ...path, animation: clock(0) }} />
            <path d={MID_D} fill={s.mid} style={{ ...path, animation: clock(4) }} />
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
      {lit && <Embers n={s.embers} color={s.core} spread={Math.max(1, px / 44)} />}
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

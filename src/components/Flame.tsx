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
  /** How many separate tongues this fire burns. The shape of growth. */
  tongues: number
  /** Height of the tallest tongue, as a fraction of the frame. */
  height: number
  /** How far the outer tongues sit from the middle. */
  spread: number
  /** Width of the burning bed at the bottom. */
  bed: number
}

/**
 * Keyed by the rung's day threshold, which is the stable identity of a
 * rung. `level` in the plan data stays what it is: a coarse grouping for
 * anything that needs one, not a styling key.
 */
export const RUNG: Record<number, RungStyle> = {
  1: { outer: '#7a4e2a', mid: '#b87a3e', core: '#edcb9c', speed: 3.4, glow: 'none', scale: 0.6, embers: 0, tongues: 1, height: 0.4, spread: 0, bed: 0.3 },
  3: { outer: '#9a5f2e', mid: '#d8913f', core: '#f5da9e', speed: 2.9, glow: '0 0 4px rgba(216,145,63,0.25)', scale: 0.74, embers: 1, tongues: 1, height: 0.58, spread: 0, bed: 0.34 },
  7: { outer: '#e0641c', mid: '#ff9633', core: '#ffd79b', speed: 2.5, glow: '0 0 7px rgba(255,120,40,0.32)', scale: 0.88, embers: 2, tongues: 2, height: 0.7, spread: 0.11, bed: 0.42 },
  14: { outer: '#ff6a1f', mid: '#ffa02f', core: '#ffdf9f', speed: 2.2, glow: '0 0 10px rgba(255,125,40,0.4)', scale: 1, embers: 3, tongues: 3, height: 0.78, spread: 0.16, bed: 0.5 },
  30: { outer: '#ff5a15', mid: '#ff8a20', core: '#ffe08a', speed: 1.9, glow: '0 0 13px rgba(255,110,30,0.5)', scale: 1.14, embers: 4, tongues: 3, height: 0.84, spread: 0.21, bed: 0.58 },
  60: { outer: '#ff4d10', mid: '#ff820e', core: '#ffe87e', speed: 1.65, glow: '0 0 16px rgba(255,95,25,0.56)', scale: 1.28, embers: 5, tongues: 4, height: 0.88, spread: 0.26, bed: 0.66 },
  90: { outer: '#ff3d0a', mid: '#ff7a10', core: '#fff0a0', speed: 1.4, glow: '0 0 19px rgba(255,80,20,0.62)', scale: 1.42, embers: 6, tongues: 5, height: 0.92, spread: 0.31, bed: 0.74 },
  180: { outer: '#ff2f05', mid: '#ffd23c', core: '#ffffff', speed: 1.15, glow: '0 0 24px rgba(255,90,20,0.72)', scale: 1.58, embers: 7, tongues: 6, height: 0.95, spread: 0.36, bed: 0.82 },
  // Past a year the core stops being orange. A fire that hot is blue at
  // the middle, and it is the first rung that looks like a different
  // substance rather than more of the same one.
  365: { outer: '#ff2a00', mid: '#9fd8ff', core: '#ffffff', speed: 0.95, glow: '0 0 28px rgba(120,190,255,0.6)', scale: 1.74, embers: 9, tongues: 7, height: 0.97, spread: 0.41, bed: 0.9 },
  500: { outer: '#ff1f00', mid: '#7fcaff', core: '#ffffff', speed: 0.85, glow: '0 0 34px rgba(120,190,255,0.7)', scale: 1.9, embers: 11, tongues: 8, height: 0.99, spread: 0.45, bed: 0.96 },
  1000: { outer: '#ff1400', mid: '#cbb2ff', core: '#ffffff', speed: 0.75, glow: '0 0 42px rgba(180,150,255,0.75)', scale: 2.1, embers: 13, tongues: 9, height: 1, spread: 0.48, bed: 1 },
}

// The frame the geometry is drawn in. Taller than wide, because fire is.
const W = 100
const H = 128
const FLOOR = 126

/** Half the width of what is alight at the bottom. */
const bedHalf = (s: RungStyle) => 8 + 34 * s.bed
/**
 * Half the width of ONE lick. Every layer derives from this, which is
 * what keeps a nine-tongue blaze made of nine slender tongues rather
 * than of one shape as wide as its own bed.
 */
const tongueHalf = (s: RungStyle, count: number) => bedHalf(s) / (0.55 * count + 0.9)

/**
 * One tongue: up the left flank to a tip that leans, back down the right.
 * The control points pull inward near the top, which is what separates a
 * flame from a leaf.
 */
function tongue(x: number, halfWidth: number, height: number, lean: number): string {
  const tipX = x + lean
  const tipY = FLOOR - height
  return [
    `M${(x - halfWidth).toFixed(1)} ${FLOOR}`,
    `C${(x - halfWidth * 1.08).toFixed(1)} ${(FLOOR - height * 0.36).toFixed(1)}`,
    `${(x - halfWidth * 0.62 + lean * 0.35).toFixed(1)} ${(FLOOR - height * 0.7).toFixed(1)}`,
    `${tipX.toFixed(1)} ${tipY.toFixed(1)}`,
    `C${(x + halfWidth * 0.62 + lean * 0.35).toFixed(1)} ${(FLOOR - height * 0.7).toFixed(1)}`,
    `${(x + halfWidth * 1.08).toFixed(1)} ${(FLOOR - height * 0.36).toFixed(1)}`,
    `${(x + halfWidth).toFixed(1)} ${FLOOR}`,
    'Z',
  ].join(' ')
}

/**
 * The tongues of one layer.
 *
 * The rule that makes this read as fire rather than as a comb: a tongue
 * gets NARROWER as the fire adds more of them. The bed widens, the count
 * climbs, and each individual lick stays slender, so nine tongues are
 * nine tongues instead of one slab with teeth on top. Heights are
 * jittered off the centre too, because a symmetric arch is a logo.
 */
function tongues(
  s: RungStyle,
  count: number,
  { depth, width, spread }: { depth: number; width: number; spread: number },
) {
  const half = tongueHalf(s, count) * width
  const centre = (count - 1) / 2
  const reach = Math.max(0, bedHalf(s) - half) * spread
  return Array.from({ length: count }, (_, i) => {
    // -1 on the far left, 0 in the middle, +1 on the far right.
    const d = centre === 0 ? 0 : (i - centre) / centre
    // The middle lick always runs full height; its neighbours do not, and
    // that unevenness is most of what separates flame from decoration.
    const jitter = Math.abs(i - centre) < 0.5 ? 1 : 0.68 + 0.3 * (((i * 37) % 7) / 6)
    const height = H * s.height * depth * (1 - 0.34 * d * d) * jitter
    // Outer licks lean away from the middle; a fire flares as it climbs.
    const lean = d * (6 + 16 * s.spread)
    return { d: tongue(W / 2 + d * reach, half, height, lean), i }
  })
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
  const px = size * growth(s.scale, size)

  // At 16px the ninth tongue is thinner than a pixel and still costs a
  // keyframe. A chip burns the same fire with fewer of them.
  const count = size >= 30 ? s.tongues : Math.min(3, s.tongues)
  // Each tongue on its own clock. Nothing in the frame repeats together,
  // which is the entire difference between fire and a logo.
  const clock = (i: number) => (still ? undefined : `flame-crackle ${secs(s.speed * (0.58 + i * 0.117))} linear infinite`)
  const path = { transformBox: 'fill-box', transformOrigin: '50% 100%' } as const

  return (
    <span
      className={`flame relative inline-block shrink-0 will-change-transform ${ignite && !still ? 'catch-fire' : ''}`}
      style={{
        width: px,
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
        <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full">
          {/* The bed: what is actually alight. Flat and low, so the
              tongue roots merge into it instead of standing on a dome. */}
          {s.bed > 0.32 && (
            <ellipse
              cx={W / 2}
              cy={FLOOR - 3}
              rx={bedHalf(s) * 1.04}
              ry={4 + s.bed * 5}
              fill={s.outer}
            />
          )}
          {tongues(s, count, { depth: 1, width: 1, spread: 1 }).map(({ d, i }) => (
            <path key={`o${i}`} d={d} fill={s.outer} style={{ ...path, animation: clock(i) }} />
          ))}
          {/* The hotter inside: same licks, nested, so the body reads as
              layered rather than as two shapes side by side. */}
          {tongues(s, count, { depth: 0.62, width: 0.6, spread: 0.6 }).map(({ d, i }) => (
            <path key={`m${i}`} d={d} fill={s.mid} style={{ ...path, animation: clock(i + 3) }} />
          ))}
          {/* The core: one short, hot lick over the hottest part of the
              bed, sized off a single tongue rather than off the fire. */}
          <path
            d={tongue(W / 2, tongueHalf(s, count) * 0.85, H * s.height * 0.34, 0)}
            fill={s.core}
            opacity={0.94}
            style={{ ...path, animation: still ? undefined : `flame-core ${secs(s.speed * 0.41)} ease-in-out infinite` }}
          />
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

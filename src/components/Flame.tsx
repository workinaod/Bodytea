import { flameFor } from '../plan/achievements'
import { prefersReducedMotion } from '../platform/motion'

// ============================================================
// The streak, burning.
//
// Seven visual levels across eleven named rungs, and the
// animation earns its keep by changing with them: an ember on
// day one barely holds on, a year-old flame roars.
//
// Levels 1 and 2 are the new bottom of the ladder and they are
// deliberately unimpressive: small, dim, slow, no glow. A day
// one streak should look like something you could lose by
// tomorrow, because it is.
// Same SVG throughout, driven entirely by the tier, so nothing
// about it can drift out of step with the number beside it.
//
// COMBUSTION, added deliberately: the first version moved every
// layer on a smooth sine curve at one shared duration, which is
// precisely why it read as a pulsing logo. Fire guts and
// catches at uneven intervals, so the layers now run at
// unrelated speeds with stops at odd percentages, and the loop
// is long enough that nobody sees it repeat.
//
// The expensive parts are opt-in and tier-gated. Sparks and the
// brightness gutter belong to the big instances (the ceremony,
// a profile header) and to flames with enough life in them to
// throw embers. The 16px chip that sits on Today all day gets
// the crackle and nothing else.
//
// Every layer is inline SVG and CSS. No image, no library, and it
// keeps working offline and inside a native wrapper.
// ============================================================

const TIER_STYLE: Record<
  number,
  { core: string; mid: string; outer: string; speed: string; glow: string; scale: number }
> = {
  1: { core: '#f0d3a8', mid: '#c98a4a', outer: '#8a5a30', speed: '3.2s', glow: 'none', scale: 0.72 },
  2: { core: '#f7dda2', mid: '#e09a45', outer: '#a86a35', speed: '2.8s', glow: '0 0 4px rgba(220,150,70,0.28)', scale: 0.84 },
  3: { core: '#ffd9a0', mid: '#ff9d3c', outer: '#ff6a1f', speed: '2.4s', glow: '0 0 6px rgba(255,120,40,0.35)', scale: 0.96 },
  4: { core: '#ffe08a', mid: '#ff8a20', outer: '#ff5a15', speed: '1.9s', glow: '0 0 10px rgba(255,110,30,0.5)', scale: 1.06 },
  5: { core: '#fff0a0', mid: '#ff7a10', outer: '#ff3d0a', speed: '1.5s', glow: '0 0 14px rgba(255,80,20,0.6)', scale: 1.14 },
  6: { core: '#ffffff', mid: '#ffd23c', outer: '#ff2f05', speed: '1.15s', glow: '0 0 20px rgba(255,90,20,0.72)', scale: 1.2 },
  7: { core: '#ffffff', mid: '#9fd8ff', outer: '#ff2a00', speed: '0.85s', glow: '0 0 28px rgba(120,190,255,0.6), 0 0 40px rgba(255,70,10,0.5)', scale: 1.28 },
}

/** Seconds, as a css duration. The layers must never share one. */
const secs = (base: string, mul: number) => `${(parseFloat(base) * mul).toFixed(2)}s`

/**
 * Embers coming off the top. Deterministic, so nothing reshuffles on a
 * re-render, and count scales with the tier: an ember throws one weak
 * spark, an inferno throws six.
 */
function Embers({ level, color }: { level: number; color: string }) {
  const n = Math.max(0, level - 1) + (level >= 5 ? 2 : 0)
  if (n === 0) return null
  return (
    <>
      {Array.from({ length: n }, (_, i) => (
        <span
          key={i}
          className="spark-bit absolute left-1/2 top-[18%] rounded-full"
          style={
            {
              width: i % 3 === 0 ? 2.5 : 1.8,
              height: i % 3 === 0 ? 2.5 : 1.8,
              background: color,
              marginLeft: `${((i * 37) % 11) - 5}px`,
              animationDelay: `${(i * 430) % 1900}ms`,
              '--sx': `${((i * 53) % 15) - 7}px`,
              '--sd': `${1.5 + ((i * 7) % 12) / 10}s`,
            } as React.CSSProperties
          }
        />
      ))}
    </>
  )
}

/** The sparks thrown at the strike. One shot, wider and faster than the embers. */
function Strike({ color }: { color: string }) {
  return (
    <>
      {Array.from({ length: 10 }, (_, i) => {
        const angle = (i / 10) * Math.PI - Math.PI // upper half only: sparks go up
        return (
          <span
            key={i}
            className="strike-bit absolute left-1/2 top-1/2 h-[3px] w-[3px] rounded-full"
            style={
              {
                background: color,
                animationDelay: `${(i * 23) % 90}ms`,
                '--sx': `${Math.round(Math.cos(angle) * (26 + ((i * 13) % 18)))}px`,
                '--sy': `${Math.round(Math.sin(angle) * (24 + ((i * 17) % 20)))}px`,
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
  const s = TIER_STYLE[tier.level]
  const still = prefersReducedMotion()
  // The full show costs a filter animation and a handful of particles,
  // which is fine on a hero and wrong on a chip that never leaves the
  // screen. Size is the honest signal for which one this is.
  const lit = (alive ?? size >= 30) && !still

  return (
    <span
      className={`flame relative inline-block shrink-0 will-change-transform ${ignite && !still ? 'catch-fire' : ''}`}
      style={{
        width: size * s.scale,
        height: size * s.scale,
        filter: `drop-shadow(${s.glow.split(',')[0]})`,
        animation: still ? undefined : `flame-breathe ${s.speed} ease-in-out infinite`,
      }}
      aria-hidden
    >
      {ignite && !still && <Strike color={s.core} />}
      <span
        className={`block h-full w-full ${lit ? 'flame-gutter' : ''}`}
        style={{ ['--gutter' as string]: secs(s.speed, 1.71) }}
      >
        <svg viewBox="0 0 24 32" className="h-full w-full">
          {/* Outer body: the shape everyone reads as fire */}
          <path
            d="M12 0c1.4 5.4-2.2 7.6-4.6 10.6C5 13.6 3 16.6 3 20.4 3 26.2 7.2 32 12 32s9-5.8 9-11.6c0-4.4-2.6-7-5-10.2-1.2 1.6-2.4 2.6-3.4 2.6 1.2-3.6 1.2-8.6-.6-12.8Z"
            fill={s.outer}
            style={{ animation: still ? undefined : `flame-lick ${s.speed} ease-in-out infinite` }}
          />
          {/* Middle tongue: the crackle lives here, off the beat of the body */}
          <path
            className={still ? '' : 'flame-crackle'}
            d="M12 8c1 3.6-1.4 5-3 7-1.6 2-3 4-3 6.6C6 25.6 8.8 29 12 29s6-3.4 6-7.4c0-3-1.8-4.8-3.4-6.8-.8 1-1.6 1.8-2.2 1.8.8-2.4.8-5.8-.4-8.6Z"
            fill={s.mid}
            style={{ ['--crackle' as string]: secs(s.speed, 0.73), transformBox: 'fill-box' }}
          />
          {/* Core: the hottest part, smallest and fastest */}
          <ellipse
            cx="12"
            cy="24.5"
            rx="3.1"
            ry="4.6"
            fill={s.core}
            opacity={0.92}
            style={{ animation: still ? undefined : `flame-core ${secs(s.speed, 0.41)} ease-in-out infinite` }}
          />
        </svg>
      </span>
      {lit && <Embers level={tier.level} color={s.core} />}
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

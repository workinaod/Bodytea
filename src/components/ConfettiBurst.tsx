import { useMemo } from 'react'
import { prefersReducedMotion } from '../platform/motion'

// ============================================================
// One burst, then gone.
//
// Deliberately NOT a canvas: the run reaction card already
// throws particles with per-element --dx/--dy custom
// properties, so this reuses that technique and stays a
// handful of composited spans with no new dependency and no
// second rendering model to keep alive offline.
//
// The caller decides whether this is allowed to exist at all.
// It fires on a real PR, a flame tier-up or a badge unlock,
// at most once per ceremony. Confetti for an ordinary session
// is how a reward stops meaning anything.
// ============================================================

const COLORS = [
  'var(--color-accent)',
  'var(--color-lime)',
  'var(--color-gold)',
  'var(--color-cyan)',
  '#ffffff',
]

/** Deterministic spread: the same burst every time, so nothing flickers on re-render. */
function scatter(i: number, n: number) {
  const angle = (i / n) * Math.PI * 2 + (i % 3) * 0.22
  const distance = 90 + ((i * 37) % 120)
  return {
    dx: `${Math.round(Math.cos(angle) * distance)}px`,
    // Biased downward: thrown up, then gravity has its say.
    dy: `${Math.round(Math.sin(angle) * distance + 70)}px`,
    rot: `${((i * 83) % 540) - 270}deg`,
    delay: `${(i * 13) % 90}ms`,
  }
}

export function ConfettiBurst({ count = 24 }: { count?: number }) {
  const bits = useMemo(
    () => Array.from({ length: count }, (_, i) => ({ ...scatter(i, count), color: COLORS[i % COLORS.length] })),
    [count],
  )
  // Carries no information, so under reduced motion it simply does not exist.
  if (prefersReducedMotion()) return null
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {bits.map((b, i) => (
        <span
          key={i}
          className="burst-bit absolute left-1/2 top-[44%] h-2 w-2 rounded-[2px]"
          style={
            {
              background: b.color,
              animationDelay: b.delay,
              '--dx': b.dx,
              '--dy': b.dy,
              '--rot': b.rot,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  )
}

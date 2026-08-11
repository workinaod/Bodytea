import type { ReactNode } from 'react'

// ============================================================
// Numbers on screen. Everything here uses `.num` (display face,
// tabular figures) so a value that ticks does not jitter, and so
// data reads as instrumentation rather than as prose.
// ============================================================

export function Ring({
  value,
  target,
  label,
  unit,
  color = 'var(--color-accent)',
  size = 132,
}: {
  value: number
  target: number
  label: string
  unit: string
  color?: string
  size?: number
}) {
  const r = size / 2 - 9
  const c = 2 * Math.PI * r
  const pct = target > 0 ? Math.min(1, value / target) : 0
  const over = value > target
  return (
    <div className="flex flex-col items-center" style={{ width: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--color-surface-2)"
          strokeWidth="9"
        />
        {/* `sweep` fills rather than jumping when the value changes */}
        <circle
          className="sweep"
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={over ? 'var(--color-lime)' : color}
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
        />
      </svg>
      <div className="-mt-[81px] flex h-[60px] flex-col items-center justify-center">
        <div className="num text-[22px] font-black leading-none">{Math.round(value)}</div>
        <div className="text-[10px] font-semibold text-ink-faint">
          / {target} {unit}
        </div>
      </div>
      <div className="mt-[30px] text-micro font-bold text-ink-dim">{label}</div>
    </div>
  )
}

/**
 * One number, said once, with its name above it. The whole point is that
 * a card has a single thing it is about, and this is that thing.
 */
export function Stat({
  label,
  value,
  unit,
  tone = 'ink',
  size = 'md',
}: {
  label: string
  value: ReactNode
  unit?: string
  tone?: 'ink' | 'accent' | 'lime' | 'cyan' | 'gold'
  size?: 'md' | 'lg'
}) {
  const tones = {
    ink: 'text-ink',
    accent: 'text-accent-soft',
    lime: 'text-lime',
    cyan: 'text-cyan',
    gold: 'text-gold',
  }
  return (
    <div>
      <div className="eyebrow text-ink-faint">{label}</div>
      <div className={`num mt-1 font-black ${tones[tone]} ${size === 'lg' ? 'text-display' : 'text-title'}`}>
        {value}
        {unit && <span className="ml-1 text-label font-bold text-ink-faint">{unit}</span>}
      </div>
    </div>
  )
}

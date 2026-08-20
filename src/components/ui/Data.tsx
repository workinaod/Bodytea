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
  // 12px stroke per the approved concept, so the ring reads as a band
  // rather than a hairline. r leaves 8px so the round cap never clips.
  const r = size / 2 - 8
  const c = 2 * Math.PI * r
  const pct = target > 0 ? Math.min(1, value / target) : 0
  const over = value > target
  return (
    <div className="flex flex-col items-center">
      {/* The centre is absolutely placed inside the ring's own box. It used
          to be pulled up with a negative margin tuned by hand for one
          stroke width and one size, so a thicker ring or a smaller one put
          the number and its label in different places on the same row. */}
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90 block">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-surface-2)" strokeWidth="12" />
          {/* `sweep` fills rather than jumping when the value changes */}
          <circle
            className="sweep"
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={over ? 'var(--color-lime)' : color}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - pct)}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="num text-[24px] font-black leading-none">{Math.round(value)}</div>
          <div className="mt-0.5 text-[10px] font-bold text-ink-faint">
            / {target} {unit}
          </div>
        </div>
      </div>
      <div className="eyebrow mt-2 text-ink-dim">{label}</div>
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

// ============================================================
// The bar and the node: the two shapes progress is drawn with.
//
// Both are thick on purpose. A 4px bar and a 6px dot are chart
// furniture; at 12px and 17px with real outlines they become
// objects you can point at, which is the whole difference
// between reading a number and feeling a run of days.
// ============================================================

/** The approved progress bar: a thick track with a visible edge. */
export function QBar({
  pct,
  tone = 'heat',
  className = '',
}: {
  /** 0-100. Clamped, because a bar that overflows its track is a bug on screen. */
  pct: number
  tone?: 'heat' | 'volt' | 'gold'
  className?: string
}) {
  const fill = { heat: 'bg-accent', volt: 'bg-lime', gold: 'bg-gold' }[tone]
  return (
    <span
      className={`block h-3 overflow-hidden rounded-full border-2 border-edge bg-surface-2 ${className}`}
    >
      <span
        className={`grow block h-full rounded-full ${fill}`}
        style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
      />
    </span>
  )
}

export type NodeState = 'done' | 'partial' | 'missed' | 'rest' | 'today' | 'future'

/**
 * One stop on a path: a week, a climb, a training arc. Today is the
 * biggest node and the only one with a white edge, so the eye finds
 * where you are before it reads anything else.
 */
export function WeekNode({ state, className = '' }: { state: NodeState; className?: string }) {
  if (state === 'today') {
    return (
      <span
        className={`flex h-[21px] w-[21px] shrink-0 rounded-full border-2 border-white bg-accent shadow-[0_2px_0_var(--lip-accent)] ${className}`}
      />
    )
  }
  if (state === 'done') {
    return (
      <span
        className={`flex h-[17px] w-[17px] shrink-0 items-center justify-center rounded-full border-2 border-[var(--lip-lime)] bg-lime shadow-[0_2px_0_var(--lip-lime)] ${className}`}
      >
        {/* the tick is drawn, not typed: a glyph would sit off-centre at 7px */}
        <svg viewBox="0 0 12 12" className="h-2 w-2" aria-hidden>
          <path
            d="M2 6.2 4.8 9 10 3"
            fill="none"
            stroke="var(--ink-on-lime)"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    )
  }
  const tone =
    state === 'partial'
      ? 'border-[var(--lip-gold)] bg-gold'
      : state === 'missed'
        ? 'border-danger/70 bg-danger/25'
        : 'border-edge bg-surface-2'
  const size = state === 'rest' ? 'h-[13px] w-[13px] opacity-60' : 'h-[17px] w-[17px]'
  return (
    <span
      className={`shrink-0 rounded-full border-2 shadow-[0_2px_0_var(--color-edge)] ${tone} ${size} ${className}`}
    />
  )
}

/** The 3px rule between two nodes. Lit once the day behind it is banked. */
export function PathLink({ lit }: { lit: boolean }) {
  return (
    <span
      aria-hidden
      className={`h-[3px] min-w-1.5 flex-1 rounded-sm ${lit ? 'bg-[var(--lip-lime)]' : 'bg-edge-soft'}`}
    />
  )
}

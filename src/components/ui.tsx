import type { ReactNode } from 'react'
import type { DayBanner } from '../types'

// ============================================================
// Small shared UI primitives — dark gym theme, thumb-sized.
// ============================================================

export function Card({
  children,
  className = '',
  onClick,
}: {
  children: ReactNode
  className?: string
  onClick?: () => void
}) {
  return (
    <div
      onClick={onClick}
      className={`rounded-2xl border border-edge bg-surface p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_10px_28px_-16px_rgba(0,0,0,0.7)] ${onClick ? 'cursor-pointer transition-transform active:scale-[0.99]' : ''} ${className}`}
    >
      {children}
    </div>
  )
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-2 mt-6 flex items-center gap-3 px-1">
      <h2 className="whitespace-nowrap text-[11px] font-bold uppercase tracking-[0.16em] text-ink-faint">
        {children}
      </h2>
      <div className="h-px flex-1 bg-edge/60" />
      {right}
    </div>
  )
}

export function Chip({
  children,
  tone = 'default',
  onClick,
  className = '',
}: {
  children: ReactNode
  tone?: 'default' | 'accent' | 'lime' | 'cyan' | 'gold' | 'danger'
  onClick?: () => void
  className?: string
}) {
  const tones: Record<string, string> = {
    default: 'bg-surface-2 text-ink-dim border-edge',
    accent: 'bg-accent/15 text-accent-soft border-accent/30',
    lime: 'bg-lime/10 text-lime border-lime/25',
    cyan: 'bg-cyan/10 text-cyan border-cyan/25',
    gold: 'bg-gold/10 text-gold border-gold/25',
    danger: 'bg-danger/10 text-danger border-danger/25',
  }
  return (
    <span
      onClick={onClick}
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${tones[tone]} ${onClick ? 'cursor-pointer active:opacity-70' : ''} ${className}`}
    >
      {children}
    </span>
  )
}

export function Btn({
  children,
  onClick,
  kind = 'primary',
  className = '',
  disabled,
}: {
  children: ReactNode
  onClick?: () => void
  kind?: 'primary' | 'ghost' | 'danger' | 'lime' | 'subtle'
  className?: string
  disabled?: boolean
}) {
  const kinds: Record<string, string> = {
    primary:
      'bg-gradient-to-b from-accent to-accent-deep text-black font-extrabold shadow-lg shadow-accent/25 [text-shadow:0_1px_0_rgba(255,255,255,0.18)]',
    lime: 'bg-lime text-black font-extrabold shadow-lg shadow-lime/20',
    ghost: 'bg-transparent border border-edge text-ink-dim font-semibold',
    subtle: 'bg-surface-2 border border-edge/60 text-ink font-semibold',
    danger: 'bg-danger/15 border border-danger/30 text-danger font-bold',
  }
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`rounded-xl px-4 py-3 text-sm transition-all active:translate-y-px active:scale-[0.985] disabled:opacity-40 ${kinds[kind]} ${className}`}
    >
      {children}
    </button>
  )
}

export function BannerRow({ banner }: { banner: DayBanner }) {
  // A note in the margin, not another box: tone lives in the rule.
  const tones = {
    info: 'border-cyan/70 text-cyan/90',
    warn: 'border-gold/70 text-gold/95',
    success: 'border-lime/70 text-lime/90',
  }
  return (
    <div className={`border-l-2 py-1 pl-3 pr-1 text-[12.5px] leading-snug ${tones[banner.tone]}`}>
      {banner.text}
    </div>
  )
}

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
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-surface-2)" strokeWidth="9" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={over ? 'var(--color-lime)' : color}
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
      </svg>
      <div className="-mt-[81px] flex h-[60px] flex-col items-center justify-center">
        <div className="text-[22px] font-black leading-none">{Math.round(value)}</div>
        <div className="text-[10px] font-semibold text-ink-faint">/ {target} {unit}</div>
      </div>
      <div className="mt-[30px] text-[11px] font-bold uppercase tracking-wider text-ink-dim">{label}</div>
    </div>
  )
}

export function Stepper({
  value,
  onChange,
  step = 5,
  min = 0,
  suffix,
  width = 'w-16',
}: {
  value: number | undefined
  onChange: (v: number) => void
  step?: number
  min?: number
  suffix?: string
  width?: string
}) {
  const v = value ?? 0
  return (
    <div className="flex items-center gap-1">
      <button
        className="h-9 w-9 rounded-lg bg-surface-2 text-lg font-bold text-ink-dim active:bg-edge"
        onClick={() => onChange(Math.max(min, +(v - step).toFixed(1)))}
      >
        −
      </button>
      <div className={`${width} text-center`}>
        <input
          inputMode="decimal"
          className="w-full rounded-lg bg-transparent text-center text-[15px] font-extrabold text-ink outline-none"
          value={value === undefined ? '' : String(value)}
          placeholder="—"
          onChange={(e) => {
            const n = parseFloat(e.target.value)
            if (!Number.isNaN(n)) onChange(n)
            else if (e.target.value === '') onChange(min)
          }}
        />
        {suffix && <div className="text-[9px] font-semibold uppercase text-ink-faint">{suffix}</div>}
      </div>
      <button
        className="h-9 w-9 rounded-lg bg-surface-2 text-lg font-bold text-ink-dim active:bg-edge"
        onClick={() => onChange(+(v + step).toFixed(1))}
      >
        +
      </button>
    </div>
  )
}

export function Toggle({
  on,
  onChange,
  label,
  sub,
}: {
  on: boolean
  onChange: (v: boolean) => void
  label: string
  sub?: string
}) {
  return (
    <button
      onClick={() => onChange(!on)}
      className={`flex w-full items-center justify-between rounded-xl border p-3.5 text-left transition-colors ${
        on ? 'border-accent/40 bg-accent/10' : 'border-edge bg-surface-2'
      }`}
    >
      <div className="pr-3">
        <div className={`text-[14px] font-bold ${on ? 'text-accent-soft' : 'text-ink'}`}>{label}</div>
        {sub && <div className="mt-0.5 text-[11.5px] leading-snug text-ink-faint">{sub}</div>}
      </div>
      <div
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${on ? 'bg-accent' : 'bg-edge'}`}
      >
        <div
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${on ? 'translate-x-[22px]' : 'translate-x-0.5'}`}
        />
      </div>
    </button>
  )
}

export function EmptyNote({ children }: { children: ReactNode }) {
  return <div className="px-2 py-6 text-center text-[13px] text-ink-faint">{children}</div>
}

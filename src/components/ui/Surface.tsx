import type { ReactNode } from 'react'
import type { DayBanner } from '../../types'

// ============================================================
// Surfaces: the things content sits on or between.
// One card padding, one radius, one ring. Screens that want a
// different look pass a className rather than rebuilding the box.
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
  // Layered glass, not a gray box: a faint top-lit gradient plus a
  // hairline ring. Borders stay opt-in (pass a border color and the
  // transparent base width picks it up).
  return (
    <div
      onClick={onClick}
      className={`rounded-3xl border border-transparent bg-gradient-to-b from-white/[0.06] to-white/[0.025] p-5 ring-1 ring-white/[0.045] ${onClick ? 'press-soft cursor-pointer' : ''} ${className}`}
    >
      {children}
    </div>
  )
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-3 mt-9 flex items-baseline gap-3 px-1">
      <h2 className="eyebrow whitespace-nowrap text-ink-faint">{children}</h2>
      {/* hairline rule: headers read as dividers, not floating labels */}
      <span aria-hidden className="h-px min-w-4 flex-1 self-center bg-edge/70" />
      {right}
    </div>
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
    <div className={`border-l-2 py-1 pl-3 pr-1 text-label leading-snug ${tones[banner.tone]}`}>
      {banner.text}
    </div>
  )
}

export function EmptyNote({ children }: { children: ReactNode }) {
  return <div className="px-2 py-6 text-center text-label text-ink-faint">{children}</div>
}

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
  // A sticker, not glass: one flat fill and a visible 2px outline. The
  // gradient and the hairline ring were the app faking depth with light,
  // which on a phone reads as a smudge rather than as an edge. Screens
  // that want a coloured card pass a border colour; the width is already
  // here so it lands at 2px like everything else.
  return (
    <div
      onClick={onClick}
      className={`rounded-2xl border-2 border-edge bg-surface p-4 shadow-[0_3px_0_var(--color-edge)] ${onClick ? 'press-soft cursor-pointer' : ''} ${className}`}
    >
      {children}
    </div>
  )
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-2.5 mt-6 flex items-baseline gap-3 px-1">
      <h2 className="eyebrow whitespace-nowrap text-ink-faint">{children}</h2>
      {/* hairline rule: headers read as dividers, not floating labels */}
      <span aria-hidden className="h-0.5 min-w-4 flex-1 self-center rounded-sm bg-edge-soft" />
      {right}
    </div>
  )
}

const BANNER_TONE: Record<DayBanner['tone'], { tile: TileTone; label: string; ink: string }> = {
  info: { tile: 'ice', label: 'Heads up', ink: 'text-cyan' },
  warn: { tile: 'gold', label: 'Suggestion', ink: 'text-gold' },
  success: { tile: 'volt', label: 'Good', ink: '' },
}

export function BannerRow({ banner }: { banner: DayBanner }) {
  // The concept gives a suggestion its own gold-edged tile with a label on
  // it. A coloured left rule was the app whispering something it had gone
  // to real trouble to work out.
  const t = BANNER_TONE[banner.tone]
  return (
    <Tile tone={t.tile} className="!py-3">
      <div className={`eyebrow ${t.ink}`}>{t.label}</div>
      <p className="mt-1 text-[12px] font-bold leading-snug">{banner.text}</p>
    </Tile>
  )
}

export function EmptyNote({ children }: { children: ReactNode }) {
  return <div className="px-2 py-6 text-center text-label text-ink-faint">{children}</div>
}

// ============================================================
// The approved tile, and the two discs that sit inside it.
//
// `Card` is the same object with the app's older padding, kept
// because forty screens use it. `Tile` is the concept's version:
// tighter, tone-aware, and able to become a FILL rather than a
// tint. See research/OP12-visual-law.md for the geometry and
// research/OP12-screen-law.md for which screen wears which tone.
// ============================================================

export type TileTone = 'plain' | 'heat' | 'volt' | 'ice' | 'gold'

// A coloured tile borrows the tone's darker edge for BOTH its outline
// and its lip, which is what makes it read as one moulded object. Volt
// goes further and becomes the fill, because completion is the one
// state the concept lets shout.
const TILE_TONES: Record<TileTone, string> = {
  plain: 'border-edge bg-surface shadow-[0_3px_0_var(--color-edge)]',
  heat: 'border-accent-deep bg-surface shadow-[0_3px_0_var(--lip-accent)]',
  volt: 'border-[var(--lip-lime)] bg-lime text-[var(--ink-on-lime)] shadow-[0_4px_0_var(--lip-lime)]',
  ice: 'border-[var(--lip-ice)] bg-surface shadow-[0_3px_0_var(--lip-ice)]',
  gold: 'border-[var(--lip-gold)] bg-surface shadow-[0_3px_0_var(--lip-gold)]',
}

export function Tile({
  children,
  tone = 'plain',
  className = '',
  onClick,
  ariaLabel,
}: {
  children: ReactNode
  tone?: TileTone
  className?: string
  onClick?: () => void
  ariaLabel?: string
}) {
  const cls = `rounded-2xl border-2 px-4 py-3.5 ${TILE_TONES[tone]} ${className}`
  if (!onClick) return <div className={cls}>{children}</div>
  return (
    <button type="button" onClick={onClick} aria-label={ariaLabel} className={`press-soft w-full text-left ${cls}`}>
      {children}
    </button>
  )
}

/**
 * The icon disc. Heat is the loud one (a filled circle with its own
 * lip); panel is the quiet one that launcher rows wear.
 */
export function Coin({
  children,
  size = 52,
  tone = 'panel',
  className = '',
}: {
  children: ReactNode
  size?: number
  tone?: 'heat' | 'panel'
  className?: string
}) {
  const cls =
    tone === 'heat'
      ? 'bg-accent shadow-[0_4px_0_var(--lip-accent)]'
      : 'border-2 border-edge bg-surface-2 shadow-[0_3px_0_var(--color-edge)]'
  return (
    <span
      style={{ width: size, height: size }}
      className={`flex shrink-0 items-center justify-center rounded-full ${cls} ${className}`}
    >
      {children}
    </span>
  )
}

/**
 * The little square that carries a row's number: 4×6 on an exercise,
 * MON on a plan day, 52P on a meal. Same object every time, so a list
 * of them reads as a column rather than as three different lists.
 */
export function SetCoin({ children, className = '' }: { children: ReactNode; className?: string }) {
  // A square for 4x6, a short pill for "60s / side". Mobility days
  // prescribe in seconds and per-side reps, and a hard 40px box turned
  // those into four stacked lines of 8px type. The height never moves, so
  // a column of these still reads as a column.
  const len = typeof children === 'string' ? children.length : 3
  const size = len <= 5 ? 'text-[11px]' : len <= 8 ? 'text-[9.5px]' : 'text-[8.5px]'
  return (
    <span
      className={`flex h-10 min-w-10 shrink-0 items-center justify-center rounded-xl border-2 border-edge bg-surface-2 px-1.5 text-center font-black leading-[1.1] text-ink-dim shadow-[0_2px_0_var(--color-edge)] ${size} ${className}`}
    >
      {children}
    </span>
  )
}

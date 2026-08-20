import type { ReactNode } from 'react'

// ============================================================
// Chips: a label, or a tappable choice.
// ============================================================

type Tone = 'default' | 'accent' | 'lime' | 'cyan' | 'gold' | 'danger'

// Flat fills with a visible outline: a chip is a small sticker, and at
// 1px its border was a suggestion rather than an edge.
const TONES: Record<Tone, string> = {
  default: 'bg-surface text-ink-dim border-edge',
  accent: 'bg-accent/20 text-accent-soft border-accent/55',
  lime: 'bg-lime/15 text-lime border-lime/50',
  cyan: 'bg-cyan/15 text-cyan border-cyan/50',
  gold: 'bg-gold/15 text-gold border-gold/50',
  danger: 'bg-danger/15 text-danger border-danger/50',
}

export function Chip({
  children,
  tone = 'default',
  onClick,
  pressed,
  className = '',
}: {
  children: ReactNode
  tone?: Tone
  onClick?: () => void
  /** Filter chips that toggle: announces on/off rather than only colouring it. */
  pressed?: boolean
  className?: string
}) {
  const cls = `inline-flex items-center gap-1 whitespace-nowrap rounded-[11px] border-2 px-2.5 py-1 text-[11px] font-semibold tracking-normal ${TONES[tone]} ${onClick ? 'press cursor-pointer' : ''} ${className}`

  // A chip with a tap handler is a control, and controls are buttons.
  // These were spans, which is the same defect the onboarding chips were
  // fixed for: tappable with a finger, invisible to a keyboard and
  // silent to a screen reader. A label with no handler stays a span,
  // because it is text.
  if (!onClick) return <span className={cls}>{children}</span>
  return (
    <button
      type="button"
      onClick={onClick}
      {...(pressed === undefined ? {} : { 'aria-pressed': pressed })}
      className={cls}
    >
      {children}
    </button>
  )
}

/**
 * A chip that is a real choice: bigger tap target, a selected state, and
 * enough presence to be the primary thing on a screen. Used where the
 * fastest way to explain an option is to let someone tap it.
 */
export function ChoiceChip({
  children,
  onClick,
  selected = false,
  className = '',
}: {
  children: ReactNode
  onClick: () => void
  selected?: boolean
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`press-down rounded-[14px] border-2 px-4 py-2.5 text-[13.5px] font-bold [--lip:var(--lip-quiet)] ${
        selected
          ? 'border-accent/60 bg-accent/20 text-accent-soft'
          : 'border-edge bg-surface-2 text-ink'
      } ${className}`}
    >
      {children}
    </button>
  )
}

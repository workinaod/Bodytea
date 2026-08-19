import type { ReactNode } from 'react'

// ============================================================
// Chips: a label, or a tappable choice.
// ============================================================

type Tone = 'default' | 'accent' | 'lime' | 'cyan' | 'gold' | 'danger'

const TONES: Record<Tone, string> = {
  default: 'bg-white/[0.07] text-ink-dim border-white/[0.05]',
  accent: 'bg-accent/15 text-accent-soft border-accent/30',
  lime: 'bg-lime/10 text-lime border-lime/25',
  cyan: 'bg-cyan/10 text-cyan border-cyan/25',
  gold: 'bg-gold/10 text-gold border-gold/25',
  danger: 'bg-danger/10 text-danger border-danger/25',
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
  const cls = `inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-1 text-micro font-semibold tracking-normal ${TONES[tone]} ${onClick ? 'press cursor-pointer' : ''} ${className}`

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
      className={`press rounded-full px-4 py-2.5 text-[13.5px] font-semibold ring-1 ${
        selected
          ? 'bg-accent/18 text-accent-soft ring-accent/40 shadow-[0_1px_0_rgba(255,255,255,0.08)_inset]'
          : 'bg-white/[0.06] text-ink ring-white/[0.08] shadow-[0_1px_0_rgba(255,255,255,0.06)_inset]'
      } ${className}`}
    >
      {children}
    </button>
  )
}

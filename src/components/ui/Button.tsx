import type { ReactNode } from 'react'

// ============================================================
// Buttons.
//
// STICKERS, not glass. Every kind here is one flat fill, a
// visible 2px outline, and a 4px lip underneath that it sinks
// onto when pressed. No gradients, no inset highlights, no
// coloured glow: those were the app trying to fake depth with
// light, and light is the one thing a phone screen renders
// least convincingly.
//
// The lip is the whole trick. A button that scales is a screen
// effect; a button that drops onto its own shadow is an object
// you pushed. It costs one custom property per kind and it is
// the single detail that makes the whole surface read as
// physical.
//
// Screens pick a kind and a size, never their own padding.
// ============================================================

type Kind = 'primary' | 'lime' | 'ghost' | 'subtle' | 'danger'
type Size = 'sm' | 'md' | 'lg'

const KINDS: Record<Kind, string> = {
  // Flat fill, dark type, and an outline in the SAME colour as the lip.
  // Matching the outline to the lip is what makes the two read as one
  // moulded object; an outline only a shade off the fill reads as
  // nothing at all, which is what accent-deep on accent was doing.
  primary: 'bg-accent text-white font-extrabold border-[var(--lip-accent)] [--lip:var(--lip-accent)]',
  lime: 'bg-lime text-[var(--ink-on-lime)] font-extrabold border-[var(--lip-lime)] [--lip:var(--lip-lime)]',
  // Quiet kinds are SOLID surfaces now, not translucent white, and they
  // sit a step above the ground so their lip has something to be darker
  // than.
  ghost: 'bg-surface text-ink-dim font-extrabold border-edge [--lip:var(--lip-quiet)]',
  subtle: 'bg-surface-2 text-ink font-extrabold border-edge [--lip:var(--lip-quiet)]',
  danger: 'bg-danger text-white font-extrabold border-[var(--lip-danger)] [--lip:var(--lip-danger)]',
}

// The concept sets button labels UPPERCASE at 0.08em. It is the single
// loudest signal that a control is a control, and it costs nothing: an
// accessible name is unaffected by text-transform, so every spec that
// clicks by label keeps working.
const SIZES: Record<Size, string> = {
  sm: 'px-3.5 py-2 text-[11px]',
  md: 'px-4 py-3 text-[12.5px]',
  lg: 'px-5 py-4 text-[15px]',
}

export function Btn({
  children,
  onClick,
  kind = 'primary',
  size = 'md',
  className = '',
  disabled,
  shimmer = false,
  type,
  'aria-label': ariaLabel,
}: {
  children: ReactNode
  onClick?: () => void
  kind?: Kind
  size?: Size
  className?: string
  disabled?: boolean
  /** A highlight travels across it. For the one CTA a screen is about. */
  shimmer?: boolean
  type?: 'button' | 'submit'
  'aria-label'?: string
}) {
  return (
    <button
      type={type ?? 'button'}
      disabled={disabled}
      onClick={onClick}
      aria-label={ariaLabel}
      className={`press-down rounded-[14px] border-2 uppercase tracking-[0.08em] disabled:opacity-40 disabled:shadow-none ${shimmer && !disabled ? 'shimmer' : ''} ${KINDS[kind]} ${SIZES[size]} ${className}`}
    >
      <span className="relative z-10">{children}</span>
    </button>
  )
}

/**
 * A square tap target for a single glyph. Close buttons are always an X
 * and always this: 44px is the smallest thing a thumb hits reliably, and
 * the padding is inside the button so the icon can stay small.
 */
export function IconBtn({
  children,
  onClick,
  label,
  className = '',
}: {
  children: ReactNode
  onClick: () => void
  label: string
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`press grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 border-edge bg-surface-2 text-ink-dim ${className}`}
    >
      {children}
    </button>
  )
}

/** The standard close glyph, sized to sit inside an IconBtn. */
export function XIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M4 4l8 8M12 4l-8 8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

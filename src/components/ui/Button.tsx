import type { ReactNode } from 'react'

// ============================================================
// Buttons.
//
// What made these read as cheap: flat fills, one radius, no press
// feedback, and type that floated. Every kind here has an inset top
// highlight (light catching an edge), an ambient shadow in its own
// color, and a real press state from the motion system. Screens pick
// a kind and a size, never their own padding.
// ============================================================

type Kind = 'primary' | 'lime' | 'ghost' | 'subtle' | 'danger'
type Size = 'sm' | 'md' | 'lg'

const KINDS: Record<Kind, string> = {
  // Solid CTAs: gradient body, hairline of light along the top edge,
  // and a glow tinted to match so they sit on the page rather than on top of it.
  primary:
    'bg-gradient-to-b from-accent to-accent-deep text-black font-bold shadow-[0_1px_0_rgba(255,255,255,0.35)_inset,0_8px_24px_-8px_rgba(255,79,48,0.65)]',
  lime: 'bg-gradient-to-b from-lime to-[#a9d63d] text-black font-bold shadow-[0_1px_0_rgba(255,255,255,0.4)_inset,0_8px_24px_-8px_rgba(198,242,78,0.5)]',
  // Quiet kinds stay translucent glass, never opaque gray.
  ghost:
    'bg-white/[0.05] text-ink-dim font-semibold ring-1 ring-white/[0.07] shadow-[0_1px_0_rgba(255,255,255,0.06)_inset]',
  subtle:
    'bg-white/[0.09] text-ink font-semibold ring-1 ring-white/[0.09] shadow-[0_1px_0_rgba(255,255,255,0.09)_inset]',
  danger: 'bg-danger/12 text-danger font-bold ring-1 ring-danger/25',
}

const SIZES: Record<Size, string> = {
  sm: 'px-3.5 py-2 text-label',
  md: 'px-5 py-3 text-[13.5px]',
  lg: 'px-6 py-4 text-body',
}

export function Btn({
  children,
  onClick,
  kind = 'primary',
  size = 'md',
  className = '',
  disabled,
  type,
  'aria-label': ariaLabel,
}: {
  children: ReactNode
  onClick?: () => void
  kind?: Kind
  size?: Size
  className?: string
  disabled?: boolean
  type?: 'button' | 'submit'
  'aria-label'?: string
}) {
  return (
    <button
      type={type ?? 'button'}
      disabled={disabled}
      onClick={onClick}
      aria-label={ariaLabel}
      className={`press rounded-full tracking-[0.01em] disabled:opacity-40 disabled:shadow-none ${KINDS[kind]} ${SIZES[size]} ${className}`}
    >
      {children}
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
      className={`press grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/[0.07] text-ink-dim ring-1 ring-white/[0.07] ${className}`}
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

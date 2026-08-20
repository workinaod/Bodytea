// ============================================================
// Sticker icons: flat, two-tone, no strokes.
//
// The app's `glyphs.tsx` set is line art, which is the right
// call for a tab bar and the wrong call for everything the
// approved concept puts inside a coin. A sticker has a main
// fill and one darker facet on its lower half, so it reads as
// a moulded object at 22px the same way the buttons do. No
// emoji, ever: an emoji is somebody else's art direction.
//
// Transcribed from the approved preview. See
// research/OP5-screen-law.md for which screen uses which.
// ============================================================

export type StickerName =
  | 'bolt'
  | 'dumbbell'
  | 'dumbbell-lit'
  | 'calendar'
  | 'bars'
  | 'person'
  | 'trophy'
  | 'medal'
  | 'runner'
  | 'book'
  | 'redo'
  | 'wrench'
  | 'check'

// The neutral sticker palette: one light face, one shaded facet.
const FACE = '#E9F2F7'
const SHADE = '#B9C9D3'
const DEEP = '#8FA6B2'

const BODIES: Record<StickerName, React.ReactNode> = {
  bolt: (
    <>
      <path d="M13.5 1.5 4.5 13.5h6l-1 9 9-12h-6l1-9Z" fill="var(--color-gold)" />
      <path d="M9.5 22.5l1-9h-3z M18.5 10.5h-6l.4-3.6z" fill="#CFA100" />
    </>
  ),
  dumbbell: (
    <>
      <rect x="8" y="10.6" width="8" height="2.8" rx="1.2" fill={FACE} />
      <rect x="4.6" y="7.4" width="3" height="9.2" rx="1.4" fill={FACE} />
      <rect x="16.4" y="7.4" width="3" height="9.2" rx="1.4" fill={FACE} />
      <rect x="1.8" y="9" width="2.4" height="6" rx="1.2" fill={SHADE} />
      <rect x="19.8" y="9" width="2.4" height="6" rx="1.2" fill={SHADE} />
      <path d="M4.6 12h3v4.6h-3z M16.4 12h3v4.6h-3z" fill={SHADE} opacity=".55" />
    </>
  ),
  // The same bar on a heat coin, where the neutral face would disappear.
  'dumbbell-lit': (
    <>
      <rect x="8" y="10.6" width="8" height="2.8" rx="1.2" fill="#fff" />
      <rect x="4.6" y="7.4" width="3" height="9.2" rx="1.4" fill="#fff" />
      <rect x="16.4" y="7.4" width="3" height="9.2" rx="1.4" fill="#fff" />
      <rect x="1.8" y="9" width="2.4" height="6" rx="1.2" fill="#FFD9CC" />
      <rect x="19.8" y="9" width="2.4" height="6" rx="1.2" fill="#FFD9CC" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.4" y="4.6" width="17.2" height="16" rx="4" fill={FACE} />
      <rect x="3.4" y="4.6" width="17.2" height="5.4" rx="4" fill={SHADE} />
      <rect x="6.6" y="2.6" width="2.6" height="4.4" rx="1.3" fill={DEEP} />
      <rect x="14.8" y="2.6" width="2.6" height="4.4" rx="1.3" fill={DEEP} />
      <rect x="6.8" y="12.4" width="4.2" height="3.4" rx="1.1" fill={DEEP} />
      <rect x="13" y="12.4" width="4.2" height="3.4" rx="1.1" fill={SHADE} />
    </>
  ),
  bars: (
    <>
      <rect x="3.4" y="13" width="4.6" height="8" rx="1.6" fill={SHADE} />
      <rect x="9.7" y="8" width="4.6" height="13" rx="1.6" fill={FACE} />
      <rect x="16" y="3.4" width="4.6" height="17.6" rx="1.6" fill="var(--color-accent)" />
      <path d="M16 12h4.6v9H16z" fill="var(--color-accent-deep)" opacity=".7" />
    </>
  ),
  person: (
    <>
      <circle cx="12" cy="8" r="4.6" fill={FACE} />
      <path
        d="M3.6 20.6c1.5-4.2 4.6-6.2 8.4-6.2s6.9 2 8.4 6.2c.2.7-.3 1.4-1 1.4H4.6c-.7 0-1.2-.7-1-1.4Z"
        fill={SHADE}
      />
    </>
  ),
  trophy: (
    <>
      <path d="M7 3.4h10v6.2a5 5 0 0 1-10 0Z" fill="var(--color-gold)" />
      <path
        d="M7 6H4.2a3.4 3.4 0 0 0 3.4 3.8M17 6h2.8a3.4 3.4 0 0 1-3.4 3.8"
        fill="none"
        stroke="#CFA100"
        strokeWidth="2"
      />
      <path d="M10.6 13.6h2.8V17h-2.8z" fill="#CFA100" />
      <rect x="7.6" y="17" width="8.8" height="3.4" rx="1.4" fill="var(--color-gold)" />
      <path d="M7.6 18.7h8.8v1.7H7.6z" fill="#CFA100" opacity=".8" />
    </>
  ),
  medal: (
    <>
      <path d="M8 2.6h8l-2.4 6h-3.2Z" fill="var(--color-accent)" />
      <circle cx="12" cy="14.6" r="6.4" fill="var(--color-gold)" />
      <circle cx="12" cy="14.6" r="3.6" fill="#CFA100" />
      <path d="M12 12.2l.9 1.8 2 .3-1.5 1.4.4 2-1.8-1-1.8 1 .4-2-1.5-1.4 2-.3Z" fill="#FFE9A8" />
    </>
  ),
  runner: (
    <>
      <circle cx="15.4" cy="4.6" r="2.2" fill={FACE} />
      <path
        d="M9 8.6l4.2-1.8 2.6 3.4 3.4 1v2.4l-4.4-1.2-1.6-2-1.4 4 3 2.6-.8 5h-2.4l.6-4-3-2.4-2 4.4H4.6l3-6.6L9 8.6Z"
        fill={SHADE}
      />
    </>
  ),
  book: (
    <>
      <path
        d="M4 4.6c2.6-1 5.2-1 8 .6 2.8-1.6 5.4-1.6 8-.6v13.8c-2.6-1-5.2-1-8 .6-2.8-1.6-5.4-1.6-8-.6Z"
        fill={FACE}
      />
      <path d="M12 5.2v13.8" stroke={DEEP} strokeWidth="1.6" />
      <path
        d="M4 15.2v3.2c2.6-1 5.2-1 8 .6 2.8-1.6 5.4-1.6 8-.6v-3.2c-2.6-1-5.2-1-8 .6-2.8-1.6-5.4-1.6-8-.6Z"
        fill={SHADE}
      />
    </>
  ),
  redo: <path d="M12 4.2a8 8 0 1 0 7.6 5.6h-2.5A5.6 5.6 0 1 1 12 6.6V10l5.4-4.2L12 1.6Z" fill={SHADE} />,
  wrench: (
    <path
      d="M20.8 6.4a5.4 5.4 0 0 1-7 6.8L7 20a2.3 2.3 0 0 1-3.2-3.2l6.8-6.8a5.4 5.4 0 0 1 6.8-7l-3 3 .6 3.2 3.2.6Z"
      fill={SHADE}
    />
  ),
  check: (
    <path
      d="M4 12.5 10 18.5 20 6.5"
      fill="none"
      stroke="var(--color-lime)"
      strokeWidth="3.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
}

// The badge categories, in stickers. The achievement table carries an
// emoji per category as a placeholder for artwork; the approved concept
// has no emoji anywhere, so this is the artwork. Eleven categories map
// onto five marks on purpose: a distinct icon per category would be
// eleven shapes nobody can tell apart at 22px.
const BY_CATEGORY: Record<string, StickerName> = {
  streak: 'medal',
  clock: 'calendar',
  consistency: 'calendar',
  progression: 'bars',
  strength: 'trophy',
  cardio: 'runner',
  programming: 'wrench',
  feat: 'bolt',
  social: 'person',
  competition: 'trophy',
  goal: 'medal',
}

export function stickerForCategory(category: string): StickerName {
  return BY_CATEGORY[category] ?? 'medal'
}

export function Sticker({
  name,
  size = 22,
  className = '',
}: {
  name: StickerName
  size?: number
  className?: string
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={`block shrink-0 ${className}`}
      aria-hidden
    >
      {BODIES[name]}
    </svg>
  )
}

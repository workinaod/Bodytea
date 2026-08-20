// ============================================================
// The app's glyph set. One source of truth: the tab bar draws
// these at 22px, the onboarding welcome draws the same shapes
// bigger, so what someone sees before they start is literally
// what they navigate with afterwards.
//
// House style: 24-unit box, 2px stroke, round caps and joins,
// no fills except where `active` lights one up.
// ============================================================

export type GlyphName = 'today' | 'train' | 'plan' | 'progress' | 'me' | 'track'

function Svg({ size, children }: { size: number; children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  )
}

/**
 * `active` is the tab-bar lit state: it fills the shape and is drawn in
 * the accent. Everywhere else the glyph inherits `currentColor`.
 */
export function Glyph({
  name,
  size = 22,
  active = false,
}: {
  name: GlyphName
  size?: number
  active?: boolean
}) {
  const lit = active ? 'var(--color-accent)' : undefined
  return (
    <span style={{ color: lit, display: 'inline-flex' }}>
      <Svg size={size}>{BODIES[name](active)}</Svg>
    </span>
  )
}

const BODIES: Record<GlyphName, (a: boolean) => React.ReactNode> = {
  // A bolt: today is the day you actually do the work
  today: (a) => <path d="M13 2 4.5 13.5H11L10 22l8.5-11.5H12L13 2Z" fill={a ? 'currentColor' : 'none'} />,
  // A loaded bar: the room you go to, not the day you are on
  train: (a) => (
    <>
      <path d="M2 12h2M20 12h2M7.5 12h9" />
      <rect x="4.5" y="8.5" width="3" height="7" rx="1" fill={a ? 'currentColor' : 'none'} />
      <rect x="16.5" y="8.5" width="3" height="7" rx="1" fill={a ? 'currentColor' : 'none'} />
    </>
  ),
  // The calendar, which is what a plan looks like from above
  plan: (a) => (
    <>
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M3 10h18M8 3v4M16 3v4" />
      {a && <circle cx="12" cy="15" r="2" fill="currentColor" stroke="none" />}
    </>
  ),
  // Bars climb left to right: progress goes UP
  progress: () => <path d="M4 20v-5M10 20V9M16 20V4M21 20H3" />,
  // A person. Not a whistle: this tab is who you are, not who is shouting
  me: (a) => (
    <>
      <circle cx="12" cy="8" r="3.6" fill={a ? 'currentColor' : 'none'} />
      <path d="M4.8 20.5a7.2 7.2 0 0 1 14.4 0" />
    </>
  ),
  // A route with a start and a finish: everything cardio lives here
  track: (a) => (
    <>
      <path d="M5.5 19c3.2 0 3.2-5 6.5-5s3.3-5 6.5-5" />
      <circle cx="5.5" cy="19" r="1.9" fill={a ? 'currentColor' : 'none'} />
      <circle cx="18.5" cy="9" r="1.9" fill={a ? 'currentColor' : 'none'} />
    </>
  ),
}

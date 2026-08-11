// ============================================================
// The app's glyph set. One source of truth: the tab bar draws
// these at 22px, the onboarding welcome draws the same shapes
// bigger, so what someone sees before they start is literally
// what they navigate with afterwards.
//
// House style: 24-unit box, 2px stroke, round caps and joins,
// no fills except where `active` lights one up.
// ============================================================

export type GlyphName = 'today' | 'week' | 'meals' | 'progress' | 'coach' | 'track'

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
  // The week's calendar
  week: (a) => (
    <>
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M3 10h18M8 3v4M16 3v4" />
      {a && <circle cx="12" cy="15" r="2" fill="currentColor" stroke="none" />}
    </>
  ),
  // Fork and a real, closed-blade knife
  meals: () => (
    <>
      <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
      <path d="M7 2v20" />
      <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
    </>
  ),
  // Bars climb left to right: progress goes UP
  progress: () => <path d="M4 20v-5M10 20V9M16 20V4M21 20H3" />,
  // The Sergeant's whistle
  coach: (a) => (
    <>
      <path d="M9.5 9H20a1.5 1.5 0 0 1 1.5 1.5v1.2a1.5 1.5 0 0 1-1.1 1.45L15 14.4A5.5 5.5 0 1 1 9.5 9Z" />
      <circle cx="9.5" cy="14.5" r="1.6" fill={a ? 'currentColor' : 'none'} />
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

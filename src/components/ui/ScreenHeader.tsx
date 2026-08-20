import type { ReactNode } from 'react'

// ============================================================
// The one header every tab wears.
//
// Meals set the pattern (centred, small, uppercase, widely
// tracked) and Today matched it, but Progress and Coach had big
// left-aligned headlines instead. Three headers in one app.
//
// The title is absolutely centred rather than sitting in a flex
// row, because Coach hangs three icons off the right and a
// flex row would shove the title left to make room. Centred is
// centred regardless of what the slots carry.
// ============================================================

export function ScreenHeader({
  title,
  onTitleTap,
  left,
  right,
  sub,
  slim = false,
}: {
  title: string
  /** Tapping the title, e.g. "jump back to today" on date-scoped tabs. */
  onTitleTap?: () => void
  left?: ReactNode
  right?: ReactNode
  /** One quiet line under the title. Used sparingly. */
  sub?: ReactNode
  /**
   * This header is inside another screen's, so it drops the reserved
   * gutters and the tap height and becomes one compact centred row.
   * Two full-size headers stacked is what an embedded screen looks
   * like when nobody thought about it.
   */
  slim?: boolean
}) {
  // The screen's name, per research/OP5-visual-law.md: 11px, 900, tracked
  // wide enough to read as a plate on a door rather than as a heading.
  const label = (
    <span className="block truncate text-[11px] font-black uppercase tracking-[0.22em] text-ink-faint">
      {title}
    </span>
  )
  const inner = (
    <>
      {onTitleTap ? (
        <button onClick={onTitleTap} className="pointer-events-auto max-w-full px-2 py-1 text-center">
          {label}
        </button>
      ) : (
        label
      )}
      {sub}
    </>
  )
  if (slim) {
    return (
      <div className="flex items-center justify-center gap-1">
        {left}
        <div className="flex min-w-0 flex-col items-center">{inner}</div>
        {right}
      </div>
    )
  }
  return (
    <div className="relative flex min-h-11 items-center justify-between">
      {/* Slots sit in the flow so they stay tappable; the title floats
          above them and is centred on the screen, not on what is left
          over after the slots have taken their space.

          The 104px gutters are the width of Coach's three-button
          cluster, the widest slot in the app. Reserving them on both
          sides keeps the title screen-centred AND out from under the
          buttons; anything longer truncates instead of colliding. */}
      <div className="flex items-center gap-1">{left}</div>
      <div className="pointer-events-none absolute inset-x-0 flex flex-col items-center px-[104px]">
        {inner}
      </div>
      <div className="flex items-center gap-1">{right}</div>
    </div>
  )
}

/** The ‹ › a date-scoped tab uses to step back and forth. */
export function DayArrow({
  dir,
  onClick,
  unit = 'day',
}: {
  dir: 'prev' | 'next'
  onClick: () => void
  /** What one press moves by. Week steps weeks, everyone else steps days. */
  unit?: 'day' | 'week'
}) {
  return (
    <button
      aria-label={`${dir === 'prev' ? 'Previous' : 'Next'} ${unit}`}
      onClick={onClick}
      className="press px-3 py-2 text-[17px] font-bold text-ink-faint"
    >
      {dir === 'prev' ? '‹' : '›'}
    </button>
  )
}

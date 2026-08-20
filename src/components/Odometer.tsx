// ============================================================
// A number rolling over, the way a counter does.
//
// The column holds the new value ABOVE the old one and starts
// shifted up, so releasing it rolls the count upward into
// place. Dealing the new value in from below would read as a
// replacement; rolling up reads as an increment, which is what
// a streak day actually is.
//
// Only the last digit-group moves, because only it changed.
// ============================================================

export function Odometer({
  value,
  play,
  className = '',
}: {
  value: number
  /** Flip true at the moment the day is banked, not on mount. */
  play: boolean
  className?: string
}) {
  const previous = value - 1
  return (
    <span
      className={`relative inline-block overflow-hidden align-bottom ${className}`}
      style={{ height: '1em', lineHeight: 1 }}
      // The rolled-to value is the truth; the animation is decoration
      // over it, so a screen reader is told the destination only.
      aria-label={String(value)}
    >
      <span className={`block ${play ? 'roll' : ''}`} aria-hidden>
        <span className="block" style={{ height: '1em', lineHeight: 1 }}>
          {value}
        </span>
        <span className="block" style={{ height: '1em', lineHeight: 1 }}>
          {previous}
        </span>
      </span>
    </span>
  )
}

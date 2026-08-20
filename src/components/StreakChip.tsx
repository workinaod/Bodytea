import { Flame } from './Flame'
import { flameFor } from '../plan/achievements'

// ============================================================
// The streak, small enough to live in a top bar.
//
// The full StreakBadge names its tier and belongs on a profile.
// This is the glance version: the flame and the number, nothing
// else, because it sits above the one thing the screen is
// actually asking somebody to do.
//
// Nothing at zero. A streak that has not started is not a
// number worth printing.
// ============================================================

export function StreakChip({
  streak,
  onTap,
  size = 16,
}: {
  streak: number
  /** Usually a jump to Progress, where the streak's whole story is. */
  onTap?: () => void
  size?: number
}) {
  if (!flameFor(streak)) return null
  const inner = (
    <>
      <Flame streak={streak} size={size} />
      <span className="num text-[15px] font-extrabold leading-none">{streak}</span>
    </>
  )
  if (!onTap) return <span className="inline-flex items-center gap-1.5">{inner}</span>
  return (
    <button
      onClick={onTap}
      aria-label={`${streak} day streak`}
      className="press inline-flex items-center gap-1.5 rounded-full px-1 py-0.5"
    >
      {inner}
    </button>
  )
}

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
// At zero there is no fire, because there is no streak, and
// drawing one would be the app lying about the only number it
// exists to defend. It says so instead. An empty slot is worse
// than an honest one: the HUD's whole job is to be the pressure.
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
  const lit = !!flameFor(streak)
  const inner = lit ? (
    <>
      <Flame streak={streak} size={size} />
      <span className="num text-[16px] font-black leading-none text-accent-soft">{streak}</span>
    </>
  ) : (
    <>
      {/* A cold coal. Same footprint as the flame, none of its light. */}
      <span
        aria-hidden
        className="h-[9px] w-[9px] shrink-0 rounded-full border-2 border-edge bg-surface-2"
        style={{ marginInline: (size - 9) / 2 }}
      />
      <span className="text-[12px] font-black leading-none text-ink-faint">No streak yet</span>
    </>
  )
  if (!onTap) return <span className="inline-flex items-center gap-1.5">{inner}</span>
  return (
    <button
      onClick={onTap}
      aria-label={lit ? `${streak} day streak` : 'No streak yet'}
      className="press inline-flex items-center gap-1.5 rounded-full px-1 py-0.5"
    >
      {inner}
    </button>
  )
}

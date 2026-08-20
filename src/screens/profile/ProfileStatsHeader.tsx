import { useMemo } from 'react'
import type { AppData, ISODate } from '../../types'
import { Chip, Tile } from '../../components/ui'
import { Flame } from '../../components/Flame'
import { streakDays } from '../../engine/streak'
import { computeBoardStats } from '../../engine/board'
import { flameFor, nextFlameTier } from '../../plan/achievements'

// ============================================================
// Who you are, at the top of your own tab.
//
// The avatar slot is deliberately a DASHED outline holding your
// initial. There is no trainee avatar yet, and a filled circle
// with a letter in it would pretend the feature is finished.
// A dashed frame reads as a space reserved for something, which
// is exactly what it is.
//
// Every number here is the real one, and the Board line says
// "unranked" out loud rather than inventing a standing.
// ============================================================

export function ProfileStatsHeader({
  data,
  today,
  badges,
  onOpenProgress,
}: {
  data: AppData
  today: ISODate
  badges: number
  onOpenProgress?: () => void
}) {
  const streak = useMemo(() => streakDays(data, today), [data, today])
  const board = useMemo(() => computeBoardStats(data, today), [data, today])
  const tier = flameFor(streak)
  const next = nextFlameTier(streak)
  const name = (data.profile.displayName ?? '').trim()
  const initial = name.charAt(0).toUpperCase() || '·'

  return (
    <Tile tone="heat" className="!px-4 !py-4">
      <div className="flex items-center gap-3">
        <span className="flex h-[58px] w-[58px] shrink-0 flex-col items-center justify-center rounded-[18px] border-2 border-dashed border-accent-deep bg-surface-2">
          <b className="text-[20px] font-black text-accent-soft">{initial}</b>
          <span className="mt-px w-full px-0.5 text-center text-[6px] font-black uppercase leading-[1.1] tracking-normal text-ink-faint">
            Trainee soon
          </span>
        </span>
        <div className="min-w-0">
          <div className="text-[21px] font-black leading-tight">{name || 'You'}</div>
          <div className="mt-0.5 flex items-center gap-1.5">
            {tier ? (
              <>
                <Flame streak={streak} size={14} />
                <b className="num text-[13px] font-black">×{streak}</b>
                <Chip tone="accent" className="!px-2 !py-0.5 !text-[9px]">
                  {tier.name}
                </Chip>
              </>
            ) : (
              <span className="text-[12px] font-bold text-ink-dim">No streak yet. One session starts it.</span>
            )}
          </div>
          {tier && next && (
            <div className="mt-0.5 text-[10.5px] font-extrabold text-ink-faint">
              {next.daysAway} more day{next.daysAway === 1 ? '' : 's'} to {next.tier.name}
            </div>
          )}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Chip>
          <b className="num font-black text-ink">{board.sessionsTotal}</b> sessions
        </Chip>
        <Chip>
          <b className="num font-black text-ink">{badges}</b> badges
        </Chip>
        {/* The Board ranks on 30 days of real adherence. Under that it says
            so, because a made-up standing is worse than none. */}
        <Chip tone="gold" onClick={onOpenProgress}>
          {board.consistency30 === null ? 'Board · unranked yet' : `Board · ${board.consistency30}% honored`}
        </Chip>
      </div>
    </Tile>
  )
}

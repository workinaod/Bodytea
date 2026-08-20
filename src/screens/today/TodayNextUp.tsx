import { useMemo } from 'react'
import type { AppData, ISODate } from '../../types'
import { Card } from '../../components/ui'
import { athleteFacts } from '../../engine/achievementFacts'
import { evaluateAchievements, nextUp } from '../../engine/achievements'

// ============================================================
// The two badges you are closest to, with live bars.
//
// Not a quest system: nothing here is invented busywork, and
// nothing is assigned. These are the real achievements the
// engine already tracks, sorted by how close they are, so the
// screen can answer "what am I nearly at" without anybody
// opening a trophy case to find out.
//
// Silent when there is nothing honest to show, which is most
// of week one.
// ============================================================

export function TodayNextUp({
  data,
  today,
  onOpenProgress,
}: {
  data: AppData
  today: ISODate
  onOpenProgress?: () => void
}) {
  const next = useMemo(
    () => nextUp(evaluateAchievements(data, today, athleteFacts(data, today)), 2),
    [data, today],
  )
  if (next.length === 0) return null

  return (
    <Card className="!py-3.5">
      <div className="flex items-baseline justify-between">
        <span className="eyebrow text-ink-faint">Next up</span>
        {onOpenProgress && (
          <button onClick={onOpenProgress} className="text-[11.5px] font-bold text-cyan">
            All badges ›
          </button>
        )}
      </div>
      <div className="mt-2.5 space-y-2.5">
        {next.map((s) => (
          <div key={s.def.id}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="truncate text-[12.5px] font-bold">{s.def.name}</span>
              <span className="num shrink-0 text-[11px] text-ink-faint">
                {Math.floor(s.progress)}/{s.target}
              </span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2">
              <div
                className="grow h-full rounded-full bg-accent"
                style={{ width: `${Math.min(100, (s.progress / s.target) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

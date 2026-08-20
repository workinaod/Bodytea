import { useMemo } from 'react'
import type { AppData, ISODate } from '../../types'
import { QBar, Tile } from '../../components/ui'
import { Sticker, stickerForCategory } from '../../components/stickers'
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
// This is the PULL. You should never leave a session without
// seeing the next thing you are close to.
//
// Silent when there is nothing honest to show, which is most
// of week one.
// ============================================================

export function TodayNextUp({
  data,
  today,
  onOpenBadges,
}: {
  data: AppData
  today: ISODate
  onOpenBadges?: () => void
}) {
  const next = useMemo(
    () => nextUp(evaluateAchievements(data, today, athleteFacts(data, today)), 2),
    [data, today],
  )
  if (next.length === 0) return null

  return (
    <Tile className="!py-3">
      <div className="flex items-baseline justify-between">
        <span className="eyebrow text-ink-faint">Next up</span>
        {onOpenBadges && (
          <button onClick={onOpenBadges} className="press text-[11.5px] font-black text-cyan">
            All badges ›
          </button>
        )}
      </div>
      <div className="mt-2.5 space-y-2.5">
        {next.map((s) => (
          <div key={s.def.id} className="flex items-center gap-2.5">
            <Sticker name={stickerForCategory(s.def.category)} size={22} />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-3">
                <span className="truncate text-[12.5px] font-extrabold">{s.def.name}</span>
                <span className="num shrink-0 text-[11.5px] font-bold text-ink-faint">
                  {Math.floor(s.progress)}/{s.target}
                </span>
              </div>
              <QBar className="mt-1" pct={(s.progress / s.target) * 100} />
            </div>
          </div>
        ))}
      </div>
    </Tile>
  )
}

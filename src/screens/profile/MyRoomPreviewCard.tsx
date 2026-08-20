import { useMemo } from 'react'
import type { AppData, ISODate } from '../../types'
import { Tile } from '../../components/ui'
import { Sticker, stickerForCategory } from '../../components/stickers'
import { evaluateAchievements } from '../../engine/achievements'
import { athleteFacts } from '../../engine/achievementFacts'

// ============================================================
// My Room: the shelf your work builds.
//
// A Phase 5 socket, and it is labelled as one. What is real
// today is the RULE, and the rule is the whole idea: every item
// on this shelf was earned by something you did, none of it can
// be bought, and each one can say what earned it and when.
//
// So the preview shows real earned badges as objects rather
// than three invented trophies. An empty shelf says what would
// fill it instead of showing silhouettes of things nobody has.
// ============================================================

export function MyRoomPreviewCard({ data, today }: { data: AppData; today: ISODate }) {
  const items = useMemo(
    () =>
      evaluateAchievements(data, today, athleteFacts(data, today))
        .filter((s) => s.earned)
        .slice(0, 3),
    [data, today],
  )

  return (
    <Tile>
      <div className="flex items-baseline justify-between">
        <span className="eyebrow text-ink-faint">My Room</span>
        <span className="rounded-[10px] border-2 border-[var(--lip-gold)] px-1.5 py-px text-[8px] font-black uppercase tracking-[0.08em] text-gold">
          Phase 5 socket
        </span>
      </div>
      <div className="mt-2.5 flex items-end justify-around rounded-xl border-2 border-edge-soft bg-surface-2 px-2.5 pb-2.5 pt-3">
        {items.length === 0 ? (
          <p className="py-2 text-center text-[11px] font-bold text-ink-faint">
            Nothing on the shelf yet. The first badge you earn puts something here.
          </p>
        ) : (
          items.map((s) => (
            <div key={s.def.id} className="flex w-1/3 flex-col items-center gap-1">
              <Sticker name={stickerForCategory(s.def.category)} size={26} />
              <span className="text-center text-[7.5px] font-black uppercase leading-tight tracking-[0.04em] text-ink-faint">
                {s.def.name}
              </span>
            </div>
          ))
        )}
      </div>
      <p className="mt-2 text-[10px] font-bold leading-snug text-ink-faint">
        Every item is earned, never bought. Tap one to see what earned it and when.
      </p>
    </Tile>
  )
}

import { useMemo, useState } from 'react'
import type { AppData, ISODate } from '../../types'
import { BEFORE_TRACKING } from '../../types'
import { evaluateAchievements, type AchievementState } from '../../engine/achievements'
import { athleteFacts } from '../../engine/achievementFacts'
import { formatShort } from '../../engine/calendar'
import { CATEGORY_INFO, CATEGORY_ORDER, type AchievementCategory } from '../../plan/achievements'
import { Chip, QBar, Tile } from '../../components/ui'
import { Sheet } from '../../components/Sheet'
import { Sticker, stickerForCategory } from '../../components/stickers'

// ============================================================
// Every badge: what earns it, where you stand, and when you
// got it.
//
// It used to be a trophy case under Progress, three columns of
// emoji in circles. Two things changed. It moved to Profile,
// because what you have earned is identity rather than a
// metric. And every row now answers the three questions a badge
// is actually asked: what is this, how far am I, and when did
// I get it.
//
// The earned DATE is the new part, and the honest part. Badges
// cleared before the app started writing dates down say
// "earned before tracking" rather than being handed a date
// nobody recorded.
// ============================================================

function earnedLabel(log: AppData['achievements'], id: string): string {
  const at = log?.earnedAt?.[id]
  if (!at) return 'Earned'
  if (at === BEFORE_TRACKING) return 'Earned before tracking'
  return `Earned ${formatShort(at)}`
}

function BadgeRow({
  state,
  log,
  onOpen,
}: {
  state: AchievementState
  log: AppData['achievements']
  onOpen: () => void
}) {
  const { def, earned, count } = state
  return (
    <Tile tone={earned ? 'gold' : 'plain'} onClick={onOpen} ariaLabel={def.name} className="!py-3">
      <div className="flex gap-3">
        <Sticker
          name={stickerForCategory(def.category)}
          size={38}
          className={earned ? '' : 'opacity-55 grayscale'}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <b className="truncate text-[14.5px] font-black">{def.name}</b>
            <span
              className={`shrink-0 text-[10px] font-black uppercase tracking-wide ${earned ? 'text-gold' : 'text-ink-faint'}`}
            >
              {earned ? earnedLabel(log, def.id) : def.pending ? 'Soon' : 'Locked'}
            </span>
          </div>
          <div className="mt-px text-[11.5px] font-bold text-ink-dim">{def.requirement}</div>
          {earned ? (
            <div className="mt-1.5 text-[10px] font-extrabold text-ink-faint">
              {def.repeatable && count > 1
                ? `Cleared ${count} times. Adds to My Room.`
                : 'Adds to My Room.'}
            </div>
          ) : def.pending ? (
            <div className="mt-1.5 text-[10px] font-extrabold text-ink-faint">
              Waiting on a feature that has not shipped. Here so you can see it coming.
            </div>
          ) : (
            <>
              <QBar className="mt-2" pct={(state.progress / state.target) * 100} />
              <div className="num mt-1 text-[10px] font-extrabold text-ink-faint">
                Progress: {Math.floor(state.progress)} / {state.target}
                {def.unit ? ` ${def.unit}` : ''}
              </div>
            </>
          )}
        </div>
      </div>
    </Tile>
  )
}

/** The four-tile preview that lives on Profile. */
export function BadgeGrid({
  data,
  today,
  onOpenAll,
}: {
  data: AppData
  today: ISODate
  onOpenAll: () => void
}) {
  const states = useMemo(
    () => evaluateAchievements(data, today, athleteFacts(data, today)),
    [data, today],
  )
  // Two you have, two you are closest to. A grid of locked silhouettes is
  // a list of things you have not done.
  const earned = states.filter((s) => s.earned).slice(0, 2)
  const close = states
    .filter((s) => !s.earned && !s.def.pending && s.progress > 0)
    .sort((a, b) => b.progress / b.target - a.progress / a.target)
    .slice(0, 4 - earned.length)
  const shown = [...earned, ...close]

  return (
    <Tile>
      <div className="flex items-baseline justify-between">
        <span className="eyebrow text-ink-faint">Badges</span>
        <button onClick={onOpenAll} className="press text-[11.5px] font-black text-cyan">
          All badges ›
        </button>
      </div>
      <div className="mt-2.5 flex gap-2">
        {shown.map((s) => (
          <div
            key={s.def.id}
            className={`flex-1 rounded-xl border-2 bg-surface-2 px-1 py-2 text-center ${
              s.earned ? 'border-[var(--lip-gold)]' : 'border-edge opacity-75'
            }`}
          >
            <div className="flex justify-center">
              <Sticker
                name={stickerForCategory(s.def.category)}
                size={22}
                className={s.earned ? '' : 'opacity-60 grayscale'}
              />
            </div>
            <div className="mt-1 truncate text-[9px] font-black">{s.def.name}</div>
            {s.earned ? (
              <div className="text-[7.5px] font-extrabold uppercase text-ink-faint">Earned</div>
            ) : (
              <QBar className="mt-1 !h-1.5 !border" pct={(s.progress / s.target) * 100} />
            )}
          </div>
        ))}
      </div>
    </Tile>
  )
}

/** The whole set, filterable, in a sheet. */
export function BadgeSheet({
  data,
  today,
  open,
  onClose,
}: {
  data: AppData
  today: ISODate
  open: boolean
  onClose: () => void
}) {
  const [filter, setFilter] = useState<AchievementCategory | 'all'>('all')
  const [detail, setDetail] = useState<AchievementState | null>(null)
  const states = useMemo(
    () => evaluateAchievements(data, today, athleteFacts(data, today)),
    [data, today],
  )
  const earnedCount = states.filter((s) => s.earned).length
  // Earned first, then closest, then the rest: the list opens on what you
  // have and reads down into what is next.
  const shown = (filter === 'all' ? states : states.filter((s) => s.def.category === filter))
    .slice()
    .sort((a, b) => {
      if (a.earned !== b.earned) return a.earned ? -1 : 1
      return b.progress / b.target - a.progress / a.target
    })

  return (
    <Sheet open={open} onClose={onClose} title="Badges">
      <div className="space-y-2 pb-6">
        <p className="text-[12.5px] font-bold text-ink-dim">
          <b className="num text-ink">
            {earnedCount}/{states.length}
          </b>{' '}
          earned. Every one is measured off your own logged work.
        </p>
        <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 py-1">
          <Chip tone={filter === 'all' ? 'accent' : 'default'} onClick={() => setFilter('all')}>
            All
          </Chip>
          {CATEGORY_ORDER.map((c) => (
            <Chip
              key={c}
              tone={filter === c ? 'accent' : 'default'}
              onClick={() => setFilter(c)}
            >
              {CATEGORY_INFO[c].label}
            </Chip>
          ))}
        </div>
        {shown.map((s) => (
          <BadgeRow key={s.def.id} state={s} log={data.achievements} onOpen={() => setDetail(s)} />
        ))}
      </div>

      <Sheet open={detail !== null} onClose={() => setDetail(null)} title={detail?.def.name ?? ''}>
        {detail && (
          <div className="space-y-3 pb-2">
            <div className="flex items-center gap-3">
              <Sticker
                name={stickerForCategory(detail.def.category)}
                size={52}
                className={detail.earned ? '' : 'opacity-55 grayscale'}
              />
              <div className="min-w-0">
                <div className="text-[13px] font-bold leading-snug">{detail.def.blurb}</div>
                <div className="eyebrow mt-1 text-ink-faint">
                  {CATEGORY_INFO[detail.def.category].label}
                  {detail.count > 1 && <span className="num text-accent-soft"> · ×{detail.count}</span>}
                </div>
              </div>
            </div>
            <Tile className="!py-3">
              <div className="eyebrow text-ink-faint">How you get it</div>
              <div className="mt-1 text-[13px] font-bold leading-snug">{detail.def.requirement}</div>
            </Tile>
            {detail.def.pending ? (
              <p className="text-[12.5px] font-bold leading-snug text-ink-faint">
                Waiting on friends and groups. It is here so you can see it coming, not so you can
                grind it today.
              </p>
            ) : detail.earned ? (
              <p className="text-[12.5px] font-bold text-lime">{earnedLabel(data.achievements, detail.def.id)}.</p>
            ) : (
              <div>
                <div className="num text-[12.5px] font-bold text-ink-dim">
                  {Math.floor(detail.progress)} / {detail.target}
                  {detail.def.unit ? ` ${detail.def.unit}` : ''}
                </div>
                <QBar className="mt-1.5" pct={(detail.progress / detail.target) * 100} />
              </div>
            )}
          </div>
        )}
      </Sheet>
    </Sheet>
  )
}

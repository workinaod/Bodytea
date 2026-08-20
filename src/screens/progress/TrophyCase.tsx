import { useMemo, useState } from 'react'
import { useAppStore } from '../../store/appStore'
import { useToday } from '../../logic/clock'
import { athleteFacts } from '../../engine/achievementFacts'
import { evaluateAchievements, nextUp, type AchievementState } from '../../engine/achievements'
import {
  CATEGORY_INFO,
  CATEGORY_ORDER,
  type AchievementCategory,
} from '../../plan/achievements'
import { Card, ChoiceChip, SectionTitle } from '../../components/ui'
import { StreakBadge } from '../../components/Flame'
import { Sheet } from '../../components/Sheet'

// ============================================================
// Everything earned, and everything still out there.
//
// Locked entries stay visible as silhouettes with a live progress
// bar, because "38 / 50 early workouts" is a goal you did not have
// to be given. The ones the app cannot measure yet say so plainly
// rather than sitting at a permanent zero with no explanation.
// ============================================================

function Medal({ state, onClick }: { state: AchievementState; onClick: () => void }) {
  const { def, earned, count } = state
  const pct = state.target > 0 ? Math.min(1, state.progress / state.target) : 0
  return (
    <button
      onClick={onClick}
      className={`press flex w-full flex-col items-center gap-1.5 rounded-2xl px-2 py-3 text-center transition-colors ${
        earned ? 'bg-white/[0.06] ring-1 ring-white/[0.08]' : 'bg-white/[0.02]'
      }`}
    >
      <span
        className={`relative flex h-12 w-12 items-center justify-center rounded-full text-[20px] ${
          earned
            ? def.kind === 'trophy'
              ? 'bg-gold/15 ring-1 ring-gold/40'
              : 'bg-accent/12 ring-1 ring-accent/35'
            : 'bg-white/[0.04] ring-1 ring-white/[0.06]'
        }`}
      >
        <span className={earned ? '' : 'opacity-25 grayscale'}>{def.icon}</span>
        {earned && count > 1 && (
          <span className="num absolute -bottom-1 -right-1 rounded-full bg-accent px-1.5 py-px text-[10px] font-black text-black">
            ×{count}
          </span>
        )}
      </span>
      <span
        className={`text-[11px] font-bold leading-tight ${earned ? 'text-ink' : 'text-ink-faint'}`}
      >
        {def.name}
      </span>
      {!earned && !def.pending && state.progress > 0 && (
        <span className="w-full">
          <span className="block h-1 w-full overflow-hidden rounded-full bg-white/[0.07]">
            <span className="block h-full rounded-full bg-accent/70" style={{ width: `${pct * 100}%` }} />
          </span>
          <span className="num mt-1 block text-[9.5px] text-ink-faint">
            {Math.floor(state.progress)} / {state.target}
          </span>
        </span>
      )}
      {def.pending && <span className="text-[9px] font-bold uppercase tracking-wider text-ink-faint">soon</span>}
    </button>
  )
}

export function TrophyCase() {
  const data = useAppStore((s) => s.data)
  const today = useToday()
  const [open, setOpen] = useState<AchievementState | null>(null)
  const [filter, setFilter] = useState<AchievementCategory | 'all'>('all')

  const { states, facts } = useMemo(() => {
    const f = athleteFacts(data, today)
    return { states: evaluateAchievements(data, today, f), facts: f }
  }, [data, today])

  const earned = states.filter((s) => s.earned)
  const next = nextUp(states)
  const shown = filter === 'all' ? states : states.filter((s) => s.def.category === filter)
  const byCategory = CATEGORY_ORDER.map((c) => ({
    category: c,
    items: shown.filter((s) => s.def.category === c),
  })).filter((g) => g.items.length > 0)

  return (
    <div className="space-y-3">
      {/* The headline: what is burning, and how much is banked */}
      <Card className="flex items-center justify-between gap-3 !py-3.5">
        <div className="min-w-0">
          {facts.streakCurrent >= 7 ? (
            <StreakBadge streak={facts.streakCurrent} size={26} />
          ) : (
            <div className="text-[13px] font-bold leading-snug text-ink-dim">
              {facts.streakCurrent > 0
                ? `${facts.streakCurrent} day${facts.streakCurrent === 1 ? '' : 's'} in. Keep it lit.`
                : 'No streak yet. One session starts it.'}
            </div>
          )}
          {facts.streakBest > facts.streakCurrent && (
            <div className="num mt-1 text-[11px] text-ink-faint">Best run: {facts.streakBest} days</div>
          )}
        </div>
        {/* Distinct badges held, not the sum of every repeat. Adding up
            the ×counts read as "150 earned" off 22 real badges, which
            flatters the number and tells you nothing. */}
        <div className="shrink-0 text-right">
          <div className="num text-[26px] font-extrabold leading-none">
            {earned.length}
            <span className="text-[15px] font-bold text-ink-faint">/{states.length}</span>
          </div>
          <div className="eyebrow mt-0.5 block text-ink-faint">earned</div>
        </div>
      </Card>

      {next.length > 0 && (
        <>
          <SectionTitle>Closest to done</SectionTitle>
          <div className="grid grid-cols-3 gap-2">
            {next.map((s) => (
              <Medal key={s.def.id} state={s} onClick={() => setOpen(s)} />
            ))}
          </div>
        </>
      )}

      <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 pt-1">
        <ChoiceChip
          selected={filter === 'all'}
          onClick={() => setFilter('all')}
          className="!px-3 !py-1.5 !text-[12px]"
        >
          All
        </ChoiceChip>
        {CATEGORY_ORDER.map((c) => (
          <ChoiceChip
            key={c}
            selected={filter === c}
            onClick={() => setFilter(c)}
            className="!px-3 !py-1.5 !text-[12px]"
          >
            {CATEGORY_INFO[c].icon} {CATEGORY_INFO[c].label}
          </ChoiceChip>
        ))}
      </div>

      {byCategory.map((g) => {
        const got = g.items.filter((s) => s.earned).length
        return (
          <div key={g.category} className="space-y-2">
            <SectionTitle>
              {CATEGORY_INFO[g.category].label}{' '}
              <span className="num text-ink-faint">
                {got}/{g.items.length}
              </span>
            </SectionTitle>
            <div className="grid grid-cols-3 gap-2">
              {g.items.map((s) => (
                <Medal key={s.def.id} state={s} onClick={() => setOpen(s)} />
              ))}
            </div>
          </div>
        )
      })}

      <Sheet open={open !== null} onClose={() => setOpen(null)} title={open?.def.name ?? ''}>
        {open && (
          <div className="space-y-3 pb-2">
            <div className="flex items-center gap-3">
              <span
                className={`flex h-14 w-14 items-center justify-center rounded-full text-[26px] ${
                  open.earned
                    ? open.def.kind === 'trophy'
                      ? 'bg-gold/15 ring-1 ring-gold/40'
                      : 'bg-accent/12 ring-1 ring-accent/35'
                    : 'bg-white/[0.04] ring-1 ring-white/[0.06]'
                }`}
              >
                <span className={open.earned ? '' : 'opacity-25 grayscale'}>{open.def.icon}</span>
              </span>
              {/* The sheet header already carries the name, so this side
                  says what the thing MEANS instead of repeating it. */}
              <div className="min-w-0">
                <div className="text-[13px] font-semibold leading-snug text-ink">
                  {open.def.blurb}
                </div>
                <div className="eyebrow mt-1 block text-ink-faint">
                  {CATEGORY_INFO[open.def.category].label}
                  {open.count > 1 && <span className="num text-accent"> · ×{open.count}</span>}
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-white/[0.04] p-3">
              <div className="eyebrow text-ink-faint">How you get it</div>
              <div className="mt-1 text-[13px] font-semibold leading-snug">{open.def.requirement}</div>
            </div>

            {open.def.pending ? (
              <p className="text-[12.5px] leading-snug text-ink-faint">
                Waiting on friends and groups. It is here so you can see it coming, not so you can
                grind it today.
              </p>
            ) : open.earned ? (
              <p className="text-[12.5px] font-semibold text-lime">
                Earned{open.def.repeatable ? `, ${open.count} time${open.count === 1 ? '' : 's'}` : ''}.
              </p>
            ) : (
              <div>
                <div className="num text-[12.5px] font-bold text-ink-dim">
                  {Math.floor(open.progress)} / {open.target}
                  {open.def.unit ? ` ${open.def.unit}` : ''}
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.07]">
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{ width: `${Math.min(1, open.progress / open.target) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </Sheet>
    </div>
  )
}

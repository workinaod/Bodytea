import { useMemo } from 'react'
import type { AppData, Goal, ResolvedDay, SessionLog } from '../../types'
import { Chip } from '../../components/ui'
import { briefForDay, briefForSession } from '../../engine/workoutBrief'

// ============================================================
// What today IS, with its price and its point.
//
// The size numbers and the muscles were already computed for
// the "?" sheet; they were just hidden behind a tap. A person
// deciding whether to train right now wants the cost before
// they commit, not after.
//
// The why line is the other half: the engine knows why this
// day looks like this, and saying it in six words is the
// difference between a chore and a step in something.
// ============================================================

const BY_GOAL: Record<Goal, string> = {
  vertical: 'Every set here feeds the jump.',
  speed: 'Speed gets built on fresh legs and honest reps.',
  muscle: 'Volume where it counts. This is how size arrives.',
  strength: 'Heavy and clean. Strength is a skill you practise.',
  lean: 'Keep the muscle while the weight comes off. That is the trick.',
  endurance: 'Miles in the bank. The engine gets built slowly.',
  general: 'The base everything else sits on.',
}

function whyLine(day: ResolvedDay, goal: Goal): string {
  if (day.kind === 'rest') return 'Recovery is the part that lets the next one happen.'
  if (day.isDeload) return 'Deload week. Lighter on purpose, so the next block lands.'
  if (day.cns) return 'Max effort day. This is the one that moves the needle.'
  if (day.kind === 'mobility') return 'Cheap to do, expensive to skip.'
  return BY_GOAL[goal]
}

export function TodayHero({
  data,
  day,
  session,
  onOpenBrief,
}: {
  data: AppData
  /** The day being SHOWN, which on a make-up is not the day on the calendar. */
  day: ResolvedDay
  session: SessionLog | undefined
  onOpenBrief: () => void
}) {
  const brief = useMemo(
    () => (session ? briefForSession(session, data) : briefForDay(day, data)),
    [session, day, data],
  )
  const muscles = brief.focus.slice(0, 2).map((f) => f.label).join(' + ')
  const custom = !!session?.customTitle

  return (
    <div className="pt-1">
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
          Week {day.weekIndex} · Block {day.blockIndex} · {day.abWeek}
          {day.tier !== 1 && ` · Tier ${day.tier}`}
        </span>
        {day.isDeload && <Chip tone="lime">deload</Chip>}
        {day.cns && <Chip tone="accent">CNS day</Chip>}
      </div>
      {/* A make-up or an off-plan workout IS the day once it exists;
          the hero says what is actually being done, not the schedule */}
      <div className="mt-1.5 flex items-start justify-between gap-3">
        <h1 className="headline min-w-0 text-[31px]">{session?.customTitle ?? day.title}</h1>
        {/* The session-level "?", the twin of the one on every exercise row:
            what this workout does, why it runs in this order, and where it
            sits in the plan. */}
        <button
          aria-label="How this workout works"
          onClick={onOpenBrief}
          className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/[0.07] text-[15px] font-black text-cyan active:bg-white/[0.11]"
        >
          ?
        </button>
      </div>
      {day.kind !== 'rest' && brief.totalSets > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Chip>{`~${brief.minutes} min`}</Chip>
          <Chip>{`${brief.totalSets} sets`}</Chip>
          {muscles && <Chip>{muscles}</Chip>}
        </div>
      )}
      <p className="mt-2 text-[13px] leading-snug text-ink-dim">
        {custom ? 'Off the plan, on the record.' : day.tagline}
      </p>
      {!custom && (
        <p className="mt-1 text-[12.5px] leading-snug text-accent-soft">{whyLine(day, data.plan.goal)}</p>
      )}
    </div>
  )
}

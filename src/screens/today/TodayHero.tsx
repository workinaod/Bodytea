import { useMemo } from 'react'
import type { AppData, Goal, ResolvedDay, SessionLog } from '../../types'
import { Btn, Chip, Coin, Tile } from '../../components/ui'
import { Sticker, type StickerName } from '../../components/stickers'
import { briefForDay, briefForSession } from '../../engine/workoutBrief'

// ============================================================
// The mission: one tile, one verb.
//
// This used to be four loose blocks stacked down the screen
// (eyebrow, headline, chips, then a button somewhere below a
// banner). Loose blocks make a screen look like a document.
// The concept puts the whole ask inside ONE heat-edged tile
// with the button in it, so the eye lands on a single object
// and the object has a handle.
//
// The size numbers and the muscles were already computed for
// the "?" sheet; they were just hidden behind a tap. A person
// deciding whether to train right now wants the cost before
// they commit, not after.
//
// Contents and order per research/OP12-screen-law.md §1.
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

// One icon per kind of day, and no more precision than that. A
// separate sticker for every day type would be inventing distinctions
// the plan does not make.
function coinFor(day: ResolvedDay): StickerName {
  if (day.kind === 'rest') return 'calendar'
  if (day.kind === 'cardio-backup') return 'runner'
  return 'dumbbell-lit'
}

export function TodayHero({
  data,
  day,
  session,
  onOpenBrief,
  cta,
  onCantTrain,
}: {
  data: AppData
  /** The day being SHOWN, which on a make-up is not the day on the calendar. */
  day: ResolvedDay
  session: SessionLog | undefined
  onOpenBrief: () => void
  /** The one action, when there is one to offer. Lives INSIDE the tile. */
  cta?: { label: string; onStart: () => void }
  onCantTrain?: () => void
}) {
  const brief = useMemo(
    () => (session ? briefForSession(session, data) : briefForDay(day, data)),
    [session, day, data],
  )
  const muscles = brief.focus.slice(0, 2).map((f) => f.label).join(' + ')
  const custom = !!session?.customTitle
  const rest = day.kind === 'rest'

  return (
    <div className="pt-0.5">
      <Tile tone={rest ? 'plain' : 'heat'} className="!px-4 !py-4">
        <div className="flex items-start gap-3">
          <Coin size={52} tone={rest ? 'panel' : 'heat'}>
            <Sticker name={coinFor(day)} size={30} />
          </Coin>
          <div className="min-w-0 flex-1">
            <div className={`eyebrow ${rest ? 'text-ink-faint' : 'text-accent-soft'}`}>
              Week {day.weekIndex} · Block {day.blockIndex} · {day.abWeek}
              {day.tier !== 1 && ` · Tier ${day.tier}`}
            </div>
            {/* A make-up or an off-plan workout IS the day once it exists;
                the tile says what is actually being done, not the schedule */}
            <h1 className="headline mt-0.5 text-[27px]">{session?.customTitle ?? day.title}</h1>
          </div>
          {/* The session-level "?", the twin of the one on every exercise row:
              what this workout does, why it runs in this order, and where it
              sits in the plan. */}
          <button
            aria-label="How this workout works"
            onClick={onOpenBrief}
            className="press -mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border-2 border-edge bg-surface-2 text-[14px] font-black text-cyan"
          >
            ?
          </button>
        </div>

        <p className="mt-2.5 text-[12.5px] leading-snug text-ink-dim">
          {custom ? 'Off the plan, on the record.' : day.tagline}
        </p>
        {!custom && (
          <p className="mt-1 text-[12.5px] leading-snug text-accent-soft">{whyLine(day, data.plan.goal)}</p>
        )}

        {(day.isDeload || day.cns || (day.kind !== 'rest' && brief.totalSets > 0)) && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {day.isDeload && <Chip tone="lime">deload</Chip>}
            {day.cns && <Chip tone="accent">CNS day</Chip>}
            {day.kind !== 'rest' && brief.totalSets > 0 && (
              <>
                <Chip>
                  <b className="num font-black text-ink">{brief.minutes}</b> min
                </Chip>
                <Chip>
                  <b className="num font-black text-ink">{brief.totalSets}</b> sets
                </Chip>
                {muscles && <Chip>{muscles}</Chip>}
              </>
            )}
          </div>
        )}

        {/* One action, full width, inside the tile it belongs to. It used
            to share a row with "Can't train" at half this size, which made
            the screen ask a question instead of giving an instruction. */}
        {cta && (
          <Btn size="lg" className="mt-3.5 w-full" onClick={cta.onStart}>
            {cta.label}
          </Btn>
        )}
      </Tile>

      {onCantTrain && (
        <button
          onClick={onCantTrain}
          className="press mt-1.5 w-full py-1 text-center text-[12px] font-extrabold text-ink-faint underline underline-offset-[3px]"
        >
          Can't train today
        </button>
      )}
    </div>
  )
}

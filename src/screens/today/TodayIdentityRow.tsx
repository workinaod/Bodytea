import { Fragment, useMemo } from 'react'
import type { AppData, ISODate } from '../../types'
import { StreakChip } from '../../components/StreakChip'
import { Sticker } from '../../components/stickers'
import { PathLink, WeekNode, type NodeState } from '../../components/ui'
import { addDaysISO, mondayOf } from '../../engine/calendar'
import { resolveDay } from '../../engine/resolveDay'
import { streakDays } from '../../engine/streak'
import { athleteFacts } from '../../engine/achievementFacts'
import { evaluateAchievements } from '../../engine/achievements'

// ============================================================
// Who you are and how the week is going.
//
// Two rows. The HUD is the three things that are true about
// you right now: how long the run is, how much you have won,
// and you. The week is a PATH rather than a list of dots,
// because the line between two nodes is what makes a run of
// days read as a run rather than as seven unrelated squares.
// Today is the biggest node and the only white edge on the
// screen, so the eye finds where you are before it reads.
//
// It only renders on the live day. Browsing backwards with the
// arrows is reading history, and history does not need a HUD.
// ============================================================

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

function weekStates(data: AppData, today: ISODate): { date: ISODate; state: NodeState }[] {
  const monday = mondayOf(today)
  // You cannot miss a day you did not have the app for. Onboarding on a
  // Thursday used to paint Monday, Tuesday and Wednesday red, which is the
  // app inventing a failure to greet somebody with.
  const since = data.settings.installedAt
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDaysISO(monday, i)
    const log = data.sessions[date]
    const scheduled = resolveDay(date, data).kind !== 'rest'
    let state: NodeState
    if (log && (log.endedAt || log.status === 'completed' || log.status === 'downgraded-completed')) state = 'done'
    else if (log?.status === 'skipped') state = 'missed'
    else if (log?.status === 'partial') state = 'partial'
    else if (date === today) state = 'today'
    else if (date > today) state = 'future'
    else if (!scheduled || date < since) state = 'rest'
    else state = 'missed'
    return { date, state }
  })
}

export function TodayIdentityRow({
  data,
  today,
  onOpenProgress,
  onOpenProfile,
  onPickDay,
}: {
  data: AppData
  today: ISODate
  onOpenProgress?: () => void
  onOpenProfile?: () => void
  /** Browse another day. The path IS the day picker now. */
  onPickDay?: (date: ISODate) => void
}) {
  const nodes = useMemo(() => weekStates(data, today), [data, today])
  const streak = useMemo(() => streakDays(data, today), [data, today])
  const badges = useMemo(
    () => evaluateAchievements(data, today, athleteFacts(data, today)).filter((s) => s.earned).length,
    [data, today],
  )
  const initial = (data.profile.displayName ?? '').trim().charAt(0).toUpperCase()

  return (
    <div className="space-y-2.5 pt-0.5">
      <div className="flex items-center gap-3">
        <StreakChip streak={streak} onTap={onOpenProgress} size={17} />
        {/* What you have actually won, counted. It was buried three taps
            deep in a trophy case, which is where a scoreboard goes to be
            forgotten about. */}
        {badges > 0 && (
          <button
            onClick={onOpenProfile}
            aria-label={`${badges} badges earned`}
            className="press inline-flex items-center gap-1.5 rounded-full px-1 py-0.5"
          >
            <Sticker name="medal" size={19} />
            <span className="num text-[16px] font-black leading-none text-gold">{badges}</span>
          </button>
        )}
        {/* ml-auto, not space-between: on day one there is no streak and no
            badge, and a justified row with one child puts YOU on the left
            where the flame belongs. */}
        <button
          onClick={onOpenProfile}
          aria-label="Your profile"
          className="press-down ml-auto flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-xl border-2 border-edge bg-surface-2 text-[14px] font-black text-accent-soft [--lip:var(--lip-quiet)]"
        >
          {initial || '·'}
        </button>
      </div>

      {/* Every node is a real button, and its weekday letter rides inside
          it. The letters used to be a justify-between row underneath, which
          only lines up while every node is the same width; today's node is
          21px and a rest node is 13px, so they never did. */}
      <div className="flex items-start px-1.5">
        {nodes.map((n, i) => (
          <Fragment key={n.date}>
            {i > 0 && (
              <span className="flex flex-1 pt-[9px]">
                <PathLink lit={nodes[i - 1].state === 'done' && n.state !== 'future'} />
              </span>
            )}
            <button
              type="button"
              aria-label={`Open ${n.date}`}
              onClick={() => onPickDay?.(n.date)}
              className="press flex w-7 shrink-0 flex-col items-center px-1.5"
            >
              <span className="flex h-[21px] items-center">
                <WeekNode state={n.state} />
              </span>
              <span
                className={`mt-1 text-[8.5px] font-extrabold uppercase tracking-[0.04em] ${
                  n.state === 'today' ? 'text-accent-soft' : 'text-ink-faint'
                }`}
              >
                {WEEKDAYS[i]}
              </span>
            </button>
          </Fragment>
        ))}
      </div>
    </div>
  )
}

import { useMemo } from 'react'
import type { AppData, ISODate } from '../../types'
import { StreakChip } from '../../components/StreakChip'
import { addDaysISO, mondayOf } from '../../engine/calendar'
import { resolveDay } from '../../engine/resolveDay'
import { streakDays } from '../../engine/streak'

// ============================================================
// Who you are and how the week is going, in one row.
//
// The week is a PATH rather than a list of dots: the line
// between two nodes is what makes a run of days read as a run
// rather than as seven unrelated squares. Today is the biggest
// node, because the whole screen is about it.
//
// It only renders on the live day. Browsing backwards with the
// arrows is reading history, and history does not need a HUD.
// ============================================================

type NodeState = 'done' | 'partial' | 'missed' | 'rest' | 'today' | 'future'

function weekStates(data: AppData, today: ISODate): { date: ISODate; state: NodeState }[] {
  const monday = mondayOf(today)
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
    else if (!scheduled) state = 'rest'
    else state = 'missed'
    return { date, state }
  })
}

const DOT: Record<NodeState, string> = {
  done: 'h-2.5 w-2.5 bg-lime',
  partial: 'h-2.5 w-2.5 bg-gold',
  missed: 'h-2.5 w-2.5 bg-danger/70',
  rest: 'h-1.5 w-1.5 bg-surface-2',
  today: 'h-3 w-3 bg-accent ring-2 ring-accent/30',
  future: 'h-2 w-2 bg-edge',
}

export function TodayIdentityRow({
  data,
  today,
  onOpenProgress,
  onOpenProfile,
}: {
  data: AppData
  today: ISODate
  onOpenProgress?: () => void
  onOpenProfile?: () => void
}) {
  const nodes = useMemo(() => weekStates(data, today), [data, today])
  const streak = useMemo(() => streakDays(data, today), [data, today])
  const initial = (data.profile.displayName ?? '').trim().charAt(0).toUpperCase()

  return (
    <div className="flex items-center justify-between gap-3 pt-0.5">
      <StreakChip streak={streak} onTap={onOpenProgress} />
      <div className="flex flex-1 items-center justify-center" aria-hidden>
        {nodes.map((n, i) => (
          <span key={n.date} className="flex items-center">
            {i > 0 && (
              <span
                className={`h-px w-3 ${nodes[i - 1].state === 'done' && n.state !== 'future' ? 'bg-lime/45' : 'bg-edge'}`}
              />
            )}
            <span className={`shrink-0 rounded-full ${DOT[n.state]}`} />
          </span>
        ))}
      </div>
      <button
        onClick={onOpenProfile}
        aria-label="Your profile"
        className="press flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/[0.07] text-[13px] font-black text-accent-soft ring-1 ring-white/[0.07]"
      >
        {initial || '·'}
      </button>
    </div>
  )
}

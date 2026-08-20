import type { DebriefData, ISODate, SessionLog } from '../../types'
import { Card } from '../../components/ui'
import { formatDayLabel } from '../../engine/calendar'
import { sessionGrade } from '../../engine/stats'
import { reopenSession } from '../../logic/actions'

// ============================================================
// How the day ended, on the record.
//
// The grade lines are deliberately unsentimental and stay word
// for word: a half session says half, and an extremely light
// one says so. Extracted from TodayScreen unchanged.
// ============================================================

export function TodayCompletion({
  session,
  date,
  today,
  skipped,
  finished,
  pastDebrief,
  onOpenDebrief,
}: {
  session: SessionLog | undefined
  date: ISODate
  /** Viewing the live day, as opposed to browsing with the arrows. */
  today: boolean
  skipped: boolean
  finished: boolean
  pastDebrief: DebriefData | null
  onOpenDebrief: (d: DebriefData) => void
}) {
  if (skipped) {
    return (
      <Card className="border-danger/30">
        <p className="text-[13.5px] font-bold text-danger">Day skipped.</p>
        <p className="mt-1 text-[12.5px] text-ink-dim">
          It's on the record. The comeback is tomorrow's job. Protein is still today's.
        </p>
      </Card>
    )
  }
  if (!finished || !session) return null

  const grade = sessionGrade(session)
  const strong = grade === 'full' || grade === 'overtime'
  const line =
    grade === 'overtime'
      ? 'Overtime. More than the plan asked. Logged.'
      : grade === 'full'
        ? session.status === 'downgraded-completed'
          ? 'Full session on a downgraded day. Honestly logged.'
          : 'Session complete.'
        : grade === 'half'
          ? 'Half session logged.'
          : grade === 'light'
            ? 'Light day logged.'
            : 'Extremely light. Barely on the board, but on it.'

  return (
    <Card className={strong ? 'border-lime/30' : 'border-gold/30'}>
      <p className={`text-[14px] font-bold ${strong ? 'text-lime' : 'text-gold'}`}>{line}</p>
      {session.makeupFor && (
        <p className="mt-0.5 text-[11.5px] text-ink-faint">
          Make-up for {formatDayLabel(session.makeupFor)}. The week stays whole.
        </p>
      )}
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {session.status === 'partial' && today && (
          <button
            className="text-[12.5px] font-semibold text-cyan underline"
            onClick={() => reopenSession(date)}
          >
            ↩ Re-open the session
          </button>
        )}
        {pastDebrief && (
          <button
            className="text-[12.5px] font-semibold text-cyan underline"
            onClick={() => onOpenDebrief(pastDebrief)}
          >
            Re-open the debrief
          </button>
        )}
      </div>
    </Card>
  )
}

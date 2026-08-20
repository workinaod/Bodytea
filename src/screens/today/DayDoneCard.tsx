import type { DebriefData, ISODate, SessionLog } from '../../types'
import { formatDayLabel } from '../../engine/calendar'
import { sessionGrade } from '../../engine/stats'
import { Card } from '../../components/ui'

// ============================================================
// What the day says once a session has ended.
//
// Its own file because TodayScreen was at its cap again, and
// because this card carries the sentence that was wrong: a
// finished session used to be reported as a finished DAY. Run a
// make-up or log an off-plan workout and the card said "session
// complete" over a scheduled workout nobody had touched.
//
// It grades the session, names the make-up if there was one, and
// then says plainly when today's own workout is still owed.
// ============================================================

const LINE: Record<ReturnType<typeof sessionGrade>, string> = {
  overtime: 'Overtime. More than the plan asked. Logged.',
  full: 'Session complete.',
  half: 'Half session logged.',
  light: 'Light day logged.',
  'extremely-light': 'Extremely light. Barely on the board, but on it.',
}

export function DayDoneCard({
  session,
  date,
  today,
  owedTitle,
  pastDebrief,
  onReopenSession,
  onOpenDebrief,
}: {
  session: SessionLog
  date: ISODate
  /** The live day, so a day in the past offers no re-open. */
  today: boolean
  /** Today's own workout, when the plan still wants it. Null when nothing is owed. */
  owedTitle: string | null
  pastDebrief: DebriefData | null
  onReopenSession: (date: ISODate) => void
  onOpenDebrief: (d: DebriefData) => void
}) {
  const grade = sessionGrade(session)
  const strong = grade === 'full' || grade === 'overtime'
  const line =
    grade === 'full' && session.status === 'downgraded-completed'
      ? 'Full session on a downgraded day. Honestly logged.'
      : LINE[grade]

  return (
    <Card className={strong ? 'border-lime/30' : 'border-gold/30'}>
      <p className={`text-[14px] font-bold ${strong ? 'text-lime' : 'text-gold'}`}>{line}</p>
      {session.makeupFor && (
        <p className="mt-0.5 text-[11.5px] text-ink-faint">
          Make-up for {formatDayLabel(session.makeupFor)}. The week stays whole.
        </p>
      )}
      {owedTitle && today && (
        <p className="mt-1 text-[12px] leading-snug text-ink-dim">
          That was not today's workout though. {owedTitle} is still on the table, and the day
          stays open until you have done it or called it.
        </p>
      )}
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {session.status === 'partial' && today && (
          <button
            className="text-[12.5px] font-semibold text-cyan underline"
            onClick={() => onReopenSession(date)}
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

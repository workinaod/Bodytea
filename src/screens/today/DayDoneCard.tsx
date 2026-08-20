import type { DebriefData, ISODate, SessionLog } from '../../types'
import { formatDayLabel } from '../../engine/calendar'
import { GRADE_LABEL, sessionGrade } from '../../engine/stats'
import { Card } from '../../components/ui'

// ============================================================
// What the day says once a session has ended.
//
// Its own file because TodayScreen was at its cap, and because
// this card carried the sentence that was wrong: a finished
// SESSION was reported as a finished DAY. Run a make-up or log an
// off-plan workout and it read "Full session on a downgraded day.
// Honestly logged." in celebration lime over a scheduled workout
// nobody had touched, which is the day looking closed however
// many Start buttons sit above it.
//
// So when today's own workout is still owed, this card does not
// grade the day at all. It says the day is not done, in the first
// line, and names what is left.
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
  const graded =
    grade === 'full' && session.status === 'downgraded-completed'
      ? 'Full session on a downgraded day. Honestly logged.'
      : LINE[grade]
  // Today's own workout is still owed: whatever ran, it was not the day.
  const owed = owedTitle !== null && today

  const links = (
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
  )

  if (owed) {
    return (
      <Card className="border-accent/40">
        <p className="text-[14px] font-bold text-accent">Today is not done.</p>
        <p className="mt-1 text-[12.5px] leading-snug text-ink-dim">
          {session.makeupFor
            ? `What is logged is ${formatDayLabel(session.makeupFor)}'s make-up, not today's workout.`
            : "What is logged is off-plan work, not today's workout."}{' '}
          <span className="font-bold text-ink">{owedTitle}</span> is still on the table. Start it
          above, or say you can't train, and the day is yours either way.
        </p>
        <p className="mt-1.5 text-[11.5px] text-ink-faint">Banked so far: {GRADE_LABEL[grade]}.</p>
        {links}
      </Card>
    )
  }

  return (
    <Card className={strong ? 'border-lime/30' : 'border-gold/30'}>
      <p className={`text-[14px] font-bold ${strong ? 'text-lime' : 'text-gold'}`}>{graded}</p>
      {session.makeupFor && (
        <p className="mt-0.5 text-[11.5px] text-ink-faint">
          Make-up for {formatDayLabel(session.makeupFor)}. The week stays whole.
        </p>
      )}
      {links}
    </Card>
  )
}

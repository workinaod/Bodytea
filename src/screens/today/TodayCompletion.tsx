import { useMemo } from 'react'
import type { AppData, DebriefData, ISODate, SessionLog } from '../../types'
import { Chip, Tile } from '../../components/ui'
import { Sticker } from '../../components/stickers'
import { Flame } from '../../components/Flame'
import { addDaysISO, formatDayLabel } from '../../engine/calendar'
import { resolveDay } from '../../engine/resolveDay'
import { detectPRs, sessionGrade, sessionSetsDone, sessionTonnage } from '../../engine/stats'
import { streakDays } from '../../engine/streak'
import { flameFor, nextFlameTier } from '../../plan/achievements'
import { reopenSession } from '../../logic/actions'

// ============================================================
// Beat 4: the exit state.
//
// The loop's last beat is the one everybody skips, and it is
// the one that loads the next loop. So the day you just banked
// floods volt with the real haul on it, the streak says what
// it is worth and what it is close to, and the LAST thing on
// the screen is tomorrow.
//
// The grade lines are deliberately unsentimental and stay word
// for word: a half session says half, and an extremely light
// one says so. The flood is for the day being BANKED, not for
// it being good.
// ============================================================

export function TodayCompletion({
  data,
  session,
  title,
  date,
  today,
  skipped,
  finished,
  pastDebrief,
  onOpenDebrief,
  onPreviewTomorrow,
}: {
  data: AppData
  session: SessionLog | undefined
  /** What the day was, so the banked tile names the work rather than the date. */
  title: string
  date: ISODate
  /** Viewing the live day, as opposed to browsing with the arrows. */
  today: boolean
  skipped: boolean
  finished: boolean
  pastDebrief: DebriefData | null
  onOpenDebrief: (d: DebriefData) => void
  onPreviewTomorrow?: (date: ISODate) => void
}) {
  const tomorrowDate = addDaysISO(date, 1)
  const tomorrow = useMemo(() => resolveDay(tomorrowDate, data), [tomorrowDate, data])
  const streak = useMemo(() => streakDays(data, date), [data, date])
  const prs = useMemo(
    () => (session && finished ? detectPRs(data, session) : []),
    [data, session, finished],
  )

  if (skipped) {
    return (
      <Tile className="border-danger/50 shadow-[0_3px_0_var(--lip-danger)]">
        <p className="text-[13.5px] font-extrabold text-danger">Day skipped.</p>
        <p className="mt-1 text-[12.5px] text-ink-dim">
          It's on the record. The comeback is tomorrow's job. Protein is still today's.
        </p>
      </Tile>
    )
  }
  if (!finished || !session) return null

  const grade = sessionGrade(session)
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

  const sets = sessionSetsDone(session)
  const tonnage = Math.round(sessionTonnage(session))
  const tier = flameFor(streak)
  const next = nextFlameTier(streak)

  return (
    <div className="space-y-2.5">
      {/* The flood. Colour arrives as a FILL with dark text on it, which is
          the one place the concept lets a surface shout. */}
      <Tile tone="volt" className="!px-4 !py-4">
        <div className="flex items-center gap-3">
          <span className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full bg-[var(--ink-on-lime)] shadow-[0_4px_0_rgba(0,0,0,0.35)]">
            <Sticker name="check" size={26} />
          </span>
          <div className="min-w-0">
            <div className="eyebrow opacity-75">Mission complete</div>
            <div className="headline text-[23px]">{session.customTitle ?? title}</div>
          </div>
        </div>
        <p className="mt-2 text-[12.5px] font-bold">{line}</p>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-[11px] border-2 border-black/25 bg-black/[0.14] px-2.5 py-1 text-[11px] font-bold">
            <b className="num font-black">
              {sets.done}/{sets.total}
            </b>{' '}
            sets
          </span>
          {tonnage > 0 && (
            <span className="inline-flex items-center gap-1 rounded-[11px] border-2 border-black/25 bg-black/[0.14] px-2.5 py-1 text-[11px] font-bold">
              <b className="num font-black">{tonnage.toLocaleString('en-US')}</b> lb
            </span>
          )}
          {prs.length > 0 && (
            <span className="inline-flex items-center gap-1 rounded-[11px] border-2 border-black/25 bg-black/[0.14] px-2.5 py-1 text-[11px] font-bold">
              <b className="num font-black">{prs.length}</b> PR{prs.length === 1 ? '' : 's'}
            </span>
          )}
        </div>
        {session.makeupFor && (
          <p className="mt-2 text-[11.5px] font-bold opacity-75">
            Make-up for {formatDayLabel(session.makeupFor)}. The week stays whole.
          </p>
        )}
      </Tile>

      {/* What the day was worth to the long arc, and what it is close to. */}
      {tier && (
        <Tile tone="heat" className="!py-3">
          <div className="flex items-center gap-3">
            <Flame streak={streak} size={24} />
            <div className="min-w-0 flex-1">
              <div className="text-[13.5px] font-black">
                Day {streak} banked · {tier.name}
              </div>
              {next && (
                <div className="text-[11.5px] font-bold text-ink-faint">
                  {next.daysAway} more day{next.daysAway === 1 ? '' : 's'} to {next.tier.name}
                </div>
              )}
            </div>
          </div>
        </Tile>
      )}

      {/* The loop closes by loading the next one. */}
      {today && (
        <Tile tone="ice" className="!py-3">
          <div className="eyebrow text-cyan">Tomorrow</div>
          <div className="mt-0.5 text-[16.5px] font-black leading-tight">{tomorrow.title}</div>
          <p className="mt-0.5 text-[11.5px] leading-snug text-ink-dim">{tomorrow.tagline}</p>
          {onPreviewTomorrow && (
            <button
              onClick={() => onPreviewTomorrow(tomorrowDate)}
              className="press mt-2 text-[12px] font-black text-cyan"
            >
              Preview tomorrow ›
            </button>
          )}
        </Tile>
      )}

      <div className="flex flex-wrap gap-1.5">
        {session.status === 'partial' && today && (
          <Chip onClick={() => reopenSession(date)}>↩ Re-open the session</Chip>
        )}
        {pastDebrief && <Chip onClick={() => onOpenDebrief(pastDebrief)}>Re-open the debrief</Chip>}
      </div>
    </div>
  )
}

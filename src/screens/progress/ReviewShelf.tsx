import { useState } from 'react'
import type { AppData, ISODate } from '../../types'
import { boundsFor, PERIOD_KINDS, type PeriodKind } from '../../engine/periods'
import { periodReview } from '../../engine/periodReview'
import { PeriodReviewSheet } from './PeriodReviewSheet'
import { Tile } from '../../components/ui'
import { daysBetween } from '../../engine/calendar'
import { REVIEW_MARKS, unlockedMarks, type ReviewMarkId } from '../../engine/review'

// ============================================================
// Any period, on demand.
//
// The offer on Today catches a period the moment it closes, and
// that is the one people will actually see. This is the other
// half: the athlete who wants to know how the month is going on
// the 14th, or who wants last year again in March.
//
// It reviews the period they are STANDING IN, unfinished and
// said so. A part-week review with three sessions in it is a
// true statement about a part week.
//
// The milestone marks live in here too, and used to be their
// own section with its own title lower down the screen. Same
// question, same engine, two headings: "how is it going" at
// four rolling distances, and at three fixed ones. Splitting
// them was the screen describing its own data model.
// ============================================================

// "So far", not "this", and not only to stay clear of the weekly recap's
// own "This week": the period being reviewed here is the one the athlete
// is standing in, unfinished, and the label should say so.
const LABEL: Record<PeriodKind, string> = {
  week: 'The week so far',
  month: 'The month so far',
  quarter: 'The quarter so far',
  year: 'The year so far',
}

export function ReviewShelf({
  data,
  today,
  onTakePhotos,
  onOpenMark,
}: {
  data: AppData
  today: ISODate
  /** The week's standing ask: open the check-in with the camera. */
  onTakePhotos: () => void
  /** A milestone that has unlocked. Building the review needs the store. */
  onOpenMark: (id: ReviewMarkId) => void
}) {
  const [kind, setKind] = useState<PeriodKind | null>(null)
  const review = kind ? periodReview(data, boundsFor(kind, today)) : null
  const unlocked = unlockedMarks(data, today)
  const daysIn = daysBetween(data.settings.phaseStartDate, today)

  return (
    <>
      <Tile>
        <div className="eyebrow text-ink-faint">Reviews</div>
        <p className="mb-2.5 mt-1 text-[11.5px] leading-snug text-ink-faint">
          The same question at four distances. Each one closes on its own and comes to you
          when it does.
        </p>
        <div className="grid grid-cols-2 gap-2">
          {PERIOD_KINDS.map((k) => (
            <button
              key={k}
              onClick={() => setKind(k)}
              className="press-down rounded-xl border-2 border-edge bg-surface-2 px-3 py-2.5 text-left [--lip:var(--lip-quiet)]"
            >
              <span className="block text-[13px] font-extrabold leading-tight">{LABEL[k]}</span>
              <span className="mt-0.5 block text-[10.5px] font-semibold text-ink-faint">
                {boundsFor(k, today).label}
              </span>
            </button>
          ))}
        </div>

        {/* The fixed marks, on the same shelf. A locked one says the
            number of days rather than pretending to be tappable. */}
        <div className="mt-3 border-t-2 border-edge-soft pt-1">
          {REVIEW_MARKS.map((mark) => {
            const open = unlocked.some((m) => m.id === mark.id)
            return (
              <button
                key={mark.id}
                type="button"
                disabled={!open}
                onClick={open ? () => onOpenMark(mark.id) : undefined}
                className={`flex w-full items-center justify-between py-2 text-left ${open ? 'press' : 'opacity-50'}`}
              >
                <span className="text-[12.5px] font-extrabold">{mark.label}</span>
                <span className={`text-[11px] font-bold ${open ? 'text-cyan' : 'text-ink-faint'}`}>
                  {open ? 'open ›' : `unlocks in ${mark.days - daysIn} days`}
                </span>
              </button>
            )
          })}
        </div>
      </Tile>

      {review && (
        <PeriodReviewSheet
          review={review}
          onClose={() => setKind(null)}
          onTakePhotos={() => {
            setKind(null)
            onTakePhotos()
          }}
        />
      )}
    </>
  )
}

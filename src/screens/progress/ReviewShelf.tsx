import { useState } from 'react'
import type { AppData } from '../../types'
import { boundsFor, PERIOD_KINDS, type PeriodKind } from '../../engine/periods'
import { periodReview } from '../../engine/periodReview'
import { PeriodReviewSheet } from './PeriodReviewSheet'
import { Card } from '../../components/ui'

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
}: {
  data: AppData
  today: string
  /** The week's standing ask: open the check-in with the camera. */
  onTakePhotos: () => void
}) {
  const [kind, setKind] = useState<PeriodKind | null>(null)
  const review = kind ? periodReview(data, boundsFor(kind, today)) : null

  return (
    <>
      <Card>
        <div className="text-[13.5px] font-extrabold">Reviews</div>
        <p className="mb-2.5 mt-0.5 text-[11.5px] leading-snug text-ink-faint">
          The same question at four distances. Each one closes on its own and comes to you
          when it does.
        </p>
        <div className="grid grid-cols-2 gap-2">
          {PERIOD_KINDS.map((k) => (
            <button
              key={k}
              onClick={() => setKind(k)}
              className="press rounded-xl bg-white/[0.055] px-3 py-2.5 text-left ring-1 ring-white/[0.06] active:bg-white/[0.11]"
            >
              <span className="block text-[13px] font-extrabold leading-tight">{LABEL[k]}</span>
              <span className="mt-0.5 block text-[10.5px] font-semibold text-ink-faint">
                {boundsFor(k, today).label}
              </span>
            </button>
          ))}
        </div>
      </Card>

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

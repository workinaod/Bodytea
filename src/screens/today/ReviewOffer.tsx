import { useMemo, useState } from 'react'
import { reviewsDue } from '../../engine/periodReview'
import { PeriodReviewSheet } from '../progress/PeriodReviewSheet'
import { CheckinSheet } from '../progress/CheckinSheet'
import { useAppStore } from '../../store/appStore'
import { Card } from '../../components/ui'

// ============================================================
// "Your week is in." The door to the period review.
//
// Offered, never forced: a period closing does not seize the
// screen the way a modal on open would, it puts one card on
// Today and waits. Same rule as everything else here.
//
// The longest closed period wins the card. On the 1st of
// January the year, the quarter, the month and the week have all
// just ended, and four stacked cards would be a wall; the year
// is what they want and the rest stay in the queue behind it,
// one per open, in order.
// ============================================================

const NOUN = {
  week: { title: 'Your week is in', sub: 'Seven days, totalled up. Takes a minute.' },
  month: { title: 'Your month is in', sub: 'Four weeks of work, in one place.' },
  quarter: { title: 'Your quarter is in', sub: 'Three months, with the photos side by side.' },
  year: { title: 'Your year is in', sub: 'The whole thing. Start to finish.' },
} as const

export function ReviewOffer({ today }: { today: string }) {
  const data = useAppStore((s) => s.data)
  const update = useAppStore((s) => s.update)
  const [open, setOpen] = useState(false)
  const [checkin, setCheckin] = useState(false)

  const due = useMemo(
    () => reviewsDue(data, today, data.settings.reviewsSeen ?? []),
    [data, today],
  )
  const next = due[0]
  // The check-in has to outlive the offer: opening it marks the review
  // seen, which empties `due`, and an early return here would unmount the
  // camera the same tick the athlete asked for it.
  if (!next && !checkin) return null

  const copy = next ? NOUN[next.bounds.kind] : null
  const markSeen = () => {
    if (!next) return
    update((d) => {
      const seen = d.settings.reviewsSeen ?? []
      if (!seen.includes(next.bounds.id)) d.settings.reviewsSeen = [...seen, next.bounds.id]
    })
  }

  return (
    <>
      {next && copy && (
      <Card className="border-cyan/40">
        <div className="text-[11px] font-black uppercase tracking-wider text-cyan">{next.bounds.label}</div>
        <div className="mt-1 text-[15px] font-extrabold leading-tight">{copy.title}</div>
        <p className="mt-1 text-[12.5px] leading-snug text-ink-dim">{copy.sub}</p>
        <div className="mt-2.5 flex gap-2">
          <button
            onClick={() => setOpen(true)}
            className="sheen flex-[2] rounded-xl bg-gradient-to-b from-cyan to-[#2aa3bd] py-3 text-[14px] font-black text-black active:scale-[0.98]"
          >
            See it
          </button>
          <button
            onClick={markSeen}
            className="flex-1 rounded-xl border border-edge bg-white/[0.06] py-3 text-[13px] font-bold text-ink-dim active:scale-[0.98]"
          >
            Not now
          </button>
        </div>
      </Card>
      )}

      {open && next && (
        <PeriodReviewSheet
          review={next}
          onClose={() => {
            markSeen()
            setOpen(false)
          }}
          onTakePhotos={() => {
            markSeen()
            setOpen(false)
            setCheckin(true)
          }}
        />
      )}

      {/* The week's ask opens the real check-in, camera and all, rather
          than pointing at another tab and calling that an ask. */}
      <CheckinSheet
        open={checkin}
        onClose={() => setCheckin(false)}
        last={data.measurements[data.measurements.length - 1]}
      />
    </>
  )
}

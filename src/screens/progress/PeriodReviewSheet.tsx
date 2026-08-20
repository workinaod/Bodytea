import { useMemo, useState } from 'react'
import type { PeriodReview, PhotoPair } from '../../engine/periodReview'
import { storyCards, type StoryCard } from '../../engine/reviewStory'
import { usePhotoUrl } from './usePhotoUrl'

// ============================================================
// The period review, told as story cards. Tap right to advance,
// tap left to go back, same as the weekly recap it grew out of.
//
// One screen for all four periods. What changes between a week
// and a year is which cards the story engine hands over, never
// the frame, so a year cannot quietly drift into looking like a
// different product from a week.
// ============================================================

function PhotoArc({ pairs }: { pairs: PhotoPair[] }) {
  const [i, setI] = useState(0)
  const pair = pairs[Math.min(i, pairs.length - 1)]
  const before = usePhotoUrl(pair.beforeId)
  const after = usePhotoUrl(pair.afterId)
  return (
    <div className="w-full" onClick={(e) => e.stopPropagation()}>
      <div className="flex justify-center gap-1.5">
        {pairs.map((p, n) => (
          <button
            key={p.angle}
            onClick={() => setI(n)}
            className={`rounded-full px-3 py-1 text-[11px] font-bold capitalize ${
              n === Math.min(i, pairs.length - 1)
                ? 'bg-ink text-black'
                : 'bg-white/[0.08] text-ink-dim'
            }`}
          >
            {p.angle}
          </button>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {[
          { url: before, label: pair.beforeDate, tag: 'Then' },
          { url: after, label: pair.afterDate, tag: 'Now' },
        ].map((side) => (
          <div key={side.tag}>
            <div className="aspect-[3/4] overflow-hidden rounded-xl bg-white/[0.06]">
              {side.url ? (
                <img src={side.url} alt={`${side.tag} ${pair.angle}`} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-[11px] text-ink-faint">
                  photo missing
                </div>
              )}
            </div>
            <div className="mt-1 text-center text-[10.5px] font-bold uppercase tracking-wider text-ink-faint">
              {side.tag} · {side.label.slice(5)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function CardBody({ card }: { card: StoryCard }) {
  if (card.kind === 'photos' && card.photos) return <PhotoArc pairs={card.photos} />

  if (card.kind === 'cohort' && card.cohort) {
    return (
      <div className="w-full space-y-2.5">
        {card.cohort.map((c) => (
          <div key={c.label} className="rounded-xl bg-white/[0.055] px-3.5 py-3 text-left">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[12px] font-black uppercase tracking-wider text-ink-faint">{c.label}</span>
              <span className="text-[15px] font-extrabold">{c.value}</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
              <div className="h-full rounded-full bg-cyan" style={{ width: `${c.percentile}%` }} />
            </div>
            <p className="mt-1.5 text-[12px] leading-snug text-ink-dim">{c.standing}</p>
            <p className="mt-0.5 text-[10.5px] leading-snug text-ink-faint">vs {c.against}</p>
          </div>
        ))}
      </div>
    )
  }

  if (card.items) {
    return (
      <div className="w-full space-y-2">
        {card.items.map((it) => (
          <div key={it.label} className="flex items-start gap-2.5 rounded-xl bg-white/[0.055] px-3.5 py-3 text-left">
            {it.icon && <span className="text-[16px] leading-none">{it.icon}</span>}
            <div className="min-w-0">
              <div className="text-[14px] font-extrabold leading-tight">{it.label}</div>
              <div className="mt-0.5 text-[11.5px] leading-snug text-ink-faint">{it.detail}</div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (card.big) {
    return (
      <div className="font-display text-[88px] font-bold leading-none tracking-tight" style={{ color: card.glow }}>
        {card.big}
      </div>
    )
  }
  return null
}

export function PeriodReviewSheet({
  review,
  onClose,
  onTakePhotos,
}: {
  review: PeriodReview
  onClose: () => void
  /** The week's standing ask: open the check-in with the camera ready. */
  onTakePhotos: () => void
}) {
  const cards = useMemo(() => storyCards(review), [review])
  const [i, setI] = useState(0)
  const card = cards[Math.min(i, cards.length - 1)]
  const last = i >= cards.length - 1

  return (
    <div
      role="dialog"
      aria-label={`${review.bounds.label} review`}
      className="fixed inset-0 z-[70] flex flex-col bg-bg"
      onClick={(e) => {
        const x = (e as React.MouseEvent).clientX
        if (x < window.innerWidth * 0.3) setI((n) => Math.max(0, n - 1))
        else if (!last) setI((n) => n + 1)
      }}
    >
      <div className="flex gap-1 px-4 pt-[max(env(safe-area-inset-top),14px)]">
        {cards.map((_, n) => (
          <div key={n} className={`h-1 flex-1 rounded-full ${n <= i ? 'bg-ink' : 'bg-edge'}`} />
        ))}
      </div>
      <div className="text-right">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onClose()
          }}
          className="px-4 py-2 text-[13px] font-bold text-ink-faint"
        >
          ✕
        </button>
      </div>

      <div className="relative flex flex-1 flex-col items-center justify-center overflow-y-auto px-7 py-4 text-center">
        <div
          className="pointer-events-none absolute h-72 w-72 rounded-full opacity-20 blur-3xl"
          style={{ background: card.glow }}
        />
        <div className="relative w-full max-w-sm">
          <div className="text-[12px] font-black uppercase tracking-[0.3em] text-ink-dim">{card.eyebrow}</div>
          <div className="mt-4 flex justify-center">
            <CardBody card={card} />
          </div>
          <p className="mx-auto mt-5 max-w-[32ch] font-display text-[17px] font-bold leading-snug text-ink">
            {card.caption}
          </p>
        </div>
      </div>

      <div className="space-y-2 px-6 pb-[max(env(safe-area-inset-bottom),20px)]">
        {card.kind === 'ask' && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onTakePhotos()
            }}
            className="w-full rounded-xl bg-cyan py-4 text-[15px] font-extrabold text-black"
          >
            Take this week's photos
          </button>
        )}
        {last ? (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onClose()
            }}
            className="w-full rounded-xl bg-lime py-4 text-[15px] font-extrabold text-black"
          >
            Back to work
          </button>
        ) : (
          <p className="text-center text-[11px] text-ink-faint">tap to continue</p>
        )}
      </div>
    </div>
  )
}

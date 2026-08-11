import { useEffect, useState } from 'react'
import type { MilestoneReview } from '../../engine/review'
import { formatShort } from '../../engine/calendar'
import { PhotoStore } from '../../store/storage'
import { Sheet } from '../../components/Sheet'
import { Btn } from '../../components/ui'

function usePhotoUrl(id: string | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    let revoked: string | null = null
    if (!id) {
      setUrl(null)
      return
    }
    void PhotoStore.get(id).then((blob) => {
      if (blob) {
        revoked = URL.createObjectURL(blob)
        setUrl(revoked)
      }
    })
    return () => {
      if (revoked) URL.revokeObjectURL(revoked)
    }
  }, [id])
  return url
}

const TONE_STYLE = {
  win: 'border-lime/70 text-lime/90',
  note: 'border-cyan/70 text-cyan/90',
  callout: 'border-danger/70 text-danger',
} as const

export function MilestoneReviewSheet({ review, onClose }: { review: MilestoneReview; onClose: () => void }) {
  const before = usePhotoUrl(review.beforePhotoId)
  const after = usePhotoUrl(review.afterPhotoId)

  return (
    <Sheet open onClose={onClose} title={review.label}>
      <div className="space-y-4 pb-8">
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
          {formatShort(review.from)} · {formatShort(review.to)}
        </div>

        {/* The verdict is the headline */}
        <div className="relative overflow-hidden rounded-3xl border border-accent/25 bg-gradient-to-b from-surface-2 to-surface px-5 pb-5 pt-6">
          <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-accent/14 blur-3xl" />
          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-accent">The verdict</div>
          <p className="mt-2.5 font-display text-[19px] font-bold leading-[1.3] tracking-tight text-ink">
            {review.verdict}
          </p>
        </div>

        {/* Before / after */}
        {(before || after) && (
          <div className="grid grid-cols-2 gap-2">
            {[
              { url: before, label: `Before · ${formatShort(review.from)}` },
              { url: after, label: `After · ${formatShort(review.to)}` },
            ].map((p) => (
              <div key={p.label} className="overflow-hidden rounded-2xl bg-white/[0.045] ring-1 ring-white/[0.05]">
                {p.url ? (
                  <img src={p.url} alt={p.label} className="aspect-[3/4] w-full object-cover" />
                ) : (
                  <div className="flex aspect-[3/4] items-center justify-center text-[11px] text-ink-faint">
                    no photo
                  </div>
                )}
                <div className="px-2.5 py-1.5 text-[10.5px] font-bold uppercase tracking-wider text-ink-faint">
                  {p.label}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Effort */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-2xl bg-white/[0.045] ring-1 ring-white/[0.05] px-4 py-3 text-center">
            <div className="font-display text-[26px] font-bold leading-none">
              {review.adherencePct !== null ? `${review.adherencePct}%` : ', '}
            </div>
            <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-ink-faint">
              attendance · {review.done + review.partial}/{review.scheduled} sessions
            </div>
          </div>
          <div className="rounded-2xl bg-white/[0.045] ring-1 ring-white/[0.05] px-4 py-3 text-center">
            <div className="font-display text-[26px] font-bold leading-none">
              {review.proteinPct !== null ? `${review.proteinPct}%` : ', '}
            </div>
            <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-ink-faint">
              protein days hit
            </div>
          </div>
        </div>

        {/* The numbers */}
        <div className="overflow-hidden rounded-2xl bg-white/[0.045] ring-1 ring-white/[0.05]">
          {review.deltas.map((d, i) => {
            const has = d.delta !== undefined
            const good = has && (d.better === 'down' ? d.delta! < 0 : d.delta! > 0)
            const flat = has && d.delta === 0
            return (
              <div
                key={d.key}
                className={`flex items-center justify-between px-4 py-2.5 ${i > 0 ? 'border-t border-white/[0.05]' : ''}`}
              >
                <span className="text-[13px] font-bold">{d.label}</span>
                {has ? (
                  <span className="font-mono text-[12.5px]">
                    <span className="text-ink-faint">
                      {d.before} → {d.after} {d.unit}
                    </span>
                    <span className={`ml-2 font-bold ${flat ? 'text-ink-faint' : good ? 'text-lime' : 'text-gold'}`}>
                      {d.delta! > 0 ? '+' : ''}
                      {d.delta}
                    </span>
                  </span>
                ) : (
                  <span className="text-[11.5px] text-ink-faint">not tracked this period</span>
                )}
              </div>
            )
          })}
          {review.strength.map((s) => (
            <div key={s.label} className="flex items-center justify-between border-t border-white/[0.05] px-4 py-2.5">
              <span className="text-[13px] font-bold">{s.label} e1RM</span>
              <span className="font-mono text-[12.5px]">
                <span className="text-ink-faint">
                  {s.beforeE1rm} → {s.afterE1rm} lb
                </span>
                <span className={`ml-2 font-bold ${s.pct > 0 ? 'text-lime' : s.pct < 0 ? 'text-gold' : 'text-ink-faint'}`}>
                  {s.pct > 0 ? '+' : ''}
                  {s.pct}%
                </span>
              </span>
            </div>
          ))}
        </div>

        {/* Notes, criticism, compliments */}
        <div className="space-y-2">
          {review.lines.map((l, i) => (
            <div key={i} className={`border-l-2 py-1 pl-3 text-[12.5px] leading-snug ${TONE_STYLE[l.tone]}`}>
              {l.text}
            </div>
          ))}
        </div>

        <Btn kind="lime" className="w-full py-4" onClick={onClose}>
          Back to work
        </Btn>
      </div>
    </Sheet>
  )
}

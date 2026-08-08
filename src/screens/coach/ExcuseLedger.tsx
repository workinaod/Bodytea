import { useEffect, useState } from 'react'
import { useAppStore } from '../../store/appStore'
import { daysBetween, formatShort, todayISO } from '../../engine/calendar'
import { Chip } from '../../components/ui'
import { PhotoStore } from '../../store/storage'

/** The receipts: every claim, its proof status, and the 30-day tallies. */
export function ExcuseLedger() {
  const excuses = useAppStore((s) => s.data.excuses)
  const today = todayISO()
  const recent = excuses.filter((e) => daysBetween(e.date, today) < 30)
  const unproven = recent.filter((e) => !e.accepted).length
  const proven = recent.filter((e) => e.accepted).length

  const byReason = new Map<string, number>()
  for (const e of recent) byReason.set(e.reason, (byReason.get(e.reason) ?? 0) + 1)

  const sorted = [...excuses].sort((a, b) => (a.at < b.at ? 1 : -1))

  return (
    <div className="space-y-3 pb-6">
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-danger/25 bg-danger/8 p-3 text-center">
          <div className="text-[20px] font-black text-danger">{unproven}</div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">unproven / 30d</div>
        </div>
        <div className="rounded-xl border border-lime/25 bg-lime/8 p-3 text-center">
          <div className="text-[20px] font-black text-lime">{proven}</div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">with proof / 30d</div>
        </div>
      </div>

      {byReason.size > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {[...byReason.entries()].map(([r, n]) => (
            <Chip key={r}>{r}: {n}</Chip>
          ))}
        </div>
      )}

      <div className="space-y-2">
        {sorted.map((e) => (
          <div key={e.id} className={`rounded-xl border p-3.5 ${e.accepted ? 'border-edge bg-surface' : 'border-danger/25 bg-danger/5'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Chip tone={e.accepted ? 'lime' : 'danger'}>{e.accepted ? 'accepted' : 'unproven'}</Chip>
                <Chip>{e.action}</Chip>
                <Chip>{e.reason}</Chip>
              </div>
              <span className="text-[10.5px] font-semibold text-ink-faint">
                {formatShort(e.date)}{e.scope === 'week' ? ' (week)' : ''}
              </span>
            </div>
            {e.claimText && <p className="mt-1.5 text-[12.5px] italic text-ink-dim">"{e.claimText}"</p>}
            {e.minimumViableTaken && (
              <p className="mt-1 text-[11.5px] font-semibold text-lime">→ took the minimum session instead</p>
            )}
            {e.proofPhotoId && <ProofThumb photoId={e.proofPhotoId} />}
          </div>
        ))}
        {excuses.length === 0 && (
          <p className="py-6 text-center text-[12.5px] text-ink-faint">
            Clean sheet. No skips, no claims, no receipts. Keep it that way.
          </p>
        )}
      </div>
    </div>
  )
}

function ProofThumb({ photoId }: { photoId: string }) {
  const [url, setUrl] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  useEffect(() => {
    let u: string | null = null
    void PhotoStore.get(photoId).then((b) => {
      if (b) {
        u = URL.createObjectURL(b)
        setUrl(u)
      }
    })
    return () => {
      if (u) URL.revokeObjectURL(u)
    }
  }, [photoId])
  if (!url) return null
  return (
    <>
      <button onClick={() => setOpen(true)} className="mt-2 block">
        <img src={url} alt="proof" className="h-16 rounded-lg border border-edge object-cover" />
      </button>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4" onClick={() => setOpen(false)}>
          <img src={url} alt="proof enlarged" className="max-h-full max-w-full rounded-xl" />
        </div>
      )}
    </>
  )
}

import { useRef, useState } from 'react'
import type { ExcuseReason, ISODate, Tier } from '../../types'
import { Sheet } from '../../components/Sheet'
import { Btn } from '../../components/ui'
import { changeTier, savePhotoFile } from '../../logic/actions'

const REASONS: { id: ExcuseReason; label: string }[] = [
  { id: 'busy', label: 'Work-heavy week' },
  { id: 'gig', label: 'Gigs stacked' },
  { id: 'travel', label: 'Traveling' },
  { id: 'sick', label: 'Sick / banged up' },
  { id: 'other', label: 'Other' },
]

/** Mid-week tier drops route through here: reason + optional proof. */
export function TierDropSheet({
  to,
  weekStart,
  onClose,
}: {
  to: Tier
  weekStart: ISODate
  onClose: () => void
}) {
  const [reason, setReason] = useState<ExcuseReason | null>(null)
  const [proofId, setProofId] = useState<string | undefined>()
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  return (
    <Sheet open onClose={onClose} title={`Drop to Tier ${to} mid-week?`}>
      <div className="space-y-4 pb-6">
        <p className="text-[13px] leading-snug text-ink-dim">
          The plan says pick the tier at the START of the week. Dropping now goes on the record —
          proof (calendar, schedule, gig posters) makes it a planned choice instead of a retreat.
        </p>
        <div className="grid grid-cols-2 gap-2">
          {REASONS.map((r) => (
            <button
              key={r.id}
              onClick={() => setReason(r.id)}
              className={`rounded-xl border px-3 py-2.5 text-[12.5px] font-bold ${
                reason === r.id ? 'border-accent/50 bg-accent/15 text-accent-soft' : 'border-edge bg-surface-2 text-ink-dim'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0]
            if (!f) return
            setBusy(true)
            try {
              const meta = await savePhotoFile(f, 'proof')
              setProofId(meta.id)
            } finally {
              setBusy(false)
            }
          }}
        />
        {proofId ? (
          <div className="rounded-xl border border-lime/30 bg-lime/8 px-3.5 py-3 text-[13px] font-bold text-lime">
            ✓ Proof attached — this counts as planned
          </div>
        ) : (
          <Btn kind="subtle" className="w-full" disabled={busy} onClick={() => fileRef.current?.click()}>
            {busy ? 'Saving…' : '📎 Attach proof'}
          </Btn>
        )}
        <div className="flex gap-2">
          <Btn kind="ghost" className="flex-1" onClick={onClose}>
            Keep current tier
          </Btn>
          <Btn
            className="flex-1"
            disabled={!reason}
            onClick={() => {
              changeTier(weekStart, to, { reason: reason ?? 'other', proofPhotoId: proofId })
              onClose()
            }}
          >
            Drop to Tier {to}
          </Btn>
        </div>
      </div>
    </Sheet>
  )
}

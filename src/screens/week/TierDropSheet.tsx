import { useState } from 'react'
import type { ExcuseReason, ISODate, Tier } from '../../types'
import { Sheet } from '../../components/Sheet'
import { Btn } from '../../components/ui'
import { changeTier } from '../../logic/actions'

const REASONS: { id: ExcuseReason; label: string }[] = [
  { id: 'busy', label: 'Work-heavy week' },
  { id: 'gig', label: 'Gigs stacked' },
  { id: 'travel', label: 'Traveling' },
  { id: 'sick', label: 'Sick / banged up' },
  { id: 'other', label: 'Other' },
]

/**
 * Dropping to a lighter tier requires writing WHY, no proof photos,
 * no games. The reason goes on the Record (Sergeant tab) in your own
 * words, and disappears only if you revert before training on it.
 */
export function TierDropSheet({
  to,
  weekStart,
  planned,
  onClose,
}: {
  to: Tier
  weekStart: ISODate
  planned: boolean
  onClose: () => void
}) {
  const [reason, setReason] = useState<ExcuseReason | null>(null)
  const [claimText, setClaimText] = useState('')
  const ready = !!reason && claimText.trim().length >= 5

  return (
    <Sheet open onClose={onClose} title={`Drop to Tier ${to}${planned ? '' : ' mid-week'}?`}>
      <div className="space-y-4 pb-6">
        <p className="text-[13px] leading-snug text-ink-dim">
          {planned
            ? 'Planned fallback weeks are how the plan survives real life. Every one goes on the record, in your words.'
            : 'You pick the tier at the START of the week. Dropping now still works, but the reason goes on the record.'}{' '}
          Write it like you'll re-read it in a month, because you will. And if this "brutal week"
          somehow contains full sessions, the Sergeant will notice.
        </p>

        <div>
          <div className="mb-2 text-[11px] font-black uppercase tracking-[0.14em] text-ink-faint">
            What kind of week is it?
          </div>
          <div className="grid grid-cols-2 gap-2">
            {REASONS.map((r) => (
              <button
                key={r.id}
                onClick={() => setReason(r.id)}
                className={`rounded-xl border px-3 py-2.5 text-[12.5px] font-bold ${
                  reason === r.id ? 'border-accent/50 bg-accent/15 text-accent-soft' : 'border-edge bg-white/[0.07] text-ink-dim'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-ink-faint">
            Why are you deloading this week? <span className="text-danger">(required)</span>
          </div>
          <textarea
            value={claimText}
            onChange={(e) => setClaimText(e.target.value)}
            rows={3}
            placeholder="e.g. Double gigs Fri + Sat and inventory shifts Mon–Wed. Realistically three sessions max."
            className="w-full rounded-xl bg-white/[0.07] px-3.5 py-3 text-[13.5px] leading-snug outline-none placeholder:text-ink-faint focus:border-accent/50"
          />
          {claimText.length > 0 && claimText.trim().length < 5 && (
            <p className="mt-1 text-[11px] font-semibold text-danger">
              That's not a reason, that's a keystroke. Full sentence.
            </p>
          )}
        </div>

        <div className="flex gap-2">
          <Btn kind="ghost" className="flex-1" onClick={onClose}>
            Keep current tier
          </Btn>
          <Btn
            className="flex-1"
            disabled={!ready}
            onClick={() => {
              changeTier(weekStart, to, { reason: reason!, claimText: claimText.trim() })
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

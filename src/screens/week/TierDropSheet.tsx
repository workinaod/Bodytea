import { useRef, useState } from 'react'
import type { ExcuseReason, ISODate, Tier } from '../../types'
import { Sheet } from '../../components/Sheet'
import { Btn } from '../../components/ui'
import { useAppStore } from '../../store/appStore'
import { validateProofFile } from '../../store/storage'
import { anyGigFlag, escalationLevel, unprovenExcusesInWindow } from '../../engine/coach'
import { mondayOf, todayISO } from '../../engine/calendar'
import { changeTier, savePhotoFile } from '../../logic/actions'

const REASONS: { id: ExcuseReason; label: string }[] = [
  { id: 'busy', label: 'Work-heavy week' },
  { id: 'gig', label: 'Gigs stacked' },
  { id: 'travel', label: 'Traveling' },
  { id: 'sick', label: 'Sick / banged up' },
  { id: 'other', label: 'Other' },
]

/**
 * Mid-week tier drops: fresh proof (validated), a gig cross-check against
 * the week's declared flags, and typed-DROP friction when the record
 * already has unproven excuses. Nothing slides through silently anymore.
 */
export function TierDropSheet({
  to,
  weekStart,
  onClose,
}: {
  to: Tier
  weekStart: ISODate
  onClose: () => void
}) {
  const data = useAppStore((s) => s.data)
  const [reason, setReason] = useState<ExcuseReason | null>(null)
  const [proofId, setProofId] = useState<string | undefined>()
  const [pendingProof, setPendingProof] = useState<{ file: File; url: string } | null>(null)
  const [proofError, setProofError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const level = escalationLevel(data.excuses, todayISO())
  const unproven = unprovenExcusesInWindow(data.excuses, todayISO()).length
  const week = data.weeks[mondayOf(weekStart)]
  const gigCoversWeek = reason === 'gig' && anyGigFlag(week)
  const willBeAccepted = !!proofId || gigCoversWeek
  const needsTyped = level >= 1 && !willBeAccepted

  function onPick(file: File) {
    setProofError(null)
    const check = validateProofFile(file)
    if (!check.ok) {
      setProofError(
        check.reason === 'stale'
          ? `That image is ${check.ageDays} days old. This week's conflict needs this week's proof.`
          : 'Images only — calendar screenshot, schedule, gig poster.',
      )
      return
    }
    setPendingProof({ file, url: URL.createObjectURL(file) })
  }

  return (
    <Sheet open onClose={onClose} title={`Drop to Tier ${to} mid-week?`}>
      <div className="space-y-4 pb-6">
        <p className="text-[13px] leading-snug text-ink-dim">
          The plan says pick the tier at the START of the week. A mid-week drop needs receipts —
          and the app checks them: proof must be a fresh image, and a "gigs" claim only counts if
          the gig is already flagged on this week. Full sessions logged on a "brutal week" get
          called out afterward, too.
        </p>

        {unproven > 0 && (
          <div className="rounded-xl border border-danger/25 bg-danger/8 px-3.5 py-2.5 text-[12px] font-bold text-danger">
            {unproven} unproven excuse{unproven > 1 ? 's' : ''} already on the 30-day record.
          </div>
        )}

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

        {reason === 'gig' && (
          <div
            className={`rounded-xl border px-3.5 py-2.5 text-[12px] font-semibold leading-snug ${
              gigCoversWeek ? 'border-lime/30 bg-lime/8 text-lime' : 'border-gold/30 bg-gold/8 text-gold'
            }`}
          >
            {gigCoversWeek
              ? '✓ Checks out — this week has gig flags set in the Week tab. Accepted as planned.'
              : 'No gig flags are set on this week. Declared-in-advance gigs auto-verify; surprise ones need a fresh photo (poster, booking, schedule).'}
          </div>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) onPick(f)
            e.target.value = ''
          }}
        />

        {proofError && (
          <div className="rounded-xl border border-danger/30 bg-danger/8 px-3.5 py-3 text-[12.5px] font-bold leading-snug text-danger">
            {proofError}
          </div>
        )}

        {pendingProof ? (
          <div className="space-y-2.5 rounded-xl border border-gold/30 bg-gold/8 p-3.5">
            <img src={pendingProof.url} alt="proof preview" className="max-h-52 w-full rounded-lg object-contain" />
            <p className="text-[12.5px] font-semibold leading-snug text-gold">
              Straight to the ledger, forever. Does it actually show the conflict?
            </p>
            <div className="flex gap-2">
              <Btn
                kind="ghost"
                className="flex-1"
                onClick={() => {
                  URL.revokeObjectURL(pendingProof.url)
                  setPendingProof(null)
                }}
              >
                Wrong photo
              </Btn>
              <Btn
                kind="lime"
                className="flex-1"
                disabled={busy}
                onClick={async () => {
                  setBusy(true)
                  try {
                    const meta = await savePhotoFile(pendingProof.file, 'proof')
                    setProofId(meta.id)
                    URL.revokeObjectURL(pendingProof.url)
                    setPendingProof(null)
                  } finally {
                    setBusy(false)
                  }
                }}
              >
                {busy ? 'Saving…' : 'It shows it — attach'}
              </Btn>
            </div>
          </div>
        ) : proofId ? (
          <div className="rounded-xl border border-lime/30 bg-lime/8 px-3.5 py-3 text-[13px] font-bold text-lime">
            ✓ Fresh proof attached — this counts as planned
          </div>
        ) : (
          <Btn kind="subtle" className="w-full" onClick={() => fileRef.current?.click()}>
            📎 Attach fresh proof
          </Btn>
        )}

        {needsTyped && reason && (
          <div>
            <div className="mb-1.5 text-[12px] font-semibold text-danger">
              Unproven drop with a record behind it. Type <span className="font-black">DROP</span> to
              own it.
            </div>
            <input
              className="w-full rounded-xl border border-danger/40 bg-surface-2 px-3.5 py-3 text-center text-[15px] font-black tracking-[0.3em] outline-none"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
              placeholder="DROP"
            />
          </div>
        )}

        <div className="flex gap-2">
          <Btn kind="ghost" className="flex-1" onClick={onClose}>
            Keep current tier
          </Btn>
          <Btn
            className="flex-1"
            disabled={!reason || (needsTyped && confirmText !== 'DROP')}
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

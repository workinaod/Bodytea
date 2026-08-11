import { useRef, useState } from 'react'
import type { ExcuseReason, ResolvedDay } from '../../types'
import { Sheet } from '../../components/Sheet'
import { Btn } from '../../components/ui'
import { escalationLevel } from '../../engine/coach'
import { minimumViableFor } from '../../engine/transforms'
import { planTemplate } from '../../engine/resolveDay'
import { todayISO } from '../../engine/calendar'
import { useAppStore } from '../../store/appStore'
import { validateProofFile } from '../../store/storage'
import { pushCoachMessage, resolveSkipFlow, savePhotoFile, trimToday } from '../../logic/actions'

const REASONS: { id: ExcuseReason; label: string }[] = [
  { id: 'busy', label: 'Work / busy' },
  { id: 'tired', label: 'Exhausted' },
  { id: 'sick', label: 'Sick / hurt' },
  { id: 'gig', label: 'DJ gig / shift' },
  { id: 'travel', label: 'Traveling' },
  { id: 'other', label: 'Other' },
]

/**
 * The forced 3-step flow: reason → proof → counter-offer.
 * No dismiss, no tap-outside, the only exits are decisions.
 */
export function SkipFlow({
  day,
  onDone,
  onCancel,
}: {
  day: ResolvedDay
  onDone: (message: string, tookMinimum: boolean) => void
  onCancel: () => void
}) {
  const excuses = useAppStore((s) => s.data.excuses)
  const level = escalationLevel(excuses, todayISO())
  const [step, setStep] = useState<0 | 1 | 2>(0)
  const [mode, setMode] = useState<'skip' | 'lighten' | 'trim'>('trim')
  const [reason, setReason] = useState<ExcuseReason | null>(null)
  const [claimText, setClaimText] = useState('')
  const [proofId, setProofId] = useState<string | undefined>()
  const [proofBusy, setProofBusy] = useState(false)
  const [proofError, setProofError] = useState<string | null>(null)
  const [pendingProof, setPendingProof] = useState<{ file: File; url: string } | null>(null)
  const [confirmText, setConfirmText] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const warnedExplosive = useRef(false)

  const plan = useAppStore((s) => s.data.plan)
  const template = day.templateId ? planTemplate(plan, day.templateId) : null
  const mv = template ? minimumViableFor(template, day.exercises) : null
  const needsTypedConfirm = level >= 2 && !proofId && mode === 'skip'

  if (day.cns && !warnedExplosive.current) {
    warnedExplosive.current = true
    pushCoachMessage('explosive-day-warning')
  }

  function onProofPick(file: File) {
    setProofError(null)
    // The mechanical check: proof must be a fresh image (this week's
    // screenshot/photo), not something dug out of the camera roll.
    const check = validateProofFile(file)
    if (!check.ok) {
      setProofError(
        check.reason === 'stale'
          ? `That image is ${check.ageDays} days old. A conflict THIS week has proof FROM this week. Fresh screenshot or no proof.`
          : 'That file is not an image. Calendar screenshot, schedule photo, gig poster. Pictures only.',
      )
      return
    }
    setPendingProof({ file, url: URL.createObjectURL(file) })
  }

  async function confirmProof() {
    if (!pendingProof) return
    setProofBusy(true)
    try {
      const meta = await savePhotoFile(pendingProof.file, 'proof')
      setProofId(meta.id)
      URL.revokeObjectURL(pendingProof.url)
      setPendingProof(null)
    } catch (e) {
      console.error('proof save failed', e)
    } finally {
      setProofBusy(false)
    }
  }

  function discardPending() {
    if (pendingProof) URL.revokeObjectURL(pendingProof.url)
    setPendingProof(null)
  }

  function finish(takeMinimum: boolean) {
    if (mode === 'trim') return // trim never reaches the skip machinery
    const { message } = resolveSkipFlow({
      date: day.date,
      mode,
      reason: reason ?? 'none',
      claimText: claimText || undefined,
      proofPhotoId: proofId,
      takeMinimum,
    })
    onDone(message, takeMinimum)
  }

  return (
    <Sheet open onClose={() => {}} locked title={day.cns ? '⚠ This is an explosive day' : "Can't train?"}>
      {day.cns && (
        <div className="mb-3 rounded-xl border border-danger/30 bg-danger/8 px-3.5 py-3 text-[12.5px] font-semibold leading-snug text-danger">
          Rule one: NEVER drop the explosive day. First thing people cut, fastest thing to lose.
          Try moving it to another day (Week tab) before zeroing it.
        </div>
      )}

      {step === 0 && (
        <div className="space-y-4 pb-5">
          <div className="space-y-2">
            <button
              onClick={() => setMode('trim')}
              className={`block w-full rounded-xl border p-3.5 text-left ${mode === 'trim' ? 'border-lime/40 bg-lime/10' : 'border-edge bg-white/[0.07]'}`}
            >
              <div className="text-[14px] font-bold">Trim today's load</div>
              <div className="mt-0.5 text-[11.5px] text-ink-faint">
                Full session, volume cut: explosive −1/3, lifts light. Still counts as training.
              </div>
            </button>
            <button
              onClick={() => setMode('lighten')}
              className={`block w-full rounded-xl border p-3.5 text-left ${mode === 'lighten' ? 'border-gold/40 bg-gold/10' : 'border-edge bg-white/[0.07]'}`}
            >
              <div className="text-[14px] font-bold">Bare minimum</div>
              <div className="mt-0.5 text-[11.5px] text-ink-faint">The ~10-minute version. Habit survives.</div>
            </button>
            <button
              onClick={() => setMode('skip')}
              className={`block w-full rounded-xl border p-3.5 text-left ${mode === 'skip' ? 'border-danger/40 bg-danger/10' : 'border-edge bg-white/[0.07]'}`}
            >
              <div className="text-[14px] font-bold">Skip the day</div>
              <div className="mt-0.5 text-[11.5px] text-ink-faint">Zero. Nothing. Goes on the record.</div>
            </button>
          </div>

          <div>
            <div className="mb-2 text-[11px] font-black uppercase tracking-[0.14em] text-ink-faint">
              Why?
            </div>
            <div className="grid grid-cols-3 gap-2">
              {REASONS.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setReason(r.id)}
                  className={`rounded-xl border px-2 py-2.5 text-[12px] font-bold ${
                    reason === r.id ? 'border-accent/50 bg-accent/15 text-accent-soft' : 'border-edge bg-white/[0.07] text-ink-dim'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <input
              className="mt-2 w-full rounded-xl bg-white/[0.07] px-3.5 py-3 text-[13px] outline-none placeholder:text-ink-faint"
              placeholder="Details (optional), goes on the record"
              value={claimText}
              onChange={(e) => setClaimText(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <Btn kind="ghost" className="flex-1" onClick={onCancel}>
              Never mind, I'll train
            </Btn>
            {mode === 'trim' ? (
              <Btn
                kind="lime"
                className="flex-1"
                disabled={!reason}
                onClick={() => {
                  trimToday(day.date, reason!, claimText || undefined)
                  onCancel()
                }}
              >
                Trim it, still training
              </Btn>
            ) : (
              <Btn className="flex-1" disabled={!reason} onClick={() => setStep(1)}>
                Continue
              </Btn>
            )}
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4 pb-5">
          <p className="text-[13.5px] leading-snug text-ink-dim">
            {level >= 2
              ? 'At this point in the month: calendar photo or it didn\'t happen. Screenshot of the schedule, the gig poster, anything real.'
              : 'Attach proof and this counts as a planned choice, not a failure. No proof means it goes down as unproven.'}
          </p>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void onProofPick(f)
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
                This goes in the ledger permanently, next to your name. Does it actually show the
                conflict?
              </p>
              <div className="flex gap-2">
                <Btn kind="ghost" className="flex-1" onClick={discardPending}>
                  Wrong photo
                </Btn>
                <Btn kind="lime" className="flex-1" disabled={proofBusy} onClick={() => void confirmProof()}>
                  {proofBusy ? 'Saving…' : 'Yep, attach it'}
                </Btn>
              </div>
            </div>
          ) : proofId ? (
            <div className="flex items-center justify-between rounded-xl border border-lime/30 bg-lime/8 px-3.5 py-3">
              <span className="text-[13px] font-bold text-lime">✓ Fresh proof attached, accepted</span>
              <button className="text-[12px] font-semibold text-ink-faint underline" onClick={() => setProofId(undefined)}>
                remove
              </button>
            </div>
          ) : (
            <Btn kind="subtle" className="w-full" onClick={() => fileRef.current?.click()} disabled={proofBusy}>
              📎 Attach proof (calendar / schedule / gig poster)
            </Btn>
          )}
          <div className="flex gap-2">
            <Btn kind="ghost" className="flex-1" onClick={() => setStep(0)}>
              Back
            </Btn>
            <Btn className="flex-1" onClick={() => setStep(2)}>
              {proofId ? 'Continue' : 'Continue without proof'}
            </Btn>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4 pb-5">
          {mv && (
            <div className="rounded-xl border border-accent/30 bg-accent/8 p-4">
              <div className="text-[11px] font-black uppercase tracking-[0.14em] text-accent">
                The counter-offer: {mv.label}
              </div>
              <ul className="mt-2 space-y-1.5">
                {mv.exercises.map((e) => (
                  <li key={e.exerciseId} className="flex justify-between text-[13px]">
                    <span className="font-semibold text-ink">{e.name}</span>
                    <span className="font-mono text-ink-dim">
                      {e.sets > 1 ? `${e.sets} × ${e.repText}` : e.repText}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[12px] leading-snug text-ink-dim">
                Ten-ish minutes. The habit survives, the streak survives, and you can stop after.
                Deal's a deal.
              </p>
            </div>
          )}

          {needsTypedConfirm && (
            <div>
              <div className="mb-1.5 text-[12px] font-semibold text-danger">
                No proof at escalation level {level}. Type <span className="font-black">SKIP</span> to
                confirm you're really doing this.
              </div>
              <input
                className="w-full rounded-xl border border-danger/40 bg-white/[0.07] px-3.5 py-3 text-center text-[15px] font-black tracking-[0.3em] outline-none"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                placeholder="SKIP"
              />
            </div>
          )}

          <div className="flex flex-col gap-2">
            {mv && (
              <Btn kind="lime" onClick={() => finish(true)}>
                I'll do the minimum ({mv.label})
              </Btn>
            )}
            <Btn
              kind="danger"
              disabled={needsTypedConfirm && confirmText !== 'SKIP'}
              onClick={() => finish(false)}
            >
              {mode === 'lighten' && !mv ? 'Log it lightened' : 'Still skipping'}
            </Btn>
            <Btn kind="ghost" onClick={onCancel}>
              Never mind, I'll train
            </Btn>
          </div>
        </div>
      )}
    </Sheet>
  )
}

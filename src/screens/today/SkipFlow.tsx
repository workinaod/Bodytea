import { useRef, useState } from 'react'
import type { ExcuseReason, ResolvedDay } from '../../types'
import { Sheet } from '../../components/Sheet'
import { Btn } from '../../components/ui'
import { escalationLevel } from '../../engine/coach'
import { minimumViableFor } from '../../engine/transforms'
import { getTemplate } from '../../plan/templates'
import { todayISO } from '../../engine/calendar'
import { useAppStore } from '../../store/appStore'
import { pushCoachMessage, resolveSkipFlow, savePhotoFile } from '../../logic/actions'

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
 * No dismiss, no tap-outside — the only exits are decisions.
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
  const [mode, setMode] = useState<'skip' | 'lighten'>('skip')
  const [reason, setReason] = useState<ExcuseReason | null>(null)
  const [claimText, setClaimText] = useState('')
  const [proofId, setProofId] = useState<string | undefined>()
  const [proofBusy, setProofBusy] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const warnedExplosive = useRef(false)

  const template = day.templateId ? getTemplate(day.templateId) : null
  const mv = template ? minimumViableFor(template, day.exercises) : null
  const needsTypedConfirm = level >= 2 && !proofId && mode === 'skip'

  if (day.cns && !warnedExplosive.current) {
    warnedExplosive.current = true
    pushCoachMessage('explosive-day-warning')
  }

  async function onProofPick(file: File) {
    setProofBusy(true)
    try {
      const meta = await savePhotoFile(file, 'proof')
      setProofId(meta.id)
    } catch (e) {
      console.error('proof save failed', e)
    } finally {
      setProofBusy(false)
    }
  }

  function finish(takeMinimum: boolean) {
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
          The plan's rule: NEVER drop the explosive day — it's the first thing people cut and the
          fastest thing to lose. Consider moving it to another day (Week tab) before zeroing it.
        </div>
      )}

      {step === 0 && (
        <div className="space-y-4 pb-5">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setMode('skip')}
              className={`rounded-xl border p-3.5 text-left ${mode === 'skip' ? 'border-danger/40 bg-danger/10' : 'border-edge bg-surface-2'}`}
            >
              <div className="text-[14px] font-bold">Skip the day</div>
              <div className="mt-0.5 text-[11.5px] text-ink-faint">Zero. Nothing. Gone.</div>
            </button>
            <button
              onClick={() => setMode('lighten')}
              className={`rounded-xl border p-3.5 text-left ${mode === 'lighten' ? 'border-gold/40 bg-gold/10' : 'border-edge bg-surface-2'}`}
            >
              <div className="text-[14px] font-bold">Lighten it</div>
              <div className="mt-0.5 text-[11.5px] text-ink-faint">Do the short version instead.</div>
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
                    reason === r.id ? 'border-accent/50 bg-accent/15 text-accent-soft' : 'border-edge bg-surface-2 text-ink-dim'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <input
              className="mt-2 w-full rounded-xl border border-edge bg-surface-2 px-3.5 py-3 text-[13px] outline-none placeholder:text-ink-faint"
              placeholder="Details (optional) — goes on the record"
              value={claimText}
              onChange={(e) => setClaimText(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <Btn kind="ghost" className="flex-1" onClick={onCancel}>
              Never mind — I'll train
            </Btn>
            <Btn className="flex-1" disabled={!reason} onClick={() => setStep(1)}>
              Continue
            </Btn>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4 pb-5">
          <p className="text-[13.5px] leading-snug text-ink-dim">
            {level >= 2
              ? 'At this point in the month: calendar photo or it didn\'t happen. Screenshot of the schedule, the gig poster, anything real.'
              : 'Attach proof and this counts as a planned choice, not a failure — the plan\'s own words. No proof means it goes on the record as unproven.'}
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
          {proofId ? (
            <div className="flex items-center justify-between rounded-xl border border-lime/30 bg-lime/8 px-3.5 py-3">
              <span className="text-[13px] font-bold text-lime">✓ Proof attached — accepted</span>
              <button className="text-[12px] font-semibold text-ink-faint underline" onClick={() => setProofId(undefined)}>
                remove
              </button>
            </div>
          ) : (
            <Btn kind="subtle" className="w-full" onClick={() => fileRef.current?.click()} disabled={proofBusy}>
              {proofBusy ? 'Saving…' : '📎 Attach proof (calendar / schedule / gig poster)'}
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
                Ten-ish minutes. The habit survives, the streak survives, and you get to stop after —
                deal's a deal.
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
                className="w-full rounded-xl border border-danger/40 bg-surface-2 px-3.5 py-3 text-center text-[15px] font-black tracking-[0.3em] outline-none"
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
              Never mind — I'll train
            </Btn>
          </div>
        </div>
      )}
    </Sheet>
  )
}

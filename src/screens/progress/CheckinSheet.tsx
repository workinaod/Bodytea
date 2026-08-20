import { useEffect, useRef, useState } from 'react'
import type { Measurement } from '../../types'
import { todayISO } from '../../engine/calendar'
import { saveMeasurement, savePhotoFile } from '../../logic/actions'
import { Sheet } from '../../components/Sheet'
import { Btn, Stepper } from '../../components/ui'
import { BodyFatEstimator } from './BodyFatEstimator'

// ============================================================
// The weekly check-in: tape, scale, and the photos.
//
// Lifted out of ProgressScreen so the period review can open it
// too. The week's review ends on a standing ask for a front and
// a side shot, and that ask has to land somewhere the camera
// actually opens; a button that only tells you to go find
// another tab is not an ask, it is a sign.
// ============================================================

export function CheckinSheet({ open, onClose, onSaved, last }: { open: boolean; onClose: () => void; onSaved?: () => void; last?: Measurement }) {
  const fresh = (): Measurement => ({
    date: todayISO(),
    photoIds: {},
    weightLb: last?.weightLb,
    bodyFatPct: last?.bodyFatPct,
    waistIn: last?.waistIn,
    chestIn: last?.chestIn,
    armsIn: last?.armsIn,
    thighIn: last?.thighIn,
    vertIn: last?.vertIn,
  })
  const [m, setM] = useState<Measurement>(fresh)
  const [busy, setBusy] = useState<string | null>(null)
  const [estimating, setEstimating] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const angleRef = useRef<'front' | 'side' | 'back'>('front')

  // Re-seed the form (incl. the DATE) each time the sheet opens, the
  // component mounts with the screen, not with the sheet.
  useEffect(() => {
    if (open) setM(fresh())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const fields = [
    { key: 'weightLb', label: 'Weight', step: 0.5, unit: 'lb' },
    { key: 'bodyFatPct', label: 'Body fat', step: 0.5, unit: '%' },
    { key: 'waistIn', label: 'Waist', step: 0.25, unit: 'in' },
    { key: 'chestIn', label: 'Chest', step: 0.25, unit: 'in' },
    { key: 'armsIn', label: 'Arms', step: 0.25, unit: 'in' },
    { key: 'thighIn', label: 'Thigh', step: 0.25, unit: 'in' },
    { key: 'vertIn', label: 'Vert / rim', step: 0.5, unit: 'in' },
  ] as const

  return (
    <Sheet open={open} onClose={onClose} title="Weekly check-in">
      <div className="space-y-3 pb-6">
        <p className="text-[12px] text-ink-dim">
          Same morning each week, same conditions. Prefilled with last week, adjust what changed.
        </p>
        {fields.map((f) => (
          <div key={f.key}>
            <div className="flex items-center justify-between">
              <span className="text-[13.5px] font-bold">{f.label}</span>
              <Stepper
                value={m[f.key]}
                onChange={(v) => setM({ ...m, [f.key]: v })}
                step={f.step}
                suffix={f.unit}
                width="w-20"
              />
            </div>
            {f.key === 'bodyFatPct' && (
              <button
                onClick={() => setEstimating(true)}
                className="mt-0.5 text-[11.5px] font-bold text-cyan underline"
              >
                Don't know it? Estimate with a tape measure →
              </button>
            )}
          </div>
        ))}
        {estimating && (
          <BodyFatEstimator
            initialWaist={m.waistIn}
            onClose={() => setEstimating(false)}
            onDone={(r) => {
              setM({ ...m, bodyFatPct: r.bodyFatPct, neckIn: r.neckIn, waistIn: r.waistIn, hipIn: r.hipIn })
              setEstimating(false)
            }}
          />
        )}

        <div className="pt-1">
          <div className="mb-1.5 text-[11px] font-black uppercase tracking-wider text-ink-faint">
            Photos: front, side, back, same lighting
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0]
              if (!f) return
              const angle = angleRef.current
              setBusy(angle)
              try {
                const meta = await savePhotoFile(f, 'progress')
                setM((prev) => ({ ...prev, photoIds: { ...prev.photoIds, [angle]: meta.id } }))
              } finally {
                setBusy(null)
              }
            }}
          />
          <div className="grid grid-cols-3 gap-2">
            {(['front', 'side', 'back'] as const).map((angle) => (
              <button
                key={angle}
                disabled={busy !== null}
                onClick={() => {
                  angleRef.current = angle
                  fileRef.current?.click()
                }}
                className={`rounded-xl border p-3 text-center text-[12px] font-bold ${
                  m.photoIds[angle] ? 'border-lime/40 bg-lime/8 text-lime' : 'border-edge bg-white/[0.07] text-ink-dim'
                }`}
              >
                {busy === angle ? 'Saving…' : m.photoIds[angle] ? `✓ ${angle}` : `📷 ${angle}`}
              </button>
            ))}
          </div>
        </div>

        <Btn
          className="w-full"
          onClick={() => {
            saveMeasurement(m)
            onClose()
            onSaved?.()
          }}
        >
          Save check-in
        </Btn>
      </div>
    </Sheet>
  )
}

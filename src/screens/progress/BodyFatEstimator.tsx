import { useState } from 'react'
import { useAppStore } from '../../store/appStore'
import { estimateBodyFat, TAPE_STEPS } from '../../engine/bodyfat'
import { Btn, Chip, Stepper } from '../../components/ui'
import { Sheet } from '../../components/Sheet'

/**
 * Guided tape-measure body-fat estimate (US Navy method) for people
 * who have no idea what their number is: one setup question, then
 * one measurement per screen with exactly how to take it.
 */
export function BodyFatEstimator({
  initialWaist,
  onDone,
  onClose,
}: {
  initialWaist?: number
  onDone: (r: { bodyFatPct: number; neckIn: number; waistIn: number; hipIn?: number }) => void
  onClose: () => void
}) {
  const profile = useAppStore((s) => s.data.profile)
  const update = useAppStore((s) => s.update)
  const [formula, setFormula] = useState<'male' | 'female' | null>(profile.bfFormula ?? null)
  const [heightIn, setHeightIn] = useState(profile.heightIn ?? 70)
  const [step, setStep] = useState<'setup' | 'neck' | 'waist' | 'hip' | 'result'>(
    profile.bfFormula && profile.heightIn ? 'neck' : 'setup',
  )
  const [neckIn, setNeckIn] = useState(15)
  const [waistIn, setWaistIn] = useState(initialWaist ?? 34)
  const [hipIn, setHipIn] = useState(38)

  const pct =
    formula && step === 'result'
      ? estimateBodyFat({ formula, heightIn, neckIn, waistIn, hipIn: formula === 'female' ? hipIn : undefined })
      : null

  function saveSetup() {
    update((d) => {
      d.profile.bfFormula = formula!
      d.profile.heightIn = heightIn
    })
    setStep('neck')
  }

  const guidance = step === 'neck' || step === 'waist' || step === 'hip' ? TAPE_STEPS[step] : null
  const valueFor = { neck: neckIn, waist: waistIn, hip: hipIn } as const
  const setterFor = { neck: setNeckIn, waist: setWaistIn, hip: setHipIn } as const

  return (
    <Sheet open onClose={onClose} title="Estimate body fat">
      <div className="space-y-4 pb-6">
        {step === 'setup' && (
          <>
            <p className="text-[12.5px] leading-snug text-ink-dim">
              All you need is a soft tape measure. The US Navy method estimates body fat from two or
              three tape sites. Not lab-grade, but consistent, and that's what the trend needs.
            </p>
            <div>
              <div className="mb-1.5 text-[11px] font-black uppercase tracking-wider text-ink-faint">
                Which formula fits your body?
              </div>
              <div className="flex gap-2">
                <Chip tone={formula === 'male' ? 'accent' : 'default'} onClick={() => setFormula('male')}>
                  Male formula (neck + waist)
                </Chip>
                <Chip tone={formula === 'female' ? 'accent' : 'default'} onClick={() => setFormula('female')}>
                  Female formula (adds hips)
                </Chip>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[13.5px] font-bold">Height</span>
              <Stepper value={heightIn} onChange={setHeightIn} step={0.5} suffix="in" width="w-20" />
            </div>
            <Btn className="w-full" disabled={!formula} onClick={saveSetup}>
              Next: first measurement
            </Btn>
          </>
        )}

        {guidance && (
          <>
            <div className="text-[11px] font-black uppercase tracking-[0.16em] text-accent">
              Tape site {step === 'neck' ? 1 : step === 'waist' ? 2 : 3}: {guidance.title}
            </div>
            <ol className="space-y-2">
              {guidance.how.map((h, i) => (
                <li key={i} className="flex gap-2.5 text-[13px] leading-snug text-ink-dim">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-2 text-[11px] font-black text-accent">
                    {i + 1}
                  </span>
                  {h}
                </li>
              ))}
            </ol>
            <div className="flex items-center justify-between rounded-2xl border border-edge/80 bg-surface px-4 py-3">
              <span className="text-[13.5px] font-bold">{guidance.title} measurement</span>
              <Stepper
                value={valueFor[step as 'neck' | 'waist' | 'hip']}
                onChange={setterFor[step as 'neck' | 'waist' | 'hip']}
                step={0.25}
                suffix="in"
                width="w-20"
              />
            </div>
            <Btn
              className="w-full"
              onClick={() => {
                if (step === 'neck') setStep('waist')
                else if (step === 'waist') setStep(formula === 'female' ? 'hip' : 'result')
                else setStep('result')
              }}
            >
              {step === 'waist' && formula !== 'female' ? 'Calculate' : step === 'hip' ? 'Calculate' : 'Next site'}
            </Btn>
          </>
        )}

        {step === 'result' && (
          <>
            {pct !== null ? (
              <>
                <div className="rounded-3xl border border-accent/25 bg-gradient-to-b from-surface-2 to-surface px-5 py-6 text-center">
                  <div className="text-[11px] font-black uppercase tracking-[0.2em] text-ink-faint">
                    Estimated body fat
                  </div>
                  <div className="mt-1 font-display text-[44px] font-bold leading-none text-accent">
                    {pct}%
                  </div>
                  <p className="mx-auto mt-3 max-w-[36ch] text-[11.5px] leading-snug text-ink-faint">
                    Tape estimates carry a few points of error, that's fine. Measure the SAME way
                    every check-in and the trend becomes the most honest number you own.
                  </p>
                </div>
                <Btn
                  kind="lime"
                  className="w-full"
                  onClick={() =>
                    onDone({ bodyFatPct: pct, neckIn, waistIn, hipIn: formula === 'female' ? hipIn : undefined })
                  }
                >
                  Use {pct}% in this check-in
                </Btn>
              </>
            ) : (
              <div className="border-l-2 border-danger/70 py-1 pl-3 text-[12.5px] leading-snug text-danger">
                Those numbers don't produce a sane estimate. Usually a tape slip (neck bigger than
                waist, or a missed site). Go back and re-measure.
              </div>
            )}
            <Btn kind="ghost" className="w-full" onClick={() => setStep('neck')}>
              Re-measure
            </Btn>
          </>
        )}
      </div>
    </Sheet>
  )
}

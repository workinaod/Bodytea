import { useState } from 'react'
import { useAppStore } from '../store/appStore'
import { mondayOf, todayISO } from '../engine/calendar'
import { Btn, Card, Stepper } from '../components/ui'
import { saveMeasurement } from '../logic/actions'

export function Onboarding() {
  const update = useAppStore((s) => s.update)
  const [step, setStep] = useState(0)
  const [start, setStart] = useState(() => mondayOf(todayISO()))
  const [weight, setWeight] = useState<number | undefined>(197)
  const [waist, setWaist] = useState<number | undefined>()
  const [vert, setVert] = useState<number | undefined>()

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-5 py-10">
      {step === 0 && (
        <div className="space-y-5">
          <div>
            <div className="text-[13px] font-black uppercase tracking-[0.2em] text-accent">Hybrid Athlete</div>
            <h1 className="mt-1 text-[40px] font-black leading-none tracking-tight">NAOD V3</h1>
            <p className="mt-3 text-[14px] leading-relaxed text-ink-dim">
              Your 16-week plan, turned into a coach that guides every session, tracks every number,
              adjusts for deloads, gigs, and brutal weeks — and calls you out when you're dodging.
            </p>
          </div>
          <Card className="space-y-1.5 !py-3.5 text-[12.5px] text-ink-dim">
            <div>🏀 Dunks, speed, and a sharper physique — same engine, one app</div>
            <div>📊 Every set logged, every PR caught, every week mapped</div>
            <div>🥩 Protein-first meals with one-tap logging</div>
            <div>🪖 A sergeant that accepts calendar proof — and nothing less</div>
          </Card>
          <Btn className="w-full" onClick={() => setStep(1)}>
            Set it up (60 seconds)
          </Btn>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-5">
          <h2 className="text-[24px] font-black tracking-tight">When does Week 1 start?</h2>
          <p className="text-[13px] leading-snug text-ink-dim">
            Blocks, deloads, and A/B weeks all count from this Monday. Starting mid-week is fine —
            the week you're in becomes Week 1.
          </p>
          <input
            type="date"
            value={start}
            onChange={(e) => e.target.value && setStart(mondayOf(e.target.value))}
            className="w-full rounded-xl border border-edge bg-surface-2 px-3.5 py-3 text-[15px] font-bold outline-none [color-scheme:dark]"
          />
          <p className="text-[11.5px] text-ink-faint">Snapped to Monday: {start}</p>
          <Btn className="w-full" onClick={() => setStep(2)}>
            Next — baseline numbers
          </Btn>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-5">
          <h2 className="text-[24px] font-black tracking-tight">Where are you starting?</h2>
          <p className="text-[13px] leading-snug text-ink-dim">
            Week-1 baseline. Skip anything you don't know — you can measure at Sunday's check-in.
          </p>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[14px] font-bold">Weight</span>
              <Stepper value={weight} onChange={setWeight} step={0.5} suffix="lb" width="w-20" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[14px] font-bold">Waist</span>
              <Stepper value={waist} onChange={setWaist} step={0.25} suffix="in" width="w-20" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[14px] font-bold">Vert / rim touch</span>
              <Stepper value={vert} onChange={setVert} step={0.5} suffix="in" width="w-20" />
            </div>
          </div>
          <Btn className="w-full" onClick={() => setStep(3)}>
            Last step
          </Btn>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-5">
          <h2 className="text-[24px] font-black tracking-tight">Two things, then we train</h2>
          <Card className="space-y-2 text-[13px] leading-relaxed text-ink-dim">
            <p>
              <span className="font-bold text-ink">1. Add to Home Screen.</span> Share button →{' '}
              <span className="font-bold">Add to Home Screen</span>. It becomes a real app, works
              offline at the gym, and iOS protects your data properly.
            </p>
            <p>
              <span className="font-bold text-ink">2. Your data lives on this phone.</span> One-tap
              backup lives in Coach → data. The sergeant will nag you weekly about it. Let him.
            </p>
          </Card>
          <Btn
            className="w-full"
            onClick={() => {
              try {
                void navigator.storage?.persist?.()
              } catch { /* unsupported */ }
              update((d) => {
                d.settings.phaseStartDate = start
                d.settings.installedAt = todayISO()
                d.settings.onboarded = true
              })
              if (weight || waist || vert) {
                saveMeasurement({
                  date: todayISO(),
                  weightLb: weight,
                  waistIn: waist,
                  vertIn: vert,
                  photoIds: {},
                })
              }
            }}
          >
            Let's work.
          </Btn>
        </div>
      )}
    </div>
  )
}

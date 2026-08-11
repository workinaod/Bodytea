import { useState } from 'react'
import type { SessionIntensity } from '../../types'
import { Sheet } from '../../components/Sheet'
import { Btn, Toggle } from '../../components/ui'

const FLAGS: { label: string; sub: string }[] = [
  { label: 'Slept under 6 hours', sub: 'The red line for CNS work.' },
  { label: 'Wired or run-down', sub: 'Resting heart rate feels elevated.' },
  { label: 'Legs sore or heavy', sub: 'Still carrying the last session.' },
  { label: 'Genuinely low energy', sub: 'Not just lazy — actually flat.' },
]

const INTENSITIES: { id: SessionIntensity; label: string; sub: string }[] = [
  { id: 'full', label: 'Full send', sub: 'The day as written.' },
  { id: 'lighter', label: 'Lighter', sub: 'Volume −1/3, lifts light — 3 in the tank.' },
  { id: 'minimum', label: 'Bare minimum', sub: 'Shortest honest version. Beats zero.' },
]

/** The 10-second gut check before Monday/Saturday CNS days. */
export function ReadinessSheet({
  open,
  onClose,
  onStart,
}: {
  open: boolean
  onClose: () => void
  onStart: (flags: [boolean, boolean, boolean, boolean], intensity: SessionIntensity) => void
}) {
  const [flags, setFlags] = useState<[boolean, boolean, boolean, boolean]>([false, false, false, false])
  const [intensity, setIntensity] = useState<SessionIntensity>('full')
  const count = flags.filter(Boolean).length
  const downgrade = count >= 2

  return (
    <Sheet open={open} onClose={onClose} title="10-second readiness check">
      <p className="mb-4 text-[13px] leading-snug text-ink-dim">
        Max-effort day. Fast and fresh beats tired and grinding — be honest, this only works on real
        answers.
      </p>
      <div className="space-y-2.5">
        {FLAGS.map((f, i) => (
          <Toggle
            key={i}
            on={flags[i]}
            onChange={(v) => {
              const next = [...flags] as typeof flags
              next[i] = v
              setFlags(next)
            }}
            label={f.label}
            sub={f.sub}
          />
        ))}
      </div>

      <div
        className={`mt-4 rounded-xl border px-3.5 py-3 text-[13px] font-semibold leading-snug ${
          downgrade ? 'border-gold/30 bg-gold/8 text-gold' : 'border-lime/25 bg-lime/8 text-lime'
        }`}
      >
        {downgrade
          ? `${count} flags → the day downgrades: sprint/jump volume −1/3, lifts light with 3 in the tank. Backing off a fatigued day is how pros stay healthy — not weakness.`
          : count === 1
            ? '1 flag — under the line. Full session as written, but keep an ear on it.'
            : 'All clear. Full send.'}
      </div>

      {/* Intensity: the athlete's own call, on top of what the flags say */}
      <div className="mt-4">
        <div className="text-[11px] font-black uppercase tracking-wider text-ink-faint">
          How much do you have?
        </div>
        <div className="mt-2 grid grid-cols-3 gap-1.5">
          {INTENSITIES.map((o) => (
            <button
              key={o.id}
              onClick={() => setIntensity(o.id)}
              className={`rounded-xl border px-2 py-2 text-[12px] font-bold ${
                intensity === o.id
                  ? 'border-accent/50 bg-accent/15 text-accent-soft'
                  : 'border-edge bg-surface-2 text-ink-dim'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
        <p className="mt-1.5 px-0.5 text-[11px] leading-snug text-ink-faint">
          {INTENSITIES.find((o) => o.id === intensity)?.sub}
          {intensity !== 'full' && ' Logs as a downgraded win — still a win.'}
        </p>
      </div>

      <div className="mt-4 flex gap-2 pb-4">
        <Btn className="flex-1" onClick={() => onStart(flags, intensity)}>
          {intensity === 'minimum'
            ? 'Start the bare minimum'
            : downgrade || intensity === 'lighter'
              ? 'Start downgraded session'
              : 'Start session'}
        </Btn>
      </div>
    </Sheet>
  )
}

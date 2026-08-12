import { useMemo } from 'react'
import type { ResolvedDay, SessionIntensity } from '../../types'
import { Sheet } from '../../components/Sheet'
import { minimumViableFor } from '../../engine/transforms'
import { planTemplate } from '../../engine/resolveDay'
import { useAppStore } from '../../store/appStore'

/**
 * Start gate for non-CNS days: pick how much you've got, one tap starts.
 * The plan flexes on the spot, nobody grinds a full day they don't
 * have, and nobody gets to log a hollow "complete" either.
 */
export function IntensitySheet({
  open,
  day,
  onClose,
  onStart,
}: {
  open: boolean
  day: ResolvedDay
  onClose: () => void
  onStart: (intensity: SessionIntensity) => void
}) {
  const plan = useAppStore((s) => s.data.plan)
  const mv = useMemo(() => {
    const template = day.templateId ? planTemplate(plan, day.templateId) : null
    return template ? minimumViableFor(template, day.exercises) : null
  }, [day, plan])

  const options: { id: SessionIntensity; label: string; sub: string; hero?: boolean }[] = [
    { id: 'full', label: 'Full session', sub: 'The day exactly as written. Go get it.', hero: true },
    {
      id: 'lighter',
      label: 'Normal',
      sub: 'A third less jumping and sprinting, and lighter weights. End each set with about 3 reps left in you.',
    },
    {
      id: 'minimum',
      label: mv?.label ?? 'The bare minimum',
      sub: `Just ${mv?.exercises.length ?? 2} exercises. Short, but it counts.`,
    },
  ]

  return (
    <Sheet open={open} onClose={onClose} title="How much do you have today?">
      <p className="mb-4 text-[13px] leading-snug text-ink-dim">
        Answer honestly and the plan changes to match. A lighter day you finish beats a full day
        you walk out of.
      </p>
      <div className="space-y-2.5 pb-4">
        {options.map((o) => (
          <button
            key={o.id}
            onClick={() => onStart(o.id)}
            className={`w-full rounded-2xl border px-4 py-3.5 text-left active:scale-[0.99] ${
              o.hero ? 'border-accent/50 bg-accent/10' : 'border-edge bg-white/[0.07]'
            }`}
          >
            <span className={`block text-[15px] font-extrabold ${o.hero ? 'text-accent-soft' : 'text-ink'}`}>
              {o.label}
            </span>
            <span className="mt-0.5 block text-[12px] leading-snug text-ink-dim">{o.sub}</span>
          </button>
        ))}
        <p className="px-1 text-[11px] leading-snug text-ink-faint">
          The last two shorten today. Either way, the summary records what you actually did.
        </p>
      </div>
    </Sheet>
  )
}

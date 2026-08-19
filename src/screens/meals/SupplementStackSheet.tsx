import { useState } from 'react'
import type { StackItem } from '../../types'
import type { SuppressionSignal, SupplementRecord } from '../../supplementTypes'
import { supplementRecord } from '../../plan/supplements'
import { uid, useAppStore } from '../../store/appStore'
import { offeredSupplements } from '../../plan/foods'
import { Btn, Chip } from '../../components/ui'
import { Sheet } from '../../components/Sheet'
import { todayISO as today } from '../../engine/calendar'

/** The supplement stack is per-user: keep only what you actually take. */
export function SupplementStackSheet({ onClose }: { onClose: () => void }) {
  const stack = useAppStore((s) => s.data.plan.mealPlan.supplements)
  const update = useAppStore((s) => s.update)
  const [name, setName] = useState('')
  const [dose, setDose] = useState('')
  const [when, setWhen] = useState('')
  // What we may offer THIS person: their diet and their allergies, same
  // rules the meals go through. The plan no longer picks a stack for
  // anybody, so this list is the whole offer.
  const diet = useAppStore((s) => s.data.plan.dietStyle)
  const limits = useAppStore((s) => s.data.plan.foodLimits)
  // Under-18 and pregnancy switch the whole feature off rather than
  // filtering it, per R16 s5.2. An age we were never told is not a
  // yes: it simply leaves the signal off, same as any other unknown.
  const age = useAppStore((s) => s.data.profile?.age)
  const signals: SuppressionSignal[] = age !== undefined && age < 18 ? ['minor'] : []
  const available = offeredSupplements(diet, limits, signals).filter((c) => !stack.some((s) => s.id === c.id))
  const field = 'rounded-xl bg-white/[0.07] px-3 py-2.5 text-[13px] outline-none placeholder:text-ink-faint'

  /**
   * What a row actually shows.
   *
   * An 'app' item stores nothing but its id, so its name, dose and time
   * are read from the catalog HERE, every render. That is the whole
   * reason the shape changed: the doses corrected in W5 never reached
   * anybody who had already onboarded, because their booklet had frozen
   * the old strings at the moment they signed up.
   *
   * A 'user' item is shown exactly as they typed it and is never
   * rewritten. The app may retract its own advice. It may not edit
   * somebody's record of what they take.
   */
  function shown(s: StackItem): { name: string; detail: string; hedge?: string } {
    if (s.source === 'user') {
      return { name: s.name ?? s.id, detail: [s.dose, s.when].filter(Boolean).join(' · ') }
    }
    const rec = supplementRecord(s.id)
    if (!rec) return { name: s.id, detail: '' }
    return { name: rec.name, detail: [rec.dose.display, rec.when].filter(Boolean).join(' · '), hedge: rec.hedge }
  }

  function add(rec: SupplementRecord) {
    update((d) => {
      if (!d.plan.mealPlan.supplements.some((x) => x.id === rec.id)) {
        d.plan.mealPlan.supplements.push({ id: rec.id, source: 'app', addedAt: today() })
      }
    })
  }

  return (
    <Sheet open onClose={onClose} title="My supplement stack">
      <div className="space-y-4 pb-6">
        <div className="overflow-hidden rounded-2xl bg-white/[0.045] ring-1 ring-white/[0.05]">
          {stack.map((s, i) => (
            <div key={s.id} className={`flex items-center justify-between gap-2 px-4 py-3 ${i > 0 ? 'border-t border-white/[0.05]' : ''}`}>
              <div className="min-w-0">
                <div className="truncate text-[13px] font-bold">{shown(s).name}</div>
                <div className="text-[10.5px] text-ink-faint">{shown(s).detail}</div>
                {shown(s).hedge && <div className="mt-0.5 text-[10.5px] leading-snug text-ink-dim">{shown(s).hedge}</div>}
              </div>
              <button
                className="shrink-0 text-[12px] font-bold text-danger"
                onClick={() => update((d) => { d.plan.mealPlan.supplements = d.plan.mealPlan.supplements.filter((x) => x.id !== s.id) })}
              >
                remove
              </button>
            </div>
          ))}
          {stack.length === 0 && <p className="px-4 py-3 text-center text-[12px] text-ink-faint">Empty stack.</p>}
        </div>

        {available.length > 0 && (
          <>
            <div className="text-[11px] font-black uppercase tracking-wider text-ink-faint">Common options</div>
            <div className="flex flex-wrap gap-1.5">
              {available.map((c) => (
                <Chip key={c.id} onClick={() => add(c)}>+ {c.name}</Chip>
              ))}
            </div>
          </>
        )}

        <div className="text-[11px] font-black uppercase tracking-wider text-ink-faint">Add your own</div>
        <div className="flex gap-2">
          <input className={`${field} flex-1`} placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <input className={`${field} w-24`} placeholder="Dose" value={dose} onChange={(e) => setDose(e.target.value)} />
        </div>
        <input className={`${field} w-full`} placeholder="When (e.g. with breakfast)" value={when} onChange={(e) => setWhen(e.target.value)} />
        <Btn
          kind="subtle"
          className="w-full"
          disabled={!name.trim()}
          onClick={() => {
            const own = { id: uid(), source: 'user' as const, name: name.trim(), dose: dose.trim(), when: when.trim() || 'Daily', addedAt: today() }
            update((d) => { d.plan.mealPlan.supplements.push(own) })
            setName(''); setDose(''); setWhen('')
          }}
        >
          Add to stack
        </Btn>
      </div>
    </Sheet>
  )
}

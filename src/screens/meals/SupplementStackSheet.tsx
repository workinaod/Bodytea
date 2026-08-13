import { useState } from 'react'
import type { SupplementDef } from '../../types'
import { uid, useAppStore } from '../../store/appStore'
import { SUPPLEMENT_CATALOG } from '../../plan/foods'
import { Btn, Chip } from '../../components/ui'
import { Sheet } from '../../components/Sheet'

/** The supplement stack is per-user: keep only what you actually take. */
export function SupplementStackSheet({ onClose }: { onClose: () => void }) {
  const stack = useAppStore((s) => s.data.plan.mealPlan.supplements)
  const update = useAppStore((s) => s.update)
  const [name, setName] = useState('')
  const [dose, setDose] = useState('')
  const [when, setWhen] = useState('')
  const available = SUPPLEMENT_CATALOG.filter((c) => !stack.some((s) => s.id === c.id))
  const field = 'rounded-xl bg-white/[0.07] px-3 py-2.5 text-[13px] outline-none placeholder:text-ink-faint'

  function add(s: SupplementDef) {
    update((d) => {
      if (!d.plan.mealPlan.supplements.some((x) => x.id === s.id)) d.plan.mealPlan.supplements.push(s)
    })
  }

  return (
    <Sheet open onClose={onClose} title="My supplement stack">
      <div className="space-y-4 pb-6">
        <div className="overflow-hidden rounded-2xl bg-white/[0.045] ring-1 ring-white/[0.05]">
          {stack.map((s, i) => (
            <div key={s.id} className={`flex items-center justify-between gap-2 px-4 py-3 ${i > 0 ? 'border-t border-white/[0.05]' : ''}`}>
              <div className="min-w-0">
                <div className="truncate text-[13px] font-bold">{s.name}</div>
                <div className="text-[10.5px] text-ink-faint">{s.dose} · {s.when}</div>
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
                <Chip key={c.id} onClick={() => add({ ...c })}>+ {c.name}</Chip>
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
            add({ id: uid(), name: name.trim(), dose: dose.trim() || ', ', when: when.trim() || 'Daily' })
            setName(''); setDose(''); setWhen('')
          }}
        >
          Add to stack
        </Btn>
      </div>
    </Sheet>
  )
}

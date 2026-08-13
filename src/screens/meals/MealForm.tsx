import { useState } from 'react'
import type { MealTemplateDef } from '../../types'
import { Btn, Chip } from '../../components/ui'
import { Sheet } from '../../components/Sheet'

export function MealForm({
  value,
  onSave,
  onDelete,
  onClose,
}: {
  value: MealTemplateDef
  onSave: (t: MealTemplateDef) => void
  onDelete?: () => void
  onClose: () => void
}) {
  const [t, setT] = useState(value)
  const field = 'w-full rounded-xl bg-white/[0.07] px-3.5 py-3 text-[14px] outline-none placeholder:text-ink-faint'
  return (
    <Sheet open onClose={onClose} title={value.name ? 'Edit meal' : 'New meal'}>
      <div className="space-y-3 pb-6">
        <div className="flex gap-2">
          {(['training', 'rest'] as const).map((dt) => (
            <Chip key={dt} tone={t.dayType === dt ? 'accent' : 'default'} onClick={() => setT({ ...t, dayType: dt })}>
              {dt === 'training' ? 'Training day' : 'Rest day'}
            </Chip>
          ))}
        </div>
        <div className="flex gap-2">
          <input className={`${field} !w-32`} placeholder="Slot" value={t.slot} onChange={(e) => setT({ ...t, slot: e.target.value })} />
          <input className={field} placeholder="Meal name" value={t.name} onChange={(e) => setT({ ...t, name: e.target.value })} />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Pre / Post', 'Late night'].map((s) => (
            <Chip key={s} tone={t.slot === s ? 'accent' : 'default'} onClick={() => setT({ ...t, slot: s })}>
              {s}
            </Chip>
          ))}
        </div>
        <input className={field} placeholder="What's in it (optional)" value={t.detail} onChange={(e) => setT({ ...t, detail: e.target.value })} />
        <div className="flex gap-2">
          <input
            inputMode="numeric"
            className={field}
            placeholder="Protein (g)"
            value={t.proteinG || ''}
            onChange={(e) => setT({ ...t, proteinG: parseFloat(e.target.value) || 0 })}
          />
          <input
            inputMode="numeric"
            className={field}
            placeholder="Calories"
            value={t.kcal || ''}
            onChange={(e) => setT({ ...t, kcal: parseFloat(e.target.value) || 0 })}
          />
        </div>
        <Btn className="w-full" disabled={!t.name.trim() || t.proteinG <= 0} onClick={() => onSave({ ...t, name: t.name.trim() })}>
          Save meal
        </Btn>
        {onDelete && (
          <Btn kind="danger" className="w-full" onClick={onDelete}>
            Delete this meal
          </Btn>
        )}
      </div>
    </Sheet>
  )
}

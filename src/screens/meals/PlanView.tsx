import { useState } from 'react'
import type { MealTemplateDef } from '../../types'
import { uid, useAppStore } from '../../store/appStore'
import { Btn, Chip, SectionTitle } from '../../components/ui'
import { MealDetailSheet } from './MealDetailSheet'
import { MealForm } from './MealForm'

// ============================================================
// My plan, the user's meals as first-class data. Tap any meal
// for common-grocery alternatives at matching macros; bring your
// own plan by clearing the starter meals and adding yours.
// ============================================================

export function PlanView({
  opensOn,
  onEditStack,
  onSetup,
}: {
  opensOn: 'training' | 'rest'
  onEditStack: () => void
  onSetup: () => void
}) {
  const plan = useAppStore((s) => s.data.plan.mealPlan)
  const diet = useAppStore((s) => s.data.plan.dietStyle)
  const update = useAppStore((s) => s.update)
  // Opens on the day you are actually in, not always the training day.
  // "+ Add a meal" writes whichever tab is showing, so a hardcoded
  // 'training' meant a meal added on a rest day was filed under training
  // and then missing from that evening's log sheet — added, saved,
  // visible on this screen, and nowhere to be found when it was time to
  // eat it. The tab is still a tab; it just starts where the user is.
  const [dt, setDt] = useState<'training' | 'rest'>(opensOn)
  const [openMeal, setOpenMeal] = useState<MealTemplateDef | null>(null)
  const [editing, setEditing] = useState<MealTemplateDef | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)

  const meals = plan.templates.filter((t) => t.dayType === dt)
  const totals = meals.reduce((a, t) => ({ p: a.p + t.proteinG, k: a.k + t.kcal }), { p: 0, k: 0 })

  function save(t: MealTemplateDef) {
    update((d) => {
      const list = d.plan.mealPlan.templates
      const at = list.findIndex((x) => x.id === t.id)
      if (at >= 0) list[at] = t
      else list.push(t)
    })
    setEditing(null)
    setOpenMeal(null)
  }

  function remove(id: string) {
    update((d) => {
      d.plan.mealPlan.templates = d.plan.mealPlan.templates.filter((x) => x.id !== id)
    })
    setEditing(null)
    setOpenMeal(null)
  }

  return (
    <div className="space-y-3">
      <div className="border-l-2 border-cyan/60 py-1 pl-3 text-[12.5px] leading-snug text-cyan/90">
        Your day of eating, as one-tap meals. Already have a plan? Add it here, rough protein
        and calories are enough. Tap any meal for swaps built from common groceries.
      </div>

      <div className="flex gap-2">
        {(['training', 'rest'] as const).map((x) => (
          <Chip key={x} tone={dt === x ? 'accent' : 'default'} onClick={() => setDt(x)}>
            {x === 'training' ? 'Training days' : 'Rest days'}
          </Chip>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl bg-white/[0.045] ring-1 ring-white/[0.05]">
        {meals.map((t, i) => (
          <button
            key={t.id}
            onClick={() => setOpenMeal(t)}
            className={`flex w-full items-center justify-between gap-2 px-4 py-3 text-left active:bg-white/[0.07] ${i > 0 ? 'border-t border-white/[0.05]' : ''}`}
          >
            <span className="min-w-0">
              <span className="block truncate text-[13.5px] font-extrabold">
                {t.slot} · {t.name}
              </span>
              {t.detail && <span className="mt-0.5 block truncate text-[11px] text-ink-faint">{t.detail}</span>}
            </span>
            <span className="shrink-0 text-right font-mono text-[11.5px] text-ink-faint">
              {t.proteinG}g · {t.kcal} kcal
            </span>
          </button>
        ))}
        {meals.length === 0 && (
          <p className="px-4 py-5 text-center text-[12.5px] text-ink-faint">
            No meals yet for {dt === 'training' ? 'training' : 'rest'} days. Add your first below.
          </p>
        )}
      </div>

      {meals.length > 0 && (
        <p className="px-1 text-[11px] font-semibold text-ink-faint">
          Day adds up to {totals.p}g protein · ~{totals.k} kcal
        </p>
      )}

      {plan.templates.length === 0 && (
        <Btn className="w-full" onClick={onSetup}>
          Build my meal plan (20 seconds)
        </Btn>
      )}

      <Btn
        kind={plan.templates.length === 0 ? 'subtle' : 'primary'}
        className="w-full"
        onClick={() =>
          setEditing({ id: uid(), dayType: dt, slot: 'Meal', name: '', detail: '', proteinG: 40, kcal: 500 })
        }
      >
        + Add a meal
      </Btn>

      {plan.templates.length > 0 && (
        <button
          className="w-full py-1 text-center text-[11.5px] font-semibold text-ink-faint underline"
          onClick={() => {
            if (!confirmClear) {
              setConfirmClear(true)
              setTimeout(() => setConfirmClear(false), 4000)
              return
            }
            update((d) => {
              d.plan.mealPlan.templates = []
            })
            setConfirmClear(false)
          }}
        >
          {confirmClear
            ? `Tap again to clear all ${plan.templates.length} meals and start from yours`
            : 'Bringing your own plan? Clear these and build yours'}
        </button>
      )}

      {/* Stack + late-night live with the plan, not the daily log */}
      <SectionTitle
        right={
          <button onClick={onEditStack} className="text-[11px] font-bold text-accent underline">
            edit stack
          </button>
        }
      >
        Supplement stack
      </SectionTitle>
      <div className="overflow-hidden rounded-2xl bg-white/[0.045] ring-1 ring-white/[0.05]">
        {plan.supplements.map((s, i) => (
          <div key={s.id} className={`flex items-center justify-between px-4 py-2.5 ${i > 0 ? 'border-t border-white/[0.05]' : ''}`}>
            <span className="text-[13px] font-bold">{s.name}</span>
            <span className="text-[11px] text-ink-faint">{s.dose} · {s.when}</span>
          </div>
        ))}
        {plan.supplements.length === 0 && (
          <p className="px-4 py-3 text-center text-[12px] text-ink-faint">No stack yet. Add what you actually take.</p>
        )}
      </div>

      <div className="border-l-2 border-edge py-1 pl-3">
        <div className="text-[10.5px] font-black uppercase tracking-wider text-ink-faint">Late night?</div>
        <p className="mt-0.5 text-[11.5px] leading-snug text-ink-dim">
          <span className="font-bold text-lime">Yes:</span> {plan.lateNight.yes.join(', ')} ·{' '}
          <span className="font-bold text-danger">No:</span> {plan.lateNight.no.join(', ')}
        </p>
      </div>

      {openMeal && !editing && (
        <MealDetailSheet
          diet={diet}
          meal={openMeal}
          onEdit={() => setEditing({ ...openMeal })}
          onReplace={(alt) =>
            save({
              ...openMeal,
              name: alt.name,
              detail: alt.ingredients.join(', '),
              proteinG: alt.proteinG,
              kcal: alt.kcal,
            })
          }
          onAddAlt={(alt) =>
            save({
              id: uid(),
              dayType: openMeal.dayType,
              slot: openMeal.slot,
              name: alt.name,
              detail: alt.ingredients.join(', '),
              proteinG: alt.proteinG,
              kcal: alt.kcal,
            })
          }
          onClose={() => setOpenMeal(null)}
        />
      )}
      {editing && (
        <MealForm
          value={editing}
          onSave={save}
          onDelete={plan.templates.some((t) => t.id === editing.id) ? () => remove(editing.id) : undefined}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}

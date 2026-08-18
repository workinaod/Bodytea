import { useMemo } from 'react'
import type { DietStyle, FoodLimits, MealTemplateDef } from '../../types'
import { mealAlternatives } from '../../plan/mealAlts'
import { forbiddenTerms } from '../../plan/foodLimits'
import { cookingFor, cookingLine } from '../../plan/cooking'
import { Btn } from '../../components/ui'
import { Sheet } from '../../components/Sheet'

/** One meal up close: its numbers, edit access, and grocery-store swaps. */
export function MealDetailSheet({
  meal,
  diet,
  limits,
  onEdit,
  onReplace,
  onAddAlt,
  onClose,
}: {
  meal: MealTemplateDef
  diet: DietStyle | undefined
  limits: FoodLimits | undefined
  onEdit: () => void
  onReplace: (alt: { name: string; ingredients: string[]; proteinG: number; kcal: number }) => void
  onAddAlt: (alt: { name: string; ingredients: string[]; proteinG: number; kcal: number }) => void
  onClose: () => void
}) {
  const alts = useMemo(
    () => mealAlternatives({ proteinG: meal.proteinG, kcal: meal.kcal, slot: meal.slot, excludeName: meal.name, diet, limits }),
    [meal, diet, limits],
  )
  // Saying what we left out is the only way the filter is visible. Silence
  // reads as a short list; this reads as the app having listened.
  const avoiding = forbiddenTerms(limits).slice(0, 6)

  return (
    <Sheet open onClose={onClose} title={`${meal.slot} · ${meal.name}`}>
      <div className="space-y-4 pb-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-mono text-[20px] font-black text-accent-soft">{meal.proteinG}g protein</div>
            <div className="font-mono text-[12px] text-ink-faint">~{meal.kcal} kcal</div>
          </div>
          <Btn kind="subtle" className="!py-2" onClick={onEdit}>
            Edit meal
          </Btn>
        </div>
        {meal.detail && <p className="text-[12.5px] leading-snug text-ink-dim">{meal.detail}</p>}

        <div>
          <div className="mb-1.5 text-[11px] font-black uppercase tracking-wider text-ink-faint">
            Same macros, common groceries
          </div>
          {alts.length === 0 && (
            <p className="rounded-2xl bg-white/[0.045] px-4 py-3 text-[12px] leading-snug text-ink-faint ring-1 ring-white/[0.05]">
              Nothing on the common-groceries list fits this meal and your food limits. Hit the
              protein and calorie numbers your own way.
            </p>
          )}
          <div className="overflow-hidden rounded-2xl bg-white/[0.045] ring-1 ring-white/[0.05]">
            {alts.map((a, i) => (
              <div key={a.id} className={`px-4 py-3 ${i > 0 ? 'border-t border-white/[0.05]' : ''}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate text-[13.5px] font-extrabold">{a.name}</span>
                  <span className="shrink-0 font-mono text-[11.5px] text-ink-faint">
                    {a.proteinG}g · {a.kcal} kcal
                  </span>
                </div>
                <p className="mt-0.5 text-[11.5px] leading-snug text-ink-faint">{a.ingredients.join(' · ')}</p>
                {/* The line that decides whether this happens tonight.
                    "Same macros" is the easy half; the hard half is that
                    it is 7pm and somebody is tired. */}
                {cookingFor(a.id) && (
                  <p className="mt-1 text-[11px] font-semibold text-lime/80">
                    {cookingLine(cookingFor(a.id)!)}
                  </p>
                )}
                <div className="mt-2 flex gap-2">
                  <button
                    className="flex-1 rounded-lg border border-accent/35 bg-accent/10 py-2 text-[12px] font-bold text-accent-soft"
                    onClick={() => onReplace(a)}
                  >
                    Use instead
                  </button>
                  <button
                    className="flex-1 rounded-lg bg-white/[0.07] py-2 text-[12px] font-bold text-ink-dim"
                    onClick={() => onAddAlt(a)}
                  >
                    + Add to plan
                  </button>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-1.5 px-1 text-[11px] leading-snug text-ink-faint">
            Swaps match this meal's protein and calories as closely as possible using everyday
            ingredients. The plan holds even when the fridge changes.
            {avoiding.length > 0 && ` Skipping anything with ${avoiding.join(', ')}.`}
          </p>
        </div>
      </div>
    </Sheet>
  )
}

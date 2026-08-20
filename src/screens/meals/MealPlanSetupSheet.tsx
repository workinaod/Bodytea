import { useState } from 'react'
import type { DietStyle } from '../../types'
import { useAppStore } from '../../store/appStore'
import { buildMealPlan, type MealsPerDay } from '../../plan/foods'
import { Btn, Chip } from '../../components/ui'
import { Sheet } from '../../components/Sheet'

/**
 * Meal-plan setup, doable any time, the same two questions onboarding
 * asks, for people who skipped them (or want a rebuild).
 */
export function MealPlanSetupSheet({ onClose }: { onClose: () => void }) {
  const update = useAppStore((s) => s.update)
  const proteinTarget = useAppStore((s) => s.data.settings.proteinTargetG)
  const [count, setCount] = useState<MealsPerDay>(4)
  const [diet, setDiet] = useState<DietStyle>('omnivore')

  return (
    <Sheet open onClose={onClose} title="Build my meal plan">
      <div className="space-y-4 pb-8">
        <div>
          <div className="mb-1.5 text-[11px] font-black uppercase tracking-wider text-ink-faint">
            How do you actually eat?
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {(
              [
                [2, '2 big meals'],
                [3, '3 square meals'],
                [4, '3 meals + a snack'],
                [5, 'Grazer (5 small)'],
              ] as const
            ).map(([n, label]) => (
              <button
                key={n}
                onClick={() => setCount(n)}
                className={`rounded-xl border px-3 py-2.5 text-[12.5px] font-bold ${
                  count === n ? 'border-accent/60 bg-accent/12 text-accent-soft' : 'border-edge bg-surface-2 text-ink-dim'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="mb-1.5 text-[11px] font-black uppercase tracking-wider text-ink-faint">Any restrictions?</div>
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                ['omnivore', 'No restrictions'],
                ['vegetarian', 'Vegetarian'],
                ['vegan', 'Vegan'],
              ] as const
            ).map(([d, label]) => (
              <Chip key={d} tone={diet === d ? 'accent' : 'default'} onClick={() => setDiet(d)}>
                {label}
              </Chip>
            ))}
          </div>
        </div>
        <Btn
          className="w-full py-3.5"
          onClick={() => {
            update((d) => {
              d.plan.mealPlan = buildMealPlan(d.plan.goal, proteinTarget, d.plan.nutrition, count, diet)
              d.plan.dietStyle = diet
            })
            onClose()
          }}
        >
          Build it around my {proteinTarget}g protein target
        </Btn>
        <p className="text-[11px] leading-snug text-ink-faint">
          Every meal comes with a common-grocery example and swaps. Edit or replace any of them
          after, it's your plan.
        </p>
      </div>
    </Sheet>
  )
}

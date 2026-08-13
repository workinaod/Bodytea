import type { Dispatch, SetStateAction } from 'react'
import type { DietStyle } from '../../types'
import type { MealsPerDay } from '../../plan/foods'
import { Btn, Chip } from '../../components/ui'

// ============================================================
// Food, last, and skippable.
//
// The plan is worth having on its own, so nobody should be stuck
// behind a food questionnaire to get to it. Skipping is a real
// button here, not a link hidden at the bottom, and the Meals tab
// offers the same setup later.
//
// Allergies are free text rather than a chip list on purpose. A
// list is always missing somebody's allergy, and being missing
// from that list is exactly the moment an app stops feeling like
// it is for you.
// ============================================================

const DIETS: { id: DietStyle; label: string }[] = [
  { id: 'omnivore', label: 'I eat everything' },
  { id: 'vegetarian', label: 'Vegetarian' },
  { id: 'vegan', label: 'Vegan' },
  { id: 'pescatarian', label: 'Fish, no meat' },
]

const MEALS: { n: MealsPerDay; label: string }[] = [
  { n: 2, label: '2 big ones' },
  { n: 3, label: '3 meals' },
  { n: 4, label: '3 + a snack' },
  { n: 5, label: 'Little and often' },
]

export function MealStep({
  dietStyle,
  setDietStyle,
  dairyFree,
  setDairyFree,
  allergies,
  setAllergies,
  mealsPerDay,
  setMealsPerDay,
  onBuild,
  onSkip,
}: {
  dietStyle: DietStyle
  setDietStyle: (d: DietStyle) => void
  dairyFree: boolean
  setDairyFree: Dispatch<SetStateAction<boolean>>
  allergies: string
  setAllergies: (s: string) => void
  mealsPerDay: MealsPerDay
  setMealsPerDay: (n: MealsPerDay) => void
  onBuild: () => void
  onSkip: () => void
}) {
  return (
    <div className="flex flex-1 flex-col">
      <h2 className="headline text-center text-[26px]">Want a food plan too?</h2>
      <p className="mt-1 text-center text-[13px] text-ink-dim">Meals built round what you actually eat.</p>

      <p className="mt-6 text-[14px] font-bold text-ink">How do you eat?</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {DIETS.map((d) => (
          <Chip key={d.id} tone={dietStyle === d.id ? 'accent' : 'default'} onClick={() => setDietStyle(d.id)}>
            {d.label}
          </Chip>
        ))}
        <Chip tone={dairyFree ? 'accent' : 'default'} onClick={() => setDairyFree((v) => !v)}>
          Dairy free
        </Chip>
      </div>

      <p className="mt-6 text-[14px] font-bold text-ink">Anything you cannot eat?</p>
      <input
        value={allergies}
        onChange={(e) => setAllergies(e.target.value)}
        placeholder="Nuts, shellfish, gluten…"
        className="mt-2 w-full rounded-xl bg-white/[0.07] px-4 py-3 text-[15px] text-ink outline-none ring-1 ring-white/[0.06] placeholder:text-ink-faint focus:ring-accent/60"
      />

      <p className="mt-6 text-[14px] font-bold text-ink">How many times a day?</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {MEALS.map((m) => (
          <Chip key={m.n} tone={mealsPerDay === m.n ? 'accent' : 'default'} onClick={() => setMealsPerDay(m.n)}>
            {m.label}
          </Chip>
        ))}
      </div>

      <Btn className="mt-8 w-full py-4" onClick={onBuild}>
        Build my plan
      </Btn>
      <button
        onClick={onSkip}
        className="mt-3 py-2 text-center text-[12.5px] font-semibold text-ink-faint underline"
      >
        Skip food for now
      </button>
    </div>
  )
}

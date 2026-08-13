import { useState, type Dispatch, type SetStateAction } from 'react'
import type { DietStyle } from '../../types'
import type { MealsPerDay } from '../../plan/foods'
import { Reveal } from '../../components/ui'
import { Bar, Kicker, Label, Quiet, Tag, Title, fieldCls, fieldStyle } from './kit'

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
  // Diet is pre-selected at "I eat everything", so it is the choosing
  // that opens the rest — not the value, which was already there.
  const [chose, setChose] = useState(false)
  return (
    <div className="flex flex-1 flex-col">
      <Kicker>Entry 07</Kicker>
      <Title>Want a food plan?</Title>

      <div className="mt-7" />
      <Label>How do you eat?</Label>
      <div className="flex flex-wrap gap-1.5">
        {DIETS.map((d) => (
          <Tag key={d.id} selected={dietStyle === d.id} onClick={() => {
              setChose(true)
              setDietStyle(d.id)
            }}>
            {d.label}
          </Tag>
        ))}
      </div>

      {/* Dairy free is not a fifth diet — it stacks on any of the four.
          Sitting in that row it read as one more of them. */}
      <Reveal when={chose} className="mt-6">
        <Label>Anything you cannot eat?</Label>
        <div className="flex">
          <Tag selected={dairyFree} onClick={() => setDairyFree((v) => !v)}>
            Dairy free
          </Tag>
        </div>
        <input
          value={allergies}
          onChange={(e) => setAllergies(e.target.value)}
          placeholder="Nuts, shellfish, gluten…"
          className={`mt-3 ${fieldCls} text-[15px]`} style={fieldStyle}
        />
      </Reveal>

      <Reveal when={chose} className="mt-6">
        <Label>How many times a day?</Label>
        <div className="flex flex-wrap gap-1.5">
          {MEALS.map((m) => (
            <Tag key={m.n} selected={mealsPerDay === m.n} onClick={() => setMealsPerDay(m.n)}>
              {m.label}
            </Tag>
          ))}
        </div>
      </Reveal>

      <div className="mt-auto pt-10">
        <Bar onClick={onBuild}>Build my plan</Bar>
        <div className="mt-1">
          <Quiet onClick={onSkip}>Skip food for now</Quiet>
        </div>
      </div>
    </div>
  )
}

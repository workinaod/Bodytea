import type { FoodLimits } from '../foodTypes'

// ============================================================
// What somebody cannot eat, applied to what we offer them.
//
// The onboarding screen has always asked. The answer was assembled into a
// `foodLimits` object, handed to a type with no such field, and dropped on
// the floor: one write site, no readers. So a person could tap dairy-free,
// type "peanuts", and be shown a Greek yogurt bowl on the next screen.
//
// Two rules make this safe rather than clever:
//
//   Exclusion only. A term we fail to recognise still excludes by raw
//   substring, and a term we recognise excludes its whole family. Being
//   too careful costs somebody a meal they could have eaten. Being not
//   careful enough costs them an allergic reaction, so the failure has to
//   land on the harmless side every time.
//
//   Never widen past it. mealAlternatives relaxes its slot filter when a
//   pool runs thin. That is the right instinct for breakfast-versus-dinner
//   and exactly the wrong one here, so this filter is applied after any
//   widening and an empty result stays empty. No meal is better than the
//   wrong meal.
//
// The free text stays free text. We do not make the athlete pick their
// allergy off a list that will always be missing somebody's.
// ============================================================

/** Words that mean dairy in the ingredient lines we actually write. */
const DAIRY = [
  'milk',
  'cheese',
  'yogurt',
  'yoghurt',
  'butter',
  'cream',
  'whey',
  'casein',
  'custard',
  'ghee',
  'kefir',
  'ricotta',
  'mozzarella',
  'parmesan',
  'feta',
]

/**
 * Families, so "nuts" catches the cashews and "shellfish" catches the
 * prawns. Everything here is a widening: the typed word always applies on
 * its own as well.
 */
const FAMILIES: Record<string, string[]> = {
  nut: ['almond', 'cashew', 'walnut', 'pecan', 'pistachio', 'hazelnut', 'macadamia', 'nut butter', 'nutella'],
  nuts: ['almond', 'cashew', 'walnut', 'pecan', 'pistachio', 'hazelnut', 'macadamia', 'nut butter'],
  peanut: ['peanut', 'pb', 'peanut butter'],
  peanuts: ['peanut', 'pb', 'peanut butter'],
  treenut: ['almond', 'cashew', 'walnut', 'pecan', 'pistachio', 'hazelnut', 'macadamia'],
  dairy: DAIRY,
  milk: DAIRY,
  lactose: DAIRY,
  egg: ['egg', 'omelette', 'omelet', 'frittata', 'mayo', 'mayonnaise'],
  eggs: ['egg', 'omelette', 'omelet', 'frittata', 'mayo', 'mayonnaise'],
  gluten: ['bread', 'pasta', 'wheat', 'flour', 'tortilla', 'bagel', 'cracker', 'couscous', 'barley', 'noodle', 'oats', 'cereal', 'wrap', 'bun'],
  wheat: ['bread', 'pasta', 'wheat', 'flour', 'tortilla', 'bagel', 'cracker', 'couscous', 'noodle', 'wrap', 'bun'],
  celiac: ['bread', 'pasta', 'wheat', 'flour', 'tortilla', 'bagel', 'cracker', 'couscous', 'barley', 'noodle', 'oats', 'cereal', 'wrap', 'bun'],
  coeliac: ['bread', 'pasta', 'wheat', 'flour', 'tortilla', 'bagel', 'cracker', 'couscous', 'barley', 'noodle', 'oats', 'cereal', 'wrap', 'bun'],
  soy: ['soy', 'tofu', 'edamame', 'tempeh', 'miso', 'soya'],
  soya: ['soy', 'tofu', 'edamame', 'tempeh', 'miso'],
  shellfish: ['shrimp', 'prawn', 'crab', 'lobster', 'scallop', 'clam', 'mussel', 'oyster'],
  fish: ['fish', 'salmon', 'tuna', 'cod', 'sardine', 'mackerel', 'anchovy', 'haddock', 'tilapia'],
  seafood: ['fish', 'salmon', 'tuna', 'cod', 'sardine', 'shrimp', 'prawn', 'crab', 'lobster', 'scallop', 'clam', 'mussel'],
  sesame: ['sesame', 'tahini', 'hummus'],
  pork: ['pork', 'bacon', 'ham', 'sausage', 'chorizo'],
  beef: ['beef', 'steak', 'mince', 'burger'],
}

/** Split "peanuts, shellfish and soy" into the words the athlete meant. */
export function allergyTerms(text: string | undefined): string[] {
  if (!text) return []
  return text
    .toLowerCase()
    .split(/[,;/]|\band\b|\bor\b|\bplus\b|\n/)
    .map((t) => t.replace(/[^a-z\s-]/g, '').trim())
    // One and two letter fragments match half the dictionary.
    .filter((t) => t.length > 2)
}

/** Every substring that should now disqualify a meal. */
export function forbiddenTerms(limits: FoodLimits | undefined): string[] {
  if (!limits) return []
  const out = new Set<string>()
  if (limits.dairyFree) for (const d of DAIRY) out.add(d)
  for (const term of allergyTerms(limits.allergies)) {
    out.add(term)
    const key = term.replace(/\s|-/g, '')
    for (const w of FAMILIES[key] ?? FAMILIES[key.replace(/s$/, '')] ?? []) out.add(w)
  }
  return [...out]
}

/**
 * The term that rules this meal out, or null if it is fine. Returning the
 * word rather than a boolean lets the screen say WHICH limit did it, which
 * is the difference between a plan that looks broken and one that is
 * listening.
 */
export function blockedBy(
  meal: { name: string; ingredients: string[] },
  limits: FoodLimits | undefined,
): string | null {
  const terms = forbiddenTerms(limits)
  if (terms.length === 0) return null
  const hay = `${meal.name} ${meal.ingredients.join(' ')}`.toLowerCase()
  return terms.find((t) => hay.includes(t)) ?? null
}

export function allowedByLimits<T extends { name: string; ingredients: string[] }>(
  meals: T[],
  limits: FoodLimits | undefined,
): T[] {
  if (forbiddenTerms(limits).length === 0) return meals
  return meals.filter((m) => blockedBy(m, limits) === null)
}

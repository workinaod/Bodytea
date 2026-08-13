import type { DietStyle } from '../types'

// ============================================================
// Meal alternatives from COMMON household food. When someone
// brings their own meal plan (or inherits a generated one), every
// meal can offer swaps with similar protein + calories built from
// things people actually have: eggs, bread, rice, chicken, ground
// beef, tuna cans, yogurt, peanut butter, and for plant-based
// eaters: tofu, tempeh, beans, lentils, soy milk. No exotic
// ingredients, no AI, a curated list and a distance function.
// ============================================================

export type MealSlotKind = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'late'

export interface CommonMeal {
  id: string
  name: string
  /** Plain-English shopping words, everything a normal kitchen stocks. */
  ingredients: string[]
  proteinG: number
  kcal: number
  slots: MealSlotKind[]
  /**
   * The strictest eater this meal suits.
   *
   *   omni         has meat
   *   pescatarian  has fish but no meat
   *   vegetarian   eggs or dairy, nothing that swam or walked
   *   vegan        plants only
   *
   * Fish is its own rung rather than lumped in with meat because a
   * pescatarian who gets offered tofu instead of the salmon they
   * would happily eat has been served a worse plan for no reason.
   */
  diet: 'omni' | 'pescatarian' | 'vegetarian' | 'vegan'
}

// Macros are standard-serving estimates, consistent with plan/foods.ts.
export const COMMON_MEALS: CommonMeal[] = [
  // ---- Breakfasts ----
  { id: 'eggs-toast', name: 'Eggs & toast', ingredients: ['3 eggs', '2 slices bread', 'butter'], proteinG: 26, kcal: 525, slots: ['breakfast'], diet: 'vegetarian' },
  { id: 'yogurt-bowl', name: 'Greek yogurt bowl', ingredients: ['1 cup Greek yogurt', 'oats or granola', 'banana', 'honey'], proteinG: 28, kcal: 460, slots: ['breakfast', 'snack'], diet: 'vegetarian' },
  { id: 'oats-shake', name: 'Oatmeal + protein shake', ingredients: ['3/4 cup oats', '1 scoop protein', 'splash of milk'], proteinG: 37, kcal: 395, slots: ['breakfast'], diet: 'vegetarian' },
  { id: 'pb-banana-toast', name: 'PB-banana toast + milk', ingredients: ['2 slices bread', '2 tbsp peanut butter', 'banana', '1 cup milk'], proteinG: 25, kcal: 630, slots: ['breakfast', 'snack'], diet: 'vegetarian' },
  { id: 'egg-cheese-sandwich', name: 'Egg & cheese sandwich', ingredients: ['2 eggs', 'slice of cheese', '2 slices bread'], proteinG: 27, kcal: 460, slots: ['breakfast'], diet: 'vegetarian' },
  { id: 'cottage-fruit', name: 'Cottage cheese & fruit', ingredients: ['1 cup cottage cheese', 'berries or a banana'], proteinG: 29, kcal: 250, slots: ['breakfast', 'snack', 'late'], diet: 'vegetarian' },
  { id: 'breakfast-burrito', name: 'Breakfast burrito', ingredients: ['3 eggs', 'tortilla', 'shredded cheese', 'salsa'], proteinG: 29, kcal: 490, slots: ['breakfast'], diet: 'vegetarian' },
  { id: 'cereal-milk', name: 'Cereal + extra milk', ingredients: ['cereal', '1.5 cups milk'], proteinG: 15, kcal: 330, slots: ['breakfast', 'snack'], diet: 'vegetarian' },
  { id: 'tofu-scramble', name: 'Tofu scramble + toast', ingredients: ['1/2 block firm tofu', '2 slices bread', 'nutritional yeast or spices'], proteinG: 25, kcal: 400, slots: ['breakfast'], diet: 'vegan' },
  { id: 'pb-oatmeal', name: 'PB oatmeal + soy milk', ingredients: ['3/4 cup oats', '2 tbsp peanut butter', '1 cup soy milk'], proteinG: 23, kcal: 515, slots: ['breakfast'], diet: 'vegan' },

  // ---- Lunches & dinners (most work as either) ----
  { id: 'chicken-rice', name: 'Chicken & rice', ingredients: ['6 oz chicken breast', '1.5 cups rice', 'oil or butter'], proteinG: 58, kcal: 590, slots: ['lunch', 'dinner'], diet: 'omni' },
  { id: 'tuna-sandwich', name: 'Tuna salad sandwich', ingredients: ['1 can tuna', 'mayo', '2 slices bread'], proteinG: 48, kcal: 490, slots: ['lunch', 'snack'], diet: 'pescatarian' },
  { id: 'spaghetti-meat', name: 'Spaghetti with meat sauce', ingredients: ['4 oz ground beef', '1.5 cups pasta', 'jarred sauce'], proteinG: 37, kcal: 640, slots: ['lunch', 'dinner'], diet: 'omni' },
  { id: 'turkey-sandwich', name: 'Turkey & cheese sandwich', ingredients: ['4 oz deli turkey', 'slice of cheese', '2 slices bread', 'mayo'], proteinG: 39, kcal: 520, slots: ['lunch', 'snack'], diet: 'omni' },
  { id: 'burger', name: 'Homemade burger', ingredients: ['1/4 lb beef patty', 'bun', 'slice of cheese'], proteinG: 43, kcal: 550, slots: ['lunch', 'dinner'], diet: 'omni' },
  { id: 'chicken-quesadilla', name: 'Chicken quesadilla', ingredients: ['4 oz chicken', 'tortilla', 'shredded cheese'], proteinG: 45, kcal: 560, slots: ['lunch', 'dinner'], diet: 'omni' },
  { id: 'beef-potatoes', name: 'Beef & potatoes', ingredients: ['6 oz beef or steak', 'potato', 'frozen veg'], proteinG: 45, kcal: 570, slots: ['dinner'], diet: 'omni' },
  { id: 'chili', name: 'Chili (beef + beans)', ingredients: ['4 oz ground beef', '1 cup canned beans', 'canned tomatoes'], proteinG: 40, kcal: 510, slots: ['lunch', 'dinner'], diet: 'omni' },
  { id: 'chicken-stirfry', name: 'Chicken stir-fry over rice', ingredients: ['6 oz chicken', 'frozen veg', '1 cup rice', 'soy sauce + oil'], proteinG: 59, kcal: 635, slots: ['dinner'], diet: 'omni' },
  { id: 'egg-fried-rice', name: 'Egg fried rice', ingredients: ['3 eggs', '1.5 cups rice', 'frozen veg', 'oil'], proteinG: 27, kcal: 705, slots: ['lunch', 'dinner'], diet: 'vegetarian' },
  { id: 'rotisserie-plate', name: 'Rotisserie chicken plate', ingredients: ['1/4 rotisserie chicken', 'potato or rice', 'frozen veg'], proteinG: 42, kcal: 530, slots: ['lunch', 'dinner'], diet: 'omni' },
  { id: 'bean-burrito', name: 'Bean & cheese burrito', ingredients: ['1 cup canned beans', 'shredded cheese', 'tortilla', 'rice'], proteinG: 28, kcal: 580, slots: ['lunch', 'dinner'], diet: 'vegetarian' },
  { id: 'salmon-rice', name: 'Baked salmon & rice', ingredients: ['6 oz salmon', '1 cup rice', 'frozen veg'], proteinG: 41, kcal: 605, slots: ['dinner'], diet: 'pescatarian' },
  { id: 'chicken-salad', name: 'Grilled chicken salad', ingredients: ['6 oz chicken', 'bagged greens', 'dressing', 'croutons'], proteinG: 55, kcal: 550, slots: ['lunch', 'dinner'], diet: 'omni' },
  { id: 'pork-potato', name: 'Pork chop & potato', ingredients: ['6 oz pork chop', 'potato', 'applesauce or veg'], proteinG: 43, kcal: 590, slots: ['dinner'], diet: 'omni' },
  { id: 'mac-chicken', name: 'Mac & cheese + chicken', ingredients: ['1 cup mac & cheese', '4 oz chicken'], proteinG: 43, kcal: 500, slots: ['lunch', 'dinner'], diet: 'omni' },
  { id: 'tofu-stirfry', name: 'Tofu stir-fry over rice', ingredients: ['1 block firm tofu', 'frozen veg', '1 cup rice', 'soy sauce + oil'], proteinG: 45, kcal: 700, slots: ['lunch', 'dinner'], diet: 'vegan' },
  { id: 'lentil-soup', name: 'Lentil soup + bread', ingredients: ['1.5 cups cooked lentils', 'carrots + onion', '2 slices bread'], proteinG: 35, kcal: 550, slots: ['lunch', 'dinner'], diet: 'vegan' },
  { id: 'chickpea-curry', name: 'Chickpea curry + rice', ingredients: ['1.5 cups canned chickpeas', 'coconut milk + curry paste', '1 cup rice'], proteinG: 22, kcal: 750, slots: ['dinner'], diet: 'vegan' },
  { id: 'bean-bowl', name: 'Black bean burrito bowl', ingredients: ['1.5 cups black beans', '1 cup rice', 'salsa', '1/2 avocado'], proteinG: 25, kcal: 700, slots: ['lunch', 'dinner'], diet: 'vegan' },
  { id: 'tempeh-rice', name: 'Tempeh & rice bowl', ingredients: ['1 pack tempeh', '1 cup rice', 'soy glaze'], proteinG: 40, kcal: 650, slots: ['dinner'], diet: 'vegan' },
  { id: 'peanut-noodles', name: 'Peanut noodles + edamame', ingredients: ['1.5 cups noodles', 'peanut sauce', '1 cup edamame'], proteinG: 35, kcal: 710, slots: ['lunch', 'dinner'], diet: 'vegan' },
  { id: 'veggie-chili', name: 'Three-bean chili', ingredients: ['2 cups mixed canned beans', 'canned tomatoes', 'corn'], proteinG: 30, kcal: 480, slots: ['lunch', 'dinner'], diet: 'vegan' },

  // ---- Snacks & late-night ----
  { id: 'shake-banana', name: 'Protein shake + banana', ingredients: ['1 scoop protein', 'water or milk', 'banana'], proteinG: 26, kcal: 240, slots: ['snack'], diet: 'vegetarian' },
  { id: 'yogurt-honey', name: 'Greek yogurt + honey', ingredients: ['1 cup Greek yogurt', 'honey'], proteinG: 23, kcal: 190, slots: ['snack', 'late'], diet: 'vegetarian' },
  { id: 'pbj-milk', name: 'PB&J + glass of milk', ingredients: ['2 slices bread', 'peanut butter', 'jelly', '1 cup milk'], proteinG: 24, kcal: 560, slots: ['snack', 'lunch'], diet: 'vegetarian' },
  { id: 'eggs-apple', name: 'Boiled eggs + apple', ingredients: ['3 boiled eggs', 'apple'], proteinG: 18, kcal: 305, slots: ['snack'], diet: 'vegetarian' },
  { id: 'cheese-jerky', name: 'Cheese, crackers & jerky', ingredients: ['cheese', 'crackers', '1 oz jerky'], proteinG: 19, kcal: 320, slots: ['snack'], diet: 'omni' },
  { id: 'cottage-pb', name: 'Cottage cheese + peanut butter', ingredients: ['1 cup cottage cheese', '1 tbsp peanut butter'], proteinG: 32, kcal: 275, slots: ['snack', 'late'], diet: 'vegetarian' },
  { id: 'tuna-crackers', name: 'Tuna + crackers', ingredients: ['1 can tuna', 'crackers'], proteinG: 42, kcal: 330, slots: ['snack', 'lunch'], diet: 'pescatarian' },
  { id: 'plant-shake', name: 'Plant protein shake + banana', ingredients: ['1 scoop plant protein', '1 cup soy milk', 'banana'], proteinG: 30, kcal: 340, slots: ['snack', 'late'], diet: 'vegan' },
  { id: 'edamame-snack', name: 'Edamame + rice crackers', ingredients: ['1 cup edamame', 'rice crackers'], proteinG: 18, kcal: 280, slots: ['snack', 'late'], diet: 'vegan' },
]

/** Map a free-text slot label ("Breakfast", "Pre / Post", "Late night") onto a kind. */
export function slotKindOf(slot: string): MealSlotKind | null {
  const s = slot.toLowerCase()
  if (s.includes('breakfast') || s.includes('morning')) return 'breakfast'
  if (s.includes('lunch')) return 'lunch'
  if (s.includes('dinner')) return 'dinner'
  if (s.includes('late')) return 'late'
  if (s.includes('snack') || s.includes('pre') || s.includes('post')) return 'snack'
  return null
}

/**
 * The closest common-household meals to a target's protein + calories.
 * Protein distance is weighted heavier, it's the number the plan
 * actually rides on. Slot-filtered when the slot maps to a kind
 * (widening to the whole list when the slot pool runs thin), and
 * diet-filtered when the user eats vegetarian or vegan.
 */
export function mealAlternatives(
  target: { proteinG: number; kcal: number; slot?: string; excludeName?: string; diet?: DietStyle },
  count = 3,
): CommonMeal[] {
  const kind = target.slot ? slotKindOf(target.slot) : null
  // Written out rather than chained, because the chained version put
  // anything it did not recognise into the vegan branch — so adding
  // pescatarian would have quietly offered fish-eaters tofu and
  // nothing else.
  const ALLOWED: Record<DietStyle, CommonMeal['diet'][]> = {
    omnivore: ['omni', 'pescatarian', 'vegetarian', 'vegan'],
    pescatarian: ['pescatarian', 'vegetarian', 'vegan'],
    vegetarian: ['vegetarian', 'vegan'],
    vegan: ['vegan'],
  }
  const dietOk = (m: CommonMeal) => !target.diet || ALLOWED[target.diet].includes(m.diet)
  const notSelf = (m: CommonMeal) =>
    !target.excludeName || m.name.toLowerCase() !== target.excludeName.trim().toLowerCase()
  let pool = COMMON_MEALS.filter((m) => notSelf(m) && dietOk(m) && (kind === null || m.slots.includes(kind)))
  if (pool.length < count) pool = COMMON_MEALS.filter((m) => notSelf(m) && dietOk(m))

  const tp = Math.max(target.proteinG, 10)
  const tk = Math.max(target.kcal, 150)
  return pool
    .map((m) => ({ m, score: (Math.abs(m.proteinG - tp) / tp) * 1.5 + Math.abs(m.kcal - tk) / tk }))
    .sort((a, b) => a.score - b.score || a.m.id.localeCompare(b.m.id))
    .slice(0, count)
    .map((x) => x.m)
}

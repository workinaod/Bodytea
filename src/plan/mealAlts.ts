// ============================================================
// Meal alternatives from COMMON household food. When someone
// brings their own meal plan (or inherits a generated one), every
// meal can offer swaps with similar protein + calories built from
// things people actually have: eggs, bread, rice, chicken, ground
// beef, tuna cans, yogurt, peanut butter. No exotic ingredients,
// no AI — a curated list and a distance function.
// ============================================================

export type MealSlotKind = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'late'

export interface CommonMeal {
  id: string
  name: string
  /** Plain-English shopping words — everything a normal kitchen stocks. */
  ingredients: string[]
  proteinG: number
  kcal: number
  slots: MealSlotKind[]
}

// Macros are standard-serving estimates, consistent with plan/foods.ts.
export const COMMON_MEALS: CommonMeal[] = [
  // ---- Breakfasts ----
  { id: 'eggs-toast', name: 'Eggs & toast', ingredients: ['3 eggs', '2 slices bread', 'butter'], proteinG: 26, kcal: 525, slots: ['breakfast'] },
  { id: 'yogurt-bowl', name: 'Greek yogurt bowl', ingredients: ['1 cup Greek yogurt', 'oats or granola', 'banana', 'honey'], proteinG: 28, kcal: 460, slots: ['breakfast', 'snack'] },
  { id: 'oats-shake', name: 'Oatmeal + protein shake', ingredients: ['3/4 cup oats', '1 scoop protein', 'splash of milk'], proteinG: 37, kcal: 395, slots: ['breakfast'] },
  { id: 'pb-banana-toast', name: 'PB-banana toast + milk', ingredients: ['2 slices bread', '2 tbsp peanut butter', 'banana', '1 cup milk'], proteinG: 25, kcal: 630, slots: ['breakfast', 'snack'] },
  { id: 'egg-cheese-sandwich', name: 'Egg & cheese sandwich', ingredients: ['2 eggs', 'slice of cheese', '2 slices bread'], proteinG: 27, kcal: 460, slots: ['breakfast'] },
  { id: 'cottage-fruit', name: 'Cottage cheese & fruit', ingredients: ['1 cup cottage cheese', 'berries or a banana'], proteinG: 29, kcal: 250, slots: ['breakfast', 'snack', 'late'] },
  { id: 'breakfast-burrito', name: 'Breakfast burrito', ingredients: ['3 eggs', 'tortilla', 'shredded cheese', 'salsa'], proteinG: 29, kcal: 490, slots: ['breakfast'] },
  { id: 'cereal-milk', name: 'Cereal + extra milk', ingredients: ['cereal', '1.5 cups milk'], proteinG: 15, kcal: 330, slots: ['breakfast', 'snack'] },

  // ---- Lunches & dinners (most work as either) ----
  { id: 'chicken-rice', name: 'Chicken & rice', ingredients: ['6 oz chicken breast', '1.5 cups rice', 'oil or butter'], proteinG: 47, kcal: 590, slots: ['lunch', 'dinner'] },
  { id: 'tuna-sandwich', name: 'Tuna salad sandwich', ingredients: ['1 can tuna', 'mayo', '2 slices bread'], proteinG: 48, kcal: 490, slots: ['lunch', 'snack'] },
  { id: 'spaghetti-meat', name: 'Spaghetti with meat sauce', ingredients: ['4 oz ground beef', '1.5 cups pasta', 'jarred sauce'], proteinG: 37, kcal: 640, slots: ['lunch', 'dinner'] },
  { id: 'turkey-sandwich', name: 'Turkey & cheese sandwich', ingredients: ['4 oz deli turkey', 'slice of cheese', '2 slices bread', 'mayo'], proteinG: 39, kcal: 520, slots: ['lunch', 'snack'] },
  { id: 'burger', name: 'Homemade burger', ingredients: ['1/4 lb beef patty', 'bun', 'slice of cheese'], proteinG: 43, kcal: 550, slots: ['lunch', 'dinner'] },
  { id: 'chicken-quesadilla', name: 'Chicken quesadilla', ingredients: ['4 oz chicken', 'tortilla', 'shredded cheese'], proteinG: 45, kcal: 560, slots: ['lunch', 'dinner'] },
  { id: 'beef-potatoes', name: 'Beef & potatoes', ingredients: ['6 oz beef or steak', 'potato', 'frozen veg'], proteinG: 45, kcal: 570, slots: ['dinner'] },
  { id: 'chili', name: 'Chili (beef + beans)', ingredients: ['4 oz ground beef', '1 cup canned beans', 'canned tomatoes'], proteinG: 40, kcal: 510, slots: ['lunch', 'dinner'] },
  { id: 'chicken-stirfry', name: 'Chicken stir-fry over rice', ingredients: ['6 oz chicken', 'frozen veg', '1 cup rice', 'soy sauce + oil'], proteinG: 48, kcal: 635, slots: ['dinner'] },
  { id: 'egg-fried-rice', name: 'Egg fried rice', ingredients: ['3 eggs', '1.5 cups rice', 'frozen veg', 'oil'], proteinG: 27, kcal: 705, slots: ['lunch', 'dinner'] },
  { id: 'rotisserie-plate', name: 'Rotisserie chicken plate', ingredients: ['1/4 rotisserie chicken', 'potato or rice', 'frozen veg'], proteinG: 42, kcal: 530, slots: ['lunch', 'dinner'] },
  { id: 'bean-burrito', name: 'Bean & cheese burrito', ingredients: ['1 cup canned beans', 'shredded cheese', 'tortilla', 'rice'], proteinG: 28, kcal: 580, slots: ['lunch', 'dinner'] },
  { id: 'salmon-rice', name: 'Baked salmon & rice', ingredients: ['6 oz salmon', '1 cup rice', 'frozen veg'], proteinG: 41, kcal: 605, slots: ['dinner'] },
  { id: 'chicken-salad', name: 'Grilled chicken salad', ingredients: ['6 oz chicken', 'bagged greens', 'dressing', 'croutons'], proteinG: 45, kcal: 550, slots: ['lunch', 'dinner'] },
  { id: 'pork-potato', name: 'Pork chop & potato', ingredients: ['6 oz pork chop', 'potato', 'applesauce or veg'], proteinG: 43, kcal: 590, slots: ['dinner'] },
  { id: 'mac-chicken', name: 'Mac & cheese + chicken', ingredients: ['1 cup mac & cheese', '4 oz chicken'], proteinG: 37, kcal: 500, slots: ['lunch', 'dinner'] },

  // ---- Snacks & late-night ----
  { id: 'shake-banana', name: 'Protein shake + banana', ingredients: ['1 scoop protein', 'water or milk', 'banana'], proteinG: 26, kcal: 240, slots: ['snack'] },
  { id: 'yogurt-honey', name: 'Greek yogurt + honey', ingredients: ['1 cup Greek yogurt', 'honey'], proteinG: 23, kcal: 190, slots: ['snack', 'late'] },
  { id: 'pbj-milk', name: 'PB&J + glass of milk', ingredients: ['2 slices bread', 'peanut butter', 'jelly', '1 cup milk'], proteinG: 24, kcal: 560, slots: ['snack', 'lunch'] },
  { id: 'eggs-apple', name: 'Boiled eggs + apple', ingredients: ['3 boiled eggs', 'apple'], proteinG: 18, kcal: 305, slots: ['snack'] },
  { id: 'cheese-jerky', name: 'Cheese, crackers & jerky', ingredients: ['cheese', 'crackers', '1 oz jerky'], proteinG: 19, kcal: 320, slots: ['snack'] },
  { id: 'cottage-pb', name: 'Cottage cheese + peanut butter', ingredients: ['1 cup cottage cheese', '1 tbsp peanut butter'], proteinG: 32, kcal: 275, slots: ['snack', 'late'] },
  { id: 'tuna-crackers', name: 'Tuna + crackers', ingredients: ['1 can tuna', 'crackers'], proteinG: 42, kcal: 330, slots: ['snack', 'lunch'] },
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
 * Protein distance is weighted heavier — it's the number the plan
 * actually rides on. Slot-filtered when the slot maps to a kind;
 * widens to the whole list when the slot pool is too small.
 */
export function mealAlternatives(
  target: { proteinG: number; kcal: number; slot?: string; excludeName?: string },
  count = 3,
): CommonMeal[] {
  const kind = target.slot ? slotKindOf(target.slot) : null
  const notSelf = (m: CommonMeal) =>
    !target.excludeName || m.name.toLowerCase() !== target.excludeName.trim().toLowerCase()
  let pool = COMMON_MEALS.filter((m) => notSelf(m) && (kind === null || m.slots.includes(kind)))
  if (pool.length < count) pool = COMMON_MEALS.filter(notSelf)

  const tp = Math.max(target.proteinG, 10)
  const tk = Math.max(target.kcal, 150)
  return pool
    .map((m) => ({ m, score: (Math.abs(m.proteinG - tp) / tp) * 1.5 + Math.abs(m.kcal - tk) / tk }))
    .sort((a, b) => a.score - b.score || a.m.id.localeCompare(b.m.id))
    .slice(0, count)
    .map((x) => x.m)
}

import type { DietStyle, FoodLimits, Goal, MealPlanConfig, MealTemplateDef, SupplementDef, SupplementId } from '../types'
import { mealAlternatives } from './mealAlts'
import { blockedBy } from './foodLimits'

// ============================================================
// Nutrition data from the NAOD V3 PDF. Protein numbers are the
// PDF's own (authoritative); kcal/carb/fat are standard estimates
// added so the calorie ring stays honest.
// ============================================================

export type FoodCategory = 'protein' | 'carb' | 'fat' | 'veg' | 'snack'

export interface FoodDef {
  id: string
  name: string
  serving: string
  proteinG: number
  kcal: number
  carbsG: number
  fatG: number
  category: FoodCategory
}

export const FOODS: FoodDef[] = [
  // Proteins (the priority)
  { id: 'chicken', name: 'Chicken breast', serving: '8 oz cooked', proteinG: 70, kcal: 375, carbsG: 0, fatG: 8, category: 'protein' },
  { id: 'steak', name: 'Lean steak / 93% beef', serving: '8 oz cooked', proteinG: 62, kcal: 480, carbsG: 0, fatG: 20, category: 'protein' },
  { id: 'salmon', name: 'Salmon', serving: '8 oz', proteinG: 46, kcal: 470, carbsG: 0, fatG: 28, category: 'protein' },
  { id: 'eggs', name: 'Eggs', serving: '4 large', proteinG: 24, kcal: 300, carbsG: 2, fatG: 20, category: 'protein' },
  { id: 'greek-yogurt', name: 'Greek yogurt (nonfat)', serving: '1 cup', proteinG: 23, kcal: 130, carbsG: 9, fatG: 0, category: 'protein' },
  { id: 'cottage-cheese', name: 'Cottage cheese', serving: '1 cup', proteinG: 28, kcal: 180, carbsG: 8, fatG: 5, category: 'protein' },
  { id: 'whey', name: 'Whey protein', serving: '1 scoop', proteinG: 25, kcal: 120, carbsG: 3, fatG: 2, category: 'protein' },
  { id: 'turkey', name: 'Turkey (lean ground)', serving: '8 oz', proteinG: 50, kcal: 400, carbsG: 0, fatG: 16, category: 'protein' },
  { id: 'tuna', name: 'Tuna / white fish', serving: '1 can / 6 oz', proteinG: 40, kcal: 200, carbsG: 0, fatG: 2, category: 'protein' },
  { id: 'casein', name: 'Casein shake', serving: '1 scoop', proteinG: 25, kcal: 130, carbsG: 4, fatG: 1, category: 'protein' },

  // Carbs
  { id: 'rice', name: 'White / jasmine rice', serving: '1 cup cooked', proteinG: 4, kcal: 205, carbsG: 45, fatG: 0, category: 'carb' },
  { id: 'potato', name: 'Potato', serving: '1 medium', proteinG: 4, kcal: 160, carbsG: 37, fatG: 0, category: 'carb' },
  { id: 'sweet-potato', name: 'Sweet potato', serving: '1 medium', proteinG: 2, kcal: 115, carbsG: 26, fatG: 0, category: 'carb' },
  { id: 'oats', name: 'Oats', serving: '3/4 cup dry', proteinG: 8, kcal: 225, carbsG: 40, fatG: 4, category: 'carb' },
  { id: 'sourdough', name: 'Sourdough bread', serving: '2 slices', proteinG: 8, kcal: 200, carbsG: 36, fatG: 1, category: 'carb' },
  { id: 'banana', name: 'Banana', serving: '1 large', proteinG: 1, kcal: 120, carbsG: 30, fatG: 0, category: 'carb' },
  { id: 'pasta', name: 'Pasta', serving: '1 cup cooked', proteinG: 8, kcal: 220, carbsG: 43, fatG: 1, category: 'carb' },

  // Fats (keep it 70-80g total/day)
  { id: 'olive-oil', name: 'Olive oil', serving: '1 tbsp', proteinG: 0, kcal: 120, carbsG: 0, fatG: 14, category: 'fat' },
  { id: 'nut-butter', name: 'Peanut / almond butter', serving: '1 tbsp', proteinG: 4, kcal: 95, carbsG: 3, fatG: 8, category: 'fat' },
  { id: 'avocado', name: 'Avocado', serving: '1/2', proteinG: 1, kcal: 120, carbsG: 6, fatG: 11, category: 'fat' },
  { id: 'trail-mix', name: 'Trail mix / nuts', serving: '1 oz', proteinG: 5, kcal: 170, carbsG: 12, fatG: 14, category: 'fat' },
  { id: 'cheese', name: 'Cheese', serving: '1 oz', proteinG: 7, kcal: 110, carbsG: 1, fatG: 9, category: 'fat' },

  // Veg (eat freely, fill half the plate)
  { id: 'veg', name: 'Big serving of veg', serving: '1-2 cups', proteinG: 3, kcal: 50, carbsG: 10, fatG: 0, category: 'veg' },

  // High-calorie muscle snacks
  { id: 'jerky', name: 'Beef jerky', serving: '1 oz', proteinG: 10, kcal: 80, carbsG: 6, fatG: 1, category: 'snack' },
  { id: 'protein-bar', name: 'Protein bar', serving: '1 bar', proteinG: 20, kcal: 220, carbsG: 22, fatG: 8, category: 'snack' },
  { id: 'berries', name: 'Mixed berries', serving: '1 cup', proteinG: 1, kcal: 70, carbsG: 17, fatG: 0, category: 'snack' },

  // ---- Library expansion (v10): enough breadth that anyone's real
  //      diet, vegetarian, budget, takeout-heavy, is loggable in taps.
  // More proteins
  { id: 'shrimp', name: 'Shrimp', serving: '6 oz', proteinG: 34, kcal: 180, carbsG: 0, fatG: 3, category: 'protein' },
  { id: 'tilapia', name: 'Tilapia / cod', serving: '8 oz', proteinG: 45, kcal: 220, carbsG: 0, fatG: 4, category: 'protein' },
  { id: 'pork-chop', name: 'Pork chop (lean)', serving: '6 oz', proteinG: 40, kcal: 330, carbsG: 0, fatG: 14, category: 'protein' },
  { id: 'ground-chicken', name: 'Ground chicken / turkey', serving: '6 oz', proteinG: 38, kcal: 300, carbsG: 0, fatG: 12, category: 'protein' },
  { id: 'deli-turkey', name: 'Deli turkey / ham', serving: '4 oz', proteinG: 22, kcal: 120, carbsG: 3, fatG: 2, category: 'protein' },
  { id: 'rotisserie', name: 'Rotisserie chicken', serving: '1/4 bird', proteinG: 36, kcal: 300, carbsG: 0, fatG: 14, category: 'protein' },
  { id: 'egg-whites', name: 'Egg whites', serving: '1 cup', proteinG: 26, kcal: 120, carbsG: 2, fatG: 0, category: 'protein' },
  { id: 'skyr', name: 'Skyr / kefir', serving: '1 cup', proteinG: 20, kcal: 140, carbsG: 10, fatG: 2, category: 'protein' },
  { id: 'milk', name: 'Milk (2%)', serving: '2 cups', proteinG: 16, kcal: 240, carbsG: 24, fatG: 10, category: 'protein' },
  { id: 'tofu', name: 'Tofu (firm)', serving: '8 oz', proteinG: 22, kcal: 190, carbsG: 5, fatG: 11, category: 'protein' },
  { id: 'tempeh', name: 'Tempeh', serving: '6 oz', proteinG: 31, kcal: 320, carbsG: 16, fatG: 18, category: 'protein' },
  { id: 'lentils', name: 'Lentils', serving: '1 cup cooked', proteinG: 18, kcal: 230, carbsG: 40, fatG: 1, category: 'protein' },
  { id: 'black-beans', name: 'Black beans / chickpeas', serving: '1 cup', proteinG: 15, kcal: 240, carbsG: 41, fatG: 1, category: 'protein' },
  { id: 'edamame', name: 'Edamame', serving: '1 cup', proteinG: 18, kcal: 190, carbsG: 14, fatG: 8, category: 'protein' },
  { id: 'protein-pasta', name: 'Protein pasta', serving: '2 oz dry', proteinG: 16, kcal: 200, carbsG: 32, fatG: 3, category: 'protein' },

  // More carbs
  { id: 'quinoa', name: 'Quinoa', serving: '1 cup cooked', proteinG: 8, kcal: 220, carbsG: 39, fatG: 4, category: 'carb' },
  { id: 'tortillas', name: 'Tortillas', serving: '2 medium', proteinG: 6, kcal: 220, carbsG: 36, fatG: 6, category: 'carb' },
  { id: 'bagel', name: 'Bagel', serving: '1', proteinG: 10, kcal: 280, carbsG: 55, fatG: 2, category: 'carb' },
  { id: 'cereal', name: 'Cereal + milk', serving: '1 bowl', proteinG: 10, kcal: 300, carbsG: 50, fatG: 5, category: 'carb' },
  { id: 'couscous', name: 'Couscous / farro', serving: '1 cup cooked', proteinG: 6, kcal: 210, carbsG: 42, fatG: 1, category: 'carb' },
  { id: 'apple', name: 'Apple / orange', serving: '1', proteinG: 0, kcal: 90, carbsG: 23, fatG: 0, category: 'carb' },
  { id: 'grapes', name: 'Grapes / melon', serving: '1 cup', proteinG: 1, kcal: 90, carbsG: 23, fatG: 0, category: 'carb' },
  { id: 'honey', name: 'Honey / jam', serving: '1 tbsp', proteinG: 0, kcal: 60, carbsG: 17, fatG: 0, category: 'carb' },

  // More fats
  { id: 'almonds', name: 'Almonds / walnuts', serving: '1 oz', proteinG: 6, kcal: 170, carbsG: 6, fatG: 15, category: 'fat' },
  { id: 'seeds', name: 'Chia / pumpkin seeds', serving: '2 tbsp', proteinG: 5, kcal: 110, carbsG: 5, fatG: 8, category: 'fat' },
  { id: 'butter', name: 'Butter / ghee', serving: '1 tbsp', proteinG: 0, kcal: 100, carbsG: 0, fatG: 11, category: 'fat' },
  { id: 'dark-chocolate', name: 'Dark chocolate', serving: '1 oz', proteinG: 2, kcal: 170, carbsG: 13, fatG: 12, category: 'fat' },
  { id: 'coconut', name: 'Coconut milk (canned)', serving: '1/4 cup', proteinG: 1, kcal: 110, carbsG: 2, fatG: 12, category: 'fat' },

  // More snacks & veg
  { id: 'hummus', name: 'Hummus + veg / pita', serving: '1/4 cup', proteinG: 5, kcal: 150, carbsG: 14, fatG: 9, category: 'snack' },
  { id: 'rice-cakes', name: 'Rice cakes + PB', serving: '2 + 1 tbsp', proteinG: 5, kcal: 170, carbsG: 18, fatG: 8, category: 'snack' },
  { id: 'popcorn', name: 'Popcorn (air-popped)', serving: '3 cups', proteinG: 3, kcal: 95, carbsG: 19, fatG: 1, category: 'snack' },
  { id: 'granola', name: 'Granola', serving: '1/2 cup', proteinG: 5, kcal: 220, carbsG: 32, fatG: 8, category: 'snack' },
  { id: 'string-cheese', name: 'String cheese', serving: '2 sticks', proteinG: 14, kcal: 160, carbsG: 2, fatG: 11, category: 'snack' },
  { id: 'protein-shake-rtd', name: 'Ready-to-drink shake', serving: '1 bottle', proteinG: 30, kcal: 160, carbsG: 5, fatG: 3, category: 'snack' },
  { id: 'salad-bag', name: 'Big salad (dressed)', serving: '1 bowl', proteinG: 3, kcal: 150, carbsG: 12, fatG: 10, category: 'veg' },
  { id: 'stir-fry-veg', name: 'Stir-fry vegetables', serving: '2 cups', proteinG: 4, kcal: 90, carbsG: 16, fatG: 2, category: 'veg' },
]

export function getFood(id: string): FoodDef {
  const f = FOODS.find((x) => x.id === id)
  if (!f) throw new Error(`Unknown food id: ${id}`)
  return f
}

// ---------- PDF daily meal templates (one-tap logs a whole meal) ----------

export interface MealTemplate {
  id: string
  dayType: 'training' | 'rest'
  slot: string
  name: string
  detail: string
  proteinG: number
  kcal: number
}

export const MEAL_TEMPLATES: MealTemplate[] = [
  // Training day (~2,800 kcal, 200g+ protein)
  { id: 't-breakfast', dayType: 'training', slot: 'Breakfast', name: 'Eggs + sourdough + yogurt', detail: '4 whole eggs + 2 slices sourdough + Greek yogurt (1 cup) + fruit', proteinG: 45, kcal: 650 },
  { id: 't-lunch', dayType: 'training', slot: 'Lunch', name: 'Chicken + rice + veg', detail: '8 oz chicken breast + 2 cups rice + veg + olive oil', proteinG: 60, kcal: 750 },
  { id: 't-shake', dayType: 'training', slot: 'Pre / Post', name: 'Shake + banana + PB', detail: 'Protein shake (1.5 scoop) + banana + 1 tbsp peanut butter', proteinG: 40, kcal: 400 },
  { id: 't-dinner', dayType: 'training', slot: 'Dinner', name: 'Steak/salmon + potatoes', detail: '8 oz steak or salmon + potatoes + veg', proteinG: 50, kcal: 700 },
  { id: 't-snack', dayType: 'training', slot: 'Snack', name: 'Cottage cheese + trail mix', detail: 'Cottage cheese (1 cup) + handful trail mix', proteinG: 30, kcal: 300 },

  // Rest day (~2,300 kcal, 200g+ protein)
  { id: 'r-breakfast', dayType: 'rest', slot: 'Breakfast', name: 'Protein oatmeal', detail: '3/4 cup oats + 1 scoop protein + banana + drizzle PB', proteinG: 40, kcal: 550 },
  { id: 'r-lunch', dayType: 'rest', slot: 'Lunch', name: 'Turkey burger + sweet potato', detail: 'Turkey burger (8 oz lean) + 1 sweet potato + big veg', proteinG: 55, kcal: 600 },
  { id: 'r-snack', dayType: 'rest', slot: 'Snack', name: 'Yogurt + berries + jerky', detail: 'Greek yogurt (1 cup) + berries + beef jerky (1 oz)', proteinG: 35, kcal: 300 },
  { id: 'r-dinner', dayType: 'rest', slot: 'Dinner', name: 'Salmon/chicken + rice', detail: '8 oz salmon or chicken + 1 cup rice + veg', proteinG: 55, kcal: 600 },
  { id: 'r-late', dayType: 'rest', slot: 'Late night', name: 'Casein or cottage cheese', detail: 'Casein shake or cottage cheese', proteinG: 30, kcal: 250 },
]

// ---------- Supplements (PDF table) ----------

export const SUPPLEMENTS: { id: SupplementId; name: string; dose: string; when: string }[] = [
  { id: 'creatine', name: 'Creatine monohydrate', dose: '5 g', when: 'Daily, any time' },
  { id: 'fishOil', name: 'Fish oil', dose: '1-2 g', when: 'With a meal' },
  { id: 'vitD3', name: 'Vitamin D3', dose: '2000-4000 IU', when: 'Morning, with fat' },
  { id: 'electrolytes', name: 'Electrolytes', dose: '1 serving', when: 'Around training / hot days' },
]

// ---------- Weekly grocery list (PDF) ----------

export const GROCERY_LIST: { category: string; items: string[] }[] = [
  {
    category: 'Protein',
    items: [
      'Chicken breast (4-5 lb)',
      'Lean steak or 93% beef (2 lb)',
      'Salmon (2 lb)',
      'Ground turkey (1 lb)',
      'Eggs (2-3 dozen)',
      'Greek yogurt (large tub)',
      'Cottage cheese (2 tubs)',
      'Whey protein',
    ],
  },
  {
    category: 'Carbs',
    items: ['Rice (big bag)', 'Potatoes', 'Sweet potatoes', 'Oats', 'Sourdough', 'Bananas', 'Pasta'],
  },
  {
    category: 'Fats',
    items: ['Olive oil', 'Peanut butter', 'Avocados', 'Trail mix / mixed nuts'],
  },
  {
    category: 'Veg / Fruit',
    items: ['Broccoli', 'Spinach', 'Peppers', 'Green beans', 'Zucchini', 'Mixed berries', "Whatever's fresh"],
  },
  {
    category: 'Extras',
    items: ['Honey', 'Electrolyte packets', 'Hot sauce / low-cal seasonings'],
  },
]

// Late-night rules (PDF)
export const LATE_NIGHT = {
  yes: ['Casein shake', 'Cottage cheese', 'Protein pudding', 'Greek yogurt'],
  no: ['Fast food', 'Pizza', 'Chips', 'Big portions', 'Heavy desserts'],
}

// ---------- Per-user meal plans (v10) ----------

/** Wider stack users can add from; the default stack is a subset. */
export const SUPPLEMENT_CATALOG: SupplementDef[] = [
  { id: 'creatine', name: 'Creatine monohydrate', dose: '5 g', when: 'Daily, any time' },
  { id: 'fishOil', name: 'Fish oil', dose: '1-2 g', when: 'With a meal' },
  { id: 'vitD3', name: 'Vitamin D3', dose: '2000-4000 IU', when: 'Morning, with fat' },
  { id: 'electrolytes', name: 'Electrolytes', dose: '1 serving', when: 'Around training / hot days' },
  { id: 'magnesium', name: 'Magnesium glycinate', dose: '200-400 mg', when: 'Evening' },
  { id: 'multivitamin', name: 'Multivitamin', dose: '1 serving', when: 'With breakfast' },
  { id: 'caffeine', name: 'Caffeine / pre-workout', dose: '100-200 mg', when: '30-45 min pre-session' },
  { id: 'collagen', name: 'Collagen + vitamin C', dose: '10-15 g', when: '30-60 min before jumps/sprints' },
  { id: 'zinc', name: 'Zinc', dose: '15-25 mg', when: 'Evening, not with calcium' },
]

/** The owner's booklet keeps his PDF meal plan verbatim. */
export function buildNaodMealPlan(): MealPlanConfig {
  return {
    templates: MEAL_TEMPLATES.map((t) => ({ ...t })),
    grocery: GROCERY_LIST.map((g) => ({ category: g.category, items: [...g.items] })),
    supplements: SUPPLEMENTS.map((s) => ({ ...s })),
    lateNight: { yes: [...LATE_NIGHT.yes], no: [...LATE_NIGHT.no] },
  }
}

const r5 = (n: number) => Math.max(5, Math.round(n / 5) * 5)
const r25 = (n: number) => Math.max(100, Math.round(n / 25) * 25)

export type MealsPerDay = 2 | 3 | 4 | 5

/** How each eating style divides the day. Percent pairs sum to 100/100. */
const MEAL_SPLITS: Record<
  MealsPerDay,
  { slot: string; restSlot?: string; name: string; pPct: number; kPct: number }[]
> = {
  2: [
    { slot: 'Meal 1', name: 'First plate, make it big', pPct: 0.45, kPct: 0.45 },
    { slot: 'Meal 2', name: 'The anchor, biggest of the day', pPct: 0.55, kPct: 0.55 },
  ],
  3: [
    { slot: 'Breakfast', name: 'High-protein start', pPct: 0.3, kPct: 0.3 },
    { slot: 'Lunch', name: 'Protein + carbs plate', pPct: 0.3, kPct: 0.32 },
    { slot: 'Dinner', name: 'The anchor meal', pPct: 0.4, kPct: 0.38 },
  ],
  4: [
    { slot: 'Breakfast', name: 'High-protein start', pPct: 0.25, kPct: 0.24 },
    { slot: 'Lunch', name: 'Protein + carbs plate', pPct: 0.3, kPct: 0.28 },
    { slot: 'Pre / Post', restSlot: 'Snack', name: 'Training-window fuel', pPct: 0.15, kPct: 0.16 },
    { slot: 'Dinner', name: 'The anchor meal', pPct: 0.3, kPct: 0.32 },
  ],
  5: [
    { slot: 'Breakfast', name: 'High-protein start', pPct: 0.2, kPct: 0.2 },
    { slot: 'Snack 1', name: 'Protein snack', pPct: 0.15, kPct: 0.14 },
    { slot: 'Lunch', name: 'Protein + carbs plate', pPct: 0.25, kPct: 0.24 },
    { slot: 'Snack 2', name: 'Second protein snack', pPct: 0.15, kPct: 0.14 },
    { slot: 'Dinner', name: 'The anchor meal', pPct: 0.25, kPct: 0.28 },
  ],
}

/** A concrete "here's what that looks like" line from common groceries. */
function suggestDetail(proteinG: number, kcal: number, slot: string, diet: DietStyle, limits?: FoodLimits): string {
  const alt = mealAlternatives({ proteinG, kcal, slot, diet, limits }, 1)[0]
  // No example beats a wrong example. The number is still the instruction.
  if (!alt) return 'Any combo that hits the number.'
  const gap = kcal - alt.kcal
  const pad =
    gap > 250 ? ' + a side to fill it out (toast, rice, fruit, whatever fits)' : gap < -200 ? ', portioned down to fit' : ''
  return `E.g. ${alt.name.toLowerCase()}: ${alt.ingredients.join(' + ')}${pad}. Or anything else that hits the number.`
}

/**
 * A generated day of eating scaled to THIS user's protein target, calorie
 * budget, AND how they actually like to eat. 2 big plates, 3 squares,
 * 3 + a training snack, or grazing across 5. Fewer meals = bigger meals;
 * every template carries a concrete common-grocery example.
 */
export function buildMealPlan(
  goal: Goal,
  proteinTargetG: number,
  nutrition: { kcalTraining: number; kcalRest: number },
  mealsPerDay: MealsPerDay = 4,
  dietStyle: DietStyle = 'omnivore',
  limits?: FoodLimits,
): MealPlanConfig {
  const p = Math.max(100, proteinTargetG || 160)
  const tail = goal === 'lean' ? ' Protein first. The calorie number is a ceiling, not a target to beat.' : ''

  const templates: MealTemplateDef[] = []
  for (const dayType of ['training', 'rest'] as const) {
    const kcalDay = dayType === 'training' ? nutrition.kcalTraining : nutrition.kcalRest
    MEAL_SPLITS[mealsPerDay].forEach((s, i) => {
      const proteinG = r5(p * s.pPct)
      const kcal = r25(kcalDay * s.kPct)
      const slot = dayType === 'rest' && s.restSlot ? s.restSlot : s.slot
      templates.push({
        id: `g-${dayType === 'training' ? 't' : 'r'}-${mealsPerDay}-${i}`,
        dayType,
        slot,
        name: s.name,
        detail: suggestDetail(proteinG, kcal, slot, dietStyle, limits) + tail,
        proteinG,
        kcal,
      })
    })
  }
  // A shopping list is an instruction too. Telling somebody with a nut
  // allergy to buy nut butter is the same failure as putting it on a plate,
  // so every line goes through the same filter the meals do.
  const shop = (items: string[]) =>
    items.filter((i) => blockedBy({ name: i, ingredients: [] }, limits) === null)
  return {
    templates,
    grocery: [
      {
        category: 'Protein',
        items: shop(
          dietStyle === 'vegan'
            ? ['Firm tofu + tempeh', 'Canned beans + lentils (stock up)', 'Plant protein powder', 'Soy milk', 'Edamame']
            : dietStyle === 'vegetarian'
              ? ['Eggs', 'Greek yogurt or skyr', 'Cottage cheese', 'Tofu + canned beans', 'Whey or plant protein']
              : ['Your 2-3 staple proteins (chicken, beef, fish, tofu…)', 'Eggs', 'Greek yogurt or skyr', 'Whey or plant protein', 'Cottage cheese'],
        ),
      },
      { category: 'Carbs', items: shop(['Rice or potatoes (big bag)', 'Oats', 'Bread or tortillas', 'Fruit for the week', 'Pasta or quinoa']) },
      { category: 'Fats', items: shop(['Olive oil', 'Nut butter', 'Nuts or seeds', 'Avocados']) },
      { category: 'Veg', items: shop(['2-3 vegetables you will actually eat', 'Salad bag', 'Frozen veg backup']) },
    ],
    supplements: SUPPLEMENT_CATALOG.filter(
      (s) => dietStyle !== 'vegan' || !['fishOil', 'collagen'].includes(s.id),
    )
      .slice(0, 3)
      .map((s) => ({ ...s })),
    lateNight: { yes: [...LATE_NIGHT.yes], no: [...LATE_NIGHT.no] },
  }
}

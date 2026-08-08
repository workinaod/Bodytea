import type { SupplementId } from '../types'

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
  { id: 'chicken', name: 'Chicken breast', serving: '8 oz cooked', proteinG: 55, kcal: 375, carbsG: 0, fatG: 8, category: 'protein' },
  { id: 'steak', name: 'Lean steak / 93% beef', serving: '8 oz cooked', proteinG: 50, kcal: 480, carbsG: 0, fatG: 20, category: 'protein' },
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

  // Veg (eat freely — fill half the plate)
  { id: 'veg', name: 'Big serving of veg', serving: '1-2 cups', proteinG: 3, kcal: 50, carbsG: 10, fatG: 0, category: 'veg' },

  // High-calorie muscle snacks
  { id: 'jerky', name: 'Beef jerky', serving: '1 oz', proteinG: 10, kcal: 80, carbsG: 3, fatG: 1, category: 'snack' },
  { id: 'protein-bar', name: 'Protein bar', serving: '1 bar', proteinG: 20, kcal: 220, carbsG: 22, fatG: 8, category: 'snack' },
  { id: 'berries', name: 'Mixed berries', serving: '1 cup', proteinG: 1, kcal: 70, carbsG: 17, fatG: 0, category: 'snack' },
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

  // Rest day (~2,500 kcal, 200g+ protein)
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

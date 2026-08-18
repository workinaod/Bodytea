// ============================================================
// How to actually make it.
//
// COMMON_MEALS was five fields: a name, an ingredient list, a
// protein number, a calorie number, a diet tag. That tells
// somebody WHAT hits their numbers and nothing whatsoever about
// producing it. Nothing said pan or oven, twelve minutes or
// forty, what to season it with, what to start first so the rice
// is not sitting cold twenty minutes before the chicken is done,
// or whether it survives three days in a fridge.
//
// Which matters, because the reason people miss a protein target
// is almost never that they did not know chicken has protein in
// it. It is 7pm, they are tired, and the gap between "eat 50 g of
// protein" and "here is the thing you can have in fifteen
// minutes with one pan" is the entire problem.
//
// SEPARATE FILE, deliberately. mealAlts.ts answers what and how
// much, which is what the swap engine matches on. This answers
// how, which nothing needs to match on and everything needs to
// read. Same split as movement.ts sitting beside exercises.ts.
//
// FOUR THINGS EVERY ENTRY CARRIES, each earning its place:
//
//   TIME, split into active and total. They are different
//   questions and only one of them is the reason somebody orders
//   takeaway instead. Forty minutes of oven with five minutes of
//   hands-on is a weeknight meal; twenty minutes of constant
//   stirring is not.
//
//   GEAR, because "one pan" and "a pan, a pot and a tray" are
//   different propositions at 9pm, and somebody in a room with a
//   microwave needs to know before they read the steps.
//
//   ORDER. The steps start whatever takes longest, every time.
//   That is the single thing that separates cooking from
//   assembling ingredients, and it is what recipe lists written
//   as ingredient-then-instruction bury.
//
//   SEASONING, because unseasoned chicken and rice is why people
//   quit eating for their goals. It is not a garnish, it is
//   adherence, and it costs nothing.
//
// SKILL is honest rather than flattering: 0 is impossible to get
// wrong, 1 needs heat managed, 2 needs two things finishing at
// once. Nothing here is above a 2.
// ============================================================

export type CookMethod =
  | 'no-cook'
  | 'assembly'
  | 'stovetop'
  | 'oven'
  | 'microwave'
  | 'blender'

export const METHOD_LABELS: Record<CookMethod, string> = {
  'no-cook': 'No cooking',
  assembly: 'Assembly',
  stovetop: 'Stovetop',
  oven: 'Oven',
  microwave: 'Microwave',
  blender: 'Blender',
}

export type CookGear =
  | 'none'
  | 'pan'
  | 'pot'
  | 'tray'
  | 'kettle'
  | 'blender'
  | 'microwave'
  | 'toaster'

export interface CookingMeta {
  method: CookMethod
  gear: CookGear[]
  /** Minutes with your hands on it. The number that decides whether it happens. */
  activeMin: number
  /** Minutes from starting to eating, including anything unattended. */
  totalMin: number
  /** 0 impossible to get wrong · 1 heat to manage · 2 two things finishing at once. */
  skill: 0 | 1 | 2
  /** In order, longest thing first. */
  steps: string[]
  /** What stops it tasting like nothing. Not a garnish; adherence. */
  seasoning?: string
  /** How to make several at once, where that is worth doing. */
  batch?: string
  /** Days it keeps in the fridge, cooked. Absent where it must be eaten fresh. */
  keepsDays?: number
}

const C = (
  method: CookMethod,
  activeMin: number,
  totalMin: number,
  steps: string[],
  o: Partial<Omit<CookingMeta, 'method' | 'activeMin' | 'totalMin' | 'steps'>> = {},
): CookingMeta => ({
  method,
  gear: ['none'],
  skill: method === 'no-cook' || method === 'assembly' ? 0 : 1,
  activeMin,
  totalMin,
  steps,
  ...o,
})

export const COOKING: Record<string, CookingMeta> = {
  // ---------------- Breakfast ----------------
  'eggs-toast': C('stovetop', 8, 8, [
    'Pan on medium, butter in. Bread in the toaster at the same time, not after.',
    'Crack the eggs in. For scrambled, stir slowly and pull them off while they still look slightly wet; they finish in the pan.',
    'Onto the toast. Eat immediately, eggs do not wait.',
  ], {
    gear: ['pan', 'toaster'],
    seasoning: 'Salt and black pepper AFTER cooking, not before. Hot sauce or a scrape of chilli oil if you have it.',
  }),
  'yogurt-bowl': C('no-cook', 3, 3, [
    'Yogurt into a bowl.',
    'Oats or granola on top, then the banana sliced over it.',
    'Honey last so it sits on top rather than sinking.',
  ], {
    seasoning: 'Cinnamon. It costs nothing and makes plain yogurt taste like a decision rather than a punishment.',
    batch: 'Overnight oats version: same ingredients, mixed the night before, eaten cold from the fridge.',
    keepsDays: 2,
  }),
  'oats-shake': C('microwave', 4, 5, [
    'Oats and water or milk in a bowl, microwave 2 minutes. Watch it, it climbs.',
    'While it goes, shake the protein with cold water in a separate glass.',
    'Stir a splash of milk through the oats to loosen them, drink the shake alongside.',
  ], {
    gear: ['microwave'],
    skill: 0,
    seasoning: 'Cinnamon and a pinch of salt in the oats. Salt in oats is the trick nobody is told.',
  }),
  'pb-banana-toast': C('assembly', 4, 4, [
    'Toast the bread.',
    'Peanut butter on while it is still hot so it melts in rather than sitting on top.',
    'Banana sliced over, milk poured.',
  ], { gear: ['toaster'], seasoning: 'A pinch of salt on the peanut butter if it is the unsalted kind.' }),
  'egg-cheese-sandwich': C('stovetop', 7, 7, [
    'Bread in the toaster, pan on medium at the same time.',
    'Eggs in the pan. Cheese onto the eggs while they are still wet so it melts into them.',
    'Fold, put it on the toast.',
  ], { gear: ['pan', 'toaster'], seasoning: 'Salt, pepper, and hot sauce on the bread rather than the egg.' }),
  'cottage-fruit': C('no-cook', 2, 2, [
    'Cottage cheese into a bowl.',
    'Fruit on top, chopped if it is anything bigger than a berry.',
  ], { seasoning: 'Black pepper if you are going savoury, cinnamon if sweet. Pick one.' }),
  'breakfast-burrito': C('stovetop', 10, 10, [
    'Pan on medium. Eggs in, scramble slowly.',
    'Warm the tortilla in a dry pan or 15 seconds in the microwave while the eggs finish; a cold tortilla splits.',
    'Cheese onto the hot eggs, salsa on, roll it tight.',
  ], {
    gear: ['pan'],
    seasoning: 'Salsa is the seasoning. Cumin in the eggs if you have it.',
    batch: 'Make four, wrap in foil, freeze. Ninety seconds in the microwave from frozen.',
    keepsDays: 3,
  }),
  'cereal-milk': C('no-cook', 2, 2, ['Cereal in a bowl.', 'Milk on. Eat before it goes soft.'], {
    seasoning: 'Nothing. This one is fine as it is.',
  }),
  'tofu-scramble': C('stovetop', 10, 10, [
    'Press the tofu between two plates with something heavy on top while the pan heats; wet tofu steams instead of browning.',
    'Crumble it into the hot oiled pan and leave it ALONE for two minutes to colour before stirring.',
    'Toast the bread in the last two minutes.',
  ], {
    gear: ['pan', 'toaster'],
    skill: 1,
    seasoning: 'Turmeric for colour, nutritional yeast and salt for savouriness, black salt if you want it to taste of egg.',
    keepsDays: 3,
  }),
  'pb-oatmeal': C('microwave', 4, 5, [
    'Oats and soy milk in a bowl, microwave 2 minutes.',
    'Peanut butter stirred through while hot so it melts into the oats instead of sitting in a lump.',
  ], { gear: ['microwave'], skill: 0, seasoning: 'Salt and cinnamon.' }),

  // ---------------- Lunch and dinner ----------------
  'chicken-rice': C('stovetop', 15, 30, [
    'Rice on FIRST. It takes the longest and it is the thing that will be cold if you start it second.',
    'Chicken into a hot oiled pan, and leave it alone for 5-6 minutes to get colour before turning it.',
    'Cook to just done, 74°C or no pink at the thickest point, then REST it 5 minutes off the heat while the rice finishes.',
    'Slice across the grain, over the rice.',
  ], {
    gear: ['pan', 'pot'],
    skill: 1,
    seasoning: 'Salt the chicken 10 minutes before it goes in the pan. Garlic powder, paprika, black pepper. Soy sauce or lemon over the top at the end.',
    batch: 'Cook four breasts and three cups of rice at once. It is the same pan and the same twenty minutes.',
    keepsDays: 4,
  }),
  'tuna-sandwich': C('no-cook', 5, 5, [
    'Drain the tuna properly, or the bread goes to pieces.',
    'Mix with mayo in the tin or a bowl.',
    'Onto the bread.',
  ], { seasoning: 'Black pepper, a squeeze of lemon, and something crunchy: celery, pickle, red onion.' }),
  'spaghetti-meat': C('stovetop', 15, 25, [
    'Water on to boil first, salted like the sea. That is the one thing pasta needs.',
    'Beef into a hot pan, broken up, browned properly rather than grey-steamed. Drain the fat if there is a lot.',
    'Jarred sauce in with the beef, simmer while the pasta cooks.',
    'Pasta into the sauce, not sauce onto the pasta. A splash of pasta water makes it cling.',
  ], {
    gear: ['pan', 'pot'],
    skill: 1,
    seasoning: 'Salt the pasta water. Dried oregano and garlic powder in the sauce, parmesan at the table.',
    batch: 'Double the sauce; it freezes better than almost anything.',
    keepsDays: 4,
  }),
  'turkey-sandwich': C('assembly', 4, 4, [
    'Toast the bread if you want it to survive being carried anywhere.',
    'Mayo on both slices, then turkey, then cheese.',
  ], { gear: ['toaster'], seasoning: 'Mustard, black pepper, and something acidic: pickle or tomato.' }),
  burger: C('stovetop', 12, 12, [
    'Pan or grill HOT before the patty goes near it. A cool pan gives you grey meat.',
    'Patty in, press once, then leave it 3-4 minutes to crust before flipping.',
    'Cheese on straight after the flip, bun in the pan cut-side down for the last minute.',
  ], {
    gear: ['pan'],
    skill: 1,
    seasoning: 'Salt the OUTSIDE of the patty just before it hits the pan, never mixed through. Pepper after.',
  }),
  'chicken-quesadilla': C('stovetop', 10, 10, [
    'Dry pan on medium. Tortilla in, cheese over half, chicken on the cheese, fold.',
    'Two to three minutes a side, pressing it flat, until it is properly golden rather than pale.',
    'Rest it 1 minute before cutting or the filling runs out.',
  ], {
    gear: ['pan'],
    seasoning: 'Cumin and chilli on the chicken. Salsa and sour cream to dip.',
    batch: 'Uses leftover chicken from any other meal here, which is the point of it.',
  }),
  'beef-potatoes': C('oven', 12, 45, [
    'Oven to 220°C. Potatoes cut into chunks, oiled and salted, onto a tray FIRST. They take forty minutes and everything else takes ten.',
    'At the thirty-minute mark, beef into a hot pan, hard sear both sides.',
    'Frozen veg in the microwave or a pot in the last five minutes.',
    'Rest the beef 5 minutes before slicing. This is not optional; slicing it straight away loses the juice onto the board.',
  ], {
    gear: ['tray', 'pan'],
    skill: 2,
    seasoning: 'Salt the beef 20 minutes ahead. Potatoes: salt, pepper, paprika, garlic powder.',
    batch: 'Roast a whole tray of potatoes. They reheat in a pan better than in a microwave.',
    keepsDays: 3,
  }),
  chili: C('stovetop', 15, 40, [
    'Beef browned in a hot pot, broken up, until it has real colour on it.',
    'Beans and tomatoes in, then the spices. Cook the spices in the fat for a minute first if you want them to taste of anything.',
    'Simmer 25 minutes with the lid off. That is where it stops tasting like tinned tomatoes.',
  ], {
    gear: ['pot'],
    skill: 1,
    seasoning: 'Cumin, chilli powder, smoked paprika, oregano, and salt at the END once it has reduced.',
    batch: 'Makes four portions as easily as one, freezes for months, and is better on day two.',
    keepsDays: 5,
  }),
  'chicken-stirfry': C('stovetop', 15, 25, [
    'Rice on first.',
    'Pan as hot as it goes. Chicken in, in ONE layer, not stirred for the first two minutes. A crowded cold pan steams.',
    'Chicken out, veg in, two minutes, chicken back in, sauce last so it glazes rather than boils.',
  ], {
    gear: ['pan', 'pot'],
    skill: 2,
    seasoning: 'Soy sauce, garlic, ginger, a little honey and sesame oil off the heat.',
    keepsDays: 3,
  }),
  'egg-fried-rice': C('stovetop', 12, 12, [
    'Use COLD rice, yesterday\'s if possible. Fresh rice turns to paste.',
    'Eggs scrambled in the pan first, then taken out.',
    'Veg and rice into the hot pan, pressed flat and left to catch, then the egg stirred back through at the end.',
  ], {
    gear: ['pan'],
    skill: 1,
    seasoning: 'Soy sauce round the edge of the pan rather than over the middle, sesame oil off the heat, white pepper.',
  }),
  'rotisserie-plate': C('microwave', 6, 12, [
    'Chicken is already cooked. Pull the quarter you want off the bird.',
    'Potato in the microwave 6-8 minutes, or rice if you have it.',
    'Frozen veg microwaved in the last three minutes.',
  ], {
    gear: ['microwave'],
    skill: 0,
    seasoning: 'The bird is seasoned. Salt and butter the potato, lemon over the veg.',
    batch: 'One bird is three or four meals and takes zero cooking. The best-value protein in any supermarket.',
    keepsDays: 3,
  }),
  'bean-burrito': C('assembly', 8, 8, [
    'Rice on, or use leftover.',
    'Beans warmed in a pan or microwave with their spices; cold beans in a burrito are grim.',
    'Tortilla warmed 15 seconds so it rolls without splitting, then fill and roll tight.',
  ], {
    gear: ['microwave'],
    seasoning: 'Cumin and chilli in the beans, salsa and lime at the end.',
    keepsDays: 3,
  }),
  'salmon-rice': C('oven', 8, 25, [
    'Oven to 200°C, rice on at the same time.',
    'Salmon on a lined tray, oiled and salted, 12-15 minutes. It is done when it flakes with light pressure, and thirty seconds past that is dry.',
    'Veg in the last five minutes.',
  ], {
    gear: ['tray', 'pot'],
    skill: 1,
    seasoning: 'Salt, pepper, lemon and dill or garlic. Lemon AFTER cooking, not before.',
    keepsDays: 2,
  }),
  'chicken-salad': C('stovetop', 12, 15, [
    'Chicken in a hot pan first, 5-6 minutes a side, then rest it while you do everything else.',
    'Greens in a bowl, dressing on, tossed BEFORE the chicken goes on so the chicken does not get soggy.',
    'Sliced chicken and croutons on top.',
  ], {
    gear: ['pan'],
    skill: 1,
    seasoning: 'Season the chicken properly; the salad is dressed, the chicken has to carry itself.',
  }),
  'pork-potato': C('oven', 10, 40, [
    'Potato in the oven at 200°C first, or microwaved 8 minutes if you are short.',
    'Pork chop into a hot pan, 4-5 minutes a side depending on thickness. 63°C and a little pink is correct, not grey.',
    'Rest 5 minutes.',
  ], {
    gear: ['tray', 'pan'],
    skill: 1,
    seasoning: 'Salt ahead of time. Sage, garlic, black pepper. Applesauce is not optional as far as pork is concerned.',
  }),
  'mac-chicken': C('stovetop', 12, 15, [
    'Mac and cheese per the box.',
    'Chicken warmed in a pan, or cooked from raw if you are starting there, and stirred through at the end.',
  ], {
    gear: ['pot', 'pan'],
    seasoning: 'Black pepper and hot sauce. A handful of frozen peas in the pasta water buys a vegetable for free.',
    batch: 'The obvious home for leftover chicken from earlier in the week.',
  }),
  'tofu-stirfry': C('stovetop', 15, 25, [
    'Rice on first. Press the tofu while it cooks.',
    'Tofu into a HOT oiled pan in one layer, left alone until each side browns. Stirring it early is why tofu ends up mushy.',
    'Tofu out, veg in, tofu back, sauce last.',
  ], {
    gear: ['pan', 'pot'],
    skill: 2,
    seasoning: 'Soy, garlic, ginger, sesame. Cornflour tossed on the tofu before frying gives it a crust.',
    keepsDays: 3,
  }),
  'lentil-soup': C('stovetop', 12, 40, [
    'Onion and carrot into oil in a pot, softened 5 minutes. Skipping this is why lentil soup tastes of nothing.',
    'Lentils and water or stock in, simmer 25-30 minutes until soft.',
    'Bread toasted at the end.',
  ], {
    gear: ['pot', 'toaster'],
    skill: 1,
    seasoning: 'Cumin, bay, salt at the end, and something acidic to finish, lemon or vinegar. That last step is what makes it taste finished.',
    batch: 'Doubles perfectly and freezes.',
    keepsDays: 5,
  }),
  'chickpea-curry': C('stovetop', 10, 25, [
    'Rice on first.',
    'Curry paste fried in oil for a minute until it smells like something, THEN the coconut milk. Paste straight into liquid tastes raw.',
    'Chickpeas in, simmer 10-15 minutes.',
  ], {
    gear: ['pot'],
    skill: 1,
    seasoning: 'The paste does the work. Lime and coriander at the end, salt to taste.',
    batch: 'Better the next day, freezes well.',
    keepsDays: 4,
  }),
  'bean-bowl': C('assembly', 8, 10, [
    'Rice on, or leftover rice warmed.',
    'Beans warmed with cumin and chilli.',
    'Everything into a bowl, salsa and avocado on top.',
  ], { gear: ['microwave'], skill: 0, seasoning: 'Lime over the whole bowl at the end, and salt the rice.', keepsDays: 3 }),
  'tempeh-rice': C('stovetop', 12, 25, [
    'Rice on first.',
    'Tempeh sliced and pan-fried in oil until browned both sides, 6-8 minutes. Steaming it for 5 minutes first takes the bitterness out.',
    'Sauce in at the end to glaze.',
  ], {
    gear: ['pan', 'pot'],
    skill: 1,
    seasoning: 'Soy, maple, garlic, chilli. Tempeh takes strong seasoning better than tofu does.',
    keepsDays: 3,
  }),
  'peanut-noodles': C('stovetop', 10, 15, [
    'Noodles on. Edamame into the same water for the last three minutes; one pot, not two.',
    'Peanut butter, soy, a little hot water and lime whisked into a sauce while they cook.',
    'Drained noodles into the sauce off the heat, or it splits.',
  ], {
    gear: ['pot'],
    skill: 1,
    seasoning: 'Lime and chilli are what stop it being cloying. Do not skip the acid.',
  }),
  'veggie-chili': C('stovetop', 12, 35, [
    'Onion softened in oil, spices in for a minute.',
    'Three tins of beans and the tomatoes in, simmer 25 minutes uncovered.',
    'Mash a few of the beans against the side of the pot to thicken it.',
  ], {
    gear: ['pot'],
    skill: 1,
    seasoning: 'Cumin, smoked paprika, chilli, oregano. Salt at the end, and a splash of vinegar.',
    batch: 'Four portions, freezes, better on day two.',
    keepsDays: 5,
  }),

  // ---------------- Snacks ----------------
  'shake-banana': C('blender', 2, 2, ['Everything in, blend 30 seconds.'], {
    gear: ['blender'],
    skill: 0,
    seasoning: 'Cinnamon, and a pinch of salt if you are using water rather than milk.',
  }),
  'yogurt-honey': C('no-cook', 1, 1, ['Yogurt in a bowl, honey over.'], { seasoning: 'Cinnamon.' }),
  'pbj-milk': C('assembly', 3, 3, ['Peanut butter on one slice, jam on the other.', 'Milk poured.'], {
    gear: ['none'],
  }),
  'eggs-apple': C('stovetop', 3, 12, [
    'Eggs into already-boiling water, 8 minutes for firm yolks, then straight into cold water so they peel.',
    'Apple on the side.',
  ], {
    gear: ['pot'],
    skill: 0,
    seasoning: 'Salt and pepper. Chilli flakes if you want them to be interesting.',
    batch: 'Boil six at once on a Sunday. They keep a week in the shell.',
    keepsDays: 7,
  }),
  'cheese-jerky': C('no-cook', 2, 2, ['Onto a plate, or straight out of the packet.'], {}),
  'cottage-pb': C('no-cook', 2, 2, ['Cottage cheese in a bowl, peanut butter stirred through.'], {
    seasoning: 'Cinnamon, and honey if it needs it.',
  }),
  'tuna-crackers': C('no-cook', 3, 3, ['Drain the tuna. Onto the crackers.'], {
    seasoning: 'Black pepper, lemon, hot sauce.',
  }),
  'plant-shake': C('blender', 2, 2, ['Everything in, blend 30 seconds.'], {
    gear: ['blender'],
    skill: 0,
    seasoning: 'Cinnamon. Plant protein needs it more than whey does.',
  }),
  'edamame-snack': C('microwave', 3, 5, [
    'Frozen edamame in a bowl with a splash of water, microwave 3 minutes.',
    'Salt them while they are still wet so it sticks.',
  ], { gear: ['microwave'], skill: 0, seasoning: 'Flaky salt, chilli flakes.' }),
}

export function cookingFor(id: string): CookingMeta | null {
  return COOKING[id] ?? null
}

/** "15 min · one pan" — the line that decides whether this happens tonight. */
export function cookingLine(m: CookingMeta): string {
  const time = m.activeMin === m.totalMin ? `${m.totalMin} min` : `${m.totalMin} min · ${m.activeMin} hands-on`
  const gear = m.gear.filter((g) => g !== 'none')
  const kit =
    gear.length === 0 ? 'no cooking' : gear.length === 1 ? `one ${gear[0]}` : `${gear.length} pans`
  return `${time} · ${kit}`
}

/**
 * Meals that fit the time somebody actually has.
 *
 * Filtered on ACTIVE minutes, not total. Forty minutes of oven with five
 * of hands-on is a weeknight meal; twenty minutes of standing over a pan
 * is the one that turns into a takeaway.
 */
export function withinActiveMinutes(ids: string[], maxActiveMin: number): string[] {
  return ids.filter((id) => (COOKING[id]?.activeMin ?? Infinity) <= maxActiveMin)
}

/** Nothing to cook with: a hotel room, a broken hob, a bad day. */
export function noCookIds(ids: string[]): string[] {
  return ids.filter((id) => {
    const c = COOKING[id]
    return c && (c.method === 'no-cook' || c.method === 'assembly')
  })
}

/** Worth making four of. */
export function batchableIds(ids: string[]): string[] {
  return ids.filter((id) => COOKING[id]?.batch !== undefined)
}

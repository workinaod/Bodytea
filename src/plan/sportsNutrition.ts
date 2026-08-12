// ============================================================
// The sports-nutrition evidence base.
//
// Everything numeric the app says about food should come from
// here, so there is one place to check a claim and one place to
// correct it. Sources are the ISSN position stands, the joint
// ACSM / Academy of Nutrition and Dietetics / Dietitians of
// Canada position on athletic performance, and the resistance-
// training meta-analyses those lean on. Where the literature
// gives a RANGE, the range is kept and the app picks inside it
// from what it knows about the athlete, rather than a single
// number being hard-coded and quietly presented as fact.
//
// TWO THINGS THIS FIXES, both of them the app being less smart
// than the data it already had.
//
// PROTEIN WAS A FLAT 1 g PER POUND for everybody. That is a
// decent central estimate and it is wrong at both ends. Somebody
// in a deep cut needs MORE, because protein is what decides
// whether the weight coming off is fat or muscle, and that is
// the single highest-leverage nutrition fact in a fat-loss
// programme. Somebody training purely for endurance needs less,
// and spending their limited appetite on it costs them the carbs
// they actually run on.
//
// CARBS AND FAT WERE COLLECTED AND THROWN AWAY. Every food in
// the library carries carbsG and fatG, every logged meal stores
// them, and nothing ever added them up or compared them to
// anything. An athlete could be eating 90 g of carbs on a day
// with two hard sessions in it and the app had no opinion,
// despite holding every number needed to have one.
//
// UNITS: the research is in grams per kilogram of BODYWEIGHT.
// The app talks in pounds because its users do. Conversions
// happen here, once.
// ============================================================

const LB_PER_KG = 2.20462

export const toKg = (lb: number) => lb / LB_PER_KG

/** Bodyweight the recommendations stay sane for. */
const clampLb = (lb: number) => Math.min(400, Math.max(80, lb || 175))

// ---------------- Protein ----------------

/**
 * Grams per kg of bodyweight per day.
 *
 * MAINTENANCE / GROWTH: meta-analysis puts the benefit of extra protein
 * for muscle gain plateauing around 1.6 g/kg, with the confidence
 * interval reaching to about 2.2. Above that nothing further has been
 * demonstrated for hypertrophy.
 *
 * DEFICIT: this is the case that actually matters. In an energy deficit
 * protein requirements go UP, because the body is looking for substrate
 * and muscle is substrate. The leaner and the hungrier the athlete, the
 * higher it goes — the literature reaches 2.3-3.1 g/kg of FAT-FREE mass
 * for lean athletes in aggressive deficits. Expressed against total
 * bodyweight for a typical trainee that lands near 2.4, which is where
 * the aggressive-cut number here comes from.
 *
 * ENDURANCE: 1.2-1.6 g/kg is the standard range. Higher is not harmful,
 * it is just carbs they did not eat.
 */
export const PROTEIN_G_PER_KG = {
  /** Pure endurance focus, no hypertrophy goal. */
  endurance: 1.5,
  /** Lifting, but not chasing size. */
  general: 2.0,
  /**
   * Training to add muscle. 2.2 g/kg is the top of the demonstrated
   * range and it is also almost exactly 1 g per POUND, which is the
   * heuristic every lifter already uses and what this app prescribed
   * before there was a table behind it. Keeping them equal is
   * deliberate: the point of this module is to raise the number where
   * the evidence says raise it, not to quietly cut everyone's protein
   * in the name of precision.
   */
  hypertrophy: 2.2,
  /** Losing fat while lifting. Protein is what keeps the loss fat. */
  deficit: 2.4,
  /** Deep or long cut, or already lean. The upper end of the evidence. */
  aggressiveDeficit: 2.6,
} as const

export type ProteinContext = keyof typeof PROTEIN_G_PER_KG

/**
 * Beyond this there is no demonstrated benefit, and it starts crowding
 * out the carbs and fat that do have jobs. A ceiling, not a target.
 */
export const PROTEIN_CEILING_G_PER_KG = 2.8

/** Daily protein in grams, for this athlete in this situation. */
export function proteinTargetG(bodyweightLb: number, context: ProteinContext): number {
  const kg = toKg(clampLb(bodyweightLb))
  const g = kg * PROTEIN_G_PER_KG[context]
  return Math.round(Math.min(g, kg * PROTEIN_CEILING_G_PER_KG) / 5) * 5
}

/**
 * Protein lands better spread across the day than in one sitting: about
 * 0.4 g/kg per meal is where the muscle-protein-synthesis response
 * saturates for most people, and four of those covers a day's target
 * with room to spare.
 */
export const PROTEIN_PER_MEAL_G_PER_KG = 0.4

export function proteinPerMealG(bodyweightLb: number, mealsPerDay: number): number {
  const kg = toKg(clampLb(bodyweightLb))
  const floor = kg * PROTEIN_PER_MEAL_G_PER_KG
  return Math.round(Math.max(floor, proteinTargetG(bodyweightLb, 'hypertrophy') / Math.max(1, mealsPerDay)) / 5) * 5
}

// ---------------- Carbohydrate ----------------

/**
 * Grams per kg per day, by how much training the day actually holds.
 * These are the standard endurance-nutrition load bands, and they are
 * the reason a rest day and a two-session day should not carry the same
 * carb number.
 */
export const CARB_G_PER_KG = {
  /** Rest, or light skill work under an hour. */
  rest: 3.5,
  /** One normal session. */
  moderate: 5,
  /** A hard or long session, or two in a day. */
  high: 7,
  /** Endurance block: hours of work, most days. */
  veryHigh: 9,
} as const

export type TrainingLoad = keyof typeof CARB_G_PER_KG

export function carbTargetG(bodyweightLb: number, load: TrainingLoad): number {
  return Math.round((toKg(clampLb(bodyweightLb)) * CARB_G_PER_KG[load]) / 5) * 5
}

// ---------------- Fat ----------------

/**
 * The floor, not a target. Below roughly 0.5 g/kg — or below about 15%
 * of calories, whichever is higher — hormone production and fat-soluble
 * vitamin absorption start to suffer, and a cut that gets aggressive is
 * exactly where people cross that line without noticing.
 */
export const FAT_FLOOR_G_PER_KG = 0.5
export const FAT_FLOOR_KCAL_FRACTION = 0.15

export function fatFloorG(bodyweightLb: number, kcal: number): number {
  const byMass = toKg(clampLb(bodyweightLb)) * FAT_FLOOR_G_PER_KG
  const byEnergy = (kcal * FAT_FLOOR_KCAL_FRACTION) / 9
  return Math.round(Math.max(byMass, byEnergy) / 5) * 5
}

/**
 * A full macro split for one day: protein and fat set by physiology,
 * carbohydrate taking whatever energy is left over.
 *
 * Carbs are the remainder on purpose. Protein has a job the body cannot
 * do without, fat has a floor below which things break, and carbohydrate
 * is the fuel that flexes with how much work the day contains. Splitting
 * by fixed percentages instead — the "40/30/30" of every diet app —
 * gives a 200 lb lifter on 3,200 kcal and the same lifter cutting on
 * 2,000 completely different protein intakes for no physiological
 * reason.
 */
export interface MacroTargets {
  proteinG: number
  carbsG: number
  fatG: number
  kcal: number
}

export function macroTargets(args: {
  bodyweightLb: number
  kcal: number
  protein: ProteinContext
  load: TrainingLoad
}): MacroTargets {
  const proteinG = proteinTargetG(args.bodyweightLb, args.protein)
  const fatMin = fatFloorG(args.bodyweightLb, args.kcal)
  const afterProtein = args.kcal - proteinG * 4
  // Fat gets its floor plus a share of what is left, so a big-calorie day
  // is not all carbohydrate. Carbs then take the remainder.
  const fatG = Math.round(Math.max(fatMin, (afterProtein * 0.3) / 9) / 5) * 5
  const carbsG = Math.max(0, Math.round((afterProtein - fatG * 9) / 4 / 5) * 5)
  return { proteinG, carbsG, fatG, kcal: args.kcal }
}

// ---------------- Hydration ----------------

/**
 * Baseline millilitres per kg per day, before training. Sweat rates run
 * 0.5-2.0 L per hour depending on heat and effort, so an hour of work
 * adds meaningfully to this rather than being noise.
 */
export const WATER_ML_PER_KG = 35
export const WATER_ML_PER_TRAINING_HOUR = 600

export function waterTargetMl(bodyweightLb: number, trainingHours = 0): number {
  const base = toKg(clampLb(bodyweightLb)) * WATER_ML_PER_KG
  return Math.round((base + trainingHours * WATER_ML_PER_TRAINING_HOUR) / 50) * 50
}

/** Millilitres to fluid ounces, for the units most of this app's users think in. */
export const mlToOz = (ml: number) => Math.round(ml / 29.5735)

// ---------------- Rate of change ----------------

/**
 * How fast bodyweight should move, as a fraction of bodyweight per week.
 *
 * Faster fat loss than about 1% a week reliably costs lean mass, and the
 * whole point of eating this much protein and lifting this hard is that
 * it should not. Muscle gain is slower than anyone wants to hear: past
 * roughly 0.5% a week almost all of the surplus is fat, and a trained
 * lifter is nearer the bottom of that range than the top.
 */
export const WEEKLY_CHANGE_PCT = {
  fatLossMin: 0.005,
  fatLossMax: 0.01,
  gainMin: 0.0025,
  gainMax: 0.005,
} as const

export function weeklyLossRangeLb(bodyweightLb: number): [number, number] {
  const bw = clampLb(bodyweightLb)
  const r = (v: number) => Math.round(bw * v * 10) / 10
  return [r(WEEKLY_CHANGE_PCT.fatLossMin), r(WEEKLY_CHANGE_PCT.fatLossMax)]
}

export function weeklyGainRangeLb(bodyweightLb: number): [number, number] {
  const bw = clampLb(bodyweightLb)
  const r = (v: number) => Math.round(bw * v * 100) / 100
  return [r(WEEKLY_CHANGE_PCT.gainMin), r(WEEKLY_CHANGE_PCT.gainMax)]
}

// ---------------- Fuelling around training ----------------

export interface FuellingRule {
  id: string
  when: string
  what: string
  /** The reason, in one sentence, because a rule nobody understands gets skipped. */
  why: string
}

export const FUELLING: FuellingRule[] = [
  {
    id: 'pre-carb',
    when: '1-4 hours before a hard session',
    what: '1-4 g of carbs per kg of bodyweight, scaled to how long before you eat it.',
    why: 'A session run on empty glycogen is a session where the last third is wasted, and the last third is where most of the adaptation lives.',
  },
  {
    id: 'during-long',
    when: 'Sessions past 60-90 minutes',
    what: '30-60 g of carbs an hour. Past 2.5 hours, up to 90 g an hour, but only from a mix of glucose and fructose.',
    why: 'The gut can only absorb about 60 g an hour of glucose alone; fructose uses a different transporter, which is the only reason the higher number is reachable.',
  },
  {
    id: 'post-protein',
    when: 'Within a few hours either side of lifting',
    what: '0.25-0.4 g of protein per kg, which is one normal protein-forward meal.',
    why: 'The "anabolic window" was oversold: total protein across the day matters far more than the clock. Getting a meal near the session is a convenient way to hit the total, not an emergency.',
  },
  {
    id: 'post-carb-fast-turnaround',
    when: 'Only when the next session is under 8 hours away',
    what: '1.0-1.2 g of carbs per kg per hour for the first four hours.',
    why: 'This is the one genuinely time-sensitive rule, and it applies to two-a-days and tournaments. On a normal one-session day, eating normally refills glycogen just as well.',
  },
  {
    id: 'protein-spread',
    when: 'Across the whole day',
    what: 'Roughly 0.4 g per kg per meal, across 3-5 meals.',
    why: 'The muscle-building response to a meal saturates. Four moderate hits beat one enormous dinner, and it is the easiest change most people can make.',
  },
  {
    id: 'alcohol',
    when: 'The night after a hard session',
    what: 'If it happens, keep it moderate and get the protein and fluid in anyway.',
    why: 'Alcohol blunts muscle protein synthesis and wrecks sleep quality, and sleep is where the training actually gets absorbed. This is a real cost, not a moral one.',
  },
]

// ---------------- Supplements that survive scrutiny ----------------

export type EvidenceGrade = 'strong' | 'moderate' | 'limited'

export interface SupplementEvidence {
  id: string
  name: string
  dose: string
  timing: string
  evidence: EvidenceGrade
  /** What it actually does, and what it does not. */
  effect: string
}

/**
 * Ordered by how well the evidence holds up, not by how much shelf space
 * it gets. The honest summary of this list is that the top two do
 * something measurable, and everything below them is small, conditional,
 * or only fixes a deficiency you might not have.
 */
export const SUPPLEMENT_EVIDENCE: SupplementEvidence[] = [
  {
    id: 'creatine',
    name: 'Creatine monohydrate',
    dose: '3-5 g daily. A 20 g/day load for 5-7 days only makes it work sooner, not better.',
    timing: 'Any time. Consistency is the whole mechanism; a missed hour means nothing.',
    evidence: 'strong',
    effect: 'The most studied legal ergogenic there is. Small but real gains in strength, repeat-effort work and training volume. Monohydrate is the studied form; the expensive versions are not better.',
  },
  {
    id: 'caffeine',
    name: 'Caffeine',
    dose: '3-6 mg per kg of bodyweight.',
    timing: '30-60 minutes before. Not within 8 hours of bed.',
    evidence: 'strong',
    effect: 'Genuinely improves endurance, and to a smaller degree power and effort perception. Above about 9 mg/kg you get the side effects without more benefit, and it costs sleep, which costs more than it gives.',
  },
  {
    id: 'vitD3',
    name: 'Vitamin D3',
    dose: '1000-4000 IU daily.',
    timing: 'With a meal containing fat.',
    evidence: 'moderate',
    effect: 'Fixes a deficiency, which is common indoors and at northern latitudes and does affect bone and muscle function. It is not a performance aid if you are not deficient.',
  },
  {
    id: 'beta-alanine',
    name: 'Beta-alanine',
    dose: '3.2-6.4 g daily, split to reduce the tingling.',
    timing: 'Any time, but it takes 4+ weeks of daily use to saturate.',
    evidence: 'moderate',
    effect: 'Helps efforts lasting roughly 1-4 minutes by buffering acidity. Useless for a 5-second jump and useless for a marathon.',
  },
  {
    id: 'omega3',
    name: 'Omega-3 (EPA + DHA)',
    dose: '1-3 g of combined EPA and DHA daily.',
    timing: 'With a meal.',
    evidence: 'moderate',
    effect: 'Well supported for general health. The performance and soreness claims are much weaker than the marketing suggests.',
  },
  {
    id: 'nitrate',
    name: 'Beetroot / dietary nitrate',
    dose: '6-8 mmol of nitrate, about 500 ml of beetroot juice.',
    timing: '2-3 hours before an endurance effort.',
    evidence: 'moderate',
    effect: 'Small endurance benefit by lowering the oxygen cost of work. The effect is smaller in already well-trained athletes.',
  },
  {
    id: 'protein-powder',
    name: 'Protein powder',
    dose: 'Whatever closes the gap to your daily target.',
    timing: 'Whenever it is convenient.',
    evidence: 'strong',
    effect: 'Food in a convenient shape, and that is the entire claim. It works because hitting a protein target works, not because a powder does something a chicken breast does not.',
  },
]

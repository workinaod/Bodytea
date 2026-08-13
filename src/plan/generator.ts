import type {
  CardioOption,
  CustomTarget,
  DayTemplate,
  DietStyle,
  EquipTag,
  Goal,
  LifeEventKind,
  PlanConfig,
  TemplateEntry,
  Weekday,
} from '../types'
import { getExercise } from './exercises'
import { ANCHOR_SLOTS } from './blocks'
import { canDo, equipFor, resolveForEquipment } from './equip'
import { buildMealPlan, type MealsPerDay } from './foods'
import { flooredTargets } from './kcalFloor'
import { proteinTargetG, type ProteinContext } from './sportsNutrition'
export * from './followups'

// ============================================================
// The booklet generator: OnboardingAnswers → PlanConfig.
// Pure and deterministic, same answers, same booklet. Every
// exercise it can ever emit lives in the catalog with a full
// guide, muscle map, and demo, and is filtered/substituted by
// the user's equipment so a plan always resolves.
// ============================================================

export interface OnboardingAnswers {
  goal: Goal
  secondaryGoal?: Goal
  /** The user's goal in their own words ("dunk on a 10-ft rim by June"). */
  goalStatement: string
  customTargets: CustomTarget[]
  daysPerWeek: 3 | 4 | 5 | 6
  equipProfile: 'gym' | 'home-db' | 'minimal'
  extraEquip: EquipTag[]
  experience: 'new' | 'returning' | 'trained'
  bodyweightLb: number
  /** Tunes the calorie baseline and defaults the body-fat tape formula. */
  sex?: 'male' | 'female'
  /** How they actually like to eat, the meal plan is built at this count. */
  mealsPerDay?: MealsPerDay
  /** Their real week (shifts, gigs, kids), seeded as life events so the
   *  coach's notes speak THEIR schedule from day one. */
  lifeSeeds?: { label: string; kind: LifeEventKind }[]
  /** How they eat, meals, swaps, and grocery lists respect it. */
  dietStyle?: DietStyle
  /** Skip meal-plan generation; the Meals tab offers setup later. */
  skipMeals?: boolean
  /** Up to two body areas that get guaranteed direct weekly work. */
  focusAreas?: FocusArea[]
  /** One-tap answers to the goal follow-up questions (GOAL_FOLLOWUPS). */
  goalAnswers?: Record<string, string>
}

// ---------- Focus areas: direct work the user explicitly asked for ----------

export type FocusArea = 'arms' | 'chest' | 'back' | 'shoulders' | 'glutes' | 'legs' | 'core'

export const FOCUS_LABELS: Record<FocusArea, string> = {
  arms: 'Arms',
  chest: 'Chest',
  back: 'Back',
  shoulders: 'Shoulders',
  glutes: 'Glutes',
  legs: 'Legs',
  core: 'Core',
}

// Ordered candidates per area, the first equipment-legal, not-already-
// programmed pick gets appended as accessory volume (3 × 10-15).
const FOCUS_ACCESSORIES: Record<FocusArea, string[]> = {
  arms: ['ez-bar-curl', 'hammer-curl', 'incline-db-curl', 'chin-up'],
  chest: ['incline-db-press', 'flat-db-press', 'floor-press'],
  back: ['one-arm-db-row', 'chest-supported-row', 'lat-pulldown', 'inverted-row'],
  shoulders: ['lateral-raise', 'db-shoulder-press', 'rear-delt-raise'],
  glutes: ['hip-thrust', 'glute-bridge'],
  legs: ['leg-press', 'slider-leg-curl', 'single-leg-calf-raise'],
  core: ['hanging-leg-raise', 'dead-bug', 'plank-side-plank'],
}

// ---------- Equipment profiles ----------

const PROFILE_TAGS: Record<OnboardingAnswers['equipProfile'], EquipTag[]> = {
  // Full gym: everything except environment access (court/hill are asked
  // separately) and a training partner.
  gym: [
    'dumbbell', 'barbell', 'bench', 'incline-bench', 'rack', 'pullup-bar',
    'box', 'plate', 'machine', 'open-space', 'treadmill', 'hill-stairs',
    'kettlebell', 'med-ball', 'band', 'trap-bar', 'cones', 'hurdle', 'sled',
  ],
  // Home gym: nothing assumed, the onboarding checklist is the source of
  // truth for what's actually in the garage. Open space is always free.
  'home-db': ['open-space'],
  minimal: ['open-space'],
}

export function ownedTags(a: OnboardingAnswers): Set<EquipTag> {
  return new Set<EquipTag>(['none', ...PROFILE_TAGS[a.equipProfile], ...a.extraEquip])
}

// ---------- Weekly layouts ----------

type Role =
  | 'power' | 'speed' | 'lowerStrength' | 'push' | 'pull'
  | 'upperMix' | 'fullBody' | 'mobility'

type GoalFamily = 'explosive' | 'muscle' | 'strength' | 'general'

const FAMILY: Record<Goal, GoalFamily> = {
  vertical: 'explosive',
  speed: 'explosive',
  muscle: 'muscle',
  strength: 'strength',
  lean: 'general',
  general: 'general',
  endurance: 'general',
}

const LAYOUTS: Record<GoalFamily, Record<3 | 4 | 5 | 6, Partial<Record<Weekday, Role>>>> = {
  explosive: {
    3: { 1: 'power', 3: 'lowerStrength', 5: 'upperMix' },
    4: { 1: 'power', 3: 'lowerStrength', 5: 'upperMix', 6: 'speed' },
    5: { 1: 'power', 2: 'push', 3: 'lowerStrength', 5: 'pull', 6: 'speed' },
    6: { 1: 'power', 2: 'push', 3: 'lowerStrength', 4: 'mobility', 5: 'pull', 6: 'speed' },
  },
  muscle: {
    3: { 1: 'push', 3: 'pull', 5: 'lowerStrength' },
    4: { 1: 'push', 2: 'lowerStrength', 4: 'pull', 6: 'fullBody' },
    5: { 1: 'push', 2: 'pull', 3: 'lowerStrength', 5: 'upperMix', 6: 'fullBody' },
    6: { 1: 'push', 2: 'pull', 3: 'lowerStrength', 4: 'mobility', 5: 'upperMix', 6: 'fullBody' },
  },
  strength: {
    3: { 1: 'lowerStrength', 3: 'push', 5: 'pull' },
    4: { 1: 'lowerStrength', 2: 'push', 4: 'pull', 6: 'fullBody' },
    5: { 1: 'lowerStrength', 2: 'push', 3: 'pull', 5: 'fullBody', 6: 'upperMix' },
    6: { 1: 'lowerStrength', 2: 'push', 3: 'pull', 4: 'mobility', 5: 'fullBody', 6: 'upperMix' },
  },
  general: {
    3: { 1: 'fullBody', 3: 'lowerStrength', 5: 'upperMix' },
    4: { 1: 'fullBody', 3: 'lowerStrength', 5: 'upperMix', 6: 'fullBody' },
    5: { 1: 'fullBody', 2: 'upperMix', 3: 'lowerStrength', 5: 'fullBody', 6: 'pull' },
    6: { 1: 'fullBody', 2: 'upperMix', 3: 'lowerStrength', 4: 'mobility', 5: 'fullBody', 6: 'pull' },
  },
}

// ---------- Slot pools ----------

const POOLS: Record<string, string[]> = {
  squatVariation: ['goblet-squat', 'front-squat', 'heels-elevated-goblet', 'leg-press', 'db-front-squat', 'split-squat'],
  lowerAccessory: ['bulgarian-split-squat', 'walking-lunge', 'step-up', 'reverse-lunge', 'split-squat'],
  hamstring: ['db-rdl', 'good-morning', 'single-leg-rdl', 'machine-leg-curl', 'slider-leg-curl', 'glute-bridge'],
  press1: ['incline-db-press', 'standing-ohp', 'db-shoulder-press', 'flat-db-press', 'push-up'],
  press2: ['flat-db-press', 'close-grip-press', 'floor-press', 'overhead-tricep-extension', 'pike-push-up', 'push-up'],
  rowVariation: ['barbell-row', 'one-arm-db-row', 'chest-supported-row', 'seated-cable-row', 'lat-pulldown', 'inverted-row'],
  curl: ['ez-bar-curl', 'incline-db-curl', 'hammer-curl', 'chin-up', 'inverted-row'],
  calf: ['single-leg-calf-raise', 'seated-calf-raise', 'double-leg-calf-raise', 'pogo-hop'],
  coreA: ['hanging-leg-raise', 'weighted-situp', 'hollow-hold', 'dead-bug'],
  coreB: ['weighted-situp', 'plank-side-plank', 'dead-bug', 'hollow-hold'],
}

/** Per-goal promotions: this exercise leads the pool (→ Block 1). */
const GOAL_FIRST: Partial<Record<Goal, Partial<Record<string, string>>>> = {
  strength: { squatVariation: 'front-squat', press1: 'standing-ohp', hamstring: 'good-morning' },
  muscle: { press1: 'incline-db-press', rowVariation: 'one-arm-db-row' },
}

/** Cheap deterministic string hash (djb2), powers per-user plan variety. */
export function hashStr(s: string): number {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0
  return h
}

function pickSlots(goal: Goal, owned: Set<EquipTag>, seed = 0): Record<1 | 2 | 3, Record<string, string>> {
  const out: Record<1 | 2 | 3, Record<string, string>> = { 1: {}, 2: {}, 3: {} }
  for (const [slot, base] of Object.entries(POOLS)) {
    const promoted = GOAL_FIRST[goal]?.[slot]
    const ordered = promoted ? [promoted, ...base.filter((id) => id !== promoted)] : base
    const legal = ordered.filter((id) => canDo(id, owned))
    // An anchor lift is the same movement in every block, so the athlete
    // trains it all year and the progress chart is one unbroken line.
    if ((ANCHOR_SLOTS as readonly string[]).includes(slot)) {
      for (const block of [1, 2, 3] as const) out[block][slot] = legal[0]
      continue
    }
    // Per-user variety: the goal's best pick always anchors block 1, but the
    // block 2/3 rotation order is seeded by WHO is asking, two people with
    // the same goal get different booklets, both quality-legal.
    const rest = legal.slice(1)
    const r = rest.length > 1 ? (seed + hashStr(slot)) % rest.length : 0
    const varied = [legal[0], ...rest.slice(r), ...rest.slice(0, r)]
    // Terminal bodyweight entries guarantee legal.length >= 1 for any gear.
    for (const block of [1, 2, 3] as const) {
      out[block][slot] = varied[(block - 1) % varied.length]
    }
  }
  return out
}

// ---------- Role recipes ----------

interface EntrySpec {
  kind: 'fx' | 'slot'
  id: string // exerciseId for fx, slot name for slot
  sets: number
  repText: string
  repsNum?: number
}

interface Recipe {
  title: string
  tagline: string
  cns?: boolean
  kind: DayTemplate['kind']
  debriefKey: string
  entries: EntrySpec[]
  note?: string
}

const fx = (id: string, sets: number, repText: string, repsNum?: number): EntrySpec => ({ kind: 'fx', id, sets, repText, repsNum })
const sl = (id: string, sets: number, repText: string, repsNum?: number): EntrySpec => ({ kind: 'slot', id, sets, repText, repsNum })

const RECIPES: Record<Role, Recipe> = {
  power: {
    title: 'Power + First Step',
    tagline: 'Max-intent jumps and starts on fresh legs, then fast strength.',
    cns: true,
    kind: 'session',
    debriefKey: 'power',
    entries: [
      fx('falling-start-sprint', 5, '2', 2),
      fx('box-jump', 4, '3', 3),
      sl('squatVariation', 3, '5', 5),
      sl('lowerAccessory', 3, '8', 8),
      sl('calf', 3, '10', 10),
      sl('coreA', 3, '10', 10),
    ],
    note: 'Every explosive rep at full intent, full rest. Stop a drill the moment quality drops.',
  },
  speed: {
    title: 'Speed + Reactive',
    tagline: 'Top-end speed and elastic bounce. The week’s fastest work.',
    cns: true,
    kind: 'session',
    debriefKey: 'speed',
    entries: [
      fx('dynamic-warmup', 1, '8 min'),
      fx('max-velocity-sprint', 5, '30-40 yd'),
      fx('pogo-hop', 3, '20', 20),
      fx('approach-jump', 1, '6', 6),
      sl('curl', 3, '10', 10),
      fx('farmer-carry', 3, '40 sec'),
    ],
    note: 'Speed practiced tired is speed practiced wrong. Full recovery between reps.',
  },
  lowerStrength: {
    title: 'Lower Strength',
    tagline: 'Heavy legs: squat pattern, hinge, and the posterior chain.',
    kind: 'session',
    debriefKey: 'lower',
    entries: [
      sl('squatVariation', 4, '6', 6),
      fx('romanian-deadlift', 4, '8', 8),
      sl('hamstring', 3, '10', 10),
      sl('calf', 4, '12', 12),
      sl('coreB', 3, '12', 12),
    ],
    note: 'Heavy, not reckless. A rep or two always left in the tank.',
  },
  push: {
    title: 'Push + Shoulders',
    tagline: 'Pressing volume and the shoulder health that protects it.',
    kind: 'session',
    debriefKey: 'push',
    entries: [
      sl('press1', 4, '6-8'),
      sl('press2', 3, '8-10'),
      fx('lateral-raise', 3, '12-15'),
      fx('overhead-tricep-extension', 3, '10-12'),
      fx('prone-y-raise', 2, '12', 12),
    ],
    note: 'Control every lowering. Shoulder-blade position is the whole game.',
  },
  pull: {
    title: 'Pull + Grip',
    tagline: 'Back width and thickness, arms, and a grip that never quits.',
    kind: 'session',
    debriefKey: 'pull',
    entries: [
      fx('pull-up', 4, 'max'),
      sl('rowVariation', 4, '8-10'),
      sl('curl', 3, '10-12'),
      fx('rear-delt-raise', 3, '12-15'),
      fx('farmer-carry', 3, '40 sec'),
    ],
    note: 'Full stretch at the bottom of every pull. Half reps build ego, not backs.',
  },
  upperMix: {
    title: 'Upper Body',
    tagline: 'One hard press, one hard pull, and the details around them.',
    kind: 'session',
    debriefKey: 'push',
    entries: [
      sl('press1', 4, '6-8'),
      sl('rowVariation', 4, '8-10'),
      fx('lateral-raise', 3, '12-15'),
      sl('curl', 3, '10', 10),
      sl('coreA', 3, '10', 10),
    ],
  },
  fullBody: {
    title: 'Full Body',
    tagline: 'Squat, hinge, press, pull. The whole machine in one session.',
    kind: 'session',
    debriefKey: 'lower',
    entries: [
      sl('squatVariation', 3, '8', 8),
      fx('romanian-deadlift', 3, '10', 10),
      sl('press1', 3, '8-10'),
      sl('rowVariation', 3, '10', 10),
      sl('coreA', 3, '12', 12),
    ],
  },
  mobility: {
    title: 'Mobility + Active Recovery',
    tagline: 'Open the hips and ankles, decompress, walk it off.',
    kind: 'mobility',
    debriefKey: 'mobility',
    entries: [
      fx('hip-9090-switch', 1, '5 / side'),
      fx('deep-squat-hold', 3, '45 sec'),
      fx('ankle-wall-mobilization', 1, '12 / side'),
      fx('couch-stretch', 1, '60 sec / side'),
      fx('t-spine-opener', 1, '8 / side'),
      fx('dead-hang', 3, '30 sec'),
      fx('easy-walk', 1, '20-30 min'),
    ],
    note: 'This is recovery, not training. Do not turn it into a workout.',
  },
}

// ---------- Template assembly ----------

function buildTemplate(
  id: string,
  recipe: Recipe,
  owned: Set<EquipTag>,
  experience: OnboardingAnswers['experience'],
  trim?: number,
): DayTemplate {
  const entries: TemplateEntry[] = []
  const specs = trim ? recipe.entries.slice(0, trim) : recipe.entries
  for (const s of specs) {
    const sets =
      recipe.kind === 'session' && experience === 'new' && s.sets > 2 ? s.sets - 1 : s.sets
    if (s.kind === 'slot') {
      entries.push({ entry: 'slot', slot: s.id, sets, repText: s.repText, repsNum: s.repsNum })
    } else {
      const resolved = resolveForEquipment(s.id, owned)
      if (!resolved) continue
      entries.push({ entry: 'fixed', exerciseId: resolved, sets, repText: s.repText, repsNum: s.repsNum })
    }
  }
  const mvItems = entries
    .filter((e): e is Extract<TemplateEntry, { entry: 'fixed' }> => e.entry === 'fixed')
    .slice(0, 2)
    .map((e) => ({ exerciseId: e.exerciseId, sets: Math.max(1, Math.ceil(e.sets / 2)), repText: e.repText, repsNum: e.repsNum }))
  // Slot-only openers: fall back to the first two entries at runtime
  // (minimumViableFor handles a missing recipe).
  return {
    id,
    title: recipe.title,
    tagline: recipe.tagline,
    kind: recipe.kind,
    cns: recipe.cns,
    entries,
    minViable: mvItems.length >= 2 ? { label: 'The bare minimum', items: mvItems } : undefined,
    note: recipe.note,
    debriefKey: recipe.debriefKey,
  }
}

const ROLE_TEMPLATE_ID: Record<Role, string> = {
  power: 'power',
  speed: 'speed',
  lowerStrength: 'lower',
  push: 'push',
  pull: 'pull',
  upperMix: 'upper',
  fullBody: 'fullbody',
  mobility: 'mobility',
}

// ---------- Cardio ----------

export function pickCardio(owned: Set<EquipTag>): CardioOption[] {
  const all: CardioOption[] = [
    { exerciseId: 'easy-jog', repText: '25-30 min', group: 'A' },
    { exerciseId: 'brisk-walk', repText: '30-45 min', group: 'A' },
    { exerciseId: 'incline-walk', repText: '25-30 min', group: 'A' },
    { exerciseId: 'bike-erg', repText: '25-30 min', group: 'A' },
    { exerciseId: 'rowing-erg', repText: '20-25 min', group: 'A' },
    { exerciseId: 'hill-sprint', repText: '6-10 sprints', group: 'B' },
    { exerciseId: 'parking-lot-sprint', repText: '6-10 reps', group: 'B' },
    { exerciseId: 'stair-run', repText: '8-12 rounds', group: 'B' },
    { exerciseId: 'circuit-a', repText: '4-5 rounds', group: 'circuit' },
    { exerciseId: 'circuit-b', repText: '8-10 rounds', group: 'circuit' },
  ]
  const legal = all.filter((c) => canDo(c.exerciseId, owned))
  const capped = { A: 0, B: 0, circuit: 0 } as Record<'A' | 'B' | 'circuit', number>
  return legal.filter((c) => ++capped[c.group] <= 3)
}

// ---------- Rationale ----------

const RATIONALE_TEMPLATES: Record<Goal, string[]> = {
  vertical: [
    '{name} builds {quality}, a direct deposit toward "{goal}". Every quality rep here shows up in your bounce.',
    'Your jump is only as good as what {name} trains: {quality}. That is why it earned a spot in your booklet.',
    '{name} is in YOUR plan because "{goal}" runs on {quality}. Skip it and the goal gets further away.',
  ],
  speed: [
    '{name} feeds {quality}, the engine behind "{goal}". Fast is built here, not wished for.',
    'Speed leaks wherever {quality} is weak. {name} plugs that leak for "{goal}".',
    '{name} made your booklet because "{goal}" is won on {quality}.',
  ],
  muscle: [
    '{name} drives {quality}, the growth stimulus "{goal}" needs. Log it, add load, repeat.',
    'Muscle is built by progressive work like {name}. {quality} today, visible change at the check-ins.',
    '{name} is in YOUR plan because "{goal}" is earned set by set. This one counts.',
  ],
  strength: [
    '{name} builds {quality}, raw strength that compounds toward "{goal}".',
    'Every heavy, honest set of {name} moves "{goal}" closer. {quality} is the currency.',
    '{name} earned its slot: "{goal}" demands {quality}, and nothing trains it better with your gear.',
  ],
  lean: [
    '{name} keeps muscle on while the deficit does its work. {quality} protects "{goal}".',
    'Cutting without training like {name} burns muscle, not fat. {quality} keeps "{goal}" on track.',
    '{name} is here because "{goal}" looks right only if you keep the engine: {quality}.',
  ],
  general: [
    '{name} trains {quality}, a pillar of being dangerous at anything. "{goal}" gets closer every session.',
    'All-around athletes are built on {quality}. {name} is your rep for it.',
    '{name} is in YOUR plan because "{goal}" needs the complete package. This covers {quality}.',
  ],
  endurance: [
    '{name} is in YOUR plan because distance running breaks bodies that only run. {quality} is the armor.',
    'Runners skip {name} and end up injured at mile 30 of a training block. {quality} keeps you on the road toward "{goal}".',
    '{name} trains {quality}. More {quality} means every mile costs less, which is the whole endurance game.',
  ],
}

/** Goal-voiced "why it's in YOUR plan" lines for a set of exercises. */
export function rationaleFor(goal: Goal, goalStatement: string, ids: string[]): Record<string, string> {
  return buildRationale(goal, goalStatement, ids)
}

function buildRationale(goal: Goal, goalStatement: string, ids: string[]): Record<string, string> {
  const pool = RATIONALE_TEMPLATES[goal]
  const out: Record<string, string> = {}
  const goalShort = goalStatement.trim().replace(/\.+$/, '') || 'your goal'
  for (const id of ids) {
    const def = getExercise(id)
    const quality = (def.targets.qualities[0] ?? 'the quality you need').toLowerCase()
    const t = pool[id.length % pool.length]
    out[id] = t.replace(/\{name\}/g, def.name).replace(/\{quality\}/g, quality).replace(/\{goal\}/g, goalShort)
  }
  return out
}

// ---------- Nutrition ----------

export function buildNutrition(
  goal: Goal,
  bodyweightLb: number,
  sex?: 'male' | 'female',
  ans: Record<string, string> = {},
) {
  const bw = Math.min(330, Math.max(90, bodyweightLb || 175))
  // Same protein either way (1 g/lb); the calorie baseline runs a notch
  // lower for women (bw×14 vs ×15), standard TDEE difference.
  const base = Math.round((bw * (sex === 'female' ? 14 : 15)) / 50) * 50
  const adj: Record<Goal, number> = { muscle: 300, strength: 250, vertical: 200, speed: 150, general: 100, lean: -300, endurance: 150 }
  let kcalTraining = base + adj[goal]
  // Follow-up answers sharpen the number. A 30+ lb cut needs a real
  // deficit; a desk-bound day burns less than the formula assumes.
  if (goal === 'lean') {
    if ((ans['lose-amount'] === '30 to 60 lb' || ans['lose-amount'] === 'More than that')) kcalTraining -= 150
    else if (ans['lose-amount'] === '10 to 30 lb') kcalTraining -= 75
    if (ans['day-movement'] === 'Sitting') kcalTraining -= 50
    kcalTraining = Math.max(1700, kcalTraining)
  }
  if (goal === 'muscle' && ans['gain-amount'] === 'As much as I can') kcalTraining += 100
  return {
    // Protein now depends on the SITUATION, not just the scale. A cut is
    // where protein does its most important job (deciding whether the
    // weight lost is fat or muscle) and where a flat 1 g/lb undershot;
    // an endurance athlete was being handed protein instead of the carbs
    // they run on. See plan/sportsNutrition.ts for the ranges and why.
    proteinTargetG: proteinTargetG(bw, proteinContextFor(goal, ans)),
    // 1700 above is lean-only; this floors every goal, and the rest day.
    ...flooredTargets(kcalTraining, base),
  }
}

/** Which protein band this athlete's goal and answers put them in. */
export function proteinContextFor(goal: Goal, ans: Record<string, string> = {}): ProteinContext {
  if (goal === 'lean') {
    // A big cut, or a desk-bound day making the deficit bite harder, is
    // where lean mass is most at risk and protein matters most.
    return (ans['lose-amount'] === '30 to 60 lb' || ans['lose-amount'] === 'More than that') || ans['lose-amount'] === '10 to 30 lb'
      ? 'aggressiveDeficit'
      : 'deficit'
  }
  if (goal === 'endurance') return 'endurance'
  if (goal === 'muscle' || goal === 'strength' || goal === 'vertical') return 'hypertrophy'
  return 'general'
}


// ---------- The deep-goal framework ----------
// Every goal family gets the same treatment weight loss got first: the
// real physiology written in plain language, sharpened by the follow-up
// answers, and honest about what the plan actually does. One builder
// per goal; adding depth to a goal (or a new goal) happens here.

type NutritionNums = { kcalTraining: number; kcalRest: number; proteinTargetG: number }
type StrategyBuilder = (ans: Record<string, string>, n: NutritionNums) => string[]

const STRATEGY: Record<Goal, StrategyBuilder> = {
  lean: (ans, n) => {
    const out = [
      `Training days run ${n.kcalTraining} kcal, rest days ${n.kcalRest}. A deficit your body can hold for months without rebounding.`,
      `Protein holds at ${n.proteinTargetG} g so what you lose is fat, not muscle. Protein-first meals also keep insulin calm, and calm insulin is when fat actually burns.`,
      'Lifting through a cut is not optional: muscle is where blood sugar gets stored and burned, and keeping it is what keeps the weight off after.',
      'The deeper game: whole foods over packaged ones to cool inflammation, fiber and fermented foods for your gut, and a 10-minute walk after meals to flatten the sugar spike.',
    ]
    if (ans['food-struggle'] === 'Late at night')
      out.push('Your leak is late night. Meals front-load earlier so the 11pm pull loses its grip, and the late-night list keeps only safe picks.')
    if (ans['food-struggle'] === 'Drinks and sweets')
      out.push('Liquid sugar is the fastest insulin spike there is. Swap the drinks first and half the deficit handles itself.')
    if (ans['food-struggle'] === 'Snacking')
      out.push('Snacking usually means meals run too small. Yours are built bigger and protein-heavy so grazing loses its pull.')
    if (ans['food-struggle'] === 'Big portions')
      out.push('Portions are pre-decided here: every meal carries its numbers. Eat what is written, skip the guessing.')
    if (ans['day-movement'] === 'Sitting')
      out.push('Desk days burn less than formulas assume, so your target sits a notch lower and daily walks count as real training.')
    return out
  },

  muscle: (ans, n) => {
    const out = [
      `A controlled surplus (${n.kcalTraining} kcal on training days) plus ${n.proteinTargetG} g protein. Big enough to build, small enough to stay lean.`,
      'Muscle grows from tension plus progression: the same lifts come back a little heavier or a rep better. The weight check-ins drive that automatically.',
      `Protein lands harder spread out: roughly ${Math.round(n.proteinTargetG / 4 / 5) * 5} g per meal keeps building all day instead of one giant dinner.`,
      'The growing happens between sessions. Sleep is when growth hormone peaks, and the plan spaces muscle groups so each one recovers before it gets hit again.',
    ]
    if (ans['appetite'] === 'Struggle to eat enough')
      out.push('Eating enough is your real bottleneck, so lean on the calorie-dense picks in your meal plan and liquid calories like shakes and milk.')
    if (ans['appetite'] === 'I can always eat')
      out.push('A big appetite makes bulking easy and staying lean hard. Keep the surplus at the number, not at the appetite.')
    if (ans['sleep-hours'] === 'Under 6 hours')
      out.push('Under 6 hours of sleep quietly caps muscle growth and spikes hunger hormones. Treat 7+ as part of the program.')
    if (ans['gain-amount'] === 'As much as I can')
      out.push('Max growth still has a speed limit: about half a pound a week of actual muscle. The extra calories are in your numbers; patience is on you.')
    return out
  },

  strength: (ans, n) => {
    const out = [
      'Strength is a skill before it is a size: the same big lifts return week after week so your nervous system learns to fire everything at once.',
      'Heavy but never to failure: one or two reps always left in the tank keeps every rep fast and clean. Grinding maxes teaches bad patterns.',
      `Protein at ${n.proteinTargetG} g and a small surplus keep the engine fed without adding a gut.`,
    ]
    if (ans['bar-years'] === 'Under a year')
      out.push('Your first year is the golden window: strength can climb almost every session. The plan rides that as long as it lasts.')
    if (ans['bar-years'] === 'Longer')
      out.push('Past the early window strength moves in waves, not lines. The blocks and deloads in your plan are what make the wave rise.')
    if (ans['maxes-known'] === 'No idea')
      out.push('No maxes needed. The first two weeks find your working weights through the check-ins, then the numbers climb from there.')
    if (ans['lift-focus'] && ans['lift-focus'] !== 'All of them')
      out.push(`${ans['lift-focus']} leads its day every week. Priority lifts come first when you are freshest.`)
    return out
  },

  vertical: (ans) => {
    const out = [
      'A vertical is rate of force: how much you can put into the ground in a quarter of a second. Everything here feeds that.',
      'Two engines: strength days build force, jump days teach your legs to release it fast. Skipping either caps the other.',
      'Landings are half the workout. Soft, quiet landings build the tendon stiffness that actually returns energy at takeoff.',
    ]
    if (ans['limiting'] === 'Strength')
      out.push('You feel the strength gap, so the lifting days are your growth edge. Treat them like the main event.')
    if (ans['limiting'] === 'Bounce')
      out.push('Strong but not springy: the jump and sprint days are your edge. Arrive fresh for them, always.')
    if (ans['limiting'] === 'Not sure')
      out.push('The first block tests both sides. Watch where your numbers move fastest; that is your edge.')
    if (ans['jump-history'] === 'Never')
      out.push('Jump volume starts a set lighter than standard. Tendons adapt slower than muscles, and rushing that is how people get hurt.')
    if (ans['vert-now'] === 'Touch it')
      out.push('You are inches away. The last inches come from speed and stiffness, not from more grinding.')
    return out
  },

  speed: (ans) => {
    const out = [
      'Nothing trains speed like sprinting. The plan sprints you fresh, short, and sharp, never ground into fatigue.',
      'Full recovery between reps is the point, not a break from it: walk back, reset, go again at true max.',
      'Hamstrings are the engine at top speed. The lifting days load them on purpose, and gradual sprint exposure is what keeps them healthy.',
    ]
    if (ans['speed-what'] === 'Changing direction')
      out.push('Games are won in the first ten yards, so acceleration work gets the priority in your week.')
    if (ans['speed-what'] === 'Top speed')
      out.push('Top speed is posture and rhythm. The max-velocity days matter most; treat them like game day.')
    if (ans['speed-what'] === 'First few steps')
      out.push('Expect the first difference in how you move, not on a stopwatch. Fast feet change how everything else feels.')
    if (ans['sprint-feel'] === 'It has been years')
      out.push('Sprint volume starts a set lighter than standard. Years off means the tissue needs a runway before true max efforts.')
    if (ans['sprint-feel'] === 'Stiff')
      out.push('Stiff at speed usually means range. The mobility work in your week is not filler; it is where the stride opens up.')
    if (ans['sprint-space'] === 'Treadmill only')
      out.push('Treadmill sprints work to start. When you can, find open ground: real acceleration is a different animal.')
    return out
  },

  general: (ans, n) => {
    const out = [
      'Strength and cardio fitness are two of the strongest health markers there are. This plan trains both on purpose.',
      'Muscle is metabolic armor: it stores and burns blood sugar and keeps insulin in check as you age.',
      `Protein at ${n.proteinTargetG} g and daily movement do more for energy and health markers than any single workout.`,
    ]
    if (ans['matters-most'] === 'Look better')
      out.push('Visible change follows a boring loop: protein, progressive lifts, sleep. The mirror starts moving around week six.')
    if (ans['matters-most'] === 'Health numbers')
      out.push('Blood pressure, resting heart rate, blood sugar: all of them respond to exactly this mix of lifting, cardio, and walking.')
    if (ans['matters-most'] === 'More energy')
      out.push('Energy follows training, not the other way around. Give it two weeks of showing up and the afternoons change.')
    if (ans['barrier'] === 'No time')
      out.push('Sessions are sized for a real day, and busy weeks drop to a smaller tier instead of dropping to zero.')
    if (ans['barrier'] === 'It gets boring')
      out.push('Exercises rotate every block exactly so this never goes stale.')
    if (ans['barrier'] === 'I get sore')
      out.push('Soreness fades as you adapt. Volume builds block by block so it never buries you.')
    if (ans['barrier'] === 'No energy')
      out.push('Start lighter than pride wants. The intensity options at session start exist for low days; use them and keep the streak.')
    if (ans['day-movement'] === 'Sitting')
      out.push('The biggest win outside the gym: break up the sitting. Short walks count, and the plan nudges you.')
    return out
  },

  endurance: (ans, n) => {
    const out = [
      'The 80/20 rule runs this plan: most miles easy enough to talk through, a small dose hard. Easy miles build the engine; running everything medium builds nothing.',
      'Lifting is your injury insurance: strong hips, hamstrings and calves are what survive a training block. The gym days protect the road days.',
      `Mileage needs fuel: ${n.kcalTraining} kcal and ${n.proteinTargetG} g protein on training days keep the legs rebuilding instead of breaking down.`,
    ]
    if (ans['race-what'] === 'Marathon')
      out.push('The marathon is won by the long run: one a week, growing toward 20 mi. Every run you track here gets a goal check against that build.')
    if (ans['race-what'] === 'Half marathon')
      out.push('The half rewards steady volume: a weekly long run toward 11 mi and honest easy pace everywhere else.')
    if (ans['race-what'] === '5K' || ans['race-what'] === '10K')
      out.push('Short races are speed on top of base: mostly easy miles, one sharper session a week once the base is in.')
    if (ans['race-what'] === 'Something longer')
      out.push('Ultras are eating and walking contests with running in between: time on feet beats pace, and practicing fueling every long run is non-negotiable.')
    if (ans['run-now'] === 'Under 10 miles a week')
      out.push('Base first: add about 10% a week, never more. Tissue adapts slower than lungs, and rushing mileage is how shins and knees quit.')
    if (ans['race-when'] === 'Under 3 months')
      out.push('Race is close, so specificity wins: long runs and race-pace segments matter more than anything new.')
    return out
  },
}

/**
 * The plan's thinking, written out per goal: real physiology, sharpened
 * by the follow-up answers. Shown on the booklet preview and pinned to
 * the Record on day one. Capped so nobody drowns in bullets.
 */
export function deepGoalStrategy(goal: Goal, ans: Record<string, string>, n: NutritionNums): string[] {
  return STRATEGY[goal](ans, n).slice(0, 6)
}

const GOAL_LABEL: Record<Goal, string> = {
  vertical: 'Vertical Project',
  speed: 'Speed Project',
  muscle: 'Muscle Build',
  strength: 'Strength Base',
  lean: 'Cut Engine',
  endurance: 'Engine Builder',
  general: 'Hybrid Athlete',
}

// ---------- The generator ----------

export function generatePlan(a: OnboardingAnswers): { plan: PlanConfig; proteinTargetG: number; strategy: string[] } {
  const owned = ownedTags(a)
  const family = FAMILY[a.goal]
  const layout = LAYOUTS[family][a.daysPerWeek]

  // Weekly tier-1 templates
  const templates: Record<string, DayTemplate> = {}
  const tier1ByWeekday: Record<Weekday, string | null> = { 0: null, 1: null, 2: null, 3: null, 4: null, 5: null, 6: null }
  for (const [wdStr, role] of Object.entries(layout)) {
    const wd = Number(wdStr) as Weekday
    const tid = ROLE_TEMPLATE_ID[role!]
    if (!templates[tid]) templates[tid] = buildTemplate(tid, RECIPES[role!], owned, a.experience)
    tier1ByWeekday[wd] = tid
  }

  // Tier 2/3 variants (always generated so tier drops resolve)
  templates['t2-lower'] = buildTemplate('t2-lower', RECIPES.lowerStrength, owned, a.experience, 4)
  templates['t2-upper'] = buildTemplate('t2-upper', RECIPES.upperMix, owned, a.experience, 4)
  templates['t3-fullbody'] = buildTemplate('t3-fullbody', RECIPES.fullBody, owned, a.experience, 4)
  const explosive = family === 'explosive'
  if (explosive) {
    if (!templates.speed) templates.speed = buildTemplate('speed', RECIPES.speed, owned, a.experience)
    templates['t3-explosive'] = buildTemplate('t3-explosive', RECIPES.speed, owned, a.experience, 4)
  }

  // Deep-goal answer → real programming: someone new to jumping or years
  // off sprinting starts every jump/sprint movement one set lighter.
  // Tendons adapt slower than muscles; the strategy notes say this and
  // the plan actually does it.
  const gentleExplosive =
    explosive &&
    (a.goalAnswers?.['jump-history'] === 'Never' ||
      a.goalAnswers?.['speed-now'] === 'Have not sprinted in years')
  if (gentleExplosive) {
    for (const t of Object.values(templates)) {
      if (t.kind !== 'session') continue
      t.entries = t.entries.map((e) => {
        if (e.entry !== 'fixed' || e.sets < 3) return e
        const kind = getExercise(e.exerciseId).kind
        return kind === 'jump' || kind === 'sprint' ? { ...e, sets: e.sets - 1 } : e
      })
    }
  }

  const tierRoleTemplates: PlanConfig['tierRoleTemplates'] = explosive
    ? { 2: { lower: 't2-lower', upper: 't2-upper', explosive: 'speed' }, 3: { fullbody: 't3-fullbody', explosive: 't3-explosive' } }
    : { 2: { lower: 't2-lower', upper: 't2-upper' }, 3: { fullbody: 't3-fullbody', upper: 't2-upper' } }
  const tierDefaultPlacement: PlanConfig['tierDefaultPlacement'] = explosive
    ? { 2: { lower: 1, upper: 3, explosive: 6 }, 3: { fullbody: 3, explosive: 6 } }
    : { 2: { lower: 1, upper: 4 }, 3: { fullbody: 2, upper: 5 } }

  // Anchors
  const mobilityWd = Object.entries(layout).find(([, r]) => r === 'mobility')?.[0]
  const freeWds = ([4, 3, 2, 0] as Weekday[]).filter((wd) => !tier1ByWeekday[wd])
  const conditioningWeekday = (mobilityWd ? Number(mobilityWd) : freeWds[0] ?? 0) as Weekday
  const cnsWeekdays = (Object.entries(layout) as [string, Role][])
    .filter(([, r]) => r === 'power' || r === 'speed')
    .map(([wd]) => Number(wd) as Weekday)

  // Focus areas: append direct accessory volume to the day that fits,
  // never a max-effort day; the exercise must be equipment-legal and not
  // already programmed there.
  const focusPicks: { area: FocusArea; exerciseId: string }[] = []
  const tier1Sessions = [...new Set(Object.values(tier1ByWeekday).filter((t): t is string => !!t))]
    .map((tid) => templates[tid])
    .filter((t) => t.kind === 'session')
  for (const area of (a.focusAreas ?? []).slice(0, 2)) {
    const wantLower = area === 'glutes' || area === 'legs'
    const host =
      tier1Sessions.find(
        (t) => !t.cns && (wantLower ? /lower|leg/i.test(t.id + t.title) : /upper|push|pull|full/i.test(t.id + t.title)),
      ) ??
      tier1Sessions.find((t) => !t.cns) ??
      tier1Sessions[tier1Sessions.length - 1]
    if (!host) continue
    const pick = FOCUS_ACCESSORIES[area]
      .map((id) => resolveForEquipment(id, owned))
      .find(
        (id): id is string => !!id && !host.entries.some((e) => e.entry === 'fixed' && e.exerciseId === id),
      )
    if (!pick) continue
    host.entries = [...host.entries, { entry: 'fixed', exerciseId: pick, sets: 3, repText: '10-15', repsNum: 12 }]
    if (!host.title.includes(FOCUS_LABELS[area])) {
      host.title = `${host.title} · ${FOCUS_LABELS[area]} focus`
    }
    focusPicks.push({ area, exerciseId: pick })
  }

  // The person IS the seed: same goal, different human → different booklet.
  const seed = hashStr(
    `${a.goalStatement}|${a.bodyweightLb}|${(a.focusAreas ?? []).join(',')}|${a.daysPerWeek}|${a.experience}`,
  )
  const slots = pickSlots(a.goal, owned, seed)
  const cardioOptions = pickCardio(owned)

  // Everything the plan references (for rationale + tracked lifts)
  const referenced = new Set<string>()
  for (const t of Object.values(templates)) {
    for (const e of t.entries) {
      if (e.entry === 'fixed') referenced.add(e.exerciseId)
      else if (e.entry === 'slot') for (const b of [1, 2, 3] as const) {
        const id = slots[b][e.slot]
        if (id) referenced.add(id)
      }
    }
    for (const i of t.minViable?.items ?? []) referenced.add(i.exerciseId)
  }
  for (const c of cardioOptions) referenced.add(c.exerciseId)

  const loaded = (id: string) => {
    const def = getExercise(id)
    return def.kind === 'lift' && equipFor(id).some((t) => t === 'dumbbell' || t === 'barbell' || t === 'machine')
  }

  // The movements that are in the plan every week of the year: the fixed
  // entries, which by definition never rotate, plus the anchor slots,
  // which now hold one movement across all three blocks.
  const coreMovers = [...new Set([
    ...Object.values(templates)
      .filter((t) => t.kind === 'session')
      .flatMap((t) => t.entries)
      .filter((e): e is Extract<TemplateEntry, { entry: 'fixed' }> => e.entry === 'fixed')
      .map((e) => e.exerciseId)
      .filter((id) => ['lift', 'core', 'carry'].includes(getExercise(id).kind)),
    ...ANCHOR_SLOTS.map((s) => slots[1][s]).filter((id): id is string => !!id),
  ])]

  // What the progress charts follow. They were read off block 1 alone,
  // which is exactly the set that used to rotate away in weeks 5 to 12:
  // the app drew a strength line for a movement it had stopped
  // programming, and then let the line flatten. A lift is only chartable
  // if it is still in the plan next month, so the list is now drawn from
  // the movements that never rotate.
  const chartable = new Set(coreMovers)
  const trackedOrder = [
    slots[1].squatVariation,
    resolveForEquipment('romanian-deadlift', owned),
    slots[1].press1,
    slots[1].rowVariation,
    slots[1].hamstring,
    slots[1].lowerAccessory,
  ].filter((id): id is string => !!id && loaded(id) && chartable.has(id))
  const trackedLifts = [...new Set(trackedOrder)].slice(0, 6).map((id) => ({
    exerciseId: id,
    label: getExercise(id).name.replace(/\s*\(.*\)$/, ''),
  }))

  const nutrition = buildNutrition(a.goal, a.bodyweightLb, a.sex, a.goalAnswers ?? {})

  // Rep waves: the same lift slot moves through a different scheme each
  // 4-week block, volume, load, then a goal-flavored finisher.
  const REP_WAVES: Record<Goal, Record<1 | 2 | 3, { repText: string; repsNum: number }>> = {
    muscle: { 1: { repText: '8-12', repsNum: 10 }, 2: { repText: '6-8', repsNum: 7 }, 3: { repText: '10-12', repsNum: 11 } },
    strength: { 1: { repText: '6-8', repsNum: 7 }, 2: { repText: '4-6', repsNum: 5 }, 3: { repText: '3-5', repsNum: 4 } },
    lean: { 1: { repText: '8-12', repsNum: 10 }, 2: { repText: '6-10', repsNum: 8 }, 3: { repText: '12-15', repsNum: 13 } },
    general: { 1: { repText: '8-10', repsNum: 9 }, 2: { repText: '6-8', repsNum: 7 }, 3: { repText: '10-12', repsNum: 11 } },
    vertical: { 1: { repText: '6-8', repsNum: 7 }, 2: { repText: '4-6', repsNum: 5 }, 3: { repText: '6-8', repsNum: 7 } },
    speed: { 1: { repText: '6-8', repsNum: 7 }, 2: { repText: '4-6', repsNum: 5 }, 3: { repText: '6-8', repsNum: 7 } },
    endurance: { 1: { repText: '8-10', repsNum: 9 }, 2: { repText: '6-8', repsNum: 7 }, 3: { repText: '12-15', repsNum: 13 } },
  }
  const slotRepsByBlock = Object.fromEntries(ANCHOR_SLOTS.map((s) => [s, REP_WAVES[a.goal]]))

  const rationale = buildRationale(a.goal, a.goalStatement, [...referenced])
  for (const f of focusPicks) {
    rationale[f.exerciseId] =
      `${getExercise(f.exerciseId).name} is here because you asked for direct ${FOCUS_LABELS[f.area].toLowerCase()} work. The plan guarantees it every week.`
  }

  const mealPlanFull = buildMealPlan(
    a.goal,
    nutrition.proteinTargetG,
    nutrition,
    a.mealsPerDay ?? 4,
    a.dietStyle ?? 'omnivore',
  )

  const plan: PlanConfig = {
    planVersion: 1,
    name: `${GOAL_LABEL[a.goal]} · ${a.daysPerWeek}-Day`,
    goal: a.goal,
    goalStatement: a.goalStatement.trim() || GOAL_LABEL[a.goal],
    customTargets: a.customTargets,
    copyFlavor: family === 'explosive' ? 'explosive' : family === 'muscle' ? 'physique' : 'general',
    daysPerWeek: a.daysPerWeek,
    equipment: [...owned].filter((t) => t !== 'none'),
    templates,
    tier1ByWeekday,
    tierRoleTemplates,
    tierDefaultPlacement,
    slots,
    slotRepOverrides: {},
    slotRepsByBlock,
    cardioOptions,
    trackedLifts,
    coreMovers,
    anchors: { conditioningWeekday, cnsWeekdays },
    lifeRules: { djWeekend: false, longShiftMonday: false },
    lifeEvents: (a.lifeSeeds ?? []).map((s, i) => ({ id: `life-${i + 1}`, label: s.label, kind: s.kind })),
    rationale,
    nutrition: { kcalTraining: nutrition.kcalTraining, kcalRest: nutrition.kcalRest },
    mealPlan: a.skipMeals ? { ...mealPlanFull, templates: [] } : mealPlanFull,
    sportMode: 'generic',
    dietStyle: a.dietStyle ?? 'omnivore',
    experience: a.experience,
    goalAnswers: a.goalAnswers,
  }
  return {
    plan,
    proteinTargetG: nutrition.proteinTargetG,
    strategy: deepGoalStrategy(a.goal, a.goalAnswers ?? {}, nutrition),
  }
}

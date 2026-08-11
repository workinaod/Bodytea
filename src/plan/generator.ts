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
import { canDo, equipFor, resolveForEquipment } from './equip'
import { buildMealPlan, type MealsPerDay } from './foods'

// ============================================================
// The booklet generator: OnboardingAnswers → PlanConfig.
// Pure and deterministic — same answers, same booklet. Every
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
  /** How they actually like to eat — the meal plan is built at this count. */
  mealsPerDay?: MealsPerDay
  /** Their real week (shifts, gigs, kids) — seeded as life events so the
   *  coach's notes speak THEIR schedule from day one. */
  lifeSeeds?: { label: string; kind: LifeEventKind }[]
  /** How they eat — meals, swaps, and grocery lists respect it. */
  dietStyle?: DietStyle
  /** Skip meal-plan generation; the Meals tab offers setup later. */
  skipMeals?: boolean
  /** Up to two body areas that get guaranteed direct weekly work. */
  focusAreas?: FocusArea[]
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

// Ordered candidates per area — the first equipment-legal, not-already-
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
  // Home gym: nothing assumed — the onboarding checklist is the source of
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

/** Cheap deterministic string hash (djb2) — powers per-user plan variety. */
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
    // Per-user variety: the goal's best pick always anchors block 1, but the
    // block 2/3 rotation order is seeded by WHO is asking — two people with
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
    tagline: 'Top-end speed and elastic bounce — the week’s fastest work.',
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
    note: 'Heavy, not reckless — a rep or two always left in the tank.',
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
    note: 'Full stretch at the bottom of every pull — half reps build ego, not backs.',
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
    tagline: 'Squat, hinge, press, pull — the whole machine in one session.',
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
    '{name} builds {quality} — a direct deposit toward "{goal}". Every quality rep here shows up in your bounce.',
    'Your jump is only as good as what {name} trains: {quality}. That is why it earned a spot in your booklet.',
    '{name} is in YOUR plan because "{goal}" runs on {quality} — skip it and the goal gets further away.',
  ],
  speed: [
    '{name} feeds {quality} — the engine behind "{goal}". Fast is built here, not wished for.',
    'Speed leaks wherever {quality} is weak. {name} plugs that leak for "{goal}".',
    '{name} made your booklet because "{goal}" is won on {quality}.',
  ],
  muscle: [
    '{name} drives {quality} — the growth stimulus "{goal}" needs. Log it, add load, repeat.',
    'Muscle is built by progressive work like {name}. {quality} today, visible change at the check-ins.',
    '{name} is in YOUR plan because "{goal}" is earned set by set — this one counts.',
  ],
  strength: [
    '{name} builds {quality} — raw strength that compounds toward "{goal}".',
    'Every heavy, honest set of {name} moves "{goal}" closer. {quality} is the currency.',
    '{name} earned its slot: "{goal}" demands {quality}, and nothing trains it better with your gear.',
  ],
  lean: [
    '{name} keeps muscle on while the deficit does its work — {quality} protects "{goal}".',
    'Cutting without training like {name} burns muscle, not fat. {quality} keeps "{goal}" on track.',
    '{name} is here because "{goal}" looks right only if you keep the engine: {quality}.',
  ],
  general: [
    '{name} trains {quality} — a pillar of being dangerous at anything. "{goal}" gets closer every session.',
    'All-around athletes are built on {quality}. {name} is your rep for it.',
    '{name} is in YOUR plan because "{goal}" needs the complete package — this covers {quality}.',
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

export function buildNutrition(goal: Goal, bodyweightLb: number, sex?: 'male' | 'female') {
  const bw = Math.min(330, Math.max(90, bodyweightLb || 175))
  // Same protein either way (1 g/lb); the calorie baseline runs a notch
  // lower for women (bw×14 vs ×15) — standard TDEE difference.
  const base = Math.round((bw * (sex === 'female' ? 14 : 15)) / 50) * 50
  const adj: Record<Goal, number> = { muscle: 300, strength: 250, vertical: 200, speed: 150, general: 100, lean: -300 }
  const kcalTraining = base + adj[goal]
  return {
    proteinTargetG: Math.min(260, Math.max(120, Math.round(bw))),
    kcalTraining,
    kcalRest: kcalTraining - 300,
  }
}

const GOAL_LABEL: Record<Goal, string> = {
  vertical: 'Vertical Project',
  speed: 'Speed Project',
  muscle: 'Muscle Build',
  strength: 'Strength Base',
  lean: 'Cut Engine',
  general: 'Hybrid Athlete',
}

// ---------- The generator ----------

export function generatePlan(a: OnboardingAnswers): { plan: PlanConfig; proteinTargetG: number } {
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

  // Focus areas: append direct accessory volume to the day that fits —
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

  // Tracked lifts: loaded lifts the plan actually contains, anchors first
  const loaded = (id: string) => {
    const def = getExercise(id)
    return def.kind === 'lift' && equipFor(id).some((t) => t === 'dumbbell' || t === 'barbell' || t === 'machine')
  }
  const trackedOrder = [
    slots[1].squatVariation,
    resolveForEquipment('romanian-deadlift', owned),
    slots[1].press1,
    slots[1].rowVariation,
    slots[1].hamstring,
    slots[1].lowerAccessory,
  ].filter((id): id is string => !!id && loaded(id))
  const trackedLifts = [...new Set(trackedOrder)].slice(0, 6).map((id) => ({
    exerciseId: id,
    label: getExercise(id).name.replace(/\s*\(.*\)$/, ''),
  }))

  const coreMovers = [...new Set(
    Object.values(templates)
      .filter((t) => t.kind === 'session')
      .flatMap((t) => t.entries)
      .filter((e): e is Extract<TemplateEntry, { entry: 'fixed' }> => e.entry === 'fixed')
      .map((e) => e.exerciseId)
      .filter((id) => ['lift', 'core', 'carry'].includes(getExercise(id).kind)),
  )]

  const nutrition = buildNutrition(a.goal, a.bodyweightLb, a.sex)

  // Rep waves: the same lift slot moves through a different scheme each
  // 4-week block — volume, load, then a goal-flavored finisher.
  const REP_WAVES: Record<Goal, Record<1 | 2 | 3, { repText: string; repsNum: number }>> = {
    muscle: { 1: { repText: '8-12', repsNum: 10 }, 2: { repText: '6-8', repsNum: 7 }, 3: { repText: '10-12', repsNum: 11 } },
    strength: { 1: { repText: '6-8', repsNum: 7 }, 2: { repText: '4-6', repsNum: 5 }, 3: { repText: '3-5', repsNum: 4 } },
    lean: { 1: { repText: '8-12', repsNum: 10 }, 2: { repText: '6-10', repsNum: 8 }, 3: { repText: '12-15', repsNum: 13 } },
    general: { 1: { repText: '8-10', repsNum: 9 }, 2: { repText: '6-8', repsNum: 7 }, 3: { repText: '10-12', repsNum: 11 } },
    vertical: { 1: { repText: '6-8', repsNum: 7 }, 2: { repText: '4-6', repsNum: 5 }, 3: { repText: '6-8', repsNum: 7 } },
    speed: { 1: { repText: '6-8', repsNum: 7 }, 2: { repText: '4-6', repsNum: 5 }, 3: { repText: '6-8', repsNum: 7 } },
  }
  const slotRepsByBlock = Object.fromEntries(
    ['squatVariation', 'press1', 'rowVariation', 'hamstring'].map((s) => [s, REP_WAVES[a.goal]]),
  )

  const rationale = buildRationale(a.goal, a.goalStatement, [...referenced])
  for (const f of focusPicks) {
    rationale[f.exerciseId] =
      `${getExercise(f.exerciseId).name} is here because you asked for direct ${FOCUS_LABELS[f.area].toLowerCase()} work — the plan guarantees it every week.`
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
    name: `${GOAL_LABEL[a.goal]} — ${a.daysPerWeek}-Day`,
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
  }
  return { plan, proteinTargetG: nutrition.proteinTargetG }
}

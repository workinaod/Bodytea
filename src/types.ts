// ============================================================
// NAOD V3 — domain types. Single source of truth for the whole app.
// Derived values (streaks, escalation, day-type) are computed, never stored.
// ============================================================

export type ISODate = string // local "YYYY-MM-DD"
/** JS convention: 0=Sunday … 6=Saturday */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6

export type Tier = 1 | 2 | 3

// ---------- Exercise catalog ----------

export type ExerciseKind =
  | 'sprint'
  | 'jump'
  | 'lift'
  | 'core'
  | 'carry'
  | 'mobility'
  | 'cardio'
  | 'warmup'

export interface ExerciseTargets {
  muscles: string[]
  qualities: string[]
}

export interface ExerciseDef {
  id: string
  name: string
  kind: ExerciseKind
  equipment: string
  /** Numbered how-to: setup → movement → breathing/tempo. Plain language. */
  steps: string[]
  targets: ExerciseTargets
  /** Why it's in YOUR plan — tied to the PDF's stated goals. */
  why: string
  mistakes: string[]
  /** Short in-session cue line (seeded from the PDF notes). */
  cue?: string
  /** Verified YouTube video id (optional; UI degrades to search link). */
  videoId?: string
  videoQuery: string
  restSec: number
  perSide?: boolean
}

// ---------- Program templates ----------

/**
 * Rotating accessory slot name. Free-form so generated plans can define
 * their own slot vocabulary; the NAOD preset uses:
 * squatVariation | lowerAccessory | hamstring | press1 | press2 |
 * rowVariation | curl | calf | coreMon | coreWed
 */
export type SlotId = string

export interface PrescriptionBase {
  sets: number
  /** Display form: "6-8", "max", "30 sec", "15-20 / leg" */
  repText: string
  /** Numeric reps when repText is a plain count — used to halve rep-only drills. */
  repsNum?: number
}

export type TemplateEntry =
  | ({ entry: 'fixed'; exerciseId: string } & PrescriptionBase)
  | ({ entry: 'slot'; slot: SlotId } & PrescriptionBase)
  | {
      entry: 'ab'
      a: { exerciseId: string } & PrescriptionBase
      b: { exerciseId: string } & PrescriptionBase
    }

export type DayKind = 'session' | 'mobility' | 'cardio-backup' | 'rest'

/** A cardio backup choice (replaces basketball on no-ball weeks). */
export interface CardioOption {
  exerciseId: string
  repText: string
  group: 'A' | 'B' | 'circuit'
}

export interface MinViableRecipe {
  label: string
  items: ({ exerciseId: string } & PrescriptionBase)[]
}

export interface DayTemplate {
  id: string
  title: string
  /** One-line day intent, from the PDF day intro. */
  tagline: string
  kind: DayKind
  /** CNS day = readiness check gate (Mon power / Sat speed). */
  cns?: boolean
  entries: TemplateEntry[]
  minViable?: MinViableRecipe
  /** The PDF's day note (form reminders / intent). */
  note?: string
  /**
   * Which debrief/recovery pool this day draws from
   * (power | push | lower | mobility | pull | speed | cardio | generic).
   */
  debriefKey?: string
}

// ---------- Plan config (the generated / preset "booklet") ----------

/** Engine-level training emphasis a plan is built around. */
export type Goal = 'vertical' | 'speed' | 'muscle' | 'strength' | 'lean' | 'general'

/** What a bring-your-own routine is chasing — multi-select. */
export type RoutineGoal = 'muscle' | 'lose-weight' | 'maintain' | 'athletic'

/**
 * A recurring real-life event that hits training, custom per person
 * (a DJ set, a night shift, a closing shift on your feet). The kind
 * decides the effect: late-night → train that morning + short-sleep
 * caution; on-feet → the NEXT day drops a jump set (pre-fatigued legs).
 */
export type DietStyle = 'omnivore' | 'vegetarian' | 'vegan'

export type LifeEventKind = 'late-night' | 'on-feet'
export interface LifeEventDef {
  id: string
  label: string
  kind: LifeEventKind
}

/** Which voice the coach copy uses. */
export type CopyFlavor = 'explosive' | 'physique' | 'general'

/** Normalized equipment vocabulary (ExerciseDef.equipment stays display prose). */
export type EquipTag =
  | 'none'
  | 'dumbbell'
  | 'barbell'
  | 'bench'
  | 'incline-bench'
  | 'rack'
  | 'pullup-bar'
  | 'box'
  | 'plate'
  | 'machine'
  | 'open-space'
  | 'hill-stairs'
  | 'court'
  | 'treadmill'
  | 'cones'
  | 'band'
  | 'hurdle'
  | 'med-ball'
  | 'kettlebell'
  | 'trap-bar'
  | 'sled'
  | 'partner'

/** A user-stated measurable target ("vert 24 → 30 in"). */
export interface CustomTarget {
  label: string
  current?: number
  target: number
  unit: string
}

/**
 * Everything that defines a user's booklet. The owner's NAOD V3 preset and
 * every generated plan share this shape; the engine reads ONLY from here —
 * never from the static plan modules directly.
 */
export interface PlanConfig {
  planVersion: 1
  /** Booklet name shown in the shell ("NAOD V3", "Vertical — 4-Day"). */
  name: string
  goal: Goal
  /** The user's goal in their own words — threads through copy + rationale. */
  goalStatement: string
  /**
   * Bring-your-own-routine: what the routine is chasing (multi-select).
   * Absent on generated plans and the owner's preset.
   */
  routineGoals?: RoutineGoal[]
  /** BYOR: their own answer to "why has this routine been working for you?" */
  whyWorks?: string
  customTargets: CustomTarget[]
  copyFlavor: CopyFlavor
  daysPerWeek: number
  equipment: EquipTag[]
  templates: Record<string, DayTemplate>
  tier1ByWeekday: Record<Weekday, string | null>
  tierRoleTemplates: Record<2 | 3, Partial<Record<TierDayRole, string>>>
  tierDefaultPlacement: Record<2 | 3, Partial<Record<TierDayRole, Weekday>>>
  /** block → slotId → exerciseId */
  slots: Record<1 | 2 | 3, Record<SlotId, string>>
  slotRepOverrides: Record<string, { repText: string; repsNum?: number }>
  cardioOptions: CardioOption[]
  trackedLifts: { exerciseId: string; label: string }[]
  coreMovers: string[]
  /** Weekday semantics the engine needs (the old hardcoded literals). */
  anchors: { conditioningWeekday: Weekday; cnsWeekdays: Weekday[] }
  /** Owner-specific life accommodations; generated plans turn these off. */
  lifeRules: { djWeekend: boolean; longShiftMonday: boolean }
  /** Custom recurring life events (each week you just tap the days they hit). */
  lifeEvents: LifeEventDef[]
  /** exerciseId → goal-specific "why it's in YOUR plan" (falls back to def.why). */
  rationale: Record<string, string>
  nutrition: { kcalTraining: number; kcalRest: number }
  /** The eating side of the booklet — per-user, editable (v10+). */
  mealPlan: MealPlanConfig
  /**
   * 'ball' keeps the owner's basketball-first voice; absent/'generic'
   * speaks in sport-neutral conditioning terms. Every generated and
   * BYOR plan is generic — most people don't hoop.
   */
  sportMode?: 'ball' | 'generic'
  /** How this user eats — filters generated meals + swap suggestions. */
  dietStyle?: DietStyle
}

export interface Profile {
  displayName?: string
  /** Cached leaderboard username (set when an account exists). */
  username?: string
  /** For the tape-measure body-fat estimate (US Navy method). */
  heightIn?: number
  /** Which Navy formula fits their body — asked once in the estimator. */
  bfFormula?: 'male' | 'female'
}

// ---------- Resolved day (engine output) ----------

export interface ResolvedExercise extends PrescriptionBase {
  exerciseId: string
  name: string
  kind: ExerciseKind
  restSec: number
  perSide?: boolean
  fromSlot?: SlotId
  /** Readiness/gig downgrade: keep it light, leave 3 in the tank. */
  lightMode?: boolean
  /** Set when a per-date swap replaced this exercise (original id). */
  swappedFrom?: string
}

export interface DayBanner {
  id: string
  text: string
  tone: 'info' | 'warn' | 'success'
}

export interface ResolvedDay {
  date: ISODate
  weekday: Weekday
  /** 1-based week number since phase start. */
  weekIndex: number
  weekInBlock: 1 | 2 | 3 | 4
  blockIndex: 1 | 2 | 3
  abWeek: 'A' | 'B'
  isDeload: boolean
  tier: Tier
  templateId: string | null
  title: string
  tagline: string
  kind: DayKind
  cns: boolean
  banners: DayBanner[]
  exercises: ResolvedExercise[]
  note?: string
  /** True from week 17 on (Phase 1 done, program loops). */
  phaseComplete: boolean
}

// ---------- Logged state ----------

export interface SetLog {
  targetReps: string
  weightLb?: number
  reps?: number
  seconds?: number
  done: boolean
}

export interface ExerciseLog {
  exerciseId: string
  fromSlot?: SlotId
  sets: SetLog[]
  skipped?: boolean
}

export type SessionStatus =
  | 'completed'
  | 'partial'
  | 'skipped'
  | 'downgraded-completed'

export interface ReadinessCheck {
  /** [slept<6h, elevated RHR / run-down, legs sore, genuinely low energy] */
  flags: [boolean, boolean, boolean, boolean]
  downgraded: boolean
}

export interface SessionLog {
  date: ISODate
  templateId: string
  status: SessionStatus
  startedAt?: string
  endedAt?: string
  readiness?: ReadinessCheck
  /** "Running long" cut point — exercises at index >= this were dropped (bottom-first rule). */
  trimmedFromIndex?: number
  exercises: ExerciseLog[]
  notes?: string
}

// ---------- Accountability ----------

export type ExcuseReason =
  | 'busy'
  | 'tired'
  | 'sick'
  | 'gig'
  | 'travel'
  | 'other'
  | 'none'

export type ExcuseAction = 'skip' | 'lighten' | 'tier-drop' | 'unexplained-miss'

export interface ExcuseRecord {
  id: string
  /** When the excuse was made. */
  at: string
  /** The day (or week Monday, for scope 'week') it applies to. */
  date: ISODate
  scope: 'day' | 'week'
  action: ExcuseAction
  reason: ExcuseReason
  claimText?: string
  proofPhotoId?: string
  /** True iff proof attached or plan-sanctioned (gig / readiness / deload). */
  accepted: boolean
  minimumViableTaken: boolean
  escalationLevelAtTime: 0 | 1 | 2 | 3
}

// ---------- Weeks ----------

export type TierDayRole = 'explosive' | 'lower' | 'upper' | 'fullbody'

export interface WeekState {
  mondayISO: ISODate
  tier: Tier
  /** Null until the user confirms the tier for the week (coach flags unpicked weeks). */
  tierPickedAt: string | null
  tierChanges: { at: string; from: Tier; to: Tier; excuseId?: string }[]
  /** Tier 2/3 day placement (weekday per role). Explosive can move, never be removed. */
  tierPlacement?: Partial<Record<TierDayRole, Weekday>>
  /** Weekly forecast: playing ball this week? null = unanswered. */
  ballThisWeek: boolean | null
  /** Days ball was actually played — logged same-day from the Today tab. */
  ballDates: ISODate[]
  /** CNS days whose speed work was swapped out (plan-sanctioned after a hard run). */
  cnsSwapDates: ISODate[]
  /** Scheduled cardio backup (replaces ball on no-ball weeks) — any number of days. */
  cardio?: { exerciseId: string; weekdays: Weekday[] } | null
  /** Life-event id → weekdays it hits THIS week (defs live in plan.lifeEvents). */
  events: Partial<Record<string, Weekday[]>>
  /** Owner special: Friday's pull moved to Saturday as a lighter combined day. */
  friPushedToSat?: boolean
  badSleepDates: ISODate[]
}

// ---------- GPS-tracked runs & rides ----------

/** [lat, lng, elapsedSec] — compact enough to live in the envelope. */
export type RunPoint = [number, number, number]

export interface RunLog {
  id: string
  activity: 'run' | 'bike'
  date: ISODate
  startedAt: string
  durationSec: number
  distanceMi: number
  /** Average pace in seconds per mile (running) / speed derives for rides. */
  avgPaceSec: number
  /** Per-mile split times in seconds. */
  splits: number[]
  points: RunPoint[]
}

// ---------- Daily cardio / sport log ----------

export type CardioWhen = 'pre' | 'post' | 'solo'

export interface CardioEntry {
  id: string
  at: string
  /** Catalog id from plan/cardio.ts ('custom' carries its own label). */
  activityId: string
  label: string
  when: CardioWhen
  where?: 'indoor' | 'outdoor'
  miles?: number
  minutes?: number
  /** Activity-specific mode, e.g. basketball 'games' vs 'shooting'. */
  mode?: string
}

// ---------- Meals ----------

export type MealEntrySource = 'chip' | 'mealTemplate' | 'custom' | 'recent'

export interface MealEntry {
  id: string
  at: string
  label: string
  proteinG: number
  kcal: number
  source: MealEntrySource
  foodId?: string
  servings: number
}

/** Free string since v10 — users build their own supplement stacks. */
export type SupplementId = string

export interface MealDay {
  date: ISODate
  entries: MealEntry[]
  supplements: Record<SupplementId, boolean>
  dayTypeOverride?: 'training' | 'rest'
}

// ---------- Per-user meal plan (lives in PlanConfig.mealPlan) ----------

export interface MealTemplateDef {
  id: string
  dayType: 'training' | 'rest'
  slot: string
  name: string
  detail: string
  proteinG: number
  kcal: number
}

export interface SupplementDef {
  id: SupplementId
  name: string
  dose: string
  when: string
}

export interface GroceryCategory {
  category: string
  items: string[]
}

/**
 * The eating side of a booklet: one-tap meal templates, the weekly
 * grocery list, the supplement stack, and late-night rules — all
 * per-user data, editable like the training side.
 */
export interface MealPlanConfig {
  templates: MealTemplateDef[]
  grocery: GroceryCategory[]
  supplements: SupplementDef[]
  lateNight: { yes: string[]; no: string[] }
}

// ---------- Measurements & photos ----------

export interface Measurement {
  date: ISODate
  weightLb?: number
  /** Estimated body fat % — consistency of method beats accuracy. */
  bodyFatPct?: number
  /** Tape sites for the Navy estimate (stored so trends stay honest). */
  neckIn?: number
  hipIn?: number
  waistIn?: number
  chestIn?: number
  armsIn?: number
  thighIn?: number
  /** Vertical reach / rim touch in inches (their choice of metric, tracked consistently). */
  vertIn?: number
  photoIds: Partial<Record<'front' | 'side' | 'back', string>>
}

export interface PhotoMeta {
  id: string
  kind: 'progress' | 'proof'
  takenAt: string
  w: number
  h: number
  bytes: number
}

// ---------- Coach ----------

export type CoachSituation =
  | 'skip-no-proof'
  | 'skip-with-proof'
  | 'lighten'
  | 'tier-drop-planned'
  | 'tier-drop-midweek'
  | 'unexplained-miss'
  | 'minimum-taken'
  | 'comeback'
  | 'streak'
  | 'pr'
  | 'deload-start'
  | 'week-complete'
  | 'protein-miss'
  | 'protein-streak'
  | 'chronic-fallback'
  | 'backup-nudge'
  | 'push'
  | 'session-done'
  | 'contradiction'
  | 'explosive-day-warning'

export interface DebriefData {
  date: ISODate
  title: string
  recap: string[]
  recovery: string[]
  eat: string[]
  sleep: string[]
  tomorrow: string
}

export interface CoachFeedItem {
  id: string
  at: string
  kind: 'coach' | 'debrief' | 'insight'
  situation?: CoachSituation
  text: string
  excuseId?: string
  /** Week this item is about (Monday ISO) — lets reverts prune the record. */
  weekISO?: ISODate
  debrief?: DebriefData
}

export interface CoachLogState {
  feed: CoachFeedItem[]
  /** Ring buffer of shown content-pool ids (anti-repeat across ALL pools). */
  shownMessageIds: string[]
  /** ruleId → last surfaced date (insight cooldowns). */
  surfacedInsights: Record<string, ISODate>
}

// ---------- Insights ----------

export type InsightArea =
  | 'recomp'
  | 'athletic'
  | 'physique'
  | 'consistency'
  | 'recovery'
  | 'nutrition'

export interface Insight {
  ruleId: string
  area: InsightArea
  priority: number
  text: string
  /** Days before this rule may fire again. */
  cooldownDays: number
}

// ---------- Settings / root ----------

export interface Settings {
  /** Always a Monday (snapped at onboarding). */
  phaseStartDate: ISODate
  /** The day the app was set up — reconcile never interrogates days before it. */
  installedAt: ISODate
  /** Weekly measurement morning. PDF: "Sunday is good". */
  checkinWeekday: Weekday
  /** The 3–4 week check-in rule adjustment (+kcal on training days). */
  trainingDayKcalBonus: 0 | 150 | 200
  /** Never drops with tier. */
  proteinTargetG: number
  restTimerEnabled: boolean
  lastExportAt: string | null
  onboarded: boolean
  /** Train-today reminder notifications. */
  remindersEnabled: boolean
  /** Local times "HH:MM" (up to 3) when reminders may fire on unfinished training days. */
  reminderTimes: string[]
  /** Display units (storage stays imperial internally). */
  units: 'imperial' | 'metric'
  /** Milestone reviews already opened ('3mo' | '6mo' | '1yr'). */
  reviewsSeen?: string[]
}

export interface AppData {
  settings: Settings
  /** The booklet this user trains from (NAOD preset or generated). */
  plan: PlanConfig
  profile: Profile
  /** Keyed by that week's Monday ISO date. */
  weeks: Record<ISODate, WeekState>
  /** Keyed by local ISO date. */
  sessions: Record<ISODate, SessionLog>
  excuses: ExcuseRecord[]
  /** Keyed by local ISO date. */
  meals: Record<ISODate, MealDay>
  /** Sorted by date ascending. */
  measurements: Measurement[]
  photos: PhotoMeta[]
  coach: CoachLogState
  /** Checked-off grocery item ids (absorbed the old naod.grocery key). */
  grocery: string[]
  /** Daily cardio / sport log, keyed by local ISO date. */
  cardio: Record<ISODate, CardioEntry[]>
  /**
   * Per-date exercise swaps (🔄 on a Today row): original exercise id →
   * replacement id. Applied during day resolution; sets/reps keep the
   * slot's prescription so the day's intent survives the swap.
   */
  swaps: Record<ISODate, Record<string, string>>
  /**
   * Same-day load cuts ("work ran long"): 'trimmed' applies the
   * readiness-style downgrade to that date only — explosive volume
   * −1/3, lifts light. Cleared automatically by moving on; the full
   * plan returns tomorrow.
   */
  dayLoad: Record<ISODate, 'trimmed'>
  /** GPS-tracked runs & rides, newest last. */
  runs: RunLog[]
}

export const SCHEMA_VERSION = 14

export interface Envelope {
  schemaVersion: number
  appVersion: string
  exportedAt: string
  data: AppData
  /** Present only in "full" exports: photoId → base64 JPEG. */
  photoBlobs?: Record<string, string>
}

// ---------- Defaults ----------

export const DEFAULT_SUPPLEMENTS: Record<SupplementId, boolean> = {
  creatine: false,
  fishOil: false,
  vitD3: false,
  electrolytes: false,
}

export function defaultSettings(phaseStartDate: ISODate, installedAt: ISODate = phaseStartDate): Settings {
  return {
    phaseStartDate,
    installedAt,
    checkinWeekday: 0,
    trainingDayKcalBonus: 0,
    proteinTargetG: 200,
    restTimerEnabled: true,
    lastExportAt: null,
    onboarded: false,
    remindersEnabled: false,
    reminderTimes: ['05:00', '17:00'], // max two nudges a day
    units: 'imperial',
  }
}

export function defaultWeekState(mondayISO: ISODate): WeekState {
  return {
    mondayISO,
    tier: 1,
    tierPickedAt: null,
    tierChanges: [],
    ballThisWeek: null,
    ballDates: [],
    cnsSwapDates: [],
    cardio: null,
    events: {},
    badSleepDates: [],
  }
}

export function emptyAppData(phaseStartDate: ISODate, installedAt?: ISODate, plan?: PlanConfig): AppData {
  return {
    settings: defaultSettings(phaseStartDate, installedAt),
    plan: plan ?? buildNaodPreset(),
    profile: {},
    weeks: {},
    sessions: {},
    excuses: [],
    meals: {},
    measurements: [],
    photos: [],
    coach: { feed: [], shownMessageIds: [], surfacedInsights: {} },
    grocery: [],
    cardio: {},
    swaps: {},
    dayLoad: {},
    runs: [],
  }
}

// Nutrition constants (PDF "THE NUMBERS") — NAOD preset values; the live
// targets an account trains against come from data.plan.nutrition.
export const KCAL_TRAINING = 2800
export const KCAL_REST = 2500
export const CARBS_TRAINING = 300
export const CARBS_REST = 225
export const FAT_RANGE = '70–80 g'

// The preset import makes emptyAppData self-sufficient. There is no runtime
// cycle: every plan/ module imports THIS module type-only (erased), so the
// runtime edge types → presets → templates/exercises is one-directional.
import { buildNaodPreset } from './plan/presets/naod'

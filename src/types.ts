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

/** Rotating accessory slots (4-week block rotation table). */
export type SlotId =
  | 'squatVariation'
  | 'lowerAccessory'
  | 'hamstring'
  | 'press1'
  | 'press2'
  | 'rowVariation'
  | 'curl'
  | 'calf'
  | 'coreMon'
  | 'coreWed'

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
  /** Scheduled cardio backup (replaces ball on no-ball weeks). */
  cardio?: { exerciseId: string; weekday: Weekday } | null
  gigFlags: {
    djFriNight?: boolean
    djSatNight?: boolean
    longShiftBeforeMon?: boolean
    /** Fri pull moved to Sat morning as a lighter combined day. */
    friPushedToSat?: boolean
  }
  badSleepDates: ISODate[]
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

export type SupplementId = 'creatine' | 'fishOil' | 'vitD3' | 'electrolytes'

export interface MealDay {
  date: ISODate
  entries: MealEntry[]
  supplements: Record<SupplementId, boolean>
  dayTypeOverride?: 'training' | 'rest'
}

// ---------- Measurements & photos ----------

export interface Measurement {
  date: ISODate
  weightLb?: number
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
}

export interface AppData {
  settings: Settings
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
}

export const SCHEMA_VERSION = 3

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
    reminderTimes: ['11:30', '17:30', '20:30'],
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
    gigFlags: {},
    badSleepDates: [],
  }
}

export function emptyAppData(phaseStartDate: ISODate, installedAt?: ISODate): AppData {
  return {
    settings: defaultSettings(phaseStartDate, installedAt),
    weeks: {},
    sessions: {},
    excuses: [],
    meals: {},
    measurements: [],
    photos: [],
    coach: { feed: [], shownMessageIds: [], surfacedInsights: {} },
  }
}

// Nutrition constants (PDF "THE NUMBERS")
export const KCAL_TRAINING = 2800
export const KCAL_REST = 2500
export const CARBS_TRAINING = 300
export const CARBS_REST = 225
export const FAT_RANGE = '70–80 g'

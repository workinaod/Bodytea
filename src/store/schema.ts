import { z } from 'zod'
import { SCHEMA_VERSION, type Envelope } from '../types'
import { buildNaodPreset } from '../plan/presets/naod'

// ============================================================
// Import/load validation + migrations. Anything read from disk
// or an import file passes through migrate() then zod.
// ============================================================

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const weekday = z.number().int().min(0).max(6)

const settingsSchema = z.object({
  phaseStartDate: isoDate,
  installedAt: isoDate,
  checkinWeekday: weekday,
  trainingDayKcalBonus: z.union([z.literal(0), z.literal(150), z.literal(200)]),
  proteinTargetG: z.number().positive(),
  restTimerEnabled: z.boolean(),
  lastExportAt: z.string().nullable(),
  onboarded: z.boolean(),
  remindersEnabled: z.boolean(),
  reminderTimes: z.array(z.string().regex(/^\d{2}:\d{2}$/)).max(3),
  units: z.enum(['imperial', 'metric']),
})

// ---------- Plan config (the booklet) ----------

const prescription = {
  sets: z.number().int().positive(),
  repText: z.string(),
  repsNum: z.number().optional(),
}

const templateEntrySchema = z.union([
  z.object({ entry: z.literal('fixed'), exerciseId: z.string(), ...prescription }),
  z.object({ entry: z.literal('slot'), slot: z.string(), ...prescription }),
  z.object({
    entry: z.literal('ab'),
    a: z.object({ exerciseId: z.string(), ...prescription }),
    b: z.object({ exerciseId: z.string(), ...prescription }),
  }),
])

const dayTemplateSchema = z.object({
  id: z.string(),
  title: z.string(),
  tagline: z.string(),
  kind: z.enum(['session', 'mobility', 'cardio-backup', 'rest']),
  cns: z.boolean().optional(),
  entries: z.array(templateEntrySchema),
  minViable: z
    .object({ label: z.string(), items: z.array(z.object({ exerciseId: z.string(), ...prescription })) })
    .optional(),
  note: z.string().optional(),
  debriefKey: z.string().optional(),
})

const planConfigSchema = z.object({
  planVersion: z.literal(1),
  name: z.string().min(1),
  goal: z.enum(['vertical', 'speed', 'muscle', 'strength', 'lean', 'general']),
  goalStatement: z.string(),
  customTargets: z.array(
    z.object({ label: z.string(), current: z.number().optional(), target: z.number(), unit: z.string() }),
  ),
  copyFlavor: z.enum(['explosive', 'physique', 'general']),
  daysPerWeek: z.number().int().min(1).max(7),
  equipment: z.array(z.string()),
  templates: z.record(z.string(), dayTemplateSchema),
  tier1ByWeekday: z.record(z.string(), z.string().nullable()),
  tierRoleTemplates: z.record(z.string(), z.record(z.string(), z.string())),
  tierDefaultPlacement: z.record(z.string(), z.record(z.string(), weekday)),
  slots: z.record(z.string(), z.record(z.string(), z.string())),
  slotRepOverrides: z.record(z.string(), z.object({ repText: z.string(), repsNum: z.number().optional() })),
  cardioOptions: z.array(
    z.object({ exerciseId: z.string(), repText: z.string(), group: z.enum(['A', 'B', 'circuit']) }),
  ),
  trackedLifts: z.array(z.object({ exerciseId: z.string(), label: z.string() })),
  coreMovers: z.array(z.string()),
  anchors: z.object({ conditioningWeekday: weekday, cnsWeekdays: z.array(weekday) }),
  lifeRules: z.object({ djWeekend: z.boolean(), longShiftMonday: z.boolean() }),
  rationale: z.record(z.string(), z.string()),
  nutrition: z.object({ kcalTraining: z.number().positive(), kcalRest: z.number().positive() }),
})

const setLogSchema = z.object({
  targetReps: z.string(),
  weightLb: z.number().optional(),
  reps: z.number().optional(),
  seconds: z.number().optional(),
  done: z.boolean(),
})

const sessionSchema = z.object({
  date: isoDate,
  templateId: z.string(),
  status: z.enum(['completed', 'partial', 'skipped', 'downgraded-completed']),
  startedAt: z.string().optional(),
  endedAt: z.string().optional(),
  readiness: z
    .object({
      flags: z.tuple([z.boolean(), z.boolean(), z.boolean(), z.boolean()]),
      downgraded: z.boolean(),
    })
    .optional(),
  trimmedFromIndex: z.number().optional(),
  exercises: z.array(
    z.object({
      exerciseId: z.string(),
      fromSlot: z.string().optional(),
      sets: z.array(setLogSchema),
      skipped: z.boolean().optional(),
    }),
  ),
  notes: z.string().optional(),
})

const weekSchema = z.object({
  mondayISO: isoDate,
  tier: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  tierPickedAt: z.string().nullable(),
  tierChanges: z.array(
    z.object({
      at: z.string(),
      from: z.union([z.literal(1), z.literal(2), z.literal(3)]),
      to: z.union([z.literal(1), z.literal(2), z.literal(3)]),
      excuseId: z.string().optional(),
    }),
  ),
  tierPlacement: z.record(z.string(), weekday).optional(),
  ballThisWeek: z.boolean().nullable(),
  ballDates: z.array(isoDate),
  cnsSwapDates: z.array(isoDate),
  cardio: z.object({ exerciseId: z.string(), weekday }).nullable().optional(),
  gigFlags: z.object({
    djFriNight: z.boolean().optional(),
    djSatNight: z.boolean().optional(),
    longShiftBeforeMon: z.boolean().optional(),
    friPushedToSat: z.boolean().optional(),
  }),
  badSleepDates: z.array(isoDate),
})

const excuseSchema = z.object({
  id: z.string(),
  at: z.string(),
  date: isoDate,
  scope: z.enum(['day', 'week']),
  action: z.enum(['skip', 'lighten', 'tier-drop', 'unexplained-miss']),
  reason: z.enum(['busy', 'tired', 'sick', 'gig', 'travel', 'other', 'none']),
  claimText: z.string().optional(),
  proofPhotoId: z.string().optional(),
  accepted: z.boolean(),
  minimumViableTaken: z.boolean(),
  escalationLevelAtTime: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
})

const mealDaySchema = z.object({
  date: isoDate,
  entries: z.array(
    z.object({
      id: z.string(),
      at: z.string(),
      label: z.string(),
      proteinG: z.number(),
      kcal: z.number(),
      source: z.enum(['chip', 'mealTemplate', 'custom', 'recent']),
      foodId: z.string().optional(),
      servings: z.number().positive(),
    }),
  ),
  supplements: z.object({
    creatine: z.boolean(),
    fishOil: z.boolean(),
    vitD3: z.boolean(),
    electrolytes: z.boolean(),
  }),
  dayTypeOverride: z.enum(['training', 'rest']).optional(),
})

const measurementSchema = z.object({
  date: isoDate,
  weightLb: z.number().optional(),
  waistIn: z.number().optional(),
  chestIn: z.number().optional(),
  armsIn: z.number().optional(),
  thighIn: z.number().optional(),
  vertIn: z.number().optional(),
  photoIds: z.object({
    front: z.string().optional(),
    side: z.string().optional(),
    back: z.string().optional(),
  }),
})

const photoMetaSchema = z.object({
  id: z.string(),
  kind: z.enum(['progress', 'proof']),
  takenAt: z.string(),
  w: z.number(),
  h: z.number(),
  bytes: z.number(),
})

const coachSchema = z.object({
  feed: z.array(
    z.object({
      id: z.string(),
      at: z.string(),
      kind: z.enum(['coach', 'debrief', 'insight']),
      situation: z.string().optional(),
      text: z.string(),
      excuseId: z.string().optional(),
      weekISO: isoDate.optional(),
      debrief: z
        .object({
          date: isoDate,
          title: z.string(),
          recap: z.array(z.string()),
          recovery: z.array(z.string()),
          eat: z.array(z.string()),
          sleep: z.array(z.string()),
          tomorrow: z.string(),
        })
        .optional(),
    }),
  ),
  shownMessageIds: z.array(z.string()),
  surfacedInsights: z.record(z.string(), isoDate),
})

const appDataSchema = z.object({
  settings: settingsSchema,
  plan: planConfigSchema,
  profile: z.object({ displayName: z.string().optional(), username: z.string().optional() }),
  weeks: z.record(z.string(), weekSchema),
  sessions: z.record(z.string(), sessionSchema),
  excuses: z.array(excuseSchema),
  meals: z.record(z.string(), mealDaySchema),
  measurements: z.array(measurementSchema),
  photos: z.array(photoMetaSchema),
  coach: coachSchema,
  grocery: z.array(z.string()),
})

export const envelopeSchema = z.object({
  schemaVersion: z.number().int().positive(),
  appVersion: z.string(),
  exportedAt: z.string(),
  data: appDataSchema,
  photoBlobs: z.record(z.string(), z.string()).optional(),
})

// ---------- Migrations ----------

/** migrations[n] upgrades an envelope from schema n to n+1. */
const migrations: Record<number, (env: Record<string, unknown>) => Record<string, unknown>> = {
  // v1 → v2: reminder settings added
  1: (env) => {
    const e = env as { data?: { settings?: Record<string, unknown> } }
    if (e.data?.settings) {
      e.data.settings.remindersEnabled ??= false
      e.data.settings.reminderTimes ??= ['11:30', '17:30', '20:30']
    }
    return env
  },
  // v2 → v3: same-day ball logging + CNS swap-outs per week
  2: (env) => {
    const e = env as { data?: { weeks?: Record<string, Record<string, unknown>> } }
    for (const w of Object.values(e.data?.weeks ?? {})) {
      w.ballDates ??= []
      w.cnsSwapDates ??= []
    }
    return env
  },
  // v3 → v4: plan-as-data — the owner's booklet becomes stored PlanConfig
  // (NAOD preset, byte-equivalent to the old static plan), plus profile,
  // grocery adoption, and display units.
  3: (env) => {
    const e = env as { data?: Record<string, unknown> }
    if (e.data) {
      e.data.plan ??= buildNaodPreset()
      e.data.profile ??= {}
      e.data.grocery ??= []
      const s = e.data.settings as Record<string, unknown> | undefined
      if (s) s.units ??= 'imperial'
    }
    return env
  },
}

export function migrate(env: unknown): Envelope {
  if (typeof env !== 'object' || env === null) {
    throw new Error('Not a NAOD backup file')
  }
  let e = env as Record<string, unknown>
  let v = typeof e.schemaVersion === 'number' ? e.schemaVersion : 0
  if (v === 0) throw new Error('Missing schema version — not a NAOD backup file')
  if (v > SCHEMA_VERSION) {
    throw new Error(`This backup is from a newer app version (schema ${v}). Update the app first.`)
  }
  while (v < SCHEMA_VERSION) {
    const step = migrations[v]
    if (!step) throw new Error(`No migration path from schema ${v}`)
    e = step(e)
    v++
    e.schemaVersion = v
  }
  const parsed = envelopeSchema.safeParse(e)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    throw new Error(`Backup failed validation at ${issue.path.join('.')}: ${issue.message}`)
  }
  return parsed.data as Envelope
}

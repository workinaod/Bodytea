import { z } from 'zod'
import { SCHEMA_VERSION, type Envelope, type Goal } from '../types'
import { buildNaodPreset } from '../plan/presets/naod'
import { buildMealPlan, buildNaodMealPlan } from '../plan/foods'
import { addDaysISO } from '../engine/calendar'

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

export const planConfigSchema = z.object({
  planVersion: z.literal(1),
  name: z.string().min(1),
  goal: z.enum(['vertical', 'speed', 'muscle', 'strength', 'lean', 'general']),
  goalStatement: z.string(),
  routineGoals: z.array(z.enum(['muscle', 'lose-weight', 'maintain', 'athletic'])).optional(),
  whyWorks: z.string().optional(),
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
  lifeEvents: z.array(
    z.object({ id: z.string(), label: z.string().min(1), kind: z.enum(['late-night', 'on-feet']) }),
  ),
  rationale: z.record(z.string(), z.string()),
  nutrition: z.object({ kcalTraining: z.number().positive(), kcalRest: z.number().positive() }),
  mealPlan: z.object({
    templates: z.array(
      z.object({
        id: z.string(),
        dayType: z.enum(['training', 'rest']),
        slot: z.string(),
        name: z.string().min(1),
        detail: z.string(),
        proteinG: z.number().min(0),
        kcal: z.number().min(0),
      }),
    ),
    grocery: z.array(z.object({ category: z.string(), items: z.array(z.string()) })),
    supplements: z.array(
      z.object({ id: z.string(), name: z.string().min(1), dose: z.string(), when: z.string() }),
    ),
    lateNight: z.object({ yes: z.array(z.string()), no: z.array(z.string()) }),
  }),
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
  events: z.record(z.string(), z.array(weekday)),
  friPushedToSat: z.boolean().optional(),
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
  supplements: z.record(z.string(), z.boolean()),
  dayTypeOverride: z.enum(['training', 'rest']).optional(),
})

const measurementSchema = z.object({
  date: isoDate,
  weightLb: z.number().optional(),
  bodyFatPct: z.number().optional(),
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
  cardio: z.record(
    z.string(),
    z.array(
      z.object({
        id: z.string(),
        at: z.string(),
        activityId: z.string(),
        label: z.string(),
        when: z.enum(['pre', 'post', 'solo']),
        where: z.enum(['indoor', 'outdoor']).optional(),
        miles: z.number().optional(),
        minutes: z.number().optional(),
        mode: z.string().optional(),
      }),
    ),
  ),
  swaps: z.record(z.string(), z.record(z.string(), z.string())),
  dayLoad: z.record(z.string(), z.literal('trimmed')),
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
  // v4 → v5: custom life events (day-pickable, per person) replace the
  // hardcoded gig toggles; daily cardio/sport log added.
  4: (env) => {
    const e = env as {
      data?: {
        plan?: Record<string, unknown>
        weeks?: Record<string, Record<string, unknown>>
        cardio?: unknown
      }
    }
    if (!e.data) return env
    e.data.cardio ??= {}
    const plan = e.data.plan
    if (plan && plan.lifeEvents === undefined) {
      const rules = (plan.lifeRules ?? {}) as { djWeekend?: boolean; longShiftMonday?: boolean }
      const events: { id: string; label: string; kind: string }[] = []
      if (rules.djWeekend) events.push({ id: 'dj', label: 'DJ set / late night', kind: 'late-night' })
      if (rules.longShiftMonday) events.push({ id: 'shift', label: 'Long shift on your feet', kind: 'on-feet' })
      plan.lifeEvents = events
    }
    const weeks = e.data.weeks ?? {}
    const shiftSundays: string[] = [] // weeks whose flag means "Sunday BEFORE my Monday"
    for (const w of Object.values(weeks)) {
      const gf = (w.gigFlags ?? {}) as {
        djFriNight?: boolean
        djSatNight?: boolean
        longShiftBeforeMon?: boolean
        friPushedToSat?: boolean
      }
      const events: Record<string, number[]> = {}
      const djDays = [...(gf.djFriNight ? [5] : []), ...(gf.djSatNight ? [6] : [])]
      if (djDays.length) events.dj = djDays
      w.events = { ...(w.events as Record<string, number[]> | undefined), ...events }
      if (gf.friPushedToSat) w.friPushedToSat = true
      if (gf.longShiftBeforeMon) shiftSundays.push(String(w.mondayISO))
      delete w.gigFlags
    }
    // "Long shift before Monday" = the Sunday that ENDS the previous week.
    for (const mondayISO of shiftSundays) {
      const prevMonday = addDaysISO(mondayISO, -7)
      const prev = (weeks[prevMonday] ??= {
        mondayISO: prevMonday,
        tier: 1,
        tierPickedAt: null,
        tierChanges: [],
        ballThisWeek: null,
        ballDates: [],
        cnsSwapDates: [],
        cardio: null,
        events: {},
        badSleepDates: [],
      })
      const ev = ((prev.events as Record<string, number[]>) ??= {})
      ev.shift = [...new Set([...(ev.shift ?? []), 0])]
    }
    return env
  },
  // v5 → v6: reminders capped at two a day (keep the first + last times)
  5: (env) => {
    const e = env as { data?: { settings?: { reminderTimes?: string[] } } }
    const t = e.data?.settings?.reminderTimes
    if (t && t.length > 2 && e.data?.settings) {
      e.data.settings.reminderTimes = [t[0], t[t.length - 1]]
    }
    return env
  },
  // v6 → v7: the owner's plan upgrades NAOD V3 → NAOD V4 (research-backed
  // athletic Monday + Saturday). Only the canonical preset is replaced —
  // generated and BYOR plans pass through untouched.
  6: (env) => {
    const e = env as { data?: { plan?: { name?: string } } }
    if (e.data?.plan?.name === 'NAOD V3') {
      e.data.plan = buildNaodPreset() as unknown as { name?: string }
    }
    return env
  },
  // v7 → v8: per-date exercise swaps (🔄 on a Today row)
  7: (env) => {
    const e = env as { data?: Record<string, unknown> }
    if (e.data) e.data.swaps ??= {}
    return env
  },
  // v8 → v9: same-day load cuts ("work ran long — trim today")
  8: (env) => {
    const e = env as { data?: Record<string, unknown> }
    if (e.data) e.data.dayLoad ??= {}
    return env
  },
  // v9 → v10: the meal plan becomes per-user booklet data. The owner's
  // preset keeps his PDF meals verbatim; every other plan gets templates
  // scaled to its own goal and calorie budget.
  9: (env) => {
    const e = env as {
      data?: {
        plan?: {
          name?: string
          goal?: string
          nutrition?: { kcalTraining: number; kcalRest: number }
          mealPlan?: unknown
        }
        settings?: { proteinTargetG?: number }
      }
    }
    const plan = e.data?.plan
    if (plan && !plan.mealPlan) {
      plan.mealPlan = plan.name?.startsWith('NAOD')
        ? buildNaodMealPlan()
        : buildMealPlan(
            (plan.goal ?? 'general') as Goal,
            e.data?.settings?.proteinTargetG ?? 180,
            plan.nutrition ?? { kcalTraining: 2600, kcalRest: 2300 },
          )
    }
    return env
  },
  // v10 → v11: the owner set a body-composition goal — sub-10% body fat.
  // His plan's goal statement and targets pick it up; body fat becomes a
  // check-in metric for everyone (optional field, no data change needed).
  10: (env) => {
    const e = env as {
      data?: {
        plan?: { name?: string; goalStatement?: string; customTargets?: { label: string; target: number; unit: string }[] }
      }
    }
    const plan = e.data?.plan
    if (plan?.name?.startsWith('NAOD')) {
      plan.goalStatement = 'Consistent dunks, elite speed, and sub-10% body fat — a build that shows it.'
      plan.customTargets ??= []
      if (!plan.customTargets.some((t) => t.label.toLowerCase().includes('fat'))) {
        plan.customTargets.push({ label: 'Body fat', target: 10, unit: '%' })
      }
    }
    return env
  },
}

export function migrate(env: unknown): Envelope {
  if (typeof env !== 'object' || env === null) {
    throw new Error('Not a Bodytea backup file')
  }
  let e = env as Record<string, unknown>
  let v = typeof e.schemaVersion === 'number' ? e.schemaVersion : 0
  if (v === 0) throw new Error('Missing schema version — not a Bodytea backup file')
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

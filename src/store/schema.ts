import { z } from 'zod'
import { SCHEMA_VERSION, type Envelope, type Goal } from '../types'
import { buildNaodPreset } from '../plan/presets/naod'
import { buildMealPlan, buildNaodMealPlan } from '../plan/foods'
import { addDaysISO } from '../engine/calendar'

// ============================================================
// Import/load validation + migrations. Anything read from disk
// or an import file passes through migrate() then zod.
// ============================================================

import { isoDate, weekday } from './primitives'
// Session shapes live in ./sessionSchema, beside the types they mirror.
import { sessionSchema } from './sessionSchema'

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
  reviewsSeen: z.array(z.string()).optional(),
  voiceCoach: z.boolean().optional(),
  voiceURI: z.string().optional(),
  soundMode: z.enum(['voice', 'beeps-names', 'beeps', 'silent']).optional(),
  cadenceSpeed: z.number().min(0.5).max(2).optional(),
  voiceUsed: z.boolean().optional(),
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
  goal: z.enum(['vertical', 'speed', 'muscle', 'strength', 'lean', 'general', 'endurance']),
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
  slotRepsByBlock: z
    .record(z.string(), z.record(z.string(), z.object({ repText: z.string(), repsNum: z.number().optional() })))
    .optional(),
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
  sportMode: z.enum(['ball', 'generic']).optional(),
  dietStyle: z.enum(['omnivore', 'vegetarian', 'vegan']).optional(),
  experience: z.enum(['new', 'returning', 'trained']).optional(),
  goalAnswers: z.record(z.string(), z.string()).optional(),
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
  cardio: z.object({ exerciseId: z.string(), weekdays: z.array(weekday) }).nullable().optional(),
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
  reason: z.enum(['busy', 'tired', 'sick', 'gig', 'travel', 'sore', 'other', 'none']),
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
  neckIn: z.number().optional(),
  hipIn: z.number().optional(),
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
  profile: z.object({
    displayName: z.string().optional(),
    username: z.string().optional(),
    heightIn: z.number().optional(),
    bfFormula: z.enum(['male', 'female']).optional(),
  }),
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
  runs: z.array(
    z.object({
      id: z.string(),
      activity: z.enum(['run', 'bike', 'walk']),
      date: isoDate,
      startedAt: z.string(),
      durationSec: z.number().min(0),
      distanceMi: z.number().min(0),
      distanceSource: z.enum(['gps', 'steps', 'manual', 'none']).optional(),
      steps: z.number().min(0).optional(),
      avgPaceSec: z.number().min(0),
      kcalEst: z.number().min(0).optional(),
      splits: z.array(z.number()),
      points: z.array(z.tuple([z.number(), z.number(), z.number()])),
    }),
  ),
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
  // v3 → v4: plan-as-data, the owner's booklet becomes stored PlanConfig
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
  // athletic Monday + Saturday). Only the canonical preset is replaced,
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
  // v8 → v9: same-day load cuts ("work ran long, trim today")
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
  // v10 → v11: the owner set a body-composition goal, sub-10% body fat.
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
      plan.goalStatement = 'Consistent dunks, elite speed, and sub-10% body fat. A build that shows it.'
      plan.customTargets ??= []
      if (!plan.customTargets.some((t) => t.label.toLowerCase().includes('fat'))) {
        plan.customTargets.push({ label: 'Body fat', target: 10, unit: '%' })
      }
    }
    return env
  },
  // v11 → v12: reminders move to 5 AM / 5 PM. Only the shipped defaults
  // are replaced, times someone set by hand in Settings are theirs.
  11: (env) => {
    const e = env as { data?: { settings?: { reminderTimes?: string[] } } }
    const t = e.data?.settings?.reminderTimes
    const wasDefault =
      !!t &&
      (JSON.stringify(t) === JSON.stringify(['11:30', '18:30']) ||
        JSON.stringify(t) === JSON.stringify(['11:30', '20:30']))
    if (e.data?.settings && (wasDefault || !t)) {
      e.data.settings.reminderTimes = ['05:00', '17:00']
    }
    return env
  },
  // v12 → v13: cardio backups schedule any number of days, and
  // GPS-tracked runs/rides get a home.
  12: (env) => {
    const e = env as {
      data?: {
        runs?: unknown
        weeks?: Record<string, { cardio?: { exerciseId: string; weekday?: number; weekdays?: number[] } | null }>
      }
    }
    if (e.data) {
      e.data.runs ??= []
      for (const w of Object.values(e.data.weeks ?? {})) {
        if (w.cardio && w.cardio.weekday !== undefined && !w.cardio.weekdays) {
          w.cardio = { exerciseId: w.cardio.exerciseId, weekdays: [w.cardio.weekday as number] }
        }
      }
    }
    return env
  },
  // v13 → v14: the basketball-first voice becomes owner-only. NAOD plans
  // keep 'ball'; everyone else reads sport-neutral conditioning copy.
  13: (env) => {
    const e = env as { data?: { plan?: { name?: string; sportMode?: string } } }
    if (e.data?.plan && !e.data.plan.sportMode) {
      e.data.plan.sportMode = e.data.plan.name?.startsWith('NAOD') ? 'ball' : 'generic'
    }
    return env
  },
  // v14 → v15: repair. Before the quit-confirmation existed, a mis-tap on
  // 2026-08-11 could end a session during the FIRST exercise. Exactly that
  // shape, ended, still 'partial', nothing logged past exercise one, is
  // un-finished here: the phantom session and its debrief entry are removed
  // so the day starts clean. Real partials (work past exercise one) keep.
  14: (env) => {
    const e = env as {
      data?: {
        sessions?: Record<string, { endedAt?: string; status?: string; exercises?: { sets?: { done?: boolean }[] }[] }>
        coach?: { feed?: { kind?: string; debrief?: { date?: string } }[] }
      }
    }
    const s = e.data?.sessions?.['2026-08-11']
    const pastFirst = !!s?.exercises?.slice(1).some((ex) => ex.sets?.some((st) => st.done))
    if (s && s.endedAt && s.status === 'partial' && !pastFirst) {
      delete e.data!.sessions!['2026-08-11']
      const feed = e.data?.coach?.feed
      if (feed) {
        e.data!.coach!.feed = feed.filter((f) => !(f.kind === 'debrief' && f.debrief?.date === '2026-08-11'))
      }
    }
    return env
  },
  // v15 → v16: the v15 repair keyed the wrong date, the mis-tapped
  // finish actually lives under Monday 2026-08-10 (its debrief says so).
  // Re-run the same un-finish for both dates. Also: the Record becomes
  // facts-only, so historical "push me" pep-talk entries are purged.
  15: (env) => {
    const e = env as {
      data?: {
        sessions?: Record<string, { endedAt?: string; status?: string; exercises?: { sets?: { done?: boolean }[] }[] }>
        coach?: { feed?: { kind?: string; situation?: string; debrief?: { date?: string } }[] }
      }
    }
    for (const d of ['2026-08-10', '2026-08-11']) {
      const s = e.data?.sessions?.[d]
      const pastFirst = !!s?.exercises?.slice(1).some((ex) => ex.sets?.some((st) => st.done))
      if (s && s.endedAt && s.status === 'partial' && !pastFirst) {
        delete e.data!.sessions![d]
        const feed = e.data?.coach?.feed
        if (feed) {
          e.data!.coach!.feed = feed.filter((f) => !(f.kind === 'debrief' && f.debrief?.date === d))
        }
      }
    }
    const feed = e.data?.coach?.feed
    if (feed) e.data!.coach!.feed = feed.filter((f) => f.situation !== 'push')
    return env
  },
  // v16 → v17: false-start GPS logs (a few seconds, no distance) recorded
  // before the guard existed say nothing about training. Purge them.
  16: (env) => {
    const e = env as { data?: { runs?: { distanceMi?: number; durationSec?: number }[] } }
    if (e.data?.runs) {
      e.data.runs = e.data.runs.filter((r) => (r.distanceMi ?? 0) >= 0.05 && (r.durationSec ?? 0) >= 120)
    }
    return env
  },
  // v17 → v18: em dashes are banned from the app. New copy ships clean;
  // this sweeps the ones already frozen into stored data (old feed items,
  // meal labels, plan prose, the seeded goal statement).
  17: (env) => {
    const clean = (s: string): string =>
      s
        // label separators ("Debrief — Monday", "Breakfast — eggs", "X — 6-Day")
        .replace(/^([A-Za-z][A-Za-z' -]{1,18}) — /, '$1 · ')
        .replace(/ — (\d+-Day)/g, ' · $1')
        // prose: dash before a capital starts a sentence, otherwise a comma
        .replace(/ — (?=[A-Z0-9“"'])/g, '. ')
        .replace(/ — /g, ', ')
        .replace(/(\w)—(\w)/g, '$1, $2')
        .replace(/— /g, ', ')
        .replace(/ —/g, ',')
        .replace(/—/g, ', ')
    const walk = (v: unknown): unknown => {
      if (typeof v === 'string') return v.includes('—') ? clean(v) : v
      if (Array.isArray(v)) {
        for (let i = 0; i < v.length; i++) v[i] = walk(v[i])
        return v
      }
      if (v && typeof v === 'object') {
        const o = v as Record<string, unknown>
        for (const k of Object.keys(o)) o[k] = walk(o[k])
        return v
      }
      return v
    }
    return walk(env) as typeof env
  },
  // v18 → v19: everyone except the owner starts over on the new
  // onboarding. The generator learned a lot since these plans were
  // built (goal follow-ups that change real numbers, the endurance
  // family, seeded starting weights, deep-goal strategy), and old
  // booklets carry none of it. Flipping `onboarded` sends them back
  // through the wizard; nothing they logged is deleted, so sessions,
  // meals, runs, photos and measurements all survive the rebuild.
  // The owner's NAOD booklet is hand-built and golden-locked, so it
  // is left exactly as it is.
  18: (env) => {
    const e = env as {
      data?: {
        plan?: { name?: string; sportMode?: string }
        settings?: { onboarded?: boolean }
      }
    }
    const plan = e.data?.plan
    const isOwner = plan?.sportMode === 'ball' || !!plan?.name?.startsWith('NAOD')
    if (e.data?.settings && !isOwner) {
      e.data.settings.onboarded = false
    }
    return env
  },
}

export function migrate(env: unknown): Envelope {
  if (typeof env !== 'object' || env === null) {
    throw new Error('Not a BodyT backup file')
  }
  let e = env as Record<string, unknown>
  let v = typeof e.schemaVersion === 'number' ? e.schemaVersion : 0
  if (v === 0) throw new Error('Missing schema version, not a BodyT backup file')
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

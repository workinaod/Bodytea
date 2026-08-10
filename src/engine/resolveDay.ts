import type {
  AppData,
  DayBanner,
  DayTemplate,
  ISODate,
  PlanConfig,
  ResolvedDay,
  Tier,
  TierDayRole,
  WeekState,
  Weekday,
} from '../types'
import { defaultWeekState } from '../types'
import { addDaysISO, mondayOf, weekdayOf, weekIndexFor } from './calendar'
import {
  applyBadSleepCut,
  applyDeload,
  applyLongShiftMonday,
  applyReadinessDowngrade,
  buildFromTemplate,
  lighterCombinedPull,
} from './transforms'
import { EXERCISES, getExercise } from '../plan/exercises'
import { cardioActivity } from '../plan/cardio'

// ============================================================
// The pipeline: (date, state) → ResolvedDay.
// Deterministic and pure — the whole program logic lives here.
// Every plan read comes from data.plan (the user's booklet);
// the engine never touches the static plan modules.
// ============================================================

export function weekStateFor(data: AppData, dateISO: ISODate): WeekState {
  const monday = mondayOf(dateISO)
  return data.weeks[monday] ?? defaultWeekState(monday)
}

/** Template lookup on the user's plan (throws on unknown id, like the old getTemplate). */
export function planTemplate(plan: PlanConfig, id: string): DayTemplate {
  const t = plan.templates[id]
  if (!t) throw new Error(`Unknown template id in plan "${plan.name}": ${id}`)
  return t
}

export function blockMathFor(dateISO: ISODate, phaseStartISO: ISODate) {
  const weekIndex = weekIndexFor(dateISO, phaseStartISO)
  const weekInBlock = (((weekIndex - 1) % 4) + 1) as 1 | 2 | 3 | 4
  const blockIndex = ((Math.floor((weekIndex - 1) / 4) % 3) + 1) as 1 | 2 | 3
  const abWeek: 'A' | 'B' = weekIndex % 2 === 1 ? 'A' : 'B'
  const isDeload = weekInBlock === 4
  return { weekIndex, weekInBlock, blockIndex, abWeek, isDeload }
}

function tierTemplateId(plan: PlanConfig, tier: Tier, weekday: Weekday, week: WeekState): string | null {
  if (tier === 1) return plan.tier1ByWeekday[weekday]
  const placement = { ...plan.tierDefaultPlacement[tier], ...(week.tierPlacement ?? {}) }
  const role = (Object.keys(placement) as TierDayRole[]).find((r) => placement[r] === weekday)
  if (!role) return null
  return plan.tierRoleTemplates[tier][role] ?? null
}

function twoConsecutiveBadNightsBefore(week: WeekState, dateISO: ISODate): boolean {
  const d1 = addDaysISO(dateISO, -1)
  const d2 = addDaysISO(dateISO, -2)
  const all = new Set(week.badSleepDates)
  return all.has(d1) && all.has(d2)
}

// ---------- Custom life events (defs in plan, days per week) ----------

/** Life events of `kind` hitting `dateISO` (reads the week that owns the date). */
export function lifeEventsOn(
  data: AppData,
  dateISO: ISODate,
  kind?: 'late-night' | 'on-feet',
): { id: string; label: string; kind: 'late-night' | 'on-feet' }[] {
  const week = weekStateFor(data, dateISO)
  const wd = weekdayOf(dateISO)
  return data.plan.lifeEvents.filter(
    (ev) => (!kind || ev.kind === kind) && (week.events[ev.id] ?? []).includes(wd),
  )
}

/** Conditioning-type cardio logged inside the week containing `dateISO`. */
function conditioningLoggedThisWeek(data: AppData, dateISO: ISODate): boolean {
  const monday = mondayOf(dateISO)
  for (let i = 0; i < 7; i++) {
    const entries = data.cardio[addDaysISO(monday, i)] ?? []
    if (entries.some((e) => cardioActivity(e.activityId).conditioning)) return true
  }
  return false
}

/**
 * The "at least ONE cardio session" rule, made mandatory. Required on a
 * Tier-1 week when no ball has been logged AND either the forecast says
 * no ball or the week has reached Thursday without a run — until a
 * cardio-backup session is completed or scheduled.
 */
export function cardioRequiredForWeek(data: AppData, dateISO: ISODate): boolean {
  const week = weekStateFor(data, dateISO)
  if (week.tier !== 1) return false // Tier 2/3: "skip the formal cardio"
  if (week.ballDates.length > 0) return false
  if (conditioningLoggedThisWeek(data, dateISO)) return false // a logged run/ride/swim covers it
  const wd = weekdayOf(dateISO)
  const lateWeek = wd >= data.plan.anchors.conditioningWeekday || wd === 0
  if (week.ballThisWeek !== false && !lateWeek) return false
  // already satisfied by a completed cardio session this week?
  const monday = mondayOf(dateISO)
  for (let i = 0; i < 7; i++) {
    const s = data.sessions[addDaysISO(monday, i)]
    if (s && s.templateId === 'cardio' && s.status !== 'skipped') return false
  }
  return true
}

/** Cheap check: is `date` a CNS day for its tier? (no full resolution — avoids recursion) */
function resolveDayShallowCns(data: AppData, dateISO: ISODate): boolean {
  const week = weekStateFor(data, dateISO)
  const templateId = tierTemplateId(data.plan, week.tier, weekdayOf(dateISO), week)
  if (!templateId) return false
  return planTemplate(data.plan, templateId).cns ?? false
}

export function resolveDay(dateISO: ISODate, data: AppData): ResolvedDay {
  const plan = data.plan
  const weekday = weekdayOf(dateISO)
  const week = weekStateFor(data, dateISO)
  const { weekIndex, weekInBlock, blockIndex, abWeek, isDeload } = blockMathFor(
    dateISO,
    data.settings.phaseStartDate,
  )
  const banners: DayBanner[] = []
  const phaseComplete = weekIndex > 16

  // Same-day ball reality (yesterday may live in the previous week's state)
  const ballToday = week.ballDates.includes(dateISO)
  const yesterdayISO = addDaysISO(dateISO, -1)
  const ballYesterday = weekStateFor(data, yesterdayISO).ballDates.includes(yesterdayISO)
  if (ballToday) {
    banners.push({
      id: 'ball-today',
      text: "🏀 Ball logged today — that's this week's conditioning. Don't stack extra cardio on top.",
      tone: 'success',
    })
    if (!resolveDayShallowCns(data, dateISO) && resolveDayShallowCns(data, addDaysISO(dateISO, 1))) {
      banners.push({
        id: 'ball-eve-of-cns',
        text: "Tomorrow is a max-effort speed day. If today's run was hard, tomorrow will offer a plan-sanctioned swap to lifts only.",
        tone: 'info',
      })
    }
  }

  const base: Omit<ResolvedDay, 'templateId' | 'title' | 'tagline' | 'kind' | 'cns' | 'exercises' | 'note'> = {
    date: dateISO,
    weekday,
    weekIndex,
    weekInBlock,
    blockIndex,
    abWeek,
    isDeload,
    tier: week.tier,
    banners,
    phaseComplete,
  }

  // --- Scheduled cardio backup lands on its chosen weekday ---
  // (dissolves if ball actually got played — backups replace ball, never stack)
  if (week.cardio && week.cardio.weekday === weekday && week.ballDates.length === 0) {
    const opt = plan.cardioOptions.find((c) => c.exerciseId === week.cardio!.exerciseId)
    const def = getExercise(week.cardio.exerciseId)
    if (weekday === plan.anchors.conditioningWeekday) {
      banners.push({
        id: 'cardio-replaces-mobility',
        text: 'Cardio backup replaces mobility today — it stands in for basketball this week, not on top of it.',
        tone: 'info',
      })
    }
    return {
      ...base,
      templateId: null,
      title: def.name,
      tagline: 'Cardio backup — replaces basketball this week.',
      kind: 'cardio-backup',
      cns: false,
      exercises: [
        {
          exerciseId: def.id,
          name: def.name,
          kind: def.kind,
          restSec: def.restSec,
          sets: 1,
          repText: opt?.repText ?? '1 session',
        },
      ],
      note: 'Option A on tired weeks, Option B on fresh weeks. These replace ball when you can’t play — never stack them on top.',
    }
  }

  const cardioRequired = cardioRequiredForWeek(data, dateISO)

  // --- Mandatory cardio: Thursday flips from mobility to the backup
  //     chooser ONLY when the user declared a no-ball week (with no
  //     forecast, late-week no-ball stays a nag — Saturday ball is still
  //     possible in the same-day model) ---
  if (weekday === plan.anchors.conditioningWeekday && week.tier === 1 && week.ballThisWeek === false && cardioRequired && !week.cardio) {
    banners.push({
      id: 'cardio-required',
      text: 'No ball logged this week — the backup session is REQUIRED, not optional. Pick one below; it replaces mobility today (or move it in the Week tab). Log a run and this disappears.',
      tone: 'warn',
    })
    return {
      ...base,
      templateId: null,
      title: 'Cardio Backup — required',
      tagline: 'Replaces basketball this week. Option A if tired, Option B if fresh.',
      kind: 'cardio-backup',
      cns: false,
      exercises: [],
      note: 'The rule: if no ball that week, do at least ONE of these. They replace ball — never stack them on top.',
    }
  }

  const templateId = tierTemplateId(plan, week.tier, weekday, week)

  // --- Rest day (includes tier 2/3 non-training days) ---
  if (!templateId) {
    if (cardioRequired && !week.cardio) {
      banners.push({
        id: 'cardio-nag',
        text: 'No ball logged this week and no backup scheduled. The rule: at least ONE session — Thursday holds the slot, or pick a day in the Week tab.',
        tone: 'warn',
      })
    }
    return {
      ...base,
      templateId: null,
      title: week.tier === 1 ? 'Rest' : `Rest (Tier ${week.tier})`,
      tagline: 'Recovery is part of the program.',
      kind: 'rest',
      cns: false,
      exercises: [],
    }
  }

  const template = planTemplate(plan, templateId)

  // --- DJ Friday: pull pushed to Saturday (owner life-rule) ---
  if (plan.lifeRules.djWeekend && week.friPushedToSat) {
    if (weekday === 5 && templateId === 'friday') {
      banners.push({
        id: 'fri-pushed',
        text: 'Pull session pushed to Saturday (DJ Friday rule). Tonight: gig legs count as steps — no extra cardio.',
        tone: 'info',
      })
      return {
        ...base,
        templateId: null,
        title: 'Rest (pull moved to Saturday)',
        tagline: 'Never lift heavy on 4 hours of sleep.',
        kind: 'rest',
        cns: false,
        exercises: [],
      }
    }
  }

  let exercises = buildFromTemplate(template, blockIndex, abWeek, plan)

  if (plan.lifeRules.djWeekend && weekday === 6 && week.friPushedToSat && templateId === 'saturday') {
    exercises = [...exercises, ...lighterCombinedPull()]
    banners.push({
      id: 'sat-combined',
      text: 'Lighter combined day: Friday’s pull is appended after the speed work (reduced sets).',
      tone: 'info',
    })
  }

  // --- Per-date swaps (🔄 on a Today row) — applied before the volume
  //     transforms so deload/readiness/life-event math operates on what
  //     the user will actually do. Prescription (sets/reps) stays: the
  //     substitute fills the same training slot. ---
  const daySwaps = data.swaps[dateISO]
  if (daySwaps) {
    exercises = exercises.map((e) => {
      const to = daySwaps[e.exerciseId]
      if (!to || !EXERCISES[to]) return e
      const def = getExercise(to)
      return {
        ...e,
        exerciseId: def.id,
        name: def.name,
        kind: def.kind,
        restSec: def.restSec,
        swappedFrom: e.exerciseId,
      }
    })
  }

  // --- Deload ---
  if (isDeload && template.kind === 'session') {
    exercises = applyDeload(exercises)
    banners.push({
      id: 'deload',
      text: 'DELOAD WEEK — sets halved, keep the weights. Leave every session feeling like you could have done more. That’s the point.',
      tone: 'success',
    })
  }

  // --- Custom life events: tonight's, and yesterday's aftermath ---
  for (const ev of lifeEventsOn(data, dateISO, 'late-night')) {
    if (weekday === 5 && week.friPushedToSat) break // the push already emptied Friday
    banners.push({
      id: `late-night-${ev.id}`,
      text: (template.cns ?? false)
        ? `🌙 ${ev.label} tonight: do the sprints/jumps EARLY today. If your legs are already dead from standing, skipping the jumps is plan-sanctioned — jumping fatigued teaches bad mechanics.`
        : `🌙 ${ev.label} tonight: train this MORNING. Never lift heavy on 4 hours of sleep${plan.lifeRules.djWeekend && weekday === 5 ? ' — or push the session to Saturday from the Week tab' : ''}.`,
      tone: 'warn',
    })
    break // one banner even if several late nights collide
  }
  if (lifeEventsOn(data, yesterdayISO, 'late-night').length > 0 && !lifeEventsOn(data, dateISO, 'late-night').length) {
    banners.push({
      id: 'late-night-after',
      text: '🌙 Late one last night. If sleep landed under 6 h, flag it in the Week tab — quality beats volume today either way.',
      tone: 'info',
    })
  }
  const onFeetYesterday = lifeEventsOn(data, yesterdayISO, 'on-feet')
  if (onFeetYesterday.length > 0) {
    exercises = applyLongShiftMonday(exercises)
    banners.push({
      id: 'pre-fatigued',
      text: `${onFeetYesterday[0].label} yesterday: a jump set dropped — the legs are pre-fatigued. Quality over volume today.`,
      tone: 'warn',
    })
  }
  for (const ev of lifeEventsOn(data, dateISO, 'on-feet')) {
    banners.push({
      id: `on-feet-${ev.id}`,
      text: `🦵 ${ev.label} today — get the session in EARLY if you can. The hours on your feet count as your steps; don't stack extra cardio on top.`,
      tone: 'info',
    })
    break
  }

  // --- Same-day ball rules (PDF: never speed work pre-fatigued) ---
  const isCns = template.cns ?? false
  if (isCns && ballYesterday && !week.cnsSwapDates.includes(dateISO)) {
    banners.push({
      id: 'ball-before-cns',
      text: '🏀 You ran yesterday. If it was a hard run, today\'s max-effort speed work is pre-fatigued — swapping it out for lifts only is plan-sanctioned (button below).',
      tone: 'warn',
    })
  }
  if (isCns && week.cnsSwapDates.includes(dateISO)) {
    exercises = exercises.filter((e) => e.kind !== 'sprint' && e.kind !== 'jump')
    banners.push({
      id: 'cns-swapped',
      text: 'Speed work swapped out today (plan-sanctioned after a hard run). Lifts only — the explosive quality already got trained on the court.',
      tone: 'info',
    })
  }
  // --- Two consecutive bad-sleep nights ---
  if (twoConsecutiveBadNightsBefore(week, dateISO) && template.kind === 'session') {
    exercises = applyBadSleepCut(exercises)
    banners.push({
      id: 'bad-sleep',
      text: 'Two bad sleep nights in a row: volume cut by a third. No heroics. The plan resets tomorrow.',
      tone: 'warn',
    })
  }

  // --- Readiness (already materialized on a started session) ---
  const session = data.sessions[dateISO]
  if (session?.readiness?.downgraded) {
    exercises = applyReadinessDowngrade(exercises)
    banners.push({
      id: 'readiness',
      text: 'Readiness downgrade active: explosive volume −1/3, lifts light. Fast and fresh beats tired and grinding.',
      tone: 'warn',
    })
  }

  // Cardio still owed: nudge on the week's low-stress days (tier-1 rest
  // Sunday and no-forecast Thursday mobility ride this path, not the
  // null-template one)
  if (cardioRequired && !week.cardio && (template.kind === 'rest' || template.kind === 'mobility')) {
    banners.push({
      id: 'cardio-nag',
      text: 'No ball logged this week and no backup scheduled. The rule: at least ONE session — pick one in the Week tab, or log the run you played.',
      tone: 'warn',
    })
  }

  if (phaseComplete) {
    banners.push({
      id: 'phase-complete',
      text: `Phase 1 (16 weeks) complete — the program loops (Block ${blockIndex}). It’s a 12-month project: keep climbing.`,
      tone: 'success',
    })
  }

  return {
    ...base,
    templateId,
    title: template.title,
    tagline: template.tagline,
    kind: template.kind,
    cns: template.cns ?? false,
    exercises,
    note: template.note,
  }
}

// ---------- Nutrition day type ----------

export function nutritionDayType(dateISO: ISODate, data: AppData): 'training' | 'rest' {
  const meal = data.meals[dateISO]
  if (meal?.dayTypeOverride) return meal.dayTypeOverride
  const resolved = resolveDay(dateISO, data)
  if (resolved.kind === 'session' || resolved.kind === 'cardio-backup') {
    const session = data.sessions[dateISO]
    if (session?.status === 'skipped') return 'rest'
    return 'training'
  }
  return 'rest'
}

export function kcalTargetFor(data: AppData, dayType: 'training' | 'rest'): number {
  const n = data.plan.nutrition
  return dayType === 'training' ? n.kcalTraining + data.settings.trainingDayKcalBonus : n.kcalRest
}

/** The debrief/recovery pool key for a template (role-keyed via debriefKey). */
export function recoveryPoolKey(data: AppData, templateId: string | null, kind: string): string {
  if (kind === 'cardio-backup') return 'cardio'
  if (!templateId) return 'generic'
  return data.plan.templates[templateId]?.debriefKey ?? 'generic'
}

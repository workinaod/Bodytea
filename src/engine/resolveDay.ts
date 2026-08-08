import type {
  AppData,
  DayBanner,
  ISODate,
  ResolvedDay,
  Tier,
  TierDayRole,
  WeekState,
  Weekday,
} from '../types'
import { defaultWeekState, KCAL_REST, KCAL_TRAINING } from '../types'
import { addDaysISO, mondayOf, weekdayOf, weekIndexFor } from './calendar'
import {
  applyBadSleepCut,
  applyDeload,
  applyLongShiftMonday,
  applyReadinessDowngrade,
  buildFromTemplate,
  lighterCombinedPull,
} from './transforms'
import {
  CARDIO_OPTIONS,
  getTemplate,
  TIER1_BY_WEEKDAY,
  TIER_DEFAULT_PLACEMENT,
  TIER_ROLE_TEMPLATES,
} from '../plan/templates'
import { getExercise } from '../plan/exercises'

// ============================================================
// The pipeline: (date, state) → ResolvedDay.
// Deterministic and pure — the whole program logic lives here.
// ============================================================

export function weekStateFor(data: AppData, dateISO: ISODate): WeekState {
  const monday = mondayOf(dateISO)
  return data.weeks[monday] ?? defaultWeekState(monday)
}

export function blockMathFor(dateISO: ISODate, phaseStartISO: ISODate) {
  const weekIndex = weekIndexFor(dateISO, phaseStartISO)
  const weekInBlock = (((weekIndex - 1) % 4) + 1) as 1 | 2 | 3 | 4
  const blockIndex = ((Math.floor((weekIndex - 1) / 4) % 3) + 1) as 1 | 2 | 3
  const abWeek: 'A' | 'B' = weekIndex % 2 === 1 ? 'A' : 'B'
  const isDeload = weekInBlock === 4
  return { weekIndex, weekInBlock, blockIndex, abWeek, isDeload }
}

function tierTemplateId(tier: Tier, weekday: Weekday, week: WeekState): string | null {
  if (tier === 1) return TIER1_BY_WEEKDAY[weekday]
  const placement = { ...TIER_DEFAULT_PLACEMENT[tier], ...(week.tierPlacement ?? {}) }
  const role = (Object.keys(placement) as TierDayRole[]).find((r) => placement[r] === weekday)
  if (!role) return null
  return TIER_ROLE_TEMPLATES[tier][role] ?? null
}

function twoConsecutiveBadNightsBefore(week: WeekState, dateISO: ISODate): boolean {
  const d1 = addDaysISO(dateISO, -1)
  const d2 = addDaysISO(dateISO, -2)
  const all = new Set(week.badSleepDates)
  return all.has(d1) && all.has(d2)
}

export function resolveDay(dateISO: ISODate, data: AppData): ResolvedDay {
  const weekday = weekdayOf(dateISO)
  const week = weekStateFor(data, dateISO)
  const { weekIndex, weekInBlock, blockIndex, abWeek, isDeload } = blockMathFor(
    dateISO,
    data.settings.phaseStartDate,
  )
  const banners: DayBanner[] = []
  const phaseComplete = weekIndex > 16

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
  if (week.cardio && week.cardio.weekday === weekday) {
    const opt = CARDIO_OPTIONS.find((c) => c.exerciseId === week.cardio!.exerciseId)
    const def = getExercise(week.cardio.exerciseId)
    if (weekday === 4) {
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

  const templateId = tierTemplateId(week.tier, weekday, week)

  // --- Rest day (includes tier 2/3 non-training days) ---
  if (!templateId) {
    // Thursday cardio nag on no-ball weeks
    if (weekday === 4 && week.ballThisWeek === false && !week.cardio) {
      banners.push({
        id: 'cardio-nag',
        text: 'No ball this week and no cardio backup scheduled. The rule: at least ONE session. Pick one in the Week tab.',
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

  const template = getTemplate(templateId)

  // --- DJ Friday: pull pushed to Saturday ---
  if (week.gigFlags.friPushedToSat) {
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

  let exercises = buildFromTemplate(template, blockIndex, abWeek)

  if (weekday === 6 && week.gigFlags.friPushedToSat && templateId === 'saturday') {
    exercises = [...exercises, ...lighterCombinedPull()]
    banners.push({
      id: 'sat-combined',
      text: 'Lighter combined day: Friday’s pull is appended after the speed work (reduced sets).',
      tone: 'info',
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

  // --- Gig flags ---
  if (weekday === 5 && week.gigFlags.djFriNight && !week.gigFlags.friPushedToSat) {
    banners.push({
      id: 'dj-fri',
      text: 'DJ gig tonight: train this MORNING, or push the session to Saturday from the Week tab. Never lift heavy on 4 hours of sleep.',
      tone: 'warn',
    })
  }
  if (weekday === 6 && week.gigFlags.djSatNight) {
    banners.push({
      id: 'dj-sat',
      text: 'DJ gig tonight: do sprints/jumps EARLY today. If your legs are already dead from standing, skipping the jumps is plan-sanctioned — jumping fatigued teaches bad mechanics.',
      tone: 'warn',
    })
  }
  if (weekday === 1 && week.gigFlags.longShiftBeforeMon) {
    exercises = applyLongShiftMonday(exercises)
    banners.push({
      id: 'long-shift',
      text: 'Long shift yesterday: a jump set dropped — the legs are pre-fatigued. Quality over volume today.',
      tone: 'warn',
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

export function kcalTargetFor(dayType: 'training' | 'rest', bonus: number): number {
  return dayType === 'training' ? KCAL_TRAINING + bonus : KCAL_REST
}

/** The debrief/recovery pool key for a template. */
export function recoveryPoolKey(templateId: string | null, kind: string): string {
  if (kind === 'cardio-backup') return 'cardio'
  switch (templateId) {
    case 'monday':
      return 'monday'
    case 'tuesday':
    case 't2-upper':
      return 'tuesday'
    case 'wednesday':
    case 't2-lower':
    case 't3-fullbody':
      return 'wednesday'
    case 'thursday':
      return 'thursday'
    case 'friday':
      return 'friday'
    case 'saturday':
    case 't3-explosive':
      return 'saturday'
    default:
      return 'generic'
  }
}

import type { AppData, ISODate } from '../types'
import { MIN_KCAL_REST, MIN_KCAL_TRAINING } from '../plan/kcalFloor'
import { resolveDay } from './resolveDay'

// ============================================================
// What kind of day the body had, nutrition-wise, and what it
// should eat for it. Split out of resolveDay.ts when that file
// reached its line cap: the resolver decides what a day asks,
// these read what it turned out to be.
// ============================================================

export function nutritionDayType(dateISO: ISODate, data: AppData): 'training' | 'rest' {
  const meal = data.meals[dateISO]
  if (meal?.dayTypeOverride) return meal.dayTypeOverride
  const resolved = resolveDay(dateISO, data)
  if (resolved.kind === 'session' || resolved.kind === 'cardio-backup') {
    const session = data.sessions[dateISO]
    if (session?.status === 'skipped') return 'rest'
    return 'training'
  }
  // A rest day where real work got logged anyway (a make-up, an off-plan
  // workout) is a day the body trained, and it should eat like one.
  // Only actual ticked sets flip it: an abandoned skeleton stays a rest day.
  if (resolved.kind === 'rest') {
    const session = data.sessions[dateISO]
    if (session && session.status !== 'skipped' && session.exercises.some((e) => e.sets.some((s) => s.done))) {
      return 'training'
    }
  }
  return 'rest'
}

/**
 * Floored on the way out as well as on the way in.
 *
 * The migration repairs what is on disk, but a booklet is also editable
 * by hand and importable from another device, so the number the meals
 * ring is drawn from gets checked at the point of use too. Cheap, and it
 * means no future path can reintroduce a target nobody should eat to.
 */
export function kcalTargetFor(data: AppData, dayType: 'training' | 'rest'): number {
  const n = data.plan.nutrition
  return dayType === 'training'
    ? Math.max(MIN_KCAL_TRAINING, n.kcalTraining) + data.settings.trainingDayKcalBonus
    : Math.max(MIN_KCAL_REST, n.kcalRest)
}

/** The debrief/recovery pool key for a template (role-keyed via debriefKey). */
export function recoveryPoolKey(data: AppData, templateId: string | null, kind: string): string {
  if (kind === 'cardio-backup') return 'cardio'
  if (!templateId) return 'generic'
  return data.plan.templates[templateId]?.debriefKey ?? 'generic'
}

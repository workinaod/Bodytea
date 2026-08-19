import type { AppData, ISODate } from '../types'
import { cardioActivity } from '../plan/cardio'
import { sessionKcal, TYPICAL_SESSION_HOURS } from '../plan/bmr'
import { addDaysISO } from './calendar'
import { loggedSessions } from './activityLog'
import { latestBodyweightLb } from './stats'
import { adherenceShape, readUserModel } from './userModel'

// ============================================================
// Is there enough left over to run a body on.
//
// The calorie floors ask whether a target is too low in absolute terms.
// That question misses the athlete this check exists for: somebody eating
// 1,400 kcal, which clears the 1,200 floor without complaint, while
// training six times a week and running thirty kilometres. What reaches
// her actual physiology after the training is paid for is nearer 1,000,
// and spread over her lean mass that is roughly 23 kcal per kg.
//
// Below about 30 is the low-energy zone, where the body starts shutting
// down the things it can live without for a while: bone turnover, immune
// function, menstrual cycles, mood. A floor cannot see this because a
// floor does not know how much she trains.
//
//   EA = (intake - exercise energy) / fat-free mass, in kcal per kg per day
//
// Two honest limits, both kept rather than smoothed away.
//
//   The 30 line is derived from female athletes. Male thresholds are much
//   less certain, with figures around 9 to 25 discussed. So a man below
//   30 gets a caution, not a finding, and the copy says which it is.
//
//   This needs a tape reading to know fat-free mass at all, and logged
//   sessions to know what training cost. Without both it returns nothing,
//   because an energy-availability number computed from a guessed body
//   composition is a clinical-sounding sentence built on sand.
//
// Suggest only. It raises a number and a nudge toward more food. It never
// diagnoses, never names a condition, and never changes the plan.
// ============================================================

/** The low-energy line, kcal per kg of fat-free mass per day. */
export const EA_LOW = 30

/** Where the sourced line stops being female-derived and starts being ours. */
export type EaLevel = 'low' | 'caution'

const WINDOW_DAYS = 28

export interface EnergyCheck {
  /** kcal per kg fat-free mass per day, rounded to one decimal. */
  ea: number
  ffmKg: number
  /** Averaged across the window, not the cost of one session. */
  exerciseKcalPerDay: number
  /** The training-day target this was measured against. */
  intakeKcal: number
  level: EaLevel
  /** Intake that would clear the line, rounded up to the nearest 50. */
  suggestKcal: number
}

/**
 * What one logged cardio session cost.
 *
 * Prefers the number saved with the session, because that was computed
 * from the measured work rate at the time. Falls back to the activity's
 * own MET anchor rather than zero: a session that contributes nothing
 * makes training look cheaper, which makes energy availability look
 * higher, which is the direction that hides the warning.
 */
function cardioKcal(s: { activityId: string; minutes: number; kcal?: number }, bodyweightLb: number): number {
  if (s.kcal && s.kcal > 0) return s.kcal
  if (!(s.minutes > 0)) return 0
  const met = cardioActivity(s.activityId).met
  return Math.max(0, Math.round(((met - 1) * bodyweightLb) / 2.2046226218 * (s.minutes / 60)))
}

/**
 * Energy availability, or nothing at all.
 *
 * Null covers every case where the number would be a guess: no tape, no
 * weight, not enough logged training to characterise a week, or an EA
 * that is simply fine.
 */
export function energyCheck(data: AppData, today: ISODate): EnergyCheck | null {
  const bodyFatPct = readUserModel(data, today).bodyFatPct?.value
  const bodyweightLb = latestBodyweightLb(data)
  if (bodyFatPct === undefined || bodyweightLb === null) return null

  const ffmKg = (bodyweightLb / 2.2046226218) * (1 - bodyFatPct / 100)
  if (!(ffmKg > 0)) return null

  // Same definition of a completed session the rest of J7 uses, rather
  // than a second one that would drift from it.
  const shape = adherenceShape(data, today, WINDOW_DAYS)
  if (!shape) return null

  const lifting = shape.samples * sessionKcal(bodyweightLb, TYPICAL_SESSION_HOURS)
  const cardio = loggedSessions(data, { from: addDaysISO(today, -(WINDOW_DAYS - 1)), to: today })
    .reduce((sum, s) => sum + cardioKcal(s, bodyweightLb), 0)
  const exerciseKcalPerDay = Math.round((lifting + cardio) / WINDOW_DAYS)

  const intakeKcal = data.plan?.nutrition?.kcalTraining
  if (!intakeKcal) return null

  const ea = (intakeKcal - exerciseKcalPerDay) / ffmKg
  if (ea >= EA_LOW) return null

  return {
    ea: Math.round(ea * 10) / 10,
    ffmKg: Math.round(ffmKg * 10) / 10,
    exerciseKcalPerDay,
    intakeKcal,
    // The line is female-derived. A man below it gets a caution band,
    // because calling it a finding would be borrowing certainty that the
    // evidence for male athletes does not have.
    level: data.profile?.bfFormula === 'female' ? 'low' : 'caution',
    suggestKcal: Math.ceil((EA_LOW * ffmKg + exerciseKcalPerDay) / 50) * 50,
  }
}

/**
 * What to say about it, without saying anything a coach may not say.
 *
 * No condition is named, nothing is diagnosed, and the male case is
 * phrased as the open question it is.
 */
export function energyCopy(c: EnergyCheck): string {
  const head =
    c.level === 'low'
      ? `Your training days leave about ${c.ea} kcal per kg of lean mass once the training is paid for.`
      : `Once training is paid for, your day leaves about ${c.ea} kcal per kg of lean mass.`
  const why =
    c.level === 'low'
      ? 'Under 30 is where bodies start cutting back on things you need. The floor cannot see this, because the floor does not know how much you train.'
      : 'Under 30 is the studied line for women, and the number for men is much less settled. Worth a look rather than an alarm.'
  return `${head} ${why} Around ${c.suggestKcal} on training days would clear it.`
}

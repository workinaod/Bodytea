import type { AppData, ISODate, ResolvedExercise } from '../types'
import { getExercise } from '../plan/exercises'
import { dayActivities, type DayActivity } from './activityStats'
import { resolveDay } from './resolveDay'

// ============================================================
// What the plan asked for, next to what actually happened.
//
// The week's day sheet showed the PLAN and nothing else, which
// makes it a schedule rather than a record. Once a day is behind
// you the interesting question stops being "what was I meant to
// do" and becomes "what did I do", and the gap between the two
// is the only thing either number is really for.
//
// THREE CASES, and the third is the one a naive diff loses.
//
//   PLANNED AND DONE. The common one. Sets completed and the
//   load used, against what was asked.
//
//   PLANNED AND NOT DONE. Ran out of time, ran out of energy,
//   swapped away from it. Shown as missing rather than silently
//   absent, because a day where three of seven happened should
//   not look like a day of four exercises.
//
//   DONE AND NOT PLANNED. A substitution, a make-up, or somebody
//   adding work of their own. Listed under the plan rather than
//   dropped: it is the part of the record the plan cannot
//   account for, which makes it the part worth keeping.
//
// CARDIO rides at the bottom for the same reason. An hour of
// basketball is what the day actually contained, and reading the
// lifting record without it describes a different afternoon.
// ============================================================

export interface ExerciseRecap {
  exerciseId: string
  name: string
  /** Null when this was done but never planned. */
  planned: { sets: number; repText: string } | null
  /** Null when it was planned and never touched. */
  actual: {
    sets: number
    /** Reps of the completed sets, in order. */
    reps: number[]
    /** Heaviest load used across completed sets, when any was recorded. */
    topWeightLb?: number
  } | null
  /** The movement this replaced, when the day was adapted or swapped. */
  swappedFrom?: string
}

export interface DayRecap {
  /** True once anything at all was logged, which is what flips the sheet from schedule to record. */
  trained: boolean
  exercises: ExerciseRecap[]
  /** Sets asked for across the plan. */
  plannedSets: number
  /** Sets actually completed, including ones the plan never asked for. */
  actualSets: number
  cardio: DayActivity[]
  cardioMinutes: number
  cardioKcal: number
}

const nameOf = (id: string) => {
  try {
    return getExercise(id).name
  } catch {
    // A logged exercise whose catalog entry has since been removed still
    // happened, and dropping it would quietly shrink somebody's history.
    return id
  }
}

/**
 * One day, read as plan against record.
 *
 * Pure and total: a day with no session returns the plan with every
 * `actual` null, which is exactly what a future day should look like.
 */
export function dayRecap(data: AppData, date: ISODate): DayRecap {
  const resolved = resolveDay(date, data)
  const session = data.sessions[date]
  const logged = session && session.status !== 'skipped' ? session.exercises : []

  const byId = new Map(logged.map((e) => [e.exerciseId, e]))
  const out: ExerciseRecap[] = []

  const readActual = (log: (typeof logged)[number]): ExerciseRecap['actual'] => {
    const done = log.sets.filter((s) => s.done)
    if (done.length === 0) return null
    const weights = done.map((s) => s.weightLb).filter((w): w is number => w !== undefined)
    return {
      sets: done.length,
      reps: done.map((s) => s.reps ?? 0),
      ...(weights.length ? { topWeightLb: Math.max(...weights) } : {}),
    }
  }

  // 1 + 2: everything the plan asked for, done or not.
  for (const ex of resolved.exercises as ResolvedExercise[]) {
    const log = byId.get(ex.exerciseId)
    if (log) byId.delete(ex.exerciseId)
    out.push({
      exerciseId: ex.exerciseId,
      name: ex.name,
      planned: { sets: ex.sets, repText: ex.repText },
      actual: log ? readActual(log) : null,
      ...(ex.swappedFrom ? { swappedFrom: ex.swappedFrom } : {}),
    })
  }

  // 3: anything logged that the plan never mentioned.
  for (const log of byId.values()) {
    const actual = readActual(log)
    if (!actual) continue
    out.push({ exerciseId: log.exerciseId, name: nameOf(log.exerciseId), planned: null, actual })
  }

  const cardio = dayActivities(data, date)
  return {
    trained: out.some((r) => r.actual !== null) || cardio.length > 0,
    exercises: out,
    plannedSets: out.reduce((n, r) => n + (r.planned?.sets ?? 0), 0),
    actualSets: out.reduce((n, r) => n + (r.actual?.sets ?? 0), 0),
    cardio,
    cardioMinutes: cardio.reduce((n, c) => n + c.minutes, 0),
    cardioKcal: cardio.reduce((n, c) => n + (c.kcal ?? 0), 0),
  }
}

/**
 * The actual work, in one line. "3 × 8 · 50 lb".
 *
 * Reps collapse to a single number when every set matched, and list out
 * when they did not, because "3 × 8" and "8, 8, 5" are different
 * sessions and the second one is the interesting one.
 */
export function actualLine(actual: NonNullable<ExerciseRecap['actual']>): string {
  const unique = [...new Set(actual.reps)]
  const reps =
    actual.reps.every((r) => r === 0)
      ? ''
      : unique.length === 1
        ? `${actual.sets} × ${unique[0]}`
        : actual.reps.join(', ')
  const load = actual.topWeightLb !== undefined ? `${actual.topWeightLb} lb` : ''
  const parts = [reps || `${actual.sets} ${actual.sets === 1 ? 'set' : 'sets'}`, load].filter(Boolean)
  return parts.join(' · ')
}

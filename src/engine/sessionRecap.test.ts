import { describe, expect, it } from 'vitest'
import { defaultWeekState, emptyAppData, type AppData } from '../types'
import { actualLine, dayRecap } from './sessionRecap'

// ============================================================
// The week's day sheet showed the PLAN and nothing else, which
// makes it a schedule rather than a record. These check the
// three cases, and the third is the one a naive diff loses.
// ============================================================

const TUESDAY = '2026-08-11'
const MONDAY = '2026-08-10'

function base(): AppData {
  const d = emptyAppData(MONDAY, TUESDAY)
  d.settings.onboarded = true
  const week = defaultWeekState(MONDAY)
  week.tier = 1
  week.tierPickedAt = `${MONDAY}T08:00:00.000Z`
  d.weeks[MONDAY] = week
  return d
}

function logged(d: AppData, exercises: AppData['sessions'][string]['exercises']) {
  d.sessions[TUESDAY] = {
    date: TUESDAY,
    templateId: 'tuesday',
    status: 'completed',
    exercises,
  }
  return d
}

describe('a day nobody has trained yet', () => {
  it('reads as the plan, with nothing claimed', () => {
    const r = dayRecap(base(), TUESDAY)
    expect(r.trained).toBe(false)
    expect(r.exercises.length).toBeGreaterThan(0)
    expect(r.exercises.every((e) => e.actual === null)).toBe(true)
    expect(r.plannedSets).toBeGreaterThan(0)
    expect(r.actualSets).toBe(0)
  })
})

describe('planned and done', () => {
  it('reports the sets completed and the load used', () => {
    const d = logged(base(), [
      {
        exerciseId: 'incline-db-press',
        sets: [
          { targetReps: '8', reps: 8, weightLb: 50, done: true },
          { targetReps: '8', reps: 8, weightLb: 55, done: true },
          { targetReps: '8', reps: 6, weightLb: 55, done: false },
        ],
      },
    ])
    const row = dayRecap(d, TUESDAY).exercises.find((e) => e.exerciseId === 'incline-db-press')!
    expect(row.planned).not.toBeNull()
    // Only completed sets count. The unfinished third is not work done.
    expect(row.actual).toEqual({ sets: 2, reps: [8, 8], topWeightLb: 55 })
  })

  it('counts the day honestly, done against asked', () => {
    const d = logged(base(), [
      { exerciseId: 'incline-db-press', sets: [{ targetReps: '8', reps: 8, weightLb: 50, done: true }] },
    ])
    const r = dayRecap(d, TUESDAY)
    expect(r.trained).toBe(true)
    expect(r.actualSets).toBe(1)
    expect(r.actualSets).toBeLessThan(r.plannedSets)
  })
})

describe('planned and NOT done', () => {
  it('keeps the movement on the list rather than letting it vanish', () => {
    // A day where three of seven happened must not look like a day of
    // three exercises. The gap is the whole point of the record.
    const d = logged(base(), [
      { exerciseId: 'incline-db-press', sets: [{ targetReps: '8', reps: 8, weightLb: 50, done: true }] },
    ])
    const r = dayRecap(d, TUESDAY)
    const untouched = r.exercises.filter((e) => e.planned && e.actual === null)
    expect(untouched.length).toBeGreaterThan(0)
    expect(r.exercises.length).toBeGreaterThan(1)
  })

  it('treats sets started but never completed as not done', () => {
    const d = logged(base(), [
      { exerciseId: 'incline-db-press', sets: [{ targetReps: '8', reps: 4, weightLb: 50, done: false }] },
    ])
    const row = dayRecap(d, TUESDAY).exercises.find((e) => e.exerciseId === 'incline-db-press')!
    expect(row.actual).toBeNull()
  })
})

describe('done and NOT planned', () => {
  it('lists work the plan never asked for', () => {
    // A substitution, a make-up, or somebody adding their own work. It is
    // the part of the record the plan cannot account for, which is
    // exactly what makes it worth keeping.
    const d = logged(base(), [
      { exerciseId: 'cable-curl', sets: [{ targetReps: '12', reps: 12, weightLb: 30, done: true }] },
    ])
    const r = dayRecap(d, TUESDAY)
    const extra = r.exercises.find((e) => e.exerciseId === 'cable-curl')!
    expect(extra.planned).toBeNull()
    expect(extra.actual?.sets).toBe(1)
    expect(r.actualSets).toBe(1)
  })

  it('survives an exercise whose catalog entry no longer exists', () => {
    // Dropping it would quietly shrink somebody's history.
    const d = logged(base(), [
      { exerciseId: 'deleted-from-the-catalog', sets: [{ targetReps: '10', reps: 10, done: true }] },
    ])
    const row = dayRecap(d, TUESDAY).exercises.find((e) => e.exerciseId === 'deleted-from-the-catalog')
    expect(row?.actual?.sets).toBe(1)
  })
})

describe('a skipped day claims nothing', () => {
  it('reads as untrained even with exercise rows on the log', () => {
    const d = base()
    d.sessions[TUESDAY] = {
      date: TUESDAY,
      templateId: 'tuesday',
      status: 'skipped',
      exercises: [
        { exerciseId: 'incline-db-press', sets: [{ targetReps: '8', reps: 8, weightLb: 50, done: true }] },
      ],
    }
    const r = dayRecap(d, TUESDAY)
    expect(r.trained).toBe(false)
    expect(r.actualSets).toBe(0)
  })
})

describe('the day also contained cardio', () => {
  it('carries the activity and its numbers', () => {
    const d = base()
    d.cardio[TUESDAY] = [
      { id: 'c1', activityId: 'basketball', label: 'Basketball', when: 'solo', minutes: 90, kcalEst: 700, at: `${TUESDAY}T20:00:00.000Z` },
    ] as never
    const r = dayRecap(d, TUESDAY)
    expect(r.cardio).toHaveLength(1)
    expect(r.cardioMinutes).toBe(90)
    // Cardio alone is still a day that was trained.
    expect(r.trained).toBe(true)
  })

  it('reads zero on a day with none', () => {
    const r = dayRecap(base(), TUESDAY)
    expect(r.cardio).toEqual([])
    expect(r.cardioMinutes).toBe(0)
    expect(r.cardioKcal).toBe(0)
  })
})

describe('the one-line summary of what was done', () => {
  it('collapses matching sets and spells out ones that did not match', () => {
    expect(actualLine({ sets: 3, reps: [8, 8, 8], topWeightLb: 50 })).toBe('3 × 8 · 50 lb')
    // "3 × 8" and "8, 8, 5" are different sessions, and the second is the
    // interesting one. Collapsing it would hide the set that died.
    expect(actualLine({ sets: 3, reps: [8, 8, 5], topWeightLb: 50 })).toBe('8, 8, 5 · 50 lb')
  })

  it('handles bodyweight work with no load recorded', () => {
    expect(actualLine({ sets: 3, reps: [12, 12, 12] })).toBe('3 × 12')
  })

  it('falls back to a set count when reps were never logged', () => {
    expect(actualLine({ sets: 2, reps: [0, 0] })).toBe('2 sets')
    expect(actualLine({ sets: 1, reps: [0] })).toBe('1 set')
  })
})

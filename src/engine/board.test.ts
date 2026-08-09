import { describe, expect, it } from 'vitest'
import { computeBoardStats } from './board'
import { adherenceMap } from './stats'
import { emptyAppData, type AppData, type ISODate, type MealDay, type SessionLog } from '../types'
import { addDaysISO } from './calendar'

const START = '2026-07-06' // a Monday
const TODAY = '2026-08-09'

function base(): AppData {
  const d = emptyAppData(START, START)
  d.settings.onboarded = true
  return d
}

const doneSession = (date: ISODate): SessionLog => ({
  date,
  templateId: 'x',
  status: 'completed',
  exercises: [],
})

const mealDay = (date: ISODate, proteinG: number): MealDay => ({
  date,
  entries: [{ id: date, at: `${date}T12:00:00Z`, label: 'food', proteinG, kcal: 800, source: 'chip', servings: 1 }],
  supplements: { creatine: false, fishOil: false, vitD3: false, electrolytes: false },
})

function scheduledDates(d: AppData): ISODate[] {
  return adherenceMap(d, 30, TODAY)
    .filter((a) => ['done', 'partial', 'skipped', 'missed', 'future'].includes(a.state))
    .map((a) => a.date)
}

describe('computeBoardStats', () => {
  it('perfect adherence scores 100; empty history scores 0', () => {
    const d = base()
    for (const date of scheduledDates(d)) d.sessions[date] = doneSession(date)
    const s = computeBoardStats(d, TODAY)
    expect(s.consistency30).toBe(100)
    expect(s.sessionsTotal).toBeGreaterThan(20)
    expect(s.streak).toBeGreaterThan(20)

    const fresh = base()
    expect(computeBoardStats(fresh, TODAY).consistency30).toBe(0)
  })

  it('partials earn half credit', () => {
    const d = base()
    const sched = scheduledDates(d).filter((x) => x !== TODAY)
    for (const date of sched) d.sessions[date] = { ...doneSession(date), status: 'partial' }
    expect(computeBoardStats(d, TODAY).consistency30).toBe(50)
  })

  it('consistency is unranked before the phase has 8 scheduled days', () => {
    const d = emptyAppData('2026-08-08', '2026-08-08') // started yesterday
    d.settings.onboarded = true
    expect(computeBoardStats(d, '2026-08-09').consistency30).toBeNull()
  })

  it('PR gain: first→best e1RM inside 90 days, needs 3 points across 14+ days', () => {
    const d = base()
    d.plan.trackedLifts = [{ exerciseId: 'front-squat', label: 'Front Squat' }]
    const lift = (date: ISODate, weightLb: number): SessionLog => ({
      date,
      templateId: 'x',
      status: 'completed',
      exercises: [{ exerciseId: 'front-squat', sets: [{ targetReps: '5', weightLb, reps: 5, done: true }] }],
    })
    // Two points → unranked
    d.sessions['2026-07-10'] = lift('2026-07-10', 100)
    d.sessions['2026-08-01'] = lift('2026-08-01', 120)
    expect(computeBoardStats(d, TODAY).prGain90).toBeNull()
    // Third point (≥14-day span) → e1RM 117 → 140 = +19.7%
    d.sessions['2026-07-20'] = lift('2026-07-20', 110)
    expect(computeBoardStats(d, TODAY).prGain90).toBe(19.7)
  })

  it('protein discipline: hit days over logged days, unranked under 10 logged', () => {
    const d = base()
    for (let i = 0; i < 9; i++) d.meals[addDaysISO(TODAY, -i)] = mealDay(addDaysISO(TODAY, -i), 250)
    expect(computeBoardStats(d, TODAY).protein30).toBeNull()
    for (let i = 9; i < 12; i++) d.meals[addDaysISO(TODAY, -i)] = mealDay(addDaysISO(TODAY, -i), 100)
    // 12 logged, 9 at/above the 200 g target
    expect(computeBoardStats(d, TODAY).protein30).toBe(75)
  })

  it('days logged outside the 30-day window do not count', () => {
    const d = base()
    for (let i = 0; i < 10; i++) {
      const date = addDaysISO(TODAY, -40 - i)
      d.meals[date] = mealDay(date, 250)
    }
    expect(computeBoardStats(d, TODAY).protein30).toBeNull()
  })
})

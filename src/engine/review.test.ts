import { describe, expect, it } from 'vitest'
import { emptyAppData, type AppData } from '../types'
import { addDaysISO, weekdayOf } from './calendar'
import { estimateBodyFat } from './bodyfat'
import { buildMilestoneReview, reviewReady, unlockedMarks } from './review'

const START = '2026-01-05' // a Monday

/** ~13 training weeks of history: sessions on the plan's days, weekly check-ins. */
function threeMonthsIn(opts: { attendance: number; bfDrop: number }): AppData {
  const data = emptyAppData(START)
  data.settings.onboarded = true
  let i = 0
  for (let d = START; d <= addDaysISO(START, 90); d = addDaysISO(d, 1)) {
    const wd = weekdayOf(d)
    if ([1, 2, 3, 5, 6].includes(wd)) {
      i++
      if (i % Math.round(1 / opts.attendance) === 0 || opts.attendance >= 0.99) {
        data.sessions[d] = {
          date: d,
          templateId: 'monday',
          status: 'completed',
          startedAt: `${d}T09:00:00.000Z`,
          endedAt: `${d}T10:00:00.000Z`,
          exercises: [
            { exerciseId: 'front-squat', sets: [{ targetReps: '6-8', weightLb: 155 + Math.floor(i / 5) * 5, reps: 8, done: true }] },
          ],
        }
      }
    }
  }
  for (let w = 0; w < 13; w++) {
    const d = addDaysISO(START, w * 7 + 6)
    data.measurements.push({
      date: d,
      weightLb: 197 - w * 0.3,
      bodyFatPct: 15 - (opts.bfDrop * w) / 12,
      waistIn: 36 - w * 0.1,
      vertIn: 28 + w * 0.25,
      photoIds: w === 0 ? { front: 'p-first' } : w === 12 ? { front: 'p-last' } : {},
    })
  }
  return data
}

describe('US Navy body-fat estimate', () => {
  it('matches the published formulas', () => {
    expect(estimateBodyFat({ formula: 'male', heightIn: 70, neckIn: 15, waistIn: 34 })).toBeCloseTo(17.5, 0)
    expect(estimateBodyFat({ formula: 'female', heightIn: 65, neckIn: 13, waistIn: 28, hipIn: 38 })).toBeCloseTo(25.9, 0)
  })

  it('rejects impossible tapes instead of returning garbage', () => {
    expect(estimateBodyFat({ formula: 'male', heightIn: 70, neckIn: 34, waistIn: 15 })).toBeNull()
    expect(estimateBodyFat({ formula: 'female', heightIn: 65, neckIn: 13, waistIn: 28 })).toBeNull() // hip missing
    expect(estimateBodyFat({ formula: 'male', heightIn: 20, neckIn: 15, waistIn: 34 })).toBeNull()
  })
})

describe('milestone reviews', () => {
  it('unlocks marks by elapsed days and tracks seen state', () => {
    const data = threeMonthsIn({ attendance: 1, bfDrop: 3 })
    expect(unlockedMarks(data, addDaysISO(START, 30)).map((m) => m.id)).toEqual([])
    expect(unlockedMarks(data, addDaysISO(START, 95)).map((m) => m.id)).toEqual(['3mo'])
    expect(reviewReady(data, addDaysISO(START, 95))?.id).toBe('3mo')
    data.settings.reviewsSeen = ['3mo']
    expect(reviewReady(data, addDaysISO(START, 95))).toBeNull()
    expect(reviewReady(data, addDaysISO(START, 190))?.id).toBe('6mo')
  })

  it('high effort + real gains → wins and a respectful verdict', () => {
    const data = threeMonthsIn({ attendance: 1, bfDrop: 3 })
    const r = buildMilestoneReview(data, '3mo', addDaysISO(START, 95))
    expect(r.adherencePct).toBeGreaterThanOrEqual(85)
    expect(r.deltas.find((d) => d.key === 'bodyFatPct')!.delta).toBeLessThanOrEqual(-2)
    expect(r.lines.some((l) => l.tone === 'win')).toBe(true)
    expect(r.lines.some((l) => l.tone === 'callout')).toBe(false)
    expect(r.verdict).toContain('showed up')
    expect(r.beforePhotoId).toBe('p-first')
    expect(r.afterPhotoId).toBe('p-last')
    expect(r.strength[0].pct).toBeGreaterThan(0)
  })

  it('low attendance → the criticism names attendance, not the plan', () => {
    const data = threeMonthsIn({ attendance: 0.4, bfDrop: 0 })
    const r = buildMilestoneReview(data, '3mo', addDaysISO(START, 95))
    expect(r.adherencePct).not.toBeNull()
    expect(r.adherencePct!).toBeLessThan(60)
    expect(r.lines.some((l) => l.tone === 'callout' && /attendance did/.test(l.text))).toBe(true)
    expect(r.verdict).toContain('Read that number twice')
  })

  it('window clamps to today and deltas use first/last check-ins inside it', () => {
    const data = threeMonthsIn({ attendance: 1, bfDrop: 3 })
    const r = buildMilestoneReview(data, '3mo', addDaysISO(START, 95))
    expect(r.from).toBe(START)
    expect(r.to <= addDaysISO(START, 91)).toBe(true)
    const w = r.deltas.find((d) => d.key === 'weightLb')!
    expect(w.before).toBeCloseTo(197, 1)
    expect(w.after!).toBeLessThan(197)
  })
})

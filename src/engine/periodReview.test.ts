import { describe, expect, it } from 'vitest'
import { emptyAppData, type AppData, type Measurement } from '../types'
import { addDaysISO, weekdayOf } from './calendar'
import { boundsFor } from './periods'
import { periodReview, reviewsDue } from './periodReview'

// ============================================================
// The review has to be able to say "nothing happened" without
// dressing it up, and has to show the whole distance travelled
// when it finally has something to show.
// ============================================================

const START = '2026-01-05' // a Monday

function history(opts: { weeks: number; sessionsPerWeek?: number; photoWeeks?: number[] }): AppData {
  const data = emptyAppData(START)
  data.settings.onboarded = true
  const perWeek = opts.sessionsPerWeek ?? 4
  const trainOn = [1, 2, 3, 5, 6].slice(0, perWeek)
  for (let d = START; d <= addDaysISO(START, opts.weeks * 7 - 1); d = addDaysISO(d, 1)) {
    if (!trainOn.includes(weekdayOf(d))) continue
    const w = Math.floor((Date.parse(`${d}T00:00:00`) - Date.parse(`${START}T00:00:00`)) / (7 * 864e5))
    data.sessions[d] = {
      date: d,
      templateId: 'monday',
      status: 'completed',
      startedAt: `${d}T09:00:00.000Z`,
      endedAt: `${d}T10:00:00.000Z`,
      exercises: [
        {
          exerciseId: 'front-squat',
          sets: [{ targetReps: '6-8', weightLb: 155 + w * 5, reps: 8, done: true }],
        },
      ],
    }
  }
  for (let w = 0; w < opts.weeks; w++) {
    const date = addDaysISO(START, w * 7 + 6)
    const m: Measurement = { date, weightLb: 197 - w * 0.4, waistIn: 36 - w * 0.1, photoIds: {} }
    if (opts.photoWeeks?.includes(w)) m.photoIds = { front: `front-${w}`, side: `side-${w}` }
    data.measurements.push(m)
  }
  return data
}

describe('a period review', () => {
  it('counts the sessions, sets and tonnage inside its own window and no further', () => {
    const data = history({ weeks: 10 })
    const jan = periodReview(data, boundsFor('month', '2026-01-15'))
    const feb = periodReview(data, boundsFor('month', '2026-02-15'))
    expect(jan.sessionsDone).toBeGreaterThan(0)
    expect(feb.sessionsDone).toBeGreaterThan(0)
    // January starts on the 5th here, so it cannot hold a full month.
    expect(jan.sessionsDone).toBeLessThan(feb.sessionsDone + 5)
    expect(jan.tonnageLb).toBeGreaterThan(0)
    expect(jan.setsDone).toBeGreaterThan(0)
  })

  it('reports a rate per week, so a month is not mistaken for superhuman volume', () => {
    const data = history({ weeks: 10, sessionsPerWeek: 4 })
    const week = periodReview(data, boundsFor('week', '2026-02-10'))
    const month = periodReview(data, boundsFor('month', '2026-02-10'))
    expect(week.sessionsPerWeek).toBeCloseTo(4, 0)
    expect(month.sessionsPerWeek).toBeCloseTo(4, 0)
    expect(month.sessionsDone).toBeGreaterThan(week.sessionsDone)
  })

  it('says nothing happened rather than telling a story of zeros', () => {
    const data = history({ weeks: 2 })
    const empty = periodReview(data, boundsFor('month', '2026-06-15'))
    expect(empty.sessionsDone).toBe(0)
    expect(empty.worthShowing).toBe(false)
  })

  it('asks for photos on a week and never on the longer periods', () => {
    const data = history({ weeks: 10 })
    expect(periodReview(data, boundsFor('week', '2026-02-10')).askForPhotos).toBe(true)
    for (const kind of ['month', 'quarter', 'year'] as const) {
      expect(periodReview(data, boundsFor(kind, '2026-02-10')).askForPhotos).toBe(false)
    }
  })

  it('names the angles never captured, so the ask can be specific', () => {
    const none = periodReview(history({ weeks: 4 }), boundsFor('week', '2026-01-26'))
    expect(none.missingAngles).toEqual(['front', 'side'])
    const some = periodReview(history({ weeks: 4, photoWeeks: [0] }), boundsFor('week', '2026-01-26'))
    expect(some.missingAngles).toEqual([])
  })

  it('puts a photo arc on quarters and years, and only there', () => {
    const data = history({ weeks: 30, photoWeeks: [0, 12, 28] })
    expect(periodReview(data, boundsFor('quarter', '2026-08-01')).photos.length).toBeGreaterThan(0)
    expect(periodReview(data, boundsFor('year', '2026-08-01')).photos.length).toBeGreaterThan(0)
    expect(periodReview(data, boundsFor('week', '2026-08-01')).photos).toEqual([])
    expect(periodReview(data, boundsFor('month', '2026-08-01')).photos).toEqual([])
  })

  it('carries the comparison, and every line of it says who it is against', () => {
    const data = history({ weeks: 12 })
    const r = periodReview(data, boundsFor('month', '2026-02-15'))
    expect(r.cohort.length).toBeGreaterThan(0)
    for (const c of r.cohort) {
      expect(c.against, 'a comparison with no stated cohort is a fabricated stat').toBeTruthy()
      expect(c.percentile).toBeGreaterThanOrEqual(0)
      expect(c.percentile).toBeLessThanOrEqual(100)
    }
  })

  it('turns a real body change into a goal accomplished, and ignores noise', () => {
    const data = history({ weeks: 20 })
    const quarter = periodReview(data, boundsFor('quarter', '2026-02-15'))
    // Weight is falling ~0.4 lb a week here, so a quarter clears the floor.
    expect(quarter.goals.some((g) => g.label.startsWith('Weight down'))).toBe(true)
    // One week of it does not.
    const week = periodReview(data, boundsFor('week', '2026-02-10'))
    expect(week.goals.some((g) => g.label.startsWith('Weight down'))).toBe(false)
  })
})

describe('the photo arc', () => {
  it('reaches back to the FIRST photo ever taken, not the first one in the window', () => {
    // The whole point of a quarter review: January next to September, not
    // three months of near-identical September shots. Three photos
    // deliberately: with only two, "the first" and "the one before the
    // last" are the same picture and the test proves nothing.
    const data = history({ weeks: 40, photoWeeks: [0, 15, 30] })
    const pairs = periodReview(data, boundsFor('quarter', '2026-10-15')).photos
    const front = pairs.find((p) => p.angle === 'front')!
    expect(front.beforeId).toBe('front-0')
    expect(front.afterId).toBe('front-30')
    expect(front.weeksApart).toBe(30)
    // Both angles the weekly check-in insists on come through.
    expect(pairs.map((p) => p.angle).sort()).toEqual(['front', 'side'])
  })

  it('never pairs a photo with itself', () => {
    const data = history({ weeks: 40, photoWeeks: [5] })
    expect(periodReview(data, boundsFor('quarter', '2026-10-15')).photos).toEqual([])
  })

  it('does not reach past the period being reviewed', () => {
    const data = history({ weeks: 40, photoWeeks: [0, 30] })
    // Reviewing Q1: the week-30 photo has not been taken yet.
    expect(periodReview(data, boundsFor('quarter', '2026-02-15')).photos).toEqual([])
  })
})

describe('which reviews are owed', () => {
  it('offers a closed period once, then never again', () => {
    const data = history({ weeks: 12 })
    const due = reviewsDue(data, '2026-03-02', [])
    expect(due.length).toBeGreaterThan(0)
    const seen = due.map((r) => r.bounds.id)
    expect(reviewsDue(data, '2026-03-02', seen)).toEqual([])
  })

  it('puts the longest period first, because that is the one they want', () => {
    const data = history({ weeks: 60 })
    // New Year's Day: the year, the quarter, the month and the week all
    // closed at once last night.
    const due = reviewsDue(data, '2027-01-01', [])
    const kinds = due.map((r) => r.bounds.kind)
    expect(kinds[0]).toBe('year')
    expect(kinds).toEqual([...kinds].sort((a, b) => {
      const order = { year: 0, quarter: 1, month: 2, week: 3 }
      return order[a] - order[b]
    }))
  })

  it('never offers a period that ended before the athlete started', () => {
    const data = history({ weeks: 4 })
    expect(reviewsDue(data, '2026-01-12', []).some((r) => r.bounds.to < START)).toBe(false)
  })

  it('stays quiet about a period with nothing in it', () => {
    const data = history({ weeks: 2 })
    // June: months after the last logged session.
    expect(reviewsDue(data, '2026-07-01', []).some((r) => r.bounds.label === 'June 2026')).toBe(false)
  })
})

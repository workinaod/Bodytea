import { describe, expect, it } from 'vitest'
import type { AppData, FatigueNote, ISODate, SessionLog } from '../types'
import { emptyAppData } from '../types'
import { addDaysISO } from './calendar'
import {
  dropTo,
  endsTheExercise,
  nextSessionSuggestions,
  regionsFor,
  sameGroupAhead,
  PATTERN_COUNT,
  RECENT_DAYS,
  REGION_WATCH_COUNT,
} from './fatigue'

const TODAY: ISODate = '2026-03-02' // a Monday

// Real catalog ids, so the region mapping under test is the real one.
const QUADS_A = 'goblet-squat' // primary quads + glutes
const QUADS_B = 'bulgarian-split-squat' // primary quads + glutes
const QUADS_C = 'heels-elevated-goblet' // primary quads
const HAMS = 'romanian-deadlift' // primary hamstrings + glutes
const CHEST = 'flat-db-press' // primary chest
const CALVES = 'single-leg-calf-raise' // primary calves

function note(exerciseId: string, reason: FatigueNote['reason']): FatigueNote {
  return { exerciseId, reason, atSetIdx: 1, regions: regionsFor(exerciseId) }
}

function session(date: ISODate, exerciseIds: string[], fatigue: FatigueNote[] = []): SessionLog {
  return {
    date,
    templateId: 't',
    status: 'completed',
    exercises: exerciseIds.map((exerciseId) => ({
      exerciseId,
      sets: [{ targetReps: '8', done: true }],
    })),
    ...(fatigue.length ? { fatigue } : {}),
  }
}

function dataWith(...sessions: SessionLog[]): AppData {
  const d = emptyAppData(TODAY)
  for (const s of sessions) d.sessions[s.date] = s
  return d
}

// ---------- The numbers the engine is built on ----------

describe('dropTo', () => {
  it('always comes down, and always lands on a real plate step', () => {
    for (let w = 5; w <= 400; w += 5) {
      const got = dropTo(w)
      expect(got, `dropTo(${w})`).toBeLessThan(w)
      expect(got % 5, `dropTo(${w}) off the 5 lb grid`).toBe(0)
      expect(got).toBeGreaterThanOrEqual(0)
    }
  })

  it('lands near the 10-15% back-off at every weight worth back-offing', () => {
    // Not exactly 10-15%, and it cannot be: at 60 lb one 5 lb step is 8.3%
    // and two is 16.7%, so no result inside the band exists. Measured over
    // 40-400 lb the real spread is 8.3% (at 60) to 15.4% (at 65), which is
    // the band 5 lb plates actually allow. Asserting a tighter one would be
    // asserting a fiction.
    for (let w = 40; w <= 400; w += 5) {
      const pct = (w - dropTo(w)) / w
      expect(pct, `dropTo(${w}) cut ${(pct * 100).toFixed(1)}%`).toBeGreaterThanOrEqual(0.083)
      expect(pct, `dropTo(${w}) cut ${(pct * 100).toFixed(1)}%`).toBeLessThanOrEqual(0.155)
    }
  })

  it('reads sensibly at the weights people actually use', () => {
    expect(dropTo(100)).toBe(90)
    expect(dropTo(45)).toBe(40)
    expect(dropTo(30)).toBe(25)
    expect(dropTo(10)).toBe(5)
  })

  it('bottoms out rather than going negative', () => {
    expect(dropTo(5)).toBe(0)
    expect(dropTo(0)).toBe(0)
    expect(dropTo(-20)).toBe(0)
    expect(dropTo(Number.NaN)).toBe(0)
  })
})

describe('regionsFor', () => {
  it('reports the primary movers only, never the assisters', () => {
    // flat-db-press is chest-primary with triceps and front delts assisting.
    expect(regionsFor(CHEST)).toContain('chest')
    expect(regionsFor(CHEST)).not.toContain('triceps')
  })

  it('is empty for an exercise the catalog does not map', () => {
    expect(regionsFor('not-a-real-exercise')).toEqual([])
  })
})

describe('endsTheExercise', () => {
  it('is true only where continuing would be the wrong call', () => {
    expect(endsTheExercise('pain')).toBe(true)
    expect(endsTheExercise('form')).toBe(true)
    expect(endsTheExercise('fried')).toBe(false)
    expect(endsTheExercise('empty')).toBe(false)
  })
})

// ---------- What is still ahead today ----------

describe('sameGroupAhead', () => {
  it('names the later movements that lean on the same muscle', () => {
    const s = session(TODAY, [QUADS_A, CHEST, QUADS_B])
    const ahead = sameGroupAhead(s, 0)
    expect(ahead.map((a) => a.exerciseId)).toEqual([QUADS_B])
    expect(ahead[0].exIdx).toBe(2)
    expect(ahead[0].shared).toContain('quads')
  })

  it('looks forward only, never back at work already done', () => {
    const s = session(TODAY, [QUADS_A, QUADS_B])
    expect(sameGroupAhead(s, 1)).toEqual([])
  })

  it('ignores exercises already skipped', () => {
    const s = session(TODAY, [QUADS_A, QUADS_B])
    s.exercises[1].skipped = true
    expect(sameGroupAhead(s, 0)).toEqual([])
  })

  it('says nothing when the rest of the day is unrelated work', () => {
    const s = session(TODAY, [CHEST, CALVES])
    expect(sameGroupAhead(s, 0)).toEqual([])
  })

  it('matches on a shared region even when the movements differ', () => {
    // goblet squat and RDL share glutes but not quads/hamstrings.
    const s = session(TODAY, [QUADS_A, HAMS])
    expect(sameGroupAhead(s, 0)[0]?.shared).toEqual(['glutes'])
  })

  it('is empty for an out-of-range index rather than throwing', () => {
    expect(sameGroupAhead(session(TODAY, [QUADS_A]), 9)).toEqual([])
  })
})

// ---------- What to offer next time ----------

describe('nextSessionSuggestions', () => {
  it('says nothing when nothing has gone wrong', () => {
    expect(nextSessionSuggestions(dataWith(session(TODAY, [QUADS_A])), TODAY)).toEqual([])
  })

  it('treats a single bad day as a bad day, not a pattern', () => {
    const d = dataWith(session(addDaysISO(TODAY, -2), [QUADS_A], [note(QUADS_A, 'pain')]))
    expect(nextSessionSuggestions(d, TODAY)).toEqual([])
  })

  it('offers a swap once the same movement has hurt twice', () => {
    const d = dataWith(
      session(addDaysISO(TODAY, -9), [QUADS_A], [note(QUADS_A, 'pain')]),
      session(addDaysISO(TODAY, -2), [QUADS_A], [note(QUADS_A, 'pain')]),
    )
    const out = nextSessionSuggestions(d, TODAY)
    expect(out).toHaveLength(1)
    expect(out[0].kind).toBe('swap')
    expect(out[0].exerciseId).toBe(QUADS_A)
    expect(out[0].count).toBe(PATTERN_COUNT)
    expect(out[0].because).toMatch(/hurt 2 times/)
  })

  it('offers a lighter start when the muscle keeps running out', () => {
    const d = dataWith(
      session(addDaysISO(TODAY, -9), [CHEST], [note(CHEST, 'fried')]),
      session(addDaysISO(TODAY, -2), [CHEST], [note(CHEST, 'form')]),
    )
    const out = nextSessionSuggestions(d, TODAY)
    expect(out).toHaveLength(1)
    expect(out[0].kind).toBe('start-lighter')
    expect(out[0].exerciseId).toBe(CHEST)
  })

  it('lets pain outrank fatigue on the same movement, one suggestion not two', () => {
    const d = dataWith(
      session(addDaysISO(TODAY, -9), [CHEST], [note(CHEST, 'pain'), note(CHEST, 'fried')]),
      session(addDaysISO(TODAY, -2), [CHEST], [note(CHEST, 'pain'), note(CHEST, 'fried')]),
    )
    const out = nextSessionSuggestions(d, TODAY)
    expect(out.filter((s) => s.exerciseId === CHEST)).toHaveLength(1)
    expect(out[0].kind).toBe('swap')
  })

  it('calls out the muscle, not the movement, once it fails across three of them', () => {
    const d = dataWith(
      session(addDaysISO(TODAY, -9), [QUADS_A], [note(QUADS_A, 'fried')]),
      session(addDaysISO(TODAY, -5), [QUADS_B], [note(QUADS_B, 'fried')]),
      session(addDaysISO(TODAY, -2), [QUADS_C], [note(QUADS_C, 'fried')]),
    )
    const out = nextSessionSuggestions(d, TODAY)
    const quads = out.find((s) => s.kind === 'watch-region' && s.regions[0] === 'quads')
    expect(quads).toBeDefined()
    expect(quads!.count).toBeGreaterThanOrEqual(REGION_WATCH_COUNT)
    expect(quads!.because).toMatch(/3 different movements/)
  })

  it('does not blame a muscle for one movement failing repeatedly', () => {
    const d = dataWith(
      session(addDaysISO(TODAY, -9), [QUADS_A], [note(QUADS_A, 'fried')]),
      session(addDaysISO(TODAY, -5), [QUADS_A], [note(QUADS_A, 'fried')]),
      session(addDaysISO(TODAY, -2), [QUADS_A], [note(QUADS_A, 'fried')]),
    )
    const out = nextSessionSuggestions(d, TODAY)
    expect(out.every((s) => s.kind !== 'watch-region')).toBe(true)
  })

  it('an empty tank names no muscle, because it was never about one', () => {
    const d = dataWith(
      session(addDaysISO(TODAY, -9), [QUADS_A], [note(QUADS_A, 'empty')]),
      session(addDaysISO(TODAY, -5), [QUADS_B], [note(QUADS_B, 'empty')]),
      session(addDaysISO(TODAY, -2), [QUADS_C], [note(QUADS_C, 'empty')]),
    )
    expect(nextSessionSuggestions(d, TODAY).every((s) => s.kind !== 'watch-region')).toBe(true)
  })

  it('forgets notes that have aged out of the window', () => {
    const old = addDaysISO(TODAY, -(RECENT_DAYS + 1))
    const d = dataWith(
      session(old, [QUADS_A], [note(QUADS_A, 'pain')]),
      session(addDaysISO(TODAY, -1), [QUADS_A], [note(QUADS_A, 'pain')]),
    )
    expect(nextSessionSuggestions(d, TODAY)).toEqual([])
  })

  it('ignores anything logged in the future', () => {
    const d = dataWith(
      session(addDaysISO(TODAY, 3), [QUADS_A], [note(QUADS_A, 'pain'), note(QUADS_A, 'pain')]),
    )
    expect(nextSessionSuggestions(d, TODAY)).toEqual([])
  })

  it('puts the serious thing first', () => {
    const d = dataWith(
      session(addDaysISO(TODAY, -9), [CHEST], [note(CHEST, 'fried')]),
      session(addDaysISO(TODAY, -5), [CHEST], [note(CHEST, 'fried')]),
      session(addDaysISO(TODAY, -3), [HAMS], [note(HAMS, 'pain')]),
      session(addDaysISO(TODAY, -2), [HAMS], [note(HAMS, 'pain')]),
    )
    const out = nextSessionSuggestions(d, TODAY)
    expect(out[0].kind).toBe('swap')
    expect(out[0].exerciseId).toBe(HAMS)
  })

  it('every suggestion carries the evidence for it', () => {
    const d = dataWith(
      session(addDaysISO(TODAY, -9), [QUADS_A], [note(QUADS_A, 'fried')]),
      session(addDaysISO(TODAY, -5), [QUADS_B], [note(QUADS_B, 'fried')]),
      session(addDaysISO(TODAY, -2), [QUADS_C], [note(QUADS_C, 'fried')]),
    )
    for (const s of nextSessionSuggestions(d, TODAY)) {
      expect(s.because.length, `${s.kind} shipped without a reason`).toBeGreaterThan(10)
      expect(s.because).not.toMatch(/—/) // no em dashes in anything a user reads
    }
  })
})

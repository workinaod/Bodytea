import { describe, expect, it } from 'vitest'
import type { ResolvedExercise } from '../types'
import { applyReadinessDowngrade } from './transforms'

// ============================================================
// "when i trim you dont actually change the workout for the day
// you give notes to the user thats not how that should work."
//
// Correct, and this is that bug written down. The trim scaled
// the jumping, then set lightMode on every lift and stopped.
// lightMode rendered as a NOTE reading "leave 3 in the tank,
// ~85% of usual weight" while the set count and the prefilled
// weight both stayed exactly where they were. The app did the
// arithmetic in prose and left the athlete to do it for real.
//
// A trimmed day has to be a smaller day. Fewer sets, measured,
// not described.
// ============================================================

function ex(over: Partial<ResolvedExercise> & { exerciseId: string }): ResolvedExercise {
  return {
    name: over.exerciseId,
    kind: 'lift',
    sets: 4,
    repText: '8',
    restSec: 120,
    ...over,
  }
}

/** The Tuesday shape: a jump, three lifts, a core movement, a stretch. */
function day(): ResolvedExercise[] {
  return [
    ex({ exerciseId: 'box-jump', kind: 'jump', sets: 3, repText: '3' }),
    ex({ exerciseId: 'flat-db-press', sets: 4 }),
    ex({ exerciseId: 'romanian-deadlift', sets: 3 }),
    ex({ exerciseId: 'db-lateral-raise', sets: 2 }),
    ex({ exerciseId: 'hanging-leg-raise', kind: 'core', sets: 3 }),
    ex({ exerciseId: 'couch-stretch', kind: 'mobility', sets: 1, repText: '30 sec' }),
  ]
}

const totalSets = (list: ResolvedExercise[]) => list.reduce((n, r) => n + r.sets, 0)

/**
 * Lifting sets only, and the distinction is the whole point. The first
 * version of this guard counted EVERY set and passed against the broken
 * code, because scaling the jumps alone drops the total by one while
 * every lift stays exactly where it was. A guard that green-lights the
 * bug it was written for is worse than no guard.
 */
const liftingSets = (list: ResolvedExercise[]) =>
  list.filter((r) => r.kind === 'lift' || r.kind === 'core' || r.kind === 'carry')
    .reduce((n, r) => n + r.sets, 0)

describe('a trimmed day is a smaller day', () => {
  it('takes sets off the LIFTING, it does not just leave a note', () => {
    const before = day()
    const after = applyReadinessDowngrade(before)
    expect(liftingSets(after), 'the lifts were untouched').toBeLessThan(liftingSets(before))
  })

  it('is a smaller day overall too', () => {
    const before = day()
    expect(totalSets(applyReadinessDowngrade(before))).toBeLessThan(totalSets(before))
  })

  it('cuts a set from every lift that can spare one', () => {
    const after = applyReadinessDowngrade(day())
    const byId = new Map(after.map((r) => [r.exerciseId, r]))
    expect(byId.get('flat-db-press')!.sets).toBe(3)
    expect(byId.get('romanian-deadlift')!.sets).toBe(2)
    expect(byId.get('hanging-leg-raise')!.sets).toBe(2)
  })

  it('never cuts a lift below two working sets, which stops being training', () => {
    const after = applyReadinessDowngrade(day())
    for (const r of after) {
      if (r.kind === 'lift' || r.kind === 'core' || r.kind === 'carry') {
        expect(r.sets, `${r.exerciseId} cut below 2`).toBeGreaterThanOrEqual(2)
      }
    }
    // The two-set lateral raise had nothing to give and keeps what it had.
    expect(after.find((r) => r.exerciseId === 'db-lateral-raise')!.sets).toBe(2)
  })

  it('still takes a third off the jumping', () => {
    const after = applyReadinessDowngrade(day())
    expect(after.find((r) => r.exerciseId === 'box-jump')!.sets).toBe(2)
  })

  it('still flags the lifts light, because the cue is a real instruction', () => {
    const after = applyReadinessDowngrade(day())
    expect(after.find((r) => r.exerciseId === 'flat-db-press')!.lightMode).toBe(true)
  })

  it('leaves mobility alone, because stretching is not the thing making you tired', () => {
    const after = applyReadinessDowngrade(day())
    const stretch = after.find((r) => r.exerciseId === 'couch-stretch')!
    expect(stretch.sets).toBe(1)
    expect(stretch.lightMode).toBeUndefined()
  })

  it('is stable: trimming an already trimmed day does not spiral to nothing', () => {
    const once = applyReadinessDowngrade(day())
    const twice = applyReadinessDowngrade(once)
    for (const r of twice) {
      if (r.kind === 'lift' || r.kind === 'core' || r.kind === 'carry') {
        expect(r.sets).toBeGreaterThanOrEqual(2)
      }
    }
  })
})

import { describe, expect, it } from 'vitest'
import type { SessionLog } from '../types'
import { currentFocusItem, focusProgress, focusQueue, nextFocusItem, restAfter } from './focus'

function session(): SessionLog {
  return {
    date: '2026-08-10',
    templateId: 'monday',
    status: 'partial',
    exercises: [
      {
        exerciseId: 'box-jump', // restSec 180
        sets: [
          { targetReps: '3', reps: 3, done: false },
          { targetReps: '3', reps: 3, done: false },
        ],
      },
      {
        exerciseId: 'goblet-squat', // restSec 150
        sets: [{ targetReps: '6-8', done: false }],
      },
      {
        exerciseId: 'single-leg-calf-raise',
        sets: [{ targetReps: '15-20 / leg', done: false }],
      },
    ],
  }
}

describe('focus queue', () => {
  it('flattens sets in order and finds the current item', () => {
    const s = session()
    expect(focusQueue(s).length).toBe(4)
    expect(currentFocusItem(s)).toEqual({ exIdx: 0, setIdx: 0 })
    s.exercises[0].sets[0].done = true
    expect(currentFocusItem(s)).toEqual({ exIdx: 0, setIdx: 1 })
    expect(focusProgress(s)).toEqual({ done: 1, total: 4 })
  })

  it('skipped exercises and the trimmed tail leave the queue', () => {
    const s = session()
    s.exercises[1].skipped = true
    expect(focusQueue(s).length).toBe(3)
    s.trimmedFromIndex = 2
    expect(focusQueue(s).length).toBe(2)
    expect(focusQueue(s).every((i) => i.exIdx === 0)).toBe(true)
  })

  it('rest is typed: full recovery between jump sets, a bit more on transitions, none after the last', () => {
    const s = session()
    // between box-jump sets → explosive work gets full CNS recovery
    expect(restAfter(s, { exIdx: 0, setIdx: 0 })).toBe(120)
    // between exercises → transition adds a little
    expect(restAfter(s, { exIdx: 0, setIdx: 1 })).toBe(150)
    // after the final set → no break screen
    expect(restAfter(s, { exIdx: 2, setIdx: 0 })).toBe(0)
    expect(nextFocusItem(s, { exIdx: 2, setIdx: 0 })).toBeNull()
  })

  it('a fully-done session has no current item', () => {
    const s = session()
    for (const ex of s.exercises) for (const set of ex.sets) set.done = true
    expect(currentFocusItem(s)).toBeNull()
  })
})

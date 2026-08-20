import { beforeEach, describe, expect, it } from 'vitest'
import type { AppData, SessionLog } from '../types'
import { emptyAppData } from '../types'
import { useAppStore } from '../store/appStore'
import { focusQueue } from '../engine/focus'
import { regionsFor } from '../engine/fatigue'
import { acceptAdaptation, endExercise, endGroupAhead, logFatigue } from './fatigueActions'
import { addDaysISO } from '../engine/calendar'

// ============================================================
// What happens after "I can't finish this".
//
// The rule that shapes all of it: the record of what was
// actually lifted never changes. Ending an exercise keeps the
// sets already done, swapping mid-exercise leaves the completed
// sets with the movement that performed them, and the note is
// written whether or not anything else is.
// ============================================================

const DATE = '2026-08-11'
const SQUAT = 'goblet-squat'
const PRESS = 'flat-db-press'

function session(): SessionLog {
  return {
    date: DATE,
    templateId: 'monday',
    status: 'partial',
    exercises: [
      {
        exerciseId: SQUAT,
        sets: [
          { targetReps: '8', weightLb: 80, reps: 8, done: true },
          { targetReps: '8', weightLb: 80, done: false },
          { targetReps: '8', weightLb: 80, done: false },
        ],
      },
      { exerciseId: PRESS, sets: [{ targetReps: '8', weightLb: 50, done: false }] },
    ],
  }
}

function seed(s: SessionLog = session()): AppData {
  const d = emptyAppData(DATE, DATE)
  d.settings.onboarded = true
  d.sessions[DATE] = s
  useAppStore.setState({ data: d })
  return d
}

const live = () => useAppStore.getState().data.sessions[DATE]

beforeEach(() => {
  useAppStore.setState({ data: emptyAppData(DATE, DATE) })
})

describe('logFatigue', () => {
  it('writes the note with the movement primary regions baked in', () => {
    seed()
    logFatigue(DATE, SQUAT, 'fried', 1)
    const notes = live().fatigue!
    expect(notes).toHaveLength(1)
    expect(notes[0]).toMatchObject({ exerciseId: SQUAT, reason: 'fried', atSetIdx: 1 })
    expect(notes[0].regions).toEqual(regionsFor(SQUAT))
  })

  it('keeps optional detail only when something was actually typed', () => {
    seed()
    logFatigue(DATE, SQUAT, 'pain', 0, '   ')
    logFatigue(DATE, SQUAT, 'pain', 1, '  left knee  ')
    const notes = live().fatigue!
    expect(notes[0].note).toBeUndefined()
    expect(notes[1].note).toBe('left knee')
  })

  it('accumulates rather than overwriting', () => {
    seed()
    logFatigue(DATE, SQUAT, 'fried', 1)
    logFatigue(DATE, PRESS, 'form', 0)
    expect(live().fatigue).toHaveLength(2)
  })
})

describe('endExercise', () => {
  it('keeps every set already logged exactly as it was', () => {
    seed()
    endExercise(DATE, 0)
    expect(live().exercises[0].sets).toHaveLength(3)
    expect(live().exercises[0].sets[0]).toMatchObject({ weightLb: 80, reps: 8, done: true })
  })

  it('takes the rest of that exercise out of the queue, and moves on', () => {
    seed()
    endExercise(DATE, 0)
    const q = focusQueue(live())
    expect(q.every((i) => i.exIdx !== 0)).toBe(true)
    expect(q[0]).toEqual({ exIdx: 1, setIdx: 0 })
  })
})

describe('endGroupAhead', () => {
  it('stands down the later movements that lean on the same muscle', () => {
    const s = session()
    s.exercises.push({ exerciseId: 'bulgarian-split-squat', sets: [{ targetReps: '8', done: false }] })
    seed(s)
    expect(endGroupAhead(DATE, 0)).toBe(1)
    expect(live().exercises[2].skipped).toBe(true)
  })

  it('leaves unrelated work alone', () => {
    const s = session()
    s.exercises.push({ exerciseId: 'bulgarian-split-squat', sets: [{ targetReps: '8', done: false }] })
    seed(s)
    endGroupAhead(DATE, 0)
    expect(live().exercises[1].exerciseId).toBe(PRESS)
    expect(live().exercises[1].skipped).toBeUndefined()
  })

  it('never touches the sets already logged', () => {
    const s = session()
    s.exercises.push({ exerciseId: 'bulgarian-split-squat', sets: [{ targetReps: '8', done: false }] })
    seed(s)
    endGroupAhead(DATE, 0)
    expect(live().exercises[0].sets[0]).toMatchObject({ weightLb: 80, reps: 8, done: true })
  })

  it('reports nothing when the rest of the day asks a different muscle', () => {
    seed()
    expect(endGroupAhead(DATE, 0)).toBe(0)
  })
})

describe('taking or waving away a coach offer leaves a trace', () => {
  // The gap the harness found: every outcome test built its ledger rows
  // by calling adaptDecision directly, so nothing exercised the action
  // that actually writes them. Deleting the write left all of them green.
  beforeEach(() => {
    useAppStore.setState({ data: emptyAppData(DATE, DATE) })
  })

  it('records an acceptance, pre-registered so it can be judged later', () => {
    acceptAdaptation(DATE, 'reduce-volume', 'two short sessions in a fortnight')
    const d = useAppStore.getState().data
    expect(d.adapt[DATE]).toContain('reduce-volume')
    expect(d.decisions).toHaveLength(1)
    const row = d.decisions[0]
    expect(row.type).toBe('adapt')
    expect(row.target).toBe('reduce-volume')
    expect(row.response).toBe('accepted')
    expect(row.ruleVersion).toBe(1)
    expect(row.metricId).toBe('sessionGrade')
    expect(row.windowClosesAt).toBe(addDaysISO(DATE, 14))
  })

  it('records a dismissal as a decline, and registers nothing to judge', () => {
    acceptAdaptation(DATE, 'dismissed')
    const row = useAppStore.getState().data.decisions[0]
    expect(row.response).toBe('declined')
    expect(row.windowClosesAt).toBeUndefined()
    expect(row.metricId).toBeUndefined()
  })

  it('keeps the plan and the ledger as separate things', () => {
    // The prescription reads `adapt` and nothing else. The ledger is read
    // by the offering policy and the outcome engine, and by nothing that
    // prescribes: a recorded decline must not move a load.
    acceptAdaptation(DATE, 'hold-load')
    const d = useAppStore.getState().data
    expect(d.adapt[DATE]).toEqual(['hold-load'])
    expect(d.decisions[0].target).toBe('hold-load')
  })
})

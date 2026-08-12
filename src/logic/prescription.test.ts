import { beforeEach, describe, expect, it } from 'vitest'
import type { AppData, SessionLog } from '../types'
import { emptyAppData } from '../types'
import { useAppStore } from '../store/appStore'
import { prefillFor } from './prescription'

// ============================================================
// The load has to actually move.
//
// engine/reps.ts climbs the reps and wraps back to the bottom of
// the range once the top is cleared, on the stated understanding
// that "the weight is going up instead". Nothing was putting it
// up. So the prescription cycled 8 to 12 and back to 8 at the
// same weight, forever: a progression in name, a treadmill in
// fact. These tests are that bug, written down.
// ============================================================

const TODAY = '2026-08-17'
const LAST_WEEK = '2026-08-10'

const SQUAT = 'goblet-squat' // lower body, 10 lb step
const PRESS = 'flat-db-press' // upper body, 5 lb step

function seed(session: SessionLog): AppData {
  const d = emptyAppData(LAST_WEEK, LAST_WEEK)
  d.settings.onboarded = true
  d.sessions[session.date] = session
  useAppStore.setState({ data: d })
  return d
}

/** Last week's work: `sets` sets at `target` reps and `weightLb`, all done or not. */
function lastWeek(exerciseId: string, target: number, weightLb: number, cleared = true): SessionLog {
  return {
    date: LAST_WEEK,
    templateId: 'monday',
    status: 'completed',
    exercises: [
      {
        exerciseId,
        sets: [0, 1, 2].map((i) => ({
          targetReps: String(target),
          weightLb,
          reps: cleared ? target : target - 2,
          done: cleared || i === 0,
        })),
      },
    ],
  }
}

beforeEach(() => {
  useAppStore.setState({ data: emptyAppData(LAST_WEEK, LAST_WEEK) })
})

describe('prefillFor: the load at the top of the range', () => {
  it('puts the weight up when the reps wrapped', () => {
    seed(lastWeek(SQUAT, 8, 80))
    expect(prefillFor(TODAY, SQUAT, { repRange: { low: 6, high: 8 } }).weightLb).toBe(90)
  })

  it('leaves the weight alone while there are still reps to climb', () => {
    seed(lastWeek(SQUAT, 6, 80))
    expect(prefillFor(TODAY, SQUAT, { repRange: { low: 6, high: 8 } }).weightLb).toBe(80)
  })

  it('leaves the weight alone when the top was not cleared', () => {
    seed(lastWeek(SQUAT, 8, 80, false))
    expect(prefillFor(TODAY, SQUAT, { repRange: { low: 6, high: 8 } }).weightLb).toBe(80)
  })

  it('steps upper body by 5 and lower body by 10', () => {
    seed(lastWeek(PRESS, 12, 50))
    expect(prefillFor(TODAY, PRESS, { repRange: { low: 8, high: 12 } }).weightLb).toBe(55)
  })

  it('does nothing at all for a fixed prescription, which has no top to reach', () => {
    seed(lastWeek(SQUAT, 8, 80))
    expect(prefillFor(TODAY, SQUAT).weightLb).toBe(80)
  })

  it('pays a good week once, in reps or in load, never both', () => {
    // The legacy per-exercise feel chip adds 5 lb on its own. Landing that
    // on top of a wrap would charge the same good week twice.
    const s = lastWeek(SQUAT, 8, 80)
    s.exercises[0].feel = 'easy'
    seed(s)
    expect(prefillFor(TODAY, SQUAT, { repRange: { low: 6, high: 8 } }).weightLb).toBe(90)
  })

  it('still lets the feel chip move the weight when no wrap happened', () => {
    const s = lastWeek(SQUAT, 6, 80)
    s.exercises[0].feel = 'easy'
    seed(s)
    expect(prefillFor(TODAY, SQUAT, { repRange: { low: 6, high: 8 } }).weightLb).toBe(85)
  })

  it('climbs week over week rather than sitting still', () => {
    // Two cycles of clearing the top: the whole point is that this number
    // is bigger at the end than at the start.
    const first = prefillFor(TODAY, SQUAT, { repRange: { low: 6, high: 8 } })
    seed(lastWeek(SQUAT, 8, 80))
    const second = prefillFor(TODAY, SQUAT, { repRange: { low: 6, high: 8 } })
    expect(second.weightLb!).toBeGreaterThan(80)
    expect(second.weightLb!).toBeGreaterThan(first.weightLb ?? 0)
  })
})

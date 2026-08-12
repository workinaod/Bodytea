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

describe('prefillFor: a light day is actually lighter', () => {
  it('takes the weight down, it does not just say it did', () => {
    seed(lastWeek(SQUAT, 6, 100))
    const full = prefillFor(TODAY, SQUAT).weightLb!
    const light = prefillFor(TODAY, SQUAT, { lightMode: true }).weightLb!
    expect(light, 'light mode changed nothing').toBeLessThan(full)
  })

  it('lands on a real plate step', () => {
    seed(lastWeek(SQUAT, 6, 100))
    expect(prefillFor(TODAY, SQUAT, { lightMode: true }).weightLb! % 5).toBe(0)
  })

  it('takes the wrap step first, then eases it, so a light day is still lighter', () => {
    seed(lastWeek(SQUAT, 8, 100))
    const normal = prefillFor(TODAY, SQUAT, { repRange: { low: 6, high: 8 } }).weightLb!
    const light = prefillFor(TODAY, SQUAT, { repRange: { low: 6, high: 8 }, lightMode: true }).weightLb!
    expect(normal).toBe(110)
    expect(light).toBeLessThan(normal)
  })

  it('eases the day-one seed too, not just weights read from history', () => {
    useAppStore.setState({ data: emptyAppData(LAST_WEEK, LAST_WEEK) })
    const full = prefillFor(TODAY, SQUAT).weightLb
    const light = prefillFor(TODAY, SQUAT, { lightMode: true }).weightLb
    if (full !== undefined) expect(light!).toBeLessThan(full)
  })
})

describe('prefillFor: the one session check-in drives the load', () => {
  it('a heavy day that was CLEARED holds everything, up and down', () => {
    // Earned, but a day that took everything you had is not the day to
    // ask for more. Without the check-in this would wrap and add 10.
    const s = lastWeek(SQUAT, 8, 100)
    s.feel = 'heavy'
    seed(s)
    expect(prefillFor(TODAY, SQUAT, { repRange: { low: 6, high: 8 } }).weightLb).toBe(100)
  })

  it('only takes weight off when a heavy day also fell short', () => {
    const s = lastWeek(SQUAT, 6, 100, false)
    s.feel = 'heavy'
    seed(s)
    expect(prefillFor(TODAY, SQUAT, { repRange: { low: 6, high: 8 } }).weightLb).toBe(90)
  })

  it('a miss on a day that felt fine is a bad day, not a reason to deload', () => {
    const s = lastWeek(SQUAT, 6, 100, false)
    s.feel = 'right'
    seed(s)
    expect(prefillFor(TODAY, SQUAT, { repRange: { low: 6, high: 8 } }).weightLb).toBe(100)
  })

  it('never walks the load down to nothing, however bad the run', () => {
    // Five straight heavy misses used to end at 0 lb, which is not a
    // prescription. One step is the floor.
    let w = 25
    for (let i = 0; i < 8; i++) {
      const s = lastWeek(PRESS, 8, w, false)
      s.feel = 'heavy'
      seed(s)
      w = prefillFor(TODAY, PRESS, { repRange: { low: 8, high: 12 } }).weightLb!
    }
    expect(w).toBe(5)
  })

  it('light and right let the rep ladder do the work, without a second raise', () => {
    for (const feel of ['light', 'right'] as const) {
      const s = lastWeek(SQUAT, 6, 100)
      s.feel = feel
      seed(s)
      expect(prefillFor(TODAY, SQUAT, { repRange: { low: 6, high: 8 } }).weightLb, feel).toBe(100)
    }
  })

  it('a light day still takes the wrap step when the top was cleared', () => {
    const s = lastWeek(SQUAT, 8, 100)
    s.feel = 'light'
    seed(s)
    expect(prefillFor(TODAY, SQUAT, { repRange: { low: 6, high: 8 } }).weightLb).toBe(110)
  })

  it('the session answer overrules the old per-exercise chip', () => {
    const s = lastWeek(SQUAT, 6, 100)
    s.feel = 'right'
    s.exercises[0].feel = 'easy' // legacy signal, would have added 5
    seed(s)
    expect(prefillFor(TODAY, SQUAT, { repRange: { low: 6, high: 8 } }).weightLb).toBe(100)
  })

  it('still honours the old chip on history logged before the question existed', () => {
    const s = lastWeek(SQUAT, 6, 100)
    s.exercises[0].feel = 'easy'
    seed(s) // no session-level feel at all
    expect(prefillFor(TODAY, SQUAT, { repRange: { low: 6, high: 8 } }).weightLb).toBe(105)
  })
})

describe('an accepted "hold the load"', () => {
  // The wrap is what pays the progression: reaching the top of the rep
  // range is the moment the weight goes up. Holding cancels exactly that
  // and nothing else.
  function withHistory(hold: boolean) {
    const d = emptyAppData('2026-08-03', '2026-08-10')
    d.settings.onboarded = true
    // Last session cleared the TOP of 6-8, which earns the load step.
    d.sessions['2026-08-03'] = {
      date: '2026-08-03',
      templateId: 'monday',
      status: 'completed',
      exercises: [
        {
          exerciseId: 'goblet-squat',
          sets: [
            { targetReps: '8', reps: 8, weightLb: 50, done: true },
            { targetReps: '8', reps: 8, weightLb: 50, done: true },
          ],
        },
      ],
    }
    if (hold) d.adapt['2026-08-10'] = ['hold-load']
    useAppStore.setState({ data: d })
    return prefillFor('2026-08-10', 'goblet-squat', { repRange: { low: 6, high: 8 } })
  }

  it('climbs normally when nothing was accepted', () => {
    expect(withHistory(false).weightLb).toBeGreaterThan(50)
  })

  it('stays put when the athlete took the offer', () => {
    expect(withHistory(true).weightLb).toBe(50)
  })
})

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

// ============================================================
// The other direction, found by simulating twenty people for
// twenty weeks rather than by reading the code.
//
// Every reducer in here reads a baseline out of the log and
// returns a smaller number. Write that smaller number back into
// the log as an ordinary working set and it becomes the next
// baseline, which gets reduced again. Nothing in a single session
// looks wrong; the shape only appears over months.
//
// It walked an overhead press from 90 lb to 5 and a barbell row
// from 130 to nothing, one honest bad set at a time, for an
// athlete who kept turning up. Which is the same failure the
// comments above already swore off, arriving through a door
// nobody had shut.
// ============================================================

describe('a run of hard weeks', () => {
  /** Someone who trains every week and misses the target on every set. */
  function grind(weeks: number): number[] {
    const d = emptyAppData('2026-01-05', '2026-01-05')
    d.settings.onboarded = true
    useAppStore.setState({ data: d })
    const seen: number[] = []
    let weight = 100
    for (let w = 0; w < weeks; w++) {
      const date = `2026-01-${String(5 + w * 7).padStart(2, '0')}`
      if (w > 0) {
        const pre = prefillFor(date, PRESS, { repRange: { low: 8, high: 12 } })
        weight = pre.weightLb ?? weight
        seen.push(weight)
      }
      useAppStore.getState().update((s) => {
        s.sessions[date] = {
          date,
          templateId: 'monday',
          status: 'completed',
          exercises: [
            {
              exerciseId: PRESS,
              sets: [0, 1, 2].map(() => ({
                targetReps: '10',
                weightLb: weight,
                reps: 10,
                achieved: 6, // short, every set, every week
                done: true,
              })),
            },
          ],
        } as SessionLog
      })
    }
    return seen
  }

  it('never walks the working weight down to nothing', () => {
    const seen = grind(12)
    expect(Math.min(...seen), `weights were ${seen.join(', ')}`).toBeGreaterThan(0)
  })

  it('stays in a band instead of compounding downwards', () => {
    // A back-off is allowed, and so is a run of them. What is not allowed
    // is each one being taken off the last one's output forever. Four
    // months of missing every set should find a floor and sit near it,
    // not converge on nothing.
    const seen = grind(16)
    expect(Math.min(...seen), `weights were ${seen.join(', ')}`).toBeGreaterThanOrEqual(25)
  })

  it('never softens a single visit past sixty percent of its baseline', () => {
    // The proportional floor: whatever the reductions add up to, one
    // prescription is never below round5(0.6 x the weight it was read
    // from). The old floor was one load step, which on a light dumbbell
    // movement was a fifth of the working weight.
    const seen = [100, ...grind(16)]
    for (let i = 1; i < seen.length; i++) {
      const floor = Math.round((seen[i - 1] * 0.6) / 5) * 5
      expect(seen[i], `week ${i}: ${seen[i - 1]} fell to ${seen[i]}`).toBeGreaterThanOrEqual(
        Math.min(seen[i - 1], floor),
      )
    }
  })

  it('floors a failing lift coming off a layoff at sixty percent, not one step', () => {
    // Both reducers at once: the failing flag wants dropTo, the layoff
    // wants three steps back. On a 25 lb press the old one-step floor
    // let that compose to 5 lb, a fifth of the working weight. The
    // proportional floor holds the line at 60% of the baseline.
    const d = emptyAppData('2026-01-05', '2026-01-05')
    d.settings.onboarded = true
    for (let i = 0; i < 3; i++) {
      const date = `2026-01-${String(5 + i * 3).padStart(2, '0')}`
      d.sessions[date] = {
        date,
        templateId: 'monday',
        status: 'completed',
        exercises: [
          {
            exerciseId: PRESS,
            sets: [0, 1, 2].map(() => ({ targetReps: '10', weightLb: 25, reps: 10, achieved: 6, done: true })),
          },
        ],
      } as SessionLog
    }
    useAppStore.setState({ data: d })
    const pre = prefillFor('2026-04-15', PRESS, { repRange: { low: 8, high: 12 } })
    expect(pre.softened).toBe(true)
    expect(pre.weightLb).toBe(10)
  })

  it('can still recover, so the floor is not a trap', () => {
    // The series has to go up somewhere. A number that only ever falls is
    // the spiral wearing a floor.
    const seen = grind(16)
    const rose = seen.some((w, i) => i > 0 && w > seen[i - 1])
    expect(rose, `weights were ${seen.join(', ')}`).toBe(true)
  })
})

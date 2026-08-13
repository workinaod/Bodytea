import { describe, expect, it } from 'vitest'
import {
  bmiOf,
  canRealisticallyDunk,
  DUNK_MIN_HEIGHT_IN,
  dunkVertNeededIn,
  leadingGoal,
  MAX_TRAINABLE_VERT_IN,
  standingReachIn,
  suggestedDays,
  suggestedMeals,
} from './reach'
import { GOAL_CHIPS, visibleGoalChips } from '../screens/onboarding/onboardingData'
import { heightAdjustmentKcal, REFERENCE_HEIGHT_IN } from './sportsNutrition'
import { buildNutrition } from './generator'

// ============================================================
// The onboarding adapting to the person walking through it.
//
// The rule these all serve: an answer given on screen two has to
// change screen three. Anything less is a form that fades in.
// ============================================================

describe('what a rim actually asks of you', () => {
  it('knows how much vertical each height needs', () => {
    // 120" rim, hand a couple of inches over, standing reach 1.33× height.
    expect(dunkVertNeededIn(72)).toBeCloseTo(122 - 95.76, 1)
    // Taller needs less, and the gap is big: six inches of height is
    // eight inches of vertical, which is the difference between a goal
    // and a fantasy.
    expect(dunkVertNeededIn(66) - dunkVertNeededIn(72)).toBeCloseTo(6 * 1.33, 1)
  })

  it('offers the goal to people it is real for and not to people it is not', () => {
    expect(canRealisticallyDunk(74)).toBe(true) // 6'2"
    expect(canRealisticallyDunk(70)).toBe(true) // 5'10"
    expect(canRealisticallyDunk(64)).toBe(false) // 5'4" — needs 36"
    expect(canRealisticallyDunk(62)).toBe(false)
  })

  it('draws the line where the vertical stops being trainable', () => {
    // Not a number somebody picked: it falls out of the rim height and
    // the biggest vertical a non-elite adult reaches.
    expect(dunkVertNeededIn(DUNK_MIN_HEIGHT_IN)).toBeCloseTo(MAX_TRAINABLE_VERT_IN, 6)
    expect(DUNK_MIN_HEIGHT_IN).toBeGreaterThan(66)
    expect(DUNK_MIN_HEIGHT_IN).toBeLessThan(70)
  })

  it('says nothing at all when it does not know the height', () => {
    expect(canRealisticallyDunk(undefined)).toBe(false)
    expect(standingReachIn(72)).toBeCloseTo(95.76, 2)
  })
})

describe('the goals it puts on the screen', () => {
  const DUNK = GOAL_CHIPS.findIndex((c) => c.requires === 'dunk')

  it('shows the dunk goal to somebody tall enough, and to nobody else', () => {
    expect(visibleGoalChips({ heightIn: 76, weightLb: 190 })).toContain(DUNK)
    expect(visibleGoalChips({ heightIn: 62, weightLb: 130 })).not.toContain(DUNK)
  })

  it('never hides a goal on the basis of weight', () => {
    // Ordering is a nudge. Removing options because of somebody's weight
    // would be the app deciding what they are allowed to want.
    const heavy = visibleGoalChips({ heightIn: 70, weightLb: 300 })
    const light = visibleGoalChips({ heightIn: 70, weightLb: 120 })
    expect(new Set(heavy)).toEqual(new Set(light))
  })

  it('leads with losing weight at a clinically obese BMI, and building at underweight', () => {
    const heavy = visibleGoalChips({ heightIn: 70, weightLb: 220 }) // BMI 31.6
    expect(GOAL_CHIPS[heavy[0]].goal).toBe('lean')
    const light = visibleGoalChips({ heightIn: 70, weightLb: 125 }) // BMI 17.9
    expect(GOAL_CHIPS[light[0]].goal).toBe('muscle')
  })

  it('leaves the order alone for everybody in between', () => {
    const mid = visibleGoalChips({ heightIn: 70, weightLb: 165 }) // BMI 23.7
    expect(GOAL_CHIPS[mid[0]].goal).toBe(GOAL_CHIPS[0].goal)
  })

  it('returns positions in the real list, so a stored answer never drifts', () => {
    // The chip a user picks is stored as an index. If this rebuilt the
    // list per person, the same saved answer would mean different goals
    // for different people.
    for (const body of [{ heightIn: 76 }, { heightIn: 62 }, { heightIn: 70, weightLb: 240 }]) {
      for (const i of visibleGoalChips(body)) expect(GOAL_CHIPS[i]).toBeTruthy()
    }
  })

  it('still knows what to do with no body at all', () => {
    expect(visibleGoalChips({}).length).toBeGreaterThan(5)
  })
})

describe('the numbers height actually moves', () => {
  it('leaves somebody of average height exactly where they were', () => {
    // The whole point of a correction rather than a replacement: nobody
    // average changes, so height only ever adds information.
    expect(heightAdjustmentKcal(REFERENCE_HEIGHT_IN.male, 'male')).toBe(0)
    expect(heightAdjustmentKcal(REFERENCE_HEIGHT_IN.female, 'female')).toBe(0)
  })

  it('feeds a tall person more than a short one at the same weight', () => {
    const tall = buildNutrition('muscle', 180, 'male', {}, 77)
    const short = buildNutrition('muscle', 180, 'male', {}, 64)
    expect(tall.kcalTraining).toBeGreaterThan(short.kcalTraining)
    expect(tall.kcalTraining - short.kcalTraining).toBeGreaterThanOrEqual(150)
  })

  it('never lets height shout down the bodyweight it is correcting', () => {
    expect(Math.abs(heightAdjustmentKcal(90, 'female'))).toBeLessThanOrEqual(250)
    expect(Math.abs(heightAdjustmentKcal(48, 'male'))).toBeLessThanOrEqual(250)
  })

  it('ignores a height that cannot be one', () => {
    expect(heightAdjustmentKcal(0, 'male')).toBe(0)
    expect(heightAdjustmentKcal(undefined, 'male')).toBe(0)
    expect(heightAdjustmentKcal(200, 'male')).toBe(0)
  })

  it('measures BMI the way everyone else does', () => {
    expect(bmiOf(180, 70)).toBeCloseTo(25.8, 1)
    expect(bmiOf(undefined, 70)).toBeNull()
    expect(leadingGoal(165, 70)).toBeNull()
  })
})

describe('the defaults that follow the goal', () => {
  it('starts a runner on more days than somebody rebuilding a habit', () => {
    expect(suggestedDays('endurance')).toBe(5)
    expect(suggestedDays('general')).toBe(3)
  })

  it('reads the deadline answer, not just the goal', () => {
    expect(suggestedDays('lean', { deadline: 'No date' })).toBe(3)
    expect(suggestedDays('lean', { deadline: 'A few months' })).toBe(4)
  })

  it('splits the day up for somebody trying to eat more, and not for a cut', () => {
    // Gaining is an appetite problem; cutting is the opposite one.
    expect(suggestedMeals('muscle')).toBe(5)
    expect(suggestedMeals('lean')).toBe(3)
  })
})

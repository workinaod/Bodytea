import { describe, expect, it } from 'vitest'
import { buildNutrition } from './nutritionPlan'

// ============================================================
// Does the answer reach the number.
//
// bmr.test.ts proves the models are the published equations. This file
// proves the app actually asks them, which is the half that has been
// missing: age has been collected in onboarding since day one and read
// by one screen, and the tape flow has been feeding a chart and nothing
// else. An equation nobody calls is not a fix.
// ============================================================

const male = { sex: 'male' } as const

describe('age reaches the calorie target', () => {
  it('separates a 22 year old from a 55 year old at the same weight', () => {
    const young = buildNutrition('general', 190, 'male', {}, 70, { ageYears: 22 })
    const older = buildNutrition('general', 190, 'male', {}, 70, { ageYears: 55 })
    expect(young.kcalTraining).toBeGreaterThan(older.kcalTraining)
  })

  it('is the reason the number moves at all', () => {
    // Sever the one field and the athlete becomes somebody we know
    // nothing about, at both ends of the range.
    const without = buildNutrition('general', 190, 'male', {}, 70, {})
    for (const ageYears of [22, 55]) {
      expect(buildNutrition('general', 190, 'male', {}, 70, { ageYears }).kcalTraining, `age ${ageYears}`)
        .not.toBe(without.kcalTraining)
    }
  })

  it('leaves an athlete we know nothing else about exactly where they were', () => {
    // The heuristic branch is unchanged on purpose. Nobody's target moves
    // without new information about them.
    const n = buildNutrition('general', 180, 'male', {})
    expect(n.kcalTraining).toBe(2700 + 100) // bw x 15, plus the general-goal adjustment

    // Asserted WITH a height too, because the height nudge moves in 25s
    // and the fallback lands on a multiple of 50. Rounding the fallback
    // one more time deletes the nudge, which is a moved target for
    // somebody who told us nothing new, and a version of this test
    // without a height cannot see it happen.
    const tall = buildNutrition('vertical', 180, 'male', {}, 70, {})
    expect(tall.kcalTraining).toBe(2700 + 25 + 200)
    expect(tall.kcalRest).toBe(2700 + 25 + 200 - 300)
  })
})

describe('the correction that matters', () => {
  it('stops telling a 320 lb man his maintenance is 4,875', () => {
    const guessed = buildNutrition('lean', 320, 'male', { 'lose-amount': '30 to 60 lb' }, 72, {})
    const modelled = buildNutrition('lean', 320, 'male', { 'lose-amount': '30 to 60 lb' }, 72, { ageYears: 38 })
    // The weight is clamped to 330 either way, so this is the model
    // swapping, not the input changing.
    expect(modelled.kcalTraining).toBeLessThan(guessed.kcalTraining - 800)
    // and it is still a plan somebody can eat, not a crash diet
    expect(modelled.kcalTraining).toBeGreaterThan(2000)
  })
})

describe('the movement answer', () => {
  const known = { ageYears: 30 }

  it('moves the number it was collected to move', () => {
    const sitting = buildNutrition('general', 190, 'male', { 'day-movement': 'Sitting' }, 70, known)
    const moving = buildNutrition('general', 190, 'male', { 'day-movement': 'Always moving' }, 70, known)
    expect(sitting.kcalTraining).toBeLessThan(moving.kcalTraining)
  })

  it('is not charged twice once the multiplier already contains it', () => {
    // The old code took 50 kcal off a sitting cut. That subtraction now
    // fires only on the heuristic branch, because everywhere else the
    // same answer is already inside the activity multiplier.
    const sitting = buildNutrition('lean', 190, 'male', { 'day-movement': 'Sitting' }, 70, known)
    const unanswered = buildNutrition('lean', 190, 'male', {}, 70, known)
    expect(unanswered.kcalTraining - sitting.kcalTraining).not.toBe(50)

    // and on the heuristic branch it still does its old job
    const sittingRough = buildNutrition('lean', 190, 'male', { 'day-movement': 'Sitting' }, 70, {})
    const unansweredRough = buildNutrition('lean', 190, 'male', {}, 70, {})
    expect(unansweredRough.kcalTraining - sittingRough.kcalTraining).toBe(50)
  })
})

describe('the tape reaches it too', () => {
  it('feeds two people at the same weight differently once one is measured', () => {
    const lean = buildNutrition('general', 190, 'male', {}, 70, { ageYears: 30, bodyFatPct: 12 })
    const heavier = buildNutrition('general', 190, 'male', {}, 70, { ageYears: 30, bodyFatPct: 30 })
    expect(lean.kcalTraining).toBeGreaterThan(heavier.kcalTraining)
  })

  it('overrides the height-and-age model when it arrives', () => {
    const noTape = buildNutrition('general', 190, 'male', {}, 70, { ageYears: 30 })
    const taped = buildNutrition('general', 190, 'male', {}, 70, { ageYears: 30, bodyFatPct: 12 })
    expect(taped.kcalTraining).not.toBe(noTape.kcalTraining)
  })
})

describe('the training week reaches it', () => {
  it('feeds six sessions more than three', () => {
    const three = buildNutrition('muscle', 190, 'male', {}, 70, { ageYears: 30, sessionsPerWeek: 3 })
    const six = buildNutrition('muscle', 190, 'male', {}, 70, { ageYears: 30, sessionsPerWeek: 6 })
    expect(six.kcalTraining).toBeGreaterThan(three.kcalTraining)
  })

  it('still floors every athlete, whichever model answered', () => {
    // plan/kcalFloor.ts is downstream of all of this and stays load-bearing.
    for (const body of [{}, { ageYears: 30 }, { ageYears: 30, bodyFatPct: 12 }]) {
      const n = buildNutrition('lean', 95, 'female', { 'lose-amount': 'More than that' }, 60, body)
      expect(n.kcalTraining, JSON.stringify(body)).toBeGreaterThanOrEqual(1500)
      expect(n.kcalRest, JSON.stringify(body)).toBeGreaterThanOrEqual(1200)
    }
  })

  it('keeps protein on the same evidence base whichever model answered', () => {
    const a = buildNutrition('lean', 190, male.sex, { 'lose-amount': '10 to 30 lb' }, 70, {})
    const b = buildNutrition('lean', 190, male.sex, { 'lose-amount': '10 to 30 lb' }, 70, { ageYears: 30, bodyFatPct: 15 })
    expect(a.proteinTargetG).toBe(b.proteinTargetG)
  })
})

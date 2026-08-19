import { describe, expect, it } from 'vitest'
import { emptyAppData, type AppData, type SessionLog } from '../types'
import { buildNutrition } from '../plan/nutritionPlan'
import { addDaysISO } from './calendar'
import { applyRecheck, learnedCopy, nutritionRecheck } from './nutritionRecheck'

// ============================================================
// Most of this file is about staying quiet.
//
// A coaching app that offers to change your calories every time you step
// on a scale is noise, and noise is how a real suggestion gets ignored.
// So the cases that must produce nothing outnumber the cases that must
// produce something, on purpose.
// ============================================================

const TODAY = '2026-08-31'

/** An account whose plan was built for a 200 lb, 30 year old man at 5'10". */
function built(over: Partial<{ ageYears: number; bodyFatPct: number; sessionsPerWeek: number }> = {}): AppData {
  const d = emptyAppData('2026-06-01')
  d.settings.onboarded = true
  d.profile = { bfFormula: 'male', heightIn: 70, age: over.ageYears ?? 30 }
  d.plan.goal = 'lean'
  d.plan.goalAnswers = {}
  // Pinned so the completed-vs-planned test cannot pass by coincidence.
  d.plan.daysPerWeek = 6
  const n = buildNutrition('lean', 200, 'male', {}, 70, {
    ageYears: over.ageYears ?? 30,
    bodyFatPct: over.bodyFatPct,
    sessionsPerWeek: over.sessionsPerWeek ?? 4,
  })
  d.plan.nutrition = { kcalTraining: n.kcalTraining, kcalRest: n.kcalRest }
  d.plan.nutritionBasis = n.basis
  d.measurements = []
  return d
}

function weighIn(d: AppData, daysAgo: number, lb: number): AppData {
  d.measurements.push({ date: addDaysISO(TODAY, -daysAgo), weightLb: lb, photoIds: {} })
  return d
}

function taped(d: AppData, daysAgo: number, pct: number): AppData {
  d.measurements.push({ date: addDaysISO(TODAY, -daysAgo), bodyFatPct: pct, photoIds: {} })
  return d
}

function trainedOn(d: AppData, daysAgo: number): AppData {
  const date = addDaysISO(TODAY, -daysAgo)
  d.sessions[date] = {
    date,
    templateId: 't',
    status: 'done',
    exercises: [{ exerciseId: 'back-squat', sets: [{ targetReps: '8', done: true, reps: 8 }] }],
  } as unknown as SessionLog
  return d
}

describe('it stays quiet', () => {
  it('when nothing has happened since the plan was built', () => {
    expect(nutritionRecheck(built(), TODAY)).toBeNull()
  })

  it('when the plan predates the record of what its number came from', () => {
    // Every existing account is this account. Guessing what it used to
    // know would be worse than saying nothing.
    const d = built()
    delete d.plan.nutritionBasis
    weighIn(d, 1, 160)
    expect(nutritionRecheck(d, TODAY)).toBeNull()
  })

  it('when the scale moved by a normal day of water', () => {
    const d = built()
    weighIn(d, 1, 202)
    expect(nutritionRecheck(d, TODAY)).toBeNull()
  })

  it('when the plan has no record of what its number came from at all', () => {
    const d = built()
    d.plan.nutrition = { kcalTraining: 2000, kcalRest: 1700 }
    delete d.plan.nutritionBasis
    weighIn(d, 1, 160)
    expect(nutritionRecheck(d, TODAY)).toBeNull()
  })

  it('after the offer is declined, until something moves again', () => {
    // Declining keeps the number and stamps today's knowledge on it.
    // Saying no once must not mute the app through the next forty pounds.
    const d = built()
    weighIn(d, 1, 170)
    const declined = nutritionRecheck(d, TODAY)!
    d.plan.nutritionBasis = declined.basis // "keep mine", the card's other button
    expect(nutritionRecheck(d, TODAY)).toBeNull()
    expect(d.plan.nutrition.kcalTraining).toBe(declined.current.kcalTraining)

    // and forty pounds later it speaks again
    weighIn(d, 0, 130)
    const again = nutritionRecheck(d, TODAY)
    expect(again).not.toBeNull()
    expect(again!.learned).toContain('weight')
  })

  it('when a real weight change moves the number by less than a meal', () => {
    // Ten pounds up is genuinely new information and it does reach the
    // arithmetic: the model says 50 kcal. Fifty kcal is a rounding step,
    // not news, and interrupting somebody for it spends the credibility
    // the 250 kcal case needs.
    //
    // Asserted against the number this case actually produces, because a
    // version of this test at 203 lb passes with a delta of ZERO, which
    // would still pass with the threshold deleted.
    const d = built()
    weighIn(d, 1, 210)
    const wouldBe = buildNutrition('lean', 210, 'male', {}, 70, { ageYears: 30, sessionsPerWeek: 4 })
    expect(wouldBe.kcalTraining - d.plan.nutrition.kcalTraining).toBe(50)
    expect(nutritionRecheck(d, TODAY)).toBeNull()
  })
})

describe('a number the athlete set themselves', () => {
  it('is still re-offered once the body it was set for has changed', () => {
    // A target typed at 200 lb is a deliberate decision. It is also not
    // advice at 170. Owner call: offer it again.
    const d = built()
    d.plan.nutrition = { kcalTraining: 2000, kcalRest: 1700 }
    weighIn(d, 1, 170)
    const r = nutritionRecheck(d, TODAY)
    expect(r).not.toBeNull()
    expect(r!.athleteSet).toBe(true)
    expect(r!.current.kcalTraining).toBe(2000)
  })

  it('is offered in different words, because it is theirs', () => {
    const d = built()
    d.plan.nutrition = { kcalTraining: 2000, kcalRest: 1700 }
    weighIn(d, 1, 170)
    const r = nutritionRecheck(d, TODAY)!
    expect(learnedCopy(r.learned, r.athleteSet)).toBe('You set this one. Since then the scale has moved.')
    expect(learnedCopy(r.learned, false)).toBe('Since then the scale has moved.')
  })

  it('is left alone until something actually moves', () => {
    const d = built()
    d.plan.nutrition = { kcalTraining: 2000, kcalRest: 1700 }
    expect(nutritionRecheck(d, TODAY)).toBeNull()
  })

  it('is not claimed as BodyT s when BodyT did build it', () => {
    const d = built()
    weighIn(d, 1, 170)
    expect(nutritionRecheck(d, TODAY)!.athleteSet).toBe(false)
  })
})

describe('it speaks when something real changed', () => {
  it('after thirty pounds, because the target was sized for a bigger body', () => {
    const d = built()
    weighIn(d, 1, 170)
    const r = nutritionRecheck(d, TODAY)
    expect(r).not.toBeNull()
    expect(r!.learned).toContain('weight')
    expect(r!.deltaTraining).toBeLessThan(0)
    expect(r!.suggested.kcalTraining).toBeLessThan(r!.current.kcalTraining)
  })

  it('after a tape reading, which is the whole reason the model exists', () => {
    // This is the case that could not happen at all before this file: the
    // estimator lives on the Progress screen, days after the plan is built.
    const d = built()
    weighIn(d, 2, 200)
    taped(d, 1, 12)
    const r = nutritionRecheck(d, TODAY)
    expect(r).not.toBeNull()
    expect(r!.learned).toContain('tape')
    expect(r!.basis.model).toBe('katch-mcardle')
    // A lean 200 lb man burns more than the height-and-age model assumed
    expect(r!.deltaTraining).toBeGreaterThan(0)
  })

  it('when the training week is not the one the plan assumed', () => {
    const d = built({ sessionsPerWeek: 6 })
    weighIn(d, 1, 200)
    for (const daysAgo of [2, 5, 9, 12, 16, 19, 23, 26]) trainedOn(d, daysAgo)
    const r = nutritionRecheck(d, TODAY)
    expect(r).not.toBeNull()
    expect(r!.learned).toContain('week')
    // eight sessions in 28 days is two a week, not six
    expect(r!.deltaTraining).toBeLessThan(0)
  })

  it('counts what was completed, never what was planned', () => {
    // The plan says six days. Three were actually done in four weeks. A
    // calculator that reads the plan hands this athlete a six-day
    // appetite, which is the single most common way calculators lie.
    const d = built({ sessionsPerWeek: 6 })
    weighIn(d, 1, 200)
    for (const daysAgo of [3, 10, 17]) trainedOn(d, daysAgo)
    const r = nutritionRecheck(d, TODAY)
    expect(r).not.toBeNull()
    expect(r!.basis.sessionsPerWeek).toBe(1)
    expect(r!.deltaTraining).toBeLessThan(0)
  })

  it('says nothing about a week it has not seen', () => {
    const planned = built({ sessionsPerWeek: 6 })
    weighIn(planned, 1, 200)
    expect(nutritionRecheck(planned, TODAY)).toBeNull()
  })
})

describe('taking the suggestion', () => {
  it('hands back the new number and the record of what made it', () => {
    const d = built()
    weighIn(d, 2, 200)
    taped(d, 1, 12)
    const r = nutritionRecheck(d, TODAY)!
    const applied = applyRecheck(d, TODAY)!
    expect(applied.nutrition).toEqual(r.suggested)
    expect(applied.nutritionBasis).toEqual(r.basis)
    expect(applied.nutritionBasis.bodyFatPct).toBe(12)
  })

  it('settles: taking it once leaves nothing to suggest', () => {
    // The offer must converge. An engine that re-offers what you just
    // accepted is worse than one that never offered.
    const d = built()
    weighIn(d, 2, 200)
    taped(d, 1, 12)
    const applied = applyRecheck(d, TODAY)!
    d.plan.nutrition = applied.nutrition
    d.plan.nutritionBasis = applied.nutritionBasis
    expect(nutritionRecheck(d, TODAY)).toBeNull()
  })

  it('offers nothing to apply when there is nothing to suggest', () => {
    expect(applyRecheck(built(), TODAY)).toBeNull()
  })
})

describe('saying why', () => {
  it('does not credit the tape for a change the tape did not make', () => {
    // Thirty pounds down, and a body-fat reading a fifth of a point off
    // the last one. The number moved because of the scale. Saying "you
    // measured" here is a small lie, and it is the kind that teaches
    // somebody the app is guessing.
    //
    // This is the assertion that makes REAL_BF_CHANGE_PCT load-bearing:
    // the threshold never changes the calorie number, because the
    // meaningful-kcal gate always fires first at any real bodyweight. It
    // only decides whether the explanation is true.
    const d = built({ bodyFatPct: 20 })
    weighIn(d, 2, 170)
    taped(d, 1, 20.2)
    const r = nutritionRecheck(d, TODAY)!
    expect(r.learned).toContain('weight')
    expect(r.learned).not.toContain('tape')
    expect(learnedCopy(r.learned)).toBe('Since then the scale has moved.')
  })

  it('names the thing that moved, not the calculation', () => {
    expect(learnedCopy(['weight'])).toBe('Since then the scale has moved.')
    expect(learnedCopy(['tape'])).toBe('Since then you measured.')
    expect(learnedCopy(['weight', 'tape'])).toBe('Since then the scale has moved and you measured.')
    expect(learnedCopy(['weight', 'tape', 'week'])).toBe(
      'Since then the scale has moved, you measured and your week changed.',
    )
  })

  it('never renders a number with nothing to say for it', () => {
    const d = built()
    weighIn(d, 2, 200)
    taped(d, 1, 12)
    expect(learnedCopy(nutritionRecheck(d, TODAY)!.learned)).not.toBe('')
  })
})

import { describe, expect, it } from 'vitest'
import { loggableTemplates } from './mealActions'
import type { MealTemplateDef } from '../types'

// ============================================================
// The bug this file exists for: a meal you saved was invisible
// at the moment you wanted to eat it.
//
// "My plan" filed every new meal under the training day whatever
// day it actually was, and the log sheet offers the meals for the
// day you are IN. So on a rest day you could type a meal in, watch
// it appear on the plan screen, walk to the fridge, open the log
// sheet, and find it gone. Nothing was lost; it was filed one tab
// over. That is worse than losing it, because the app looked like
// it was working.
//
// Two halves to the fix, and this covers the half that is logic:
// which templates a given day should offer. The other half is the
// plan screen opening on the day you are in, which is a prop.
// ============================================================

const t = (id: string, dayType: 'training' | 'rest'): MealTemplateDef => ({
  id,
  dayType,
  slot: 'Meal',
  name: id,
  detail: '',
  proteinG: 40,
  kcal: 500,
})

describe('which plan meals a day offers', () => {
  const both = [t('train-1', 'training'), t('train-2', 'training'), t('rest-1', 'rest')]

  it('offers the day you are in, which is the whole rule almost always', () => {
    const rest = loggableTemplates(both, 'rest')
    expect(rest.list.map((m) => m.id)).toEqual(['rest-1'])
    expect(rest.borrowed).toBe(false)

    const training = loggableTemplates(both, 'training')
    expect(training.list.map((m) => m.id)).toEqual(['train-1', 'train-2'])
    expect(training.borrowed).toBe(false)
  })

  it('does not pad a real day out with the other day', () => {
    // A rest day with one meal written shows one meal. Topping it up
    // from the training day would hand somebody a 700 kcal plate on a
    // day their target is 300 lower, which is the opposite of a plan.
    const { list, borrowed } = loggableTemplates(both, 'rest')
    expect(list).toHaveLength(1)
    expect(borrowed).toBe(false)
  })

  it('stands the other day in rather than showing an empty section', () => {
    // The path here is a button we offer: "clear these and build yours"
    // wipes both days, and people write the day they train first.
    const trainingOnly = [t('train-1', 'training')]
    const { list, borrowed } = loggableTemplates(trainingOnly, 'rest')
    expect(list.map((m) => m.id)).toEqual(['train-1'])
    expect(borrowed).toBe(true)
  })

  it('flags the stand-in so the sheet can say whose food this is', () => {
    // Silently relabelling a training day's meals as today's plan would
    // be a lie the user has no way to catch.
    expect(loggableTemplates([t('r', 'rest')], 'rest').borrowed).toBe(false)
    expect(loggableTemplates([t('r', 'rest')], 'training').borrowed).toBe(true)
  })

  it('has nothing to borrow from an empty plan, and says so', () => {
    const { list, borrowed } = loggableTemplates([], 'training')
    expect(list).toEqual([])
    // Not "borrowed" — there is nothing to borrow. The sheet needs to
    // fall through to search and custom entry, not print a header over
    // an empty list.
    expect(borrowed).toBe(false)
  })
})

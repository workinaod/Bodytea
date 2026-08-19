import { describe, expect, it } from 'vitest'
import { analyzeRoutine } from './analyze'
import { generatePlan } from './generator'
import { byorNutrition, makeEmptyByorPlan, normalizeBooklet, primaryGoalOf, validateBooklet } from './bookletOps'
import type { PlanConfig, RoutineGoal, TemplateEntry } from '../types'
import { emptyAppData, defaultWeekState } from '../types'
import { resolveDay } from '../engine/resolveDay'
import { addDaysISO } from '../engine/calendar'

const fixed = (exerciseId: string, sets = 3, repText = '10'): TemplateEntry => ({
  entry: 'fixed', exerciseId, sets, repText, repsNum: Number(repText) || undefined,
})

function byorWith(
  days: { wd: number; title: string; entries: TemplateEntry[]; cns?: boolean }[],
  routineGoals: RoutineGoal[] = ['maintain'],
  whyWorks?: string,
): PlanConfig {
  const { plan } = makeEmptyByorPlan({ routineGoals, goalStatement: 'test my routine', customTargets: [], bodyweightLb: 180, whyWorks })
  for (const d of days) {
    const id = `day-${d.wd}`
    plan.templates[id] = { id, title: d.title, tagline: '', kind: 'session', cns: d.cns, entries: d.entries }
    plan.tier1ByWeekday[d.wd as 0] = id
  }
  return normalizeBooklet(plan)
}

describe('analyzeRoutine', () => {
  it('flags an all-press routine and missing hinge', () => {
    const plan = byorWith([
      { wd: 1, title: 'Chest', entries: [fixed('flat-db-press', 4), fixed('incline-db-press', 4), fixed('push-up', 3)] },
      { wd: 4, title: 'Legs', entries: [fixed('goblet-squat', 4), fixed('leg-press', 4)] },
    ])
    const ids = analyzeRoutine(plan).map((n) => n.id)
    expect(ids).toContain('zero-pull')
    expect(ids).toContain('no-hinge')
    // Renamed from 'deload-auto' when the deload stopped being automatic
    // on a routine the athlete built. The note is an OFFER now, and this
    // screen is the honest read of their week, so the copy has to match
    // what the engine actually does on week 4.
    expect(ids).toContain('deload-offer')
    expect(ids).not.toContain('deload-auto')
  })

  it('praises a balanced routine', () => {
    const plan = byorWith([
      { wd: 1, title: 'Upper', entries: [fixed('flat-db-press', 4), fixed('one-arm-db-row', 4), fixed('ez-bar-curl', 3)] },
      { wd: 3, title: 'Lower', entries: [fixed('goblet-squat', 4), fixed('db-rdl', 4), fixed('plank-side-plank', 3)] },
    ])
    const notes = analyzeRoutine(plan)
    expect(notes.find((n) => n.id === 'push-pull-balanced')?.tone).toBe('good')
    expect(notes.find((n) => n.id === 'hinge-present')?.tone).toBe('good')
  })

  it('calls out an athleticism goal with no jump/sprint training', () => {
    const plan = byorWith(
      [{ wd: 1, title: 'Legs', entries: [fixed('goblet-squat', 4), fixed('db-rdl', 4)] }],
      ['athletic'],
    )
    expect(analyzeRoutine(plan).find((n) => n.id === 'no-explosive')?.tone).toBe('warn')
  })

  it('reads the goal COMBINATION: recomp, cut, maintenance', () => {
    const day = [{ wd: 1, title: 'Full', entries: [fixed('goblet-squat', 4), fixed('db-rdl', 4), fixed('one-arm-db-row', 3)] }]
    const recomp = analyzeRoutine(byorWith(day, ['muscle', 'lose-weight']))
    expect(recomp.find((n) => n.id === 'recomp')?.tone).toBe('info')
    expect(recomp.some((n) => n.id === 'cut-fuel')).toBe(false)

    expect(analyzeRoutine(byorWith(day, ['lose-weight'])).some((n) => n.id === 'cut-fuel')).toBe(true)
    expect(analyzeRoutine(byorWith(day, ['maintain'])).some((n) => n.id === 'maintain-mode')).toBe(true)
    expect(analyzeRoutine(byorWith(day, ['maintain', 'athletic'])).some((n) => n.id === 'maintain-mode')).toBe(false)
  })

  it('multi-goal nutrition: surplus, deficit, and near-maintenance recomp', () => {
    // 180 lb → base 2700
    expect(byorNutrition(['muscle'], 180).kcalTraining).toBe(3000)
    expect(byorNutrition(['lose-weight'], 180).kcalTraining).toBe(2300)
    expect(byorNutrition(['muscle', 'lose-weight'], 180).kcalTraining).toBe(2600)
    expect(byorNutrition(['maintain'], 180).kcalTraining).toBe(2700)
    expect(byorNutrition(['muscle'], 180).proteinTargetG).toBe(180)
  })

  it('collapses the multi-select onto a primary goal for the engine', () => {
    expect(primaryGoalOf(['athletic', 'muscle'])).toBe('general')
    expect(primaryGoalOf(['muscle', 'lose-weight'])).toBe('muscle')
    expect(primaryGoalOf(['lose-weight'])).toBe('lean')
    expect(primaryGoalOf(['maintain'])).toBe('general')
  })

  it('reads their "why it works" answer: overload, consistency, or on-record fallback', () => {
    const day = [{ wd: 1, title: 'Full', entries: [fixed('goblet-squat', 4), fixed('db-rdl', 4)] }]
    const overload = analyzeRoutine(byorWith(day, ['maintain'], 'my bench keeps going up because I add weight'))
    expect(overload.find((n) => n.id === 'why-overload')?.tone).toBe('good')

    const consistency = analyzeRoutine(byorWith(day, ['maintain'], 'I never miss because it fits my shifts'))
    expect(consistency.find((n) => n.id === 'why-consistency')?.tone).toBe('good')

    const vibes = analyzeRoutine(byorWith(day, ['maintain'], 'the vibes are simply right'))
    expect(vibes.find((n) => n.id === 'why-noted')?.text).toContain('the vibes are simply right')

    expect(analyzeRoutine(byorWith(day, ['maintain'])).some((n) => n.id.startsWith('why-'))).toBe(false)
  })

  it('flags 7 training days and marathon days', () => {
    const days = Array.from({ length: 7 }, (_, wd) => ({
      wd,
      title: `Day ${wd}`,
      entries: [fixed('push-up', 10), fixed('goblet-squat', 10), fixed('one-arm-db-row', 10)],
    }))
    const notes = analyzeRoutine(byorWith(days))
    expect(notes.some((n) => n.id === 'no-rest-day')).toBe(true)
    expect(notes.some((n) => n.id.startsWith('marathon-'))).toBe(true)
  })
})

describe('booklet normalize + validate', () => {
  it('validateBooklet catches empty weeks and thin days', () => {
    const { plan } = makeEmptyByorPlan({ routineGoals: ['maintain'], goalStatement: 'x', customTargets: [], bodyweightLb: 180 })
    expect(validateBooklet(plan)).toContain('Add at least one training day to the week.')
    plan.templates['day-1'] = { id: 'day-1', title: 'Push', tagline: '', kind: 'session', entries: [fixed('push-up')] }
    plan.tier1ByWeekday[1] = 'day-1'
    expect(validateBooklet(plan).some((p) => p.includes('needs at least 2 exercises'))).toBe(true)
  })

  it('normalize regenerates tiers, anchors, tracked lifts, and the plan resolves', () => {
    const plan = byorWith([
      { wd: 1, title: 'Power', cns: true, entries: [fixed('box-jump', 4, '3'), fixed('goblet-squat', 4), fixed('pogo-hop', 3, '20')] },
      { wd: 3, title: 'Full', entries: [fixed('db-rdl', 4), fixed('flat-db-press', 3), fixed('one-arm-db-row', 3)] },
    ], ['athletic'])

    expect(plan.templates['t2-lower']).toBeDefined()
    expect(plan.templates['t2-upper']).toBeDefined()
    expect(plan.templates['t3-fullbody']).toBeDefined()
    expect(plan.templates['t3-explosive']).toBeDefined()
    expect(plan.anchors.cnsWeekdays).toEqual([1])
    expect(plan.trackedLifts.length).toBeGreaterThanOrEqual(2)
    expect(plan.daysPerWeek).toBe(2)
    for (const id of ['box-jump', 'goblet-squat', 'db-rdl']) {
      expect(plan.rationale[id]).toContain('test my routine')
    }

    // The assembled booklet drives the whole engine across tiers
    const START = '2026-08-10'
    for (const tier of [1, 2, 3] as const) {
      const data = emptyAppData(START, START, plan)
      const week = defaultWeekState(START)
      week.tier = tier
      week.tierPickedAt = 'x'
      data.weeks[START] = week
      for (let d = 0; d < 28; d++) {
        expect(() => resolveDay(addDaysISO(START, d), data)).not.toThrow()
      }
    }
  })

  it('normalize over a GENERATED plan (fine-tune commit path) still resolves', () => {
    const { plan } = generatePlan({
      goal: 'vertical',
      goalStatement: 'dunk by June',
      customTargets: [],
      daysPerWeek: 6,
      equipProfile: 'home-db',
      extraEquip: [],
      experience: 'returning',
      bodyweightLb: 180,
    })
    // Simulate a fine-tune edit: rename + drop one entry from the biggest day
    const draft = structuredClone(plan)
    draft.name = 'My Dunk Plan'
    const firstDay = Object.values(draft.tier1ByWeekday).find(Boolean)!
    draft.templates[firstDay].entries = draft.templates[firstDay].entries.slice(0, -1)
    expect(validateBooklet(draft)).toEqual([])

    const normalized = normalizeBooklet(draft)
    expect(normalized.name).toBe('My Dunk Plan')
    expect(normalized.anchors.cnsWeekdays.length).toBeGreaterThan(0)

    const START = '2026-08-10'
    for (const tier of [1, 2, 3] as const) {
      const data = emptyAppData(START, START, normalized)
      const week = defaultWeekState(START)
      week.tier = tier
      week.tierPickedAt = 'x'
      data.weeks[START] = week
      for (let d = 0; d < 28; d++) {
        expect(() => resolveDay(addDaysISO(START, d), data)).not.toThrow()
      }
    }
  })
})

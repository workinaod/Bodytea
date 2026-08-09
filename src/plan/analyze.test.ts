import { describe, expect, it } from 'vitest'
import { analyzeRoutine } from './analyze'
import { generatePlan } from './generator'
import { makeEmptyByorPlan, normalizeBooklet, validateBooklet } from './bookletOps'
import type { PlanConfig, TemplateEntry } from '../types'
import { emptyAppData, defaultWeekState } from '../types'
import { resolveDay } from '../engine/resolveDay'
import { addDaysISO } from '../engine/calendar'

const fixed = (exerciseId: string, sets = 3, repText = '10'): TemplateEntry => ({
  entry: 'fixed', exerciseId, sets, repText, repsNum: Number(repText) || undefined,
})

function byorWith(days: { wd: number; title: string; entries: TemplateEntry[]; cns?: boolean }[], goal: Parameters<typeof makeEmptyByorPlan>[0] = 'general'): PlanConfig {
  const { plan } = makeEmptyByorPlan(goal, 'test my routine', [], 180)
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
    expect(ids).toContain('deload-auto')
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

  it('calls out a jump goal with no jump training', () => {
    const plan = byorWith(
      [{ wd: 1, title: 'Legs', entries: [fixed('goblet-squat', 4), fixed('db-rdl', 4)] }],
      'vertical',
    )
    expect(analyzeRoutine(plan).find((n) => n.id === 'no-explosive')?.tone).toBe('warn')
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
    const { plan } = makeEmptyByorPlan('general', 'x', [], 180)
    expect(validateBooklet(plan)).toContain('Add at least one training day to the week.')
    plan.templates['day-1'] = { id: 'day-1', title: 'Push', tagline: '', kind: 'session', entries: [fixed('push-up')] }
    plan.tier1ByWeekday[1] = 'day-1'
    expect(validateBooklet(plan).some((p) => p.includes('needs at least 2 exercises'))).toBe(true)
  })

  it('normalize regenerates tiers, anchors, tracked lifts — and the plan resolves', () => {
    const plan = byorWith([
      { wd: 1, title: 'Power', cns: true, entries: [fixed('box-jump', 4, '3'), fixed('goblet-squat', 4), fixed('pogo-hop', 3, '20')] },
      { wd: 3, title: 'Full', entries: [fixed('db-rdl', 4), fixed('flat-db-press', 3), fixed('one-arm-db-row', 3)] },
    ], 'vertical')

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

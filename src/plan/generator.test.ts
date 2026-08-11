import { describe, expect, it } from 'vitest'
import { buildNutrition, deepGoalStrategy, generatePlan, GOAL_FOLLOWUPS, ownedTags, type OnboardingAnswers } from './generator'
import { canDo } from './equip'
import { EXERCISES } from './exercises'
import { planConfigSchema } from '../store/schema'
import { emptyAppData, defaultWeekState, type Goal } from '../types'
import { resolveDay } from '../engine/resolveDay'
import { addDaysISO } from '../engine/calendar'

// ============================================================
// Generator invariants: every combination of goal × days ×
// equipment must produce a booklet that validates, resolves
// every day of a 16-week phase at every tier, respects the
// user's equipment, and only references fully-supported
// exercises (guide + muscles + demo).
// ============================================================

const GOALS: Goal[] = ['vertical', 'speed', 'muscle', 'strength', 'lean', 'general']
const DAYS = [3, 4, 5, 6] as const
const PROFILES = ['gym', 'home-db', 'minimal'] as const
const START = '2026-08-10' // Monday

function answersFor(goal: Goal, daysPerWeek: (typeof DAYS)[number], equipProfile: (typeof PROFILES)[number]): OnboardingAnswers {
  return {
    goal,
    goalStatement: `test goal for ${goal}`,
    customTargets: [],
    daysPerWeek,
    equipProfile,
    extraEquip: [],
    experience: 'returning',
    bodyweightLb: 180,
  }
}

describe('generator invariants (6 goals × 4 day-counts × 3 equip profiles)', () => {
  for (const goal of GOALS) {
    for (const days of DAYS) {
      for (const profile of PROFILES) {
        it(`${goal} / ${days}d / ${profile}`, async () => {
          const a = answersFor(goal, days, profile)
          const { plan, proteinTargetG } = generatePlan(a)
          const owned = ownedTags(a)

          // Schema-valid
          const parsed = planConfigSchema.safeParse(plan)
          expect(parsed.success, JSON.stringify(parsed.success ? '' : parsed.error.issues[0])).toBe(true)
          expect(proteinTargetG).toBeGreaterThanOrEqual(120)

          // Training-day count matches the ask
          const trainingDays = Object.values(plan.tier1ByWeekday).filter(Boolean).length
          expect(trainingDays, 'training days').toBe(days)

          // Every referenced exercise exists, is equipment-legal, and has full support
          const { musclesFor } = await import('./muscles')
          const { EXERCISE_DEMOS } = await import('./demos')
          const referenced = new Set<string>()
          for (const t of Object.values(plan.templates)) {
            for (const e of t.entries) {
              if (e.entry === 'fixed') referenced.add(e.exerciseId)
              else if (e.entry === 'slot') {
                for (const b of [1, 2, 3] as const) {
                  const id = plan.slots[b][e.slot]
                  expect(id, `${goal}/${days}/${profile}: slot ${e.slot} block ${b}`).toBeTruthy()
                  referenced.add(id)
                }
              } else {
                referenced.add(e.a.exerciseId)
                referenced.add(e.b.exerciseId)
              }
            }
            for (const i of t.minViable?.items ?? []) referenced.add(i.exerciseId)
          }
          for (const c of plan.cardioOptions) referenced.add(c.exerciseId)
          for (const id of referenced) {
            expect(EXERCISES[id], `unknown exercise ${id}`).toBeDefined()
            expect(canDo(id, owned), `${id} not doable with ${profile}`).toBe(true)
            expect(musclesFor(id).primary.length, `${id} muscles`).toBeGreaterThanOrEqual(1)
            expect(EXERCISE_DEMOS[id], `${id} demo`).toBeDefined()
            expect(plan.rationale[id], `${id} rationale`).toBeTruthy()
          }

          // CNS structure
          expect(plan.anchors.cnsWeekdays.length).toBeLessThanOrEqual(2)
          if (plan.anchors.cnsWeekdays.length === 2) {
            const [x, y] = [...plan.anchors.cnsWeekdays].sort((p, q) => p - q)
            expect(y - x, 'CNS days ≥48h apart').toBeGreaterThanOrEqual(2)
          }

          // The full phase resolves at every tier without throwing or duplicating
          for (const tier of [1, 2, 3] as const) {
            const data = emptyAppData(START, START, plan)
            for (let w = 0; w < 16; w++) {
              const monday = addDaysISO(START, w * 7)
              const week = defaultWeekState(monday)
              week.tier = tier
              week.tierPickedAt = 'x'
              data.weeks[monday] = week
            }
            for (let d = 0; d < 16 * 7; d++) {
              const r = resolveDay(addDaysISO(START, d), data)
              const ids = r.exercises.map((e) => e.exerciseId)
              expect(new Set(ids).size, `${r.date} tier ${tier} dup`).toBe(ids.length)
              for (const e of r.exercises) {
                expect(canDo(e.exerciseId, owned), `${r.date}: resolved ${e.exerciseId} not legal for ${profile}`).toBe(true)
              }
              if (r.isDeload && r.kind === 'session') {
                // deload halves lifting sets: nothing above ceil(orig/2) of recipe max (5 → 3)
                for (const e of r.exercises) {
                  if (e.kind === 'lift') expect(e.sets, `${r.date} deload sets`).toBeLessThanOrEqual(3)
                }
              }
            }
          }

          // Session templates keep a fallback-able minimum
          for (const t of Object.values(plan.templates)) {
            if (t.kind === 'session') expect(t.entries.length, `${t.id} entries`).toBeGreaterThanOrEqual(2)
          }
        })
      }
    }
  }
})

describe('generated meal plans (v10)', () => {
  const GOALS = ['vertical', 'speed', 'muscle', 'strength', 'lean', 'general'] as const
  for (const goal of GOALS) {
    it(`${goal}: templates sum to the user's own targets`, () => {
      const { plan, proteinTargetG } = generatePlan({
        goal,
        goalStatement: 'test',
        customTargets: [],
        daysPerWeek: 4,
        equipProfile: 'gym',
        extraEquip: [],
        experience: 'returning',
        bodyweightLb: 180,
      })
      const mp = plan.mealPlan
      for (const dt of ['training', 'rest'] as const) {
        const day = mp.templates.filter((t) => t.dayType === dt)
        expect(day.length).toBeGreaterThanOrEqual(4)
        const p = day.reduce((s, t) => s + t.proteinG, 0)
        const k = day.reduce((s, t) => s + t.kcal, 0)
        const kcalTarget = dt === 'training' ? plan.nutrition.kcalTraining : plan.nutrition.kcalRest
        expect(Math.abs(p - proteinTargetG)).toBeLessThanOrEqual(12)
        expect(Math.abs(k - kcalTarget)).toBeLessThanOrEqual(60)
      }
      expect(mp.templates.some((t) => t.slot === 'Breakfast')).toBe(true)
      expect(mp.grocery.length).toBeGreaterThanOrEqual(3)
      expect(mp.supplements.length).toBeGreaterThanOrEqual(1)
      expect(new Set(mp.templates.map((t) => t.id)).size).toBe(mp.templates.length)
    })
  }
})

describe('focus areas + diet + skippable meals', () => {
  const base: Omit<OnboardingAnswers, 'goal'> = {
    goalStatement: 'test',
    customTargets: [],
    daysPerWeek: 4,
    equipProfile: 'gym',
    extraEquip: [],
    experience: 'returning',
    bodyweightLb: 180,
  }

  it('picked focus areas get direct accessory work with a personal rationale', () => {
    const { plan } = generatePlan({ ...base, goal: 'muscle', focusAreas: ['arms', 'glutes'] })
    const fixedIds = Object.values(plan.templates)
      .flatMap((t) => t.entries)
      .map((e) => ('exerciseId' in e ? e.exerciseId : ''))
    expect(['ez-bar-curl', 'hammer-curl', 'incline-db-curl', 'chin-up'].some((id) => fixedIds.includes(id))).toBe(true)
    expect(['hip-thrust', 'glute-bridge'].some((id) => fixedIds.includes(id))).toBe(true)
    const personal = Object.values(plan.rationale).filter((r) => r.includes('you asked for direct'))
    expect(personal.length).toBeGreaterThanOrEqual(2)
  })

  it('focus work never lands on a max-effort day', () => {
    const { plan } = generatePlan({ ...base, goal: 'vertical', focusAreas: ['arms'] })
    for (const t of Object.values(plan.templates)) {
      if (!t.cns) continue
      const ids = t.entries.map((e) => ('exerciseId' in e ? e.exerciseId : ''))
      expect(['ez-bar-curl', 'hammer-curl', 'incline-db-curl'].some((id) => ids.includes(id))).toBe(false)
    }
  })

  it('vegan diet + skipped meals flow into the plan', () => {
    const { plan } = generatePlan({ ...base, goal: 'muscle', dietStyle: 'vegan', skipMeals: true })
    expect(plan.dietStyle).toBe('vegan')
    expect(plan.mealPlan.templates).toEqual([])
    expect(plan.mealPlan.grocery.find((g) => g.category === 'Protein')!.items.join(' ')).toMatch(/tofu/i)
  })
})

describe('block periodization + sex-aware nutrition', () => {
  const base2: Omit<OnboardingAnswers, 'goal'> = {
    goalStatement: 'test',
    customTargets: [],
    daysPerWeek: 4,
    equipProfile: 'gym',
    extraEquip: [],
    experience: 'returning',
    bodyweightLb: 180,
  }

  it('rep schemes wave across the three blocks for main lift slots', () => {
    const { plan } = generatePlan({ ...base2, goal: 'strength' })
    const w = plan.slotRepsByBlock!.squatVariation!
    expect(w[1]!.repText).not.toBe(w[2]!.repText)
    expect(w[2]!.repText).not.toBe(w[3]!.repText)
    for (const s of ['press1', 'rowVariation', 'hamstring']) expect(plan.slotRepsByBlock![s]).toBeTruthy()
  })

  it('two different people, same goal → different block-2 exercise picks somewhere', () => {
    const a = generatePlan({ ...base2, goal: 'muscle', goalStatement: 'gain 20 pounds muscle' }).plan
    const b = generatePlan({ ...base2, goal: 'muscle', goalStatement: 'put on size for football', bodyweightLb: 205 }).plan
    const diff = Object.keys(a.slots[2]).some((s) => a.slots[2][s] !== b.slots[2][s])
    expect(diff).toBe(true)
    // determinism: same person → same booklet
    const a2 = generatePlan({ ...base2, goal: 'muscle', goalStatement: 'gain 20 pounds muscle' }).plan
    expect(a.slots).toEqual(a2.slots)
  })

  it('female baseline runs a notch lower on calories, protein unchanged', () => {
    const m = buildNutrition('muscle', 160, 'male')
    const f = buildNutrition('muscle', 160, 'female')
    expect(f.kcalTraining).toBeLessThan(m.kcalTraining)
    expect(f.proteinTargetG).toBe(m.proteinTargetG)
  })
})

describe('goal follow-ups deepen the plan', () => {
  it('a bigger cut and a desk job lower the lean calorie target', () => {
    const base = buildNutrition('lean', 200)
    const deep = buildNutrition('lean', 200, undefined, {
      'lose-amount': '30+ lb',
      'day-movement': 'Mostly sitting',
    })
    expect(deep.kcalTraining).toBe(base.kcalTraining - 200)
    expect(deep.kcalRest).toBeGreaterThanOrEqual(1400)
  })

  it('lean strategy covers insulin, inflammation and gut, plus the tap answers', () => {
    const n = buildNutrition('lean', 200)
    const s = deepGoalStrategy('lean', { 'food-struggle': 'Late-night eating' }, n).join(' ')
    expect(s).toContain('insulin')
    expect(s).toContain('inflammation')
    expect(s).toContain('gut')
    expect(s).toContain('late night')
    expect(s).not.toContain('—')
  })

  it('answers ride along on the generated plan', () => {
    const a: OnboardingAnswers = {
      goal: 'lean',
      goalStatement: 'lose 30 lb by summer',
      customTargets: [],
      daysPerWeek: 4,
      equipProfile: 'gym',
      extraEquip: [],
      experience: 'returning',
      bodyweightLb: 220,
      goalAnswers: { 'lose-amount': '30+ lb' },
    }
    const { plan, strategy } = generatePlan(a)
    expect(plan.goalAnswers?.['lose-amount']).toBe('30+ lb')
    expect(strategy.length).toBeGreaterThanOrEqual(3)
  })
})

describe('the deep-goal framework covers every goal family', () => {
  const GOALS = ['lean', 'muscle', 'strength', 'vertical', 'speed', 'general'] as const

  it('every goal asks 3 follow-ups and answers deepen the strategy', () => {
    const n = buildNutrition('general', 180)
    for (const g of GOALS) {
      expect(GOAL_FOLLOWUPS[g].length).toBe(3)
      const base = deepGoalStrategy(g, {}, n)
      expect(base.length).toBeGreaterThanOrEqual(3)
      // answering every question adds personal lines (up to the cap)
      const all: Record<string, string> = {}
      for (const fq of GOAL_FOLLOWUPS[g]) all[fq.id] = fq.options[0]
      const deep = deepGoalStrategy(g, all, n)
      expect(deep.length).toBeGreaterThanOrEqual(base.length)
      // never drown the preview
      expect(deep.length).toBeLessThanOrEqual(6)
      // zero em dashes in any combination
      for (const fq of GOAL_FOLLOWUPS[g])
        for (const o of fq.options)
          expect(deepGoalStrategy(g, { [fq.id]: o }, n).join(' ')).not.toContain('—')
    }
  })

  it('strength strategy adapts to training age', () => {
    const n = buildNutrition('strength', 190)
    expect(deepGoalStrategy('strength', { 'training-age': '3+ years' }, n).join(' ')).toContain('waves')
    expect(deepGoalStrategy('strength', { 'training-age': 'Under a year' }, n).join(' ')).toContain('golden window')
  })

  it('a never-jumped athlete gets a genuinely lighter explosive start', () => {
    const base: OnboardingAnswers = {
      goal: 'vertical',
      goalStatement: 'dunk by summer',
      customTargets: [],
      daysPerWeek: 6,
      equipProfile: 'gym',
      extraEquip: [],
      experience: 'new',
      bodyweightLb: 175,
    }
    const std = generatePlan(base).plan
    const gentle = generatePlan({ ...base, goalAnswers: { 'jump-history': 'Never' } }).plan
    const countSets = (p: typeof std) =>
      Object.values(p.templates)
        .flatMap((t) => t.entries)
        .reduce((s, e) => (e.entry === 'fixed' ? s + e.sets : s), 0)
    expect(countSets(gentle)).toBeLessThan(countSets(std))
    expect(deepGoalStrategy('vertical', { 'jump-history': 'Never' }, buildNutrition('vertical', 175)).join(' ')).toContain('set lighter')
  })
})

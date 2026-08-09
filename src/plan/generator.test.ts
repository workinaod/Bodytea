import { describe, expect, it } from 'vitest'
import { generatePlan, ownedTags, type OnboardingAnswers } from './generator'
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

import { describe, expect, it } from 'vitest'
import type { EquipTag } from '../types'
import { buildNaodPreset } from './presets/naod'
import { swapCandidatesFor } from './subs'
import { canDo, equipFor } from './equip'
import { athleticFor } from './athletic'
import { EXERCISES } from './exercises'

// ============================================================
// The 🔄 swap must preserve the training slot's intent and the
// user's equipment reality, for every exercise it offers on.
// ============================================================

const LEVEL_ORDER = { foundation: 0, intermediate: 1, advanced: 2 } as const

describe('swapCandidatesFor', () => {
  const plan = buildNaodPreset()

  it('slot exercises offer their own block rotation first', () => {
    // goblet-squat is the squatVariation slot's block-1 pick
    const subs = swapCandidatesFor('goblet-squat', plan)
    expect(subs.slice(0, 2)).toEqual(['db-front-squat', 'heels-elevated-goblet'])
  })

  it('never offers the exercise itself, duplicates, or unknown ids', () => {
    for (const id of ['goblet-squat', 'countermovement-jump', 'romanian-deadlift', 'lateral-raise']) {
      const subs = swapCandidatesFor(id, plan)
      expect(subs).not.toContain(id)
      expect(new Set(subs).size).toBe(subs.length)
      for (const s of subs) expect(EXERCISES[s]).toBeDefined()
      expect(subs.length).toBeLessThanOrEqual(6)
    }
  })

  it('respects the plan equipment for every candidate', () => {
    const bodyweight = { ...plan, equipment: ['open-space'] as EquipTag[] }
    const owned = new Set<EquipTag>(['none', 'open-space'])
    for (const id of ['front-squat', 'romanian-deadlift', 'pull-up', 'countermovement-jump']) {
      for (const s of swapCandidatesFor(id, bodyweight)) {
        expect(canDo(s, owned), `${id} → ${s} needs ${equipFor(s).join(',')}`).toBe(true)
      }
    }
  })

  it('athletic drills never swap to a harder level', () => {
    for (const id of ['snap-down-stick', 'countermovement-jump', 'pogo-hop', 'lateral-bound-stick']) {
      const mine = athleticFor(id)!
      for (const s of swapCandidatesFor(id, plan)) {
        const meta = athleticFor(s)
        if (meta) {
          expect(
            LEVEL_ORDER[meta.level],
            `${id} (${mine.level}) offered harder ${s} (${meta.level})`,
          ).toBeLessThanOrEqual(LEVEL_ORDER[mine.level])
        }
      }
    }
  })

  it('sprint work only ever swaps to sprint-kind work, never easy cardio', () => {
    for (const s of swapCandidatesFor('max-velocity-sprint', plan)) {
      expect(EXERCISES[s].kind).toBe('sprint')
    }
  })

  it('excludes exercises already in the day', () => {
    const subs = swapCandidatesFor('goblet-squat', plan, ['db-front-squat'])
    expect(subs).not.toContain('db-front-squat')
    expect(subs[0]).toBe('heels-elevated-goblet')
  })

  it('returns nothing for unknown exercises', () => {
    expect(swapCandidatesFor('not-a-real-exercise', plan)).toEqual([])
  })
})

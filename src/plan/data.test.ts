import { describe, expect, it } from 'vitest'
import { EXERCISES } from './exercises'
import { TEMPLATES, TIER1_BY_WEEKDAY, TIER_ROLE_TEMPLATES, CARDIO_OPTIONS } from './templates'
import { BLOCK_SLOTS, SLOT_REPTEXT_OVERRIDES, CORE_MOVERS, TRACKED_LIFTS } from './blocks'
import { FOODS, MEAL_TEMPLATES } from './foods'
import { MESSAGE_POOLS } from './messages'
import { RECOVERY_POOLS, SLEEP_TIPS, EAT_NOW, REST_DAY_CARDS } from './debrief'
import { KCAL_TRAINING, KCAL_REST } from '../types'

describe('exercise catalog', () => {
  it('every exercise has a complete guide', () => {
    for (const [id, e] of Object.entries(EXERCISES)) {
      expect(e.id, id).toBe(id)
      expect(e.steps.length, `${id} steps`).toBeGreaterThanOrEqual(2)
      expect(e.targets.muscles.length, `${id} muscles`).toBeGreaterThanOrEqual(1)
      expect(e.targets.qualities.length, `${id} qualities`).toBeGreaterThanOrEqual(1)
      expect(e.why.length, `${id} why`).toBeGreaterThan(40)
      expect(e.mistakes.length, `${id} mistakes`).toBeGreaterThanOrEqual(1)
      expect(e.videoQuery.length, `${id} videoQuery`).toBeGreaterThan(5)
      expect(e.restSec, `${id} restSec`).toBeGreaterThanOrEqual(0)
    }
  })
})

describe('templates', () => {
  it('every template entry resolves to a catalog exercise', () => {
    for (const t of Object.values(TEMPLATES)) {
      for (const entry of t.entries) {
        if (entry.entry === 'fixed') {
          expect(EXERCISES[entry.exerciseId], `${t.id}: ${entry.exerciseId}`).toBeDefined()
        } else if (entry.entry === 'ab') {
          expect(EXERCISES[entry.a.exerciseId], `${t.id}: ${entry.a.exerciseId}`).toBeDefined()
          expect(EXERCISES[entry.b.exerciseId], `${t.id}: ${entry.b.exerciseId}`).toBeDefined()
        }
      }
      for (const item of t.minViable?.items ?? []) {
        expect(EXERCISES[item.exerciseId], `${t.id} minViable: ${item.exerciseId}`).toBeDefined()
      }
    }
  })

  it('tier maps reference real templates', () => {
    for (const id of Object.values(TIER1_BY_WEEKDAY)) {
      if (id) expect(TEMPLATES[id], id).toBeDefined()
    }
    for (const roleMap of Object.values(TIER_ROLE_TEMPLATES)) {
      for (const id of Object.values(roleMap)) {
        expect(TEMPLATES[id!], id).toBeDefined()
      }
    }
  })

  it('every session template has a minimum-viable recipe', () => {
    for (const t of Object.values(TEMPLATES)) {
      if (t.kind === 'session' || t.kind === 'mobility') {
        expect(t.minViable, `${t.id} minViable`).toBeDefined()
        expect(t.minViable!.items.length).toBeGreaterThanOrEqual(2)
      }
    }
  })

  it('cardio options resolve to catalog exercises', () => {
    for (const c of CARDIO_OPTIONS) {
      expect(EXERCISES[c.exerciseId], c.exerciseId).toBeDefined()
    }
    expect(CARDIO_OPTIONS.filter((c) => c.group === 'A').length).toBe(3)
    expect(CARDIO_OPTIONS.filter((c) => c.group === 'B').length).toBe(3)
    expect(CARDIO_OPTIONS.filter((c) => c.group === 'circuit').length).toBe(2)
  })
})

describe('block rotation', () => {
  it('every slot in every block resolves to a catalog exercise', () => {
    for (const [block, slots] of Object.entries(BLOCK_SLOTS)) {
      for (const [slot, exerciseId] of Object.entries(slots)) {
        expect(EXERCISES[exerciseId], `block ${block} ${slot}: ${exerciseId}`).toBeDefined()
      }
    }
  })

  it('slot repText overrides reference real exercises', () => {
    for (const id of Object.keys(SLOT_REPTEXT_OVERRIDES)) {
      expect(EXERCISES[id], id).toBeDefined()
    }
  })

  it('core movers and tracked lifts exist', () => {
    for (const id of CORE_MOVERS) expect(EXERCISES[id], id).toBeDefined()
    for (const { exerciseId } of TRACKED_LIFTS) expect(EXERCISES[exerciseId], exerciseId).toBeDefined()
  })

  it('block 1 reproduces the PDF day tables (Mon HLR / Wed weighted sit-up)', () => {
    expect(BLOCK_SLOTS[1].coreMon).toBe('hanging-leg-raise')
    expect(BLOCK_SLOTS[1].coreWed).toBe('weighted-situp')
    expect(BLOCK_SLOTS[1].squatVariation).toBe('goblet-squat')
    expect(BLOCK_SLOTS[1].rowVariation).toBe('barbell-row')
  })
})

describe('muscle map data', () => {
  it('every exercise has a muscle activation mapping with valid regions', async () => {
    const { EXERCISE_MUSCLES } = await import('./muscles')
    const { ALL_REGIONS } = await import('../components/MuscleMap')
    for (const id of Object.keys(EXERCISES)) {
      const m = EXERCISE_MUSCLES[id]
      expect(m, `missing muscle map for ${id}`).toBeDefined()
      expect(m.primary.length, `${id} primary`).toBeGreaterThanOrEqual(1)
      for (const r of [...m.primary, ...m.secondary]) {
        expect(ALL_REGIONS, `${id} region ${r}`).toContain(r)
      }
    }
    // no orphan mappings either
    for (const id of Object.keys(EXERCISE_MUSCLES)) {
      expect(EXERCISES[id], `orphan mapping ${id}`).toBeDefined()
    }
  })
})

describe('exercise demo data', () => {
  it('every exercise has an animated movement demo', async () => {
    const { EXERCISE_DEMOS } = await import('./demos')
    for (const id of Object.keys(EXERCISES)) {
      const d = EXERCISE_DEMOS[id]
      expect(d, `missing demo for ${id}`).toBeDefined()
      expect(d.frames.length, `${id} frames`).toBeGreaterThanOrEqual(2)
      expect(d.frames.filter((f) => f.label).length, `${id} phase labels`).toBeGreaterThanOrEqual(1)
      for (const f of d.frames) {
        expect(f.d, `${id} frame duration`).toBeGreaterThan(0)
        expect(f.hold, `${id} frame hold`).toBeGreaterThanOrEqual(0)
        for (const [k, v] of Object.entries(f.p)) {
          expect(Number.isFinite(v), `${id} pose ${k}`).toBe(true)
        }
      }
    }
    // no orphan demos either
    for (const id of Object.keys(EXERCISE_DEMOS)) {
      expect(EXERCISES[id], `orphan demo ${id}`).toBeDefined()
    }
  })

  it('demoFor falls back safely for unknown ids', async () => {
    const { demoFor } = await import('./demos')
    expect(demoFor('not-a-real-exercise').frames.length).toBeGreaterThanOrEqual(2)
  })

  it('photo demos map to real exercises and vendored files that exist', async () => {
    const { DEMO_PHOTOS } = await import('./demoPhotos')
    const { existsSync } = await import('node:fs')
    const { join } = await import('node:path')
    expect(Object.keys(DEMO_PHOTOS).length).toBeGreaterThanOrEqual(40)
    for (const [id, pair] of Object.entries(DEMO_PHOTOS)) {
      expect(EXERCISES[id], `orphan photo mapping ${id}`).toBeDefined()
      expect(pair.length, `${id} needs a start+end pair`).toBe(2)
      for (const f of pair) {
        expect(existsSync(join(process.cwd(), 'public/demo', f)), `${id}: missing public/demo/${f}`).toBe(true)
      }
    }
  })
})

describe('nutrition data', () => {
  it('foods have sane macros', () => {
    for (const f of FOODS) {
      expect(f.proteinG).toBeGreaterThanOrEqual(0)
      expect(f.kcal).toBeGreaterThan(0)
      // kcal should at least cover the protein calories
      expect(f.kcal, `${f.id} kcal vs protein`).toBeGreaterThanOrEqual(f.proteinG * 4 * 0.8)
    }
  })

  it('PDF meal templates sum near the daily targets', () => {
    const training = MEAL_TEMPLATES.filter((m) => m.dayType === 'training')
    const rest = MEAL_TEMPLATES.filter((m) => m.dayType === 'rest')
    expect(training.length).toBe(5)
    expect(rest.length).toBe(5)

    const tKcal = training.reduce((s, m) => s + m.kcal, 0)
    const rKcal = rest.reduce((s, m) => s + m.kcal, 0)
    const tProt = training.reduce((s, m) => s + m.proteinG, 0)
    const rProt = rest.reduce((s, m) => s + m.proteinG, 0)

    // Within 10% of the PDF's own stated day targets
    expect(Math.abs(tKcal - KCAL_TRAINING) / KCAL_TRAINING).toBeLessThan(0.1)
    expect(Math.abs(rKcal - KCAL_REST) / KCAL_REST).toBeLessThan(0.1)
    // "200 g+ protein"
    expect(tProt).toBeGreaterThanOrEqual(200)
    expect(rProt).toBeGreaterThanOrEqual(200)
  })
})

describe('content pools (anti-repeat guarantees)', () => {
  it('coach pools have enough variants to not repeat constantly', () => {
    for (const pool of MESSAGE_POOLS) {
      expect(pool.variants.length, pool.id).toBeGreaterThanOrEqual(3)
    }
  })

  it('skip-no-proof has all four escalation levels', () => {
    const levels = MESSAGE_POOLS.filter((p) => p.situation === 'skip-no-proof').map((p) => p.level)
    expect(new Set(levels)).toEqual(new Set([0, 1, 2, 3]))
  })

  it('debrief pools have ≥6 variants per day type', () => {
    for (const [key, pool] of Object.entries(RECOVERY_POOLS)) {
      expect(pool.length, `recovery ${key}`).toBeGreaterThanOrEqual(6)
    }
    expect(SLEEP_TIPS.length).toBeGreaterThanOrEqual(8)
    expect(EAT_NOW.training.length).toBeGreaterThanOrEqual(6)
    expect(EAT_NOW.rest.length).toBeGreaterThanOrEqual(6)
    expect(REST_DAY_CARDS.length).toBeGreaterThanOrEqual(6)
  })

  it('recovery pools cover every session/mobility template family', () => {
    for (const key of ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'cardio', 'generic']) {
      expect(RECOVERY_POOLS[key], key).toBeDefined()
    }
  })
})

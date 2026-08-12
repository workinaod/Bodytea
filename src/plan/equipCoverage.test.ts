import { describe, expect, it } from 'vitest'
import type { EquipTag } from '../types'
import { EXERCISES } from './exercises'
import { canDo, resolveForEquipment, SUBSTITUTIONS, EXERCISE_EQUIP } from './equip'
import { EXERCISE_MUSCLES } from './muscles'
import type { MuscleRegion } from './muscleRegions'

// ============================================================
// Can this user actually train, with what they own?
//
// The catalog grew out of a dunk programme, so it was deep in
// jumps, sprints and free weights and thin everywhere else. That
// is invisible from inside: every exercise is well written, the
// tests all pass, and the hole only appears when you ask the one
// question nobody was asking, which is what is LEFT once you
// filter by equipment.
//
// Somebody who owns nothing had about ten movements. Somebody
// who owns bands had one. Somebody with a full commercial gym
// had six machine entries, so the app handed them a garage
// workout and never mentioned the other half of the room.
//
// These tests ask that question directly, per equipment profile,
// and they are written against MUSCLES rather than exercise
// names on purpose: a catalog can grow by twenty push-up
// variants and still not be able to train a hamstring.
// ============================================================

const PROFILES: { name: string; owns: EquipTag[] }[] = [
  { name: 'nothing at all', owns: [] },
  { name: 'a set of bands', owns: ['band'] },
  { name: 'bands + a pull-up bar', owns: ['band', 'pullup-bar'] },
  { name: 'home: adjustable dumbbells + bench', owns: ['dumbbell', 'bench', 'incline-bench'] },
  { name: 'garage: dumbbells, barbell, rack, bench', owns: ['dumbbell', 'barbell', 'rack', 'bench', 'incline-bench', 'pullup-bar', 'plate'] },
  { name: 'full commercial gym', owns: ['dumbbell', 'barbell', 'rack', 'bench', 'incline-bench', 'pullup-bar', 'plate', 'machine', 'box', 'kettlebell', 'trap-bar'] },
]

/**
 * The muscles a training programme has to be able to reach. Deliberately
 * not every region: nobody's plan fails because it cannot isolate the
 * tibialis, but a plan that cannot train hamstrings is broken.
 */
const MUST_TRAIN: MuscleRegion[] = [
  'chest',
  'lats',
  'mid-back',
  'delts-front',
  'delts-side',
  'delts-rear',
  'biceps',
  'triceps',
  'quads',
  'hamstrings',
  'glutes',
  'calves',
  'abs',
]

function poolFor(owns: EquipTag[]): string[] {
  const set = new Set<EquipTag>(['none', ...owns])
  return Object.keys(EXERCISES).filter((id) => canDo(id, set))
}

function primariesCovered(pool: string[]): Set<MuscleRegion> {
  const out = new Set<MuscleRegion>()
  for (const id of pool) for (const r of EXERCISE_MUSCLES[id]?.primary ?? []) out.add(r)
  return out
}

describe('every equipment profile can train the whole body', () => {
  it.each(PROFILES.map((p) => [p.name, p.owns] as const))(
    '%s reaches every muscle that matters',
    (_name, owns) => {
      const covered = primariesCovered(poolFor([...owns]))
      const missing = MUST_TRAIN.filter((r) => !covered.has(r))
      expect(missing, `no exercise trains ${missing.join(', ')} as a primary`).toEqual([])
    },
  )

  it('bodyweight-only training has somewhere to progress TO', () => {
    // The point that makes a bodyweight plan a programme instead of one
    // workout: the app's progression adds reps to the top of a range and
    // then adds LOAD. With no load to add, the ladder ends. So each of
    // these patterns needs more than one no-equipment option, at genuinely
    // different difficulties.
    const pool = poolFor([])
    const byPattern: Record<string, MuscleRegion> = {
      push: 'chest',
      quads: 'quads',
      glutes: 'glutes',
      core: 'abs',
    }
    for (const [pattern, region] of Object.entries(byPattern)) {
      const n = pool.filter((id) => EXERCISE_MUSCLES[id]?.primary.includes(region)).length
      expect(n, `${pattern}: only ${n} bodyweight option(s) training ${region}`).toBeGreaterThanOrEqual(3)
    }
  })

  it('a full-gym user is actually offered the machines', () => {
    const machineWork = Object.keys(EXERCISES).filter((id) => EXERCISE_EQUIP[id]?.includes('machine'))
    expect(machineWork.length).toBeGreaterThanOrEqual(20)
  })
})

describe('substitution chains bottom out somewhere real', () => {
  it('every substitute is itself a catalog exercise', () => {
    for (const [from, subs] of Object.entries(SUBSTITUTIONS)) {
      expect(EXERCISES[from], `substitution source ${from}`).toBeDefined()
      for (const to of subs) expect(EXERCISES[to], `${from} → ${to}`).toBeDefined()
    }
  })

  /**
   * Movements that genuinely cannot exist without equipment, so a chain
   * ending at nothing is the honest answer rather than a gap.
   *
   * Both are grip work, and grip work needs something to grip. Inventing
   * a bodyweight "substitute" for hanging from a bar would be the app
   * pretending, which is worse for the athlete than saying nothing: they
   * would do a plank believing their grip was being trained.
   */
  const NO_HONEST_BODYWEIGHT_VERSION = new Set(['farmer-carry', 'towel-hang'])

  it('every substitution chain ends somewhere a bare floor can reach', () => {
    const nothing = new Set<EquipTag>(['none'])
    const stranded = Object.keys(SUBSTITUTIONS).filter(
      (id) => !NO_HONEST_BODYWEIGHT_VERSION.has(id) && resolveForEquipment(id, nothing) === null,
    )
    expect(stranded, `no bodyweight fallback for: ${stranded.join(', ')}`).toEqual([])
  })

  it('the exceptions are real exceptions, not forgotten chains', () => {
    // If one of these ever gains a bodyweight route, it should leave the
    // list rather than sit here hiding a fix that already happened.
    const nothing = new Set<EquipTag>(['none'])
    for (const id of NO_HONEST_BODYWEIGHT_VERSION) {
      expect(EXERCISES[id], id).toBeDefined()
      expect(resolveForEquipment(id, nothing), `${id} now HAS a bodyweight route`).toBeNull()
    }
  })

  it('a chain never dead-ends before trying everything it lists', () => {
    // resolveForEquipment walks the list in order and takes the first
    // legal one, so a chain is only useful if its entries get cheaper.
    // Rather than count tags (a barbell is one tag and a whole rack), the
    // real check is that the LAST entry is the most widely doable one.
    for (const [from, subs] of Object.entries(SUBSTITUTIONS)) {
      if (subs.length < 2 || NO_HONEST_BODYWEIGHT_VERSION.has(from)) continue
      const last = subs[subs.length - 1]
      const lastNeeds = (EXERCISE_EQUIP[last] ?? []).filter((t) => t !== 'none')
      const firstNeeds = (EXERCISE_EQUIP[subs[0]] ?? []).filter((t) => t !== 'none')
      expect(
        lastNeeds.length,
        `${from}: chain ends at ${last} (${lastNeeds.join('+') || 'none'}) but starts at ${subs[0]} (${firstNeeds.join('+') || 'none'})`,
      ).toBeLessThanOrEqual(firstNeeds.length)
    }
  })
})

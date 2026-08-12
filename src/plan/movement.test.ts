import { describe, expect, it } from 'vitest'
import { EXERCISES } from './exercises'
import { ATHLETIC } from './athletic'
import { EXERCISE_EQUIP, canDo } from './equip'
import type { EquipTag } from '../types'
import {
  MOVEMENT,
  movementChain,
  patternImbalances,
  patternLoad,
  progressionFor,
  regressionFor,
  sessionFatigue,
  stressing,
  substitutesFor,
  transfersTo,
  type MovementLevel,
} from './movement'

// ============================================================
// A knowledge graph with a bad edge is worse than no graph: the
// planner will reason over it confidently and be wrong. These
// check the edges, not the prose.
// ============================================================

const RANK: Record<MovementLevel, number> = { foundation: 0, intermediate: 1, advanced: 2 }
const ALL: EquipTag[] = [
  'dumbbell', 'barbell', 'bench', 'incline-bench', 'rack', 'pullup-bar', 'box', 'plate',
  'machine', 'open-space', 'hill-stairs', 'court', 'treadmill', 'cones', 'band', 'hurdle',
  'med-ball', 'kettlebell', 'trap-bar', 'sled', 'partner',
]
const everything = (id: string) => canDo(id, new Set<EquipTag>(['none', ...ALL]))
const bodyweightOnly = (id: string) => canDo(id, new Set<EquipTag>(['none']))

describe('every movement in the catalog is described somewhere', () => {
  it('has either strength metadata or athletic metadata, and no orphans', () => {
    const missing = Object.keys(EXERCISES).filter((id) => !MOVEMENT[id] && !ATHLETIC[id])
    expect(missing, `no metadata for: ${missing.join(', ')}`).toEqual([])
    const orphan = Object.keys(MOVEMENT).filter((id) => !EXERCISES[id])
    expect(orphan, `metadata for movements that do not exist: ${orphan.join(', ')}`).toEqual([])
  })
})

describe('the progression graph points the right way', () => {
  it('every edge lands on a real movement', () => {
    for (const [id, m] of Object.entries(MOVEMENT)) {
      for (const r of m.regressions ?? []) expect(MOVEMENT[r] ?? ATHLETIC[r], `${id} regresses to ${r}`).toBeDefined()
      for (const p of m.progressions ?? []) expect(MOVEMENT[p] ?? ATHLETIC[p], `${id} progresses to ${p}`).toBeDefined()
    }
  })

  it('a regression is never harder to execute than what it regresses FROM', () => {
    // The failure this stops: an athlete who cannot manage a movement is
    // handed something MORE technical as the easier option, mid-session,
    // on a day that already went wrong.
    for (const [id, m] of Object.entries(MOVEMENT)) {
      for (const r of m.regressions ?? []) {
        const to = MOVEMENT[r]
        if (!to) continue
        expect(to.skill, `${id} → ${r} raises skill`).toBeLessThanOrEqual(m.skill)
        expect(RANK[to.level], `${id} → ${r} raises level`).toBeLessThanOrEqual(RANK[m.level])
      }
    }
  })

  it('a progression is never easier than what it progresses FROM', () => {
    for (const [id, m] of Object.entries(MOVEMENT)) {
      for (const p of m.progressions ?? []) {
        const to = MOVEMENT[p]
        if (!to) continue
        expect(RANK[to.level] + to.skill, `${id} → ${p} is not a step up`).toBeGreaterThanOrEqual(
          RANK[m.level] + m.skill,
        )
      }
    }
  })

  it('a regression stays in the same movement pattern', () => {
    // An easier squat is still a squat. Regressing a squat to a plank
    // means the day silently stopped training legs.
    for (const [id, m] of Object.entries(MOVEMENT)) {
      for (const r of [...(m.regressions ?? []), ...(m.progressions ?? [])]) {
        const to = MOVEMENT[r]
        if (!to) continue
        expect(to.pattern, `${id} → ${r} changes pattern`).toBe(m.pattern)
      }
    }
  })

  it('no chain loops forever', () => {
    for (const id of Object.keys(MOVEMENT)) {
      const chain = movementChain(id)
      expect(new Set(chain).size, `${id} chain repeats: ${chain.join(' → ')}`).toBe(chain.length)
      expect(chain).toContain(id)
    }
  })

  it('walks a real ladder end to end', () => {
    // push-up sits in the middle of one, which is the whole point of
    // having bodyweight progressions at all.
    const chain = movementChain('push-up')
    expect(chain).toContain('incline-push-up')
    expect(chain).toContain('push-up')
    expect(chain.indexOf('incline-push-up')).toBeLessThan(chain.indexOf('push-up'))
  })

  it('does not confuse an equipment swap with a difficulty step', () => {
    // A pull-up is not a harder inverted row, it is a different pattern,
    // and both deserve training. A pike push-up is not an easier dumbbell
    // press either, it is more technical. Both were edges in the first
    // draft of this graph and both were caught here. equip.ts still routes
    // between them when the equipment is missing, which is the other
    // question entirely.
    expect(MOVEMENT['inverted-row'].progressions ?? []).not.toContain('pull-up')
    expect(MOVEMENT['db-shoulder-press'].regressions ?? []).not.toContain('pike-push-up')
  })

  it('hands back a regression the athlete can actually do', () => {
    expect(regressionFor('front-squat', bodyweightOnly)).toBe(null)
    expect(regressionFor('front-squat', everything)).toBe('db-front-squat')
    expect(progressionFor('incline-push-up', bodyweightOnly)).toBe('push-up')
  })
})

describe('substitution preserves the JOB, not just the muscle', () => {
  it('always returns the same movement pattern', () => {
    for (const id of Object.keys(MOVEMENT)) {
      for (const sub of substitutesFor(id, { can: everything })) {
        expect(MOVEMENT[sub].pattern, `${id} → ${sub}`).toBe(MOVEMENT[id].pattern)
      }
    }
  })

  it('never substitutes a bench press for a lateral raise', () => {
    // Both "train shoulders", and a muscle-overlap search swaps them
    // confidently. Pattern is what stops it.
    expect(substitutesFor('flat-db-press', { can: everything })).not.toContain('lateral-raise')
  })

  it('routes around a joint that hurts and keeps training the pattern', () => {
    const subs = substitutesFor('flat-db-press', { can: everything, avoid: ['shoulder'] })
    expect(subs.length).toBeGreaterThan(0)
    for (const s of subs) expect(MOVEMENT[s].stress, s).not.toContain('shoulder')
    // And it is still a horizontal push, not a consolation prize.
    expect(MOVEMENT[subs[0]].pattern).toBe('push-horizontal')
  })

  it('never hands back something harder to execute', () => {
    for (const id of Object.keys(MOVEMENT)) {
      for (const sub of substitutesFor(id, { can: everything })) {
        expect(MOVEMENT[sub].skill, `${id} → ${sub}`).toBeLessThanOrEqual(MOVEMENT[id].skill)
      }
    }
  })

  it('respects an equipment ceiling', () => {
    for (const sub of substitutesFor('barbell-row', { can: bodyweightOnly })) {
      expect(EXERCISE_EQUIP[sub] ?? ['none'], sub).toEqual(['none'])
    }
  })

  it('can cap systemic cost for a day that has had enough', () => {
    for (const sub of substitutesFor('front-squat', { can: everything, maxFatigue: 1 })) {
      expect(MOVEMENT[sub].fatigue, sub).toBeLessThanOrEqual(1)
    }
  })
})

describe('reading a session', () => {
  const pushDay = [
    { exerciseId: 'flat-db-press', sets: 4 },
    { exerciseId: 'incline-db-press', sets: 4 },
    { exerciseId: 'machine-chest-press', sets: 3 },
    { exerciseId: 'band-row', sets: 2 },
  ]

  it('counts sets per pattern, ignoring warm-ups and cardio', () => {
    const load = patternLoad([...pushDay, { exerciseId: 'easy-jog', sets: 1 }, { exerciseId: 'couch-stretch', sets: 2 }])
    expect(load.find((p) => p.pattern === 'push-horizontal')?.sets).toBe(11)
    expect(load.some((p) => p.pattern === 'conditioning' || p.pattern === 'mobility')).toBe(false)
  })

  it('catches a push-heavy day', () => {
    const bad = patternImbalances(pushDay)
    expect(bad[0].pattern).toBe('push-horizontal')
    expect(bad[0].opposite).toBe('pull-horizontal')
  })

  it('does not shout about a light day that happens to be uneven', () => {
    // Two sets against zero is a rounding error, not a year of rounded
    // shoulders. Only real volume gets flagged.
    expect(patternImbalances([{ exerciseId: 'push-up', sets: 2 }])).toEqual([])
  })

  it('adds systemic cost, which per-muscle counting cannot see', () => {
    const heavy = [
      { exerciseId: 'front-squat', sets: 4 },
      { exerciseId: 'romanian-deadlift', sets: 4 },
      { exerciseId: 'standing-ohp', sets: 4 },
    ]
    const light = [
      { exerciseId: 'leg-extension', sets: 4 },
      { exerciseId: 'cable-curl', sets: 4 },
      { exerciseId: 'lateral-raise', sets: 4 },
    ]
    expect(sessionFatigue(heavy)).toBeGreaterThan(sessionFatigue(light) * 2)
  })

  it('names what is loading a sore joint', () => {
    const hit = stressing(
      [{ exerciseId: 'flat-db-press' }, { exerciseId: 'leg-extension' }, { exerciseId: 'band-row' }],
      ['shoulder'],
    )
    expect(hit).toEqual(['flat-db-press'])
  })
})

describe('the two libraries are connected', () => {
  it('strength work declares what athletic quality it actually feeds', () => {
    expect(transfersTo('sprint-hamstring')).toContain('seated-leg-curl')
    expect(transfersTo('ankle-stiffness')).toContain('single-leg-calf-raise')
    expect(transfersTo('vertical-power')).toContain('goblet-squat')
  })

  it('every declared transfer is a quality the athletic library knows', () => {
    const known = new Set(Object.values(ATHLETIC).flatMap((m) => m.qualities))
    for (const [id, m] of Object.entries(MOVEMENT)) {
      for (const q of m.transfer ?? []) {
        expect(known, `${id} claims transfer to ${q}, which no drill trains`).toContain(q)
      }
    }
  })
})

describe('the metadata itself is sane', () => {
  it('movements with no load lever at all are marked unloadable', () => {
    // The first version of this test asked whether a movement was
    // bodyweight-TAGGED, and failed on reverse lunge, which is tagged
    // 'none' because it CAN be done empty-handed and takes dumbbells
    // perfectly well. Two different questions. `loadable` is about the
    // movement; whether weight is available is equip.ts's job.
    //
    // What matters is the other direction: a push-up cannot take load,
    // so the rep engine has to know that reaching the top of the range
    // is the end of its ladder rather than a cue to add weight.
    for (const id of ['push-up', 'incline-push-up', 'decline-push-up', 'archer-push-up', 'diamond-push-up', 'shrimp-squat', 'wall-sit', 'plank-side-plank', 'hollow-hold', 'bodyweight-calf-raise']) {
      expect(MOVEMENT[id]?.loadable, `${id} should have no load lever`).toBe(false)
    }
  })

  it('primaries are never trivial and isolations are never whole-body', () => {
    for (const [id, m] of Object.entries(MOVEMENT)) {
      if (m.role === 'primary') expect(m.fatigue, `${id} is a primary with no cost`).toBeGreaterThanOrEqual(2)
      if (m.role === 'isolation') expect(m.fatigue, `${id} is an isolation with whole-body cost`).toBeLessThanOrEqual(1)
    }
  })

  it('every pattern that can be trained has at least one bodyweight option', () => {
    const trainable = ['squat', 'hinge', 'lunge', 'push-horizontal', 'pull-horizontal', 'brace'] as const
    for (const p of trainable) {
      const any = Object.entries(MOVEMENT).some(([id, m]) => m.pattern === p && bodyweightOnly(id))
      expect(any, `no bodyweight option for ${p}`).toBe(true)
    }
  })
})

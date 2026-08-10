import { describe, expect, it } from 'vitest'
import { ATHLETIC, athleticSubsFor, progressionChain } from './athletic'
import { ATHLETIC_EXERCISES } from './athleticExercises'
import { EXERCISES } from './exercises'

describe('athletic metadata integrity', () => {
  it('every metadata entry maps to a real catalog exercise', () => {
    for (const id of Object.keys(ATHLETIC)) {
      expect(EXERCISES[id], `ATHLETIC orphan: ${id}`).toBeDefined()
    }
  })

  it('every athletic-library exercise carries structured metadata', () => {
    for (const e of ATHLETIC_EXERCISES) {
      expect(ATHLETIC[e.id], `missing athletic meta for ${e.id}`).toBeDefined()
    }
  })

  it('progression / regression links resolve and stay inside the metadata graph', () => {
    for (const [id, m] of Object.entries(ATHLETIC)) {
      expect(m.qualities.length, `${id} qualities`).toBeGreaterThanOrEqual(1)
      expect(m.program.restSec, `${id} restSec`).toBeGreaterThanOrEqual(0)
      for (const ref of [...(m.progressions ?? []), ...(m.regressions ?? [])]) {
        expect(EXERCISES[ref], `${id} → unknown ${ref}`).toBeDefined()
        expect(ATHLETIC[ref], `${id} → unclassified ${ref}`).toBeDefined()
      }
    }
  })

  it('progression levels never go DOWN along a progression edge', () => {
    const rank = { foundation: 0, intermediate: 1, advanced: 2 }
    for (const [id, m] of Object.entries(ATHLETIC)) {
      for (const next of m.progressions ?? []) {
        expect(
          rank[ATHLETIC[next].level] >= rank[m.level],
          `${id} (${m.level}) progresses to easier ${next} (${ATHLETIC[next].level})`,
        ).toBe(true)
      }
      for (const prev of m.regressions ?? []) {
        expect(
          rank[ATHLETIC[prev].level] <= rank[m.level],
          `${id} (${m.level}) regresses to harder ${prev} (${ATHLETIC[prev].level})`,
        ).toBe(true)
      }
    }
  })

  it('substitutions preserve the primary athletic quality and never level up', () => {
    const rank = { foundation: 0, intermediate: 1, advanced: 2 }
    for (const id of ['max-velocity-sprint', 'countermovement-jump', 'snap-down-stick', 'lateral-bound-stick', 'shuttle-5-10-5']) {
      const subs = athleticSubsFor(id)
      expect(subs.length, `${id} has substitutions`).toBeGreaterThanOrEqual(1)
      for (const s of subs) {
        expect(ATHLETIC[s].qualities[0], `${id} sub ${s} quality`).toBe(ATHLETIC[id].qualities[0])
        expect(rank[ATHLETIC[s].level] <= rank[ATHLETIC[id].level], `${id} sub ${s} level`).toBe(true)
      }
    }
    // A max-velocity slot must never resolve to random cardio
    expect(athleticSubsFor('max-velocity-sprint')).not.toContain('easy-jog')
  })

  it('the requested progression families chain correctly', () => {
    expect(progressionChain('snap-down-stick')).toContain('snap-down')
    expect(progressionChain('snap-down-stick')).toContain('drop-landing')
    expect(progressionChain('pogo-hop')).toContain('alternating-pogo')
    expect(progressionChain('countermovement-jump')).toContain('standing-vertical-jump')
    expect(progressionChain('countermovement-jump')).toContain('approach-jump')
    expect(progressionChain('falling-start-sprint')).toContain('two-point-start')
    const dunkChain = progressionChain('dunk-attempt')
    expect(dunkChain[dunkChain.length - 1]).toBe('dunk-attempt')
  })

  it('advanced reactive work demands a landing base (depth jump gates)', () => {
    const dj = ATHLETIC['depth-jump']
    expect(dj.level).toBe('advanced')
    expect(dj.fresh).toBe(true)
    expect(dj.warning).toBeTruthy()
    expect(dj.regressions).toContain('depth-drop')
  })
})

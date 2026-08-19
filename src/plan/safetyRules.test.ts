import { describe, expect, it } from 'vitest'
import { CONSTRAINTS, constraintsFor, planningLimits, type ConstraintId } from './safetyRules'
import { blockedByCapability } from './capability'
import { MOVEMENT, substitutesFor } from './movement'

// ============================================================
// R6's table has been synthesized and unusable since it was written,
// because its rows are positions and the planner only spoke joints.
// These check that it is usable now, and that it did not quietly become
// something stricter than the pack says.
// ============================================================

const ALL_IDS = Object.keys(CONSTRAINTS) as ConstraintId[]
const anyCan = () => true

describe('the table is the table', () => {
  it('keys every row by its own id', () => {
    for (const [key, c] of Object.entries(CONSTRAINTS)) expect(c.id).toBe(key)
  })

  it('gives every row a source, even the ones that are ours', () => {
    // A house heuristic still says where the umbrella came from, or it is
    // a number somebody invented with nothing behind it at all.
    for (const c of Object.values(CONSTRAINTS)) {
      expect(c.sourceRefs.length, c.id).toBeGreaterThan(0)
    }
  })

  it('marks as sourced only what R6 marked as sourced', () => {
    // R6 is explicit that most specifics are house heuristic under a CDC
    // umbrella. Quietly promoting them would be the knowledge-tier
    // failure B2 exists to stop, in a different file.
    const sourced = ALL_IDS.filter((id) => CONSTRAINTS[id].confidence === 'source')
    expect(sourced.sort()).toEqual(['knee', 'uses-cane-or-support'])
  })

  it('gives the joint rows their joint and the position rows none', () => {
    expect(CONSTRAINTS.knee.avoid).toEqual(['knee'])
    expect(CONSTRAINTS['cannot-kneel'].avoid).toEqual([])
  })
})

describe('what R6 could not say before', () => {
  it('turns "I cannot kneel" into something the planner can act on', () => {
    // The whole point. This used to resolve to nothing.
    const { cannot } = planningLimits(['cannot-kneel'])
    expect(cannot).toEqual(['kneeling'])
  })

  it('turns "I cannot get to the floor" into all three floor positions', () => {
    const { cannot } = planningLimits(['cannot-get-to-floor'])
    expect(cannot.sort()).toEqual(['floorTransfer', 'prone', 'supine'])
  })

  it('gives a knee the deep-range block AND keeps the joint route', () => {
    // Routing load away from a knee never stopped the plan asking for a
    // full-depth squat, because depth is not a joint.
    const { cannot, avoid } = planningLimits(['knee'])
    expect(cannot).toEqual(['deepKneeFlexion'])
    expect(avoid).toEqual(['knee'])
  })
})

describe('unioning more than one', () => {
  it('takes the lowest impact cap, not an average', () => {
    // An ankle that says no jumping and a back that says light jumping
    // means no jumping.
    expect(planningLimits(['ankle', 'lower-back']).impactCap).toBe(0)
    expect(planningLimits(['lower-back']).impactCap).toBe(1)
  })

  it('leaves the cap open when nothing asks for one', () => {
    expect(planningLimits(['cannot-kneel']).impactCap).toBeUndefined()
    expect(planningLimits([]).impactCap).toBeUndefined()
  })

  it('unions the blocks and the joints without duplicating', () => {
    const { cannot, avoid } = planningLimits(['shoulder', 'cannot-raise-arm-overhead'])
    expect(cannot).toEqual(['overheadRom'])
    expect(avoid).toEqual(['shoulder'])
  })

  it('ignores a key it does not know rather than throwing', () => {
    // Limitations are partly free text upstream. An unrecognised key must
    // narrow nothing and break nothing.
    expect(constraintsFor(['not-a-real-limitation'])).toEqual([])
    expect(planningLimits(['not-a-real-limitation', 'knee']).cannot).toEqual(['deepKneeFlexion'])
  })
})

describe('it reaches the substitution engine', () => {
  it('never returns a kneeling movement to somebody who cannot kneel', () => {
    const { cannot } = planningLimits(['cannot-kneel'])
    for (const id of Object.keys(MOVEMENT)) {
      for (const s of substitutesFor(id, { can: anyCan, cannot })) {
        expect(blockedByCapability(s, MOVEMENT[s].pattern, cannot), `${id} -> ${s}`).toBe(false)
      }
    }
  })

  it('never returns floor work to somebody who cannot get down there', () => {
    const { cannot } = planningLimits(['cannot-get-to-floor'])
    for (const id of Object.keys(MOVEMENT)) {
      for (const s of substitutesFor(id, { can: anyCan, cannot })) {
        expect(blockedByCapability(s, MOVEMENT[s].pattern, cannot), `${id} -> ${s}`).toBe(false)
      }
    }
  })
})

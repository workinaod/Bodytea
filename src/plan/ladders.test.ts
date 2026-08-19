import { describe, expect, it } from 'vitest'
import { MOVEMENT } from './movement'

// ============================================================
// J2 taught the engine to judge an unloaded lift and then had nowhere to
// send it. 40 of the 47 unloaded movements had no progressions at all, so
// `nextUp()` returned null and the verdict collapsed to `topped-out`: a
// pull-up athlete who went from three reps to nine over a phase was
// correctly judged earned, then handed the identical pull-up.
//
// These pin the chains that exist and, more usefully, keep an honest
// count of the ones that do not.
// ============================================================

const unloaded = () => Object.entries(MOVEMENT).filter(([, m]) => m.loadable === false)
const deadEnds = () => unloaded().filter(([, m]) => (m.progressions ?? []).length === 0)

describe('the ladders that now exist', () => {
  const CHAINS: [string, string][] = [
    ['dead-hang', 'towel-hang'],
    ['inverted-row', 'underhand-inverted-row'],
    ['plank-side-plank', 'hollow-hold'],
    ['superman-hold', 'hollow-hold'],
    ['bird-dog', 'dead-bug'],
    ['single-leg-squat-box', 'shrimp-squat'],
    ['bodyweight-calf-raise', 'single-leg-calf-raise'],
    ['diamond-push-up', 'decline-push-up'],
  ]

  for (const [from, to] of CHAINS) {
    it(`${from} can promote to ${to}`, () => {
      expect(MOVEMENT[from], from).toBeDefined()
      expect(MOVEMENT[to], to).toBeDefined()
      expect(MOVEMENT[from].progressions ?? []).toContain(to)
    })
  }

  it('never leaves its own pattern', () => {
    // The repo's own invariant, and it caught me adding three chains that
    // broke it: a hang is a carry and an assisted pull-up is a vertical
    // pull, so that edge is not a progression however sensible it reads.
    for (const [from, to] of CHAINS) {
      expect(MOVEMENT[to].pattern, `${from} -> ${to}`).toBe(MOVEMENT[from].pattern)
    }
  })

  it('never promotes to something easier', () => {
    for (const [from, to] of CHAINS) {
      expect(MOVEMENT[to].skill, `${from} -> ${to}`).toBeGreaterThanOrEqual(MOVEMENT[from].skill)
    }
  })
})

describe('the dead ends that are left', () => {
  it('is fewer than R9 counted, and the number is written down', () => {
    // R9 measured 40 of 47. Eight are closed with movements that already
    // existed. The rest need rungs nobody has authored yet, which is the
    // honest state of W9 and is on the board as such.
    expect(unloaded().length).toBe(47)
    expect(deadEnds().length).toBeLessThan(40)
    expect(deadEnds().length).toBe(32)
  })

  it('still cannot promote a pull-up, which is the one that matters most', () => {
    // R9 calls this the single most valuable chain to add, and it cannot
    // be added from what exists: the rungs between a dead hang and a
    // pull-up (scapular pull, arch hang, negative) are not in the catalog,
    // and a weighted pull-up needs loadable to become a function of
    // equipment. Asserted rather than left implied, so the day somebody
    // authors those rungs this test tells them to come back here.
    expect(MOVEMENT['pull-up'].progressions ?? []).toEqual([])
  })
})

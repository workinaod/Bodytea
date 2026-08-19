import { describe, expect, it } from 'vitest'
import { MOVEMENT } from './movement'
import { substitutesFor } from './movement'
import { OVERRIDDEN_IDS, blockedByCapability, demandsOf, type CapabilityBlock } from './capability'

// ============================================================
// Seven joints used to be the entire vocabulary of human limitation this
// planner had. "I cannot kneel" reached it as nothing at all, which is
// why R6's safety pack has been sitting unshippable: it states its
// constraints as positions, and no field said which movements involve
// them.
//
// These pin the two things that matter. The demands are right about real
// movements, and something that demands what an athlete does not have
// never comes back from a substitution.
// ============================================================

const all = () => Object.keys(MOVEMENT)
const anyCan = () => true

describe('the demands are right about movements we can check by hand', () => {
  it('knows which movements happen on the floor', () => {
    expect(demandsOf('push-up', MOVEMENT['push-up'].pattern).floorTransfer).toBe(true)
    expect(demandsOf('glute-bridge', MOVEMENT['glute-bridge'].pattern).supine).toBe(true)
    expect(demandsOf('goblet-squat', MOVEMENT['goblet-squat'].pattern).floorTransfer).toBe(false)
  })

  it('knows a leg press is a squat that demands neither deep range', () => {
    // Pattern says squat, which would imply both. The machine is the
    // reason the override exists.
    const d = demandsOf('leg-press', MOVEMENT['leg-press'].pattern)
    expect(d.deepKneeFlexion).toBe(false)
    expect(d.deepHipFlexion).toBe(false)
    expect(demandsOf('goblet-squat', MOVEMENT['goblet-squat'].pattern).deepKneeFlexion).toBe(true)
  })

  it('knows overhead work from pressing that is not', () => {
    expect(demandsOf('lat-pulldown', MOVEMENT['lat-pulldown'].pattern).overheadRom).toBe(true)
    expect(demandsOf('flat-db-press', MOVEMENT['flat-db-press'].pattern).overheadRom).toBe(false)
  })

  it('demands nothing of a movement it has never heard of', () => {
    // A caller with an id outside the catalog gets an empty demand set
    // rather than a guess, because guessing here removes exercises from
    // somebody's plan for a reason nobody can explain.
    const d = demandsOf('not-a-real-movement', 'isolation')
    expect(Object.values(d).every((v) => v === false || v === 0)).toBe(true)
  })
})

describe('every override is about a movement that exists', () => {
  it('names no id the catalog does not have', () => {
    // An override for a deleted or misspelled id is silently dead, and a
    // dead override reads exactly like a correct one.
    const ghosts = OVERRIDDEN_IDS.filter((id) => !MOVEMENT[id])
    expect(ghosts).toEqual([])
  })

  it('changes something for every id it names', () => {
    // An override identical to what the pattern already said is noise.
    const pointless = OVERRIDDEN_IDS.filter((id) => {
      const p = MOVEMENT[id].pattern
      return JSON.stringify(demandsOf(id, p)) === JSON.stringify(demandsOf('__none__', p))
    })
    expect(pointless).toEqual([])
  })

  it('stays a correction list rather than becoming the data', () => {
    // The research pack estimated the pattern defaults would cover about
    // 70 percent and said to MEASURE it rather than promise it. This is
    // the measurement. If overrides ever pass a third of the catalog the
    // defaults are wrong and belong rewritten, not extended.
    const share = OVERRIDDEN_IDS.length / all().length
    expect(share).toBeLessThan(0.34)
  })
})

describe('a substitution never returns what the athlete cannot do', () => {
  const cases: [string, CapabilityBlock[]][] = [
    ['cannot kneel', ['kneeling']],
    ['cannot get to the floor', ['floorTransfer', 'prone', 'supine']],
    ['cannot raise an arm overhead', ['overheadRom']],
  ]

  for (const [label, cannot] of cases) {
    it(`holds for somebody who ${label}`, () => {
      for (const id of all()) {
        for (const s of substitutesFor(id, { can: anyCan, cannot })) {
          expect(blockedByCapability(s, MOVEMENT[s].pattern, cannot), `${id} -> ${s}`).toBe(false)
        }
      }
    })
  }

  it('leaves everybody else exactly where they were', () => {
    // The field is optional and absent means unchanged. A capability
    // system that quietly narrows every athlete's options is worse than
    // none.
    //
    // Comparing `cannot: []` against no `cannot` at all does NOT test
    // this, and I wrote that version first: both funnel to the same empty
    // array inside substitutesFor, so a filter that narrowed by default
    // would narrow both sides equally and the comparison would pass. It
    // has to be an absolute claim instead. An athlete who declared
    // nothing must still be offered movements that demand things.
    const offered = new Set(all().flatMap((id) => substitutesFor(id, { can: anyCan })))
    const demanding = (c: CapabilityBlock) =>
      [...offered].some((s) => blockedByCapability(s, MOVEMENT[s].pattern, [c]))
    expect(demanding('prone'), 'prone movements still offered').toBe(true)
    expect(demanding('kneeling'), 'kneeling movements still offered').toBe(true)
    expect(demanding('overheadRom'), 'overhead movements still offered').toBe(true)
  })

  it('still covers the anti-rotation pattern for somebody who cannot kneel', () => {
    // R-ONT eval case 4. Bird-dog is the obvious anti-rotation movement
    // and it is kneeling, so the question is whether the pattern survives
    // losing it or whether that athlete simply gets no core work.
    const antiRotation = all().filter((id) => MOVEMENT[id].pattern === 'anti-rotation')
    expect(antiRotation.length).toBeGreaterThan(0)
    const left = antiRotation.filter((id) => !blockedByCapability(id, 'anti-rotation', ['kneeling']))
    expect(left.length).toBeGreaterThan(0)
  })
})

import { describe, expect, it } from 'vitest'
import { emptyAppData, type AppData } from '../types'
import type { SessionLog } from '../sessionTypes'
import { appendDecision } from './decisions'
import { CEILING_MAX_DRIFT, ceilingDeltas, ceilingDecision, ceilingLowerOffer } from './ceiling'
import { ceilingFor } from './volume'

// ============================================================
// R3 s5.3 is blunt that volume autoregulation is the under-evidenced
// half of the literature. So: one fractional set, never two; the drift
// is capped both ways; the first move is DOWN; and lowering needs ONE
// signal where raising needs six.
//
// The delta lives in the ledger and the base stays the researched
// constant, because a lowered ceiling that quietly becomes the new base
// walks a muscle to nothing one honest bad week at a time. This repo
// already has that scar in reps.ts.
// ============================================================

const SQUAT = 'goblet-squat' // primary: quads
const TODAY = '2026-06-01'
const WEEKS = ['2026-05-04', '2026-05-11', '2026-05-18', '2026-05-25']

function base(): AppData {
  const d = emptyAppData(TODAY, TODAY)
  d.settings.onboarded = true
  return d
}

/** A session where the movement came up short, which raises its flag. */
function short(d: AppData, date: string): AppData {
  d.sessions[date] = {
    date,
    templateId: 't',
    status: 'completed',
    exercises: [{ exerciseId: SQUAT, sets: [{ targetReps: '10', done: true, achieved: 6, weightLb: 100 }] }],
  } as unknown as SessionLog
  return d
}

const flagged = (): AppData => {
  let d = base()
  for (const date of WEEKS.slice(0, 3)) d = short(d, date)
  return d
}

describe('the base never moves, only the offset', () => {
  it('leaves a fresh athlete on the researched number', () => {
    expect(ceilingDeltas(base())).toEqual({})
    expect(ceilingFor('quads')).toBe(ceilingFor('quads', undefined, {}))
  })

  it('takes exactly one set off when the offer is taken', () => {
    const plain = ceilingFor('quads')
    const d = flagged()
    const offer = ceilingLowerOffer(d, TODAY)!
    appendDecision(d, ceilingDecision(offer, 'lower', 'accepted', TODAY, 0))
    expect(ceilingFor('quads', undefined, ceilingDeltas(d))).toBe(plain - 1)
  })

  it('never drifts further than the cap in either direction', () => {
    expect(CEILING_MAX_DRIFT).toBe(2)
    const d = base()
    const change = { region: 'quads' as const, label: 'Quads', because: 'x' }
    for (let i = 0; i < 6; i++) appendDecision(d, ceilingDecision(change, 'lower', 'accepted', TODAY, i))
    expect(ceilingDeltas(d).quads).toBe(-CEILING_MAX_DRIFT)
  })

  it('keeps the focus bonus out of the drift', () => {
    // R3 s5.2 keeps the bonus exactly as researched: a personal offset
    // should not quietly double on the muscle the day was built around.
    const focus = new Set(['quads' as const])
    const withDelta = ceilingFor('quads', focus, { quads: -1 })
    expect(withDelta).toBe(ceilingFor('quads', focus) - 1)
  })
})

describe('one signal is enough to come down', () => {
  it('offers on a movement that keeps coming up short', () => {
    const offer = ceilingLowerOffer(flagged(), TODAY)
    expect(offer?.region).toBe('quads')
    expect(offer?.because).toContain('short')
  })

  it('says nothing to somebody whose sessions are fine', () => {
    let d = base()
    for (const date of WEEKS) {
      d.sessions[date] = {
        date,
        templateId: 't',
        status: 'completed',
        exercises: [{ exerciseId: SQUAT, sets: [{ targetReps: '10', done: true, achieved: 10, weightLb: 100 }] }],
      } as unknown as SessionLog
    }
    expect(ceilingLowerOffer(d, TODAY)).toBeNull()
  })

  it('will not move the same muscle twice in a fortnight', () => {
    // R3 s5.5 guard 4: two changes on one muscle at once cannot be
    // attributed to either.
    const d = flagged()
    const offer = ceilingLowerOffer(d, TODAY)!
    appendDecision(d, ceilingDecision(offer, 'lower', 'accepted', TODAY, 0))
    expect(ceilingLowerOffer(d, '2026-06-07')).toBeNull()
    expect(ceilingLowerOffer(d, '2026-06-16')).not.toBeNull()
  })

  it('stops offering once the muscle is as low as it may go', () => {
    // A squat is quads AND glutes, so both have to be at the floor
    // before there is nothing left to offer. Capping one and expecting
    // silence was my mistake, not the engine's: it correctly moved on to
    // the muscle that had not drifted yet.
    const d = flagged()
    for (const region of ['quads', 'glutes'] as const) {
      const change = { region, label: region, because: 'x' }
      for (let i = 0; i < CEILING_MAX_DRIFT; i++) {
        appendDecision(d, ceilingDecision(change, 'lower', 'accepted', '2026-01-01', i))
      }
    }
    expect(ceilingLowerOffer(d, TODAY)).toBeNull()
  })

  it('takes a no for an answer', () => {
    const d = flagged()
    const offer = ceilingLowerOffer(d, TODAY)!
    appendDecision(d, ceilingDecision(offer, 'lower', 'declined', TODAY, 0))
    expect(ceilingDeltas(d)).toEqual({})
    expect(ceilingLowerOffer(d, '2026-06-02')).toBeNull()
  })
})
